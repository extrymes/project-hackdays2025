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
import userAPI from '@/io.ox/core/api/user'
import groupAPI from '@/io.ox/core/api/group'
import resourceAPI from '@/io.ox/core/api/resource'
import contactAPI from '@/io.ox/contacts/api'
import ContactModel from '@/io.ox/contacts/model'
import * as util from '@/io.ox/contacts/util'

// TODO: Bulk Loading

const TYPE = {
  UNKNOWN: 0,
  USER: 1,
  USER_GROUP: 2,
  RESOURCE: 3,
  RESOURCE_GROUP: 4,
  EXTERNAL_USER: 5,
  DISTLIST: 6
}
const TYPE_PIDS = {
  0: 'unknown',
  1: 'internal',
  2: 'usergroup',
  3: 'resource',
  4: 'resourcegroup',
  5: 'external',
  6: 'distlist'
}

export const ParticipantModel = Backbone.Model.extend({

  idAttribute: 'pid',

  defaults: {
    display_name: '',
    email1: '',
    field: 'email1',
    type: 5, // external
    role: ''
  },

  loading: null,

  initialize () {
    const self = this

    // fix type attribute / for example autocomplete api
    if (_.isString(this.get('type'))) {
      let newType = TYPE.UNKNOWN
      switch (this.get('type')) {
        case 'user':
          newType = TYPE.USER
          break
        case 'group':
          newType = TYPE.USER_GROUP
          break
        case 'resource':
          newType = TYPE.RESOURCE
          break
        case 'contact':
          if (this.get('mark_as_distributionlist')) {
            newType = TYPE.DISTLIST
          } else {
            newType = TYPE.EXTERNAL_USER
          }
          break
                    // no default
      }
      this.set('type', newType)
    }

    // handling for distribution list members
    if (this.get('mail_field')) {
      this.set('field', 'email' + this.get('mail_field'))
    }

    this.loading = this.fetch().then(function () {
      self.magic()
      return self
    })
  },

  // It's a kind of magic
  magic () {
    // convert: special-contact -> user (usually used for distribution list)
    if (this.is('special-contact')) {
      this.set({
        type: TYPE.USER,
        contact_id: this.get('id'),
        id: this.get('internal_userid')
      })
    }
    // convert: special-user -> contact (usually used for autocomplete dropdown)
    if (this.is('special-user')) {
      this.set({
        type: TYPE.EXTERNAL_USER,
        internal_userid: this.get('id'),
        id: this.get('contact_id')
      })
    }
    // add: missing id for unknown external users
    if (this.is('contact') && !this.has('id')) {
      this.set('id', this.getEmail(), { silent: true })
    }
    // set pid
    this.setPID()
    // for typeahead hint
    this.value = this.getTarget() || this.getDisplayName()
  },

  setPID () {
    const pid = [TYPE_PIDS[this.get('type')], this.get('id'), this.get('field')].join('_')
    this.set('pid', pid, { silent: true })
  },

  is (type) {
    switch (type) {
      // a contact based on a user (f.e. secondary mail address)
      case 'user':
        return this.get('type') === TYPE.USER
        // a contact without connection to a user
      case 'contact':
        return this.get('type') === TYPE.EXTERNAL_USER
      case 'group':
        return this.get('type') === TYPE.USER_GROUP
      case 'resource':
        return this.get('type') === TYPE.RESOURCE
      case 'list':
        return this.get('type') === TYPE.DISTLIST
      case 'unknown':
        return this.get('type') === TYPE.UNKNOWN
        // special: a contact but actually a user with it's email2 or email3
      case 'special-contact':
        return this.is('contact') && this.get('internal_userid') && this.get('field') === 'email1'
        // special: a user object that referencing it's email2 or email3 field
      case 'special-user':
        return this.is('user') && this.get('contact_id') && this.has('field') && this.get('field') !== 'email1'
      default:
        break
    }
  },

  getContactID () {
    if (this.is('user') && this.get('contact_id')) {
      return this.get('contact_id')
    }
    return this.get('id')
  },

  getDisplayName (options) {
    options = options || {}
    const dn = options.isMail ? util.getMailFullName(this.toJSON(), options.asHtml) : util.getFullName(this.toJSON(), options.asHtml)
    // 'email only' participant
    return dn || (this.getEmail() !== '' ? this.getEmail() : '')
  },

  getEmail () {
    return util.getMail(this.toJSON())
  },

  getTarget (opt) {
    opt = _.extend({ fallback: false, strict: false }, opt)
    if (opt.fallback && this.is('list')) return 'distribution_list'
    if (opt.fallback && this.is('group')) return 'group'
    // strict option forces the use of the specified field. Prevents missleading information (user thinks theres a mail address, when there's actually non in the specific field)
    // mail_field = 0 means independent contact, which lacks specific mailfields and need the fallback in any case. So we need an exact check here
    return opt.strict && !(this.get('mail_field') === 0 && this.get('mail')) ? this.get(this.get('field')) : this.get(this.get('field')) || this.getEmail()
  },

  getFieldString () {
    return this.has('field') ? ContactModel.fields[this.get('field')] : ''
  },

  getFieldNumber () {
    if (_.isNumber(this.get('mail_field'))) {
      return this.get('mail_field')
    } else if (this.get('field')) {
      return parseInt(this.get('field').slice(-1), 10)
    }
    return 0
  },

  getAPIData () {
    const ret = {
      type: this.get('type')
    }
    if (this.get('field')) {
      ret.field = this.get('field')
    }
    if (this.get('type') === 5) {
      ret.mail = this.getTarget()
      const dn = this.getDisplayName(this.toJSON())
      if (!_.isEmpty(dn)) {
        ret.display_name = dn
      }
    } else if (this.has('id')) {
      ret.id = this.get('id')
    }
    return ret
  },

  fetch () {
    const model = this
    const update = function (data) {
      model.set(data)
    }
    const partialUpdate = function (data) {
      // keep display_name (see bug 40264)
      if (model.get('display_name')) {
        // if we have a display name we drop other names to keep it
        // since this update is done on search results
        data = _(data).omit('first_name', 'last_name', 'display_name', 'company')
      }
      // fix wrong mail field (see bug 47874)
      if (model.has('mail') && model.get('mail') !== data[model.get('field')]) {
        _.each(['email1', 'email2', 'email3'], function (key) {
          if (data[key] === model.get('mail')) data.field = key
        })
      }
      model.set(data)
    }

    switch (this.get('type')) {
      case TYPE.USER:
        if (this.get('display_name') && 'image1_url' in this.attributes) break
        return userAPI.get({ id: this.get('id') }).then(update)
      case TYPE.USER_GROUP:
        if (this.get('display_name') && this.get('members')) break
        return groupAPI.get({ id: this.get('id') }).then(update)
      case TYPE.RESOURCE:
        if (this.get('display_name')) break
        return resourceAPI.get({ id: this.get('id') }).then(update)
      case TYPE.RESOURCE_GROUP:
        this.set('display_name', 'resource group')
        break
      case TYPE.EXTERNAL_USER:
        if (this.get('display_name') && 'image1_url' in this.attributes) break
        if (this.get('id') && this.get('folder_id')) {
          return contactAPI.get(this.pick('id', 'folder_id')).then(update)
        }
        return contactAPI.getByEmailaddress(this.getEmail()).then(partialUpdate)
      case TYPE.DISTLIST:
        if (this.get('display_name') && 'distribution_list' in this.attributes) break
        return contactAPI.get(this.pick('id', 'folder_id')).then(update)
                // no default
    }

    return $.when()
  }
})

