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

// cSpell:ignore amodel

import $ from '@/jquery'
import _ from '@/underscore'

import ext from '@/io.ox/core/extensions'
import util from '@/io.ox/mail/mailfilter/settings/filter/actions/util'
import picker from '@/io.ox/core/folder/picker'
import capabilities from '@/io.ox/core/capabilities'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

const getActionIds = _.memoize((config) => {
  return config.actioncmds.reduce((memo, val) => {
    memo[val.id] = val
    return memo
  }, {})
})

const isSupportedAction = _.memoize((action, config) => {
  return getActionIds(config)[action]
})

ext.point('io.ox/mail/mailfilter/actions').extend({
  id: 'addflags',

  index: 400,

  supported (config) {
    return isSupportedAction('addflags', config)
  },

  actions: {
    markmail: {
      flags: ['\\seen'],
      id: 'addflags'
    },
    tag: {
      flags: ['$'],
      id: 'addflags'

    },
    flag: {
      flags: ['$cl_1'],
      id: 'addflags'
    }
  },

  translations: {
    markmail: gt('Mark mail as'),
    tag: gt('Add IMAP keyword'),
    flag: settings.flagByColor ? gt('Set color flag') : undefined
  },

  actionCapabilities: {
    markmail: 'addflags',
    tag: 'addflags',
    flag: 'addflags'
  },

  order (list) {
    list.push('markmail', 'tag')
    if (settings.flagByColor) list.push('flag')
  },

  draw (baton, actionKey, amodel, filterValues, action) {
    let inputId
    const flagValues = {
      '\\deleted': gt('deleted'),
      '\\seen': gt('seen'),
      '\\flagged': gt('flagged')
    }
    const COLORS = {
      NONE: { value: 0, text: gt('None') },
      RED: { value: 1, text: gt('Red') },
      ORANGE: { value: 7, text: gt('Orange') },
      YELLOW: { value: 10, text: gt('Yellow') },
      LIGHTGREEN: { value: 6, text: gt('Light green') },
      GREEN: { value: 3, text: gt('Green') },
      LIGHTBLUE: { value: 9, text: gt('Light blue') },
      BLUE: { value: 2, text: gt('Blue') },
      PURPLE: { value: 5, text: gt('Purple') },
      PINK: { value: 8, text: gt('Pink') },
      GRAY: { value: 4, text: gt('Gray') }
    }

    const COLORFLAGS = {
      $cl_1: '1',
      $cl_2: '2',
      $cl_3: '3',
      $cl_4: '4',
      $cl_5: '5',
      $cl_6: '6',
      $cl_7: '7',
      $cl_8: '8',
      $cl_9: '9',
      $cl_10: '10'
    }

    if (/delete|seen/.test(action.flags[0])) {
      // cSpell:disable-next-line
      inputId = _.uniqueId('markas_')
      this.append(
        util.drawAction({
          actionKey,
          inputId,
          title: baton.view.actionsTranslations.markmail,
          dropdownOptions: { name: 'flags', model: amodel, values: flagValues, id: inputId }
        })
      )
    } else if (/^\$cl/.test(action.flags[0])) {
      inputId = _.uniqueId('colorflag_')
      this.append($('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': actionKey }).append(
        $('<div>').addClass('col-sm-4 singleline').append(
          $('<span>').addClass('list-title').text(baton.view.actionsTranslations.flag)
        ),
        $('<div>').addClass('col-sm-8').append(
          $('<div>').addClass('row').append(
            $('<div>').addClass('col-sm-3 col-sm-offset-9 rightalign').append(
              util.drawColorDropdown(action.flags[0], COLORS, COLORFLAGS)
            )
          )
        ),
        util.drawDeleteButton('action')
      ))
    } else {
      inputId = _.uniqueId('customflag_')
      this.append(
        util.drawAction({
          actionKey,
          inputId,
          title: baton.view.actionsTranslations.tag,
          inputLabel: baton.view.actionsTranslations.tag,
          inputOptions: { name: 'flags', model: amodel, className: 'form-control', id: inputId },
          errorView: true
        })
      )
    }
  }
})

