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

import http from '@/io.ox/core/http'
import Pool from '@/io.ox/core/api/collection-pool'
import folderApi from '@/io.ox/core/folder/api'
import * as util from '@/io.ox/calendar/util'
import { getConfirmationStatus } from '@/io.ox/calendar/util'
import models from '@/io.ox/calendar/model'
import capabilities from '@/io.ox/core/capabilities'
import _ from '@/underscore'
import ox from '@/ox'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import yell from '@/io.ox/core/yell'
import { settings } from '@/io.ox/calendar/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { hasFeature } from '@/io.ox/core/feature'
import { getMiddlewareVersion } from '@/io.ox/core/util'

const isRecurrenceRoot = function (data) {
  // do not add model to pool if it is a root model of a recurring event
  if (data.rrule && !data.recurrenceId) return true
  return false
}
const removeFromPool = function (event) {
  // cannot find event when it is recurrence root
  let events = api.pool.getModel(util.cid(event))
  if (events) events = [events]
  else events = api.pool.findRecurrenceModels(event)
  if (coreSettings.get('features/resourceCalendars', false) && events.length > 0) {
    events.push.apply(events, resources.getSelectedAttendees(event))
  }
  events.forEach(function (evt) {
    evt.collection.remove(evt)
    api.trigger('delete', evt.attributes)
    api.trigger('delete:' + util.cid(evt), evt.attributes)
  })
}
// updates pool based on writing operations response (create update delete etc)
const processResponse = function (response, options) {
  if (!response) return

  // post request responses are arrays with data and timestamp
  response = response.data || response

  _(response.deleted).each(removeFromPool)

  _(response.created).each(function (event) {
    if (!isRecurrenceRoot(event)) api.pool.propagateAdd(event)
    api.trigger('process:create', event)
    api.trigger('process:create:' + util.cid(event), event)
  })

  _(response.updated).each(function (event) {
    if (isRecurrenceRoot(event)) {
      const events = api.pool.findRecurrenceModels(event)
      const updates = _(event).pick('attendees', 'alarms', 'flags', 'timestamp')
      events.forEach(function (evt) {
        // exclude exceptions here, would result in wrong cache data (declined appointments suddenly looking accepted etc)
        if (evt.hasFlag('overridden')) return
        evt.set(updates)
        api.trigger('update', evt.attributes)
        api.trigger('update:' + util.cid(evt), evt.attributes, { updateData: { showRecurrenceInfo: options && options.showRecurrenceInfo } })
      })
    } else {
      // first we must remove the unused attributes (don't use clear method as that kills the id and we cannot override the model again with add)
      // otherwise attributes that no longer exists are still present after merging (happens if an event has no attachments anymore for example)
      const model = api.pool.getModel(util.cid(event))
      let removeAttributes

      if (model) {
        removeAttributes = _.difference(_(model.attributes).keys(), _(event).keys(), ['index', 'cid'])
        removeAttributes.forEach(function (attr) {
          event[attr] = undefined
        })
      }

      api.pool.propagateUpdate(event)
    }
    api.trigger('update', event)
    api.trigger('update:' + util.cid(event), event, { updateData: { showRecurrenceInfo: options && options.showRecurrenceInfo } })
  })

  const errors = (response.failed || []).concat(response.error)
  _(errors).each(function (error) {
    yell(error)
  })

  return response
}

const resources = {
  getSelectedAttendees (obj) {
    const app = ox.ui.App.getCurrentApp()
    if (!obj || app.id !== 'io.ox/calendar') return []

    const selectedFolders = app.folders.folders.filter(folder => folder.includes('cal://0/resource'))
    if (obj.attendees) {
      const resourceIds = obj.attendees.filter(att => !!att.resource).map(att => att.resource.id)
      return selectedFolders.filter(folder => resourceIds.includes(parseInt(folder.split('cal://0/resource')[1], 10)))
    }

    return selectedFolders
      .map(folder => api.pool.getModel(util.cid({ ...obj, ...{ folder } })))
      .filter(Boolean)
  },
  addAppointments (events, selectedResourceFolders) {
    if (!events || selectedResourceFolders?.length === 0) return
    events.forEach(event => {
      selectedResourceFolders.forEach(folder => {
        const appointmentToAdd = { ...event, ...{ folder } }
        delete appointmentToAdd.cid
        api.pool.propagateAdd(appointmentToAdd)
      })
    })
  }
}
const defaultFields = ['lastModified', 'color', 'createdBy', 'endDate', 'flags', 'folder', 'id', 'location', 'recurrenceId', 'rrule', 'seriesId', 'startDate', 'summary', 'timestamp', 'transp', 'attendeePrivileges', 'categories'].join(',')

