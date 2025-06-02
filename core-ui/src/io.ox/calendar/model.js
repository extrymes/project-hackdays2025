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

import ext from '@/io.ox/core/extensions'
import * as util from '@/io.ox/calendar/util'
import folderAPI from '@/io.ox/core/folder/api'
import resourceAPI from '@/io.ox/core/api/resource'
import BasicModel from '@/io.ox/backbone/basicModel'
import Validators from '@/io.ox/backbone/validation'
import strings from '@/io.ox/core/strings'
import pModel from '@/io.ox/participants/model'
import _ from '@/underscore'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import { RecurrenceRuleMapModel } from '@/io.ox/calendar/recurrence-rule-map-model'
import userAPI from '@/io.ox/core/api/user'
import groupAPI from '@/io.ox/core/api/group'
import { getFullName, deriveNameParts, getSortName } from '@/io.ox/contacts/util'
import ox from '@/ox'

import gt from 'gettext'

// list of error codes where a folder should be removed from the selection
const removeList = [
  'FLD-1004', // folder storage service no longer available
  'FLD-0008', // folder not found
  'FLD-0003', // permission denied
  'CAL-4060', // folder is not supported
  'CAL-4030', // permission denied
  'CAL-4044' // account not found
]

const AttendeeModel = Backbone.Model.extend({

  idAttribute: 'uri',

  getCuType () {
    return this.get('cuType') || 'INDIVIDUAL'
  },

  isResource () {
    return this.get('cuType') === 'RESOURCE'
  },

  getRole () {
    return this.get('role') || 'REQ-PARTICIPANT'
  },

  isOptional () {
    return this.getRole() === 'OPT-PARTICIPANT'
  },

  toggleOptional () {
    this.set('role', this.isOptional() ? 'REQ-PARTICIPANT' : 'OPT-PARTICIPANT')
  },

  getDisplayName (formatAsHTML = false) {
    if (this.getCuType() === 'RESOURCE') {
      const cn = this.get('cn') || ''
      return formatAsHTML ? `<span class="cn">${_.escape(cn)}</span>` : cn
    } else {
      const contact = this.get('contact')
      const parts = contact?.first_name || contact?.last_name ? contact : deriveNameParts(this.get('cn'))
      return getFullName(parts, formatAsHTML)
    }
  },

  getSortName () {
    return getSortName(this.get('contact') || deriveNameParts(this.get('cn')))
  },

  isOrganizer (appointment) {
    const organizer = appointment?.organizer
    if (!organizer) return false
    // we either need entity (internal) or email (external)
    if (!organizer.entity && !organizer.email) return false
    // for external organizers we need to compare email
    if (!organizer.entity && organizer.email) return this.get('email') === organizer.email
    // eventually compare entity
    return this.get('entity') === organizer.entity
  },

  isRemovable (appointment) {
    if (!appointment) return false
    // attendess can be removed unless they are organizer
    if (this.isOrganizer(appointment)) {
      // special case: organizer can be removed from public folders
      return folderAPI.pool.getModel(appointment.folder).is('public')
    }
    // special case, users cannot remove themselves unless acting on behalf of the organizer or with edit rights
    if (!appointment.id) return true
    if (this.get('entity') !== ox.user_id) return true
    if (util.hasFlag(appointment, 'organizer_on_behalf') || appointment.attendeePrivileges === 'MODIFY') return true
    // don't allow that users remove themselves
    return false
  }
})

