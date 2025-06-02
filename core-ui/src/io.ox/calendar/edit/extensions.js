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

import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import * as calendarUtil from '@/io.ox/calendar/util'
import * as mailUtil from '@/io.ox/mail/util'
import { checkFileReferences, isValidMailAddress, parseStringifiedList } from '@/io.ox/core/util'
import upload from '@/io.ox/core/tk/upload'
import views from '@/io.ox/backbone/views'
import mini from '@/io.ox/backbone/mini-views'
import DatePicker from '@/io.ox/backbone/mini-views/datepicker'
import { AttachmentCollection, AttachmentListView, AttachmentUploadView, AttachmentDriveUploadView } from '@/io.ox/backbone/mini-views/attachments'
import RecurrenceView from '@/io.ox/backbone/views/recurrence-view'
import AlarmsView from '@/io.ox/backbone/mini-views/alarms'
import api from '@/io.ox/calendar/api'
import AddParticipantView from '@/io.ox/participants/add'
import { AttendeeContainer } from '@/io.ox/participants/chronos-views'
import capabilities from '@/io.ox/core/capabilities'
import folderAPI from '@/io.ox/core/folder/api'
import ColorPicker from '@/io.ox/calendar/color-picker'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import yell from '@/io.ox/core/yell'
import { elementWithTooltip } from '@/io.ox/core/components'

import { CategoryDropdown, CategoryBadgesView } from '@/io.ox/core/categories/view'
import { getCategoriesFromModel } from '@/io.ox/core/categories/api'

import '@/io.ox/contacts/util'
import '@/io.ox/calendar/style.scss'

import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/calendar/settings'
import gt from 'gettext'
import { addReadyListener } from '@/io.ox/core/events'
import a11y from '@/io.ox/core/a11y'
import { hasOrganizerRights, colorDisabled } from '@/io.ox/calendar/util'
import { getCategoryColor } from '@/io.ox/core/categories/util'
import WindowActionButtonsView from '@/io.ox/core/window-action-buttons-view'

const point = views.point('io.ox/calendar/edit/section')

point.basicExtend({
  index: 100,
  id: 'dnd',
  draw (baton) {
    const SCROLLABLE = '.window-content'
    const Dropzone = upload.dnd.FloatingDropzone.extend({
      getDimensions () {
        const node = this.$el.closest(SCROLLABLE)
        const top = node.scrollTop()
        const height = node.outerHeight()
        return {
          top,
          bottom: 0,
          height
        }
      }
    })

    baton.app.view.$el.append(
      new Dropzone({ app: baton.app, point: 'io.ox/calendar/edit/dnd/actions', scrollable: SCROLLABLE }).render().$el
    )
  }
})

point.basicExtend({
  id: 'header',
  index: 10,
  draw (baton) {
    const oldFolder = baton.model.get('folder')
    baton.app.getWindow().setHeader(
      new WindowActionButtonsView({
        app: baton.app,
        saveTitle: baton.mode === 'edit' ? gt('Save') : gt('Create'),
        onSave () {
          baton.data = { oldFolder, attachments: [] }
          baton.model.set('categories', parseStringifiedList(baton.model.get('categories')))
          ext.point('io.ox/calendar/edit/actions/save').cascade(this, baton)
        },
        onDiscard (e) {
          e.stopPropagation()
          // we expect the dirtyDialogDiscarded error here (user just clicked on the cancel button), every other error is rethrown.
          baton.app.quit(false, { type: 'discard' }).catch(error => { if (error?.message !== 'dirtyDialogDiscarded') throw error })
        }
      }).render().$el
    )
  }
})

