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

import DisposableView from '@/io.ox/backbone/views/disposable'
import ext from '@/io.ox/core/extensions'
import http from '@/io.ox/core/http'
import models from '@/io.ox/calendar/model'
import * as calendarUtil from '@/io.ox/calendar/util'
import yell from '@/io.ox/core/yell'
import _ from '@/underscore'
import ox from '@/ox'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import '@/io.ox/calendar/style.scss'
import { RecurrenceRuleMapModel } from '@/io.ox/calendar/recurrence-rule-map-model'
import { settings as calendarSettings } from '@/io.ox/calendar/settings'
import { settings as taskSettings } from '@/io.ox/tasks/settings'
import gt from 'gettext'
import { createButton } from '@/io.ox/core/components'

import threeDotsIcon from 'bootstrap-icons/icons/three-dots.svg?raw'
import { isMiddlewareMinVersion } from '@/io.ox/core/util'

const i18n = {
  accept: gt('Accept'),
  accept_and_ignore_conflicts: gt('Accept'),
  accept_and_replace: gt('Accept changes'),
  accept_party_crasher: gt('Add new participant'),
  apply_change: gt('Update Appointment'),
  apply_create: gt('Add to Calendar'),
  apply_proposal: gt('Accept Proposal'),
  apply_remove: gt('Remove Appointment'),
  apply_response: gt('Update Appointment'),
  create: gt('Accept'),
  decline: gt('Decline'),
  declinecounter: gt('Reject changes'),
  ignore: gt('Ignore'),
  request_refresh: gt('Request Appointment'),
  send_refresh: gt('Send Appointment'),
  tentative: gt('Maybe')
}

const buttonClasses = {
  accept: 'btn-default accept',
  accept_and_ignore_conflicts: 'btn-default ignore',
  accept_and_replace: 'btn-default',
  accept_party_crasher: '',
  apply_change: 'btn-default',
  apply_create: 'btn-default',
  apply_proposal: 'btn-default',
  apply_remove: 'btn-default',
  apply_response: 'btn-default',
  create: '',
  decline: 'btn-default declined',
  declinecounter: 'btn-default',
  ignore: '',
  request_refresh: 'btn-default',
  send_refresh: 'btn-default',
  tentative: 'btn-default tentative'
}

const success = {
  accept: gt('You have accepted the appointment'),
  accept_and_ignore_conflicts: gt('You have accepted the appointment'),
  accept_and_replace: gt('Changes have been saved'),
  accept_party_crasher: gt('Added the new participant'),
  apply_change: gt('The appointment has been updated'),
  apply_create: gt('The appointment was added'),
  apply_proposal: gt('The changes have been accepted'),
  apply_remove: gt('The appointment has been deleted'),
  apply_response: gt('The appointment has been updated'),
  create: gt('You have accepted the appointment'),
  decline: gt('You have declined the appointment'),
  declinecounter: gt('The changes have been rejected'),
  ignore: '',
  request_refresh: '',
  send_refresh: '',
  tentative: gt('You have tentatively accepted the appointment')
}

const priority = ['apply_create', 'apply_change', 'apply_proposal', 'apply_remove', 'apply_response', 'send_refresh', 'request_refresh', 'ignore', 'create', 'accept', 'accept_and_ignore_conflicts', 'accept_party_crasher', 'tentative', 'decline', 'declinecounter']

