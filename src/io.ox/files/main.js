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
import ox from '@/ox'

import commons from '@/io.ox/core/commons'
import ext from '@/io.ox/core/extensions'
import folderAPI from '@/io.ox/core/folder/api'
import jobsAPI from '@/io.ox/core/api/jobs'
import TreeView from '@/io.ox/core/folder/tree'
import FolderView from '@/io.ox/core/folder/view'
import FileListView from '@/io.ox/files/listview'
import ListViewControl from '@/io.ox/core/tk/list-control'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import Bars from '@/io.ox/core/toolbars-mobile'
import PageController from '@/io.ox/core/page-controller'
import capabilities from '@/io.ox/core/capabilities'
import api from '@/io.ox/files/api'
import sidebar from '@/io.ox/core/tk/sidebar'
import Sidebarview from '@/io.ox/core/viewer/views/sidebarview'
import yell from '@/io.ox/core/yell'
import filestorageAPI from '@/io.ox/core/api/filestorage'
import apps from '@/io.ox/core/api/apps'
import { createButton, createIcon } from '@/io.ox/core/components'
import tabApi from '@/io.ox/core/api/tab'

import '@/io.ox/files/actions'
import '@/io.ox/files/search'
import '@/io.ox/files/style.scss'
import '@/io.ox/core/viewer/style.scss'

// prefetch
import '@/io.ox/backbone/mini-views/toolbar'
import '@/io.ox/files/mobile-navbar-extensions'
import '@/io.ox/files/mobile-toolbar-actions'
import '@/io.ox/files/toolbar'
import '@/io.ox/files/upload/dropzone'
import '@/io.ox/core/folder/breadcrumb'
import '@/io.ox/files/contextmenu'

import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/files/settings'
import gt from 'gettext'
import openSettings from '@/io.ox/settings/util'

// application object
const app = ox.ui.createApp({ id: 'io.ox/files', name: 'io.ox/files', title: 'Drive' })
// app window
let win
const sidebarView = new Sidebarview({ closable: true, app })