// pane button area
ext.point('io.ox/calendar/edit/actions/save').extend({
  id: 'move',
  index: 100,
  perform (baton) {
    const folder = baton.model.get('folder')
    const oldFolder = baton.data.oldFolder
    if (oldFolder === folder || baton.mode !== 'edit') return
    // actual moving is done in the app.onSave method, because this method is also called after confirming conflicts,
    // so we don't need duplicated code
    baton.model.set({ folder: oldFolder }, { silent: true })
    baton.app.moveAfterSave = folder
  }
}, {
  id: 'attendees:mail-address',
  index: 200,
  perform (baton) {
    const inputfieldVal = baton.parentView.$el.find('.add-participant.tt-input').val()
    // check if participants inputfield contains a valid email address
    if (_.isEmpty(inputfieldVal.replace(/\s*/, '')) || !isValidMailAddress(inputfieldVal)) return
    baton.model._attendees.add(
      new baton.model._attendees.Model({
        cuType: 'INDIVIDUAL',
        cn: mailUtil.parseRecipient(inputfieldVal)[0],
        partStat: 'NEEDS-ACTION',
        email: mailUtil.parseRecipient(inputfieldVal)[1],
        uri: `mailto:${mailUtil.parseRecipient(inputfieldVal)[1]}`,
        role: 'REQ-PARTICIPANT'
      })
    )
  }
}, {
  id: 'validity',
  index: 300,
  perform (baton) {
    if (baton.model.isValid({ isSave: true })) return
    return $.Deferred().reject()
  }
}, {
  id: 'allday',
  index: 400,
  perform (baton) {
    // correct time for allday appointments (remove timezone and add 1 day to end date)
    if (!calendarUtil.isAllday(baton.model)) return
    // save unchanged dates, so they can be restored on error or when handling conflicts
    baton.parentView.tempEndDate = baton.model.get('endDate')
    baton.model.set('endDate', { value: moment(baton.model.get('endDate').value).add(1, 'days').format('YYYYMMDD') }, { silent: true })
  }
}, {
  id: 'groups',
  index: 500,
  perform (baton) {
    // remove groups with entity. Those are not needed, as the attendees are also added individually.
    // we only remove them if there where changes to the attendees, as we don't want to create a false dirty status
    if (_.isEqual(baton.app.initialModelData.attendees, baton.model.get('attendees'))) return
    baton.model._attendees.remove(baton.model._attendees.filter(function (attendee) {
      return attendee.get('cuType') === 'GROUP' && attendee.get('entity')
    }))
  }
}, {
  id: 'attendees:resolve',
  index: 600,
  perform (baton) {
    baton.app.getWindow().busy()
    // in case some attendees are still resolved we wait fot that. We don't want missing attendees
    // TODO: replace with `Promise.all(baton.model._attendees.toBeResolved` once `cascade` supports native promise
    return $.when.apply($, baton.model._attendees.toBeResolved)
  }
}, {
  id: 'attachments:check',
  index: 700,
  perform (baton) {
    // check if local file references are still valid
    const toAdd = baton.attachments.where({ action: 'upload' })
    const files = toAdd.map(model => model.get('file'))
    return checkFileReferences(files).fail(baton.app.onError)
  }
}, {
  id: 'attachments:handle',
  index: 800,
  perform (baton) {
    const model = baton.model
    const collection = baton.attachments

    // to be deleted
    const toDelete = collection.where({ action: 'delete' })
    if (toDelete.length > 0 && model.get('attachments')) {
      // 'managedId' matches 'id'
      const toDeleteHash = _.toHash(toDelete, 'id')
      model.set('attachments', model.get('attachments').filter((data) => !toDeleteHash[data.managedId]))
    }

    // to be referenced
    const toReference = collection.where({ action: 'reference' })
    if (toReference.length > 0) {
      const references = toReference.map(model => { return { uri: `${model.get('origin')}://${model.get('origin_id')}` } })
      model.set('attachments', (model.get('attachments') || []).concat(references))
    }

    // to be uploaded
    const toAdd = collection.where({ action: 'upload' })
    if (toAdd.length > 0) {
      // metadata
      const attachmentData = toAdd.map(model => {
        const data = {
          filename: model.get('filename'),
          uri: `cid:file_${model.get('cid')}`
        }
        if (model.get('file_mimetype')) data.fmtType = model.get('file_mimetype')
        return data
      })
      model.set('attachments', attachmentData.concat(model.get('attachments') || []), { silent: true })

      // binaries
      // needed, so the form data can be attached when selecting ignore conflicts in the conflict dialog
      baton.app.binaries = toAdd.map(model => model.pick('file', 'cid'))
    }
  }
}, {
  id: 'save',
  index: 900,
  perform (baton) {
    switch (baton.mode) {
      case 'create':
        return api.create(baton.model, _.extend(calendarUtil.getCurrentRangeOptions(), {
          attachments: baton.app.binaries,
          usedGroups: baton.model._attendees.usedGroups,
          checkConflicts: true
        })).then(baton.app.onSave, baton.app.onError)
      case 'edit':
        return api.update(baton.app.getDelta(), _.extend(calendarUtil.getCurrentRangeOptions(), {
          attachments: baton.app.binaries,
          usedGroups: baton.model._attendees.usedGroups,
          recurrenceRange: baton.model.mode === 'thisandfuture' ? 'THISANDFUTURE' : undefined,
          checkConflicts: true,
          showRecurrenceInfo: true
        })).then(baton.app.onSave, baton.app.onError)
      default:
        break
    }
  }
})

// resource participant warning
point.basicExtend({
  id: 'resource-warning',
  index: 150,
  draw (baton) {
    if (!baton.model.get('selectedResourceFolders')?.length) return
    this.append(
      $('<div class="resource-warning-container col-xs-12">').append(
        $('<p class="alert alert-info resource-warning" role="alert">').text(gt('Selected resources were automatically added to this appointment.'))
      )
    )
  }
})

// title
point.extend({
  id: 'title',
  index: 200,
  render () {
    const self = this
    let input
    const guid = _.uniqueId('form-control-label-')

    this.$el.append(
      $('<label class="control-label col-xs-12">').attr('for', guid).append(
        $.txt(gt.pgettext('title', 'Title')),
        input = new mini.InputView({ id: guid, name: 'summary', model: self.model, autocomplete: false, mandatory: true }).render().$el,
        new mini.ErrorView({ name: 'summary', model: self.model }).render().$el
      )
    )
    input.on('keyup change', function () {
      // update title on keyup
      self.model.trigger('keyup:summary', $(this).val())
    })
  }
})

