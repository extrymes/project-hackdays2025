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
import { Action } from '@/io.ox/backbone/views/actions/util'
import api from '@/io.ox/calendar/api'
import * as util from '@/io.ox/calendar/util'
import print from '@/io.ox/core/print'
import capabilities from '@/io.ox/core/capabilities'
import folderAPI from '@/io.ox/core/folder/api'
import yell from '@/io.ox/core/yell'
import ModalDialog from '@/io.ox/backbone/views/modal'
import _ from '@/underscore'
import ox from '@/ox'
import registry from '@/io.ox/core/main/registry'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings as calendarSettings } from '@/io.ox/calendar/settings'
import gt from 'gettext'
import { hasFeature } from '@/io.ox/core/feature'
import { device } from '@/browser'
import apps from '@/io.ox/core/api/apps'

// Actions
Action('io.ox/calendar/actions/switch-to-list-view', {
  shortcut: 'List view',
  action () {
    const app = apps.get('io.ox/calendar')
    if (device('smartphone')) {
      app.pages.changePage('list', { disableAnimations: true })
    } else {
      app.settings.set('layout', 'list')
    }
  }
})

Action('io.ox/calendar/actions/switch-to-month-view', {
  shortcut: 'Month view',
  action (baton) {
    const app = apps.get('io.ox/calendar')
    if (device('smartphone')) {
      app.pages.changePage('month', { disableAnimations: true })
    } else {
      app.settings.set('layout', 'month')
    }
  }
})

Action('io.ox/calendar/actions/switch-to-fullweek-view', {
  shortcut: 'Week view',
  toggle: _.device('!smartphone'),
  action (baton) {
    const app = apps.get('io.ox/calendar')
    if (device('smartphone')) {
      app.pages.changePage('week:week', { disableAnimations: true })
    } else {
      app.settings.set('layout', 'week:week')
    }
  }
})

Action('io.ox/calendar/actions/switch-to-week-view', {
  toggle: _.device('!smartphone'),
  action (baton) {
    baton.app.pages.changePage(baton.app, 'week:workweek')
  }
})

Action('io.ox/calendar/actions/switch-to-day-view', {
  shortcut: 'Day view',
  action (baton) {
    const app = apps.get('io.ox/calendar')
    if (device('smartphone')) {
      app.pages.changePage('week:day', { disableAnimations: true })
    } else {
      app.settings.set('layout', 'week:day')
    }
  }
})

Action('io.ox/calendar/actions/switch-to-year-view', {
  shortcut: 'Year view',
  action (baton) {
    const app = apps.get('io.ox/calendar')
    if (device('smartphone')) {
      // no year view on mobile
    } else {
      app.settings.set('layout', 'year')
    }
  }
})

Action('io.ox/calendar/detail/actions/sendmail', {
  capabilities: 'webmail',
  collection: 'one',
  every: 'attendees !== undefined',
  action (baton) {
    const data = baton.first()
    util.resolveAttendees(data, { filterSelf: true }).then(recipients => {
      const hash = {}
      recipients = _(recipients)
        .chain()
        .filter((rec) => {
          // don't add duplicates
          return rec.mail in hash ? false : (hash[rec.mail] = true)
        })
        .map(function (rec) {
          return [rec.display_name, rec.mail]
        })
        .value()
      registry.call('io.ox/mail/compose', 'open', { to: recipients, subject: data.summary })
    })
  }
})

Action('io.ox/calendar/detail/actions/invite', {
  capabilities: 'calendar !guest',
  collection: 'one',
  every: 'attendees !== undefined',
  action (baton) {
    ox.load(() => import('@/io.ox/calendar/actions/invite')).then(function ({ default: action }) {
      action(baton.first())
    })
  }
})

Action('io.ox/calendar/detail/actions/save-as-distlist', {
  capabilities: 'contacts',
  collection: 'one',
  matches (baton) {
    const data = baton.first()
    return _.isArray(data.attendees) && data.attendees.length > 1
  },
  action (baton) {
    const data = baton.first()
    util.resolveAttendees(data).then(distlist => {
      ox.launch(() => import('@/io.ox/contacts/distrib/main'))
        .then((app) => {
          app.create(coreSettings.get('folder/contacts'), {
            distribution_list: distlist,
            display_name: data.summary
          })
        })
    })
  }
})

