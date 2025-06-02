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
import $ from '@/jquery'
import _ from '@/underscore'

import ox from '@/ox'
import { manifestManager } from '@/io.ox/core/manifests'
import ext from '@/io.ox/core/extensions'
import capabilities from '@/io.ox/core/capabilities'
import Tour from '@/io.ox/core/tk/wizard'

import gt from 'gettext'

const GetStartedView = Backbone.View.extend({

  tagName: 'a',

  events: {
    click: 'onClick'
  },

  async onClick (e) {
    e.preventDefault()
    const node = $(e.target).closest('li')
    await manifestManager.loadPluginsFor(node.attr('data-id'))
    Tour.registry.run(node.attr('data-id'))
  },

  hide () {
    return this.$el.parent().toggle(false)
  },
  show () {
    return this.$el.parent().toggle(true)
  },

  onAppChange () {
    // no tours for guests, yet. See bug 41542
    if (capabilities.has('guest')) return this.hide()

    const app = ox.ui.App.getCurrentApp()
    // there are cases where there is no current app (e.g. restore mail compose, then press cancel)
    if (app === null) return this.hide()

    // fresh and shiny new way via manifests
    const id = 'default/' + app.getName()
    if (manifestManager.hasPluginsFor(id)) return this.show().attr({ 'data-id': id })

    this.hide()
  },

  initialize () {
    this.listenTo(ox, 'app:ready app:resume app:stop', this.onAppChange)
  },

  render () {
    this.$el.attr({ href: '#', role: 'menuitem', 'data-action': 'guided-tour' }).text(gt('Guided tour for this app'))
    return this
  }
})

ext.point('io.ox/core/appcontrol/right/help').extend({
  id: 'get-started',
  index: 250,
  extend () {
    if (_.device('smartphone')) return
    if (capabilities.has('guest')) return
    const getStartedView = new GetStartedView()
    this.append(getStartedView.render().$el)
    getStartedView.onAppChange()
  }
})