ext.point('io.ox/mail/mailfilter/actions').extend({

  id: 'setflags',

  index: 900,

  supported (config) {
    return isSupportedAction('setflags', config)
  },

  actions: {
    setflags: {
      flags: [''],
      id: 'setflags'
    }
  },

  translations: {
    setflags: gt('Set IMAP keywords')
  },

  actionCapabilities: {
    setflags: 'setflags'
  },

  draw (baton, actionKey, amodel) {
    const inputId = _.uniqueId('setflags_')
    this.append(
      util.drawAction({
        actionKey,
        inputId,
        title: baton.view.actionsTranslations.setflags,
        inputLabel: baton.view.actionsTranslations.setflags,
        inputOptions: { name: 'setflags', model: amodel, className: 'form-control', id: inputId },
        errorView: true
      })
    )
  }
})

ext.point('io.ox/mail/mailfilter/actions').extend({

  id: 'removeflags',

  index: 1000,

  supported (config) {
    return isSupportedAction('removeflags', config)
  },

  actions: {
    removeflags: {
      flags: ['$'],
      id: 'removeflags'

    }
  },

  translations: {
    removeflags: gt('Remove IMAP keyword')
  },

  actionCapabilities: {
    removeflags: 'removeflags'
  },

  order (list) {
    if (_.indexOf(list, 'tag') !== -1) list.push(_.first(list.splice(_.indexOf(list, 'tag'), 1)))
    list.push('removeflags')
  },

  draw (baton, actionKey, amodel) {
    const inputId = _.uniqueId('removeflags_')
    this.append(
      util.drawAction({
        actionKey,
        inputId,
        title: baton.view.actionsTranslations.removeflags,
        inputLabel: baton.view.actionsTranslations.removeflags,
        inputOptions: { name: 'flags', model: amodel, className: 'form-control', id: inputId },
        errorView: true
      })
    )
  }

})

ext.point('io.ox/mail/mailfilter/actions').extend({

  id: 'discard',

  index: 600,

  supported (config) {
    return isSupportedAction('discard', config)
  },

  actions: {
    discard: {
      id: 'discard'
    }
  },

  translations: {
    discard: gt('Discard')
  },

  actionCapabilities: {
    discard: 'discard'
  },

  draw (baton, actionKey, amodel, filterValues, action) {
    const inputId = _.uniqueId('discard_')
    this.append(
      util.drawAction({
        actionKey,
        inputId,
        addClass: 'warning',
        title: baton.view.actionsTranslations[action.id]
      })
    )
  }

})

ext.point('io.ox/mail/mailfilter/actions').extend({

  id: 'keep',

  index: 800,

  supported (config) {
    return isSupportedAction('keep', config)
  },

  actions: {
    keep: {
      id: 'keep'
    }
  },

  translations: {
    keep: gt('Keep')
  },

  actionCapabilities: {
    keep: 'keep'
  },

  draw (baton, actionKey, amodel, filterValues, action) {
    const inputId = _.uniqueId('keep_')
    this.append(
      util.drawAction({
        actionKey,
        inputId,
        title: baton.view.actionsTranslations[action.id]
      })
    )
  }

})

ext.point('io.ox/mail/mailfilter/actions').extend({

  id: 'guard_encrypt',

  index: 700,

  supported (config) {
    return isSupportedAction('guard_encrypt', config) && capabilities.has('guard-mail')
  },

  actions: {
    guard_encrypt: {
      id: 'guard_encrypt'
    }
  },

  translations: {
    guard_encrypt: gt('Encrypt the email')
  },

  actionCapabilities: {
    guard_encrypt: 'guard_encrypt'
  },

  draw (baton, actionKey, amodel, filterValues, action) {
    const inputId = _.uniqueId('guard_')
    this.append(
      util.drawAction({
        actionKey,
        inputId,
        title: baton.view.actionsTranslations[action.id]
      })
    )
  }

})

