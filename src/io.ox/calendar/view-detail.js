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
import extensions from '@/io.ox/calendar/common-extensions'
import * as util from '@/io.ox/calendar/util'
import calAPI from '@/io.ox/calendar/api'
import folderAPI from '@/io.ox/core/folder/api'
import attachments from '@/io.ox/core/tk/attachments'
import attachmentAPI from '@/io.ox/core/api/attachment'
import ParticipantsView from '@/io.ox/participants/chronos-detail'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import ChronosModel from '@/io.ox/calendar/model'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import _ from '@/underscore'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import DisposableView from '@/io.ox/backbone/views/disposable'
import ox from '@/ox'
import '@/io.ox/calendar/actions'
import '@/io.ox/calendar/style.scss'
import { createIcon } from '@/io.ox/core/components'
import { CategoryBadgesView } from '@/io.ox/core/categories/view'
import { getCategoriesFromModel } from '@/io.ox/core/categories/api'
import acceptDenyDialog from '@/io.ox/calendar/actions/acceptdeny'
import { settings as coreSettings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { hasFeature } from '@/io.ox/core/feature'

// draw via extension points

ext.point('io.ox/calendar/detail').extend({
  index: 100,
  id: 'inline-actions',
  draw (baton, options) {
    // if this is opened via invitation mail we don't show actions, event might not be created etc
    if (options.hideToolbar) return
    (baton.popup ? baton.popup.$toolbar.empty() : this).append(
      new ToolbarView({ point: 'io.ox/calendar/links/inline', inline: true })
        .setSelection(baton.array(), { data: baton.array(), model: baton.model })
        .$el.addClass('icons-only')
    )
  }
})

ext.point('io.ox/calendar/detail').extend({
  index: 120,
  id: 'cancel notification',
  draw (baton) {
    if (util.getStatusClass(baton.model) !== 'cancelled') return
    this.append($('<p class="alert alert-info cancel-warning" role="alert">').text(gt('This appointment was canceled.')))
  }
})

// draw private flag
ext.point('io.ox/calendar/detail').extend({
  index: 200,
  id: 'subject',
  draw (baton) {
    const { $row, $icon, $content } = util.getRow()
    extensions.privateFlag.call($icon, baton)
    extensions.h1.call($content, baton)
    this.append($row)
  }
})

ext.point('io.ox/calendar/detail').extend({
  index: 250,
  id: 'resource-management',
  draw (baton) {
    if (!hasFeature('managedResources')) return
    if (!baton.model.get('attendees') || !baton.model.get('attendees').length) return
    // check if the current user have resources that need confirmation and is allowed to manage them
    if (!baton.model.get('attendees').find(attendee => attendee.cuType === 'RESOURCE' && attendee.partStat === 'NEEDS-ACTION' && attendee?.resource?.own_privilege === 'delegate')) return
    const { $row, $content } = util.getRow()
    $content.append($(`<span class="alert alert-info m-0 inline-block resource-management-info" role="alert">${gt('Your approval for one or more resources is required.')}</span>`))
    this.append($row)
  }
})

ext.point('io.ox/calendar/detail').extend({
  index: 260,
  id: 'implicit-cancel',
  draw (baton) {
    if (!util.isImplicitlyCanceled(baton.model)) return false
    const { $row, $icon, $content } = util.getRow()
    const { icon, text } = util.getImplicitCancelElements()
    $icon.append(createIcon(icon).addClass('text-attention'))
    $content.text(text)
    this.append($row)
  }
})

// draw appointment date & time
ext.point('io.ox/calendar/detail').extend({
  index: 300,
  id: 'date-time',
  draw (baton, options) {
    const { $row, $icon, $content } = util.getRow()
    $icon.append(createIcon('bi/clock.svg'))
    ext.point('io.ox/calendar/detail/date').invoke('draw', $content, baton, _.extend({ zone: moment().tz() }, options))
    this.append($row)
  }
})

ext.point('io.ox/calendar/detail').extend({
  index: 200,
  id: 'categories',
  draw (baton, options) {
    if (coreSettings.get('features/categories', false)) {
      const collection = getCategoriesFromModel(baton.model.get('categories'), 'appointment' + baton.model.get('id'))
      if (collection.length === 0) return

      const { $row, $content } = util.getRow()
      $content.append(new CategoryBadgesView({ collection, searchable: true }).render().$el)
      this.append($row)
    }
  }
})

// draw icons
ext.point('io.ox/calendar/detail/icons').extend({
  index: 100,
  id: 'additional-flags',
  draw: extensions.additionalFlags
})

const RelativeTimeView = DisposableView.extend({
  className: 'relative-time label label-subtle text-sm inline-block mb-8',
  initialize ({ model }) {
    const start = model.get('startDate')
    this.start = moment.tz(start.value, start.tzid)
    const end = model.get('endDate')
    this.end = moment.tz(end.value, end.tzid).valueOf()
    // tick every 60 seconds
    setTimeout(() => {
      const interval = setInterval(() => this.tick(), 1000)
      this.on('dispose', () => clearInterval(interval))
    }, 1000 - moment().millisecond())
    // stop if already over -- next tick will remove the view
    if (this.isOver()) this.$el.hide()
  },
  isOver () {
    this.now = moment().valueOf()
    return this.end < this.now
  },
  tick () {
    if (this.disposed) return
    if (this.isOver()) this.remove(); else this.render()
  },
  render () {
    const diff = this.now - this.start.valueOf()
    // only visible if not too far in the future (12 hours) and not yet ended
    const visible = diff > -12 * 60 * 60_000
    if (visible) {
      this.$el
        .toggleClass('subtle-green', diff < 0)
        .toggleClass('subtle-red', diff >= 0)
        .text(this.getDurationString(diff))
    } else {
      setTimeout(() => this.remove())
    }
    return this
  },
  getDurationString (diff = 0) {
    if (diff >= 0 && diff <= 60000) return gt('This appointment has just started')
    const duration = this.getDuration(diff)
    return diff < 0
      ? gt('This appointment starts in %s', duration)
      : gt('This appointment has started %s ago', duration)
  },
  getDuration (diff = 0) {
    let m = Math.abs(moment().diff(this.start, 'minutes'))
    if (Math.abs(diff) <= 90 * 60_000) {
      // add one minute for future events (rather expected when checking the clock)
      if (diff < 0) m++
      return gt.ngettext('one minute', '%d minutes', m, m)
    }
    // round hours to multiples of 0.5, e.g. 1, 1.5, 2, ...
    const h = Math.round(m / 30) / 2
    return gt.ngettext('one hour', '%d hours', h, h)
  }
})

// draw date and recurrence information
ext.point('io.ox/calendar/detail/date').extend(
  {
    index: 100,
    id: 'relative-time',
    draw (baton) {
      this.append(new RelativeTimeView({ model: baton.model }).render().$el)
    }
  },
  {
    index: 200,
    id: 'date',
    draw: extensions.date
  },
  {
    index: 300,
    id: 'recurrence',
    draw (baton) {
      const draw = _.bind(function (recurrenceRoot) {
        if (recurrenceRoot) baton.recurrenceRoot = recurrenceRoot
        extensions.recurrence.call(this, baton)
      }, this)

      // get recurrenceRoot for exceptions too if the exception was not moved (just a simple check if the start date is still the same), to show some additional info like recurrence rules etc.
      if (util.hasFlag(baton.model, 'overridden') && moment(_((baton.model.get('recurrenceId') || '').split(':')).last()).valueOf() === util.getMoment(baton.model.get('startDate')).valueOf()) {
        calAPI.get({ id: baton.model.get('seriesId'), folder: baton.model.get('folder') }).then(draw, function () { draw() })
        return
      }

      draw()
    }
  }
)

ext.point('io.ox/calendar/detail').extend({
  index: 400,
  id: 'location',
  draw (baton) {
    if (!baton.data.location) return
    const { $row, $icon, $content } = util.getRow()
    $icon.append(createIcon('bi/geo-alt.svg'))
    extensions.locationDetail.call($content, baton)
    this.append($row)
  }
})

ext.point('io.ox/calendar/detail').extend({
  index: 450,
  id: 'recurrence-warning',
  draw (baton) {
    // not an exception? return
    if (!(baton.data.recurrenceId && baton.data.id !== baton.data.seriesId)) return

    // additional information provided and info should be shown? Note: We don't want to show this all the time. it's just too annoying
    if (baton.updateData && baton.updateData.showRecurrenceInfo) {
      this.append($('<p class="alert alert-info recurrence-warning" role="alert">').text(gt('This appointment is an exception. Changing the exception does not affect the series.')))
    }
  }
})

ext.point('io.ox/calendar/detail').extend({
  index: 500,
  id: 'status',
  draw (baton) {
    const folder = folderAPI.pool.models[baton?.data?.folder]

    // entity is usually the current user but it can also be the owner of a shared folder or a managed resource
    let entity = ox.user_id
    let cuType = 'INDIVIDUAL'

    if (folder?.is('resourceCalendar')) {
      entity = folder.get('resourceId')
      cuType = 'RESOURCE'
    } else if (folder?.is('shared')) {
      entity = folder.get('created_by')
    }

    let ownPartStat = _(baton.data?.attendees).findWhere({ cuType, entity })?.partStat
    // shared calendar without write access or resource Calendar without delegate permissions. We are not allowed to change anything
    if ((folder?.is('shared') && !folder?.can('write')) ||
        (folder?.is('resourceCalendar') && (!hasFeature('managedResources') || util.getResourcePermission(baton.data, entity) !== 'delegate'))) ownPartStat = ''

    let $group = $('<div>')
      .append(
        $('<div class="btn-group btn-group-accent me-8" role="group">')
          .attr('aria-label', gt('Change participation'))
          .append(
            button('participate/yes', ownPartStat === 'ACCEPTED')
              .text(gt.pgettext('appointment participation status', 'Accept')),
            button('participate/maybe', ownPartStat === 'TENTATIVE')
              .text(gt.pgettext('appointment participation status', 'Maybe')),
            button('participate/no', ownPartStat === 'DECLINED')
              .text(gt.pgettext('appointment participation status', 'Decline'))
          ),
        button('changestatus', false, 'btn-link')
          .attr('aria-label', gt('Add comment'))
          .append(createIcon('bi/three-dots.svg').addClass('bi-16'))
      )
      .on('click', 'button', { baton }, e => {
        const action = $(e.currentTarget).data('action')
        actionsUtil.invoke(`io.ox/calendar/detail/actions/${action}`, e.data.baton)
      })
    // add to $footer or after location
    if (baton.popup) {
      baton.popup.$footer.empty().append(
        $group.css('margin-left', '54px')
      )
    } else {
      const { $row, $content } = util.getRow()
      $row.addClass('no-mobile-print')
      $content.append($group)
      this.append($row)
    }
    // we just need to check one action; it's the same result
    actionsUtil.checkAction('io.ox/calendar/detail/actions/changestatus', baton).then(() => {
      $group.find('button:not(.active)').removeClass('disabled').prop('disabled', false)
      $group = null
    })
    function button (action, active = false, btn = 'btn-default') {
      return $(`<button type="button" class="btn ${btn} disabled" data-action="${action}">`)
        .toggleClass('active', active)
        .prop('disabled', true)
    }
  }
})

ext.point('io.ox/calendar/detail').extend({
  index: 600,
  id: 'note',
  draw (baton) {
    if (!baton.data.description) return
    const { $row, $icon, $content } = util.getRow()
    $icon.append(createIcon('bi/justify-left.svg'))
    extensions.note.call($content, baton)
    this.append($row)
  }
})

function addResourceManagement (node, baton) {
  if (!hasFeature('managedResources')) return
  function manageResourceConfirmation (resourceData) {
    acceptDenyDialog(baton.data, { attendee: _(baton.model.get('attendees')).findWhere({ cuType: 'RESOURCE', entity: resourceData.id }) })
  }

  // add change confirmation button to all valid resources
  node.find('[data-detail-popup="resource"]').each(function (index, node) {
    const resourceData = $(node).data()
    if (resourceData.own_privilege !== 'delegate') return
    $(node).parent().append(
      $(`<button type="button" class="btn btn-link resource-confirm-button">${gt('Change confirmation')}</button>`)
        // #. %1$s is resource name
        // #, c-format
        .attr('aria-label', gt('Change confirmation for resource %1$s', resourceData.display_name))
        .on('click', () => manageResourceConfirmation(resourceData))
    )
  })
}

ext.point('io.ox/calendar/detail').extend({
  index: 700,
  id: 'participants',
  draw (baton) {
    // appointments might neither have an organizer nor any attendees
    if (!baton?.model.get('organizer') && !baton?.model.get('attendees')) return

    const { $row, $icon, $content } = util.getRow()
    $icon.append(createIcon('bi/people.svg'))
    $content.addClass('participants-view').append(new ParticipantsView(baton, { summary: true }).draw())
    // empty? Don't append $row
    if (!$content.find('.participant').length) return
    addResourceManagement($content, baton)
    this.append($row)

    this.find('.truncated').last().closest('.detail-row').after($('<div class="detail-row show-more">').append(
      $('<div class="detail-row-icon">'),
      $('<button type="button" class="btn btn-default" data-action="show-more">')
        .text(gt('Show all') + ' ...')
        .on('click', { $content, baton }, e => {
          e.data.$content.empty().append(new ParticipantsView(baton).draw(Infinity))
          this.find('.show-more').remove()
          addResourceManagement(e.data.$content, baton)
        })))
  }
})

ext.point('io.ox/calendar/detail').extend({
  index: 800,
  id: 'details',
  draw (baton, options) {
    const { $row, $icon, $content } = util.getRow()
    $row.addClass('no-mobile-print')
    $icon.append(createIcon('bi/eye.svg'))
    const result = extensions.detail.call($content, baton, options)
    if (result !== false) this.append($row)
  }
})

ext.point('io.ox/calendar/detail/details').extend({
  index: 150,
  id: 'sentby',
  draw: extensions.sentBy
})

// folder
ext.point('io.ox/calendar/detail/details').extend({
  index: 300,
  id: 'folder',
  draw: extensions.folder
})

// used to show deep link when outside calendar app (search, portal)
ext.point('io.ox/calendar/detail/details').extend({
  index: 350,
  id: 'deeplink',
  draw (baton, options) {
    // stolen from io.ox/mail/detail/links: processDeepLinks
    if (!options || !options.deeplink) return
    const url = util.getDeepLink(baton.data)
    this.append(
      $('<tr>').append(
        $('<th class="detail-label">').text(gt('Direct link')),
        $('<td class="detail">').attr('style', 'font-size: 12px;').append(
          $('<a target="_blank" role="button" class="deep-link btn btn-primary btn-xs">')
            .attr('href', url).text(gt('Appointment'))
            .on('click', { baton }, openDeeplink)
        )
      )
    )
  }
})

function openDeeplink (e) {
  e.preventDefault()
  const baton = e.data.baton
  baton.popup.close()
  util.openDeeplink(baton.model.cid)
}

// created on/by
ext.point('io.ox/calendar/detail/details').extend({
  index: 400,
  id: 'created',
  draw: extensions.created
})

// modified on/by
ext.point('io.ox/calendar/detail/details').extend({
  index: 500,
  id: 'modified',
  draw: extensions.modified
})

ext.point('io.ox/calendar/detail').extend({
  id: 'attachments',
  index: 550,
  draw (baton) {
    const { $row, $icon, $content } = util.getRow()
    $icon.append(createIcon('bi/paperclip.svg').addClass('mt-8 t-0'))

    const hasKey = calAPI.getAttachmentsHashKey(baton.data)
    const hasPendingAttachments = !!attachmentAPI.isPending(hasKey)
    if (hasPendingAttachments) {
      const progressview = new attachments.ProgressView({ cid: _.ecid(baton.data) })
      $content.append(
        $('<div class="attachments-container">').append(
          progressview.render().$el
        )
      )
    } else {
      const list = baton.data.attachments
      if (!list || !list.length) return
      ext.point('io.ox/calendar/detail/attachments').invoke('draw', $content, baton)
    }

    this.append($row)
  }
})

ext.point('io.ox/calendar/detail/attachments').extend(new attachments.AttachmentList({
  id: 'attachment-list',
  index: 200,
  module: 1,
  selector: '.window-container.io-ox-calendar-window'
}))

function redraw (e, baton) {
  $(this).replaceWith(e.data.view.draw(baton))
}

export default {

  draw (baton, options) {
    // make sure that you can enter a model directly
    if (baton instanceof Backbone.Model) baton = new ext.Baton({ model: baton })

    // make sure we have a baton
    baton = ext.Baton.ensure(baton)

    // if we only have one create the other
    if (baton.data && _.isEmpty(baton.model)) baton.model = new ChronosModel.Model(baton.data)
    if (baton.model && _.isEmpty(baton.data)) baton.data = baton.model.toJSON()

    options = _.extend({ minimaldata: !baton.data.folder }, options)
    if (_.device('smartphone') && !options.deeplink) {
      baton.disable('io.ox/calendar/detail', 'inline-actions')
    }
    try {
      const node = $.createViewContainer(baton, calAPI, calAPI.get, { cidGetter: calAPI.cid }).on('redraw', { view: this }, redraw)
      node.addClass(`calendar-detail view user-select-text ${util.getStatusClass(baton.data)}`).attr('data-cid', String(util.cid(baton.data)))
      ext.point('io.ox/calendar/detail').invoke('draw', node, baton, options)
      return node
    } catch (e) {
      console.error('io.ox/calendar/view-detail:draw()', e)
    }
  }
}
