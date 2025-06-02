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
import ox from '@/ox'
import DetailView from '@/io.ox/mail/detail/view'
import extensions from '@/io.ox/mail/common-extensions'
import ext from '@/io.ox/core/extensions'
import * as util from '@/io.ox/mail/util'
import '@/io.ox/mail/style.scss'
import flagPicker from '@/io.ox/core/tk/flag-picker'

import gt from 'gettext'
import { settings } from '@/io.ox/mail/settings'
import { createButton } from '@/io.ox/core/components'

let INDEX = 0

ext.point('io.ox/mail/mobile/detail').extend({
  id: 'unread-class',
  index: INDEX += 100,
  draw: extensions.unreadClass
})

ext.point('io.ox/mail/mobile/detail').extend({
  id: 'flagged-class',
  index: INDEX += 100,
  draw: extensions.flaggedClass
})

ext.point('io.ox/mail/mobile/detail').extend({
  id: 'header',
  index: INDEX += 100,
  draw (baton) {
    const header = $('<header class="mobile-detail-view-mail detail-view-header">')
    ext.point('io.ox/mail/mobile/detail/header').invoke('draw', header, baton)
    this.append(header)
  }
})

let INDEXHeader = 0

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'drag-support',
  index: INDEXHeader += 100,
  draw (baton) {
    this.attr({
      'data-drag-data': _.cid(baton.data),
      'data-drag-message': util.getSubject(baton.data)
    })
  }
})

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'actions',
  index: INDEXHeader += 100,
  draw: extensions.actions
})

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'from',
  index: INDEXHeader += 100,
  draw: extensions.fromDetail
})

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'priority',
  index: INDEXHeader += 100,
  draw: extensions.priority
})

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'paper-clip',
  index: INDEXHeader += 100,
  draw: extensions.paperClip
})

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'recipients',
  index: INDEXHeader += 100,
  draw: extensions.recipients
})

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'unread-indicator',
  index: INDEXHeader += 100,
  draw: extensions.unreadIndicator
})

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'subject',
  index: INDEXHeader += 100,
  draw (baton) {
    const subject = util.getSubject(baton.data, true)
    this.append(
      $('<h1 class="subject">').text(subject)
    )
  }
})

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'date',
  index: INDEXHeader += 100,
  draw: extensions.fulldate
})

ext.point('io.ox/mail/mobile/detail/header').extend({
  id: 'flags',
  index: INDEXHeader += 100,
  draw (baton) {
    const node = $('<span class="flags">').appendTo(this)
    ext.point('io.ox/mail/mobile/detail/header/flags').invoke('draw', node, baton)
  }
})

ext.point('io.ox/mail/mobile/detail/header/flags').extend({
  id: 'security',
  index: INDEXHeader += 100,
  draw: extensions.security
})

ext.point('io.ox/mail/mobile/detail/header/flags').extend({
  id: 'flag-toggle',
  index: INDEXHeader += 100,
  draw: extensions.flagToggle
})

ext.point('io.ox/mail/mobile/detail/header/flags').extend({
  id: 'color-picker',
  index: INDEXHeader += 100,
  draw (baton) {
    if (!settings.flagByColor) return
    const node = createButton({ type: 'button', variant: 'toolbar' }).attr({ 'aria-label': gt('Set color') })
    this.append(node)
    flagPicker.attach(node, { data: baton.data, view: baton.view })
  }
})

ext.point('io.ox/mail/mobile/detail').extend({
  id: 'notifications',
  index: INDEX += 100,
  draw (baton) {
    const section = $('<section class="notifications">')
    ext.point('io.ox/mail/detail/notifications').invoke('draw', section, baton)
    this.append(section)
  }
})

ext.point('io.ox/mail/mobile/detail').extend({
  id: 'body',
  index: INDEX += 100,
  draw () {
    this.append(
      $('<section class="attachments">'),
      $('<section class="body user-select-text">')
    )
  }
})