ext.point('io.ox/mail/mailfilter/actions').extend({

  id: 'move',

  index: 100,

  supported (config) {
    return isSupportedAction('move', config)
  },

  actions: {
    move: {
      id: 'move',
      into: 'default0/INBOX'
    }
  },

  translations: {
    // #. File a message into a folder
    move: gt('File into')
  },

  actionCapabilities: {
    move: 'move'
  },

  draw (baton, actionKey, amodel, filterValues, action) {
    function onFolderSelect (e) {
      e.preventDefault()

      const model = $(e.currentTarget).data('model')

      baton.view.dialog.pause()

      picker({
        async: true,
        context: 'filter',
        done (id, dialog) {
          model.set('into', id)
          dialog.close()
        },
        folder: model.get('into'),
        module: 'mail',
        root: '1',
        settings,
        persistent: 'folderpopup',
        // #. 'Select' as button text to confirm the selection of a chosen folder via a picker dialog.
        button: gt('Select')
      })
    }

    const inputId = _.uniqueId('move_')
    this.append(
      util.drawAction({
        actionKey,
        inputId,
        title: baton.view.actionsTranslations[action.id],
        activeLink: true,
        inputLabel: baton.view.actionsTranslations[action.id],
        inputOptions: { name: 'into', model: amodel, className: 'form-control', id: inputId }
      })
    )
    this.find(`[data-action-id="${CSS.escape(actionKey)}"] .folderselect`).on('click', onFolderSelect)
  }

})

ext.point('io.ox/mail/mailfilter/actions').extend({

  id: 'copy',

  index: 200,

  supported (config) {
    return isSupportedAction('copy', config)
  },

  actions: {
    copy: {
      id: 'copy',
      into: 'default0/INBOX',
      copy: true
    }
  },

  translations: {
    // #. Copy a message into a folder
    copy: gt('Copy into')
  },

  actionCapabilities: {
    copy: 'copy'
  },

  draw (baton, actionKey, amodel, filterValues, action) {
    function onFolderSelect (e) {
      e.preventDefault()

      const model = $(e.currentTarget).data('model')

      baton.view.dialog.pause()

      picker({
        async: true,
        context: 'filter',
        done (id, dialog) {
          model.set('into', id)
          dialog.close()
        },
        folder: model.get('into'),
        module: 'mail',
        root: '1',
        settings,
        persistent: 'folderpopup',
        // #. 'Select' as button text to confirm the selection of a chosen folder via a picker dialog.
        button: gt('Select')
      })
    }

    const inputId = _.uniqueId('copy_')
    this.append(
      util.drawAction({
        actionKey,
        inputId,
        title: baton.view.actionsTranslations[action.id],
        activeLink: true,
        inputLabel: baton.view.actionsTranslations[action.id],
        inputOptions: { name: 'into', model: amodel, className: 'form-control', id: inputId }
      })
    )
    this.find(`[data-action-id="${CSS.escape(actionKey)}"] .folderselect`).on('click', onFolderSelect)
  }

})

ext.point('io.ox/mail/mailfilter/actions').extend({

  id: 'redirect',

  index: 300,

  supported (config) {
    return isSupportedAction('redirect', config)
  },

  actions: {
    redirect: {
      id: 'redirect',
      to: ''
    }
  },

  translations: {
    redirect: gt('Redirect to')
  },

  actionCapabilities: {
    redirect: 'redirect'
  },

  draw (baton, actionKey, amodel, filterValues, action) {
    const inputId = _.uniqueId('redirect_')
    this.append(
      util.drawAction({
        actionKey,
        inputId,
        title: baton.view.actionsTranslations[action.id],
        inputLabel: baton.view.actionsTranslations.redirect,
        inputOptions: { name: 'to', model: amodel, className: 'form-control', id: inputId },
        errorView: true
      })
    )
  }

})

ext.point('io.ox/mail/mailfilter/actions').extend({

  id: 'reject',

  index: 700,

  supported (config) {
    return isSupportedAction('redirect', config)
  },

  actions: {
    reject: {
      id: 'reject',
      text: ''
    }
  },

  translations: {
    reject: gt('Reject with reason')
  },

  actionCapabilities: {
    reject: 'reject'
  },

  draw (baton, actionKey, amodel, filterValues, action) {
    const inputId = _.uniqueId('reject_')
    this.append(
      util.drawAction({
        actionKey,
        inputId,
        title: baton.view.actionsTranslations[action.id],
        inputLabel: baton.view.actionsTranslations.reject,
        inputOptions: { name: 'text', model: amodel, className: 'form-control', id: inputId },
        errorView: true
      })
    )
  }

})
