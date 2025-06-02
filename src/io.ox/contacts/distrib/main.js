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
import api from '@/io.ox/contacts/api'
import contactModel from '@/io.ox/contacts/model'
import ContactCreateDistView from '@/io.ox/contacts/distrib/create-dist-view'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'

import '@/io.ox/contacts/distrib/style.scss'
import manifests from '@/io.ox/core/manifests'

import gt from 'gettext'

// multi instance pattern
function createInstance () {
  let win
  let container
  let considerSaved = false
  let initialDistlist

  const app = ox.ui.createApp({
    name: 'io.ox/contacts/distrib',
    title: gt('Distribution List'),
    userContent: true,
    closable: true,
    floating: !_.device('smartphone'),
    load: () => manifests.manager.loadPluginsFor('io.ox/contacts/distrib')
  })

  app.getContextualHelp = function () {
    return 'ox.appsuite.user.sect.contacts.gui.createlist.html'
  }

  app.create = function (folderId, initdata) {
    initialDistlist = _.extend({ mark_as_distributionlist: true, last_name: '' }, { folder_id: folderId })

    // set title, init model/view
    win.setTitle(gt('Create distribution list'))

    if (initdata) {
      app.model = contactModel.factory.create({
        display_name: initdata.display_name ? initdata.display_name : '',
        folder_id: folderId,
        mark_as_distributionlist: true,
        distribution_list: initdata.distribution_list,
        last_name: ''
      })
    } else {
      app.model = contactModel.factory.create(initialDistlist)
    }

    app.view = new ContactCreateDistView({
      model: app.model,
      app: this
    })

    function quit () {
      app.quit()
    }

    app.model.on({
      'sync:start' () {
        win.busy()
      },
      sync () {
        const lfoQuit = _.lfo(quit)
        yell('success', gt('Distribution list has been saved'))
        considerSaved = true
        win.idle()
        // quit app after last sync event was handled
        lfoQuit()
      },
      'sync:fail' (response) {
        yell('error', response.error ? response.error : gt('Failed to save distribution list.'))
        win.idle()
      }
    })

    container.append(app.view.render().$el)
    win.show()
    win.idle()
  }

  app.edit = function (obj) {
    app.cid = 'io.ox/contacts/group:edit.' + _.cid(obj)
    return contactModel.factory.realm('edit').retain().get(api.reduce(obj)).done(function (data) {
      // actually data IS a model
      app.model = data

      // set state
      app.setState({ folder: app.model.get('folder_id'), id: app.model.get('id') })

      app.setTitle(app.model.get('display_name'))

      // set title, init model/view
      win.setTitle(gt('Edit distribution list'))

      app.view = new ContactCreateDistView({ model: app.model, app })

      // see bug 47576 - sync display_name and last_name
      app.model.on('change:display_name', function () {
        app.model.set('last_name', app.model.get('display_name'))
      })

      app.model.on({
        'sync:start' () {
          win.busy()
        },
        sync () {
          yell('success', gt('Distribution list has been saved'))
          considerSaved = true
          win.idle()
          app.quit()
        },
        'sync:fail' (response) {
          yell('error', response.error ? response.error : gt('Failed to save distribution list.'))
          win.idle()
        }
      })

      win.on('show', function () {
        if (app.model.get('id')) {
          // set url parameters
          app.setState({ folder: app.model.get('folder_id'), id: app.model.get('id') })
        } else {
          app.setState({ folder: app.model.get('folder_id'), id: null })
        }
      })

      container.append(app.view.render().$el)
      win.show()
      win.idle()
    })
  }

  app.setLauncher(function () {
    app.setWindow(win = ox.ui.createWindow({
      chromeless: true,
      name: 'io.ox/contacts/distrib',
      title: gt('Distribution List'),
      floating: !_.device('smartphone'),
      closable: true
    }))

    function fnToggleSave (isDirty) {
      app.getWindow().nodes.footer.find('.btn[data-action="save"]').prop('disabled', !isDirty)
    }

    win.on('show', function () {
      if (!container.find('[data-extension-id="displayname"] input').val()) {
        app.getWindow().nodes.footer.find('.btn[data-action="save"]').prop('disabled', true)
      }
      // no autofocus on smartphone and for iOS in special (see bug #36921)
      if (_.device('!smartphone && !iOS')) {
        container.find('input[type=text]:visible').eq(0).focus()
      }
      container.find('[data-extension-id="displayname"] input').on('keyup', _.debounce(function () {
        app.setTitle($.trim($(this).val()) || gt('Distribution List'))
        fnToggleSave($(this).val().trim())
      }, 150))
    })

    container = $('<div>').addClass('create-distributionlist container')

    win.nodes.main.addClass('scrollable').append(container)

    // hash state support
    const state = app.getState()
    if ('app' in state && state.app !== 'io.ox/contacts') return

    if (!app.attributes.floating) {
      if ('id' in state) {
        app.edit(state)
      } else if ('folder' in state) {
        app.create(state.folder)
      }
    }
  })

  app.setQuit(function () {
    const def = $.Deferred()
    if (app.model.isDirty() && considerSaved === false) {
      if (_.isEqual(initialDistlist, app.model.changedSinceLoading())) {
        def.resolve()
      } else {
        if (app.getWindow().floating) {
          app.getWindow().floating.toggle(true)
        } else if (_.device('smartphone')) {
          app.getWindow().resume()
        }
        // #. Translation must be distinguishable for the user
        // #. 'Discard changes' as the header of the modal dialog to cancel the distribution list edit window.
        new ModalDialog({ title: gt('Discard changes'), description: gt('Do you really want to discard your changes?') })
          .addCancelButton()
        // #. "Discard changes" appears in combination with "Cancel" (this action)
          .addButton({ label: gt.pgettext('dialog', 'Discard changes'), action: 'delete' })
          .on('action', function (action) {
            if (action === 'delete') {
              app.model.factory.realm('edit').release()
              def.resolve()
            } else {
              // NOTE: biggeleben: maybe we need a better function here
              // actually I just want to reset the current model
              // see Bug 26184 - [L3] Contact in Distribution list will still be deleted although the removal of the contact in edit mode was canceled
              app.model.factory.realm('edit').destroy()
              def.reject()
            }
          })
          .open()
      }
    } else {
      app.model.factory.realm('edit').release()
      def.resolve()
    }

    // clean
    return def
  })

  // TODO: fix me
  // app.failSave = function () {
  //     if (model) {
  //         var title = model.get('display_name');
  //         return {
  //             description: gt('Distribution List') + (title ? ': ' + title : ''),
  //             module: 'io.ox/contacts/distrib',
  //             point: model.attributes
  //         };
  //     }
  //     return false;
  // };

  // app.failRestore = function (point) {
  //     if (_.isUndefined(point.id)) {
  //         this.create(point.folder_id, point);
  //     } else {
  //         this.edit(point);
  //     }
  //     return $.when();
  // };

  return app
}

export default {

  getApp: createInstance,

  reuse (type, data) {
    if (type === 'edit') {
      return ox.ui.App.reuse('io.ox/contacts/group:edit.' + _.cid(data))
    }
  }
}
