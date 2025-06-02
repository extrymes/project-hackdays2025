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
import gt from 'gettext'
import DisposableView from '@/io.ox/backbone/views/disposable'

import { createIcon } from '@/io.ox/core/components'

const WindowActionButtonsView = DisposableView.extend({

  className: 'header container',

  attributes: {
    'data-extension-id': 'header'
  },

  events: {
    'click [data-action="discard"]': 'onDiscard',
    'click [data-action="collapse"]': 'onCollapse',
    'click [data-action="save"],[data-action="send"]': 'onSave'
  },

  preinitialize (options) {
    this.onDiscard = options.onDiscard || this.onDiscard
    this.onCollapse = options.onCollapse || this.onCollapse
    this.onSave = options.onSave
  },

  initialize (options) {
    this.app = options.app

    this.options = {
      discardTitle: gt('Discard'),
      saveTitle: gt('Save'),
      collapse: true,
      ...options
    }

    this.$save = (this.options.$save || $('<button type="button" class="btn btn-primary save" data-action="save">'))
      .text(this.options.saveTitle)
  },

  onDiscard () {
    return this.app.quit()
  },

  onCollapse () {
    return ox.ui.windowManager.prevWindow
      ? ox.ui.windowManager.prevWindow.resume()
      : this.app.quit()
  },

  render () {
    this.$discard = $('<button type="button" class="btn btn-default discard" data-action="discard">')
      .text(this.options.discardTitle)

    this.$collapse = $('<button class="collapse btn-unstyled" data-action="collapse">').append(
      $('<div aria-hidden="true">')
        .attr('title', gt('Close window'))
        .append(createIcon('bi/chevron-down.svg').addClass('bi-20'))
    ).attr('aria-label', gt('Close window'))

    this.$el.append(
      _.device('smartphone')
        ? [this.$discard, this.options.collapse ? this.$collapse : $('<span class="spacer">'), this.onSave && this.$save]
        : [this.onSave && this.$save, this.$discard]
    )

    return this
  }
})

export default WindowActionButtonsView