const api = {
  // used externally by itip updates in mail invites
  updatePoolData: processResponse,

  getAttachmentsHashKey: data => `1:${_.cid({ id: data.id, folder_id: data.folder || data.folder_id })}`,

  // convenience function
  cid: util.cid,

  defaultFields,

  request: (function () {
    function getParams (opt, start, end) {
      opt = _.clone(opt)
      opt.params = _.extend({}, opt.params, {
        rangeStart: start.format(util.ZULU_FORMAT),
        rangeEnd: end.format(util.ZULU_FORMAT)
      })
      return opt
    }
    function merge (data1, data2) {
      return _(data1)
        .chain()
        .union(data2)
        .uniq(function (event) { return util.cid(event) })
        .compact()
        .value()
    }
    return function request (opt, method) {
      method = method || 'GET'
      return http[method](opt).then(function (result) {
        if (_.isArray(result)) {
          let error
          result.forEach(function (r) {
            if (r.error) {
              ox.trigger('http:error:' + r.error.code, r.error)
              error = r.error
            }
          })
          // only throw that specific error too many appointments error because otherwise this error might only affect a few folders
          if (error && error.code === 'CAL-5072') throw error
        }
        return result
      }).catch(function (err) {
        if (err.code !== 'CAL-5072') throw err
        const start = moment(opt.params.rangeStart).utc()
        const end = moment(opt.params.rangeEnd).utc()
        const diff = end.diff(start, 'ms')
        const middle = moment(start).add(diff / 2, 'ms')
        // stop requests when timeframe is smaller than an hour, see Bug 68641
        if (diff <= 3600000) {
          throw err
        }

        // use multiple to speed this up
        http.pause()
        const def = $.when(request(getParams(opt, start, middle), method), request(getParams(opt, middle, end), method)).then(function (data1, data2) {
          if (!_.isArray(data1)) return merge(data1, data2)
          data1.forEach(function (d, index) {
            d.events = merge(d.events, data2[index].events)
          })
          return data1
        })
        http.resume()

        return def
      })
    }
  }()),

  get (obj, useCache) {
    obj = obj instanceof Backbone.Model ? obj.toJSON() : obj

    if (useCache !== false) {
      const model = api.pool.getModel(util.cid(obj))
      if (model && model.get('attendees')) return $.when(model)
    }
    // if an alarm object was used to get the associated event we need to use the eventId not the alarm Id
    if (obj.eventId) {
      obj.id = obj.eventId
    }

    return http.GET({
      module: 'chronos',
      params: {
        action: 'get',
        id: obj.id,
        recurrenceId: obj.recurrenceId,
        folder: obj.folder,
        extendedEntities: true
      }
    }).then(function (data) {
      if (data.id !== obj.id) {
        // something's wrong, probably an exception was created by another client.
        // real error vs just a new exception
        if (data.seriesId !== obj.id) {
          // to help in debugging if needed
          console.error('calendar error: id ' + obj.id + ' was requested, but id ' + data.id + ' was returned', obj, data)
        }
      }
      if (isRecurrenceRoot(data)) return api.pool.get('detail').add(data)
      api.pool.propagateAdd(data)
      return api.pool.getModel(data)
    })
  },

  resolve (id, useCache) {
    let sequence
    if (_.isObject(id)) {
      sequence = id.sequence
      id = id.id
    }
    if (useCache !== false) {
      const collections = api.pool.getCollections(); let model
      _(collections).find(function (data) {
        const collection = data.collection
        model = collection.find(function (m) {
          return m.get('id') === id && !m.has('recurrenceId') && (sequence === undefined || m.get('sequence') === sequence)
        })
        return !!model
      })
      if (model) return $.when(model)
    }

    const params = {
      action: 'resolve',
      id,
      fields: api.defaultFields
    }
    if (sequence !== undefined) params.sequence = sequence

    return http.GET({
      module: 'chronos',
      params
    }).then(function (data) {
      // When an appointment has been deleted, data is undefined
      if (!data) return
      if (isRecurrenceRoot(data)) return api.pool.get('detail').add(data)
      api.pool.propagateAdd(data)
      return api.pool.getModel(data)
    })
  },

  getList: (function () {
    function requestList (list) {
      return http.PUT({
        module: 'chronos',
        params: {
          action: 'list',
          fields: defaultFields
        },
        data: list
      }).catch(function (err) {
        if (err.code !== 'CAL-5072') throw err
        // split list in half if error code suggested a too large list
        const list1 = _(list).first(Math.ceil(list.length / 2))
        const list2 = _(list).last(Math.floor(list.length / 2))
        return requestList(list1).then(function (data1) {
          return requestList(list2).then(function (data2) {
            return [].concat(data1).concat(data2)
          })
        })
      })
    }
    return function (list, useCache) {
      const alarms = []
      list = _(list).map(function (obj) {
        // if an alarm object was used to get the associated event we need to use the eventId not the alarm Id
        if (obj.eventId) {
          alarms.push(obj)
          return { id: obj.eventId, folder: obj.folder, recurrenceId: obj.recurrenceId }
        }
        return obj
      })

      let reqList = list

      if (useCache !== false) {
        reqList = list.filter(function (obj) {
          const model = api.pool.getModel(util.cid(obj))
          // since we are using a list request even models without attendees are fine
          return !model
        })
      }

      let def = Promise.resolve()
      if (reqList.length > 0) def = requestList(reqList)

      return def.then(function (data) {
        if (data) {
          data.forEach(function (obj, index) {
            if (obj === null) {
              const alarm = { eventId: reqList[index].id, folder: reqList[index].folder }
              if (reqList[index].recurrenceId) alarm.recurrenceId = reqList[index].recurrenceId
              api.trigger('failedToFetchEvent', _(alarms).findWhere(alarm))
              api.trigger('delete:appointment', reqList[index])
              // null means the event was deleted, clean up the caches
              processResponse({
                deleted: [reqList[index]]
              })
              return
            }
            if (isRecurrenceRoot(obj)) return

            const model = api.pool.getModel(util.cid(obj))
            // do not overwrite cache data that has attendees and the same or newer lastModified timestamp
            if (model && model.get('attendees') && (model.get('lastModified') >= obj.lastModified)) {
              return
            }
            api.pool.propagateAdd(obj)
          })
        }

        return list.map(function (obj) {
          // if we have full data use the full data, in list data recurrence ids might be missing
          // you can request exceptions without recurrence id because they have own ids, but in the response they still have a recurrence id, which is needed for the correct cid
          if (data) {
            // find correct index
            const index = _(reqList).findIndex(function (req) {
              return req.id === obj.id && req.folder === obj.folder && (!req.recurrenceId || req.recurrenceId === obj.recurrenceId)
            })
            if (index !== -1 && data[index]) {
              obj = data[index]
            } else if (index !== -1 && data[index] === null) {
              // null is returned when the event was deleted meanwhile
              return null
            }
          }

          if (isRecurrenceRoot(obj)) {
            return api.pool.get('detail').add(obj)
          }
          const cid = util.cid(obj)
          // in case of caching issues still return the request results. no one wants empty reminders
          return api.pool.getModel(cid) || obj
        })
      })
    }
  }()),

  create (obj, options) {
    options = options || {}

    obj = obj instanceof Backbone.Model ? obj.toJSON() : obj
    obj = _(obj).pick(function (value) {
      return value !== '' && value !== undefined && value !== null
    })
    if (coreSettings.get('features/resourceCalendars', false)) options.selectedResourceAttendees = resources.getSelectedAttendees(obj)

    const params = {
      action: 'new',
      folder: obj.folder,
      // convert to true boolean
      checkConflicts: !!options.checkConflicts,
      sendInternalNotifications: true,
      fields: api.defaultFields
    }
    let def

    if (ox.socketConnectionId) params.pushToken = ox.socketConnectionId

    if (options.expand) {
      params.expand = true
      params.rangeStart = options.rangeStart
      params.rangeEnd = options.rangeEnd
    }

    // backend uses this to calculate the usecount of groups (frontend resolves them that's why we tell the backend manually which groups were used)
    if (options.usedGroups) {
      params.usedGroups = _(options.usedGroups).isArray() ? options.usedGroups.join(',') : options.usedGroups
    }

    if (options.attachments && options.attachments.length) {
      const formData = new FormData()

      formData.append('json_0', JSON.stringify(obj))
      for (let i = 0; i < options.attachments.length; i++) {
        // the attachment data is given via the options parameter
        formData.append(`file_${options.attachments[i].cid}`, options.attachments[i].file)
      }
      def = http.UPLOAD({
        module: 'chronos',
        params,
        data: formData,
        fixPost: true
      })
    } else {
      def = http.PUT({
        module: 'chronos',
        params,
        data: obj
      })
    }
    return def.then(processResponse)
      .then(function (data) {
        // post request responses are arrays with data and timestamp
        data = data.data || data
        api.getAlarms()
        // return conflicts or new model
        if (data.conflicts) {
          return data
        }
        if (data.created.length > 0) api.trigger('create', data.created[0])
        if (data.created.length > 0 && coreSettings.get('features/resourceCalendars', false) && options.selectedResourceAttendees.length > 0) resources.addAppointments(data.created, options.selectedResourceAttendees)
        if (data.created.length > 0 && isRecurrenceRoot(data.created[0])) return api.pool.get('detail').add(data)
        if (data.created.length > 0) return api.pool.getModel(data.created[0])
      })
  },

  update (obj, options) {
    options = options || {}

    obj = obj instanceof Backbone.Model ? obj.toJSON() : obj
    obj = _(obj).mapObject(function (value) {
      if (value === '') return null
      return value
    })
    if (coreSettings.get('features/resourceCalendars', false)) options.selectedResourceAttendees = resources.getSelectedAttendees(obj)

    let def
    const params = {
      action: 'update',
      folder: obj.folder,
      id: obj.id,
      timestamp: _.then(),
      // convert to true boolean
      checkConflicts: !!options.checkConflicts,
      sendInternalNotifications: true,
      recurrenceRange: options.recurrenceRange,
      fields: api.defaultFields
    }

    if (ox.socketConnectionId) params.pushToken = ox.socketConnectionId

    if (obj.recurrenceId) params.recurrenceId = obj.recurrenceId

    if (options.expand) {
      params.expand = true
      params.rangeStart = options.rangeStart
      params.rangeEnd = options.rangeEnd
    }

    // backend uses this to calculate the usecount of groups (frontend resolves them that's why we tell the backend manually which groups were used)
    if (options.usedGroups) {
      params.usedGroups = _(options.usedGroups).isArray() ? options.usedGroups.join(',') : options.usedGroups
    }

    const data = {
      event: obj
    }

    if (options.comment) data.comment = options.comment

    if (options.attachments && options.attachments.length) {
      const formData = new FormData()

      formData.append('json_0', JSON.stringify(data))
      for (let i = 0; i < options.attachments.length; i++) {
        // the attachment data is given via the options parameter
        formData.append(`file_${options.attachments[i].cid}`, options.attachments[i].file)
      }
      def = http.UPLOAD({
        module: 'chronos',
        params,
        data: formData,
        fixPost: true
      })
    } else {
      def = http.PUT({
        module: 'chronos',
        params,
        data
      })
    }
    return def.then(function (response) {
      processResponse(response, options)
      return response
    }).then(function (data) {
      // post request responses are arrays with data and timestamp
      data = data.data || data

      api.getAlarms()
      // return conflicts or new model
      if (data.conflicts) {
        return data
      }
      if (options.selectedResourceAttendees?.length > 0) api.trigger('updateResourceFolders')

      // in case we are in search mode we want to trigger a collection update (search collection is not part of the pool)
      api.trigger('updateSearchCollection')
      const updated = data.updated ? data.updated[0] : undefined
      if (!updated) return api.pool.getModel(util.cid(obj))
      if (isRecurrenceRoot(updated)) return api.pool.get('detail').add(data)
      // update the root model, even though only occurrences were updated
      if (!obj.recurrenceId && updated.recurrenceId) api.pool.getModel(obj).set(obj)
      return api.pool.getModel(updated)
    })
  },

  remove (list, options) {
    options = _.extend({}, options)
    api.trigger('beforedelete', list)
    list = _.isArray(list) ? list : [list]

    const params = {
      action: 'delete',
      timestamp: _.then(),
      fields: api.defaultFields
    }
    const data = {
      events: _(list).map(function (obj) {
        obj = obj instanceof Backbone.Model ? obj.toJSON() : obj
        const params = {
          id: obj.id,
          folder: obj.folder
        }
        if (obj.recurrenceId) params.recurrenceId = obj.recurrenceId
        if (obj.recurrenceRange) params.recurrenceRange = obj.recurrenceRange
        return params
      })
    }

    if (ox.socketConnectionId) params.pushToken = ox.socketConnectionId

    if (options.expand) {
      params.expand = true
      params.rangeStart = options.rangeStart
      params.rangeEnd = options.rangeEnd
    }

    if (options.comment) data.comment = options.comment

    return http.PUT({
      module: 'chronos',
      params,
      data
    })
      .then(function (data) {
        data.forEach(processResponse)
        // in case we are in search mode we want to trigger a collection update (search collection is not part of the pool)
        api.trigger('updateSearchCollection')
        return data
      })
      .then(function (data) {
        api.getAlarms()
        return data
      })
  },

  confirm (obj, options) {
    options = options || {}
    // no empty string comments (clutters database)
    // if comment should be deleted, send null. Just like in settings
    if (obj.attendee.comment === '') delete obj.attendee.comment

    // make sure alarms are explicitly set to null when declining, otherwise the user is reminded of declined appointments, we don't want that
    // do this in api to catch all cases (shortcut buttons, full dialogs, mail invitations etc)
    if (obj.attendee.partStat === 'DECLINED') obj.alarms = null

    let folder = obj.folder
    let needsRefreshOfResourceFolder = false
    if (obj.attendee.cuType === 'RESOURCE') {
      folder = `cal://0/resource${obj.attendee.entity}`
      // updates in response only contain updates for regular folders. We need to update the resource folder manually
      needsRefreshOfResourceFolder = true
    }

    const params = {
      action: 'updateAttendee',
      id: obj.id,
      folder,
      checkConflicts: options.checkConflicts,
      sendInternalNotifications: true,
      timestamp: _.then(),
      fields: api.defaultFields
    }
    const data = {
      attendee: obj.attendee
    }

    if (ox.socketConnectionId) params.pushToken = ox.socketConnectionId

    if (obj.recurrenceId) {
      params.recurrenceId = obj.recurrenceId
    }
    // null means remove alarms
    if (obj.alarms || obj.alarms === null) {
      data.alarms = obj.alarms
    }
    if (options.expand) {
      params.expand = true
      params.rangeStart = options.rangeStart
      params.rangeEnd = options.rangeEnd
    }

    api.trigger('before:confirm', params)

    return http.PUT({
      module: 'chronos',
      params,
      data
    })
      .then(processResponse)
      .then(function (response) {
        if (!response.conflicts) {
          if (response.updated && response.updated.length) {
            // updates notification area for example
            // don't use api.pool.getModel as this returns undefined if the recurrence root was updated
            api.trigger('mark:invite:confirmed', { folder: params.folder, id: params.id }, getConfirmationStatus(response.updated[0]))
          } else if (response.updated && response.updated.length === 0) {
            // updates where possibly out of range, get new invites to remove invites and update data
            api.getInvites()
          }

          if (needsRefreshOfResourceFolder) {
            api.get(_(params).pick('folder', 'id', 'recurrenceId'), false).then((event) => {
              api.pool.propagateUpdate(event)
              api.trigger('update', event)
              api.trigger('update:' + util.cid(event), event)
            })
          }
        }

        // remove root model from pool if series confirmation was changed (series root flags etc have changed too, so data is outdated)
        // careful here, we must check that the root model is in the pool, otherwise we risk removing the series occurrences instead
        if (!params.recurrenceId && response.updated && response.updated[0]?.recurrenceId && api.pool.getModel(util.cid(params))) removeFromPool(params)

        // in case we are in search mode we want to trigger a collection update (search collection is not part of the pool)
        api.trigger('updateSearchCollection')
        return response
      })
      .always(() => api.trigger('after:confirm', params))
  },

  updateAlarms (obj, options) {
    const params = {
      action: 'updateAlarms',
      id: obj.id,
      folder: obj.folder,
      timestamp: _.now(),
      fields: api.defaultFields + ',alarms,rrule'
    }

    if (obj.recurrenceId) {
      params.recurrenceId = obj.recurrenceId
    }

    if (options.expand) {
      params.expand = true
      params.rangeStart = options.rangeStart
      params.rangeEnd = options.rangeEnd
    }

    return http.PUT({
      module: 'chronos/alarm',
      params,
      data: obj.alarms
    })
      .then(function (data) {
        // somehow the backend misses the alarms property when alarms are set to 0
        if (obj.alarms.length === 0 && !obj.recurrenceId) {
          data.updated[0].alarms = []
        }
        processResponse(data)
      })
  },

  // returns freebusy data
  async freebusy (attendees, options) {
    if (attendees.length === 0) return []

    options = {
      from: moment().startOf('day').utc().format(util.ZULU_FORMAT),
      until: moment().startOf('day').utc().add(1, 'day').format(util.ZULU_FORMAT),
      ...options
    }

    // only use uri. entity only works for internal users/resources, which can also appear as external in some cases, causing ugly issues
    const order = attendees.map(({ uri }) => uri)
    try {
      const items = await http.PUT({
        module: 'chronos',
        params: {
          action: 'freeBusy',
          from: options.from,
          until: options.until
        },
        data: { attendees }
      })
      // response order might not be the same as in the request. Fix that.
      items.sort((a, b) => {
        return order.indexOf(a.attendee.uri) - order.indexOf(b.attendee.uri)
      })
      return items
    } catch (err) {
      // to many events
      if (err.code !== 'CAL-5072') throw err
      // split request and send as multiple instead
      http.pause()
      attendees.forEach((attendee) => {
        http.PUT({
          module: 'chronos',
          params: {
            action: 'freeBusy',
            from: options.from,
            until: options.until
          },
          data: { attendees: [attendee] }
        })
      })
      const result = await http.resume()
      // change errors to empty arrays. If theres an error with one attendee we can still show the rest
      return result.map((singleResult) => {
        return singleResult.error ? { freeBusyTime: [] } : singleResult.data[0]
      })
    }
  },

  reduce (obj) {
    obj = obj instanceof Backbone.Model ? obj : _(obj)
    return obj.pick('id', 'folder', 'recurrenceId')
  },

  async move (list, targetFolderId, options) {
    options = options || {}
    // get array
    list = _.isArray(list) ? list : [list]
    list = [...list]
    const models = list.map((obj) => {
      const cid = util.cid(obj)
      const collection = api.pool.getCollectionsByModel(obj)[0]
      const model = collection.get(cid)
      collection.remove(model)
      return model
    })

    http.pause()
    models.map((model) => {
      const params = {
        action: 'move',
        id: model.get('id'),
        folder: model.get('folder'),
        targetFolder: targetFolderId,
        recurrenceId: model.get('recurrenceId'),
        sendInternalNotifications: true,
        timestamp: _.then(),
        fields: api.defaultFields
      }

      if (ox.socketConnectionId) params.pushToken = ox.socketConnectionId

      if (options.expand) {
        params.expand = true
        params.rangeStart = options.rangeStart
        params.rangeEnd = options.rangeEnd
      }
      return http.PUT({
        module: 'chronos',
        params
      })
    })
    return http.resume().then((data) => {
      const error = data.find((res) => {
        return !!res.error
      })
      if (error) {
        // reset models
        models.forEach((model) => {
          api.pool.propagateAdd(model.toJSON())
        })
        throw error.error
      }
      return data
    }).then((data) => {
      data.forEach(processResponse)
      return data
    }).done((list) => {
      list.forEach((obj) => {
        api.trigger('move:' + util.cid(obj), targetFolderId)
        api.trigger('move:' + util.cid(obj.data.deleted[0]), obj.data.created[0])
        api.trigger('move', obj.data.created[0])
      })
      api.trigger('refresh.all')
    })
  },

  getInvites () {
    const params = {
      action: 'needsAction',
      folder: folderApi.getDefaultFolder('calendar'),
      rangeStart: moment().subtract(2, 'hours').utc().format(util.ZULU_FORMAT),
      rangeEnd: moment().add(1, 'years').utc().format(util.ZULU_FORMAT),
      fields: 'folder,id,recurrenceId,organizer,endDate,startDate,summary,location,rrule',
      sort: 'startDate'
    }

    if (hasFeature('managedResources')) params.includeDelegates = true

    return http.GET({
      module: 'chronos',
      params
    }).then(function (data = []) {
      if (!hasFeature('managedResources')) {
        api.trigger('new-invites', data)
        return data
      }
      const resourceRequests = []
      const invitations = []
      data.forEach(attendeeInvitations => {
        attendeeInvitations.events.forEach(event => {
          event.attendeeData = attendeeInvitations.attendee
          // put resource requests and event invitations into separate arrays
          if (attendeeInvitations.attendee.cuType === 'RESOURCE') return resourceRequests.push(event)
          // drop invitations from shared calendars (with write access) for now until we have a decision
          if (attendeeInvitations.attendee.entity !== ox.user_id) return
          return invitations.push(event)
        })
      })

      // even if empty array is given it needs to be triggered to remove
      // notifications that does not exist anymore (already handled in ox6 etc)
      // no filtering needed because of new needsAction request
      api.trigger('new-invites', invitations)
      api.trigger('resource-requests', resourceRequests)
      return data
    })
  },

  getAlarms () {
    const params = {
      action: 'pending',
      rangeEnd: moment.utc().add(10, 'hours').format(util.ZULU_FORMAT),
      actions: 'DISPLAY,AUDIO'
    }

    if (!settings.get('showPastReminders', true)) {
      // longest reminder time is 4 weeks before the appointment start. So 30 days should work just fine to reduce the amount of possible reminders
      params.rangeStart = moment.utc().startOf('day').subtract(30, 'days').format(util.ZULU_FORMAT)
    }

    return http.GET({
      module: 'chronos/alarm',
      params
    })
      .then(function (data) {
        // only one alarm per event per type, keep the newest one
        data = _(data).chain().groupBy('action').map(function (alarms) {
          let alarmsPerEvent = _(alarms).groupBy(function (alarm) { return util.cid({ id: alarm.eventId, folder: alarm.folder, recurrenceId: alarm.recurrenceId }) })

          alarmsPerEvent = _(alarmsPerEvent).map(function (eventAlarms) {
            let alarmsToAcknowledge = 0
            // yes length -1 is correct we want to keep at least one
            for (; alarmsToAcknowledge < eventAlarms.length - 1; alarmsToAcknowledge++) {
              // current alarm is already in the future or next alarm is in the future
              if (moment(eventAlarms[alarmsToAcknowledge].time).valueOf() > _.now() ||
                (moment(eventAlarms[alarmsToAcknowledge].time).valueOf() < _.now() && moment(eventAlarms[alarmsToAcknowledge + 1].time).valueOf() > _.now())) {
                // we want to keep the newest alarm that is ready to show if there is one
                break
              }
            }
            // acknowledge old alarms
            api.acknowledgeAlarm(eventAlarms.slice(0, alarmsToAcknowledge))
            // slice acknowledged alarms
            eventAlarms = eventAlarms.slice(alarmsToAcknowledge)

            return eventAlarms
          })

          return alarmsPerEvent
        }).flatten().value()

        // add alarmId as id (makes it easier to use in backbone collections)
        data = _(data).map(function (obj) {
          obj.id = obj.alarmId
          obj.appointmentCid = util.cid({ id: obj.eventId, folder: obj.folder, recurrenceId: obj.recurrenceId })
          return obj
        })

        // no filtering active
        if (settings.get('showPastReminders', true)) {
          api.trigger('resetChronosAlarms', _(data).where({ action: 'DISPLAY' }))
          api.trigger('resetAudioAlarms', _(data).where({ action: 'AUDIO' }))
          return
        }

        api.getList(data).then(function (models) {
          data = _(data).filter(function (alarm) {
            const model = _(models).findWhere({ cid: alarm.appointmentCid })
            // Show only alarms with matching recurrenceId
            if (!model) return false
            // if alarm is scheduled after the appointments end we will show it
            if (model.getMoment('endDate').valueOf() < moment(alarm.time).valueOf()) return true

            // if the appointment is over we will not show any alarm for it
            return model.getMoment('endDate').valueOf() > _.now()
          })
          api.trigger('resetChronosAlarms', _(data).where({ action: 'DISPLAY' }))
          api.trigger('resetAudioAlarms', _(data).where({ action: 'AUDIO' }))
        })
      })
  },

  acknowledgeAlarm: async (obj) => {
    if (!obj) throw new Error()
    if (Array.isArray(obj)) {
      if (obj.length === 0) return
      http.pause()
      obj.forEach(function (alarm) {
        api.acknowledgeAlarm(alarm)
      })
      return http.resume()
    }
    const params = {
      action: 'ack',
      folder: obj.folder,
      id: obj.eventId,
      alarmId: obj.alarmId,
      fields: api.defaultFields
    }

    if (ox.socketConnectionId) params.pushToken = ox.socketConnectionId

    const data = await http.PUT({
      module: 'chronos/alarm',
      params
    })
    api.trigger('acknowledgedAlarm', obj)
    processResponse(data)
    return data
  },

  remindMeAgain: async (obj) => {
    if (!obj) throw new Error()

    const params = {
      action: 'snooze',
      folder: obj.folder,
      id: obj.eventId,
      alarmId: obj.alarmId,
      snoozeTime: obj.time || 300000,
      fields: api.defaultFields
    }

    if (ox.socketConnectionId) params.pushToken = ox.socketConnectionId

    return await http.PUT({
      module: 'chronos/alarm',
      params
    }).then(function (response) {
      // get fresh alarms
      api.getAlarms()
      return processResponse(response)
    })
  },

  changeOrganizer (obj, options) {
    options = options || {}

    obj = obj instanceof Backbone.Model ? obj.toJSON() : obj

    const params = {
      action: 'changeOrganizer',
      folder: obj.folder,
      id: obj.id,
      timestamp: _.then(),
      fields: api.defaultFields
    }

    if (options.recurrenceRange) params.recurrenceRange = options.recurrenceRange

    if (ox.socketConnectionId) params.pushToken = ox.socketConnectionId

    if (obj.recurrenceId) params.recurrenceId = obj.recurrenceId

    if (options.expand) {
      params.expand = true
      params.rangeStart = options.rangeStart
      params.rangeEnd = options.rangeEnd
    }

    const data = {
      organizer: obj.organizer
    }

    if (options.comment) data.comment = options.comment

    return http.PUT({
      module: 'chronos',
      params,
      data
    })
      .then(processResponse)
      .then(function (data) {
        const updated = data.updated ? data.updated[0] : undefined
        if (!updated) return api.pool.getModel(util.cid(obj))
        if (isRecurrenceRoot(updated)) return api.pool.get('detail').add(data)
        return api.pool.getModel(updated)
      })
  },

  refresh () {
    // check capabilities
    if (capabilities.has('calendar')) {
      api.getInvites()
      api.getAlarms()
      api.trigger('refresh.all')
    }
  },

  refreshCalendar (folder) {
    const self = this
    return http.GET({
      module: 'chronos',
      params: {
        action: 'all',
        rangeStart: moment(_.now()).format(util.ZULU_FORMAT),
        rangeEnd: moment(_.now() + 1).format(util.ZULU_FORMAT),
        fields: ['folder', 'id'],
        updateCache: true,
        folder

      }
    }).then(function () {
      self.trigger('refresh.all')
    })
  },

  removeRecurrenceInformation (model) {
    const data = model instanceof Backbone.Model ? model.toJSON() : _(model).clone()
    delete data.rrule
    delete data.recurrenceId
    delete data.seriesId
    if (model instanceof Backbone.Model) return new models.Model(data)
    return data
  },

  getCollection (obj) {
    // TODO: expand start/end to start/end of week if range is less than a week
    const cid = _(obj).map(function (val, key) {
      val = _.isString(val) ? val : JSON.stringify(val)
      return key + '=' + val
    }).join('&')
    const collection = api.pool.get(cid)
    collection.setOptions(obj)
    return collection
  }
}

