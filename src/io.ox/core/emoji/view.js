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
import DisposableView from '@/io.ox/backbone/views/disposable'
import unified from '@/io.ox/emoji/unified.json'
import '@/io.ox/emoji/emoji.scss'

import gt from 'gettext'
import { settings } from '@/io.ox/mail/settings'

//
// View. One per editor instance.
//

const EmojiView = DisposableView.extend({

  className: 'emoji-picker',

  events: {
    'click .reset-recent': 'onResetRecent',
    'click .emoji-icons button': 'onInsertEmoji',
    'click .emoji-footer button': 'onSelectCategory',
    'click .emoji-option, .emoji-tab': 'onSelectEmojiCollection'
  },

  // when user clicks on emoji. inserts emoji into editor
  onInsertEmoji (e) {
    // this happens if user click on "reset-recent"
    if (e.isDefaultPrevented()) return
    const unicode = $(e.target).text()
    util.addRecent(unicode)
    if (this.options.editor) this.options.editor.execCommand('mceInsertContent', false, unicode)
    this.trigger('insert', unicode)
    if (this.options.closeOnInsert && !(e.shiftKey || e.altKey)) {
      if (this.previousActiveElement) this.previousActiveElement.focus()
      this.hide()
    }
  },

  // when user clicks on emoji category
  onSelectCategory (e) {
    e.preventDefault()
    const node = $(e.target)
    this.setCategory(node.attr('data-category'))
  },

  // when user clicks on "Reset" in "Recently used" list
  onResetRecent (e) {
    e.preventDefault()
    util.resetRecent()
    this.drawEmojis()
  },

  initialize (options) {
    this.options = _.extend({ closeOnInsert: false, closeOnFocusLoss: false }, options)
    this.isRendered = false
    this.isOpen = false
    this.currentCategory = ''
    if (this.options.editor) this.$el.addClass('mceEmojiPane')
    if (this.options.closeOnFocusLoss) {
      this.$el.on('focusout', function () {
        setTimeout(function () {
          // we don't close if the focus is on the "opener" (as it usually works as a toggle)
          if (document.activeElement === this.previousActiveElement) return
          const inside = $.contains(this.el, document.activeElement)
          if (!inside) this.hide()
        }.bind(this), 10)
      }.bind(this))
    }
  },

  render () {
    this.$el.append(
      $('<div class="emoji-icons">'),
      $('<div class="emoji-footer">')
    )

    this.$el.closest('.tox-dialog').find('.tox-dialog__footer').css('display', 'none')
    this.drawCategories()
    this.setCategory()
    this.isRendered = true
    this.toggle(true)

    return this
  },

  drawCategories () {
    function draw (category) {
      return $('<button type="button">')
        .attr('data-category', category.name)
        .attr('title', /* #, dynamic */ gt(category.name))
        .text(category.unicode)
    }

    const footer = this.$('.emoji-footer').empty()
    const categories = util.getCategories()

    footer.empty().append(
      _(categories).map(draw)
    )
  },

  // get emojis of current category
  getEmojis () {
    return util.getEmojis(this.currentCategory)
  },

  // draw all emojis of current category
  drawEmojis () {
    const node = this.$('.emoji-icons').hide().empty()
    const list = this.getEmojis()

    node.append(
      list.map(function (unicode) {
        return $('<button type="button">').text(unicode)
      })
    )

    // add "reset" link for recently
    if (list.length > 0 && this.currentCategory === 'Recently') {
      node.append(
        $('<button class="reset-recent">').text(gt('Reset this list'))
      )
    }

    node.show().scrollTop(0)
  },

  // set current category. sets title and triggers repaint of all icons
  setCategory (category) {
    // always draw emojis because the collection might have changed
    this.currentCategory = category || util.getDefaultCategory()
    this.$el.closest('.tox-dialog').find('.tox-dialog__title').text(util.getTitle(this.currentCategory))
    this.$('.emoji-footer > button').removeClass('active')
    this.$(`.emoji-footer > [data-category="${CSS.escape(this.currentCategory)}"]`).addClass('active')
    this.drawEmojis()
  },

  // hide/show view
  toggle (state) {
    this.isOpen = state === undefined ? !this.isOpen : state
    if (this.isOpen) {
      if (!this.isRendered) this.render()
      this.previousActiveElement = document.activeElement
      this.$el.show()
      this.$('button:first').focus()
    } else {
      this.$el.hide()
    }
    this.trigger('toggle', this.isOpen)
  },

  hide () {
    this.toggle(false)
  }
})

// helper

const util = {

  getCategories () {
    return unified.meta
  },

  // add to "recently used" category
  addRecent (unicode) {
    const recently = settings.get('emoji/recently', {})
    // encode unicode to avoid backend bug
    const key = escape(unicode)

    if (key in recently) {
      recently[key].count++
      recently[key].time = _.now()
    } else {
      recently[key] = { count: 1, time: _.now() }
    }

    settings.set('emoji/recently', recently).save()
  },

  resetRecent () {
    settings.set('emoji/recently', {}).save()
  },

  getEmojis (category) {
    if (category === 'Recently') {
      return _(settings.get('emoji/recently', {}))
        .chain()
        .map(function (value, key) {
          return [unescape(key), value]
        })
      // sort by timestamp
        .sortBy(function (array) {
          return 0 - array[1].time
        })
      // get first 40 icons (5 rows; 8 per row)
        .first(40)
      // now sort by frequency (descending order)
        .sortBy(function (array) {
          return array[1].count
        })
      // extract the icon
        .pluck(0)
        .value()
        .reverse()
    }

    return unified[category] || []
  },

  getDefaultCategory () {
    return 'People'
  },

  getTitle (id) {
    switch (id) {
      // #. Emoji category
      case 'Recently': return gt('Recently used')
        // #. Emoji category
      case 'People': return gt('People')
        // #. Emoji category
      case 'Symbols': return gt('Symbols')
        // #. Emoji category
      case 'Nature': return gt('Nature')
        // #. Emoji category
      case 'Objects': return gt('Objects')
        // #. Emoji category
      case 'Places': return gt('Places')
                // no default
    }
  }
}

EmojiView.util = util

export default EmojiView
