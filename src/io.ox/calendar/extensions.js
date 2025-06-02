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
import * as util from '@/io.ox/calendar/util'
import folderAPI from '@/io.ox/core/folder/api'
import { getAppointmentColor } from '@/io.ox/calendar/util'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/calendar/settings'
import ox from '@/ox'
import $ from '@/jquery'
import _ from '@/underscore'

import gt from 'gettext'

ext.point('io.ox/calendar/appointment').extend({
  id: 'default',
  index: 100,
  draw: (function () {
    function addColors (node, model) {
      const folder = folderAPI.pool.getModel(model.get('folder')).toJSON()
      const color = getAppointmentColor(folder, model)

      if (!color) {
        // cleanup possible previous styles
        node
          .css({
            color: '',
            'background-color': '',
            'border-inline-start-color': ''
          })
          .data('background-color', null)
          .removeClass('white black')
        return
      }
      const colors = util.deriveAppointmentColors(color)
      node
        .css({
          color: colors.foreground,
          'background-color': colors.background,
          'border-inline-start-color': colors.border
        })
        .data('background-color', colors.background)
        .addClass(colors.background === 'white' ? 'white' : 'black')

      if (util.canAppointmentChangeColor(folder, model)) {
        node.attr('data-folder', folder.id)
      }
      // #. Will be used as aria label for the screen reader to tell the user which color/category the appointment within the calendar has.
      if (colors.name) node.attr('aria-label', getTitle(model) + ', ' + gt('Category') + ': ' + colors.name)
    }

    function addModifyClass (node, model) {
      const folderId = model.get('folder')
      const folderModel = folderAPI.pool.getModel(folderId)
      const folder = folderModel.toJSON()
      node.toggleClass('modify', folderAPI.can('write', folder, model.attributes) && util.allowedToEdit(model.toJSON(), folderModel))
    }

    function getTitle (model) {
      return _([model.get('summary'), model.get('location')]).compact().join(', ')
    }

    return function (baton) {
      const model = baton.model
      const folderId = model.get('folder')
      const folderModel = folderAPI.pool.getModel(folderId)
      const folder = folderModel.toJSON()
      const incomplete = !folder.permissions
      // in week view all day appointments are 20px high, no space to show the location too, so it can be dismissed
      const skipLocation = !model.get('location') || (baton.view && baton.view.mode && baton.view.mode.indexOf('week') === 0 && util.isAllday(model))
      const contentNode = $('<div class="appointment-content" aria-hidden="true">').attr('title', getTitle(model))

      // cleanup classes to redraw correctly
      this.removeClass('free modify private disabled needs-action accepted declined tentative')

      // Call this before addColor is invoked
      this.attr('aria-label', getTitle(model))

      if (String(folder.id) === String(folderId)) addColors(this, model)
      else if (folderId !== undefined) folderAPI.get(folderId).done(addColors.bind(this, this, model))

      if (!folder.module) folderAPI.once('after:flat:event', addColors.bind(this, this, model))

      // theme change sometimes means different shades for appointment colors, and needs to be recalculated
      ox.on('themeChange', addColors.bind(this, this, model))

      settings.on('change:categoryColorAppointments', addColors.bind(this, this, model))
      coreSettings.on('change:categories/userCategories', addColors.bind(this, this, model))

      if (util.isPrivate(model) && ox.user_id !== (model.get('createdBy') || {}).entity && !folderAPI.is('private', folder)) {
        this.addClass('private')
      }

      if (util.isPrivate(model)) this.addClass('private')
      // appointments might not have any participation status
      // because the user is neither organizer nor attendee
      if (util.hasParticipationStatus(model)) {
        const conf = util.getConfirmationStatus(model)
        this.addClass(util.getConfirmationClass(conf))
      }
      this.addClass(util.getShownAsClass(model))
      this.addClass(util.getStatusClass(model))

      addModifyClass(this, model)
      if (incomplete) folderModel.once('change', addModifyClass.bind(undefined, this, model))

      if (skipLocation) {
        contentNode.append(
          util.returnIconsByType(model).type,
          model.get('summary') ? $('<div class="title">').text(_.noI18n(model.get('summary'))) : ''
        )
      } else {
        contentNode.append(
          $('<div class="title-container">').append(
            util.returnIconsByType(model).type,
            model.get('summary') ? $('<div class="title">').text(_.noI18n(model.get('summary'))) : ''
          ),
          $('<div class="location">').text(_.noI18n(model.get('location')))
        )
      }

      this.append(contentNode).attr({ 'data-extension': 'default' })
    }
  }())
})