Action('io.ox/calendar/detail/actions/edit', {
  collection: 'one && modify',
  every: 'id !== undefined',
  matches (baton) {
    const data = baton.first(); const folder = folderAPI.pool.getModel(data.folder)
    return util.allowedToEdit(data, folder)
  },
  action (baton) {
    ox.load(() => import('@/io.ox/calendar/actions/edit')).then(function ({ default: action }) {
      action(baton.first(), { previousFocus: 'button[data-action="io.ox/calendar/detail/actions/edit"]' })
    })
  }
})

Action('io.ox/calendar/detail/actions/delete', {
  collection: 'some && delete',
  action (baton) {
    ox.load(() => import('@/io.ox/calendar/actions/delete')).then(function ({ default: deleteAction }) {
      const orphanedSeriesIds = []
      // map in 2 steps. This way we can clear duplicates before making the api call.
      const defs = _(baton.array()).chain().map(function (event) {
        return event.folder && event.seriesId && event.id !== event.seriesId ? { folder: event.folder, id: event.seriesId } : false
      }).compact().uniq().map(function (event) {
        return api.get(event).fail(function () {
          // series could not be found, treat it as an orphaned series
          orphanedSeriesIds.push(event.id)
        })
      }).valueOf()

      $.when.apply($, defs).always(function () {
        deleteAction(baton.array(), orphanedSeriesIds)
      })
    })
  }
})

Action('io.ox/calendar/detail/actions/create', {
  shortcut: 'New appointment',
  matches (data) {
    // if you are not a guest you always have your default folder to create appointments
    if (capabilities.has('!guest')) return true
    // don't use collection.has(create) here, doesn't work when there is no appointment selected
    const folder = folderAPI.pool.getModel(data.folder_id)
    if (!folder) return false
    // guests need create permissions in the current folder
    return folder.can('create')
  },
  action: _.debounce(function (baton, obj) {
    ox.load(() => import('@/io.ox/calendar/actions/create')).then(function ({ default: action }) {
      action(baton, obj)
    })
  }, 500, true)
})

Action('io.ox/calendar/detail/actions/changeAlarms', {
  collection: 'one',
  matches (baton) {
    const data = baton.first(); const flags = generateFlagHash(data)
    // cannot confirm appointments without proper id or folder (happens when detail view was opened from mail invitation from external calendar)
    // must use buttons in invitation mail instead
    if (!data.id || !data.folder) return false

    const folder = folderAPI.pool.getModel(data.folder).toJSON()
    // special case. Folder is just a dummy model. User usually has no reading rights and event is only visible in the all public appointments folder. Try to offer reminder change action.
    if (!folder.supported_capabilities && api.isInAllPublic(data) && (flags.attendee || flags.organizer)) return true
    if (data.folder.includes('resource')) return false
    // folder must support alarms
    if (folder.supported_capabilities.indexOf('alarms') === -1) return false
    // In public folders we must be organizer or attendee, not on behalf
    if (folderAPI.is('public', folder) && !(flags.attendee || flags.organizer)) return false
    // do not show change reminder as this duplicates "edit"
    if (util.allowedToEdit(data, folder)) return false
    return true
  },
  action (baton) {
    ox.load(() => import('@/io.ox/calendar/actions/change-alarms')).then(function ({ default: action }) {
      action(baton.first())
    })
  }
})

Action('io.ox/calendar/detail/actions/changestatus', {
  collection: 'one',
  matches (baton) {
    const data = baton.first(); const flags = generateFlagHash(data)
    // cannot confirm appointments without proper id (happens when detail view was opened from mail invitation from external calendar)
    // must use buttons in invitation mail instead
    if (!data.id) return false
    return supportsChangeStatus(flags, baton)
  },
  action (baton) {
    const data = baton.first()
    ox.load(() => import('@/io.ox/calendar/actions/acceptdeny')).then(function ({ default: action }) {
      let noFolderCheck = baton.noFolderCheck

      if (!noFolderCheck) {
        folderAPI.pool.getModel(data.folder).toJSON()
        // special case. Folder is just a dummy model. User usually has no reading rights and event is only visible in the all public appointments folder. Don't perform folder check then
        if (!folderAPI.pool.getModel(data.folder).toJSON().supported_capabilities && api.isInAllPublic(data)) noFolderCheck = true
      }
      // get full data if possible
      api.get(data).then(function (obj) {
        action(obj.toJSON(), { noFolderCheck })
      }, function () {
        action(data, { noFolderCheck })
      })
    })
  }
})

Action('io.ox/calendar/detail/actions/follow-up', {
  collection: 'one && create && read',
  action (baton) {
    const model = baton.model || (baton.models && baton.models[0])
    ox.load(() => import('@/io.ox/calendar/actions/follow-up')).then(function ({ default: action }) {
      action(model)
    })
  }
})