ext.point('io.ox/mail/mobile/detail/attachments').extend({
  id: 'attachment-list',
  index: 100,
  draw (baton) {
    if (baton.attachments.length === 0) return
    extensions.attachmentList.call(this, baton)
  }
})

ext.point('io.ox/mail/mobile/detail/attachments').extend({
  id: 'attachment-preview',
  index: 200,
  draw: extensions.attachmentPreview
})

ext.point('io.ox/mail/mobile/detail/body').extend({
  id: 'iframe+content',
  index: 100,
  draw (baton) {
    const self = this
    ext.point('io.ox/mail/detail/body').get('iframe', function (extension) {
      extension.invoke('draw', self, baton)
    })
    ext.point('io.ox/mail/detail/body').get('content', function (extension) {
      extension.invoke('draw', self, baton)
    })
  }
})

ext.point('io.ox/mail/mobile/detail/body').extend({
  id: 'max-size',
  after: 'content',
  draw (baton) {
    const isTruncated = _(baton.data.attachments).some(function (attachment) { return attachment.truncated })
    if (!isTruncated) return

    const url = 'api/mail?' + $.param({
      action: 'get',
      view: 'document',
      folder: baton.data.folder_id,
      id: baton.data.id,
      session: ox.session
    })

    this.append(
      $('<div class="max-size-warning">').append(
        $.txt(gt('This message has been truncated due to size limitations.')), $.txt(' '),
        $('<a role="button" target="_blank">').attr('href', url).text(gt('Show entire message'))
      )
    )
  }
})

/*
     * Used for header information in threads on mobile (threadView page)
     * Uses all extension points from desktop view
     */
const MobileHeaderView = DetailView.View.extend({
  events: {
    'click .detail-view-header': 'onClick'
  },
  onClick (e) {
    // trigger bubbling event
    if ($(e.target).hasClass('show-all-recipients')) return
    this.$el.trigger('showmail')
  },
  toggle () {
    // overwrite default toggle of super view
    return this
  }

})

/*
     * DetailView for mobile use
     * uses extension point defined in this file
     */
const MobileDetailView = DetailView.View.extend({

  onChangeAttachments () {
    const data = this.model.toJSON()
    const baton = ext.Baton({ data, attachments: util.getAttachments(data), view: this })
    const node = this.$el.find('section.attachments').empty()

    ext.point('io.ox/mail/mobile/detail/attachments').invoke('draw', node, baton)

    if (this.model.previous('attachments') &&
                this.model.get('attachments') &&
                this.model.previous('attachments')[0].content !== this.model.get('attachments')[0].content) this.onChangeContent()
  },

  onChangeContent () {
    const data = this.model.toJSON()
    const baton = ext.Baton({
      view: this,
      model: this.model,
      data,
      attachments: util.getAttachments(data)
    })
    const node = this.getEmptyBodyNode()
    baton.disable(this.options.disable)
    // draw mail body
    ext.point('io.ox/mail/mobile/detail/body').invoke('draw', node, baton)
  },

  render () {
    const data = this.model.toJSON()
    const baton = ext.Baton({ data, model: this.model, view: this })
    const subject = util.getSubject(data)
    const title = util.hasFrom(data)
    // #. %1$s: Mail sender
    // #. %2$s: Mail subject
      ? gt('Email from %1$s: %2$s', util.getDisplayName(data.from[0]), subject)
      : subject

    // disable extensions?
    _(this.options.disable).each(function (extension, point) {
      if (_.isArray(extension)) {
        _(extension).each(function (ext) {
          baton.disable(point, ext)
        })
      } else {
        baton.disable(point, extension)
      }
    })

    this.$el.attr({
      'aria-label': title,
      'data-cid': this.cid,
      'data-loaded': 'false'
    })
    this.$el.data({ view: this, model: this.model })
    this.baton = baton
    ext.point('io.ox/mail/mobile/detail').invoke('draw', this.$el, baton)

    $('[data-page-id="io.ox/mail/detailView"]').trigger('header_ready')
    return this
  }
})

export default {
  HeaderView: MobileHeaderView,
  DetailView: MobileDetailView
}