// if the setting for past appointment reminders changes, we must get fresh ones , might be less or more alarms now
settings.on('change:showPastReminders', api.getAlarms)

ox.on('refresh^', function () {
  api.refresh()
})

// sync caches if backend sends push update notice
// also get fresh alarms
ox.on('socket:calendar:updates', function (data) {
  _(data.folders).each(function (folder) {
    _(api.pool.getByFolder(folder)).each(function (collection) {
      collection.expired = true
      collection.sync()
    })
  })
  api.getAlarms()
})

api.pool = Pool.create('chronos', {
  Collection: models.Collection
})

function urlToHash (url) {
  const hash = {}
  const s = url.split('&')
  s.forEach(function (str) {
    const t = str.split('=')
    hash[t[0]] = t[1]
  })
  return hash
}

api.pool.get = _.wrap(api.pool.get, function (get, cid) {
  const hasCollection = !!this.getCollections()[cid]
  const hash = urlToHash(cid)
  const collection = get.call(this, cid)
  if (hasCollection || cid === 'detail' || !hash.folders || hash.folders.length === 0) {
    // remove comparator in case of search
    if (cid.indexOf('search/') === 0) collection.comparator = null
    return collection
  }
  // find models which should be in this collection
  const list = this.grep('start=' + hash.start, 'end=' + hash.end)
  const models = _(list)
    .chain()
    .pluck('models')
    .flatten()
    .uniq(function (model) {
      return model.cid
    })
    .filter(function (model) {
      return hash.folders.indexOf(`"${model.get('folder')}"`) >= 0
    })
    .invoke('toJSON')
    .value()

  collection.add(models, { silent: true })
  if (collection.length > 0) collection.expired = true

  return collection
})