// location input
point.extend({
  id: 'location',
  index: 750,
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label col-xs-12">').attr('for', guid).append(
        $.txt(gt('Location')),
        // only trim on save
        new mini.InputView({ id: guid, name: 'location', model: this.model }).render().$el
      )
    )
  }
})

function openTimezoneDialog () {
  const model = this.model
  import('@/io.ox/calendar/edit/timezone-dialog').then(({ default: dialog }) => dialog.open({ model }))
}

// start date
point.basicExtend({
  id: 'start-date',
  index: 400,
  rowClass: 'mt-8',
  draw (baton) {
    const datepicker = baton.parentView.startDatePicker = new DatePicker({
      model: baton.model,
      className: 'col-sm-6 col-xs-12',
      display: calendarUtil.isAllday(baton.model) ? 'DATE' : 'DATETIME',
      attribute: 'startDate',
      label: gt('Starts on'),
      timezoneButton: true,
      closeOnScroll: true,
      a11y: {
        timeLabel: gt('Start time')
      },
      chronos: true
    }).on('click:timezone', openTimezoneDialog, baton)
      .on('click:time', function () {
        const target = this.$el.find('.dropdown-menu.calendaredit')
        const container = target.scrollParent()
        const pos = target.offset().top - container.offset().top

        if ((pos < 0) || (pos + target.height() > container.height())) {
          // scroll to Node, leave 16px offset
          container.scrollTop(container.scrollTop() + pos - 16)
        }
      })
    this.append(datepicker.render().$el)
    if (datepicker.nodes.timezoneField) {
      elementWithTooltip({
        $el: datepicker.nodes.timezoneField,
        tooltip: gt('Change time zone')
      })
    }
  }
})

// end date
point.basicExtend({
  id: 'end-date',
  index: 500,
  nextTo: 'start-date',
  draw (baton) {
    const datepicker = baton.parentView.endDatePicker = new DatePicker({
      model: baton.model,
      className: 'col-sm-6 col-xs-12',
      display: calendarUtil.isAllday(baton.model) ? 'DATE' : 'DATETIME',
      attribute: 'endDate',
      label: gt('Ends on'),
      timezoneButton: true,
      closeOnScroll: true,
      a11y: {
        timeLabel: gt('End time')
      },
      chronos: true
    }).on('click:timezone', openTimezoneDialog, baton)
      .on('click:time', function () {
        const target = this.$el.find('.dropdown-menu.calendaredit')
        const container = target.scrollParent()
        const pos = target.offset().top - container.offset().top

        if ((pos < 0) || (pos + target.height() > container.height())) {
          // scroll to Node, leave 16px offset
          container.scrollTop(container.scrollTop() + pos - 16)
        }
      })
    this.append(datepicker.render().$el)
    if (datepicker.nodes.timezoneField) {
      elementWithTooltip({
        $el: datepicker.nodes.timezoneField,
        tooltip: gt('Change time zone')
      })
    }
  }
})

// timezone hint
point.extend({
  id: 'timezone-hint',
  index: 550,
  nextTo: 'end-date',
  render () {
    const helpBlock = $('<div class="col-xs-12 help-block">').hide()
    const self = this

    function setHint () {
      // early return for appointments in local time. Those appointments just move with the local timezone (most all day appointments are in local time)
      if (calendarUtil.isLocal(self.baton.model)) return helpBlock.hide()

      // compare by offset, not timezone name or we would show the hint too often (example: Europe/Paris and Europe/Berlin)
      // careful here. We must use the offset of the start and end date here, not the offset of today. Otherwise we will get false positives when a daylight saving change happened in between
      const userStartOffset = moment(self.baton.model.getMoment('startDate').valueOf()).utcOffset()
      const userEndOffset = moment(self.baton.model.getMoment('endDate').valueOf()).utcOffset()
      const userTimezone = moment().tz()
      const startOffset = self.baton.model.getMoment('startDate').utcOffset()
      const endOffset = self.baton.model.getMoment('endDate').utcOffset()
      const isVisible = startOffset !== userStartOffset || endOffset !== userEndOffset

      helpBlock.toggle(isVisible)
      if (isVisible) {
        const interval = calendarUtil.getDateTimeIntervalMarkup(self.baton.model.attributes, { zone: moment().tz(), noTimezoneLabel: true })
        interval.prepend($('<span>').append(`${userTimezone}: `))
        helpBlock.empty()
        helpBlock.append(
          interval
        )
      }
    }

    this.$el.append(helpBlock)
    this.listenTo(this.baton.model, 'change:startDate change:endDate', setHint)
    setHint()
  }
})