Action('io.ox/calendar/detail/actions/print-appointment', {
  capabilities: 'calendar-printing',
  collection: 'some && read',
  action (baton) {
    const list = baton.array()

    if (_.device('smartphone')) return setTimeout(window.print, 0)
    if (list.length === 1) return print.request(() => import('@/io.ox/calendar/print'), list)

    new ModalDialog({
      title: gt('Do you want the appointments printed in detail or as a compact list?'),
      previousFocus: $('.io-ox-calendar-main .classic-toolbar [data-action="more"]')
    })
      .addCancelButton()
      // #. answer Button to 'Do you want the appointments printed in detail or as a compact list?'
      .addButton({ label: gt('Compact'), action: 'compact', className: 'btn-default' })
      // #. answer Button to 'Do you want the appointments printed in detail or as a compact list?'
      .addButton({ label: gt('Detailed'), action: 'detailed' })
      .on('detailed', function () { print.request(() => import('@/io.ox/calendar/print'), list) })
      .on('compact', function () { print.request(() => import('@/io.ox/calendar/print-compact'), list) })
      .open()
  }
})

Action('io.ox/calendar/detail/actions/export', {
  collection: 'some && read',
  action (baton) {
    import('@/io.ox/core/download').then(({ default: download }) => {
      download.exported({ list: [].concat(baton.data), format: 'ical' })
    })
  }
})

Action('io.ox/calendar/detail/actions/print', {
  capabilities: 'calendar-printing',
  action (baton) {
    const p = baton.app.perspective
    if (p.print) p.print()
  }
})

Action('io.ox/calendar/detail/actions/move', {
  collection: 'some && delete',
  // moving recurring events is not supported
  every: 'recurrenceId === undefined',
  action (baton) {
    const list = baton.array()

    ox.load(() => import('@/io.ox/core/folder/actions/move')).then(function ({ default: move }) {
      folderAPI.get(list[0].folder).done(function (folderData) {
        // maybe we need a whoAmI util function ...
        let myId
        // acting myself
        if (util.hasFlag(list[0], 'attendee') || util.hasFlag(list[0], 'organizer')) {
          myId = ox.user_id
          // action on behalf of attendee
        } else if (util.hasFlag(list[0], 'attendee_on_behalf')) {
          myId = folderData.created_by
          // action on behalf of organizer
        } else if (util.hasFlag(list[0], 'organizer_on_behalf')) {
          myId = list[0].organizer.entity
        }

        move.item({
          api,
          button: gt('Move'),
          flat: true,
          indent: false,
          list,
          module: 'calendar',
          root: '1',
          settings: calendarSettings,
          success: {
            single: 'Appointment has been moved',
            multiple: 'Appointments have been moved'
          },
          target: baton.target,
          title: gt('Move'),
          type: 'move',
          all: util.getCurrentRangeOptions(),
          disable (data, options) {
            const sameFolder = data.id === list[0].folder
            const sameOwner = data.created_by === myId
            const isPublic = folderAPI.is('public', data)
            const sourceFolderIsPublic = folderAPI.is('public', folderData)
            const otherAttendees = util.hasFlag(list[0], 'scheduled')
            const create = folderAPI.can('create', data)
            const isOrganizer = util.hasFlag(list[0], 'organizer') || util.hasFlag(list[0], 'organizer_on_behalf')
            // totally awesome check
            // not same folder, must be folder of same user, public folder(if organizer) or there must only be one attendee(the organizer) , if the source folder is not public, must have create permission in that folder, folder must not be virtual
            return sameFolder || !((!sourceFolderIsPublic && !otherAttendees) || sameOwner || (isPublic && isOrganizer)) || !create || (options && /^virtual/.test(options.folder))
          }
        })
      })
    })
  }
})

Action('io.ox/calendar/detail/actions/change-organizer', {
  toggle: calendarSettings.get('chronos/allowChangeOfOrganizer', true),
  collection: 'one && modify',
  matches (baton) {
    const data = baton.first()
    if (!data || !data.flags) return false
    // not allowed if there are external participants (update handling doesn't work correctly + single user contexts doesn't need this)
    if (_(data.attendees).some(function (attendee) { return !_(attendee).has('entity') })) return false
    // must have permission, must be organizer (or attendee with change rights) and it must be a group scheduled event (at least 2 participants. For one or zero participants you can just move the event, to achieve the same result)
    return ((util.hasFlag(data, 'organizer') || util.hasFlag(data, 'organizer_on_behalf')) ||
      ((util.hasFlag(data, 'attendee') || util.hasFlag(data, 'attendee_on_behalf')) && data.attendeePrivileges === 'MODIFY')) &&
      util.hasFlag(data, 'scheduled')
  },
  async action (baton) {
    const { default: changeOrganizer } = await import('@/io.ox/calendar/actions/change-organizer')
    changeOrganizer.openDialog(baton.first())
  }
})

