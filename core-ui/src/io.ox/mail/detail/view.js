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
import DisposableView from '@/io.ox/backbone/views/disposable'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import extensions from '@/io.ox/mail/common-extensions'
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/mail/api'
import * as util from '@/io.ox/mail/util'
import Pool from '@/io.ox/core/api/collection-pool'
import content from '@/io.ox/mail/detail/content'
import a11y from '@/io.ox/core/a11y'
// avoid css insertion
import contentStyle from '@/io.ox/mail/detail/content.scss?inline'
import '@/io.ox/mail/detail/style.scss'
import '@/io.ox/mail/style.scss'
import '@/io.ox/mail/actions'
import { createIcon } from '@/io.ox/core/components'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

let INDEX = 0

ext.point('io.ox/mail/detail').extend({
  id: 'unread-class',
  index: INDEX += 100,
  draw: extensions.unreadClass
})

ext.point('io.ox/mail/detail').extend({
  id: 'flagged-class',
  index: INDEX += 100,
  draw: extensions.flaggedClass
})

ext.point('io.ox/mail/detail').extend({
  id: 'header',
  index: INDEX += 100,
  draw (baton) {
    const header = $('<header class="detail-view-header">')
    ext.point('io.ox/mail/detail/header').invoke('draw', header, baton)
    this.append(header)
  }
})

let INDEXHeader = 0

ext.point('io.ox/mail/detail/header').extend({
  id: 'threadcontrol',
  index: INDEXHeader += 100,
  draw (baton) {
    const data = baton.data
    const subject = util.getSubject(data)
    const title = util.hasFrom(data)
    // #. %1$s: Mail sender
    // #. %2$s: Mail subject
      ? gt('Email from %1$s: %2$s', util.getDisplayName(data.from[0]), subject)
      : subject
    this.append(
      $('<h2 class="toggle-mail-body">').append(
        $('<button type="button" class="toggle-mail-body-btn">')
          .attr('aria-expanded', baton.view.$el.hasClass('expanded'))
          .append(
            $('<span class="sr-only">').text(title)
          )
      )
    )
  }
})

ext.point('io.ox/mail/detail/header').extend({
  id: 'picture',
  index: INDEXHeader += 100,
  draw: extensions.senderPicture
})

ext.point('io.ox/mail/detail/header').extend({
  id: 'drag-support',
  index: INDEXHeader += 100,
  draw (baton) {
    this.find('.contact-picture').attr({
      'data-drag-data': _.cid(baton.data),
      'data-drag-message': util.getSubject(baton.data)
    })
  }
})

//
// Header
//
ext.point('io.ox/mail/detail/header').extend(
  {
    id: 'unread-toggle',
    index: INDEXHeader += 100,
    draw: extensions.unreadToggle
  },
  {
    id: 'paper-clip',
    index: INDEXHeader += 100,
    draw: extensions.paperClip
  },
  {
    id: 'rows',
    index: INDEXHeader += 100,
    draw (baton) {
      for (let i = 1, node; i <= 3; i++) {
        node = $('<div class="detail-view-row row-' + i + ' clearfix">')
        ext.point('io.ox/mail/detail/header/row' + i).invoke('draw', node, baton)
        this.append(node)
      }
    }
  }
)

//
// Row 1
//
ext.point('io.ox/mail/detail/header/row1').extend(
  {
    // from is last one in the list for proper ellipsis effect
    id: 'from',
    index: INDEXHeader += 100,
    draw: extensions.fromDetail
  },
  {
    id: 'priority',
    index: INDEXHeader += 100,
    draw: extensions.priority
  },
  {
    id: 'security',
    index: INDEXHeader += 100,
    draw: extensions.security
  },
  {
    id: 'date',
    index: INDEXHeader += 100,
    draw: extensions.fulldate
  }
)

//
// Row 2
//
ext.point('io.ox/mail/detail/header/row2').extend(
  {
    id: 'sender',
    index: 100,
    draw (baton) {
      ext.point('io.ox/mail/detail/header/sender').invoke('draw', this, baton)
    }
  }
)