// full time
point.extend({
  id: 'full_time',
  index: 600,
  className: 'col-sm-6',
  render () {
    const guid = _.uniqueId('form-control-label-')
    const originalModel = this.model
    const parentView = this.baton.parentView
    const model = parentView.fullTimeToggleModel || new Backbone.Model({
      allDay: calendarUtil.isAllday(this.model),
      nonAlldayStartTime: moment(originalModel.getMoment('startDate')),
      nonAlldayEndTime: moment(originalModel.getMoment('endDate'))
    })
    const view = new mini.CustomCheckboxView({ id: guid, name: 'allDay', label: gt('All day'), model })

    view.listenTo(model, 'change:allDay', function () {
      if (this.model.get('allDay')) {
        this.model.set({
          nonAlldayStartTime: moment(originalModel.getMoment('startDate')),
          nonAlldayEndTime: moment(originalModel.getMoment('endDate'))
        })
        originalModel.set({
          startDate: { value: originalModel.getMoment('startDate').format('YYYYMMDD') },
          endDate: { value: originalModel.getMoment('endDate').format('YYYYMMDD') }
        })
      } else {
        // keep selected date but use the time saved from before the allday change
        originalModel.set({
          startDate: { value: originalModel.getMoment('startDate').format('YYYYMMDD') + this.model.get('nonAlldayStartTime').format('[T]HHmmss'), tzid: this.model.get('nonAlldayStartTime').tz() },
          endDate: { value: originalModel.getMoment('endDate').format('YYYYMMDD') + this.model.get('nonAlldayEndTime').format('[T]HHmmss'), tzid: this.model.get('nonAlldayEndTime').tz() }
        })
      }
    })
    this.$el.append(view.render().$el)

    if (!parentView.fullTimeToggleModel && this.baton.mode === 'create') {
      // if we restore alarms, check if they differ from the defaults
      const isDefault = JSON.stringify(_(originalModel.attributes.alarms).pluck('action', 'trigger')) === JSON.stringify(_(calendarUtil.getDefaultAlarms(originalModel)).pluck('action', 'trigger'))

      // automatically change default alarm in create mode when allDay changes and the user did not change the alarm before (we don't want data loss)
      if (isDefault) {
        const applyDefaultAlarms = function () { originalModel.set('alarms', calendarUtil.getDefaultAlarms(originalModel)) }
        model.on('change:allDay', applyDefaultAlarms)
        originalModel.once('userChangedAlarms', function () { model.off('change:allDay', applyDefaultAlarms) })
      }

      // add some automatic for transparency here.
      // we want to change transparency according to the markFulltimeAppointmentsAsFree setting
      // if we detect a manual change of the transparency setting caused by a user we don't want to overwrite this.
      // cannot use originalModel.changed attribute here because of multiple issues (changed only stores attributes from last set, not from last sync for example)
      view.listenTo(model, 'change:allDay', function () {
        if (settings.get('markFulltimeAppointmentsAsFree', false) && !parentView.userChangedTransp) {
          originalModel.set('transp', this.model.get('allDay') ? 'TRANSPARENT' : 'OPAQUE')
        }
      })
    }

    parentView.fullTimeToggleModel = model
  }
})

// recurrence
point.extend({
  id: 'recurrence',
  className: 'col-xs-12',
  index: 700,
  render () {
    // changes not allowed when editing or creating an exception
    if ((this.model.get('recurrenceId') && this.model.mode === 'appointment')) return

    const helpNode = $('<div class="alert">')
    const errorText = gt('Your recurrence rule does not fit to your start date.')
    const helpText = gt('Your recurrence rule was changed automatically.')
    const self = this
    const recurrenceView = new RecurrenceView({
      model: this.model
    })
    this.$el.append(
      recurrenceView.render().$el,
      helpNode.hide()
    )

    this.model.on('change:rrule', function () {
      if (!self.model.get('rrule')) {
        helpNode.hide()
        return
      }
      // just return, no hide here (autochange hint might be there)
      if (self.model.checkRecurrenceRule()) return
      helpNode.removeClass('alert-info').addClass('alert-warning').text(errorText).show()
    })
    this.model.getRruleMapModel().on('autochanged', function () {
      helpNode.removeClass('alert-warning').addClass('alert-info').text(helpText).show()
    })
    recurrenceView.on('openeddialog', function () {
      helpNode.hide()
    })
  }
})

// note
point.extend({
  id: 'note',
  index: 800,
  className: 'col-xs-12 mt-8 mb-16',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label mb-0">').text(gt('Description')).attr({ for: guid }),
      new mini.TextView({ name: 'description', model: this.model }).render().$el.attr({ id: guid }).addClass('note')
    )
  }
})

