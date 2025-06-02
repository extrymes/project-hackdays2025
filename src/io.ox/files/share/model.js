/*
 *
 * @copyright Copyright (c) OX Software GmbH, Germany <info@open-xchange.com>
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with OX App Suite. If not, see <https://www.gnu.org/licenses/agpl-3.0.txt>.
 *
 * Any use of the work other than as authorized under this license or copyright law is prohibited.
 *
 */

import $ from '@/jquery'
import _ from '@/underscore'
import Backbone from '@/backbone'
import moment from '@open-xchange/moment'

import api from '@/io.ox/files/share/api'
import groupAPI from '@/io.ox/core/api/group'
import yell from '@/io.ox/core/yell'

const WizardShare = Backbone.Model.extend({

  defaults () {
    return {
      files: [],
      recipients: [],
      message: '',
      edit: false,
      password: '',
      temporary: false,
      expires: 6,
      url: '',
      is_new: false,
      includeSubfolders: true // see SoftwareChange Request SCR-97: [https://jira.open-xchange.com/browse/SCR-97]
    }
  },

  idAttribute: 'entity',

  initialize () {
    // Set url if already shared
    this._setUrlAndSettings()
    this.setOriginal()
  },

  _setUrlAndSettings () {
    const extendedObjPermissions = 'com.openexchange.share.extendedObjectPermissions'
    const extendedPermissions = 'com.openexchange.share.extendedPermissions'
    if (this.attributes.files) {
      _.each(this.attributes.files, function (file) {
        let matchedPermission = null
        if (file.has(extendedPermissions)) {
          matchedPermission = extendedPermissions
        } else if (file.has(extendedObjPermissions)) {
          matchedPermission = extendedObjPermissions
        }
        if (matchedPermission) {
          _.each(file.get(matchedPermission), function (permission) {
            const isSharingLinkForItem = permission.type === 'anonymous' && permission.share_url && !permission.isInherited
            if (isSharingLinkForItem) {
              this.attributes.url = permission.share_url
              if (permission.password) {
                this.attributes.password = permission.password
              }
              if (permission.expiry_date) {
                this.attributes.expires = permission.expires
                this.attributes.expiry_date = permission.expiry_date
                this.attributes.temporary = true
              }
              this.attributes.includeSubfolders = permission.includeSubfolders
            }
          }, this)
        }
      }, this)
    }
  },

  hasUrl () {
    return !!this.get('url')
  },

  setOriginal (data) {
    this.originalAttributes = data || _.clone(this.attributes)
  },

  getChanges () {
    const original = this.originalAttributes; const changes = {}
    _(this.attributes).each(function (val, id) {
      if (!_.isEqual(val, original[id])) {
        changes[id] = val
      }
    })
    // limit to relevant attributes
    return _(changes).pick('expiry_date', 'includeSubfolders', 'password', 'temporary')
  },

  hasChanges () {
    return !_.isEmpty(this.getChanges())
  },

  getExpiryDate () {
    const now = moment()
    switch (parseInt(this.get('expires'), 10)) {
      case 0:
        return now.add(1, 'day').valueOf()
      case 1:
        return now.add(1, 'week').valueOf()
      case 2:
        return now.add(1, 'month').valueOf()
      case 3:
        return now.add(3, 'months').valueOf()
      case 4:
        return now.add(6, 'months').valueOf()
      case 5:
        return now.add(1, 'year').valueOf()
      default:
        return now.add(1, 'month').valueOf()
    }
  },

  toJSON () {
    // default invite data
    const targets = []
    let data = {}

    // collect target data
    _(this.get('files')).each(function (item) {
      const target = {
        // this model is used by folders from other applications as well
        module: item.get('module') || 'infostore'
      }
      if (item.isFolder()) {
        target.folder = item.get('id')
      }
      if (item.isFile()) {
        target.folder = item.get('folder_id')
        target.item = item.get('id')
      }
      targets.push(target)
    })

    // special data for `getLink` request
    data = targets[0]

    data.includeSubfolders = this.get('includeSubfolders')

    if (_.isEmpty(this.get('password'))) {
      data.password = null
    } else {
      data.password = this.get('password')
    }

    // collect recipients data
    data.recipients = []
    _(this.get('recipients')).each(function (recipientModel) {
      // model values might be outdated (token edit) so we act like mail compose
      data.recipients.push([
        recipientModel.get('token').label || recipientModel.getDisplayName(),
        recipientModel.get('token').value || recipientModel.getTarget()
      ])
    })
    if (data.recipients.length === 0) {
      delete data.recipients
    }

    if (this.get('message') && this.get('message') !== '') {
      data.message = this.get('message')
    }

    // create or update ?
    if (!this.has('url')) {
      return data
    }

    if (this.get('temporary')) {
      data.expiry_date = this.getExpiryDate()
    } else {
      data.expiry_date = null
    }

    return data
  },

  sync (action, model) {
    const self = this
    switch (action) {
      case 'read':
        return api.getLink(this.toJSON(), model).then(function (result) {
          // refresh the guest group (id = int max value)
          groupAPI.refreshGroup(2147483647)

          const data = result.data
          const timestamp = result.timestamp
          // SCR-97: BREAKPOINT one line beneath for debugging
          self.set(_.extend(data, { lastModified: timestamp }), { _initial: true })

          //  - Searching for why new data fields like `includeSubfolders` could not be saved persistently finally
          //    led to `self.setOriginal()` that does not set the original `data` object 3 lines above at all.
          //  - The fallback of `self.setOriginal` ... `this.originalAttributes = data || _.clone(this.attributes);`
          //    in this case is misleading for it's false safety.
          //  - Though it's obvious now, finding this single source of misbehavior has consumed more than 1 day.
          //
          // self.setOriginal(data);  // ... and it DOES even work as expected (always triggers a server call, even
          //                          // though no data got changed), but it is useless due to an entirely corrupted
          //                          // model ... thus `self.setOriginal();` will remain but the next step has to be
          //                          // hacking `this.originalAttributes`.
          //
          self.setOriginal()

          if ('includeSubfolders' in data) {
            self.originalAttributes.includeSubfolders = data.includeSubfolders
          }
          return data.url
        }).fail(function (error) {
          yell(error)
          self.trigger('error:sync', 'read', error)
        })
      case 'update':
      case 'create': {
        const changes = self.getChanges()
        const data = model.toJSON()
        // set password to null if password protection was revoked
        if (!('password' in changes)) {
          // remove password from data unless it has changed
          delete data.password
        }
        // update only if there are relevant changes
        //
        // SCR-97: BREAKPOINT one line beneath for debugging
        return (_.isEmpty(changes) ? $.when() : api.updateLink(data, model.get('lastModified')))
          .done(function () {
            // refresh the guest group (id = int max value)
            groupAPI.refreshGroup(2147483647)
          })
          .done(this.send.bind(this))
          .fail(function (error) {
            yell(error)
          })
      }
      // no default
    }
  },

  // SCR-97: BREAKPOINT one line beneath for debugging
  send () {
    if (_.isEmpty(this.get('recipients'))) return
    api.sendLink(this.toJSON()).fail(yell)
  }
})

export default {
  WizardShare
}
