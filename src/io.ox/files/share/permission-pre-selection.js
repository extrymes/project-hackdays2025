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
import Backbone from '@/backbone'

import ext from '@/io.ox/core/extensions'
import DropdownView from '@/io.ox/backbone/mini-views/dropdown'
import '@/io.ox/files/share/style.scss'

import gt from 'gettext'

const INDEX = 100
const POINT_PRESELECTION = 'io.ox/files/share/permission-pre-selection'
// used to label values in the dropdown correctly
const roles = {
  Author: gt('Author'),
  Reviewer: gt('Reviewer'),
  Viewer: gt('Viewer')
}

const PreSelectModel = Backbone.Model.extend({
  defaults () {
    return {
      inviteAs: 'Author'
    }
  }
})

/*
     * extension point invite options include subfolder
     */
ext.point(POINT_PRESELECTION + '/selection').extend({
  id: 'preselect-permissions',
  index: INDEX,
  draw (baton) {
    const $el = $('<div>')
    const dropdown = new DropdownView({ el: $el.addClass('dropdown role')[0], caret: true, label: roles[baton.model.get('inviteAs')], model: baton.model, smart: true, buttonToggle: 'btn-link' })
    dropdown.option('inviteAs', 'Viewer', function () {
      return [$.txt(gt('Viewer')), $.txt(' '), $('<small>').text('(' + gt('Read only') + ')')]
    })
    dropdown.option('inviteAs', 'Reviewer', function () {
      return [$.txt(gt('Reviewer')), $.txt(' '), $('<small>').text('(' + gt('Read and write') + ')')]
    })
    if (baton.view.isForFolder()) {
      dropdown.option('inviteAs', 'Author', function () {
        return [$.txt(gt('Author')), $.txt(' '), $('<small>').text('(' + gt('Read, write and delete') + ')')]
      })
    }
    baton.model.on('change:inviteAs', function (model) {
      dropdown.$el.find('.dropdown-label').text(roles[model.get('inviteAs')])
    })
    dropdown.render()
    this.append($el)
  }
})
/*
     * Permission PreSelection View,
     */
const PermissionPreSelection = Backbone.View.extend({

  className: 'permission-pre-selection col-sm-3 col-sm-offset-0 col-xs-4 col-xs-offset-0',
  permissionModel: null,

  initialize (options) {
    this.permissionModel = options.model
    this.model = new PreSelectModel()
    this.model.set('inviteAs', 'Viewer')
    this.baton = ext.Baton({ model: this.model, view: this })
  },

  render () {
    ext.point(POINT_PRESELECTION + '/selection').invoke('draw', this.$el, this.baton)
    return this
  },

  isForFolder () {
    return this.permissionModel.isFolder()
  },

  getSelectedPermission () {
    return this.model.get('inviteAs').toLowerCase()
  }
})

export default PermissionPreSelection