const CalendarDropdownView = mini.AbstractView.extend({

  tagName: 'fieldset',
  dropDown: {},
  $toggle: $('<button class="btn btn-link dropdown-toggle truncate w-full inline-block text-left" data-toggle="dropdown" type="button" aria-haspopup="true">'),

  getColor (folder) {
    const props = folder['com.openexchange.calendar.extendedProperties']
    let color = calendarUtil.getDefaultFolderColor()
    if (props && props.color && props.color.value) color = props.color.value
    const label = _(calendarUtil.colors).findWhere({ value: color }) || {}
    return { value: color, label: label.label || gt('User defined color') }
  },

  setup () {
    const self = this

    this.listenTo(this.model, 'change:folder', async function (model, folder) {
      const getNewModel = folderAPI.get(folder)
      const getPreviousModel = folderAPI.get(self.model.previous('folder'))

      const modelData = await Promise.all([getNewModel, getPreviousModel])
      const newModel = modelData[0]
      const previousModel = modelData[1]

      const prevOrg = self.model.previousAttributes().organizer
      // check if we need to make changes to the appointment
      // needed when switch from shared to private or private to shared happens
      if (folderAPI.is('shared', newModel) || folderAPI.is('shared', previousModel)) {
        self.model.setDefaultAttendees({ create: true, resetStates: !self.model.get('id') }).done(function () {
          // trigger reset to trigger a redrawing of all participants (avoid 2 organizers)
          self.model.getAttendees().trigger('reset')
          // no organizer? return
          if (!prevOrg || self.model.get('organizer')) return
          // same organizer? No message needed (switched between shared calendars of the same user)
          if (prevOrg.entity === self.model.get('organizer').entity) return

          if (folderAPI.is('shared', newModel)) {
            yell('info', gt('You are using a shared calendar. The calendar owner was added as organizer.'))
          } else {
            yell('info', gt('You are no longer using a shared calendar. You were added as organizer.'))
          }
        })
      } else if (folderAPI.is('public', newModel) && !folderAPI.is('public', previousModel)) {
        // trigger redraw of attendees, organizer might be removable/not removable anymore
        self.model.getAttendees().trigger('reset')
      } else if (!folderAPI.is('public', newModel) && folderAPI.is('public', previousModel)) {
        const prevLength = self.model.getAttendees().length
        self.model.setDefaultAttendees({ create: true, resetStates: !self.model.get('id') }).done(function () {
          // trigger reset to trigger a redrawing of all participants (avoid 2 organizers)
          self.model.getAttendees().trigger('reset')
          // no user added -> user was organizer before, no yell needed
          if (prevLength === self.model.getAttendees().length) return

          yell('info', gt('You are no longer using a public calendar. You were added as organizer.'))
        })
      }
      this.update()
    })
  },

  async update () {
    const folder = await folderAPI.get(this.model.get('folder'))
    this.$toggle.attr('title', folder.display_title || folder.title).text(folder.display_title || folder.title)
    if (this.dropDown.update) this.dropDown.update()
  },

  render () {
    const self = this

    Promise.all([folderAPI.get(self.model.get('folder')), folderAPI.flat({ module: 'calendar' })]).then(folderData => {
      const folder = folderData[0]
      const folderSections = folderData[1]
      self.dropDown = new Dropdown({ caret: false, model: self.model, $toggle: self.$toggle })

      const folderLabel = folder.display_title || folder.title
      const folderNames = {
        private: gt('My calendars'),
        public: gt('Public calendars'),
        shared: gt('Shared calendars'),
        hidden: gt('Hidden calendars')
      }
      let i = 0

      function addSection (text, sectionName) {
        let folderSection = folderSections[sectionName]
        if (!folderSection || folderSection.length === 0) return

        folderSection = _(folderSection).filter(function (folder) {
          const create = folderAPI.can('create', folder)
          // we don't allow moving an already existing appointment to a folder from another user (moving from shared user A's folder to shared user A's folder is allowed).
          const allowed = !self.model.get('id') || folderAPI.is('public', folder) || (self.model.get('organizer') && folder.created_by === self.model.get('organizer').entity)

          return (create && allowed && !/^virtual/.test(folder.id))
        })

        if (folderSection.length === 0) return

        if (i !== 0) self.dropDown.divider()
        self.dropDown.header(text)

        _(folderSection).forEach(function (folder) {
          const checkboxColor = self.getColor(folder)
          self.dropDown.option(
            'folder',
            folder.id,
            function () {
              return [
                $.txt(folder.display_title || folder.title),
                $('<span class="sr-only">').text(`, ${gt('Color')}: ${checkboxColor.label}`)
              ]
            },
            { radio: true, color: checkboxColor.value }
          )
        })
        i++
      }

      self.$toggle.attr('title', folderLabel).text(folderLabel)

      _(folderNames).each(addSection)

      self.$el.append(
        $('<legend>').addClass('simple').text(gt('Calendar')),
        self.dropDown.render().$el
      )
    })
    return this
  }
})

// separator or toggle
point.basicExtend({
  id: 'noteSeparator',
  index: 'last',
  draw (baton) {
    this.append(
      $('<a href="#">')
        .text(gt('Expand form'))
        .addClass('btn btn-link actionToggle')
        .on('click', function (e) {
          e.preventDefault()
          if (baton.parentView.collapsed) {
            $('.row.collapsed', baton.parentView.$el).css('display', '')
            $(this).text(gt('Expand form'))
          } else {
            $('.row.collapsed', baton.parentView.$el).show()
            $(this).text(gt('Collapse form'))
          }
          baton.parentView.collapsed = !baton.parentView.collapsed
        })
    )
  }
})