_.extend(api.pool, {

  map (data) {
    data.cid = util.cid(data)
    return data
  },

  getByFolder (folder) {
    const regexContainsFolder = new RegExp(`(folders=[^&]*${folder}|folder=${folder}&)`)
    const collectionsHash = this.getCollections()

    return Object.keys(collectionsHash)
      .filter(id => regexContainsFolder.test(id))
      .map(id => collectionsHash[id].collection)
  },

  getCollectionsByCID (cid) {
    const folder = util.cid(cid).folder
    const collections = this.getByFolder(folder).filter(function (collection) {
      return !!collection.get(cid)
    })
    // if this is a cid from a public folder we need to check the allPublic collections too
    const folderData = folderApi.pool.getModel(folder)
    if (folderData && folderData.is('public')) {
      collections.push.apply(
        collections,
        this.getByFolder('cal://0/allPublic').filter(function (collection) {
          return !!collection.get(cid)
        })
      )
    }
    if (collections.length === 0) return [this.get('detail')]
    return collections
  },

  getCollectionsByModel: (function () {
    function filter (collection) {
      const params = urlToHash(collection.cid)
      let start = params.start
      let end = params.end
      if (params.view === 'list') {
        start = moment().startOf('day').valueOf()
        end = moment().startOf('day').add(collection.range, 'month').valueOf()
      }
      if (this.getTimestamp('endDate') <= start) return false
      if (this.getTimestamp('startDate') >= end) return false
      return true
    }
    return function (data) {
      const model = data instanceof Backbone.Model ? data : new models.Model(data)
      const collections = this.getByFolder(model.get('folder')).filter(filter.bind(model))
      const folder = folderApi.pool.getModel(model.get('folder'))
      if (folder && folder.is('public') && (model.hasFlag('attendee') || model.hasFlag('organizer'))) {
        collections.push.apply(
          collections,
          this.getByFolder('cal://0/allPublic').filter(filter.bind(model))
        )
      }
      if (collections.length === 0) return [this.get('detail')]
      return collections
    }
  }()),

  propagateAdd (data) {
    data.cid = util.cid(data)
    const collections = api.pool.getCollectionsByModel(data)
    collections.forEach(function (collection) {
      api.pool.add(collection.cid, data)
    })
  },

  propagateUpdate (data) {
    const cid = _.cid(data)
    const model = this.getModel(cid)
    if (!model || (_.isEqual(data.startDate, model.get('startDate')) &&
      _.isEqual(data.endDate, model.get('endDate')) && data.folder === model.get('folder'))) return this.propagateAdd(data)
    const oldCollections = this.getCollectionsByModel(model)
    const newCollections = this.getCollectionsByModel(data)
    // collections which formerly contained that model but won't contain it in the future
    _.difference(oldCollections, newCollections).forEach(function (collection) {
      collection.remove(cid)
    })
    newCollections.forEach(function (collection) {
      api.pool.add(collection.cid, data)
    })
  },

  getModel (data) {
    let cid = data
    if (!_.isString(data)) cid = util.cid(data)
    const collections = api.pool.getCollectionsByCID(cid)
    if (collections.length === 0) return
    let model = collections[0].get(cid)
    if (!model && _.isObject(data)) model = collections[0].add(data)
    return model
  },

  findRecurrenceModels (event) {
    event = event instanceof Backbone.Model ? event.attributes : event
    const collections = api.pool.getByFolder(event.folder)
    const exceptions = _([].concat(event.changeExceptionDates).concat(event.deleteExceptionDates)).compact()
    const filterRecurrences = function (model) {
      if (model.get('seriesId') !== event.id) return false
      if (exceptions.indexOf(model.get('recurrenceId')) >= 0) return false
      return true
    }
    const models = collections.map(function (collection) {
      return collection.filter(filterRecurrences)
    })
    return _(models)
      .chain()
      .flatten()
      .uniq(function (model) {
        return model.cid
      })
      .value()
  }

})