ext.point('io.ox/mail/detail/header/sender').extend({
  id: 'default',
  index: 100,
  draw (baton) {
    const data = baton.data; const from = data.from || []
    const status = util.authenticity('via', data)

    if (status && baton.data.authenticity && baton.data.authenticity.domain_mismatch && baton.data.authenticity.from_domain) {
      this.append(
        $('<div class="sender">').append(
          $('<span class="io-ox-label">').append(
            // #. Works as a label for a sender address. Like "Sent via". If you have no good translation, use "Sender".
            $.txt(gt('Via')),
            $.txt('\u00A0\u00A0')
          ),
          $('<span class="address">').text(baton.data.authenticity.from_domain)
        )
      )
    }

    // add 'on behalf of'?
    let sender = data.sender || []

    // use sender header as fallback
    if (sender.length === 0) {
      if (!('headers' in data)) return
      if (!('Sender' in data.headers)) return

      sender = util.parseRecipients(data.headers.Sender)
    }

    // still no sender? -> return
    if (sender.length === 0) return

    // compare mail address of sender and from
    if (from[0] && from[0][1] === sender[0][1]) return

    // for deputies we display we switch order of from and header
    const isDeputy = !!util.getDeputy(data)

    this.append(
      $('<div class="sender">').append(
        $('<span class="io-ox-label">').append(
          // #. Works as a label for a sender address. Like "Sent via". If you have no good translation, use "Sender".
          $.txt(isDeputy ? gt('on behalf of') : gt('via')),
          $.txt('\u00A0\u00A0')
        ),
        isDeputy
          ? $('<span class="address">').text((from[0][0] || '') + ' <' + from[0][1] + '>')
          : $('<span class="address">').text((sender[0][0] || '') + ' <' + sender[0][1] + '>')
      )
    )
  }
})

//
// Row 3
//
ext.point('io.ox/mail/detail/header/row3').extend(
  {
    id: 'subject-recipients',
    index: 100,
    draw (baton) {
      const $el = $('<div class="subject-recipients">')
      ext.point('io.ox/mail/detail/header/subject-recipients').invoke('draw', $el, baton)
      this.addClass('flex').append($el)
    }
  },
  {
    id: 'actions',
    index: 200,
    draw (baton) {
      const $el = $('<div class="mail-header-actions">')
      ext.point('io.ox/mail/detail/header/actions').invoke('draw', $el, baton)
      this.append($el)
    }
  }
)

ext.point('io.ox/mail/detail/header/subject-recipients').extend(
  {
    id: 'subject',
    index: 100,
    draw (baton) {
      this.append(
        $('<div class="subject">').text(util.getSubject(baton.data, true))
      )
    }
  },
  {
    id: 'recipients',
    index: 200,
    draw: extensions.recipients
  }
)

ext.point('io.ox/mail/detail/header/actions').extend(
  {
    id: 'inline-links',
    index: 100,
    draw (baton) {
      // no need for a toolbar if the mail is collapsed
      // extension point is invoked again on expand anyway
      if (!baton.view.$el.hasClass('expanded') || baton.view.placeholder) return
      const toolbarView = new ToolbarView({ el: this[0], point: 'io.ox/mail/links/inline', inline: true })
      toolbarView.$el.attr('data-toolbar', 'io.ox/mail/links/inline')
      toolbarView.setSelection([_.cid(baton.data)], { data: baton.data, view: baton.view, threadView: baton.view.options.threadview })
    }
  }
)

ext.point('io.ox/mail/detail').extend({
  id: 'notifications',
  index: INDEX += 100,
  draw (baton) {
    const section = $('<section class="notifications">')
    ext.point('io.ox/mail/detail/notifications').invoke('draw', section, baton)
    this.append(section)
  }
})

