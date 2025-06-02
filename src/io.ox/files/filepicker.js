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
import Backbone from '@/backbone'

import cache from '@/io.ox/core/cache'
import ext from '@/io.ox/core/extensions'
import Selection from '@/io.ox/core/tk/selection'
import upload from '@/io.ox/core/tk/upload'
import folderAPI from '@/io.ox/core/folder/api'
import picker from '@/io.ox/core/folder/picker'
import filesAPI from '@/io.ox/files/api'
import yell from '@/io.ox/core/yell'
import PageController from '@/io.ox/core/page-controller'
import Bars from '@/io.ox/core/toolbars-mobile'
import '@/io.ox/core/viewer/views/sidebar/fileinfoview'
import '@/io.ox/files/mobile-navbar-extensions'
import '@/io.ox/core/viewer/views/sidebarview'
import '@/io.ox/filter/files'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

/**
 * Constructor
 * @param   {object}          options
 * @returns {jQuery.Deferred}
 * @constructor FilePicker
 */
const FilePicker = function (options) {
  options = _.extend({
    filter () { return true },
    sorter () {},
    header: gt('Add files'),
    primaryButtonText: gt('Save'),
    // cancelButtonText: gt('Cancel'), // really?
    multiselect: true,
    width: window.innerWidth * 0.8 > 1300 ? 1300 : Math.round(window.innerWidth * 0.8), // limit width to 1300px
    uploadButton: false,
    uploadButtonText: gt('Upload local file'),
    tree: {
      // must be noop (must return undefined!)
      filter: $.noop
    },
    acceptLocalFileType: '', // e.g.  '.jpg,.png,.doc', 'audio/*', 'image/*' see@ https://developer.mozilla.org/de/docs/Web/HTML/Element/Input#attr-accept
    cancel: $.noop,
    close: $.noop,
    initialize: $.noop,
    createFolderButton: true,
    extension: 'io.ox/files/mobile/navbar'
  }, options)

  const filesPane = $('<ul class="io-ox-fileselection list-unstyled">')
  const previewPane = $('<div class="preview-pane">')

  let uploadButton
  const def = $.Deferred()
  const self = this
  const toolbar = $('<div class="mobile-toolbar">')
  const navbar = $('<div class="mobile-navbar">')
  const pcContainer = $('<div class="picker-pc-container">')
  const pages = new PageController({ appname: 'filepicker', toolbar, navbar, container: pcContainer, disableAnimations: true })
  const hub = _.extend({}, Backbone.Events)
  const loader = filesAPI.collectionLoader
  let currentFolder
  const isAllowPreviewPane = !_.device('smartphone')

  pages.addPage({
    name: 'folderTree',
    navbar: new Bars.NavbarView({
      title: gt('Folders'),
      extension: options.extension // save to use as this is very generic
    }),
    startPage: true
  })

  pages.addPage({
    name: 'fileList',
    navbar: new Bars.NavbarView({
      title: gt('Files'),
      extension: options.extension
    })
  })

  pages.setBackbuttonRules({
    fileList: 'folderTree'
  })

  pages.getNavbar('fileList').setLeft(gt('Folders'))

  pages.getNavbar('fileList').on('leftAction', function () {
    pages.goBack({ disableAnimations: true })
  })

  Selection.extend(this, filesPane, { markable: true })

  this.selection.keyboard(filesPane, true)
  this.selection.setMultiple(options.multiselect)

  if (options.multiselect) {
    this.selection.setEditable(true, '.checkbox-inline')
    filesPane.addClass('multiselect')
  } else {
    filesPane.addClass('singleselect')
  }

  function toggleOkButton (state) {
    $('[data-action="ok"]', filesPane.closest('.add-infostore-file')).prop('disabled', !state)
  }

  toggleOkButton(false)

  this.selection.on('change', function (e, selectedFiles) {
    toggleOkButton(selectedFiles.length > 0)

    // workaround for Bug 50500, instead of a real fix, we should use the NEW list from mail or drive
    filesPane.find('input[type=checkbox]').prop('checked', false)
    selectedFiles.forEach(function (selectedFile) {
      filesPane.find(`li.file[data-obj-id="${CSS.escape(_.cid(selectedFile))}"] input`).prop('checked', true)
    })
  })
  if (isAllowPreviewPane) {
    this.selection.on('mark', handleFileSelectionChange)
    this.selection.on('select', handleFileSelectionChange)
  }

  function renderPreview (fileModel) {
    previewPane.empty()
    if (!fileModel) {
      return
    }
    ext.point('io.ox/core/viewer/views/sidebarview/detail').get('thumbnail', function (extension) {
      extension.draw.call(previewPane, { model: fileModel, context: {} })
    })

    const jsonModel = fileModel.toJSON()
    const baton = ext.Baton({
      model: fileModel,
      data: jsonModel,
      options: {
        disableFolderInfo: true,
        disableSharesInfo: true,
        disableLink: true
      }
    })

    const fileInfo = $('<div class="fileinfo"><div class="sidebar-panel-body"></div></div>')
    ext.point('io.ox/core/viewer/sidebar/fileinfo').invoke('draw', fileInfo, baton)

    previewPane.append(fileInfo)
  }

  // - user story DOCS-589 :: User can see image preview in file picker
  // - https://jira.open-xchange.com/browse/DOCS-589
  // - the required 3rd preview-pane is supposed to be hacked into this modal dialogue.
  function handleFileSelectionChange (event, fileId, fileObject) {
    renderPreview(new filesAPI.Model(fileObject))
  }

  function onVirtualChange (id) {
    if (id === 'virtual/favorites/infostore' || id === 'virtual/files/recent') {
      if (options.uploadButton) {
        $('[data-action="alternative"]', filesPane.closest('.add-infostore-file'))
          .prop('disabled', true)
      }

      if (_.device('smartphone')) {
        pages.getNavbar('fileList').setTitle(gt('Favorites'))
      }

      // disable ok button on folder change (selection will enable it)
      toggleOkButton(false)

      if (id === 'virtual/favorites/infostore') {
        filesPane.empty()
        filesAPI.getList(settings.get('favoriteFiles/infostore', []), { errors: true, cache, onlyAttributes: true }).then(function (files) {
          updateFileList(id, files)
        })
      } else if (id === 'virtual/files/recent') {
        loader.load({ folder: 'virtual/files/recent' })
        loader.collection.on('load', () => {
          filesPane.empty()
          const files = loader.collection.models.map(file => file.attributes)
          updateFileList(id, files)
        })
      }
    }
  }

  function onFolderChange (id) {
    if (currentFolder === id) {
      hub.trigger('folder:changed')
      return
    }
    if (options.uploadButton) {
      folderAPI.get(id).done(function (folder) {
        $('[data-action="alternative"]', filesPane.closest('.add-infostore-file'))
          .prop('disabled', !folderAPI.can('create', folder))
      })
    }
    if (_.device('smartphone')) {
      folderAPI.get(id).done(function (folder) {
        pages.getNavbar('fileList').setTitle(folder.title)
      }).fail(function () {
        pages.getNavbar('fileList').setTitle(gt('Files'))
      })
    }

    // disable ok button on folder change (selection will enable it)
    toggleOkButton(false)

    filesPane.empty()
    filesAPI.getAll(id, { cache: false, params: { sort: 702 } }).done(function (files) {
      updateFileList(id, files)
    })
  }

  function updateFileList (id, files) {
    // load enabled filters from extension point, add filter from options
    const filters = ext.point('io.ox/files/filter').filter(point => point.invoke('isEnabled') !== false).map(point => point.isVisible).concat(options.filter)
    /**
     * fixing Bug 50949: 'Insert image' from drive offers non image file
     * fixing Bug 50501: File picker:Travelling through file name list with keyboard seems random
     */
    files = _.chain(files)
      .filter(file => _(filters).all(filter => filter(file)))
      .sortBy(options.sorter)
      .value()

    if (files.length <= 0) {
      if (previewPane) previewPane.empty()
    } else {
      const paneItems = files.map(function (file) {
        const guid = _.uniqueId('form-control-label-')
        const title = (file['com.openexchange.file.sanitizedFilename'] || file.filename || file.title)
        const $div = $('<li class="file selectable">').attr('data-obj-id', _.cid(file)).append(
          $('<label class="checkbox-inline sr-only">')
            .attr({ title, for: guid })
            .append(
              $('<input type="checkbox" tabindex="-1">').attr('id', guid)
                .val(file.id).data('file', file)
            ),
          $('<div class="name">').text(title)
        )
        if (options.point) {
          ext.point(options.point + '/filelist/filePicker/customizer').invoke('customize', $div, file)
        }
        return $div
      })
      filesPane.append(paneItems)
    }
    self.selection.clear()
    self.selection.init(files) // - provide the filtered model ... see 1st point above.

    // at first load: the file list should be focused
    if (options.multiselect && options.wasLoaded === undefined) {
      self.selection.selectFirst(true)
      // flag to indicate the initial load
      options.wasLoaded = true
    } else {
      self.selection.selectFirst()
    }
    currentFolder = id
    hub.trigger('folder:changed')
  }

  function fileUploadHandler (e) {
    const dialog = e.data.dialog
    const tree = e.data.tree

    const queue = upload.createQueue({
      start () {
        dialog.busy()
      },
      progress (item) {
        const o = item.options

        return filesAPI.upload({
          file: item.file,
          filename: o.filename,
          folder: o.folder || folderAPI.getDefaultFolder('infostore'),
          timestamp: _.now()
        })
          .then(
            function success (data) {
              item.data = data
            },
            function fail (e) {
              if (e && e.data && e.data.custom) {
                yell(e.data.custom.type, e.data.custom.text)
              }
              throw e
            }
          )
      },
      stop (current, position, list) {
        const defList = _(list).map(function (file) {
          return filesAPI.get(file.data)
        })

        $.when.apply(this, defList).then(function success () {
          const filtered = _(arguments).filter(options.filter)

          if (filtered.length > 0) {
            if (!options.keepDialogOpenOnSuccess) {
              def.resolve(filtered)
              return dialog.close()
            }

            const file = _.first(filtered)
            const folderId = file.folder_id

            filesPane.empty()
            filesAPI.getAll(folderId, { cache: false, params: { sort: 702 } }).done(function (files) {
              updateFileList(folderId, files)
              self.selection.set(file)
              self.selection.focus()
              dialog.idle()
            })
          } else {
            // do not use "gt.ngettext" for plural without count
            yell('error', (list.length === 1)
              ? gt('The uploaded file does not match the requested file type.')
              : gt('None of the uploaded files matches the requested file type.')
            )
            dialog.idle()
          }
        }, yell)
      }
    })

    _(e.target.files).each(function (file) {
      queue.offer(file, { folder: tree.selection.get(), filename: file.name })
    })
  }

  function focusButtons () {
    this.$footer.find('button').first().focus()
  }

  function onResize () {
    if (_.device('smartphone')) return
    const height = $(window).height() - 200
    pcContainer.css('height', height)
      .find('.modal-body').css('height', height)
  }

  picker({

    addClass: 'zero-padding add-infostore-file',
    button: options.primaryButtonText,
    alternativeButton: options.uploadButton ? options.uploadButtonText : null,
    height: _.device('smartphone') ? undefined : 350,
    module: 'infostore',
    persistent: 'folderpopup/filepicker',
    root: '9',
    settings,
    title: options.header,
    width: options.width,
    async: true,
    abs: false,
    folder: options.folder || undefined,
    hideTrashfolder: options.hideTrashfolder || undefined,
    createFolderButton: options.createFolderButton,
    autoFocusOnIdle: false,

    disable (data) {
      if (!/^virtual\//.test(data.id)) return false
      // enable favorites in drive
      if (data.id === 'virtual/favorites/infostore') return false
      // enable recent in drive
      if (data.id === 'virtual/files/recent') return false
      // disable other virtual folders
      return true
    },

    done (id, dialog) {
      def.resolve(
        _(filesPane.find('li.selected input')).map(function (node) {
          return $(node).data('file')
        })
      )
      dialog.close()
    },

    filter: options.tree.filter,

    initialize (dialog, tree) {
      if (options.uploadButton) {
        uploadButton = $('<input name="file" type="file" class="file-input">')
          .attr('multiple', options.multiselect)
          .attr('accept', options.acceptLocalFileType)
          .hide()
          .on('change', { dialog, tree }, fileUploadHandler)
      }
      // standard handling for desktop only
      if (_.device('desktop')) {
        dialog.$body.append(filesPane)
        filesPane.on('dblclick', '.file', function () {
          const file = $('input', this).data('file')
          if (!file) return
          def.resolve([file])
          dialog.close()
        })
      } else if (_.device('!smartphone')) {
        // tablet
        dialog.$body.append(filesPane)
        dialog.$body.css({ overflowY: 'hidden' })
        filesPane.on('dblclick', '.file', function () {
          const file = $('input', this).data('file')
          if (!file) return
          def.resolve([file])
          dialog.close()
        })
      } else {
        // some re-sorting of nodes for mobile
        // we have to use the pagecontroller pages instead of the classic
        // splitview on desktop
        const container = dialog.$body.parent()
        pages.getPage('fileList').append(filesPane)
        pages.getPage('folderTree').append(dialog.$body)

        dialog.el.classList.remove('maximize')
        pcContainer.append(navbar, toolbar)
        pcContainer.insertAfter(dialog.$header, container)
        $(window).on('resize', onResize)
        dialog.on('close', function () {
          $(window).off('resize', onResize)
        })

        // always change pages on click, do not wait for folder-change
        dialog.$body.on('click', 'li .folder.selectable.open, li.folder.selectable.favorite-files, li.folder.selectable.recent', function (e) {
          if ($(e.target).closest('.folder-arrow').length) return
          pages.changePage('fileList', { disableAnimations: true })
        })
      }

      // fix for Bug 50587
      focusButtons.call(dialog)
      tree.once('change', focusButtons.bind(dialog))

      tree.on('change', onFolderChange)
      tree.on('virtual', onVirtualChange)
      options.initialize(dialog)
      previewPane.insertAfter(filesPane)
    },

    alternative (dialog) {
      dialog.idle()
      if (uploadButton) {
        uploadButton.trigger('click')
      }
    },
    cancel: options.cancel,
    close () {
      if (_.isFunction(options.close)) options.close()
      if (def.state() === 'pending') def.reject()
    }
  })

  return def.promise()
}

export default FilePicker
