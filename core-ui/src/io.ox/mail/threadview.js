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
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/mail/api'
import * as util from '@/io.ox/mail/util'
import backbone from '@/io.ox/core/api/backbone'
import detail from '@/io.ox/mail/detail/view'
import detailViewMobile from '@/io.ox/mail/detail/mobileView'
import dnd from '@/io.ox/core/tk/list-dnd'
import http from '@/io.ox/core/http'
import '@/io.ox/mail/style.scss'
import '@/io.ox/mail/listview'
import { createIcon } from '@/io.ox/core/components'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

ext.point('io.ox/mail/thread-view').extend({
  id: 'navigation',
  index: 100,
  draw () {
    this.$el.append(
      $('<nav class="back-navigation generic-toolbar">').append(
        $('<div class="button">').append(
          $('<a href="#" role="button" class="back">')
            .attr('aria-label', gt('Back to list'))
            .append(createIcon('bi/chevron-left.svg'), $.txt(' '), $.txt(gt('Back')))
        ),
        $('<div class="position">'),
        $('<div class="prev-next">').append(
          // prev
          $('<button type="button" class="btn btn-link previous-mail">')
            .attr('aria-label', gt('Previous message'))
            .append(createIcon('bi/chevron-up.svg').addClass('bi-16')),
          // next
          $('<button type="button" class="btn btn-link next-mail">')
            .attr('aria-label', gt('Next message'))
            .append(createIcon('bi/chevron-down.svg').addClass('bi-16'))
        )
      ).attr('role', 'navigation')
    )
  }
})

ext.point('io.ox/mail/thread-view').extend({
  id: 'thread-view-list',
  index: 200,
  draw () {
    this.$el.append(
      $('<div class="thread-view-list scrollable abs" role="region">').attr('aria-label', gt('Conversation')).hide().append(
        // $('<div class="thread-view-header">'),
        this.$messages = $('<div class="thread-view list-view">')
      ).on('scroll', this.onScrollEnd.bind(this))
    )
  }
})

ext.point('io.ox/mail/thread-view/header').extend({
  id: 'toggle-all',
  index: 100,
  draw (baton) {
    if (baton.view.collection.length <= 1) return
    this.append(
      $('<a href="#" role="button" class="toggle-all">')
        .append(createIcon('bi/chevron-double-down.svg').addClass('bi-12'))
        .attr('aria-label', gt('Open all messages'))
        .tooltip({
          animation: false,
          container: 'body',
          placement: 'left',
          title: gt('Open/close all messages')
        })
    )
  }
})

// ext.point('io.ox/mail/thread-view/header').extend({
//   id: 'subject',
//   index: 200,
//   draw (baton) {
//     const keepPrefix = baton.view.collection.length === 1
//     const data = baton.view.model.toJSON()
//     const subject = baton.view.threaded ? api.threads.subject(data) || data.subject : data.subject

//     this.append(
//       $('<h1 class="subject">').text(util.getSubject(subject, keepPrefix))
//     )
//   }
// })