const generateIcon = function (month, day) {
  return $('<svg width="50px" height="50px" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" version="1.1">' +
  '<rect stroke="#cccccc" fill="#FFFFFF" x="0" y="0" width="48" height="48" rx="6"></rect>' +
  '<path d="M48,18 L0,18 L0,6 C-4.05812251e-16,2.6862915 2.6862915,6.08718376e-16 6,0 L42,0 C45.3137085,-6.08718376e-16 48,2.6862915 48,6 L48,18 Z" fill="currentColor"></path>' +
  `<text font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle"><tspan x="24" y="13">${month}</tspan></text>` +
  `<text font-size="22" font-weight="bold" fill="#333333" text-anchor="middle"><tspan x="24" y="41">${day}</tspan></text>` +
  '</svg>')
}
//
// Basic View
// expects data to be in the this.model variable and works only on the new events model
// if other data (e.g. tasks) are used, overwrite according functions
//
const BasicView = DisposableView.extend({

  className: 'itip-item',

  events: {
    'click .itip-actions button[data-action="changestatus"]': 'onChangeStatus',
    'click .itip-actions button': 'onAction',
    keydown: 'onKeydown'
  },

  initialize (options) {
    this.options = _.extend({}, options)

    this.mailModel = options.mailModel
    this.module = options.module
    this.api = options.api
    this.util = options.util
    this.settings = options.settings
    this.AlarmsView = options.AlarmsView
    this.showDeeplinks = options.showDeeplinks

    if (this.AlarmsView) {
      this.alarmsModel = new Backbone.Model(this.model.toJSON())
      this.alarmsModel.set('alarms', this.alarmsModel.get('alarms') || calendarUtil.getDefaultAlarms(this.alarmsModel))
    }

    this.listenTo(this.model, 'change:flags change:participants', this.render)
  },

  onKeydown (e) {
    // temporary fix; bootstrap a11y plugin causes problems here (space key)
    e.stopPropagation()
  },

  getFullModel () {
    return this.api.get(this.model.attributes)
  },

  renderScaffold () {
    return this.$el.append(
      $('<div class="itip-details">'),
      $('<div class="headline">').append(
        $('<a href="#" role="button" class="show-details">').text(this.getLinkText())
      ),
      $('<div class="itip-annotations">'),
      $('<div class="itip-changes">'),
      $('<div class="itip-controls">')
    )
  },

  getInfoText () {
    return gt('This email contains an appointment')
  },

  getLinkText () {
    return gt('Show appointment details')
  },

  renderConfirmation () {
    const status = this.getConfirmationStatus() // NEEDS-ACTION ACCEPTED DECLINED TENTATIVE
    let message = ''

    if (this.isOrganizer()) {
      message = gt('You are the organizer')
      return $('<div class="confirmation-status">').addClass('organizer').text(message)
    }

    switch (status) {
      case 'ACCEPTED':
        message = this.getAcceptedMessage()
        break
      case 'DECLINED':
        message = this.getRejectedMessage()
        break
      case 'TENTATIVE':
        message = this.getTentativeMessage()
        break
      default:
    }

    if (message) return $('<div class="confirmation-status">').addClass(status.toLowerCase()).text(message)
    return $()
  },

  getAcceptedMessage () {
    return gt('You have accepted this appointment')
  },

  getRejectedMessage () {
    return gt('You declined this appointment')
  },

  getTentativeMessage () {
    return gt('You tentatively accepted this appointment')
  },

  isOrganizer () {
    return this.model.has('organizer') && this.model.get('organizer').entity === ox.user_id
  },

  getConfirmationStatus () {
    return this.util.getConfirmationStatus(this.model)
  },

  renderSummary () {
    const datetime = this.getDateTimeIntervalMarkup()
    const recurrenceString = RecurrenceRuleMapModel.getRecurrenceString(this.model)
    const title = this.getTitle()
    const location = this.model.get('location')
    if (datetime.startMonth !== undefined) {
      this.$('.itip-details').before(
        generateIcon(datetime.startMonth, datetime.startDay).addClass('calendar-icon')
      )
    }
    this.$('.itip-details').append(
      $('<h3>').text(title),
      $('<div class="day">').append(
        datetime.dateStr && $('<span class="mr-8">').text(datetime.dateStr),
        datetime.timeStr && $('<b>').text(datetime.timeStr)
      ),
      recurrenceString && recurrenceString.length
        ? $('<div>').text(recurrenceString)
        : $(),
      location ? $('<div class="bold">').text(location) : $(),
      // confirmation
      this.renderConfirmation()
    )
  },

  getTitle () {
    return this.model.get('summary')
  },

  getDateTimeIntervalMarkup () {
    return this.util.getDateTimeIntervalMarkup(this.model.attributes, { output: 'strings', zone: moment().tz() })
  },

  renderAnnotations () {
  },

  renderChanges () {
  },

  getActions () {
    if (this.getConfirmationStatus() === 'ACCEPTED') return []
    if (this.model.hasFlag && this.model.hasFlag('event_cancelled')) return []
    return ['accept', 'tentative', 'decline']
  },

  getButtons (actions) {
    return _(priority)
      .chain()
      .filter(function (action) {
        return _(actions).contains(action)
      })
      .map(function (action) {
        return $('<button type="button" class="btn btn-default">')
          .attr('data-action', action)
          .addClass(buttonClasses[action])
          .text(i18n[action])
      })
      .value()
  },

  getConfirmationSelector (status) {
    if (status === 'ACCEPTED') return 'button.accept'
    if (status === 'DECLINED') return 'button.declined'
    if (status === 'TENTATIVE') return 'button.tentative'
    return ''
  },

  disableCurrentButton () {
    const status = this.getConfirmationStatus()
    const selector = this.getConfirmationSelector(status)
    // disable buttons - don't know why we have an array of appointments but just one set of buttons
    // so, let's use the first one
    this.$('.itip-actions').find(selector).addClass('disabled').prop('disabled', true)
  },

  render () {
    // do not render if busy
    if (this.$el.hasClass('io-ox-busy')) return

    this.$el.empty()
    if (this.$el.is(':hidden')) this.$el.fadeIn(300)

    this.renderScaffold()
    this.renderAnnotations()

    if (!this.model) {
      // remove "Show appointment" link
      this.$el.find('.show-details').remove()
      return this
    }

    this.renderSummary()
    this.renderChanges()

    // don't offer actions when this is an external account => not supported
    if (parseInt(this.mailModel.get('account_id'), 10) !== 0) return this

    // get standard buttons
    const actions = this.getActions() || []
    const uncommonActions = actions.filter(a => !/^(accept|tentative|decline)$/.test(a))
    const commonActions = actions.filter(a => /^(accept|tentative|decline)$/.test(a))
    // special case: no accept button in common actions, but in uncommon actions
    if (!commonActions.find(a => a === 'accept') && uncommonActions.find(a => /^(accept_and_ignore_conflicts|create)$/.test(a))) {
      const acceptAction = uncommonActions.find(a => /^(accept_and_ignore_conflicts|create)$/.test(a))
      const index = uncommonActions.indexOf(acceptAction)
      uncommonActions.splice(index, 1)
      commonActions.unshift(acceptAction)
    }
    // special case: no trio of accept, tentative, decline
    if (commonActions.length !== 3) {
      commonActions.splice(0, commonActions.length)
      uncommonActions.splice(0, uncommonActions.length, ...actions)
    }
    const uncommonButtons = this.getButtons(uncommonActions)
    const commonButtons = this.getButtons(commonActions)

    if (uncommonButtons.length + commonButtons.length === 0) return this
    // use doesn't need any controls to "ignore" the message
    if (actions.length === 1 && actions[0] === 'ignore') return this

    this.$el.find('.itip-controls').append(
      $('<div class="itip-actions">').append(
        commonButtons.length > 0 && $(`<div class="btn-group" role="group" aria-label="${gt('Change participation')}">`).append(
          commonButtons,
          createButton({ variant: 'default', icon: { name: threeDotsIcon, title: gt('Add comment') } })
            .append($.txt('\u00a0'))
            .attr('data-action', 'changestatus')
        ),
        uncommonButtons
      )
    )

    this.disableCurrentButton()

    return this
  },

  onChangeStatus (e) {
    e.stopImmediatePropagation()
  }

})

