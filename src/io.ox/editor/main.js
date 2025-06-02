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
import api from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'
import yell from '@/io.ox/core/yell'

import '@/io.ox/editor/style.scss'
import manifests from '@/io.ox/core/manifests'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'
import icons from '@/io.ox/core/main/icons'
import WindowActionButtonsView from '@/io.ox/core/window-action-buttons-view'

const EditorView = Backbone.View.extend({

  className: 'io-ox-editor container default-content-padding abs',

  events: {
    'submit form': 'onSubmit',
    'keydown .title': 'onTitleKeydown',
    'keyup .title': 'onTitleKeyup',
    'keydown .content': 'onContentKeydown'
  },

  onSubmit (e) {
    e.preventDefault()
  },

  onTitleKeydown (e) {
    if (e.which === 13) {
      e.preventDefault()
      this.focus()
    }
  },

  onTitleKeyup () {
    this.trigger('keyup:title', this.getTitle())
  },

  onContentKeydown (e) {
    // cmd on mac ctrl everywhere else
    if (e.which === 13 && ((_.device('!macos') && e.ctrlKey) || (_.device('macos') && e.metaKey))) {
      e.preventDefault()
      this.app.save()
    }
  },

  initialize (options) {
    this.app = options.app

    this.data = {
      saved: {
        filename: null
      }
    }
    this.model.on('change:title', this.updateTitle, this)
    this.model.on('change:content', this.updateContent, this)
  },

  updateTitle () {
    // old value
    this.data.saved.filename = this.model.get('filename')
    this.$el.find('input.title').val(this.model.get('filename'))
  },

  updateContent () {
    this.$el.find('textarea').val(this.model.get('content'))
  },

  updateModel () {
    const filename = this.getFilename()
    this.model.set({
      title: filename,
      filename,
      content: this.getContent()
    })
  },

  getTitle () {
    return $.trim(this.$el.find('input.title').val())
  },

  getFilename () {
    const title = this.getTitle()
    // if we have a predefined list of allowed extensions use it.
    const regex = (this.app.options.params && this.app.options.params.allowedFileExtensions) ? new RegExp('\\.(' + this.app.options.params.allowedFileExtensions.join('|') + '?)$', 'i') : /\.\w{1,4}$/
    let filename = String(title || this.getContent().substr(0, 20).split('.')[0]
      // remove linebreaks
      .replace(/(\r\n|\n|\r)/gm, '')
      // remove unsupported characters
      .replace(/[%&#/$*!`´'"=:@+^\\.+?{}|]/g, '_') || 'unnamed')

    // has file extension?
    if (!regex.test(filename)) {
      filename += '.txt'
    }
    return filename
  },

  getContent () {
    return this.$el.find('textarea').val()
  },

  focus () {
    this.$el.find('textarea').focus()
  },

  busy () {
    this.$el.find('input.title').prop('disabled', true)
    this.app.getWindow().nodes.outer.find('button.save').prop('disabled', true).empty()
      .append(createIcon('bi/arrow-clockwise.svg').addClass('animate-spin'))
  },

  idle () {
    this.$el.find('input.title').prop('disabled', false)
    this.app.getWindow().nodes.outer.find('button.save').prop('disabled', false).text(gt('Save'))
  },

  render () {
    const titleId = _.uniqueId('editor_title-')
    const bodyId = _.uniqueId('editor_body-')
    this.$el.append(
      $('<form>').append(
        $('<div class="row">').append(
          // title
          $('<div class="form-group col-xs-12">').append(
            $('<label class="sr-only">').attr('for', titleId).text(gt.pgettext('title', 'Title')),
            $('<input type="text" maxlength="350" class="title form-control">').attr({
              id: titleId,
              placeholder: gt('Enter document title here')
            })
          )
        ),
        $('<div class="body row">').append(
          $('<div class="col-md-12">').append(
            // editor
            $('<label class="sr-only">').attr('for', bodyId).text(gt('Note')),
            $('<textarea class="content form-control">').attr('id', bodyId).val('')
              .attr('placeholder', getPlaceholder())
          )
        )
      )
    )

    this.app.getWindow().setHeader(
      new WindowActionButtonsView({
        app: this.app,
        discardTitle: gt('Close'),
        onSave () { this.app.save() },
        collapse: false
      }).render().$el
    )

    if (_.device('smartphone')) this.app.getWindow().nodes.header.show()

    return this
  }
})

function getPlaceholder () {
  if (_.device('ios || android')) return ''
  // #. This is a placeholder for macOS. Keep in line with local mac keyboard layout
  if (_.device('macos')) return gt('You can quick-save your changes via Cmd+Enter.')

  // use windows as default
  return gt('You can quick-save your changes via Ctrl+Enter.')
}

// multi instance pattern
function createInstance () {
  let app; let win; let model = new api.Model(); let view; let previous = {}

  app = ox.ui.createApp({
    name: 'io.ox/editor',
    title: 'Editor',
    closable: true,
    floating: _.device('!smartphone'),
    userContentIcon: icons['io.ox/files'],
    userContentIconColor: 'var(--app-color-files)',
    load: () => manifests.manager.loadPluginsFor('io.ox/editor')
  })

  // launcher
  app.setLauncher(function (options) {
    // get window
    app.setWindow(win = ox.ui.createWindow({
      name: 'io.ox/editor',
      title: gt('Editor'),
      chromeless: true,
      floating: _.device('!smartphone'),
      closable: true
    }))

    app.view = view = new EditorView({ model, app })
    win.nodes.main.append(app.view.render().$el)

    window.view = view

    // set state
    if ('id' in options) {
      app.loadItem({ folder_id: options.folder, id: options.id, params: options.params })
    } else if (_.url.hash('id')) {
      app.loadItem({ folder_id: _.url.hash('folder'), id: _.url.hash('id'), params: options.params })
    } else {
      app.create()
    }

    win.setTitle(gt('Editor'))

    view.on('keyup:title', function (title) {
      app.setTitle(title || gt('Editor'))
    })
  })

  app.create = function (options) {
    const opt = options || {}
    opt.folder = opt.folder || opt.folder_id || folderAPI.getDefaultFolder('infostore')
    model.set(previous = {
      filename: '',
      folder_id: opt.folder,
      title: '',
      content: ''
    })
    _.extend(previous, { filename: 'unnamed.txt', title: 'unnamed.txt' })
    win.on('show', function () {
      app.setState({ folder: opt.folder, id: null })
    })
    win.show(function () {
      if (_.device('!smartphone')) view.focus()
    })
    win.idle()
    if (opt.params) {
      this.options.params = opt.params
    }
  }

  app.save = function () {
    const fixFolder = function () {
      // check file permissions first
      return model.hasWritePermissions().then(function (permissionGranted) {
        if (permissionGranted) return $.when()

        // switch to default folder on missing grants (or special folders)
        return folderAPI.get(model.get('folder_id')).done(function (data) {
          const required = (model.has('id') && !folderAPI.can('write', data)) ||
            (!model.has('id') && !folderAPI.can('create', data)) ||
            _.contains(['14', '15'], data.id)
          if (!required) return
          const defaultFolder = folderAPI.getDefaultFolder('infostore')
          if (defaultFolder) {
            // update mode and notify user
            model.set('folder_id', defaultFolder)
            model.unset('id')
            yell('info', gt('This file will be written in your default folder to allow editing'))
          }
        })
      })
    }

    return import('@/io.ox/files/util').then(function (util) {
      return $.when(
        util.confirmDialog(app.view.getFilename(), app.view.data.saved.filename),
        fixFolder()
      )
    }).then(function () {
      // generate blob
      view.updateModel()
      const data = model.toJSON()
      const blob = new window.Blob([data.content], { type: 'text/plain' })
      delete data.content
      view.busy()
      // create or update?
      if (model.has('id')) {
        // update
        let params = {}
        if ((data.meta && data.meta.Encrypted) || data.filename.endsWith('.pgp')) {
          params = {
            cryptoAction: 'Encrypt'
          }
        }
        return api.versions.upload({ id: data.id, folder: data.folder_id, file: blob, filename: data.filename, params })
          .done(function () {
            previous = model.toJSON()
          })
          .always(function () { view.idle() })
          .fail(yell)
          .fail(function (error) {
            // file no longer exists
            if (error.code === 'IFO-0300') model.unset('id')
          })
      }
      // create
      return api.upload({ folder: data.folder_id, file: blob, filename: data.filename })
        .done(function (data) {
          delete data.content
          app.setState({ folder: data.folder_id, id: data.id })
          model.set(data)
          previous = model.toJSON()
          view.idle()
        })
        .always(function () { view.idle() })
        .fail(yell)
    }, function () {
      view.idle.apply(app.view)
      throw arguments
    })
  }

  app.setData = function (data) {
    app.setState({ folder: data.folder_id, id: data.id })
    const title = data.title || gt('Editor')
    win.setTitle(title)
    app.setTitle(title)
    model.set(data)
  }

  app.loadItem = function (o) {
    const def = $.Deferred()
    app.cid = 'io.ox/editor:edit.' + _.cid(o)
    win.on('show', function () {
      app.setState({ folder: o.folder_id, id: o.id })
    })
    win.show(function () {
      // load file
      win.busy()
      $.when(
        api.get(o).fail(yell),
        $.ajax({ type: 'GET', url: api.getUrl(o, 'view', o) + '&' + _.now(), dataType: 'text' })
      )
        .done(function (data, text) {
          win.idle()
          _.extend(data, _(o).pick('id', 'folder_id'), { content: text[0] })
          app.setData(previous = data)
          // avoid scrolling on initial focus, so set cursor to start
          view.$el.find('textarea').prop('selectionEnd', 0)
          if (_.device('!smartphone')) view.focus()
          def.resolve()
        })
        .fail(win.idle)
        .fail(def.reject)
    })
    return def
  }

  app.destroy = function () {
    view.remove()
    app = win = app.view = view = view.app = model = previous = null
  }

  app.isDirty = function () {
    view.updateModel()
    return !_.isEqual(model.toJSON(), previous)
  }

  app.setQuit(function () {
    const def = $.Deferred()
    if (app.isDirty()) {
      import('@/io.ox/backbone/views/modal').then(function ({ default: ModalDialog }) {
        if (app.getWindow().floating) {
          app.getWindow().floating.toggle(true)
        } else if (_.device('smartphone')) {
          app.getWindow().resume()
        }
        // #. 'Discard changes' as modal dialog header to confirm to discard changes of a note.
        new ModalDialog({ title: gt('Discard changes'), description: gt('Do you really want to discard your changes?') })
          .addCancelButton()
        // #. "Discard changes" appears in combination with "Cancel" (this action)
        // #. Translation should be distinguishable for the user
          .addButton({ label: gt.pgettext('dialog', 'Discard changes'), action: 'quit' })
          .on('quit', def.resolve)
          .on('cancel', def.reject)
          .open()
      })
    } else {
      def.resolve()
    }
    return def.done(function () {
      app.destroy()
    })
  })

  app.failSave = function () {
    if (!app || !app.view) return false
    // don't use update model here otherwise we modify the filename, when saving the restore point (add .txt whyle typing)
    // use getTitle instead of getFilename for the same reason
    const filename = app.view.getTitle()
    model.set({
      title: filename,
      filename,
      content: app.view.getContent()
    })
    const data = model.toJSON()
    return {
      description: this.get('title') || gt('File'),
      module: 'io.ox/editor',
      point: data
    }
  }

  app.failRestore = function (point) {
    return win.show(function () {
      app.setData(point)
    })
  }

  return app
}

export default {

  getApp: createInstance,

  reuse (data) {
    return ox.ui.App.reuse('io.ox/editor:edit.' + _.cid(data))
  }
}
