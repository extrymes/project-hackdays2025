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

// cSpell:ignore clippy

import $ from '@/jquery'
import _ from '@/underscore'

import Abstract from '@/io.ox/backbone/mini-views/abstract'
import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

export default Abstract.extend({

  tagName: 'button',

  className: 'btn btn-default',

  events: {
    click: 'onClick'
  },

  setup () {
    if (!_.has(this.options, 'content')) throw Error('Copy to clipboard needs an content to operate correctly')
    this.content = this.options.content
  },

  render () {
    const label = this.options.label ? this.options.label : gt('Copy to clipboard')
    const optionalIcon = this.options.optionalIcon ? this.options.optionalIcon : 'bi/clipboard.svg'

    let icon = null
    if (this.options.buttonStyle !== 'link') {
      icon = createIcon(optionalIcon).addClass('clippy')
    } else {
      icon = $('<span></span>').text(this.options.buttonLabel)
      this.$el.removeClass('btn-default')
      this.$el.addClass('btn-link')
    }

    this.$el.empty().append(icon).attr({
      'data-toggle': 'tooltip',
      'data-placement': 'bottom',
      'data-original-title': label,
      'aria-label': label,
      'data-container': 'body',
      'data-clipboard-text': this.content
    }).prop('disabled', true).tooltip()

    this.$el.prop('disabled', false)

    return this
  },

  onClick () {
    navigator.clipboard.writeText(this.content)
  },

  dispose () {
    // remove tooltip if copy to clipboard is disposed
    this.$el.tooltip('destroy')
    Abstract.prototype.dispose.call(this, arguments)
  },

  /**
  * Change the attribute 'data-clipboard-text' to change the clipboard content.
  */
  changeClipboardText (content) {
    this.content = content
    this.$el.attr('data-clipboard-text', this.content)
  }

})