//
// External invitations
//

const ExternalView = BasicView.extend({

  getFullModel () {
    return $.when(this.model)
  },

  performConfirm (action, message) {
    const imip = this.imip
    const params = { action }
    if (message) params.message = message

    return http.PUT({
      module: 'chronos/itip',
      params,
      data: {
        'com.openexchange.mail.conversion.fullname': imip.mail.folder_id,
        'com.openexchange.mail.conversion.mailid': imip.mail.id,
        'com.openexchange.mail.conversion.sequenceid': imip.id
      }
    })
      .then(
        (data) => {
          // api refresh
          const refresh = import('@/io.ox/calendar/api').then(({ default: api }) => {
            api.updatePoolData({ updated: data })
            api.refresh()
            if (this.options.yell !== false) {
              yell('success', success[action])
            }
          })

          if (this.settings.get('deleteInvitationMailAfterAction', false)) {
            // remove mail
            import('@/io.ox/mail/api').then(({ default: api }) => {
              api.remove([this.mailModel.toJSON()])
            })
          } else {
            // repaint only if there is something left to repaint
            refresh.then(() => {
              // if the delete action was successful we don't need the button anymore, see Bug 40852
              if (action === 'delete') {
                this.model.set('actions', _(this.model.get('actions')).without('delete'))
              }
              this.repaint()
            })
          }
        },
        (e) => {
          yell(e)
          this.repaint()
        }
      )
  },

  onAction (e) {
    e.preventDefault()

    const action = $(e.currentTarget).attr('data-action')
    const checkConflicts = action !== 'decline'

    this.changeConfirmation({ action, checkConflicts })
  },

  initialize (options) {
    BasicView.prototype.initialize.call(this, options)
    this.options = _.extend({}, options)
    this.imip = options.imip
    this.$el.hide()
  },

  getActions () {
    return this.options.actions
  },

  renderScaffold () {
    BasicView.prototype.renderScaffold.call(this)
    this.$('.show-details').attr('data-detail-popup', 'itip').data('model', this.model)
  },

  renderAnnotations () {
    const node = this.$el.find('.itip-annotations')
    if (!this.options.annotations) return
    _(this.options.annotations).each(function (annotation) {
      node.append(
        $('<div class="annotation">').text(annotation.message)
      )
    })
  },

  renderSummary () {
    if (this.options.targetedAttendee?.cuType === 'RESOURCE') {
      this.$('.itip-details').append(
        $('<h3>').text(this.options.targetedAttendee.cn)
      )
    }
    BasicView.prototype.renderSummary.call(this)
  },

  renderConfirmation () {
    if (this.isOrganizer()) return $('<div class="confirmation-status organizer">').text(gt('You are the organizer'))

    // no state message for resources. You accepted this appointment is a bit confusing here
    // MW annotations already contain this information
    if (this.options.targetedAttendee?.cuType === 'RESOURCE') return $()

    const status = this.getConfirmationStatus() // NEEDS-ACTION ACCEPTED DECLINED TENTATIVE
    let message = ''
    switch (status) {
      case 'ACCEPTED':
        message = this.getAcceptedMessage()
        break
      case 'DECLINED':
        message = this.getRejectedMessage()
        break
      case 'TENTATIVE':
        message = this.getTentativeMessage()
        break
      default:
    }

    if (message) return $('<div class="confirmation-status">').addClass(status.toLowerCase()).text(message)
    return $()
  },

  renderChanges () {
    const node = this.$el.find('.itip-changes')
    if (!this.options.diffDescription) return
    _(this.options.diffDescription).each(function (description) {
      node.append($('<p>').html(description))
    })
  },

  repaint () {
    this.options.container.analyzeIMIPAttachment(this.imip)
      .then(function (list) {
        const data = _(list).first() || {}
        const change = data.changes ? data.changes[0] : {}
        const eventData = change.deletedEvent || change.newEvent || change.currentEvent
        // update content
        this.options.actions = data.actions
        this.options.introduction = change.introduction
        this.options.diffDescription = change.diffDescription
        this.options.annotations = data.annotations
        this.options.targetedAttendee = data.targetedAttendee
        this.options.currentEvent = change.currentEvent
        if (eventData) this.model.set(eventData)
        else delete this.model
        this.render()
      }.bind(this))
  },

  onChangeStatus (e) {
    e.stopImmediatePropagation()
    ox.load(() => import('@/io.ox/calendar/actions/acceptdeny')).then(({ default: action }) => {
      const options = {
        noFolderCheck: true,
        api: {
          // prefer current event if we have it for the dialog (no current comment/partStat otherwise)
          get: () => this.options.currentEvent ? new models.Model(this.options.currentEvent) : this.model
        }
      }
      // not acting as the current user and we have information about the targeted attendee (for example resource booking requests)
      if (this.options.targetedAttendee) options.attendee = this.options.targetedAttendee
      action(this.options.currentEvent || this.model.toJSON || {}, options).then(dialog => {
        dialog.performConfirm = () => {
          const accepted = this.options.actions.reduce((m, s) => m || s.match(/^(accept|accept_and_ignore_conflicts|create)$/)?.[1], null)
          const map = { accepted, tentative: 'tentative', declined: 'decline' }
          const action = map[dialog.model.get('status')]
          const comment = dialog.model.get('comment')
          const checkConflicts = action !== 'decline'
          this.changeConfirmation({ action, comment, checkConflicts })
            .then(() => dialog.close())
        }
      })
    })
  },

  changeConfirmation ({ action, comment, checkConflicts = true } = {}) {
    return ox.load(() => import('@/io.ox/calendar/actions/change-confirmation')).then(({ default: changeConfirmation }) => {
      changeConfirmation(this.imip, {
        // External invitations, use dummy api because we can only work with the data we have available
        api: {
          checkConflicts: () => {
            // no need to check if appointment was declined
            if (!checkConflicts) return $.when([])

            if (_.isArray(this.options.conflicts)) return $.when(this.options.conflicts)

            let conflicts = []
            _(this.model.get('changes')).each(function (change) {
              if (change.conflicts) conflicts = conflicts.concat(change.conflicts)
            })
            return $.when(conflicts)
          }
        }
      }).then(() => this.performConfirm(action, comment)).catch((err) => {
        if (err) yell(err)
      })
    })
  }
})