ext.point('io.ox/mail/detail').extend({
  id: 'warnings',
  index: INDEX += 100,
  draw (baton) {
    const section = $('<section class="warnings">')
    ext.point('io.ox/mail/detail/warnings').invoke('draw', section, baton)
    this.append(section)
  }
})

ext.point('io.ox/mail/detail').extend({
  id: 'preview-text',
  index: INDEX += 100,
  draw (baton) {
    if (!baton.view.supportsTextPreview || !baton.data.text_preview) return
    // add dots if max length or it looks weird
    this.append($('<section class="text-preview">').text(baton.data.text_preview + (baton.data.text_preview.length >= 100 ? '...' : '')))
  }
})

ext.point('io.ox/mail/detail/warnings').extend({
  id: 'plaintextfallback',
  index: 100,
  draw: extensions.plainTextFallback
})

let INDEXNotifications = 0

ext.point('io.ox/mail/detail/notifications').extend({
  id: 'phishing',
  index: INDEXNotifications += 100,
  draw: extensions.phishing
})

ext.point('io.ox/mail/detail/notifications').extend({
  id: 'authenticity',
  index: INDEXNotifications += 100,
  draw: extensions.authenticity
})

ext.point('io.ox/mail/detail/notifications').extend({
  id: 'disposition-notification',
  index: INDEXNotifications += 100,
  draw: extensions.dispositionNotification
})

ext.point('io.ox/mail/detail/notifications').extend({
  id: 'external-images',
  index: INDEXNotifications += 100,
  draw: extensions.externalImages
})

ext.point('io.ox/mail/detail/notifications').extend({
  id: 'disabled-links',
  index: INDEXNotifications += 100,
  draw: extensions.disabledLinks
})

ext.point('io.ox/mail/detail').extend({
  id: 'error',
  index: INDEX += 100,
  draw () {
    this.append($('<section class="error">').hide())
  }
})

ext.point('io.ox/mail/detail').extend({
  id: 'body',
  index: INDEX += 100,
  draw () {
    this.append(
      $('<section class="attachments">'),
      // must have tabindex=-1, otherwise tabindex inside Shadow DOM doesn't work
      $('<section class="body user-select-text focusable" tabindex="-1">')
    )
  }
})

ext.point('io.ox/mail/detail/body').extend({
  id: 'iframe',
  index: 100,
  draw (baton) {
    const iframe = $('<iframe src="" class="mail-detail-frame">').attr('title', gt('Email content'))
    ext.point('io.ox/mail/detail/body/iframe').invoke('draw', iframe, baton)
    // set simple-mail class (useful for dark mode)
    this.idle().addClass(baton.isSimple ? 'simple-mail' : 'complex-mail').append(iframe)
  }
})

ext.point('io.ox/mail/detail/body').extend({
  id: 'content-flags',
  index: 200,
  draw (baton) {
    if (!baton.content) return
    const $content = $(baton.content)
    this.closest('article')
      .toggleClass('content-links', !!$content.find('a').length)
  }
})