function resolveGroupMembers (participant) {
  return $.Deferred().resolve()
    .then(function () {
      // fetch members in not available yet
      const members = participant instanceof Backbone.Model ? participant.get('members') : participant.members
      return members ? { members } : groupAPI.get({ id: participant.id || participant.get('id') })
    })
    .then(function (data) {
      return userAPI.getList(data.members)
    })
    .then(function (users) {
      return _.sortBy(users, 'last_name')
    })
}

function getValue (obj, name) {
  obj = obj || {}
  return obj.get ? obj.get(name) : obj[name]
}

export const ParticipantsCollection = Backbone.Collection.extend({
  model: ParticipantModel,

  getAPIData () {
    return this.map(model => model.getAPIData())
  },

  initialize (models, options) {
    this.options = options || {}
    this.on('change', () => {
      // Deduplication on model change
      const idMap = {}
      const duplicates = []
      this.each(function (p) {
        if (!p.id) return
        if (idMap[p.id]) {
          duplicates.push(p)
        } else {
          idMap[p.id] = true
        }
      })
      this.remove(duplicates)
    })

    // wrap add function
    this.oldAdd = this.add
    this.add = this.addUniquely
    this.processing = []
  },

  resolve () {
    return $.when.apply($, this.processing)
  },

  addUniquely (list, opt) {
    const defs = _.map([].concat(list), participant => {
      // resolve user groups (recursion)
      if (this.options.splitGroups && getValue(participant, 'type') === 2) {
        return resolveGroupMembers(participant).then(this.addUniquely.bind(this))
      }

      // resolve distribution lists
      const isDistributionList = getValue(participant, 'mark_as_distributionlist')
      participant = isDistributionList ? getValue(participant, 'distribution_list') : participant

      let models = []
      const defs = []
      const omittedContacts = []

      _.each([].concat(participant), data => {
        // check if model
        // eslint-disable-next-line new-cap
        const mod = data instanceof this.model ? data : new this.model(data)
        if (this.options.needsMail) {
          // yep mail_field = 0 is possible
          if (mod.get('mail_field') !== undefined && !mod.get('mail')) {
            omittedContacts.push(mod)
            return
          }
        }
        models.push(mod)

        // wait for fetch, then add to collection
        defs.push(mod.loading)
      })

      util.validateDistributionList(omittedContacts)

      return $.when.apply($, defs).then(() => {
        models = _(models).sortBy(obj => obj.get('last_name'))
        models.forEach(model => this.oldAdd(model, opt))
        return models
      })
    })
    this.processing = this.processing.concat(_.flatten(defs))
  }
})

export default {
  Participant: ParticipantModel,
  Participants: ParticipantsCollection
}