//
//  Internal invitations
//

const InternalView = BasicView.extend({

  initialize (options) {
    BasicView.prototype.initialize.call(this, options)
    this.listenTo(this.model, 'change:headers', this.render)
    this.cid = options.cid
    this.$el.hide()
    this.$el.attr({ 'data-type': this.type, 'data-cid': this.cid })
  },

  renderScaffold () {
    BasicView.prototype.renderScaffold.call(this)
    this.$('.show-details')
      .attr({ 'data-detail-popup': 'appointment', 'data-cid': this.model.cid })
      .data('model', this.model)
  }
})

const InternalAppointmentView = InternalView.extend({

  onAction (e) {
    const action = $(e.currentTarget).attr('data-action')
    const hash = { accept: 'ACCEPTED', tentative: 'TENTATIVE', decline: 'DECLINED' }

    const performConfirm = async (checkConflicts) => {
      const attendee = { ...this.previousConfirmation, partStat: hash[action] }

      try {
        const data = await this.api.confirm({
          attendee,
          id: this.model.get('id'),
          folder: this.model.get('folder'),
          alarms: this.alarmsModel.get('alarms')
        }, { checkConflicts: !!checkConflicts })

        if (data && data.conflicts) {
          const { default: conflictView } = await ox.load(() => import('@/io.ox/calendar/conflicts/conflictList'))
          conflictView.dialog(data.conflicts)
            .on('cancel', function () {
              this.$el.idle()
              this.render()
            })
            .on('ignore', function () {
              performConfirm(false)
            })
          return
        }

        // recurrence root models are not updated via api pool. Do it manually
        if (this.model.get('rrule') && !this.model.get('recurrenceId') && data.updated[0]) this.model.set(data.updated[0])

        if (calendarSettings.get('deleteInvitationMailAfterAction', false)) {
          // remove mail
          if (this.options.yell !== false) {
            let message
            if (action === 'accept') message = this.getAcceptedMessage()
            else if (action === 'tentative') message = this.getTentativeMessage()
            else if (action === 'decline') message = this.getRejectedMessage()
            yell('success', message)
          }
          const { default: api } = await import('@/io.ox/mail/api')
          api.remove([this.mailModel.toJSON()])
        } else {
          // update well
          this.$el.idle()
          this.render()
        }
      } catch (error) {
        this.$el.idle().hide()
        yell('error', gt('Failed to update confirmation status; most probably the appointment has been deleted.'))
      }
    }

    this.$el.busy({ empty: true })
    performConfirm(true)
  },

  onChangeStatus (e) {
    e.stopImmediatePropagation()
    Promise.all([
      import('@/io.ox/backbone/views/actions/util'),
      import('@/io.ox/calendar/actions')
    ]).then(([{ invoke }]) => {
      invoke('io.ox/calendar/detail/actions/changestatus', new ext.Baton({ model: this.model, data: this.model.toJSON() }))
    })
  }

})