ext.point('io.ox/mail/detail/body/iframe').extend({
  id: 'content',
  index: 100,
  draw (baton) {
    const contentData = content.get(baton.data, {}, baton.flow)
    const uuid = _.uniqueId('io-ox-theme')
    let $content = $(contentData.content)
    let resizing = 0
    const forwardEvent = function (e) {
      // forward events in iframe to parent window, set iframe as target, so closest selectors etc work as expected
      // (needed in detail popups for example)
      e.target = this[0]
      this.trigger(e)
    }.bind(this)

    baton.content = contentData.content
    baton.isSimple = contentData.isSimple

    // wrap plain text in body node, so we can treat plain text mails and html mails the same (replace vs append)
    if (contentData.isText) {
      $content = $('<body>').append($content)
    }

    // inject content and listen to resize event
    this.on('load', function () {
      // e.g. iOS is too fast, i.e. load is triggered before adding to the DOM
      _.defer(function () {
        // This should be replaced with language detection in the future (https://github.com/wooorm/franc)
        const html = $(this.contentDocument).find('html')
        if (!html.attr('lang')) html.attr('lang', $('html').attr('lang'))
        // inherit text flow
        if (!html.attr('dir')) html.attr('dir', $('html').attr('dir') || 'ltr')
        // inherit classes (macos, retina etc.)
        if (!html.attr('class') && $('html').attr('class')) html.attr('class', $('html').attr('class'))
        // trigger click or keydown on iframe node to forward events properly -> to close none smart dropdown menus correctly or jump to the list view on esc
        // forward mousemove so resize handler of list view works
        html.on('keydown mousemove click', forwardEvent)

        if (_.device('ios && smartphone')) html.addClass('ios smartphone')

        $(this.contentDocument).find('head').append(
          getThemeStyleTag()
        )
        $(this.contentDocument).find('body').replaceWith($content)

        $content.find('table').each(function () {
          if (this.getAttribute('height') === '100%' || (this.style || {}).height === '100%') {
            this.setAttribute('height', '')
            $(this).css('height', 'initial')
          }
        })

        $(this.contentWindow)
          .on('complete toggle-blockquote', { iframe: $(this) }, onImmediateResize)
          .on('resize', { iframe: $(this) }, onWindowResize)
          .on('dragover drop', false)
          .trigger('resize')
        // safety trigger. Some browsers have issues with css rules in iframes and are slow when applying them. make sure we have the right height
        _.delay(() => {
          resizing = 0
          $(this.contentWindow).trigger('resize')
        }, 100)
      }.bind(this))
    })

    function getThemeStyleTag () {
      // much easier to just copy the current state from the DOM
      let currentThemeCSS = $('#theme, #theme-accent, #theme-colors')
        .contents().map((i, el) => $(el).text()).toArray().join('\n')
      if (!baton.isSimple) currentThemeCSS = currentThemeCSS.replace(/color-scheme:.*\n/, '')
      return $(`<style id="${uuid}">${[contentStyle, currentThemeCSS].join('\n\n')}</style>`)
    }

    // simple helper to enable resizing on
    // browser resize events
    function onBrowserResize () {
      resizing = 0
    }

    // calc scrollbar width once
    const scrollbarWidth = (() => {
      const outer = document.createElement('div')
      const inner = document.createElement('div')
      outer.appendChild(inner)
      document.body.appendChild(outer)

      outer.style.visibility = 'hidden'
      outer.style.width = '100px'

      const widthNoScroll = outer.offsetWidth

      outer.style.overflow = 'scroll'
      inner.style.width = '100%'

      const widthWithScroll = inner.offsetWidth

      outer.parentNode.removeChild(outer)
      return widthNoScroll - widthWithScroll
    })()

    function onImmediateResize (e) {
      const body = this.document.body
      if (!body) return // prevent js errors on too early calls

      // scrollHeight considers paddings, border, and margins, but not scrollbars
      // if scrollbars are present (eg. content overflows), add scrollbarWidth
      const scrollbar = body.scrollWidth > body.clientWidth ? scrollbarWidth : 0

      // set height for iframe and its parent
      e.data.iframe.parent().addBack().height(body.scrollHeight + scrollbar)
    }

    function onWindowResize (e) {
      // avoid event-based recursion
      if (resizing <= 0) resizing = 2; else return
      // revert outer size to support shrinking
      e.data.iframe.height('')
      onImmediateResize.call(this, e)
      // we need to wait until allowing further resize events
      // setTimeout is bad because we don't know how long to wait exactly
      // requestAnimationFrame seems to be the proper tool
      // we will have two events so we use a countdown to track this
      this.requestAnimationFrame(function () { resizing-- })
    }

    const onThemeChange = () => {
      _.defer(() => $(this.get(0).contentDocument).find(`#${uuid}`).replaceWith(getThemeStyleTag()))
    }

    // track images since they can change dimensions
    $content.find('img').on('load error', function () {
      $(this).off().trigger('complete')
    })

    // react on browser resize
    //  unfortunately, this event will not fire on text-only zoom in firefox and no other event will be triggered either
    //  so text-zoom on mail view might hide some of the emails' content (until reload)
    $(window).on('resize', onBrowserResize)
    ox.on('themeChange', onThemeChange)

    // remove event handlers on dispose
    this.on('dispose', function () {
      $(window).off('resize', onBrowserResize)
      ox.off('themeChange', onThemeChange)
      $(this.contentWindow).off()
    })
  }
})

