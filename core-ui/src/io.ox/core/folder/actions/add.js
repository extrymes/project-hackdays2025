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
import api from '@/io.ox/core/folder/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'
import capabilities from '@/io.ox/core/capabilities'
import { validateFilename } from '@/io.ox/files/util'

import gt from 'gettext'

/**
 * @param {string} [folder] folder id
 * @param {string} [title]  title
 * @param {object} [opt]    options object can contain only a module name, for now
 */
function addFolder (folder, module, title) {
  const warnings = validateFilename(title, 'folder')
  if (warnings.length) {
    warnings.forEach(warning => yell('warning', warning))
    return $.Deferred().reject()
  }

  // call API
  return api.create(folder, { title: $.trim(title), module })
    .fail(yell)
}

function getHelpLink (module) {
  if (module === 'mail') return 'ox.appsuite.user.sect.email.folder.html'
  if (module === 'infostore') return 'ox.appsuite.user.sect.drive.folder.personal.html'
  if (module === 'contacts') return 'ox.appsuite.user.sect.contacts.folder.personal.html'
  if (module === 'event') return 'ox.appsuite.user.sect.calendar.folder.personal.html'
  if (module === 'tasks') return 'ox.appsuite.user.sect.tasks.folder.personal.html'
  return 'ox.appsuite.user.sect.dataorganisation.folder.html'
}

function open (folder, opt) {
  const def = $.Deferred()

  new ModalDialog({
    async: true,
    context: { folder, module: opt.module, supportsPublicFolders: opt.supportsPublicFolders },
    enter: 'add',
    focus: 'input[name="name"]',
    previousFocus: $(document.activeElement),
    help: getHelpLink(opt.module),
    point: 'io.ox/core/folder/add-popup',
    width: _.device('smartphone') ? window.innerWidth - 30 : 400
  })
    .inject({
      addFolder,
      getTitle () {
        const module = this.context.module
        if (module === 'event') return gt('Add new calendar')
        else if (module === 'contacts') return gt('Add new address book')
        else if (module === 'tasks') return gt('Add new list')
        return gt('Add new folder')
      },
      getName () {
        const module = this.context.module
        if (module === 'event') return gt('New calendar')
        else if (module === 'contacts') return gt('New address book')
        else if (module === 'tasks') return gt('New list')
        return gt('New folder')
      },
      getLabel () {
        const module = this.context.module
        if (module === 'event') return gt('Calendar name')
        else if (module === 'contacts') return gt('Address book name')
        else if (module === 'tasks') return gt('List name')
        return gt('Folder name')
      }
    })
    .extend({
      title () {
        this.$('.modal-title').text(this.getTitle())
      },
      name () {
        const guid = _.uniqueId('label_')

        this.$body.append(
          // name
          $('<div class="form-group">').append(
            $('<label class="sr-only">').text(this.getLabel()).attr('for', guid),
            $('<input type="text" name="name" class="form-control">').attr({ id: guid, placeholder: this.getName() })
          )
        )
      },
      checkbox () {
        if (!this.context.supportsPublicFolders) return

        const label = this.context.module === 'event' ? gt('Add as public calendar') : gt('Add as public folder')
        const guid = _.uniqueId('form-control-label-')
        this.$body.append(
          // public
          $('<div class="form-group checkbox">').append(
            // checkbox
            $('<label>').attr('for', guid).append(
              $('<input type="checkbox" name="public">').attr('id', guid),
              $.txt(label)
            )
          ),
          // help
          $('<div class="help-block">').text(
            gt('A public folder is used for content that is of common interest to all users. ' +
                            'To allow other users to read or edit the contents, you have to set ' +
                            'the respective permissions for the public folder.'
            )
          )
        )
      }
    })
    .addCancelButton()
    .addButton({ action: 'add', label: gt('Add') })
    .on({
      add () {
        const name = this.$('input[name="name"]').val()
        const isPublic = this.$('input[name="public"]').prop('checked')
        this.addFolder(isPublic ? '2' : folder, this.context.module, name)
          .then(def.resolve.bind(def))
          .then(this.close, this.idle).fail(this.idle)
      },
      close: def.reject.bind(def),
      open () {
        this.$('input[name="name"]').val(this.getName()).focus().select()
      }
    })
    .open()

  return def
}

/**
 * @param {string} [folder] folder id
 * @param {object} [opt]    options object - will be forwarded to folder API
 */
export default function (folder, opt) {
  opt = opt || {}

  if (!folder || !opt.module) return $.Deferred().reject()

  // only address book, calendar, and tasks do have a "public folder" section
  const hasPublic = /^(addressbooks|contacts|event|tasks)$/.test(opt.module) && capabilities.has('edit_public_folders')

  // resolves with created folder-id
  return $.when(hasPublic ? api.get('2') : undefined)
    .then(function (publicFolder) {
      if (publicFolder) opt.supportsPublicFolders = api.can('create:folder', publicFolder)
      // returns deferred
      return open(String(folder), opt)
    })
};