Action('io.ox/calendar/actions/freebusy', {
  device: 'desktop',
  capabilities: 'freebusy !alone !guest',
  action (baton) {
    Promise.all([import('@/io.ox/calendar/freetime/main'), import('@/io.ox/core/api/user')]).then(([{ default: freetime }, { default: userAPI }]) => {
      userAPI.get().done(function (user) {
        const perspective = baton.app.perspective
        const now = _.now()
        let startDate = perspective && perspective.model && perspective.model.get('date') ? perspective.model.get('date').valueOf() : now
        const layout = perspective ? perspective.app.props.get('layout') : ''

        // see if the current day is in the displayed week.
        if (startDate < now && layout.indexOf('week:') === 0) {
          // calculate end of week/workweek
          const max = startDate + 86400000 * (layout === 'week:workweek' ? calendarSettings.get('numDaysWorkweek') : 7)
          if (now < max) {
            startDate = now
          }
        }

        freetime.getApp().launch({ startDate, attendees: [util.createAttendee(user, { partStat: 'ACCEPTED' })] })
      })
    })
  }
})

Action('io.ox/calendar/actions/showNext', {
  shortcut: 'Time period forward',
  action (baton) {
    const p = apps.get('io.ox/calendar').perspective
    if (!p) return
    p.setStartDate('next')
  }
})

Action('io.ox/calendar/actions/showPrevious', {
  shortcut: 'Time period back',
  action (baton) {
    const p = apps.get('io.ox/calendar').perspective
    if (!p) return
    p.setStartDate('prev')
  }
})

Action('io.ox/calendar/actions/showToday', {
  shortcut: 'Today',
  action (baton) {
    const p = apps.get('io.ox/calendar').perspective
    if (!p) return
    p.setStartDate(moment())
  }
})

async function acceptDecline (baton, status) {
  const data = baton.first()
  const appointment = api.reduce(data)
  let folder

  if (!baton.noFolderCheck) folder = await folderAPI.get(appointment.folder).catch((e) => { return e })

  // default is current user
  let manageResource = false
  const hasSeriesPropagation = await util.hasSeriesPropagation(data)
  appointment.attendee = {
    entity: ox.user_id,
    partStat: status
  }
  if (!folder.error && !baton.noFolderCheck) {
    // act as resource in resource calendar (managed resources)
    if (folderAPI.is('resourceCalendar', folder)) {
      manageResource = true
      appointment.attendee.entity = folder.resourceId
      appointment.attendee.cuType = 'RESOURCE'
    // act as folder owner in shared calendar
    } else if (folderAPI.is('shared', folder)) appointment.attendee.entity = folder.created_by
  }

  if (!appointment.attendee.entity && folder.created_from) {
    const prev = _(data.attendees).find(function (attendee) {
      return attendee.extendedParameters && attendee.extendedParameters['X-OX-IDENTIFIER'] === folder.created_from.identifier
    })
    if (prev) {
      delete appointment.attendee.entity
      appointment.attendee.email = prev.email
      appointment.attendee.uri = prev.uri
    }
  }

  const positive = status === 'ACCEPTED' || status === 'DECLINED'
  // no alarms for resources
  if (!manageResource && positive) {
    // default reminder
    appointment.alarms = util.getDefaultAlarms(data)
  }

  // check if only one appointment or the whole series should be accepted
  // treat exceptions as part of the series and offer to accept the series as a whole
  if (hasSeriesPropagation && data.seriesId && appointment.recurrenceId && data.category !== 'invitation') {
    new ModalDialog({
      title: gt('Change appointment confirmation'),
      width: 600
    })
      .build(function () {
        this.$body.append(
          gt('This appointment is part of a series. Do you want to change the whole series or just one appointment within the series?')
        )
      })
      .addCancelButton({ left: true })
      .addButton({ label: gt('Change appointment'), action: 'appointment', className: 'btn-default' })
      // #. Use singular in this context
      .addButton({ label: gt('Change series'), action: 'series' })
      .on('action', function (action) {
        if (action === 'cancel') return
        if (action === 'series') {
          delete appointment.recurrenceId
          // use series id to make it work for exceptions
          if (appointment.id !== data.seriesId) {
            appointment.id = data.seriesId
          }
        }
        util.confirmWithConflictCheck(appointment, { ...util.getCurrentRangeOptions(), ...{ checkConflicts: true } }).catch(err => {
          if (err.message) yell('error', err.message)
        })
      })
      .open()
    return
  }
  util.confirmWithConflictCheck(appointment, { ...util.getCurrentRangeOptions(), ...{ checkConflicts: true } }).catch(err => {
    if (err.message) yell('error', err.message)
  })
}