ext.point('io.ox/mail/detail/body/iframe').extend({
  id: 'events',
  index: 200,
  draw () {
    this.on('load', function () {
      // e.g. iOS is too fast, i.e. load is triggered before adding to the DOM
      _.defer(function () {
        const html = $(this.contentDocument).find('html')
        const targets = '.mailto-link, .deep-link-tasks, .deep-link-contacts, .deep-link-calendar, .deep-link-files, .deep-link-gdpr, .deep-link-app'
        // forward deep link clicks from iframe scope to document-wide handlers
        html.on('click', targets, function (e) {
          ox.trigger('click:deep-link-mail', e, this)
        })
      }.bind(this))
    })
  }
})

ext.point('io.ox/mail/detail/body/iframe').extend({
  id: 'max-size',
  index: 1200,
  after: 'content',
  draw (baton) {
    this.on('load', function () {
      // e.g. iOS is too fast, i.e. load is triggered before adding to the DOM
      _.defer(function () {
        const isTruncated = _(baton.data.attachments).some(function (attachment) { return attachment.truncated })
        if (!isTruncated) return

        const url = 'api/mail?' + $.param({
          action: 'get',
          view: 'document',
          forceImages: true,
          folder: baton.data.folder_id,
          id: baton.data.id,
          session: ox.session
        })

        $(this.contentDocument)
          .find('.mail-detail-content')
          .append(
            $('<div class="max-size-warning">').append(
              $.txt(gt('This message has been truncated due to size limitations.')), $.txt(' '),
              $('<a role="button" target="_blank">').attr('href', url).text(
                // external images shown?
                baton.model.get('modified') !== 1
                  ? gt('Show entire message')
                  : gt('Show entire message including all external images')
              )
            )
          )
        // adjust height again
        $(this.contentWindow).trigger('complete')
      }.bind(this))
    })
  }
})

ext.point('io.ox/mail/detail/attachments').extend({
  id: 'attachment-list',
  index: 200,
  draw (baton) {
    if (baton.attachments.length === 0) return
    extensions.attachmentList.call(this, baton)
  }
})

const pool = Pool.create('mail')