const InternalTaskView = InternalView.extend({

  initialize (opt) {
    InternalView.prototype.initialize.call(this, opt)
    // check if the user participates
    this.isParticipant = !!_(this.model.get('participants') || []).findWhere({ id: ox.user_id })
    this.listenTo(this.api, 'mark:task:confirmed', (e, [{ id, data }] = [{}]) => {
      if (!id || this.model.get('id') !== id) return
      const user = _(this.model.get('users')).findWhere({ id: ox.user_id })
      if (user) {
        user.confirmation = data.confirmation
        this.model.trigger('update update:users', this.model)
        this.render()
      }
    })
  },

  renderScaffold () {
    BasicView.prototype.renderScaffold.call(this)
    this.$('.show-details')
      .attr({ 'data-detail-popup': 'task', 'data-cid': _.cid(this.model.toJSON()) })
      .data('model', this.model)
  },

  getTitle () {
    return this.model.get('title')
  },

  isOrganizer () {
    return this.model.get('created_by') === ox.user_id
  },

  getConfirmationStatus: (function () {
    const confirmations = ['NEEDS-ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE']
    return function () {
      const index = this.util.getConfirmationStatus(this.model.attributes)
      if (index >= 0 && index < confirmations.length) return confirmations[index]
      return 'NEEDS-ACTION'
    }
  }()),

  getInfoText () {
    return gt('This email contains a task')
  },

  getLinkText () {
    return gt('Show task details')
  },

  getAcceptedMessage () {
    return gt('You have accepted this task')
  },

  getRejectedMessage () {
    return gt('You declined this task')
  },

  getTentativeMessage () {
    return gt('You tentatively accepted this task')
  },

  getActions () {
    if (!this.isParticipant) return []
    return InternalView.prototype.getActions.call(this)
  },

  getDefaultReminder () {
    return parseInt(this.settings.get('defaultReminder', 15), 10)
  },

  onActionSuccess (action, updated) {
    const reminder = this.getDefaultReminder()
    let tempdata

    if (reminder) {
      // don't use whole data object here, because it overwrites the confirmations with it's users attribute
      tempdata = {
        id: this.model.get('id'),
        folder_id: this.model.get('folder_id'),
        alarm: reminder
      }
      if (this.model.has('recurrence_position')) {
        tempdata.recurrence_position = this.model.get('recurrence_position')
      }
      // tasks use absolute timestamps
      tempdata.alarm = _.now() + tempdata.alarm
      this.api.update(tempdata)
    }

    const user = _(this.model.get('users')).findWhere({ id: ox.user_id })
    if (user) {
      user.confirmation = updated
      this.model.trigger('update update:users', this.model)
    }

    if (calendarSettings.get('deleteInvitationMailAfterAction', false)) {
      // remove mail
      if (this.options.yell !== false) {
        let message
        if (action === 'accept') message = this.getAcceptedMessage()
        else if (action === 'tentative') message = this.getTentativeMessage()
        else if (action === 'decline') message = this.getRejectedMessage()
        yell('success', message)
      }
      import('@/io.ox/mail/api').then(({ default: api }) => {
        api.remove([this.mailModel.toJSON()])
      })
    } else {
      // update well
      this.$el.idle()
      this.render()
    }
  },

  onActionFail () {
    // appointment or task was deleted in the meantime
    this.$el.idle().hide()
    yell('error', gt('Failed to update confirmation status; most probably the task has been deleted.'))
  },

  onAction (e) {
    const self = this
    const action = $(e.currentTarget).attr('data-action')
    const hash = { accept: 1, decline: 2, tentative: 3 }
    const confirmation = hash[action]
    const status = this.getConfirmationStatus()
    const accepted = status === 'ACCEPTED'

    this.reminder = accepted ? false : this.getDefaultReminder()

    self.$el.busy({ empty: true })

    self.api.confirm({
      folder: this.model.get('folder_id'),
      id: this.model.get('id'),
      data: { confirmation }
    })
      .then(self.onActionSuccess.bind(self, action, confirmation), self.onActionFail.bind(self, action))
  },

  onChangeStatus (e) {
    e.stopImmediatePropagation()
    Promise.all([
      import('@/io.ox/backbone/views/actions/util'),
      import('@/io.ox/tasks/actions')
    ]).then(([{ invoke }]) => {
      invoke('io.ox/tasks/actions/confirm', new ext.Baton({ model: this.model, data: this.model.toJSON() }))
    })
  }

})