Action('io.ox/calendar/detail/actions/participate/yes', {
  collection: 'one',
  matches (baton) {
    const flags = generateFlagHash(baton.first())
    if (flags.accepted) return false
    return supportsChangeStatus(flags, baton)
  },
  action: _.partial(acceptDecline, _, 'ACCEPTED')
})

Action('io.ox/calendar/detail/actions/participate/maybe', {
  collection: 'one',
  matches (baton) {
    const flags = generateFlagHash(baton.first())
    if (flags.tentative) return false
    return supportsChangeStatus(flags, baton)
  },
  action: _.partial(acceptDecline, _, 'TENTATIVE')
})

Action('io.ox/calendar/detail/actions/participate/no', {
  collection: 'one',
  matches (baton) {
    const flags = generateFlagHash(baton.first())
    if (flags.declined) return false
    return supportsChangeStatus(flags, baton)
  },
  action: _.partial(acceptDecline, _, 'DECLINED')
})

function generateFlagHash (data) {
  const hash = {}
  _(data.flags).values().forEach(function (flag) { hash[flag] = true })
  return hash
}

function supportsChangeStatus (flags, baton) {
  // no flags at all => public folder and user is no attendee. Not allowed to change attendee statuses
  if (!flags.accepted && !flags.declined && !flags.tentative && !flags.needs_action) return false
  // normal attendee or organizer
  if (flags.attendee || flags.organizer) return true
  // resource folder. We need to check if we are the resource delegate
  const folder = folderAPI.pool.models[baton?.data?.folder]
  if (flags.attendee_on_behalf && folder?.is('resourceCalendar')) {
    // feature not supported -> no change allowed
    if (!hasFeature('managedResources')) return false
    if (baton.data.attendees) return util.getResourcePermission(baton.data, folder.get('resourceId')) === 'delegate'
    return false
  }
  // in shared and public folders we also have to check if we have the permission to modify
  if (flags.attendee_on_behalf || flags.organizer_on_behalf) return baton.collection.has('modify')
  return true
}

Action('io.ox/calendar/actions/google', {
  capabilities: 'calendar_google',
  action: function name () {
    // make sure the subscription code is available when the action is triggered
    // otherwise, the oauth popup will be blocked
    import('@/io.ox/calendar/actions/subscribe-google').then(({ default: subscribeGoogle }) => subscribeGoogle())
  }
})

Action('io.ox/calendar/actions/subscribe', {
  capabilities: 'edit_public_folders || read_create_shared_folders || caldav',
  action: function name () {
    import('@/io.ox/core/sub/sharedFolders').then(({ default: subscribe }) => {
      subscribe.open({
        module: 'calendar',
        help: 'ox.appsuite.user.sect.calendar.folder.subscribeshared.html',
        title: gt('Subscribe to shared calendars'),
        tooltip: gt('Subscribe to calendar'),
        point: 'io.ox/core/folder/subscribe-shared-calendar',
        noSync: !capabilities.has('caldav'),
        sections: {
          public: gt('Public calendars'),
          shared: gt('Shared calendars'),
          private: gt('Private'),
          hidden: gt('Hidden calendars')
        }
      })
    })
  }
})

Action('io.ox/calendar/actions/ical', {
  capabilities: 'calendar_ical',
  action: function name () {
    import('@/io.ox/calendar/actions/subscribe-ical')
      .then(({ default: importICal }) => importICal())
  }
})

Action('io.ox/calendar/actions/import', {
  device: '!smartphone',
  action: function name () {
    import('@/io.ox/core/import/import').then(({ default: importer }) => {
      importer.show('calendar')
    })
  }
})