const ThreadView = Backbone.View.extend({

  className: 'thread-view-control',

  events: {
    'click .button a.back': 'onBack',
    'click .back-navigation .previous-mail': 'onPrevious',
    'click .back-navigation .next-mail': 'onNext',
    'click .toggle-all': 'onToggleAll',
    keydown: 'onKeydown'
  },

  empty () {
    this.$messages.empty()
    this.$el.scrollTop(0)
    this.$el.find('.thread-view-list').scrollTop(0).hide()
    this.model = null
  },

  updatePosition (position) {
    this.$el.find('.position').text(position)
    return this
  },

  togglePrevious (state) {
    this.$el.find('.previous-mail').toggleClass('disabled', !state)
    return this
  },

  toggleNext (state) {
    this.$el.find('.next-mail').toggleClass('disabled', !state)
    return this
  },

  toggleNavigation (state) {
    this.$el.toggleClass('back-navigation-visible', state)
    return this
  },

  onToggle: _.debounce(function (e) {
    const items = this.getItems()
    const open = items.filter('.expanded')
    const state = open.length === 0
    const icon = state ? 'bi/chevron-double-down.svg' : 'bi/chevron-double-up.svg'
    const toggleButton = this.$el.find('.toggle-all')
    toggleButton.attr('aria-label', state ? gt('Open all messages') : gt('Close all messages'))
    toggleButton.find('.bi').replaceWith(createIcon(icon))
    // only check if we need to replace placeholders when mail is collapsed
    if (!e || !$(e.target).hasClass('expanded')) this.onScrollEnd()
  }, 10),

  onToggleAll (e) {
    e.preventDefault()
    const items = this.getItems()
    const open = items.filter('.expanded')
    // only open all if all are closed
    const state = open.length === 0
    // pause http layer to combine GET requests
    http.pause()
    this.collection.each(function (model) {
      this.toggleMail(model.cid, state)
    }, this)
    http.resume()
  },

  toggleMail (cid, state) {
    const $li = this.$messages.children(`[data-cid="${CSS.escape(cid)}"]`)
    const view = $li.data('view')
    if (view) view.toggle(state)
  },

  showMail (cid) {
    this.toggleMail(cid, true)
  },
  // idOnly returns the cid of the next mail to auto-select, without actually opening it
  autoSelectMail (idOnly) {
    // automatic selection of first seen mail on mail app start
    if (this.autoSelect) {
      for (let i = 0; i < this.collection.length; i++) {
        const mail = this.collection.at(i)

        // last or first seen?
        if (i === this.collection.length - 1 || !util.isUnseen(mail.toJSON())) {
          if (idOnly) return mail.cid
          this.showMail(mail.cid)
          break
        }
      }
      delete this.autoSelect
    } else {
      for (let i = this.collection.length - 1; i >= 0; i--) {
        const mail = this.collection.at(i)

        // most recent or first unseen?
        if (i === 0 || util.isUnseen(mail.toJSON())) {
          if (idOnly) return mail.cid
          this.showMail(mail.cid)
          break
        }
      }
    }
  },

  onScrollEnd: _.debounce(function () {
    const listNode = this.$el.find('.thread-view-list')
    this.getItems().each(function () {
      if (!$(this).hasClass('placeholder')) return
      if ((this.offsetTop + $(this).height()) > listNode.scrollTop() && this.offsetTop < (listNode.scrollTop() + listNode.height())) {
        const view = $(this).data('view')
        // don't redraw views that are already loading. This removes the busy spinner
        if (view && !view.$el.find('section.body').hasClass('loading')) {
          view.placeholder = false
          view.render()
        }
      }
    })
  }, 100),

  externalImagesAllowed () {
    const [sender] = this.model.get('from')
    if (!Array.isArray(sender)) return false
    return util.asList(settings.get('features/trusted/user')).includes(sender[1])
  },

  show (cid, threaded) {
    // strip 'thread.' prefix
    cid = String(cid).replace(/^thread\./, '')
    // no change?
    if (this.model && this.model.cid === cid) return
    // get new model
    const pool = api.pool.get('detail'); const model = pool.get(cid)
    if (!model) {
      this.empty()
      console.error('ThreadView.show(): Mail not found in pool', cid, pool)
      return
    }
    // stop listening
    if (this.model) this.stopListening(this.model)
    // use new model
    this.model = model
    this.threaded = !!threaded
    if (!this.threaded) {
      // auto-select after mail app start
      delete this.autoSelect
    }
    // listen for changes
    this.listenTo(this.model, 'change:thread', this.onChangeModel)
    // reload prefetched mail if was not loaded as html yet
    if (this.externalImagesAllowed() && this.model.get('view') === 'noimg') {
      api.getUnmodified(this.model.pick('id', 'folder', 'folder_id', 'parent', 'security'))
    }
    // reset collection
    this.collection.reset([], { silent: true })
    this.reset()
  },

  reset () {
    // has model?
    if (!this.model) return
    // get thread items
    const thread = this.threaded ? api.threads.get(this.model.cid) : [this.model.toJSON()]
    if (!thread.length) return
    // reset collection
    const type = this.collection.length === 0 ? 'reset' : 'set'
    this.collection[type](thread)
  },

  onReset () {
    if (this.collection.length === 0) {
      this.empty()
      return
    }
    this.$messages.empty()
    this.$el.scrollTop(0)

    this.$el.find('.thread-view-list').scrollTop(0).show()

    this.nextAutoSelect = this.autoSelectMail(true)
    this.$messages.append(
      this.collection.chain().map(this.renderListItem, this).value()
    )

    this.zIndex()
  },

  onAdd (model) {
    const index = model.get('index')
    const children = this.getItems()
    const li = this.renderListItem(model)
    const open = this.$el.data('open')

    // insert or append
    if (index < children.length) children.eq(index).before(li); else this.$messages.append(li)

    if (li.position().top <= 0) {
      this.$messages.scrollTop(this.$el.scrollTop() + li.outerHeight(true))
    }

    this.zIndex()
    // this.updateHeader()

    if (open) {
      this.showMail(open)
      this.$el.data('open', null)
    }
  },

  onRemove (model) {
    const children = this.getItems()
    const li = children.filter(function () { return $(this).attr('data-cid') === model.cid })
    const first = li.length ? li.attr('data-cid') && children.first().attr('data-cid') : false
    const top = this.$messages.scrollTop()

    if (li.length === 0) return

    if (li.position().top < top) {
      this.$messages.scrollTop(top - li.outerHeight(true))
    }

    li.remove()

    // clear view if this was the last message
    if (children.length === 1) this.empty()
    // else this.updateHeader()

    // auto open next mail if this was the latest mail in the thread
    if (children.length > 1 && first) {
      this.autoSelectMail()
    }
  },

  onPoolRemove (model) {
    this.collection.remove(model)
  },

  onChangeModel () {
    this.reset()
  },

  onBack (e) {
    e.preventDefault()
    this.trigger('back')
  },

  onPrevious (e) {
    e.preventDefault()
    this.trigger('previous')
  },

  onNext (e) {
    e.preventDefault()
    this.trigger('next')
  },

  onClick (e) {
    const cid = $(e.currentTarget).attr('data-cid')
    this.showMail(cid)
  },

  onKeydown (e) {
    switch (e.which) {
      case 38:
        // cursor up
        if (e.shiftKey) this.onNext(e)
        if (e.altKey) this.focusMessage(e, -1)
        break
      case 40:
        // cursor down
        if (e.shiftKey) this.onPrevious(e)
        if (e.altKey) this.focusMessage(e, +1)
        break
                // no default
    }
  },

  focusMessage (e, shift) {
    const items = this.getItems()
    const current = $(document.activeElement).closest('.list-item')
    let index = items.index(current)
    // avoid scrolling
    e.preventDefault()
    // shift and check bounds
    index = index + shift
    if (index < 0 || index >= items.length) return
    // focus and open next message, close previous
    current.data('view').toggle(false)
    items.eq(index).focus().data('view').toggle(true)
    items.eq(index).get(0).scrollIntoView(true)
  },

  initialize (options) {
    this.model = null
    this.threaded = true
    this.collection = new backbone.Collection()
    options = options || {}
    this.standalone = options.standalone || false

    this.app = options.app

    this.listenTo(this.collection, {
      add: this.onAdd,
      remove: this.onRemove,
      reset: this.onReset
    })

    this.listenTo(api.pool.get('detail'), {
      remove: this.onPoolRemove
    })

    this.$messages = $()

    // make view accessible via DOM
    this.$el.data('view', this)

    this.$el.on('toggle', '.list-item', this.onToggle.bind(this))

    // we don't need drag support when it's open in a separate detail view (there is no folder tree to drag to)
    if (!options.disableDrag) {
      // enable drag & drop support
      dnd.enable({
        container: this.$el,
        draggable: true,
        selectable: '.detail-view-header .contact-picture',
        simple: true
      })
      // fix lost focus when just clicking .contact-picture
      this.$el.on('mouseup', '.detail-view-header .contact-picture', function (e) {
        $(e.target).closest('article').focus()
      })
    }
    const resizeCallback = $.proxy(this.onScrollEnd, this)
    this.$el.one('remove', function () {
      $(window).off('resize', resizeCallback)
    })

    if (options.app) {
      this.listenTo(settings, 'change:showTextPreview', function (model, value) {
        this.$el.toggleClass('hide-text-preview', !value)
        resizeCallback()
      })
    }

    $(window).on('resize', resizeCallback)
  },

  // return alls items of this list
  getItems () {
    return this.$messages.children('.list-item')
  },

  // render scaffold
  render () {
    this.$el.toggleClass('hide-text-preview', this.app ? !this.app.useTextPreview() : true)
    ext.point('io.ox/mail/thread-view').invoke('draw', this)
    return this
  },

  // render an email
  renderListItem (model) {
    const self = this; const view = new detail.View({ threadview: this, supportsTextPreview: this.app ? this.app.supportsTextPreviewConfiguration() : false, tagName: 'article', data: model.toJSON(), disable: { 'io.ox/mail/detail': 'subject' } })
    view.on('mail:detail:body:render', function (data) {
      self.trigger('mail:detail:body:render', data)
    })
    view.render()
    if (this.nextAutoSelect === model.cid) {
      delete this.nextAutoSelect
      view.expand()
    }
    return view.$el.attr({ tabindex: -1 })
  },

  // update zIndex for all list-items (descending)
  zIndex () {
    const items = this.getItems(); const length = items.length
    items.each(function (index) {
      $(this).css('zIndex', length - index)
    })
    this.onScrollEnd()
  }
})