const View = DisposableView.extend({

  className: 'list-item mail-item mail-detail f6-target focusable',

  events: {
    keydown: 'onToggle',
    'click .detail-view-header': 'onToggle',
    'click .text-preview': 'onToggle',
    'click .toggle-mail-body-btn': 'onToggle',
    'click a[data-action="retry"]': 'onRetry'
  },

  onChangeFlags () {
    // update unread state
    this.$el.toggleClass('unread', util.isUnseen(this.model.get('flags')))
    this.$el.toggleClass('flagged', util.isFlagged(this.model.get('flags')))
  },

  onChangeAttachments () {
    if (this.model.changed.attachments && _.isEqual(this.model.previous('attachments'), this.model.get('attachments'))) return

    const data = this.model.toJSON()
    const baton = ext.Baton({
      view: this,
      model: this.model,
      data,
      attachments: util.getAttachments(data)
    })
    const node = this.$el.find('section.attachments').empty()
    ext.point('io.ox/mail/detail/attachments').invoke('draw', node, baton)
    // global event for tracking purposes
    ox.trigger('mail:detail:attachments:render', this)

    if (this.model.previous('attachments') &&
                this.model.get('attachments') &&
                this.model.previous('attachments')[0].content !== this.model.get('attachments')[0].content) this.onChangeContent()
  },

  getEmptyBodyNode () {
    return this.$el.find('section.body').empty()
  },

  onChangeContent () {
    const data = this.model.toJSON()
    const baton = ext.Baton({
      view: this,
      model: this.model,
      data,
      attachments: util.getAttachments(data)
    })
    let body = this.$el.find('section.body')
    let node = this.getEmptyBodyNode()
    let view = this
    baton.disable(this.options.disable)
    // set outer height & clear content
    body.css('min-height', this.model.get('visualHeight') || null)
    // draw
    _.delay(function () {
      if (view.disposed) return
      ext.point('io.ox/mail/detail/body').invoke('draw', node, baton)
      // global event for tracking purposes
      ox.trigger('mail:detail:body:render', view)
      view.trigger('mail:detail:body:render', view)
      body = node = view = null
    }, 20)
  },

  onChangeRecipients: _.debounce(function () {
    if (this.disposed) return

    const data = this.model.toJSON()
    const baton = ext.Baton({ data, model: this.model, view: this })
    const node = this.$('.recipients').empty()
    ext.point('io.ox/mail/detail/header/recipients').invoke('draw', node, baton)
  }, 10),

  onToggle (e) {
    if (e.type === 'keydown' && e.which !== 13 && e.which !== 32) return

    // ignore click on/inside <a> tags
    // this is required even if a-tags are tabbable elements since some links are removed from dom on click
    if ($(e.target).closest('a').length) return

    if (!$(e.currentTarget).hasClass('toggle-mail-body-btn')) {
      // ignore clicks on tabbable elements
      const tabbable = a11y.getTabbable(this.$el)
      if (tabbable.index(e.target) >= 0) return
      if (tabbable.find($(e.target)).length) return
    }

    // ignore click on dropdown menus
    if ($(e.target).hasClass('dropdown-menu')) return

    // ignore clicks on overlays
    if ($(e.target).hasClass('overlay')) return

    // don't toggle single messages unless it's collapsed
    if (this.$el.siblings().length === 0 && this.$el.hasClass('expanded')) return

    // fix collapsed blockquotes
    this.$el.find('.collapsed-blockquote').hide()
    this.$el.find('.blockquote-toggle').show()

    this.toggle()
  },

  onRetry (e) {
    e.preventDefault()
    this.$('section.error').hide()
    this.$('section.body').show()
    this.toggle(true)
  },

  onUnseen () {
    // don't do anything if markAsRead is set to 'never'
    if (settings.get('markAsRead') === 'never') return
    const data = this.model.toJSON()
    if (util.isToplevel(data)) api.markRead(data)
  },

  onLoad (data) {
    // since this function is a callback we have to check this.model
    // as an indicator whether this view has been destroyed meanwhile
    if (this.model === null) return

    // merge data (API updates the model in most cases, but we need this for nested mails)
    if (data) this.model.set(data)

    // done
    this.$el.find('section.body').removeClass('loading')
    this.trigger('load:done')
    // draw
    // nested mails do not have a subject before loading, so trigger change as well
    if (!this.$el.find('.detail-view-row.row-5').hasClass('inline-toolbar-container')) {
      this.$el.empty()
      this.render()
    }
    this.onChangeAttachments()
    this.onChangeContent()
    this.processUnseen()
  },

  // respond to unseen flag
  processUnseen () {
    const unseen = this.model.get('unseen') || util.isUnseen(this.model.get('flags'))
    if (!unseen) {
      // if this mail was read elsewhere notify other apps about it, for example the notification area (also manages new mail window title)
      return api.trigger('update:set-seen', [{ id: this.model.get('id'), folder_id: this.model.get('folder_id') }])
    }
    const option = settings.get('markAsRead')
    // nothing to do if option is 'never' (required manual user interaction)
    if (option === 'never') return
    if (option === 'instant') return this.onUnseen()
    // with delay: 5 or 20 seconds
    const delay = option === 'fast' ? 5_000 : 20_000
    setTimeout(() => {
      if (this.disposed) return
      // still explanded? (relevant in thread view)
      if (!this.$el.hasClass('expanded')) return
      this.onUnseen()
    }, delay)
  },

  onLoadFail (e) {
    if (!this.$el) return
    this.trigger('load:fail')
    this.trigger('load:done')
    this.$el.attr('data-loaded', false)
    this.$('section.error').empty().show().append(
      createIcon('bi/exclamation-diamond.svg'),
      $('<h4>').text(gt('Error: Failed to load message content')),
      $('<p>').text(e.error),
      $('<a href="#" role="button" data-action="retry">').text(gt('Retry'))
    )
    // for counting user facing error
    ox.trigger('yell:error', e)
  },

  toggle (state) {
    this.placeholder = false
    const $li = this.$el
    const $button = $li.find('.toggle-mail-body-btn')

    $li.toggleClass('expanded', state)
    const isExpanded = $li.hasClass('expanded')

    $button.attr('aria-expanded', isExpanded)

    // trigger DOM event that bubbles
    this.$el.trigger('toggle')
    if ($li.attr('data-loaded') === 'false' && isExpanded) {
      $li.attr('data-loaded', true)
      $li.find('section.body').addClass('loading')
      this.trigger('load')
      // load detailed email data
      if (this.loaded) {
        this.onLoad()
      } else {
        const cid = _.cid(this.model.cid)
        // check if we have a nested email here, those are requested differently
        if (_(cid).size() === 1 && cid.id !== undefined && this.model.has('parent')) {
          api.getNestedMail(this.model.attributes).pipe(
            this.onLoad.bind(this),
            this.onLoadFail.bind(this)
          )
        } else {
          api.get(_.extend({}, cid)).pipe(
            this.onLoad.bind(this),
            this.onLoadFail.bind(this)
          )
        }
      }
    } else if (isExpanded) {
      // trigger resize to restart resize loop
      this.$el.find('.mail-detail-frame').contents().find('.mail-detail-content').trigger('resize')
      this.processUnseen()
    }

    return this
  },

  expand () {
    return this.toggle(true)
  },

  initialize (options) {
    this.options = options || {}
    this.model = pool.getDetailModel(options.data)
    this.loaded = options.loaded || false
    this.listenTo(this.model, 'change:flags', this.onChangeFlags)
    this.listenTo(this.model, 'change:attachments', this.onChangeAttachments)
    this.listenTo(this.model, 'change:to change:cc change:bcc', this.onChangeRecipients)
    this.placeholder = true
    this.supportsTextPreview = options.supportsTextPreview

    this.on({
      load () {
        this.$('section.body').busy({ immediate: true }).empty()
      },
      'load:done' () {
        this.$('section.body').idle()
      },
      'load:fail' () {
        this.$('section.body').hide()
      }
    })
  },

  redraw () {
    this.$el.empty()
    this.render()
    if (this.$el.hasClass('expanded')) {
      this.onChangeAttachments()
      this.onChangeContent()
    }
  },

  render () {
    const data = this.model.toJSON()
    const baton = ext.Baton({ data, model: this.model, view: this })

    // disable extensions?
    baton.disable(this.options.disable)

    this.$el.attr({
      'data-cid': this.model.cid,
      'data-loaded': 'false'
    })

    this.$el.data({ view: this, model: this.model })

    if (!this.placeholder) {
      // remove scaffolding if it's there(we don't want duplicates or mixups in the extension point order)
      this.$el.children('section.body,section.attachments').remove()
      ext.point('io.ox/mail/detail').invoke('draw', this.$el, baton)
    } else {
      // add some scaffolding
      // this is needed to show the busy spinner properly
      ext.point('io.ox/mail/detail').get('body').invoke('draw', this.$el, baton)
    }

    this.$el.toggleClass('placeholder', this.placeholder)

    // global event for tracking purposes
    ox.trigger('mail:detail:render', this)

    return this
  }
})

export default {
  View
}