// Secondary actions
let INDEX = 0
ext.point('io.ox/secondary').extend({
  id: 'scheduling-view',
  index: INDEX += 100,
  render (baton) {
    if (baton.appId !== 'io.ox/calendar') return
    if (!capabilities.has('freebusy')) return
    this.action('io.ox/calendar/actions/freebusy', gt('Scheduling'), baton)
    this.divider()
  }
},
{
  id: 'google',
  index: INDEX += 100,
  render (baton) {
    if (baton.appId !== 'io.ox/calendar') return
    if (!capabilities.has('calendar_google')) return
    this.action('io.ox/calendar/actions/google', gt('Subscribe to Google calendar'), baton)
  }
},
{
  id: 'shared',
  index: INDEX += 100,
  render (baton) {
    if (baton.appId !== 'io.ox/calendar') return
    if (!capabilities.has('edit_public_folders || read_create_shared_folders || caldav')) return
    this.action('io.ox/calendar/actions/subscribe', gt('Subscribe to shared calendars'), baton)
  }
},
{
  id: 'ical',
  index: INDEX += 100,
  render (baton) {
    if (baton.appId !== 'io.ox/calendar') return
    if (!capabilities.has('calendar_ical')) return
    this.action('io.ox/calendar/actions/ical', gt('Import from URL'), baton)
  }
},
{
  id: 'import',
  index: INDEX += 100,
  render (baton) {
    if (baton.appId !== 'io.ox/calendar') return
    if (_.device('ios || android')) return
    this.action('io.ox/calendar/actions/import', gt('Import file'), baton)
    this.divider()
  }
})

export const inlineLinks = [
  {
    index: 100,
    prio: 'hi',
    mobile: 'hi',
    id: 'edit',
    icon: 'bi/pencil.svg',
    title: gt('Edit'),
    tooltip: gt('Edit appointment'),
    ref: 'io.ox/calendar/detail/actions/edit'
  },
  {
    index: 300,
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/trash.svg',
    id: 'delete',
    title: gt('Delete'),
    tooltip: gt('Delete appointment'),
    ref: 'io.ox/calendar/detail/actions/delete'
  },
  {
    // 155 because it was separated from changestatus. avoid conflicts
    index: 300,
    prio: 'lo',
    mobile: 'lo',
    id: 'changereminder',
    section: 'adjust',
    title: gt('Change reminders'),
    ref: 'io.ox/calendar/detail/actions/changeAlarms'
  },
  {
    index: 400,
    prio: 'lo',
    mobile: 'lo',
    id: 'follow-up',
    section: 'adjust',
    // cSpell:disable-next-line
    // #. Calendar: Create follow-up appointment. Maybe "Folgetermin" in German.
    title: gt('Follow-up'),
    ref: 'io.ox/calendar/detail/actions/follow-up'
  },
  {
    index: 450,
    prio: 'lo',
    mobile: 'lo',
    id: 'change-organizer',
    section: 'adjust',
    title: gt('Change organizer'),
    ref: 'io.ox/calendar/detail/actions/change-organizer'
  },
  {
    index: 500,
    prio: 'lo',
    mobile: 'lo',
    id: 'move',
    section: 'rarely',
    title: gt('Move'),
    drawDisabled: true,
    ref: 'io.ox/calendar/detail/actions/move'
  },
  {
    index: 550,
    prio: 'lo',
    id: 'export',
    section: 'rarely',
    title: gt('Export'),
    ref: 'io.ox/calendar/detail/actions/export'
  },
  {
    index: 600,
    prio: 'lo',
    id: 'print',
    section: 'rarely',
    title: gt('Print'),
    ref: 'io.ox/calendar/detail/actions/print-appointment'
  },
  {
    index: 700,
    prio: 'lo',
    mobile: 'lo',
    id: 'send mail',
    section: 'participants',
    sectionTitle: gt('Participant related actions'),
    title: gt('Send email to all participants'),
    ref: 'io.ox/calendar/detail/actions/sendmail'
  },
  {
    index: 800,
    prio: 'lo',
    mobile: 'lo',
    id: 'invite',
    section: 'participants',
    sectionTitle: gt('Participant related actions'),
    title: gt('Invite to new appointment'),
    ref: 'io.ox/calendar/detail/actions/invite'
  },
  {
    index: 900,
    prio: 'lo',
    mobile: 'lo',
    id: 'save as distlist',
    section: 'participants',
    sectionTitle: gt('Participant related actions'),
    title: gt('Save as distribution list'),
    ref: 'io.ox/calendar/detail/actions/save-as-distlist'
  }
]

ext.point('io.ox/calendar/links/inline').extend(inlineLinks)