app.mediator({

  /**
   * Pages for desktop
   * As this module uses only one perspective, we only need one page
   */
  'pages-desktop' (app) {
    if (_.device('smartphone')) return
    const container = app.getWindow().nodes.main.addClass('rounded-tl')

    app.pages = new PageController(app)

    // create 3 pages with toolbars and navbars
    app.pages.addPage({
      name: 'main',
      container,
      startPage: true
    })
  },

  /**
   * Add listener for browser tab communication. Event needs a
   * 'propagate' string for propagation
   */
  'refresh-from-broadcast' () {
    if (!ox.tabHandlingEnabled) return
    const events = tabApi.communicationEvents
    events.listenTo(events, 'refresh-file', function ({ id, folder_id: folderId }) {
      api.propagate('refresh:file', { id, folder_id: folderId })
    })
    events.listenTo(events, 'add-file', function ({ id, folder_id: folderId }) {
      api.propagate('add:file', { id, folder_id: folderId })
    })
    events.listenTo(events, 'upload-file', function (parameters) {
      const folderId = parameters ? parameters.folder_id : null
      if (folderId && folderId !== app.folder.get()) {
        api.pool.resetFolder(folderId)
      } else {
        app.listView.reload()
      }
    })
  },

  /**
   * Init pages for mobile use
   * Each View will get a single page with own
   * toolbars and navbars. A PageController instance
   * will handle the page changes and also maintain
   * the state of the toolbars and navbars
   */
  'pages-mobile' (app) {
    if (!_.device('smartphone')) return
    const win = app.getWindow()
    const navbar = $('<div class="mobile-navbar">')
    const toolbar = $('<div class="mobile-toolbar">')
      .on('hide', function () { win.nodes.body.removeClass('mobile-toolbar-visible') })
      .on('show', function () { win.nodes.body.addClass('mobile-toolbar-visible') })
    const baton = ext.Baton({ app })

    app.navbar = navbar
    app.toolbar = toolbar
    app.pages = new PageController({ appname: app.options.name, toolbar, navbar, container: win.nodes.main })

    win.nodes.body.addClass('classic-toolbar-visible').append(navbar, toolbar)

    // create 3 pages with toolbars and navbars
    app.pages.addPage({
      name: 'folderTree',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/files/mobile/navbar'
      })
    })

    app.pages.addPage({
      name: 'main',
      startPage: true,
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/files/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'main',
        extension: 'io.ox/files/mobile/toolbar'
      }),
      secondaryToolbar: new Bars.ToolbarView({
        baton,
        page: 'main/multiselect',
        extension: 'io.ox/files/mobile/toolbar'
      })
    })

    // important
    // tell page controller about special navigation rules
    app.pages.setBackbuttonRules({
      main: 'folderTree'
    })
  },

  /**
   * Init all nav- and toolbar labels for mobile
   */
  'navbars-mobile' (app) {
    if (!_.device('smartphone')) return

    app.pages.getNavbar('main')
      .setLeft(gt('Folders'))
      .setRight(
        // #. Used as a button label to enter the "edit mode"
        gt('Edit')
      )

    app.pages.getNavbar('folderTree')
      .setTitle(gt('Folders'))
      .setLeft(false)
      .setRight(gt('Edit'))

    // tell each page's back button what to do
    app.pages.getNavbar('main')
      .on('leftAction', function () {
        app.pages.goBack()
      }).hide('.right')

    app.pages.showPage('main')
  },

  /**
   * Folder view support
   */
  'folder-view' (app) {
    if (_.device('smartphone')) return

    app.treeView = new TreeView({ app, module: 'infostore', root: settings.get('rootFolderId', 9), contextmenu: true })
    app.treeView.selection
      .addSelectableVirtualFolder('virtual/favorites/infostore')
      .addSelectableVirtualFolder('virtual/files/recent')
      .addSelectableVirtualFolder('virtual/files/shares')
    FolderView.initialize({ app, tree: app.treeView })
    app.folderView.resize.enable()

    // cleans up folders that are part of an external account that was deleted recently
    // eslint-disable-next-line n/handle-callback-err
    folderAPI.on('error:FILE_STORAGE-0004', function (error, id) {
      if (!id) return
      folderAPI.pool.removeCollection(id, { removeModels: true })
    })
  },

  /**
   * Folder view mobile support
   */
  'folder-view-mobile' (app) {
    if (!_.device('smartphone')) return

    const nav = app.pages.getNavbar('folderTree')
    const page = app.pages.getPage('folderTree')

    nav.on('rightAction', function () {
      app.toggleFolders()
    })

    const tree = new TreeView({ app, contextmenu: true, module: 'infostore', root: settings.get('rootFolderId', 9) })
    app.treeView = tree
    tree.selection
      .addSelectableVirtualFolder('virtual/favorites/infostore')
      .addSelectableVirtualFolder('virtual/files/recent')
      .addSelectableVirtualFolder('virtual/files/shares')
    // initialize folder view
    FolderView.initialize({ app, tree, firstResponder: 'main' })
    page.append(tree.render().$el)
  },

  'account-errors' (app) {
    // account errors are shown in EVERY folder that are part of that account
    app.treeView.on('click:account-error', function (folder) {
      const accountError = folder['com.openexchange.folderstorage.accountError']
      if (!accountError) return

      Promise.all([import('@/io.ox/backbone/views/modal'), import('@/io.ox/backbone/mini-views')]).then(function ([{ default: ModalDialog }, { default: miniViews }]) {
        new ModalDialog({
          model: new Backbone.Model(),
          point: 'io.ox/files/account-errors',
          // #. title of dialog when contact subscription needs to be recreated on error
          title: gt('Error')
        })
          .extend({
            default () {
              this.account = filestorageAPI.getAccountsCache().findWhere({ qualifiedId: folder.account_id })

              this.$body.append(
                $('<div class="form-group">').append(
                  $('<div class="info-text">')
                    .css('word-break', 'break-word')
                    .text(accountError.error + ' ' + accountError.error_desc)
                    .addClass(accountError.code.toLowerCase())
                )
              )
            },
            // password outdated
            password () {
              if (!/^(LGI-0025)$/.test(accountError.code)) return
              // improve error message
              this.$('.info-text').text(gt('The password was changed recently. Please enter the new password.'))
              // fallback
              if (!this.account) return
              // input
              const guid = _.uniqueId('form-control-label-')
              this.$body.append(
                $('<div class="form-group">').append(
                  $('<label>').attr('for', guid).text(gt('Password')),
                  new miniViews.PasswordView({
                    name: 'password',
                    model: this.model,
                    id: guid,
                    autocomplete: false,
                    options: { mandatory: true }
                  }).render().$el
                )
              )
              // button
              this.addButton({ label: gt('Save'), action: 'save' })
                .on('save', function () {
                  const password = this.model.get('password')
                  const data = this.account.pick('id', 'filestorageService', 'displayName')
                  // prevent shared 'configuration' object
                  _.extend(data, { configuration: { url: this.account.get('configuration').url, password } })
                  filestorageAPI.updateAccount(data).fail(yell)
                }.bind(this))
            },
            // all other non credentials related errors
            refresh () {
              if (/^(LGI-0025)$/.test(accountError.code)) return
              this.addButton({ label: gt('Retry'), action: 'retry' })
                .on('retry', function () {
                  folderAPI.list(10, { cache: false, force: true }).fail(yell)
                })
            },
            unsubscribe () {
              // currently mw does not support unsubscribe when password changed
              if (/^(LGI-0025)$/.test(accountError.code)) return
              this.addAlternativeButton({ label: gt('Hide folder'), action: 'unsubscribe' })
                .on('unsubscribe', function () {
                  folderAPI.update(folder.id, { subscribed: false }).then(function () {
                    folderAPI.refresh()
                  }, function (error) {
                    yell(error)
                  })
                })
            },
            // all permanent errors
            close () {
              const closeButton = this.$footer.find('[data-action="cancel"]')
              // is primary
              const isPrimary = !this.$footer.find('button:not(.pull-left)').length
              if (isPrimary) closeButton.addClass('btn-primary')
              // should be labeled as 'Cancel' for outdated password
              if (/^(LGI-0025)$/.test(accountError.code)) closeButton.text(gt('Cancel'))
            }
          })
          .addButton({ className: 'btn-default' })
          .open()
      })
    })
  },

  /**
   * PDF preconversion of office documents on file upload and when a new file version is added
   */
  'pdf-preconversion' () {
    // check if document converter is available
    if (!capabilities.has('document_preview')) { return }

    // check setting 'io.ox/core//pdf/enablePreconversionOnUpload'
    // if true or not present, perform preconversion on file upload
    if (coreSettings.get('pdf/enablePreconversionOnUpload') === false) { return }

    function getFileModelFromDescriptor (fileDescriptor) {
      return api.get(fileDescriptor).then(function (file) {
        return api.pool.get('detail').get(_.cid(file))
      })
    }

    function getConverterUrl (model) {
      return import('@/io.ox/core/tk/doc-converter-utils').then(function ({ default: DocConverterUtils }) {
        return DocConverterUtils.getEncodedConverterUrl(model, { async: true })
      })
    }

    function isOfficeDocumentAndNeedsPDFConversion (model) {
      const file = model.toJSON()
      // always preconvert for Text and Presentation documents, but for spreadsheets only if the Spreadsheet app is not available
      return (api.isWordprocessing(file) || api.isPresentation(file) || (api.isSpreadsheet(file) && !capabilities.has('spreadsheet')))
    }

    function preconvertPDF (file) {
      getFileModelFromDescriptor(file).then(function (model) {
        // resolve with document converter url or reject to skip Ajax call
        if (isOfficeDocumentAndNeedsPDFConversion(model)) {
          return getConverterUrl(model)
        }
        return $.Deferred().reject()
      }).then(function (url) {
        $.ajax({
          url,
          dataType: 'text'
        })
      })
    }

    api.on('add:file add:version', preconvertPDF)
  },

  'long-running-jobs' () {
    jobsAPI.on('added:infostore', function () {
      // #. moving folders/files
      yell('info', gt('Move operation takes longer to finish'))
    })
    jobsAPI.on('finished:infostore', _.debounce(function () {
      // #. %1$s: moving folders/files
      yell('info', gt('Finished moving'))
    }, 50))
  },

  /**
   * Folder change listener for mobile
   */
  'change:folder-mobile' (app) {
    if (!_.device('smartphone')) return

    function update () {
      app.folder.getData().done(function (data) {
        app.pages.getNavbar('main').setTitle(data.title)
      })
    }

    app.on('folder:change', update)

    // do once on startup
    update()
  },

  /**
   * Get folder-based view options
   */
  'get-view-options' (app) {
    app.getViewOptions = function (folder) {
      const options = app.settings.get(['viewOptions', folder], {})
      let sort = 702
      let order = 'asc'

      const preferSortByDate = folder === 'virtual/files/shares' ||
        folder === 'virtual/files/recent' ||
        folderAPI.is('attachmentView', { id: folder })
      if (preferSortByDate) {
        sort = 5
        order = 'desc'
      }

      if (!/^(list|icon|tile)/.test(options.layout)) options.layout = 'list'
      return { sort, order, layout: 'list', ...options }
    }
  },

  /**
   * Default application properties
   */
  props (app) {
    // layout
    let layout = app.settings.get('layout')
    if (!/^(list|icon|tile)/.test(layout)) layout = 'list'
    // introduce shared properties
    app.props = new Backbone.Model({
      checkboxes: _.device('smartphone') ? false : app.settings.get('showCheckboxes', false),
      filter: 'all',
      layout,
      folderEditMode: false,
      details: _.device('touch') ? false : app.settings.get('showDetails', true)
    })
    // initial setup
    const folder = app.folder.get()
    if (folder) app.props.set(app.getViewOptions(folder))
  },

  /**
   * Setup list view
   */
  'list-view' (app) {
    app.listView = new FileListView({ app, draggable: true, ignoreFocus: true, noSwipe: true, noPullToRefresh: true })
    app.listView.model.set({ folder: app.folder.get(), sort: app.props.get('sort'), order: app.props.get('order') })
    // for debugging
    window.list = app.listView
  },

  /**
   * Setup list view control
   */
  'list-view-control' (app) {
    app.listControl = new ListViewControl({ id: 'io.ox/files/listviewcontrol', listView: app.listView, app })
    const node = _.device('smartphone') ? app.pages.getPage('main') : app.getWindow().nodes.main
    node.append(
      app.listControl.render().$el
        .removeClass('abs')
        // #. items list (e.g. mails)
        .attr({
          'aria-label': gt('Files')
        })
        .find('.toolbar')
        // #. toolbar with 'select all' and 'sort by'
        .attr('aria-label', gt('Files options'))
        .end()
    )

    const body = app.getWindow().nodes.body
    const views = {
      listControl: '.window-content'
    }

    app.showListView = function (view) {
      _(views).each((selector, id) => body.find(selector).toggle(id === view))
    }

    app.hideAllListViews = function () {
      _(views).each(selector => body.find(selector).hide())
    }
  },

  /**
   * Connect collection loader with list view
   */
  'connect-loader' (app) {
    app.listView.connect(api.collectionLoader)
  },

  /**
   * Respond to folder change
   */
  'folder:change' (app) {
    // see Bug 43512 - Opening a Drive direct link in Safari removes the edit bar
    // hide and show sidepanel for correct layout. Somehow, scroll into view and flexbox-layout have errors (mostly in safari)
    app.folderView.tree.selection.view.on('scrollIntoView', function () {
      const sidepanel = app.getWindow().nodes.sidepanel
      if (sidepanel.is(':visible')) sidepanel.hide().show(0)
    })

    app.on('folder:change', function (id) {
      // we clear the list now to avoid flickering due to subsequent layout changes
      app.listView.empty()
      const options = app.getViewOptions(id)
      app.props.set(options)
      // always trigger a change (see bug 41500)
      app.listView.model.set('folder', null, { silent: true })
      app.listView.model.set('folder', id)
    })

    app.on('folder-virtual:change', function (id) {
      app.listView.empty()
      const options = app.getViewOptions(id)
      app.props.set(options)
      app.listView.model.set(options)
      app.listView.model.set('folder', null, { silent: true })
      app.listView.model.set('folder', id)
    })
  },

  getContextualData (app) {
    // get data required for toolbars and context menus
    // selection is array of cids
    app.getContextualData = function (selection, type) {
      // folder at the time the baton was created
      const folderId = app.folder.get()

      // todo: check where and whether collection and allIds are needed
      const options = {
        folder_id: folderId,
        app,
        allIds: [],
        originFavorites: folderId === 'virtual/favorites/infostore',
        originMyShares: folderId === 'virtual/files/shares',
        all: this.listView.collection,
        models: api.resolve(selection, false)
      }
      // turn cids into proper objects
      options.data = _(options.models).invoke('toJSON')
      return options
    }
  },

  'virtual-folders' (app) {
    const reload = _.debounce(() => {
      const folderId = app.folder.get()
      // virtual folders needs to react to additional events:
      if (!/^virtual\//.test(folderId)) return
      // currently it's just favorites
      if (folderId !== 'virtual/favorites/infostore') return
      app.listView.reload()
    }, 50)

    // - change:favorites:
    //    this is triggered for files and folders. usually just the icon for the item changes,
    //    but we need a complete reload in favorites
    api.on('change:favorites', reload)
  },

  attachmentViewUpdater (app) {
    const attachmentView = coreSettings.get('folder/mailattachments', {})
    if (_.isEmpty(attachmentView)) return

    function expireAttachmentView () {
      _(attachmentView).each(function (folder) {
        _(api.pool.getByFolder(folder)).each(function (collection) {
          collection.expired = true
        })
        if (app.folder.get() === folder) app.listView.reload()
      })
    }

    app.folderView.tree.on('change', expireAttachmentView)

    import('@/io.ox/mail/api').then(function ({ default: mailAPI }) {
      mailAPI.on('delete new-mail copy update archive archive-folder', expireAttachmentView)
    })
  },

  /**
   * Store view options
   */
  'store-view-options' (app) {
    app.props.on('change', _.debounce(function () {
      if (app.props.get('find-result')) return
      const folder = app.folder.get() || 'virtual/myshares'
      const data = app.props.toJSON()

      app.settings
        .set(['viewOptions', folder], { sort: data.sort, order: data.order, layout: data.layout })
      if (!_.device('smartphone')) {
        app.settings.set('showCheckboxes', data.checkboxes)
      }
      app.settings.set('showDetails', data.details)
      app.settings.save().fail(function (event) {
        if (event.code !== 'SVL-0011' && _.keys(app.settings.get('viewOptions')).length < 2500) return

        return app.settings
          .set('viewOptions', {})
          .set(['viewOptions', folder], { sort: data.sort, order: data.order, layout: data.layout })
          .save()
      })
    }, 500))
    app.listenTo(folderAPI, 'remove:infostore', function (folder) {
      // garbage collect viewOptions when removing folders
      // or we'll end up with Bug 66217
      const viewOptions = app.settings.get('viewOptions', {})
      delete viewOptions[folder.id]
      app.settings.set('viewOptions', viewOptions).save()
    })
  },

  /**
   * Restore view opt
   */
  'restore-view-options' (app) {
    const data = app.getViewOptions(app.folder.get())
    app.props.set(data)
  },

  /**
   * Respond to changed sort option
   */
  'change:sort' (app) {
    app.props.on('change:sort', function (m, value) {
      if (!app.treeView) return
      // set proper order first
      const model = app.listView.model
      const viewOptions = app.getViewOptions(app.treeView.selection.get())
      if (viewOptions) {
        model.set('order', viewOptions.order, { silent: true })
      } else {
        // set default
        model.set('order', (/^(5|704)$/).test(value) ? 'desc' : 'asc', { silent: true })
      }
      app.props.set('order', model.get('order'))
      // now change sort columns
      model.set('sort', value)
    })
  },

  /**
   * Respond to changed order
   */
  'change:order' (app) {
    app.props.on('change:order', function (model, value) {
      app.listView.model.set('order', value)
    })
  },

  'selection:change' () {
    if (_.device('touch')) return

    function updateSidebar (list, currentTargetCID) {
      // do nothing if closed
      if (!sidebarView.open) return

      if (app.listView.selection.isEmpty()) {
        sidebarView.$('.detail-pane').empty().append($('<div class="flex-center flex-col empty-selection">').append(
          createButton({ variant: 'toolbar', icon: { name: 'bi/x-lg.svg', title: gt('Close') } }).attr('data-action', 'close-sidebar'),
          $.svg({ src: 'themes/default/illustrations/empty-selection-generic.svg', width: 200, height: 96, role: 'presentation' })
            .addClass('illustration'),
          $('<div class="summary empty">').text(gt('No elements selected'))
        ))
      } else {
        const item = currentTargetCID || app.listView.selection.get()[0]
        let model

        // get models from drive collection
        if (/^folder\./.test(item)) {
          model = app.listView.collection.get(folderAPI.pool.getModel(item.replace(/^folder\./, '')).get('folder_id') + '.' + item.replace(/^folder\./, ''))
        } else {
          model = app.listView.collection.get(item)
        }

        sidebarView.render(model)
        sidebarView.$('img').trigger('appear.lazyload')
        sidebarView.$('.sidebar-panel-thumbnail').attr('aria-label', gt('thumbnail'))
      }
    }
    app.listView.on('selection:change', updateSidebar)
    api.pool.get('detail').on('expired_models', function (ids) {
      if (sidebarView && sidebarView.model && ids.indexOf(sidebarView.model.cid) !== -1) {
        updateSidebar()
      }
    })
  },

  /**
   * Respond to changed filter
   */
  'change:filter' (app) {
    let ignoreFolderChange = false
    let folderId

    function setFolderToExpired (id) {
      _(api.pool.getByFolder(id)).each(function (collection) {
        collection.expired = true
      })
    }

    app.props.on('change:filter', function (model, value) {
      app.listView.selection.selectNone()
      if (api.collectionLoader.setMimeTypeFilter(value === 'all' ? null : [value])) {
        folderId = app.listView.model.get('folder')
        setFolderToExpired(folderId)
        app.listView.empty()
        const options = app.getViewOptions(folderId)
        app.props.set(options)
        // trigger a folder change
        app.listView.model.set('folder', null, { silent: true })
        // set ignoreFolderChange to true to prevent changes of the 'folder:change' listener (see below)
        ignoreFolderChange = true
        app.listView.model.set('folder', folderId)
        ignoreFolderChange = false
      }
    })

    // reset filter on folder change
    app.on('folder:change', () => {
      // ignore folder change that was triggered in 'change:filter' listener (see above)
      if (!ignoreFolderChange) {
        api.collectionLoader.setMimeTypeFilter(null)
        app.props.set('filter', 'all')
        setFolderToExpired(folderId)
        folderId = null
      }
    })
  },

  // respond to resize events
  resize (app) {
    if (_.device('smartphone')) return

    let resizePending = false

    $(window).on('resize', function () {
      const list = app.listView

      resizePending = true

      // skip recalculation if invisible
      if (!list.$el.is(':visible')) return

      const width = list.$el.width()
      const layout = app.props.get('layout')
      // min width for icon and tiles view
      const gridWidth = layout === 'icon' ? 185 : 240
      // minimum is 1, maximum is 12
      const column = Math.max(1, Math.min(12, width / gridWidth >> 0))

      // update class name
      list.el.className = list.el.className.replace(/\s?grid-\d+/g, '')
      list.$el.addClass('grid-' + column).attr('grid-count', column)

      resizePending = false
    })

    $(window).trigger('resize')

    app.on('resume', function () {
      if (resizePending) $(window).trigger('resize')
    })
  },

  /**
   * Respond to changing layout
   */
  'change:layout' (app) {
    app.applyLayout = function () {
      const layout = app.props.get('layout')
      const details = app.props.get('details')

      if (details && !_.device('touch')) {
        sidebarView.open = true
        sidebarView.$el.toggleClass('open', true)
        app.listView.trigger('selection:change')
      }

      if (layout === 'list') {
        // ext.point('io.ox/core/viewer/sidebar/fileinfo').enable('thumbnail')
        app.listView.$el.addClass('column-layout').removeClass('grid-layout icon-layout tile-layout')
      } else if (layout === 'icon') {
        app.listView.$el.addClass('grid-layout icon-layout').removeClass('column-layout tile-layout')
      } else {
        app.listView.$el.addClass('grid-layout tile-layout').removeClass('column-layout icon-layout')
      }

      // if (layout !== 'list') {
      //   ext.point('io.ox/core/viewer/sidebar/fileinfo').disable('thumbnail')
      // }
      app.listView.trigger('selection:change')

      if (_.device('smartphone')) {
        onOrientationChange()
      }
    }

    function onOrientationChange () {
      if (_.device('landscape')) {
        // use 3 items per row on smartphones in landscape orientation
        app.listView.$el.removeClass('grid-2').addClass('grid-3')
      } else {
        // use 2 items per row on smartphones in portrait orientation
        app.listView.$el.removeClass('grid-3').addClass('grid-2')
      }
    }

    if (_.device('smartphone')) {
      // use debounce here or some smartphone animations are not finished yet, resulting in incorrect orientationstate (seen on S4)
      $(window).on('orientationchange', _.debounce(onOrientationChange, 500))
    }

    app.props.on('change:layout', function () {
      _.defer(function () {
        app.applyLayout()
        app.listView.redraw()
        $(document).trigger('resize')
        apps.trigger('layout', app)
      })
    })

    app.applyLayout()
  },

  /**
   * File/folder action
   */
  'selection-action' (app) {
    const action = _.device('touch') ? 'action' : 'doubleclick'

    app.listView.on('selection:' + action, cids => {
      const cid = cids[0]
      if (cid.startsWith('folder.')) {
        const id = cid.replace(/^folder\./, '')

        // TODO: Update listview selection if we move back from a folder of a search result
        if (app.folder.get() === id) {
          app.folder.unset(id)
        }
        app.folder.set(id)
      } else {
        const baton = ext.Baton(app.getContextualData(cids))
        actionsUtil.invoke('io.ox/files/actions/default', baton)
      }
    })
  },

  // open on pressing enter / space
  'selection-enter' (app) {
    if (_.device('smartphone')) return

    const ev = tabApi.openInTabEnabled() ? 'keypress' : 'keydown'

    // folders
    app.listView.$el.on(ev, '.file-type-folder', function (e) {
      if (/13|32/.test(e.which)) {
        e.preventDefault()
        // simple id check for folders, prevents errors if folder id contains '.'
        const id = $(e.currentTarget).attr('data-cid').replace(/^folder./, '')
        app.listView.once('collection:load', function () {
          app.listView.selection.select(0)
        })
        app.folder.set(id)
      }
    })

    // files
    app.listView.$el.on(ev, '.list-item:not(.file-type-folder)', function (e) {
      if (!/13|32/.test(e.which)) return
      e.preventDefault()
      const baton = ext.Baton(app.getContextualData(app.listView.selection.get()))
      actionsUtil.invoke('io.ox/files/actions/default', baton)
    })
  },

  /**
   * Respond to API events that need a reload
   */
  'requires-reload' (app) {
    const reload = _.debounce(() => {
      app.listView.reload()
    }, 100)

    // listen to events that affect the filename, description add files, or remove files
    // Important things to know:
    //  - (fileAPI) 'change:permissions' is included in the 'change:file' event!
    //  - virtual My Shares does need a reload on file permission change, because items can be be added/removed
    api.on('rename description add:version remove:version change:version change:file', _.debounce(function (file) {
      // if file not in current folder displayed (note: change:file' does not provide a file, hence it will always be a reload)
      if (file && file.folder_id && (file.folder_id !== app.folder.get())) {
        api.pool.resetFolder(file.folder_id)
      } else {
        app.listView.reload()
      }
    }, 100))

    // bug 53498
    api.on('reload:listview', _.debounce(function () {
      app.listView.selection.clear()
      app.listView.reload()
    }, 100))
    api.on('refresh:listviews', _.debounce(function () {
      ox.trigger('refresh^')
    }, 100))

    // Required because some list collection model-changes are not triggered correctly.
    // Keep in mind, saving the share dialog can hide missing share:link updates.
    api.on('share:link:remove share:link:new', reload)

    // Needed, because:
    // - changed folder permissions do not always trigger collection model updates,
    //   but this permissions change is always triggered on the folderApi
    // - virtual My Shares does need a reload on folder permission change, because items can be be added/removed
    folderAPI.on('change:permissions', reload)

    folderAPI.on('rename', _.debounce(function (id, data) {
      // if the renamed folder is inside the folder currently displayed, reload
      if (data.folder_id === app.folder.get()) {
        app.listView.reload()
      } else {
        ox.trigger('refresh^')
      }
    }, 100))
    // use throttled updates for add:file - in case many small files are uploaded
    api.on('add:file', _.throttle(function (file) {
      // if file not in current folder displayed,
      if (file && file.folder_id && (file.folder_id !== app.folder.get())) {
        api.pool.resetFolder(file.folder_id)
      } else {
        app.listView.reload()
      }
    }, 10000))
    // always refresh when the last file has finished uploading
    api.on('stop:upload', app.listView.reload.bind(app.listView))
    let myFolder = false
    const doReload = _.debounce(function () {
      // we only need to reload if the current folder is affected
      if (myFolder) {
        myFolder = false
        app.listView.reload()
      }
    }, 100)
    api.on('copy', function (list, targetFolder) {
      const appfolder = app.folder.get()
      if (appfolder === targetFolder) {
        myFolder = true
      }
      doReload()
    })
  },

  /**
   * Add listener to files upload to select newly uploaded files after listview reload.
   */
  'show-uploaded-files' (app) {
    // listen
    api.on('stop:upload', function (requests, files) {
      api.collectionLoader.collection.once('reload', function () {
        // check if upload pushes items over pagination limit
        // no need to check for non complete folders
        if (app.listView.collection.complete) {
          const paginationPages = Math.ceil(app.listView.collection.length / api.collectionLoader.PRIMARY_PAGE_SIZE)
          const availableSlots = paginationPages * api.collectionLoader.PRIMARY_PAGE_SIZE

          // get all files that are in current folder
          const newFilesInTargetFolder = files.filter(file => { return file.options.folder === app.folder.get() }).length
          // 0 files means it's 'a single folder in the current folder that includes items
          const newItemsInTargetFolder = newFilesInTargetFolder === 0 ? 1 : newFilesInTargetFolder

          const neededSlots = app.listView.collection.length + newItemsInTargetFolder
          app.listView.collection.setComplete(availableSlots >= neededSlots)
        }

        $.when.apply(this, requests).done(function () {
          const listView = app.listView
          const selection = listView.selection

          // all uploaded files
          const fileCids = _(arguments).map(_.cid)

          // get all uploaded folders,
          // using just the folder_ids of files doesn't work for nested empty folders
          const newfolderIds = _.unique(_.reduce(files, function (collector, obj) {
            // cases to think about:
            //  1. upload a folder with sub folders -> uploads are added to the queue per folder, but all folders are created before
            //  2. add additional items to the upload queue during a currently running upload
            const createdFoldersByUpload = _.property(['options', 'currentUploadInfo', 'createdFoldersByUpload'])(obj)
            return collector.concat(createdFoldersByUpload)
          }, []))
          const folderCids = _(newfolderIds).map(function (folderId) { return listView.createFolderCompositeKey(folderId) })
          const newItemsCids = fileCids.concat(folderCids)
          let cidsToSelect = Array.from(newItemsCids)

          // 1. get already rendered items in list view that should be selected
          const itemsToSelect = selection.getItems(function () {
            const position = newItemsCids.indexOf($(this).attr('data-cid'))
            if (position >= 0) {
              delete cidsToSelect[position]
            }
            return position >= 0
          })
          cidsToSelect = _.without(cidsToSelect, undefined)

          // 2. start a deferredSelection, wait for newly rendered items i.e. from pagination
          // use-case: PAGE_SIZE +1 items in folder, sort by name, item added starting with 'z'
          function selectAddedItems (model) {
            const driveCid = listView.getCompositeKey(model)
            _.each(selection.getItems(), function (item) {
              if ($(item).attr('data-cid') === driveCid) {
                // add items to selection array after rendering
                itemsToSelect.push(item)
              }
            })
            // update items to select
            cidsToSelect = cidsToSelect.filter(cid => cid !== driveCid)
            selection.selectAll(itemsToSelect)
          }
          _.each(cidsToSelect, function (cid) {
            let itemFolderId
            if (/^folder\./.test(cid)) {
              const folderModel = folderAPI.pool.getModel(cid.replace(/^folder\./, ''))
              itemFolderId = folderModel ? folderModel.get('folder_id') : null
              // convert file model cid 'folder':id  to general cid parent:id
              cid = itemFolderId ? itemFolderId + '.' + cid.replace(/^folder\./, '') : null
            } else {
              const fileModel = api.pool.get('detail').get(cid)
              itemFolderId = fileModel ? fileModel.get('folder_id') : null
            }
            // select only if item is in  current folder
            if (app.folder.get() === itemFolderId) {
              if (cid) {
                // added items have a general cid parent:id
                app.listView.once('add:' + cid, selectAddedItems)
              }
            }
          })

          // 3. deselect previously selected
          selection.selectNone()

          // 4. select already rendered items
          selection.selectAll(itemsToSelect)

          // 5. clean up deferredSelection on a real selection change by user
          function clearDeferredSelection () {
            app.listView.off(null, selectAddedItems)
            app.listView.off(null, clearOnSelectionChange)
            app.off('folder:change', clearOnFolderChange)
          }
          function clearOnSelectionChange (selectionList) {
            if (!selectionList) selectionList = this.app.listView.selection.get() || []
            const notUploadedItemSelected = selectionList.length > 0 && selectionList.some(selectionCid => !newItemsCids.includes(selectionCid))
            const collapsedMultiSelection = itemsToSelect.length > 1 && selectionList.length === 1 && newItemsCids.length > 1
            // ignore programmatic selection changes not done by user, due to updates by the deferredSelection i.e. selectAddedItems()
            const realSelectionChange = notUploadedItemSelected || collapsedMultiSelection
            if (realSelectionChange) {
              clearDeferredSelection()
            }
          }
          function clearOnFolderChange () {
            clearDeferredSelection()
          }
          // note: would be simpler to listen for key and click events, but swipe to scroll on touch devices can cause problems
          app.listView.on('selection:change', clearOnSelectionChange)
          app.once('folder:change', clearOnFolderChange)
        })
      })
    })
  },

  /**
   * Respond to change:checkboxes
   */
  'change:checkboxes' (app) {
    if (_.device('smartphone')) return

    app.props.on('change:checkboxes', function (model, value) {
      app.listView.toggleCheckboxes(value)
    })

    app.listView.toggleCheckboxes(app.props.get('checkboxes'))
  },

  'detail-sidebar' (app) {
    if (_.device('smartphone')) return

    sidebar.add({
      side: 'right',
      sidebar: sidebarView.$el.css('padding', '16px'),
      target: app.listControl.$el,
      visible: app.props.get('details')
    })
  },

  'change:details' (app) {
    if (_.device('smartphone')) return

    function toggle (state) {
      sidebarView.open = state
      sidebarView.$el.trigger('toggle-sidebar', state).toggleClass('open', state)
      app.applyLayout()
      app.listView.trigger('selection:change')
      // trigger generic resize event so that other components can respond to it
      $(document).trigger('resize')
    }

    app.props.on('change:details', function (model, value) {
      toggle(value)
    })

    toggle(app.props.get('details'))

    sidebarView.$el.on('click', '[data-action="close-sidebar"]', function () {
      app.props.set('details', false)
    })
  },

  /**
   * Respond to global refresh, but wait for updated folders first.
   * Otherwise list reloads are based on old data of the parent folder.
   */
  refresh (app) {
    folderAPI.on('after:folder:refresh^', function () {
      app.listView.reload({ pregenerate_previews: false })
    })
  },

  'account:delete' () {
    ox.on('account:delete', function (id) {
      if (!id || app.folder.get().indexOf(id) === -1) return
      switchToDefaultFolder()
    })
  },

  'folder:add/remove' (app) {
    folderAPI.on('create', function (data) {
      if (data.folder_id === app.folder.get()) app.listView.reload()

      // select created folder
      app.listView.on('add:' + _.cid(data), function (model) {
        const cid = app.listView.getCompositeKey(model)
        app.listView.selection.set([cid], true)
      })
    })

    folderAPI.on('remove', function (id, data) {
      // on folder remove, the folder model is directly removed from the collection.
      // the folder tree automatically selects the parent folder. therefore,
      // the parent folder's collection just needs to be marked as expired
      _(api.pool.getByFolder(data.folder_id)).each(function (collection) {
        collection.expired = true
      })
    })
  },

  /**
   * change to default folder on no permission or folder not found errors
   */
  'folder-error' (app) {
    app.folder.handleErrors()
  },

  /**
   * Set folderview property
   */
  'prop-folderview' (app) {
    app.props.set('folderview', _.device('smartphone') ? false : app.settings.get('folderview/visible/' + _.display(), true))
  },

  /**
   * Respond to folder view changes
   */
  'change:folderview' (app) {
    if (_.device('smartphone')) return
    app.props.on('change:folderview', function (model, value) {
      app.folderView.toggle(value)
    })
    app.on('folderview:close', function () {
      app.props.set('folderview', false)
    })
    app.on('folderview:open', function () {
      app.props.set('folderview', true)
    })
  },

  /**
   * mobile only
   * toggle edit mode in listview on mobiles
   */
  'change:checkboxes-mobile' (app) {
    if (!_.device('smartphone')) return

    // bind action on button
    app.pages.getNavbar('main').on('rightAction', function () {
      app.props.set('showCheckboxes', !app.props.get('showCheckboxes'))
    })

    // listen to prop event
    app.props.on('change:showCheckboxes', function () {
      const $view = app.getWindow().nodes.main.find('.view-list')
      app.selection.clear()
      if (app.props.get('showCheckboxes')) {
        $view.removeClass('checkboxes-hidden')
        app.pages.getNavbar('main').setRight(gt('Cancel')).hide('.left')
      } else {
        $view.addClass('checkboxes-hidden')
        app.pages.getNavbar('main').setRight(gt('Edit')).show('.left')
      }
    })
  },

  'toggle-secondary-toolbar' (app) {
    app.props.on('change:showCheckboxes', function (model, state) {
      app.pages.toggleSecondaryToolbar('main', state)
    })
  },

  /**
   * Folderview toolbar
   */
  'folderview-toolbar' (app) {
    commons.addFolderViewToggle(app)
  },

  /**
   * folder edit mode for mobile
   */
  'toggle-folder-editmode' (app) {
    if (!_.device('smartphone')) return

    const toggle = function () {
      const page = app.pages.getPage('folderTree')
      const state = app.props.get('mobileFolderSelectMode')
      const right = state ? gt('Edit') : gt('Cancel')

      app.props.set('mobileFolderSelectMode', !state)
      app.pages.getNavbar('folderTree').setRight(right)
      page.toggleClass('mobile-edit-mode', !state)
    }

    app.toggleFolders = toggle
  },

  // respond to search results
  find (app) {
    if (_.device('smartphone') || !app.get('find')) return
    app.get('find').on({
      'find:query:result' (response) {
        api.pool.add('detail', response.results)
        app.props.set('filter', 'all')
      }
    })
  },

  'contextual-help' (app) {
    app.getContextualHelp = function () {
      const folder = this.folder.get() || this.treeView.selection.get() || ''
      if (folder.match(/^virtual\/files\/shares$/)) return 'ox.appsuite.user.sect.dataorganisation.sharing.drive.html'
      if (folder.match(/^maildrive:\/\/0/)) return 'ox.appsuite.user.sect.drive.view.attachments.html'
      return 'ox.appsuite.user.sect.drive.gui.html'
    }
  },

  'before-delete' (app) {
    if (_.device('smartphone')) return

    api.on('beforedelete', function (ids) {
      const selection = app.listView.selection
      const cids = _.map(ids, _.cid)

      // intersection check for Bug 41861
      if (_.intersection(cids, selection.get()).length) {
        // set the direction for dodge function
        selection.getPosition()
        // change selection
        selection.dodge()
        // optimization for many items
        if (ids.length === 1) return
        // remove all DOM elements of current collection; keep the first item
        app.listView.onBatchRemove(ids.slice(1))
      }
    })
  },

  'remove-file' (app) {
    api.on('remove:file', function () {
      // trigger scroll after remove, if files were removed with select all we need to trigger a redraw or we get an empty view
      app.listView.$el.trigger('scroll')

      // When a file is removed the trash collection must be updated for showing the correct contextmenu entries
      const id = settings.get('folder/trash')
      if (id) {
        folderAPI.get(id, { cache: false })
      }
    })
  },

  /**
   * Handle delete event based on keyboard shortcut or swipe gesture
   */
  'selection-delete' () {
    app.listView.on('selection:delete', function (cids) {
      // turn cids into proper objects
      const list = _(api.resolve(cids, false)).invoke('toJSON')
      // Tested: false
      actionsUtil.invoke('io.ox/files/actions/delete', list)
    })
  },

  // register listView as dropzone (folders only)
  'listview-dropzone' (app) {
    app.listView.$el
      .addClass('dropzone')
      .attr('data-dropzones', '.selectable.file-type-folder')
  },

  sidepanel (app) {
    if (_.device('smartphone')) return
    ext.point('io.ox/files/sidepanel').extend({
      id: 'tree',
      index: 100,
      draw (baton) {
        // add border & render tree and add to DOM
        this.append(baton.app.treeView.$el)
      }
    })
  },

  'primary-action' (app) {
    const folders = [
      { id: 'virtual/favorites/infostore', icon: 'bi/star.svg', title: gt('Favorites') },
      { id: 'virtual/files/recent', icon: 'bi/clock.svg', title: gt('Recent files') },
      { id: coreSettings.get('folder/infostore'), icon: 'bi/person.svg', title: gt('My files') },
      // #. used to describe a folder that contains all files a user shares with others
      { id: 'virtual/files/shares', icon: 'bi/share.svg', title: gt('Shared with others') }
    ]

    ext.point('io.ox/files/sidebar').extend({
      id: 'standard-folders',
      index: 100,
      draw () {
        const $el = $('<div role="presentation">').appendTo(this)
        folders.forEach(folder => {
          $el.append(
            $('<button type="button" class="btn btn-default">')
              .attr({ 'data-id': folder.id, title: folder.title })
              .append(createIcon(folder.icon))
              .on('click', { app, id: folder.id }, setFolder)
          )
        })
        app.on('folder:change', highlightCurrentFolder)
        function highlightCurrentFolder () {
          $el.find('button[data-id]').removeClass('current')
          $el.find(`button[data-id="${CSS.escape(app.folder.get())}"]`).addClass('current')
        }
        highlightCurrentFolder()
      }
    })

    app.addPrimaryAction({
      point: 'io.ox/files',
      label: gt('New')
    })

    function setFolder (event) {
      event.data.app.folder.set(event.data.id)
    }
  },

  'select-file' (app) {
    app.selectFile = function (obj) {
      obj = typeof obj === 'string' ? _.cid(obj) : obj
      api.get(obj).done(function (model) {
        const models = api.resolve(model, false)
        const baton = ext.Baton({ models, app, favorites: false, portal: true })
        // Tested: false
        actionsUtil.invoke('io.ox/files/actions/show-in-folder', baton)
      })
    }
  },

  a11y (app) {
    // mail list: focus mail detail view on <enter>
    // mail list: focus folder on <escape>
    app.listView.$el.on('keydown', '.list-item', function (event) {
      // if a message is selected (mouse or keyboard) the focus is set on body
      if (event.which === 27) {
        app.folderView.tree.$('.folder.selected').focus()
        return false
      }
    })
    // folder tree: focus list view on <enter>
    // folder tree: focus top-bar on <escape>
    app.folderView.tree.$el.on('keydown', '.folder', function (event) {
      // check if it's really the folder - not the contextmenu toggle
      if (!$(event.target).hasClass('folder')) return
      if (event.which === 13) app.listView.restoreFocus(true)
    })
  },

  // FLD-0003 -> permission denied
  //  => Bug 57149: error handling on permission denied
  // FLD-0008 -> not found
  //  => Bug 56943: error handling on external folder delete
  // FILE_STORAGE-0004 -> account missing
  //  => Bug 58354: error handling on account missing
  // FILE_STORAGE-0055
  //  => Bug 54793: error handling when folder does not exists anymore
  'special-error-handling' (app) {
    app.listenTo(ox, 'http:error:FLD-0003 http:error:FLD-0008 http:error:FILE_STORAGE-0004 http:error:FILE_STORAGE-0055 CHECK_CURRENT_FOLDER', function (error, request) {
      const folder = request.params.parent || request.data.parent
      if (!folder || folder !== this.folder.get()) return
      if (folderAPI.isBeingDeleted(folder)) return
      switchToDefaultFolder(error)
    })
  },

  'account-error-handling' (app) {
    app.addAccountErrorHandler = function (folderId, callbackEvent, data, overwrite) {
      let node = app.treeView.getNodeView(folderId + '/')
      function updateNode (node) {
        node.showStatusIcon(gt('There is a problem with this account. Click for more information'), callbackEvent || 'checkAccountStatus', data || node.options.model_id, overwrite)
      }
      if (node) {
        updateNode(node)
      } else {
        // wait for node to appear
        app.treeView.on('appear:' + folderId + '/', function () {
          node = app.treeView.getNodeView(folderId + '/')
          if (node) updateNode(node)
          app.treeView.off('appear:' + folderId + '/')
        })
      }
    }

    function updateStatus (folderId) {
      const node = app.treeView.getNodeView(folderId + '/')
      if (!node) return
      node.hideStatusIcon()
      node.render()
    }

    filestorageAPI.on('refresh:basicAccount', function (e, folderId) {
      updateStatus(folderId)
    })
  },

  'account-status-check' () {
    filestorageAPI.getAllAccounts().done(function (data) {
      _.each(data.models, function (accountData) {
        if (accountData.get('hasError') === true) {
          app.addAccountErrorHandler(accountData.get('qualifiedId'), 'checkAccountStatus')
        }
      })
    })

    app.treeView.on('checkAccountStatus', () => openSettings('virtual/settings/io.ox/settings/accounts'))
  }
})

