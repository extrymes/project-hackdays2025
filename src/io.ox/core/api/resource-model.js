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

import _ from '@/underscore'
import $ from '@/jquery'

import Backbone from '@/backbone'
import userAPI from '@/io.ox/core/api/user'
import groupAPI from '@/io.ox/core/api/group'
import uuids from '@/io.ox/core/uuids'
import { isValidMailAddress } from '@/io.ox/core/util'
import resourceAPI, { resourceCollection } from '@/io.ox/core/api/resource'

//
// Backbone Model & Collection
//

export const ResourceModel = Backbone.Model.extend({

  defaults () {
    return {
      description: '',
      display_name: '',
      // unique, analog to a user name
      name: `resource:${uuids.randomUUID()}`,
      mailaddress: '',
      // privilege of current user
      own_privilege: 'book_directly',
      availability: true,
      permissions: []
    }
  },

  initialize () {
    // ensure mandatory all-users-group
    if (this.get('permissions').length) return
    this.set('permissions', [{ entity: 0, group: true, privilege: 'book_directly' }])
  },

  validate (model, val, options = {}) {
    if (options.validate === false) return
    const errors = []
    const displayName = this.get('display_name')
    const mailAddress = this.get('mailaddress')
    if (!displayName.trim()) errors.push('display_name:missing')
    if (!mailAddress.trim()) errors.push('mailaddress:missing')
    if (resourceCollection.hasConflict('display_name', this)) errors.push('display_name:conflict')
    if (resourceCollection.hasConflict('mailaddress', this)) errors.push('mailaddress:conflict')
    if (!isValidMailAddress(mailAddress)) errors.push('mailaddress:invalid')
    return errors
  },

  getPermissionsAsCollection () {
    return new PermissionCollection(this.get('permissions'))
  },

  hasDelegates () {
    return this.getPermissionsAsCollection().getDelegates().length > 0
  },

  save () {
    return resourceAPI[this.has('id') ? 'update' : 'create'](this.toJSON())
  }

})

export const ResourceCollection = Backbone.Collection.extend({
  model: ResourceModel,

  comparator (model) {
    return (model.get('display_name') || '').toLowerCase()
  },

  fetch () {
    return resourceAPI.getAll()
  },

  hasConflict (property, model) {
    // name is used as unique identifier
    return this.reduce((memo, m) => {
      if (m.id === model.id) return memo
      if (model.get(property) === m.get(property)) return true
      return memo
    }, false)
  }
})

export const PermissionModel = Backbone.Model.extend({
  defaults: {
    entity: 0,
    group: false,
    privilege: 'delegate'
  },

  initialize () {
    this.complete = this.has('display_name')
    this.cid = `${this.attributes.group ? 'group' : 'user'}:${this.attributes.entity}`
  },

  fetch () {
    if (this.complete) return $.when()
    const api = this.get('group') ? groupAPI : userAPI
    return api.get({ id: this.get('entity') }).then(data => {
      this.set(_.pick(data, 'display_name', 'id', 'user_id', 'image1_url', 'email1', 'members'))
      this.complete = true
    })
  },

  toJSON () {
    return this.pick('entity', 'group', 'privilege')
  }
})

export const PermissionCollection = Backbone.Collection.extend({

  model: PermissionModel,

  modelId: attrs => `${attrs.group ? 'group' : 'user'}:${attrs.entity}`,

  comparator: 'display_name',

  initialize (list) {
    this.reset(list)
    this.listenTo(this, 'add remove', this.onAddRemove)
  },

  fetch () {
    const deferreds = this.map((model) => { return model.fetch() })
    return $.when.apply($, deferreds).done(() => this.sort())
  },

  onAddRemove () {
    const allUsersGroup = this.get('group:0')
    allUsersGroup.set('privilege', this.getDelegates().length > 0 ? 'ask_to_book' : 'book_directly')
  },

  getDelegates () {
    return this.where({ privilege: 'delegate' })
  },

  parse (data) {
    // supports user and group data (typeahead, picker)
    return [].concat(data).map(item => {
      // `user_id` and `mailaddress` are used by picker
      return {
        // required attributes
        entity: item.user_id || item.id,
        email1: item.mailaddress || item.email1,
        group: !!item.members,
        // optional attributes (pick to prevent props for undefined values)
        ..._.pick(item, 'display_name', 'id', 'user_id', 'image1_url', 'members')
      }
    })
  },

  toJSON () {
    const groupAllUsers = this.get('group:0')
    if (groupAllUsers.get('privilege') === 'book_directly') return [groupAllUsers.toJSON()]
    return this.map(model => model.toJSON())
  }
})