// Mobile
ext.point('io.ox/mail/mobile/thread-view').extend({
  id: 'thread-view-list',
  index: 100,
  draw () {
    this.$el.append(
      $('<div class="thread-view-list scrollable abs">').hide().append(
        $('<div class="thread-view-header">').attr('aria-label', gt('Conversation')),
        this.$messages = $('<ul class="thread-view list-view">')
      ).on('scroll', this.onScrollEnd.bind(this))
    )
  }
})

// Mobile, remove halo links in thread-overview (placeholder handling in detail/view.js)
ext.point('io.ox/mail/detail').extend({
  id: 'remove-halo-popup',
  index: 'last',
  draw () {
    if (_.device('!smartphone')) return
    this.find('[data-detail-popup="halo"]').removeAttr('data-detail-popup')
  }
})

const MobileThreadView = ThreadView.extend({

  initialize () {
    this.model = null
    this.threaded = true
    this.collection = new backbone.Collection()

    this.listenTo(this.collection, {
      add: this.onAdd,
      remove: this.onRemove,
      reset: this.onReset
    })

    this.listenTo(api.pool.get('detail'), {
      remove: this.onPoolRemove
    })

    this.$messages = $()
  },

  // render an email
  renderListItem (model) {
    // custom view
    const view = new detailViewMobile.HeaderView({
      tagName: 'article',
      data: model.toJSON(),
      disable: {
        'io.ox/mail/detail': ['subject', 'actions'],
        'io.ox/mail/detail/header': ['paper-clip'],
        'io.ox/mail/detail/header/row1': ['color-picker', 'flag-toggle', 'security']
      }
    })

    view.render().$el.attr({ tabindex: '0' })

    return view.$el
  },
  renderMail (cid) {
    // strip 'thread.' prefix
    cid = String(cid).replace(/^thread\.(.+)$/, '$1')

    const model = api.pool.get('detail').get(cid)

    if (!model) return

    const view = new detailViewMobile.DetailView({
      tagName: 'article',
      data: model.toJSON()
    })
    this.mail = model.toJSON()
    return view.render().toggle().$el.attr({ tabindex: '0' })
  },
  // render scaffold
  render () {
    // disable some points
    ext.point('io.ox/mail/thread-view/header').disable('toggle-all')

    ext.point('io.ox/mail/thread-view').invoke('draw', this)
    return this
  }
})

export default {
  Desktop: ThreadView,
  Mobile: MobileThreadView
}