// participants container
point.basicExtend({
  id: 'add-participant',
  index: 900,
  rowClass: 'collapsed',
  draw (baton) {
    if (baton.parentView.options.usedGroups) baton.model.getAttendees().usedGroups = _.uniq((baton.model.getAttendees().usedGroups || []).concat(baton.parentView.options.usedGroups))

    const add = baton.parentView.addParticipantsView = baton.parentView.addParticipantsView || new AddParticipantView({
      apiOptions: {
        contacts: true,
        users: true,
        groups: true,
        resources: true,
        distributionlists: true
      },
      convertToAttendee: true,
      collection: baton.model.getAttendees(),
      blocklist: settings.get('participantBlacklist') || false,
      scrollIntoView: true,
      // to prevent addresspicker from processing data asynchronously.
      // Not needed and may cause issues with slow network (hitting save before requests return).
      processRaw: true,
      label: gt('Participants and resources'),
      labelVisible: true,
      placeholder: gt('Name or email address') + ' ...'
    })

    this.append(
      add.render().$el
        .addClass('col-xs-12 pb-8 sticky top-0 z-10')
    )

    // add link "Find free time"
    // it's easier this way than adding this to AddParticipantView as it requires app and model
    if (capabilities.has('freebusy !alone !guest') && _.device('desktop')) {
      add.$('label').after(
        $('<a href="#" role="button" class="ms-auto">').text(`${gt('Find a free time')} ...`)
          .on('click', { app: baton.app, model: baton.model }, openFreeBusyView)
      )
    }

    const view = new AttendeeContainer({ baton, collection: baton.model.getAttendees() })
    this.append(view.render().$el)
  }
})

point.extend({
  id: 'folder-selection',
  index: 1300,
  className: 'col-xs-12 col-sm-6 folder-selection',
  render () {
    const view = new CalendarDropdownView({ model: this.model }).render().$el
    this.$el.append(view).addClass('col-xs-12')
  }
}, {
  nextTo: 'alarms-container',
  rowClass: 'collapsed'
})

// Visibility / former private checkbox
point.extend({
  id: 'private_flag',
  index: 1100,
  className: 'col-sm-6 col-xs-12 mb-16',
  render () {
    // visibility flag only works in private folders and does not work with exceptions
    const folder = this.model.get('folder')
    const guid = _.uniqueId('form-control-label-')
    if (!folderAPI.pool.getModel(folder).is('private') || (this.model.get('recurrenceId') && this.model.mode === 'appointment')) return

    this.$el.append(
      $('<div>').append(
        $('<label class="simple">').attr('for', guid).text(gt('Visibility')),
        new mini.SelectView({
          id: guid,
          label: gt('Visibility'),
          name: 'class',
          model: this.model,
          list: [
            { value: 'PUBLIC', label: gt('Standard') },
            { value: 'CONFIDENTIAL', label: gt('Private') },
            { value: 'PRIVATE', label: gt('Secret') }]
        }).render().$el,
        new mini.ErrorView({ name: 'class', model: this.model }).render().$el
      )
    )
  }
}, {
  rowClass: 'collapsed'
})

// container for alarms and color
point.extend({
  id: 'alarms-container',
  index: 1200,
  className: 'col-xs-12 col-sm-6',
  render () {
    ext.point('io.ox/calendar/edit/section/alarms-container').invoke('render', this)
  }
}, {
  rowClass: 'collapsed'
})

// alarms
ext.point('io.ox/calendar/edit/section/alarms-container').extend({
  id: 'alarms',
  index: 100,
  render () {
    this.baton.parentView.alarmsView = this.baton.parentView.alarmsView || new AlarmsView.LinkView({ model: this.model })
    this.$el.append(
      $('<fieldset>').append(
        $('<legend class="simple">').text(gt('Reminder')),
        this.baton.parentView.alarmsView.render().$el
      )
    )
  }
})