api.collectionLoader = {
  PRIMARY_SEARCH_PAGE_SIZE: 100,
  SECONDARY_SEARCH_PAGE_SIZE: 200,
  getDefaultCollection () {
    return new models.Collection()
  },
  getRange (target, collection) {
    const { originalStart, range: defaultRange = 1 } = collection
    if (!target) return defaultRange
    // zero or positive integer
    return Math.max(
      Math.ceil(target.diff(originalStart, 'months', true)), defaultRange
    )
  },
  load (options = {}) {
    const { target, ...params } = options
    const collection = this.collection = api.getCollection(params)
    collection.originalStart = collection.originalStart || moment().startOf('day')
    if (!collection.originalStart) return
    const { range: currentRange } = collection
    collection.range = this.getRange(target, collection)
    collection.expired = currentRange !== collection.range
    collection.setOptions({
      start: collection.originalStart.valueOf() + 1,
      end: collection.originalStart.clone().add(collection.range, 'months').valueOf(),
      folders: params.folders || []
    })
    collection.sync().then(function (data) {
      // trigger reset when data comes from cache
      if (!data || data.length === 0) collection.trigger('reset')
    })
    return collection
  },
  reload (options = {}) {
    const { target, ...params } = options
    const collection = this.collection = api.getCollection(params)
    collection.expired = true
    if (!collection.originalStart) return
    collection.setOptions({
      start: collection.originalStart.valueOf() + 1,
      end: collection.originalStart.clone().add(collection.range, 'months').valueOf(),
      folders: params.folders || []
    })
    collection.sync()
    return collection
  },
  paginate () {
    const collection = this.collection
    if (!collection) return
    collection.range++
    collection.expired = true
    collection.setOptions({
      start: collection.originalStart.clone().add(collection.range - 1, 'months').valueOf() + 1,
      end: collection.originalStart.clone().add(collection.range, 'months').valueOf(),
      folders: collection.folders || []
    })
    collection.sync({ paginate: true })
    return collection
  }
}

// helper function to check if an event is only in the all public folder
// This helps with checks when a user does not have viewing permissions on the actual public folder.
// This way we can still assume some things even without the actual folder data. (is public, etc)
// If you have the full folder data, use that instead.
api.isInAllPublic = function (model) {
  if (!model) return false
  const folder = model.folder || model.get('folder')
  const collections = api.pool.getByFolder('cal://0/allPublic')
  let result = false

  _(collections).each(function (collection) {
    // original folder is also in the collection, we cannot be sure the event is in the all public folder using this collection
    if (_(collection.folders).contains(folder)) return
    if (collection.get(model)) result = true
  })

  return result
}

// returns information about a recurring appointment
api.getRecurrence = function (obj) {
  const mwVersion = getMiddlewareVersion()
  if (mwVersion.major < 8 || mwVersion.minor < 11) return $.when({ unsupportedMW: true })
  return http.GET({
    module: 'chronos',
    params: {
      action: 'getRecurrence',
      id: obj.id,
      recurrenceId: obj.recurrenceId,
      folder: obj.folder
    }
  })
}

_.extend(api, Backbone.Events)

export default api
