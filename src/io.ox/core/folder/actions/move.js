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
import api from '@/io.ox/core/folder/api'
import picker from '@/io.ox/core/folder/picker'
import yell from '@/io.ox/core/yell'
import mailAPI from '@/io.ox/mail/api'

import gt from 'gettext'

const virtualMapping = {
  'virtual/myfolders': api.altnamespace() ? 'default0' : 'default0' + mailAPI.separator + 'INBOX'
}

function canMoveFolder (target, input) {
  let canMoveState = 'ok'

  _.all(input, function (inputItem) {
    let currentFolderId = target

    // do not check files
    if (inputItem.folder_id !== 'folder') return true
    // check if folder is moved into itself
    if (currentFolderId === inputItem.id) { canMoveState = 'error:self'; return false }

    // check if folder is moved into own subfolder
    while (currentFolderId) {
      if (String(currentFolderId) === '1') return true
      if (currentFolderId === inputItem.id) { canMoveState = 'error:subfld'; return false }
      // move on level up in the folder tree
      currentFolderId = api.pool.getModel(currentFolderId).get('folder_id')
    }
  })
  return canMoveState
}

export default {

  //
  // Move/copy item
  //
  // options:
  //   button: primary button label
  //   flat: use flat tree (e.g. for contacts)
  //   indent: indent first level (default is true; also needed for flat trees)
  //   list: list of items
  //   module: 'mail'
  //   root: tree root id
  //   settings: app-specific settings
  //   success: i18n strings { multiple: '...', single: '... }
  //   successCallback: callback function on success, is used instead of yell then
  //   title: dialog title
  //   target: target is known; no dialog
  //   type: move/copy
  //

  // DEPRECATED: Options parameter `vgrid` at `folder/actions/move.js`, pending remove with 8.20
  item (options) {
    const type = options.type || 'move'
    const settings = options.settings
    // input is either source folder (move all) or a list of items (move)
    const input = options.source || options.list
    const isMove = /^move/.test(type)
    let onlyFolder = false
    const multiple = type === 'moveAll' || options.list.length > 1
    const current = String(options.source || options.list[0].folder_id)

    if (options.vgrid && ox.debug) console.warn('Options parameter `vgrid` at `folder/actions/move.js` is deprecated, pending remove with 8.20.')

    function success () {
      yell('success', multiple ? options.success.multiple : options.success.single)
      if (options.api.refresh) options.api.refresh()
    }

    function commit (target) {
      if (isMove && options.vgrid) options.vgrid.busy()

      // check for virtual folder and final check for write privileges;
      // if it's only folders the server check the privileges.
      if (/^virtual/.test(target) || (!onlyFolder && !api.pool.getModel(target).can('create'))) {
        return yell('error', gt('You cannot move items to this folder'))
      }

      if (type === 'move' && options.module === 'infostore') {
        switch (canMoveFolder(target, input)) {
          case 'ok':
            break
          case 'error:self':
            return yell('error', gt('A folder cannot be moved into itself'))
          case 'error:subfld':
            return yell('error', gt('A folder cannot be moved to one of its subfolders'))
                        // no default
        }
      }

      // support for move, moveAll, and copy
      options.api[type](input, target, options.all).then(
        function (response) {
          // files API returns array on error; mail just a single object
          // contacts a double array of undefined; tasks the new object.
          // so every API seems to behave differently.
          if (!options.fullResponse && _.isArray(response)) response = _(response).compact()[0]
          // custom callback?
          if (options.successCallback) {
            options.successCallback(response, { input, target, options: options.all })
          } else if (_.isObject(response) && response.error) {
            // fail?
            yell(response)
          } else {
            if (type === 'copy') success()
            api.reload(input, target)
            if (isMove && options.vgrid) options.vgrid.idle()
          }
        },
        function (e) {
          if (e.code === 'UI_CONSREJECT') {
            // inform when a big copy operation is still ongoing, but the user clicked again(thinking it didn't work)
            yell('warning', gt('Please wait for the previous operation to finish'))
          } else {
            yell('error', e.error || e)
          }
        }
      )
    }

    if (type !== 'moveAll') {
      onlyFolder = true
      _(options.list).each(function (item) {
        if (!onlyFolder) return
        onlyFolder = item.folder_id === 'folder'
      })
    }

    if (options.target) {
      if (current !== options.target) commit(options.target)
      return
    }

    picker({
      async: true,
      button: options.button,
      filter: options.filter,
      flat: !!options.flat,
      indent: options.indent !== undefined ? options.indent : true,
      module: options.module,
      persistent: 'folderpopup',
      root: options.root,
      open: options.open,
      settings,
      title: options.title,
      type: options.type,
      initialize: options.pickerInit || $.noop,
      close: options.pickerClose || $.noop,

      done (id, dialog) {
        if (type === 'copy' || id !== current) commit(id)
        if (dialog) dialog.close()
      },

      disable: options.disable || function (data, options) {
        const same = isMove && data.id === current
        const create = onlyFolder ? api.can('create:folder', data) : api.can('create', data)
        return same || !create || (options && /^virtual/.test(options.folder))
      }
    })
  },

  all (options) {
    // default API is mail API
    this.item(_.extend({ api: mailAPI, module: 'mail', type: 'moveAll', title: gt('Move all messages') }, options))
  },

  folder (id, settings) {
    const model = api.pool.getModel(id)
    const module = model.get('module')
    const flat = api.isFlat(module)
    const context = 'popup'
    picker({
      async: true,
      addClass: 'zero-padding',
      done (target, dialog, tree) {
        dialog.busy(true)
        if (virtualMapping[target]) target = virtualMapping[target]
        function preselect () {
          tree.preselect(target)
        }
        api.move(id, target, { enqueue: true }).done(dialog.close).fail([dialog.idle, preselect, yell])
      },
      customize (baton) {
        const data = baton.data
        const same = data.id === id
        const move = api.can('move:folder', model.toJSON(), data)

        if (module === 'mail' && data.module === 'system') return
        if (same || !move) this.addClass('disabled')
      },
      disable (data) {
        const move = id === data.id || /^virtual\//.test(data.id)
        return move && !virtualMapping[data.id]
      },
      flat,
      indent: !flat,
      module,
      root: module === 'infostore' ? '9' : '1',
      title: gt('Move folder') + ': ' + model.get('title'),
      // #. 'Move' as button text to confirm the destination where a mail folder shall be moved to via a picker dialog.
      button: gt('Move'),
      context,
      persistent: 'folderpopup',
      settings
    })
  }
}