// color selection
ext.point('io.ox/calendar/edit/section/alarms-container').extend({
  id: 'color',
  index: 200,
  render () {
    const self = this
    const isNew = !this.model.id
    const picker = new ColorPicker({
      model: this.model,
      attribute: 'color',
      additionalColor: this.model.get('color') ? { value: this.model.get('color') } : undefined
    })
    const $toggle = $('<button class="btn btn-link dropdown-toggle" data-toggle="dropdown" type="button" aria-haspopup="true">')
      .append($('<span class="text-decoration-underline">').text(gt('Appointment color')))

    function hasCategorySettingsEnabled () {
      return (coreSettings.get('features/categories', false) && settings.get('categoryColorAppointments', true))
    }

    function hasCategories () { return !!(self.model.get('categories') && self.model.get('categories').length !== 0) }

    function getColorFromCategory () {
      if (!hasCategorySettingsEnabled()) return null
      return getCategoryColor(self.model.get('categories'), 'appointment' + self.model.get('id'))
    }

    function disableToggle () {
      if (!hasOrganizerRights(self.model) && !isNew) dropdown.$toggle.attr({ disabled: true, title: null }).toggleClass('disabled', true)
      else if (hasCategorySettingsEnabled() && hasCategories()) {
        const disabled = !!getColorFromCategory()
        const title = disabled ? gt('First category color is used for this appointment.') : null
        dropdown.$toggle.attr({ disabled, title }).toggleClass('disabled', disabled)
      } else dropdown.$toggle.attr({ disabled: false, title: null }).toggleClass('disabled', false)
    }

    // Check if user neither has organizer rights nor is creating a new appointment where no right information are available
    if ((!hasOrganizerRights(this.model) && !isNew) || (hasCategorySettingsEnabled() && hasCategories())) $toggle.addClass('disabled').prop('disabled', true)
    const menu = $('<ul class="dropdown-menu">')
    const pickedColor = $('<span class="picked-color" aria-hidden="true">').text('Aa')
    const pickedColorLabel = $('<span class="sr-only">')
    const dropdown = new Dropdown({
      smart: true,
      className: 'color-picker-dropdown dropdown',
      $toggle: $toggle.append(pickedColor, pickedColorLabel),
      $ul: menu,
      margin: 24,
      model: this.model,
      caret: true,
      allowUndefined: true
    })
    // #. showed inside a color picker. Used if an appointment should not have a custom color
    // select option if no custom color is applied (color is undefined)
    const value = this.model.get('color') === undefined ? undefined : ''
    dropdown.option('color', value, gt('Use calendar color'), { radio: true })
    dropdown.$ul.find('[data-name="color"]').addClass('folder-default-color')
    menu
      .append($('<li role="presentation" class="io-ox-calendar-color-picker-container">')
        .append(picker.render().$el)
      )
      .on('keydown', e => { if (e.which === 9) a11y.trapFocus(menu, e) })

    this.$el.append(dropdown.render().$el)

    // monkey-patch dropdown keyboard focus
    dropdown.$toggle.on('click', () => {
      setTimeout(() => {
        const $defaultColor = dropdown.$ul.find('.folder-default-color').attr('tabindex', 0)
        const $active = dropdown.$ul.find('button[aria-checked=true]')
        if ($active.length) {
          $active.focus()
        } else {
          $defaultColor.focus()
        }
      }, 100) // fighting with the dropdown _.defer, make sure this runs after
    })

    function onChangeColor () {
      let colorLabel = gt('none')
      const folder = folderAPI.pool.getModel(self.model.get('folder')).toJSON()
      const folderColor = calendarUtil.getFolderColor(folder)

      let color = self.model.get('color') || folderColor
      // Check if user neither has organizer rights nor is creating a new appointment where no right information are available
      if ((!hasOrganizerRights(self.model) && !isNew)) color = colorDisabled
      if (getColorFromCategory()) color = getColorFromCategory()
      if (color) {
        color = calendarUtil.sanitizeHue(color)
      } else {
        // try to get the folder color
        color = calendarUtil.sanitizeHue(calendarUtil.getFolderColor(folderAPI.pool.getModel(self.model.get('folder')) || new Backbone.Model()))
        picker.$el.find(':checked').prop('checked', false)
      }

      if (_(calendarUtil.colors).findWhere({ value: color })) colorLabel = _(calendarUtil.colors).findWhere({ value: color }).label
      pickedColorLabel.text(colorLabel)
      const colors = calendarUtil.deriveAppointmentColors(color)
      pickedColor.css({
        color: colors.foreground,
        'border-color': colors.border,
        'background-color': colors.background
      })
    }

    this.model.on('change:categories', disableToggle)
    this.model.on('change:categories', onChangeColor)
    coreSettings.on('change:categories/userCategories', disableToggle)
    coreSettings.on('change:categories/userCategories', onChangeColor)

    this.model.on('change:color change:folder', onChangeColor)
    ox.on('themeChange', onChangeColor)
    onChangeColor()

    settings.on('change:categoryColorAppointments', disableToggle)
    disableToggle()
  }
})

// container for alarms and color
point.extend({
  id: 'visibility-container',
  index: 1400,
  className: 'col-xs-12 col-sm-6 visibility-container',
  render () {
    ext.point('io.ox/calendar/edit/section/visibility-container').invoke('render', this)
  }
}, {
  nextTo: 'private_flag',
  rowClass: 'collapsed'
})

// shown as
ext.point('io.ox/calendar/edit/section/visibility-container').extend({
  id: 'shown_as',
  index: 100,
  render () {
    const parentView = this.baton.parentView
    // used by all day checkbox
    const VisibilityCheckbox = mini.CustomCheckboxView.extend({
      onChange () {
        parentView.userChangedTransp = true
        this.model.set(this.name, this.getValue())
      }
    })

    this.$el.append(
      new VisibilityCheckbox({
        label: gt('Show as free'),
        name: 'transp',
        model: this.model,
        customValues: { false: 'OPAQUE', true: 'TRANSPARENT' },
        defaultVal: 'OPAQUE'
      }).render().$el
    )
  }
})

