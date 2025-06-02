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

import Backbone from '@/backbone'

import { settings } from '@/io.ox/core/settings'

import gt from 'gettext'
import { createButton } from '@/io.ox/core/components'

const HelpLinkView = Backbone.View.extend({

  tagName: 'a',

  className: 'io-ox-context-help',

  events: {
    click: 'onClick'
  },

  onClick (e) {
    e.preventDefault()
    const opt = this.options
    import('@/io.ox/help/main').then(function ({ default: HelpApp }) {
      if (opt.simple) {
        window.open(HelpApp.getAddress(opt), '_blank')
        return
      }
      if (HelpApp.reuse(opt)) return
      HelpApp.getApp(opt).launch()
    })
  },

  constructor: function (options) {
    this.options = {
      base: 'help',
      content: '',
      context: '',
      href: 'index.html',
      icon: 'bi/question-circle.svg',
      iconClass: null,
      modal: false,
      tagName: 'a',
      ...options
    }

    if (this.options.tagName !== 'a') this.tagName = this.options.tagName
    // create accessible link as default content, if none provided
    if (!options.content) {
      options.el = createButton({
        href: '#',
        variant: 'none',
        icon: { name: this.options.icon, title: gt('Online help'), className: options.iconClass }
      }).addClass('io-ox-context-help').get(0)
    }

    Backbone.View.prototype.constructor.call(this, options)
  },

  initialize (options) {
    if (!settings.get('features/showHelpLinks', true)) this.$el.addClass('hidden')
  },

  render () {
    if (this.$el.hasClass('hidden')) return this
    this.$el
      .append(this.options.content)
      .attr({
        href: '#',
        target: '_blank',
        'aria-label': gt('Online help')
      })

    if (this.options.context) {
      // #. label of help icon
      // #. %1$s current context (example: Inbox categories)
      const label = gt('Online help: %1$s', this.options.context)
      this.$el.attr('aria-label', label).find('i').attr('title', label).end()
    }
    return this
  }
})

export default HelpLinkView