// be careful with the add method. If the option resolveGroups is present it changes from synchronous to asynchronous (must get the proper user data first)
const AttendeeCollection = Backbone.Collection.extend({

  model: AttendeeModel,

  // if an email is present distinguish the attendees by email address (provides support for attendee with multiple mail addresses).
  // Some attendee types don't have an email address (groups and resources), but have entity numbers. Use those as id to prevent duplicates
  modelId (attrs) {
    return attrs.uri || attrs.email || attrs.entity
  },

  initialize (models, options) {
    this.options = options || {}
    if (this.options.resolveGroups) {
      this.oldAdd = this.add
      this.add = this.addAsync
      // array to track unresolved calls to the add function, useful if you need to wait for requests requests to finish before saving etc
      this.toBeResolved = []
    }
  },

  resolveDistList (list) {
    const models = []; const defs = []
    Array.prototype.concat(list).forEach(data => {
      // check if model
      const mod = new pModel.Participant(data)
      models.push(mod)
      // wait for fetch, then add to collection
      defs.push(mod.loading)
    })
    return Promise.all(defs).then(() => models.sort((a, b) => (a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0))
  },

  // special add function that allows resolving of groups
  async addAsync (models, options) {
    let usersToResolve = []
    let groupsToResolve = []
    const groups = []
    let modelsToAdd = []
    const self = this
    // as this is an async add, we need to make sure the reset event is triggered after adding
    const isReset = options && options.previousModels !== undefined

    models = [].concat(models)
    models.forEach(function (model) {
      // try to resolve groups if possible
      if ((!self.options.noInitialResolve && model.cuType === 'GROUP') || (model.get && model.get('cuType') === 'GROUP')) {
        const users = model instanceof Backbone.Model ? model.get('members') : model.members
        const entity = model instanceof Backbone.Model ? model.get('entity') : model.entity

        // make sure id 0 works
        if (entity !== undefined) {
          self.usedGroups = _.uniq((self.usedGroups || []).concat(entity))
        }

        if (users) {
          // we have user ids
          usersToResolve = _.uniq(usersToResolve.concat(users))
        } else if (entity) {
          // we don't have user ids but it's an internal group
          groupsToResolve = _.uniq(groupsToResolve.concat({ id: entity }))
          groups.push(model)
        } else {
          // we cannot resolve this group, so we just add it to the collection
          modelsToAdd.push(model)
        }
      } else {
        modelsToAdd.push(model)
      }
    })

    async function addAttendees (self) {
      try {
        usersToResolve = _.uniq(usersToResolve.concat(_(_(await groupAPI.getList(groupsToResolve)).pluck('members')).flatten()))
      } catch (e) {
      // something went wrong, just add the group as a whole
        modelsToAdd = modelsToAdd.concat(groups)
      }
      self.options.noInitialResolve = false
      // no need to resolve users that are already attendees
      usersToResolve = _(usersToResolve).reject(function (user) {
        return _(modelsToAdd).findWhere({ entity: user })
      })
      modelsToAdd = _.compact(_.uniq(
        _.union(
          modelsToAdd,
          (await userAPI.getList(usersToResolve))
            .filter(user => !!user.email1)
            .map(user => util.createAttendee(user))
        )
      ))
      // no merge here or we would overwrite the confirm status
      self.oldAdd(modelsToAdd, options)
      // reset needs to be triggered after self.oldAdd is called (otherwise the new models wouldn't be in the collection yet)
      if (isReset) self.trigger('reset')
    }

    const promise = await addAttendees(this)
    this.toBeResolved.push(promise)
    Promise.all(this.toBeResolved).finally(() => {
      this.toBeResolved = this.toBeResolved.filter(p => p !== promise)
    })

    return promise
  }
})

const Model = BasicModel.extend({
  idAttribute: 'cid',
  ref: 'io.ox/chronos/model/',
  init () {
    // models in create view do not have an id yet. avoid undefined.undefined cids
    if (this.attributes.folder && this.attributes.id) {
      this.cid = this.attributes.cid = util.cid(this.attributes)
    }
    this.onChangeFlags()
    this.on({
      'change:flags': this.onChangeFlags,
      'change:startDate': this.onChangeStartDate,
      'change:endDate': this.onChangeEndDate
    })
  },
  onChangeStartDate () {
    if (!this.adjustEndDate) return
    if (this.changedAttributes().endDate) return
    if (!this.has('endDate')) return
    const prevStartDate = util.getMoment(this.previous('startDate')); let endDate = this.getMoment('endDate')
    endDate = this.getMoment('startDate').tz(endDate.tz()).add(endDate.diff(prevStartDate, 'ms'), 'ms')
    this.set('endDate', util.isAllday(this) ? { value: endDate.format('YYYYMMDD') } : { value: endDate.format('YYYYMMDD[T]HHmmss'), tzid: endDate.tz() })
  },
  onChangeEndDate () {
    if (this.changedAttributes().startDate) return
    if (!this.has('startDate')) return
    // treat same date as still valid in model(not valid on save but creates better UX in the edit dialogs, especially when dealing with allday appointments (the edit view subtracts a day to not confuse users))
    if (this.getMoment('startDate').isSameOrBefore(this.getMoment('endDate'))) return
    let startDate = this.getMoment('startDate'); const prevEndDate = util.getMoment(this.previous('endDate'))
    startDate = this.getMoment('endDate').tz(startDate.tz()).add(startDate.diff(prevEndDate, 'ms'), 'ms')
    this.adjustEndDate = false
    this.set('startDate', util.isAllday(this) ? { value: startDate.format('YYYYMMDD') } : { value: startDate.format('YYYYMMDD[T]HHmmss'), tzid: startDate.tz() })
    this.adjustEndDate = true
  },
  onChangeFlags () {
    this.flags = _.object(this.get('flags'), this.get('flags'))
  },
  getAttendees () {
    if (this._attendees) return this._attendees

    let resetListUpdate = false
    const attendees = this.get('attendees') || []
    let changeAttendeesUpdate = false

    // you want to skip resolving groups when first creating the attendeeCollection. Otherwise the model would be dirty without any change
    this._attendees = new AttendeeCollection(attendees, { resolveGroups: true, silent: false, noInitialResolve: attendees.length > 1 })

    // we cannot use debounce on this one (edit appointment will run into nasty race conditions, e.g. missing organizer)
    this._attendees.on('add remove reset change:role', () => {
      if (changeAttendeesUpdate) return
      resetListUpdate = true
      this.set('attendees', this._attendees.toJSON(), { validate: true })
      resetListUpdate = false
    })

    this.on({
      'change:attendees': () => {
        if (resetListUpdate) return
        changeAttendeesUpdate = true
        this._attendees.reset(this.get('attendees') || [])
        changeAttendeesUpdate = false
      }
    })
    return this._attendees
  },

  setDefaultAttendees (options) {
    if (!options.create) return Promise.resolve()
    const self = this
    return folderAPI.get(this.get('folder')).then(function (folder) {
      return getOwnerData(folder).then(function (organizer) {
        self.set('organizer', organizer)
        const newAttendee = util.createAttendee(organizer, { partStat: 'ACCEPTED' })
        const id = newAttendee.email ? { email: newAttendee.email } : { entity: newAttendee.entity }

        if (options.resetStates) {
          self.getAttendees().each(function (model) {
            model.set('partStat', 'NEEDS-ACTION')
          })
        }
        // Merge attributes or add
        if (_(self.get('attendees')).findWhere(id)) {
          _(self.get('attendees')).findWhere(id).partStat = 'ACCEPTED'
          // trigger add manually to make sure the attendee attribute and collection are synced correctly -> see follow up events action
          self.trigger('change:attendees')
        } else {
          self.getAttendees().add(newAttendee)
        }
      })
    })
  },
  addSelectedResources (options) {
    if (!options.create || !this.get('selectedResourceFolders')) return Promise.resolve()
    const self = this
    const resourceIds = this.get('selectedResourceFolders').map(resource => ({ id: resource.match(/\d+$/g)[0] }))
    return resourceAPI.getList(resourceIds).then(function (resourcesToAdd) {
      const resourceAttendees = resourcesToAdd
        .map(resource => util.createAttendee({ ...resource, type: 3 }, { partStat: 'ACCEPTED' }))
      self.getAttendees().add(resourceAttendees)
    })
  },
  getMoment (name) {
    if (!this.has(name)) return
    return util.getMoment(this.get(name))
  },
  getTimestamp (name) {
    if (!this.get(name)) return
    return this.getMoment(name).valueOf()
  },
  parse (res) {
    if (res.folder && res.id) res.cid = res.cid = util.cid(res)
    // if there was a change to the model in the meantime, clear all attributes that are not in the response
    // if we don't do this we get models with 2 states mixed into one (current but incomplete all request data vs complete but outdated get request data)
    // this can lead to flags not matching up with the rest of the model for example
    if (res.lastModified && this.get('lastModified') && res.lastModified !== this.get('lastModified')) {
      for (const attr in this.attributes) {
        if (!_.has(res, attr)) this.unset(attr, { silent: true })
      }
    }
    if (!res.summary && res.folder.includes('cal://0/resource')) {
      const resource = folderAPI.pool.getModel(res.folder)
      // #. %1$s: the title of a reserved resource. Used as appointment summary.
      res.summary = gt('Reservation for: %1$s', resource.get('title'))
    }
    return res
  },
  getRruleMapModel () {
    if (this.rruleModel) return this.rruleModel
    this.rruleModel = new RecurrenceRuleMapModel({ model: this })
    return this.rruleModel
  },
  hasFlag (flag) {
    return !!this.flags[flag]
  },
  // compares startDate with recurrence rule to check if the rule is correct (startDate wednesday, rrule says repeats on mondays)
  checkRecurrenceRule () {
    if (!this.get('rrule')) return true
    // Monday is 1 Sunday is 7, we subtract 1 so we can use it as an index
    const startDateIndex = this.getMoment('startDate').isoWeekday() - 1
    const days = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su']
    const rrule = this.getRruleMapModel().splitRule()

    if (_.isEmpty(rrule.byday)) return true

    const usedDays = _([].concat(rrule.byday)).map(function (val) { return days.indexOf(val) })

    return usedDays.indexOf(startDateIndex) !== -1
  },
  isResource () {
    return this.get('folder').includes('cal://0/resource')
  }
})

ext.point('io.ox/chronos/model/validation').extend({
  id: 'start-date-before-end-date',
  validate (attr, err, model) {
    if (model.getTimestamp('endDate') < model.getTimestamp('startDate')) {
      this.add('endDate', gt('The end date must be after the start date.'))
    }
  }
})

ext.point('io.ox/chronos/model/validation').extend({
  id: 'upload-quota',
  validate (attributes) {
    if (attributes.quotaExceeded) {
      // #. %1$s is an upload limit like for example 10mb
      this.add('quota_exceeded', gt('Files can not be uploaded, because upload limit of %1$s is exceeded.', strings.fileSize(attributes.quotaExceeded.attachmentMaxUploadSize, 2)))
    }
  }
})

ext.point('io.ox/chronos/model/validation').extend({
  id: 'secret-used-with-resource',
  validate (attributes) {
    if (attributes.class === 'PRIVATE' && _(_(attributes.attendees).pluck('cuType')).contains('RESOURCE')) {
      // #. error text is displayed when an appointment is marked as secret but blocking a resource (e.g. a conference room)
      this.add('class', gt('You cannot mark the appointment as secret, when blocking a resource.'))
    }
  }
})

Validators.validationFor('io.ox/chronos/model', {
  summary: { format: 'string', mandatory: true }
})

const Collection = Backbone.Collection.extend({

  model: Model,

  setOptions (opt) {
    this.folders = opt.folders
    this.start = opt.start
    this.end = opt.end
  },

  comparator (model) {
    return model.getTimestamp('startDate')
  },

  async sync (opt) {
    const self = this
    opt = opt || {}
    if ((!this.expired && this.length > 0) || (this.folders && this.folders.length === 0)) {
      _.defer(self.trigger.bind(self, 'load'))
      return Promise.resolve()
    }
    // important: mark as expired before any await.
    // Otherwise we will get race conditions with the collection pool garbage collector (collection is removed before it can be marked as expired=false)
    // see OXUIB-1722
    this.expired = false

    // import here because of circular dependency
    const api = (await import('@/io.ox/calendar/api')).default
    const params = {
      action: 'all',
      rangeStart: moment(this.start).utc().format(util.ZULU_FORMAT),
      rangeEnd: moment(this.end).utc().format(util.ZULU_FORMAT),
      fields: api.defaultFields,
      order: 'asc',
      sort: 'startDate',
      expand: true
    }

    _.defer(this.trigger.bind(this, 'before:load'))

    return api.request({
      module: 'chronos',
      params,
      data: { folders: this.folders }
    }, this.folders ? 'PUT' : 'GET').then(function success (data) {
      const method = opt.paginate === true ? 'add' : 'reset'
      data = _(data)
        .chain()
        // Appointments from standard folders should appear before resource calendar appointments
        .sort((a, b) => a.folder.indexOf('cal://0/resource') - b.folder.indexOf('cal://0/resource'))
        .map(function (data) {
          // no folders defaults to all folder
          if (!self.folders) return data
          if (data.events) return data.events
          if (!_(removeList).contains(data.error.code)) return undefined
          api.trigger('all:fail', data.folder)
          return undefined
        })
        .compact()
        .flatten()
        .each(function (event) {
          event.cid = util.cid(event)
        })
        .sortBy(function (event) {
          return util.getMoment(event.startDate).valueOf()
        })
        .value()

      self[method](data, { parse: true })
      self.trigger('load')
      return data
    }, function fail (err) {
      self.trigger('load:fail', err)
    })
  }

})

// helper to get userData about a folder owner, uses created_from if available with created_by as fallback
function getOwnerData (folderData) {
  const isPublic = folderAPI.is('public', folderData)

  // shared and private folder use the folder creator as organizer, public uses the current user
  if (folderData.created_from && !isPublic && folderData.created_from.display_name && folderData.created_from.contact && folderData.created_from.contact.email1) {
    return Promise.resolve({
      cn: folderData.created_from.display_name,
      email: folderData.created_from.contact.email1,
      uri: 'mailto:' + folderData.created_from.contact.email1,
      entity: folderData.created_from.entity,
      contact: folderData.created_from.contact
    })
  }
  return import('@/io.ox/core/api/user').then(({ default: userAPI }) => {
    return userAPI.get({ id: !isPublic ? folderData.created_by : undefined }).then(user => {
      return {
        cn: user.display_name,
        email: user.email1,
        uri: 'mailto:' + user.email1,
        entity: user.id,
        contact: user
      }
    })
  })
}

export default {
  Model,
  Collection,
  AttendeeCollection,
  AttendeeModel
}