const switchToDefaultFolder = _.debounce(function (error) {
  const model = folderAPI.pool.getModel(app.folder.get())
  if (model && model.get('folder_id') !== undefined) folderAPI.list(model.get('folder_id'), { cache: false })
  app.folder.setDefault()
  if (!error) return
  folderAPI.path(model.get('folder_id')).done(function (folders) {
    error.error += '\n' + folders.map(folder => folder.title).join('/')
    yell(error)
  })
}, 1000, true)

// launcher
app.setLauncher(function (options) {
  // get window
  app.setWindow(win = ox.ui.createWindow({
    name: 'io.ox/files',
    id: 'io.ox/files',
    title: 'Drive',
    chromeless: true
  }))

  win.addClass('io-ox-files-main')
  app.settings = settings

  commons.wirePerspectiveEvents(app)

  win.nodes.outer.on('selection:drop', function (e, _baton) {
    // baton data is array of cid
    // let's get a new baton through getContextualData
    const baton = ext.Baton(app.getContextualData(_baton.data))
    // ensure proper type
    baton.dropType = 'infostore'
    baton.target = _baton.target.replace(/^folder\./, '')
    // call move action (instead of API) to have visual error handlers
    actionsUtil.invoke('io.ox/files/actions/move', baton)
  })

  // fix missing default folder
  options.folder = options.folder || folderAPI.getDefaultFolder('infostore') || 9

  return commons.addFolderSupport(app, null, 'infostore', options.folder)
    .then(function () {
      app.mediate()
      win.show(function () {
        // trigger grid resize
        $(window).trigger('resize')
      })
    })
})

// set what to do if the app is started again
// this way we can react to given options, like for example a different folder
app.setResume(function (options) {
  // only consider folder option for now
  if (options && options.folder && options.folder !== this.folder.get()) {
    const appNode = this.getWindow()
    appNode.busy()
    return this.folder.set(options.folder).always(function () {
      appNode.idle()
    })
  }
})

export default {
  getApp: app.getInstance
}