//
// Container view. Checks mail data and adds internal or external view
//

const ItipView = DisposableView.extend({

  initialize (options) {
    this.options = _.extend({}, options)
    if (this.model.has('headers')) this.analyzeMail()
    else this.listenToOnce(this.model, 'change:headers', this.analyzeMail)
  },

  analyzeMail () {
    if (this.hasIMIPAttachment()) this.processIMIPAttachment()
    else if (this.hasEvent()) this.processEvent()
    else if (this.hasTask()) this.processTask()
  },

  getIMIPAttachment () {
    const regex = /text\/calendar.*?method=(.+)/i
    // loop over attachments to find first attachment with mime-type text/calendar
    return _(this.model.get('attachments')).find(function (attachment) {
      const match = attachment.content_type.match(regex); let index; let method
      if (match && match[1].toLowerCase() !== 'publish') {
        index = match[1].indexOf(';')
        method = index !== -1 ? match[1].substr(0, index) : match[1]
        return method.toLowerCase() !== 'publish'
      }
      return false
    })
  },

  hasIMIPAttachment () {
    return !!this.getIMIPAttachment()
  },

  async analyzeIMIPAttachment (imip) {
    if (!imip || !imip.id) throw new Error()

    return http.PUT({
      module: 'chronos/itip',
      params: {
        action: 'analyze',
        timezone: 'UTC'
      },
      data: {
        'com.openexchange.mail.conversion.fullname': imip.mail.folder_id,
        'com.openexchange.mail.conversion.mailid': imip.mail.id,
        'com.openexchange.mail.conversion.sequenceid': imip.id
      }
    })
  },

  processIMIPAttachment () {
    const self = this
    const imip = this.getIMIPAttachment()
    const yell = this.options && this.options.yell
    imip.mail = { folder_id: this.model.get('folder_id'), id: this.model.get('id') }
    return this.analyzeIMIPAttachment(imip).then(function (list) {
      if (self.disposed) return
      if (list.length === 0) return

      let model
      const data = _(list).first() || {}
      // don't show view for resources if middleware version is too old
      if (data?.targetedAttendee?.cuType === 'RESOURCE' && !isMiddlewareMinVersion(8, 13)) return
      const change = data.changes ? data.changes[0] : {}
      const eventData = change.deletedEvent || change.newEvent || change.currentEvent
      if (eventData) model = new models.Model(eventData)
      self.model.set('imipMail', true)
      return Promise.all([import('@/io.ox/calendar/api'), import('@/io.ox/calendar/util')]).then(function ([{ default: api }, util]) {
        const extView = new ExternalView({
          model,
          module: 'calendar',
          api,
          util,
          settings: calendarSettings,
          actions: data.actions,
          introduction: change.introduction,
          diffDescription: change.diffDescription,
          annotations: data.annotations,
          currentEvent: change.currentEvent,
          imip,
          targetedAttendee: data.targetedAttendee,
          container: self,
          yell,
          mailModel: self.model,
          conflicts: change.conflicts
        })
        self.$el.append(
          extView.render().$el
        )
        // trigger event so width can be calculated
        extView.trigger('appended')
      })
    })
  },

  getCid () {
    const headers = this.model.get('headers') || {}
    let reminder = headers['X-OX-Reminder']
    const module = headers['X-Open-Xchange-Module']
    const sequence = headers['X-Open-Xchange-Sequence']
    if (!reminder || !module) return
    reminder = reminder.split(/,\s*/)
    return sequence ? { module, folder_id: reminder[1], id: reminder[0], sequence } : { module, folder_id: reminder[1], id: reminder[0] }
  },

  getType () {
    const headers = this.model.get('headers') || {}
    return headers['X-Open-Xchange-Type']
  },

  hasEvent () {
    const cid = this.getCid()
    if (!cid) return false
    return cid.module === 'Appointments'
  },

  processEvent () {
    const self = this
    const cid = this.getCid()
    const yell = this.options && this.options.yell
    return Promise.all([import('@/io.ox/calendar/api'), import('@/io.ox/calendar/util'), import('@/io.ox/backbone/mini-views/alarms')]).then(function ([{ default: api }, util, { default: AlarmsView }]) {
      return api.resolve({ id: cid.id, sequence: cid.sequence }, true).then(function (model) {
        if (self.disposed) return
        if (!model) return

        if (self.getType() === 'Deleted') {
          // make sure, that event_canceled flag is added if it has been deleted
          // this is necessary, when the resolve requests returns a recurrence root whereas just a single occurrence has been deleted
          model = model.clone()
          model.set('flags', ['event_cancelled'].concat(model.get('flags')))
        }

        const intView = new InternalAppointmentView({
          model,
          module: 'calendar',
          api,
          util,
          settings: calendarSettings,
          AlarmsView,
          yell,
          mailModel: self.model,
          showDeeplinks: true
        })

        self.$el.append(
          intView.render().$el
        )

        // trigger event so width can be calculated
        intView.trigger('appended')
      }, (error) => {
        // insufficient read permissions for the calendar folder. May happen a lot with invitation mails, so this is expected.
        if (error?.code === 'CAL-4030') return
        // everything else is thrown again
        throw error
      })
    })
  },

  hasTask () {
    const cid = this.getCid()
    if (!cid) return false
    return cid.module === 'Tasks'
  },

  processTask () {
    const self = this
    const cid = this.getCid()
    const yell = this.options && this.options.yell
    return Promise.all([import('@/io.ox/tasks/api'), import('@/io.ox/tasks/util')]).then(function ([{ default: api }, util]) {
      return api.get({ folder: cid.folder_id, id: cid.id }).then(function (task) {
        if (!self.$el) return
        const model = new Backbone.Model(task)
        self.$el.append(
          new InternalTaskView({
            model,
            module: 'tasks',
            api,
            util,
            settings: taskSettings,
            yell,
            mailModel: self.model
          }).render().$el
        )
      })
    })
  }
})

ext.point('io.ox/mail/detail/notifications').extend({
  index: 1000000000000,
  id: 'accept-decline',
  draw (baton) {
    const view = new ItipView(_.extend({ model: baton.model }, baton.options))
    this.append(view.render().$el)
  }
})