// participants container
point.basicExtend({
  id: 'allowAttendeeChanges',
  index: 1000,
  rowClass: 'collapsed',
  draw (baton) {
    const $el = this
    const model = baton.model
    const checkboxView = new mini.CustomCheckboxView({
      label: gt('Participants can make changes'),
      name: 'attendeePrivileges',
      model: baton.model,
      customValues: { false: 'DEFAULT', true: 'MODIFY' }
    })

    $el.append(
      $('<div class="col-xs-12 mt-8 mb-8">').append(
        checkboxView.render().$el.addClass('attendee-change-checkbox')
      )
    )

    // only the organizer is allowed to change this attribute
    // also not allowed for exceptions or in public folders
    const isNotOrganizer = baton.mode === 'edit' && !(calendarUtil.hasFlag(model, 'organizer') || calendarUtil.hasFlag(model, 'organizer_on_behalf'))
    const isException = model.get('recurrenceId') && model.mode === 'appointment'

    function onChange () {
      const disabledByFolder = isNotOrganizer || isException || folderAPI.pool.getModel(model.get('folder')).is('public')
      // if checkbox is disabled this means attendeePrivileges must be set to DEFAULT because MODIFY is not supported. Would cause error on save otherwise
      // no changes if you are not the organizer or if this is an exception. We need to leave the value as is
      if (disabledByFolder && !(isNotOrganizer || isException)) model.set('attendeePrivileges', 'DEFAULT')
      // disable if the current user the only attendee
      const attendees = model.get('attendees')
      const justMyself = attendees.length === 1 && attendees[0].entity === ox.user_id
      checkboxView.disable(justMyself || disabledByFolder)
    }
    onChange()
    checkboxView.listenTo(model, 'change:folder change:attendees', onChange)
  }
})

point.extend({
  id: 'category',
  index: 1450,
  render () {
    if (coreSettings.get('features/categories', false)) {
      const pimId = 'appointment' + this.model.get('id')
      const pimCategories = getCategoriesFromModel(this.model.get('categories'), pimId)

      const categoryBadges = new CategoryBadgesView({ collection: pimCategories, removable: true })
      const categoriesDropdown = new CategoryDropdown({
        pimId,
        pimModel: this.model,
        pimCategories,
        caret: true,
        label: gt('Add category'),
        useToggleWidth: true
      })

      this.$el.append(
        $('<fieldset class="col-xs-12 categoriesrow-calendar">').append(
          $('<legend class="simple">').text(gt('Categories')),
          $('<div class="category-dropdown-wrapper">').append(
            categoriesDropdown.render().$el),
          categoryBadges.render().$el
        )
      )
    }
  }
})

// Attachments

// attachments label
point.extend({
  id: 'attachments_legend',
  index: 1500,
  className: 'col-md-12',
  render () {
    this.$el.append(
      $('<fieldset>').append(
        $('<legend class="mb-8">').text(gt('Attachments'))
      )
    )
  }
})

point.basicExtend({
  id: 'attachments_list_and_upload',
  index: 1700,
  rowClass: 'collapsed',
  draw (baton) {
    const model = baton.model
    const collection = baton.attachments = new AttachmentCollection()

    const listView = new AttachmentListView({ collection, model, module: 1 })
    const uploadView = new AttachmentUploadView({ collection, model })
    const driveUploadView = new AttachmentDriveUploadView({ collection, model })

    this.append(
      $('<div class="section col-md-12 collapsible">').attr('data-section', 'attachments').append(
        listView.render().$el,
        $('<div class="attachment-list-actions flex-row">').append(
          uploadView.render().$el,
          driveUploadView.render().$el
        )
      )
    )

    baton.app.listenTo(model, 'create update', () => collection.reset())
    baton.model.on('invalid:quota_exceeded', messages => yell('error', messages[0]))
  }
})

ext.point('io.ox/calendar/edit/dnd/actions').extend({
  id: 'attachment',
  index: 10,
  label: gt('Drop here to upload a <b class="dndignore">new attachment</b>'),
  multiple: (files, app) => {
    const baton = app.view.baton;
    [...files].forEach((fileData) => baton.attachments.add(fileData, { parse: true }))
  }
})

function openFreeBusyView (e) {
  e.preventDefault()
  import('@/io.ox/calendar/freetime/main').then(({ default: freetime }) => {
    // #. Applies changes to an existing appointment, used in scheduling view
    const data = freetime.showDialog({ label: gt('Apply changes'), parentModel: e.data.model })
    const view = data.view
    data.dialog.on('save', function () {
      const appointment = view.createAppointment()
      if (appointment) {
        data.dialog.close()
        e.data.model.set({ startDate: appointment.startDate })
        // use initialRendering attribute to avoid auto-scrolling
        e.data.app.view.addParticipantsView.initialRendering = true
        e.data.model.getAttendees().reset(appointment.attendees)
        // set end_date in a separate call to avoid the appointment model applyAutoLengthMagic (Bug 27259)
        e.data.model.set({
          endDate: appointment.endDate
        }, { validate: true })
        // make sure the correct allday state is set
        e.data.app.view.fullTimeToggleModel.set('allDay', calendarUtil.isAllday(appointment))
      } else {
        data.dialog.idle()
        yell('info', gt('Please select a time for the appointment'))
      }
    })
  })
}

addReadyListener('capabilities:user', (capabilities) => {
  if (!coreSettings.get('features/PIMAttachments', capabilities.has('filestore'))) {
    ext.point('io.ox/calendar/edit/section')
      .disable('attachments_legend')
      .disable('attachments_upload')
  }
})
