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
import * as util from '@/io.ox/mail/util'
import api from '@/io.ox/mail/api'
import composeAPI from '@/io.ox/mail/compose/api'
import commons from '@/io.ox/core/commons'
import MailListView from '@/io.ox/mail/listview'
import ListViewControl from '@/io.ox/core/tk/list-control'
import ThreadView from '@/io.ox/mail/threadview'
import ext from '@/io.ox/core/extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
// import { collection as floatingWindows } from '@/io.ox/backbone/views/window'
import http from '@/io.ox/core/http'
import yell from '@/io.ox/core/yell'
import Bars from '@/io.ox/core/toolbars-mobile'
import PageController from '@/io.ox/core/page-controller'
import capabilities from '@/io.ox/core/capabilities'
import TreeView from '@/io.ox/core/folder/tree'
import FolderView from '@/io.ox/core/folder/view'
import folderAPI from '@/io.ox/core/folder/api'
import ActionDropdownView from '@/io.ox/backbone/views/action-dropdown'
import categories from '@/io.ox/mail/categories/mediator'
import accountAPI from '@/io.ox/core/api/account'
import certificateAPI from '@/io.ox/core/api/certificate'
import * as certUtils from '@/io.ox/settings/security/certificates/settings/utils'
import apps from '@/io.ox/core/api/apps'
import '@/io.ox/mail/actions'
import '@/io.ox/mail/mobile-navbar-extensions'
import '@/io.ox/mail/mobile-toolbar-actions'
import '@/io.ox/mail/toolbar'
import '@/io.ox/mail/import'
import '@/io.ox/mail/search'
import '@/io.ox/mail/folderview-extensions'
import '@/io.ox/mail/style.scss'
import { createIcon } from '@/io.ox/core/components'
import tabApi from '@/io.ox/core/api/tab'
import openSettings from '@/io.ox/settings/util'
import { loadBundle } from '@/precore'
import { getUnreadCount } from '@/io.ox/core/notifications/mail'

import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/mail/settings'
import registry from '../core/main/registry'
import gt from 'gettext'

// application object
const app = ox.ui.createApp({
  name: 'io.ox/mail',
  id: 'io.ox/mail',
  title: 'Mail'
})

// a11y: dumb approach to track recent keyboard usage
let openMessageByKeyboard = false

app.mediator({

  /*
  * Init pages for mobile use
  * Each View will get a single page with own
  * toolbars and navbars. A PageController instance
  * will handle the page changes and also maintain
  * the state of the toolbars and navbars
  */
  'pages-mobile' (app) {
    if (_.device('!smartphone')) return
    const appWindow = app.getWindow()
    const navbar = $('<div class="mobile-navbar">')
    const toolbar = $('<div class="mobile-toolbar">')
      .on('hide', function () { appWindow.nodes.body.removeClass('mobile-toolbar-visible') })
      .on('show', function () { appWindow.nodes.body.addClass('mobile-toolbar-visible') })
    const baton = ext.Baton({ app })

    app.navbar = navbar
    app.toolbar = toolbar
    app.pages = new PageController({ appname: app.options.name, toolbar, navbar, container: appWindow.nodes.main })

    appWindow.nodes.body.addClass('classic-toolbar-visible').append(navbar, toolbar)

    // create 4 pages with toolbars and navbars
    app.pages.addPage({
      name: 'folderTree',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/mail/mobile/navbar'
      })
    })

    app.pages.addPage({
      name: 'listView',
      startPage: true,
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/mail/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'listView',
        extension: 'io.ox/mail/mobile/toolbar'
      }),
      secondaryToolbar: new Bars.ToolbarView({
        baton,
        page: 'listView/multiselect',
        extension: 'io.ox/mail/mobile/toolbar'
      })
    })

    app.pages.addPage({
      name: 'threadView',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/mail/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'threadView',
        extension: 'io.ox/mail/mobile/toolbar'
      })
    })

    app.pages.addPage({
      name: 'detailView',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/mail/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'detailView',
        extension: 'io.ox/mail/mobile/toolbar'
      })
    })

    // destroy popovers
    app.pages.getPage('detailView').on('pagebeforehide', function () {
      $(this).find('.popover-open').popover('destroy')
    })

    // important
    // tell page controller about special navigation rules
    app.pages.setBackbuttonRules({
      listView: 'folderTree',
      threadView: 'listView'
    })
  },

  'navbars-mobile' (app) {
    if (!_.device('smartphone')) return

    app.pages.getNavbar('listView')
      .setLeft(gt('Folders'))
      .setRight(
        // #. Used as a button label to enter the "edit mode"
        gt('Edit')
      )

    app.pages.getNavbar('folderTree')
      .setTitle(gt('Folders'))
      .setLeft(false)
      .setRight(gt('Edit'))

    app.pages.getNavbar('detailView')
      .setTitle('')
      .setLeft(
        // #. Used as button label for a navigation action, like the browser back button
        gt('Back')
      )

    app.pages.getNavbar('threadView')
      .setTitle(gt('Thread'))
      .setLeft(gt('Back'))

    // TODO: restore last folder as starting point
    app.pages.showPage('listView')
  },

  'toolbars-mobile' () {
    if (!_.device('smartphone')) return

    // tell each page's back button what to do
    app.pages.getNavbar('listView').on('leftAction', function () {
      app.pages.goBack()
    })
    app.pages.getNavbar('threadView').on('leftAction', function () {
      app.pages.goBack()
      app.listView.selection.selectNone()
    })
    app.pages.getNavbar('detailView').on('leftAction', function () {
      app.pages.goBack()
      app.listView.selection.selectNone()
    })

    // checkbox toggle
    app.pages.getNavbar('listView').on('rightAction', function () {
      app.props.set('checkboxes', !app.props.get('checkboxes'))
    })
  },

  'pages-desktop' (app) {
    if (_.device('smartphone')) return

    // add page controller
    app.pages = new PageController(app)

    // create 2 pages
    // legacy compatibility
    app.getWindow().nodes.main.addClass('vsplit')

    app.pages.addPage({
      name: 'listView',
      container: app.getWindow().nodes.main,
      classes: 'leftside'
    })
    app.pages.addPage({
      name: 'detailView',
      container: app.getWindow().nodes.main,
      classes: 'rightside flex-col'
    })
  },

  'folder-view' (app) {
    if (_.device('smartphone')) return

    // tree view
    app.treeView = new TreeView({ app, module: 'mail', contextmenu: true })
    FolderView.initialize({ app, tree: app.treeView })
    app.folderView.resize.enable()
  },

  'folder-view-mobile' (app) {
    if (_.device('!smartphone')) return app

    const navbar = app.pages.getNavbar('folderTree')
    const page = app.pages.getPage('folderTree')

    navbar.on('rightAction', function () {
      app.toggleFolders()
    })

    const tree = new TreeView({ app, module: 'mail', root: '1', contextmenu: true })
    // initialize folder view
    FolderView.initialize({ app, tree })
    page.append(tree.render().$el)
    app.treeView = tree
  },

  'account-error-handling' (app) {
    app.addAccountErrorHandler = function (folderId, callbackEvent, data, overwrite) {
      let node = app.treeView.getNodeView(folderId)
      const updateNode = function (node) {
        // #. Shown as a tooltip when a mail account doesn't work correctly. Click brings user to the settings page
        node.showStatusIcon(gt('There is a problem with this account. Click for more information'), callbackEvent || 'checkAccountStatus', data || node.options.model_id, overwrite)
      }

      if (node) {
        updateNode(node)
      } else {
        // wait for node to appear
        app.treeView.on('appear:' + folderId, function () {
          node = app.treeView.getNodeView(folderId)

          if (node) updateNode(node)

          app.treeView.off('appear:' + folderId)
        })
      }
    }
  },

  'folder-view-ssl-events' (app) {
    if (coreSettings.get('security/acceptUntrustedCertificates') || !coreSettings.get('security/manageCertificates')) return

    // open certificates page when the user clicks on error indicator
    app.treeView.on('accountlink:ssl', () => openSettings('virtual/settings/io.ox/certificate'))

    // open examine dialog when the user clicks on error indicator
    app.treeView.on('accountlink:sslexamine', function (error) {
      certUtils.openExamineDialog(error)
    })
  },

  'folder-view-account-ssl-error' (app) {
    function filterAccounts (hostname, data) {
      const accountData = []
      _.each(data, function (account) {
        if (Object.values(account).includes(hostname)) accountData.push(account)
      })
      return accountData
    }

    function updateStatus (hostname, modus, error) {
      accountAPI.all().done(function (data) {
        const relevantAccounts = hostname ? filterAccounts(hostname, data) : data

        _.each(relevantAccounts, function (accountData) {
          accountAPI.getStatus(accountData.id).done(function (obj) {
            const node = app.treeView.getNodeView(accountData.root_folder)

            if (!node) return

            if (obj[accountData.id].status === 'invalid_ssl') {
              const event = modus ? 'accountlink:sslexamine' : 'accountlink:ssl'
              const data = modus ? error : node.options.model_id

              app.addAccountErrorHandler(accountData.root_folder, event, data)
            } else if (!obj[accountData.id].status || obj[accountData.id].status === 'ok') {
              node.hideStatusIcon()
              node.render()
            }
          })
        })
      })
    }

    ox.on('http:error SSL:remove', function (error) {
      if (/^SSL/.test(error.code)) {
        certificateAPI.get({ fingerprint: error.error_params[0] }).done(function (data) {
          if (_.isEmpty(data)) {
            updateStatus(data.hostname, ['accountlink:sslexamine'], error)
          } else {
            updateStatus(data.hostname)
          }
        })
      }
    })

    accountAPI.on('refresh:ssl', function (event, hostname) {
      updateStatus(hostname)
    })
  },

  'account-status-check' () {
    function checkAllAccounts () {
      accountAPI.all().done(function (data) {
        _.each(data, function (accountData) {
          accountAPI.getStatus(accountData.id).done(function (obj) {
            const status = obj[accountData.id].status
            if (['ok', 'deactivated'].indexOf(status) >= 0) {
              const node = app.treeView.getNodeView(accountData.root_folder)
              if (!node) return
              node.hideStatusIcon()
            } else if (status !== 'ok') {
              app.addAccountErrorHandler(accountData.root_folder, 'checkAccountStatus')
            }
          })
        })
      })
    }

    accountAPI.on('account:recovered', checkAllAccounts)

    app.treeView.on('checkAccountStatus', () => openSettings('virtual/settings/io.ox/settings/accounts'))

    checkAllAccounts()
  },

  'OAuth-reauthorize' (app) {
    ox.on('account:reauthorized', function (account) {
      if (!account) return

      const mailAccount = _(account.get('associations')).filter({ module: 'mail' })[0]
      if (!mailAccount) return

      const node = app.treeView.getNodeView(mailAccount.folder)
      if (!node) return
      node.hideStatusIcon()
    })
    Promise.all([
      import('@/io.ox/oauth/keychain'),
      import('@/io.ox/oauth/reauth_handler')
    ]).then(async function ([{ getAPI }, { default: reauthHandler }]) {
      const keychain = await getAPI()
      ox.on('http:error:OAUTH-0040 http:error:MSG-0114', function (error) {
        const account = keychain.accounts.get(error.error_params[reauthHandler.columnForError(error.code)])
        if (!account) return
        const mailAccount = _(account.get('associations')).filter({ module: 'mail' })[0]
        if (!mailAccount) return
        app.addAccountErrorHandler(mailAccount.folder, 'OAuthReauthorize', { account, err: error }, true)
      })

      app.treeView.on('OAuthReauthorize', function (data) {
        reauthHandler.showDialog(data.account, data.err)
      })
    })
  },

  'select-all-actions' () {
    // otherwise user would have wait for 'auto refresh'
    api.on('move deleted-mails archive', function () {
      if (!app.listView.collection.length) app.listView.reload()
    })
  },

  /*
   * Default application properties
   */
  props (app) {
    function getLayout () {
      // enforce vertical on smartphones
      if (_.device('smartphone')) return 'vertical'
      const layout = app.settings.get('layout', 'compact')
      return layout === 'compact' ? 'vertical' : layout
    }

    // introduce shared properties
    const listViewLayout = app.settings.get('listViewLayout', 'avatars')
    app.props = new Backbone.Model({
      layout: getLayout(),
      listViewLayout,
      showAvatars: _.device('smartphone') ? false : listViewLayout === 'avatars',
      checkboxes: _.device('smartphone') ? false : listViewLayout === 'checkboxes',
      categories: app.settings.get('categories/enabled', false),
      category_id: categories.getInitialCategoryId(),
      mobileFolderSelectMode: false
    })

    // forward change event since users can also change the layout in settings
    if (!_.device('smartphone')) {
      app.settings.on('change:layout', (value) => app.props.set('layout', value))
      app.settings.on('change:listViewLayout', (value) => app.props.set('listViewLayout', value))
    }
  },

  'toggle-folder-editmode' (app) {
    if (_.device('!smartphone')) return

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

  /*
   * Add support for virtual folders (unseen, flagged)
   */
  'virtual-folders' (app) {
    const folders = [
      { id: 'virtual/all-unseen', event: 'count:unseen', featureToggle: 'unseenFolder', userToggle: 'unseenMessagesFolder', getter: api.getAllUnseenMessages }
    ]
    folders.forEach(({ id, event, featureToggle, userToggle, getter }) => {
      if (!settings.get('features/' + featureToggle)) return

      adjustCollection(id)

      // use mail API's "all-unseen" event to update counter (that is also used in top-bar)
      const model = folderAPI.pool.getModel(id)
      api.on(event, function (e, count) {
        model.set(event === 'count:unseen' ? 'unread' : 'total', count)
      })
      // set initial count (count:unseen event might have been triggered before the listener was initialized)
      model.set('unread', getUnreadCount())

      function loadMessages () {
        getter().done(list => {
          const folders = [...new Set(list
            .filter(function (message) {
            // rewrite folder_id and id
              message.id = message.original_id
              message.folder_id = message.original_folder_id
              // drop messages from spam and trash
              return !accountAPI.is('spam|confirmed_spam|trash', message.folder_id)
            })
            .map(message => message.folder_id)
          )]
          folderAPI.multiple(folders)
        })
      }

      function initAllMessagesFolder () {
        loadMessages()
        ox.on('refresh^', loadMessages)
      }

      if (userToggle) initAllMessagesFolder()
      else settings.once('change:' + userToggle, initAllMessagesFolder)

      // make virtual folder clickable
      app.folderView.tree.selection.addSelectableVirtualFolder(id)
    })

    if (api.allFlaggedMessagesFolder) {
      adjustCollection(api.allFlaggedMessagesFolder)
      app.folderView.tree.selection.addSelectableVirtualFolder(api.allFlaggedMessagesFolder)
    }

    function adjustCollection (folder) {
      const loader = api.collectionLoader
      const params = loader.getQueryParams({ folder })
      const collection = loader.getCollection(params)
      // set special attributes
      collection.gc = false
      collection.preserve = true
      collection.CUSTOM_PAGE_SIZE = 250
      collection.on('load reload', function () { this.setComplete(true) })
    }

    // OXUIB-1539: Make virtual folders clickable with empty views
    app.folderView.tree.selection.addSelectableVirtualFolder('virtual/myfolders')
    app.folderView.tree.selection.addSelectableVirtualFolder('virtual/standard')
  },

  /*
        * make some special folders not selectable
        */
  'unselectable-folders' () {
    // make shared root folder unclickable (not virtual but still not a true selectable folder)
    if (!accountAPI.cache[0]) return
    const id = accountAPI.cache[0].root_folder + '/Shared'
    app.folderView.tree.selection.addUnselectableFolder(id)
  },

  // Split into left and right pane
  vsplit (app) {
    // replacing vsplit with new pageController
    // TODO: refactor app.left and app.right
    const left = app.pages.getPage('listView')
    const right = app.pages.getPage('detailView')
    app.left = left
    app.right = right.addClass('mail-detail-pane')
  },

  'list-view' (app) {
    app.listView = new MailListView({ swipe: true, app, draggable: true, ignoreFocus: true, selectionOptions: { mode: 'special' } })
    app.listView.model.set({
      folder: app.folder.get(),
      thread: app.settings.get('threadSupport', true)
    })
    // for debugging
    window.list = app.listView
  },

  'list-view-checkboxes' (app) {
    // always hide checkboxes on small devices initially
    if (_.device('smartphone')) return
    app.listView.toggleCheckboxes(app.props.get('checkboxes'))
  },

  'list-view-checkboxes-mobile' (app) {
    // always hide checkboxes on small devices initially
    if (!_.device('smartphone')) return
    app.props.set('checkboxes', false)
    app.listView.toggleCheckboxes(false)
  },

  // Scroll to top if new unseen messages arrive
  'auto-scroll' (app) {
    app.listView.on('add', function (model, index) {
      // only for top position
      if (index !== 0) return
      // only for unseen messages
      if (!util.isUnseen(model.toJSON())) return
      // only scroll to top if scroll position is below 50% of outer height
      const height = app.listView.$el.height() / 2
      if (app.listView.$el.scrollTop() > height) return
      // scroll to top
      app.listView.$el.scrollTop(0)
    })
  },

  'get-view-options' (app) {
    app.getViewOptions = function (folderId) {
      const settings = app.settings
      const isSentOrDrafts = accountAPI.is('sent|drafts', folderId)
      const supportsAttachmentMarker = folderAPI.pool.getModel(folderId).supports('ATTACHMENT_MARKER')
      return util.getViewOptions({ folderId, settings, isSentOrDrafts, supportsAttachmentMarker })
    }
  },

  'prop-folderview' (app) {
    app.props.set('folderview', _.device('smartphone') ? false : app.settings.get('folderview/visible/' + _.display(), true))
  },

  'change:sort' (app) {
    app.props.on('change:sort', function (model, value) {
      model = app.listView.model
      // resolve from-to
      if (value === 'from-to') value = accountAPI.is('sent|drafts', model.get('folder')) ? 604 : 603
      // do not accidentally overwrite other attributes on folder change
      if (!app.changingFolders) {
        // set proper order first
        model.set('order', (/^(610|661|608|102|660|651)$/).test(value) ? 'desc' : 'asc', { silent: true })
        app.props.set('order', model.get('order'))
      }
      // now change sort columns
      model.set({ sort: value })
    })
  },

  'change:order' (app) {
    app.props.on('change:order', function (model, value) {
      app.listView.model.set('order', value)
    })
  },

  'change:thread' (app) {
    app.props.on('change:thread', function (model, value) {
      if (!app.changingFolders && app.listView.collection) {
        // Bug 58207: manual gc, delay to avoid visual distractions for the user
        const collection = app.listView.collection
        _.defer(function () {
          collection.reset()
          collection.setComplete(false)
        })
      }
      app.listView.model.set('thread', !!value)
    })
  },

  isThreaded (app) {
    app.isThreaded = function () {
      if (app.folder.get() === 'virtual/all-unseen') return false
      if (app.props.get('searching')) return false
      return app.props.get('thread')
    }
  },

  getContextualData (app) {
    // get data required for toolbars and context menus
    // selection is array of strings (cid)
    app.getContextualData = function (selection) {
      const isThreaded = app.isThreaded()
      const data = api.resolve(selection, isThreaded)
      return { app, data, folder_id: app.folder.get(), isThread: isThreaded }
    }
  },

  'store-view-options' (app) {
    app.props.on('change', _.debounce(function () {
      if (app.props.get('find-result')) return
      const folder = app.folder.get()
      const data = app.props.toJSON()

      app.settings
        .set(['viewOptions', folder], { sort: data.sort, order: data.order, thread: data.thread })
        .set('categories/enabled', data.categories)

      if (_.device('!smartphone')) {
        app.settings
          .set('layout', data.layout)
          .set('listViewLayout', data.listViewLayout)
      }
      app.settings.save()
    }, 500))
  },

  'restore-view-options' (app) {
    const data = app.getViewOptions(app.folder.get())
    // marker so the change:sort listener does not change other attributes (which would be wrong in that case)
    app.changingFolders = true
    app.props.set(data)
    app.changingFolders = false
  },

  'list-view-control' (app) {
    app.listControl = new ListViewControl({ id: 'io.ox/mail', listView: app.listView, app })
    app.left.append(
      app.listControl.render().$el
        .attr('aria-label', gt('Messages'))
        .find('.toolbar')
      // #. toolbar with 'select all' and 'sort by'
        .attr('aria-label', gt('Messages options'))
        .end()
    )
    // turn top toolbar into bottom toolbar on smartphones
    if (_.device('smartphone')) {
      app.listControl.$('.toolbar.bottom').hide()
      app.listControl.$('.toolbar.top').removeClass('top').addClass('bottom')
      app.listControl.$el.removeClass('toolbar-top-visible')
    }
    // make resizable
    app.listControl.resizable()
  },

  textPreview (app) {
    // default is true (for testing) until we have cross-stack support
    const support = settings.get('features/textPreview', true)

    app.supportsTextPreview = function () {
      return support
    }

    app.supportsTextPreviewConfiguration = function () {
      const id = app.folder.get()
      return support && (accountAPI.isPrimary(id) || id === 'virtual/all-unseen' || id === api.allFlaggedMessagesFolder)
    }

    app.useTextPreview = function () {
      return settings.get('showTextPreview') && app.supportsTextPreviewConfiguration()
    }

    app.on('resume', function () {
      // Viewport calculations are invalid when app is invisible (See Bug 58552)
      this.listView.fetchTextPreview()
    })
  },

  'thread-view' (app) {
    if (_.device('smartphone')) return
    app.threadView = new ThreadView.Desktop({ app })
    app.right.append(app.threadView.render().$el)
  },

  'thread-view-mobile' (app) {
    if (!_.device('smartphone')) return

    // showing single mails will be done with the plain desktop threadview
    app.threadView = new ThreadView.Mobile()
    app.threadView.$el.on('showmail', function (event) {
      const cid = $(event.target).data().cid
      app.showMail(cid)
      app.pages.changePage('detailView')
    })

    app.pages.getPage('threadView').append(app.threadView.render().$el)
  },

  'selection-message' (app) {
    app.right.append(
      $('<div class="flex-center multi-selection-message"><div class="message"></div></div>')
    )
  },

  // Connect thread view's top navigation with list view
  navigation (app) {
    // react on thread view navigation
    app.threadView.on({
      back () {
        app.getWindow().nodes.main.removeClass('preview-visible')
        app.listView.focus()
      },
      previous () {
        app.listView.previous()
      },
      next () {
        app.listView.next()
      }
    })
  },

  // Selection changes in list view should be reflected in thread view navigation
  position (app) {
    function update () {
      const list = app.listView
      app.threadView.updatePosition(list.getPosition() + 1)
        .togglePrevious(list.hasPrevious())
        .toggleNext(list.hasNext())
    }

    app.listView.on('selection:action', update)

    update()
  },

  'folder:change' (app) {
    // close mail detail view in list-mode on folder selection
    app.folderView.tree.on('selection:action', function () {
      // bug only if detail view is actually visible (see bug 45597)
      if (app.props.get('layout') === 'list' && app.getWindow().nodes.main.hasClass('preview-visible')) {
        app.threadView.trigger('back')
      }
    })

    app.on('folder:change', function (id) {
      if (app.props.get('mobileFolderSelectMode')) return

      // marker so the change:sort listener does not change other attributes (which would be wrong in that case)
      app.changingFolders = true

      const options = app.getViewOptions(id)

      app.props.set(_.pick(options, 'sort', 'order', 'thread'))

      // explicitly update when set to from-to (see bug 44458)
      if (options.sort === 'from-to') {
        app.listView.model.set('sort', accountAPI.is('sent|drafts', id) ? 604 : 603)
      }

      app.listView.model.set('folder', id)
      app.folder.getData()
      app.changingFolders = false
    })
  },

  'auto-subscribe' (app) {
    function subscribe (data) {
      if (data.module !== 'mail') return
      if (data.subscribed) {
        app.folderView.tree.select(data.id)
      } else {
        folderAPI.update(data.id, { subscribed: true }, { silent: true }).done(function () {
          folderAPI.refresh().done(function () {
            app.folderView.tree.select(data.id)
          })
        })
      }
    }

    app.folder.getData().done(subscribe)
    app.on('folder:change', function (id, data) { subscribe(data) })
  },

  // Change foldername on mobiles in navbar
  'folder:change-mobile' (app) {
    if (!_.device('smartphone')) return
    app.on('folder:change', function () {
      if (app.props.get('mobileFolderSelectMode')) return
      app.folder.getData().done(function (data) {
        app.pages.getNavbar('listView').setTitle(data.title)
      })
    })
  },

  // Define basic function to show an email
  'show-mail' (app) {
    if (_.device('smartphone')) return

    // This function just shows an email. Almost.
    // It has a little optimization to add some delay if a message
    // has recently been deleted. This addresses the use-case of
    // cleaning up a mailbox, i.e. deleting several messages in a row.
    // Without the delay, the UI would try to render messages that are
    // just about to be deleted as well.

    let recentDeleteEventCount = 0
    let eventTimer
    let messageTimer
    let latestMessage

    app.recentDelete = function () {
      return recentDeleteEventCount > 0
    }

    function show () {
      // check if message is still within the current collection
      if (!app.listView.collection.get(latestMessage)) return
      app.threadView.autoSelect = app.autoSelect
      delete app.autoSelect
      app.threadView.show(latestMessage, app.isThreaded())
      // a11y: used keyboard?
      if (openMessageByKeyboard || app.props.get('layout') === 'list') {
        openMessageByKeyboard = false
        // set focus
        const items = app.threadView.$('.list-item')
        const index = items.index(items.filter('.expanded'))
        items.filter('.expanded:first').find('.body').visibleFocus()
        // fix scroll position (focus might scroll down)
        if (index === 0) app.threadView.$('.scrollable').scrollTop(0)
      }
    }

    // show instantly
    app.showMail = function (cid) {
      // remember latest message
      latestMessage = cid
      // instant: no delete case
      if (!recentDeleteEventCount) return show()
      // instant: already drawn
      if (app.threadView.model && app.threadView.model.cid === cid) return show()
      // delay
      app.threadView.empty()
      clearTimeout(messageTimer)
      const delay = (recentDeleteEventCount - 1) * 1000
      messageTimer = setTimeout(show, delay)
    }

    // add delay if a mail just got deleted
    api.on('beforedelete', function () {
      if (recentDeleteEventCount < 2) recentDeleteEventCount++
      clearTimeout(eventTimer)
      eventTimer = setTimeout(function () { recentDeleteEventCount = 0 }, 4000)
    })
  },

  // Define basic function to show an email
  'show-mail-mobile' (app) {
    if (!_.device('smartphone')) return
    app.showMail = function (cid) {
      // render mail view and append it to detail view's page
      app.pages.getPage('detailView')
        .empty().append(app.threadView.renderMail(cid))
    }
  },

  // Define basic function to show an thread overview on mobile
  'mobile-show-thread-overview' (app) {
    // clicking on a thread will show a custom overview
    // based on a custom threadview only showing mail headers
    app.showThreadOverview = function (cid) {
      app.threadView.show(cid, app.isThreaded())
    }
  },

  // Define basic function to reflect empty selection
  'show-empty' (app) {
    app.showEmpty = function () {
      app.threadView.empty()
      app.right.find('.multi-selection-message .message').empty().append(
        $.svg({ src: 'themes/default/illustrations/empty-selection.svg', width: 200, height: 96, role: 'presentation' })
          .addClass('illustration'),
        $('<div>').text(gt('No message selected'))
      ).attr('id', 'mail-multi-selection-message')
    }
  },

  // Define function to reflect multiple selection
  'show-multiple' (app) {
    if (_.device('smartphone')) return

    app.showMultiple = function (list) {
      app.threadView.empty()
      list = api.resolve(list, app.isThreaded())

      // check if a folder is selected
      const id = app.folder.get()
      const model = folderAPI.pool.getModel(id)
      const total = model.get('total')
      const search = app.get('find') && app.get('find').isActive()

      // defer so that all selection events are triggered (e.g. selection:all)
      _.defer(function () {
        const count = $('<span class="number">').text(list.length).prop('outerHTML')
        app.right.find('.multi-selection-message .message')
          .empty()
          .attr('id', 'mail-multi-selection-message')
          .append(
            $.svg({ src: 'themes/default/illustrations/empty-selection.svg', width: 200, height: 96, role: 'presentation' })
              .addClass('illustration'),
            // message
            $('<div>').append(
              // although we are in showMultiple, we could just have one message if selection mode is alternative
              // #. %1$d is the number of selected messages
              gt.ngettext('%1$d message selected', '%1$d messages selected', count, count)
            ),
            // inline actions
            id && total > list.length && !search
              ? $('<div class="inline-actions selection-message">').append(
                // although "total" is always greater than 1, "gt.ngettext" must be used to produce correct plural forms for some languages!
                gt.ngettext(
                  'There is %1$d message in this folder; not all messages are displayed in the list currently.',
                  'There are %1$d messages in this folder; not all messages are displayed in the list currently.',
                  total, total
                )
              ).hide()
              : $()
          )
      })
    }

    app.showSelectionMessage = function () {
      _.defer(function () {
        app.right.find('.selection-message').show()
      })
    }
  },

  // Define function to reflect multiple selection
  'show-multiple-mobile' (app) {
    if (_.device('!smartphone')) return

    app.showMultiple = function (list) {
      app.threadView.empty()
      if (list) {
        list = api.resolve(list, app.isThreaded())
        app.pages.getCurrentPage().navbar.setTitle(
          // #. This is a short version of "x messages selected", will be used in mobile mail list view
          gt('%1$d selected', list.length))
        // re-render toolbar
        app.pages.getCurrentPage().secondaryToolbar.render()
      } else {
        app.folder.getData().done(function (data) {
          app.pages.getCurrentPage().navbar.setTitle(data.title)
        })
      }
    }
  },

  'page-change-detail-view-mobile' () {
    app.pages.getPage('detailView').on('header_ready', function () {
      app.pages.changePage('detailView')
    })
  },

  'selection-mobile' (app) {
    if (!_.device('smartphone')) return
    app.listView.on({
      'selection:empty' () {
        if (app.props.get('checkboxes')) app.showMultiple(false)
      },
      'selection:one' (list) {
        if (app.props.get('checkboxes')) app.showMultiple(list)
      },
      'selection:multiple' (list) {
        if (app.props.get('checkboxes')) app.showMultiple(list)
      },
      'selection:action' (list) {
        const isDraftFolder = _.contains(accountAPI.getFoldersByType('drafts'), this.model.get('folder'))

        if (app.listView.selection.get().length === 1 && !app.props.get('checkboxes')) {
          // check for thread
          const cidString = list[0]
          const isThread = this.collection.get(cidString).get('threadSize') > 1

          if (isDraftFolder) {
            const cidObject = _.cid(cidString)
            registry.call('io.ox/mail/compose', 'open', { type: 'edit', original: { folderId: cidObject.folder_id, id: cidObject.id } })
          } else if (isThread) {
            app.showThreadOverview(cidString)
            app.pages.changePage('threadView')
          } else {
            // no page change here, bound via event
            app.showMail(cidString)
          }
        }
      }
    })
  },

  // Respond to single and multi selection in list view
  selection (app) {
    if (_.device('smartphone')) return

    function resetRight (className) {
      return app.right
        .removeClass('selection-empty selection-one selection-multiple'.replace(className, ''))
        .addClass(className)
    }

    function resetLeft (className) {
      return app.left
        .removeClass('selection-empty selection-one selection-multiple'.replace(className, ''))
        .addClass(className)
    }

    const react = _.debounce(function (type, list) {
      app.getWindow().nodes.main.removeClass('preview-visible')
      if (app.props.get('layout') === 'list' && type === 'action') {
        app.getWindow().nodes.main.addClass('preview-visible')
        resetRight('selection-one preview-visible')
        resetLeft('selection-one')
        app.showMail(list[0])
        return
      } else if (app.props.get('layout') === 'list' && type === 'one') {
        // don't call show mail (an invisible detail view would be drawn which marks it as read)
        resetRight('selection-one')
        resetLeft('selection-one')
        return
      }

      switch (type) {
        case 'empty':
          resetRight('selection-empty')
          resetLeft('selection-empty')
          app.showEmpty()
          break
        case 'one':
        case 'action':
          resetRight('selection-one')
          resetLeft('selection-one')
          app.showMail(list[0])
          break
        case 'multiple':
          resetRight('selection-multiple')
          resetLeft('selection-multiple')
          app.showMultiple(list)
          break
                    // no default
      }
    }, 1)

    app.listView.on({
      'selection:empty' () {
        app.right.find('.multi-selection-message div').attr('id', null)
        react('empty')
      },
      'selection:one' (list) {
        app.right.find('.multi-selection-message div').attr('id', null)
        let type = 'one'
        if (app.listView.selection.getBehavior() === 'alternative') {
          type = 'multiple'
        }
        react(type, list)
      },
      'selection:multiple' (list) {
        app.right.find('.multi-selection-message div').attr('id', null)
        // no debounce for showMultiple or screen readers read old number of selected messages
        resetRight('selection-multiple')
        resetLeft('selection-multiple')
        app.showMultiple(list)
      },
      'selection:action' (list) {
        app.right.find('.multi-selection-message div').attr('id', null)
        // make sure we are not in multi-selection
        if (app.listView.selection.get().length === 1) react('action', list)
      },
      'selection:showHint' () {
        // just enable the info text in right side
        app.showSelectionMessage()
      }
    })
  },

  'preserve-selection' (app) {
    if (_.device('smartphone')) return
    app.listView.on({
      'selection:add' (list) {
        // only preserve items, if the current collection is sort by unread
        if (app.props.get('sort') !== 651) return
        list.forEach(function (cid) {
          api.pool.preserveModel(cid, true)
        })
      },
      'selection:remove' (list) {
        list.forEach(function (cid) {
          api.pool.preserveModel(cid, false)
        })
      }
    })
  },

  'header:copy-pure-text' (app) {
    app.right.get(0).addEventListener('copy', e => {
      if (!e.target.closest('.detail-view-header')) return
      const selection = window.getSelection().toString()
      e.clipboardData.setData('text/plain', selection.replace(/\n/g, ' ').trim())
      e.preventDefault()
    })
  },

  // Thread view navigation must respond to changing layout
  'change:layout' (app) {
    app.props.on('change:layout', function (model, value) {
      app.threadView.toggleNavigation(value === 'list')
      apps.trigger('layout', app)
    })

    app.threadView.toggleNavigation(app.props.get('layout') === 'list')
  },

  'apply-layout' (app) {
    if (_.device('smartphone')) return
    app.applyLayout = function () {
      const layout = app.props.get('layout')
      const nodes = app.getWindow().nodes
      const savedWidth = app.settings.get('listview/width/' + _.display())
      const savedHeight = app.settings.get('listview/height/' + _.display())

      function applyWidth (x) {
        const width = x === undefined ? '' : x + 'px'
        app.left.css('width', width)
      }

      function applyHeight (x) {
        const height = x === undefined ? '' : x + 'px'
        app.left.css('height', height)
      }

      // remove inline styles from using the resize bar
      app.left.css({ width: '', height: '' })

      if (layout === 'vertical') {
        nodes.main.addClass('preview-right').removeClass('preview-bottom preview-none')
        if (!_.device('touch')) applyWidth(savedWidth)
      } else if (layout === 'horizontal') {
        nodes.main.addClass('preview-bottom').removeClass('preview-right preview-none')
        if (!_.device('touch')) applyHeight(savedHeight)
      } else if (layout === 'list') {
        nodes.main.addClass('preview-none').removeClass('preview-right preview-bottom')
      }

      // relocate toolbar
      const toolbar = nodes.body.find('.classic-toolbar-container')

      if (layout === 'vertical') {
        app.right.prepend(toolbar)
        app.left.addClass('translucent-low')
        app.right.addClass('translucent-medium')
        nodes.body.removeClass('translucent-low rounded-tl')
      } else {
        app.left.removeClass('translucent-low')
        app.right.removeClass('translucent-medium')
        nodes.body.addClass('translucent-low rounded-tl').prepend(toolbar)
      }

      if (layout !== 'list' && app.props.previousAttributes().layout === 'list' && !app.getWindow().nodes.main.hasClass('preview-visible')) {
        // list view did not create a detail view for the last mail, it was only selected, so detail view needs to be triggered manually(see bug 33456)
        // only trigger if we actually have selected mails
        if (app.listView.selection.get().length > 0) {
          app.listView.selection.selectEvents(app.listView.selection.getItems())
        }
      }

      this.listControl.applySizeConstraints()
    }

    app.props.on('change:layout', function () {
      // check if view dropdown has focus and restore the focus after rendering
      const body = app.getWindow().nodes.body
      const focus = body.find('*[data-dropdown="view"] a:first').is(':focus')
      app.applyLayout()
      app.listView.redraw()
      if (focus) body.find('*[data-dropdown="view"] a:first').focus()
    })

    app.getWindow().on('show:initial', function () {
      app.applyLayout()
    })
  },

  // Respond to global refresh
  refresh (app) {
    api.on('refresh.all', function reload () {
      app.listView.reload()
    })
  },

  // Respond total/unread number changes when folder is reloaded (this may happen independent from refresh)
  reloadOnFolderChange (app) {
    api.on('changesAfterReloading', function reload () {
      app.listView.reload()
    })
  },

  // auto select first seen email (only on initial startup)
  'auto-select' (app) {
    // no auto-selection needed on smartphones
    if (_.device('smartphone')) return
    if (!settings.get('autoSelectNewestSeenMessage')) return
    // old setting
    if (!settings.get('autoselectMailOnStart', true)) return

    const select = function () {
      app.listView.collection.find(function (model, index) {
        if (!util.isUnseen(model.get('flags'))) {
          app.autoSelect = true
          // select but keep focus in top bar. Don't use set here, as it breaks alternative selection mode (message is selected instead of displayed)
          app.listView.selection.select(index, false, false)
          // scroll node into view
          app.listView.selection.getItems().eq(index).attr('tabindex', '0').intoViewport()
          return true
        }
        return false
      })
    }

    app.listView.on('first-reset', function () {
      if (app.props.get('layout') === 'list') {
        app.props.once('change:layout', function () {
          if (app.listView.selection.get().length) return
          // defer to have a visible window
          _.defer(select)
        })
        return
      }
      // defer to have a visible window
      _.defer(select)
    })
  },

  'init-navbarlabel-mobile' (app) {
    if (!_.device('smartphone')) return

    // prepare first start
    app.listView.on('first-reset', function () {
      app.folder.getData().done(function (data) {
        app.pages.getNavbar('listView').setTitle(data.title)
      })
    })
  },

  // Prefetch first n relevant (unseen) emails
  prefetch (app) {
    const count = settings.get('prefetch/count', 5)
    if (!_.isNumber(count) || count <= 0) return

    app.prefetch = function (collection) {
      // get first 10 undeleted emails
      http.pause()
      collection
        .chain()
        .filter(mailModel => !util.isDeleted(mailModel))
        .slice(0, count)
        .each(function (mailModel) {
          const thread = mailModel.get('thread') || [mailModel.toJSON()]

          for (let i = thread.length - 1; i >= 0; i--) {
            let threadMailModel = thread[i]
            // get data
            if (_.isString(threadMailModel)) threadMailModel = _.cid(threadMailModel)
            // most recent or first unseen? (in line with threadview's autoSelectMail)
            if ((i === 0 || util.isUnseen(threadMailModel)) && !util.isDeleted(threadMailModel)) {
              api.get({ folder: threadMailModel.folder_id, id: threadMailModel.id, unseen: true })
              break
            }
          }
        })
      http.resume()
    }

    app.listView.on('first-reset', app.prefetch)
  },

  'prefetch-message' (app) {
    if (_.device('smartphone')) return
    if (!settings.get('prefetch/next', true)) return

    app.listView.on('selection:one', function () {
      // do not prefetch if a message has just been deleted
      if (app.recentDelete()) return

      const items = this.selection.getItems()
      const position = this.selection.getPosition(items)
      const direction = this.selection.getDirection()
      const last = items.length - 1
      let next

      if (direction === 'down' && position < last) next = items.eq(position + 1)
      else if (direction === 'up' && position > 0) next = items.eq(position - 1)
      if (next) {
        next = _.cid(next.attr('data-cid'))
        next.unseen = true
        api.get(next)
      }
    })
  },

  // Prefetch mail-compose code
  'prefetch-compose' () {
    if (_.device('smartphone')) return
    setTimeout(async function () {
      await loadBundle('compose.js')
      await import('@/io.ox/mail/compose/main')
      const { default: snippets } = await import('@/io.ox/core/api/snippets')
      // prefetch signatures
      snippets.getAll()
    }, 3000)
  },

  'connect-loader' (app) {
    app.listView.connect(api.collectionLoader)
  },

  // Select next item in list view if current item gets deleted
  'before-delete' (app) {
    // fixes scrolling issue on mobiles during delete
    if (_.device('smartphone')) return
    if (!settings.get('features/selectBeforeDelete', true)) return

    function isSingleThreadMessage (messageIds, selection) {
      if (messageIds.length !== 1) return false
      if (selection.length !== 1) return false
      const firstMessageCid = _.cid(messageIds[0])
      const selectionCid = String(selection[0]).replace(/^thread\./, '')

      return firstMessageCid !== selectionCid
    }

    api.on('beforedelete beforeexpunge', function (event, ids) {
      const selection = app.listView.selection.get()
      if (isSingleThreadMessage(ids, selection)) return
      // make sure to have strings
      if (ids.length > 0 && !_.isString(ids[0])) ids = ids.map(_.cid)
      // looks for intersection
      if (_.intersection(ids, selection).length) {
        app.listView.selection.dodge()
        // we might have removed the mail defining the thread, so we need to refresh
        // the list or the thread will be gone until next refresh
        if (app.isThreaded()) api.one('deleted-mails', function () { app.listView.reload() })
        if (ids.length === 1) return
        app.listView.onBatchRemove(ids.slice(1))
      }
    })
  },

  'before-delete-mobile' (app) {
    if (!_.device('smartphone')) return
    // if a mail will be deleted in detail view, go back one page
    api.on('beforedelete', function () {
      if (app.pages.getCurrentPage().name === 'detailView') {
        // check if the threadoverview is empty
        if (app.isThreaded() && app.threadView.collection.length === 1) {
          app.pages.changePage('listView', { animation: 'slideright' })
        } else {
          app.pages.goBack()
        }
      }
      app.listView.selection.selectNone()
    })
  },

  'drag-drop' () {
    app.getWindow().nodes.outer.on('selection:drop', function (event, _baton) {
      const baton = ext.Baton(app.getContextualData(_baton.data))
      baton.target = _baton.target
      actionsUtil.invoke('io.ox/mail/actions/move', baton)
    })
  },

  // Handle archive event based on keyboard shortcut
  'selection-archive' () {
    // selection is array of strings (cid)
    app.listView.on('selection:archive', function (selection) {
      const baton = ext.Baton(app.getContextualData(selection))
      actionsUtil.invoke('io.ox/mail/actions/archive', baton)
    })
  },

  // Handle delete event based on keyboard shortcut or swipe gesture
  'selection-delete' () {
    app.listView.on('selection:delete', function (selection, shiftDelete) {
      const baton = ext.Baton(app.getContextualData(selection))
      baton.options.shiftDelete = shiftDelete
      actionsUtil.invoke('io.ox/mail/actions/delete', baton)
    })
  },

  // Add support for selection
  'selection-doubleclick' (app) {
    // detail app does not make sense on small devices
    // they already see emails in full screen
    if (_.device('smartphone')) return
    app.listView.on('selection:doubleclick', function (list) {
      if (app.props && app.props.get('layout') === 'list') return
      if (app.isThreaded()) list = api.threads.get(list[0]).map(model => model.cid)
      const cidString = list[0]
      const cidObject = _.cid(cidString)
      const isDraft = accountAPI.is('drafts', cidObject.folder_id)
      if (isDraft) {
        api.get(cidObject).then(function (data) {
          actionsUtil.invoke('io.ox/mail/actions/edit', data)
        })
      } else {
        ox.launch(() => import('@/io.ox/mail/detail/main'), { cid: cidString })
      }
    })
  },

  // Add support for selection on mobile
  'selection-mobile-swipe' (app) {
    if (_.device('!smartphone')) return

    ext.point('io.ox/mail/mobile/swipeButtonMore').extend({
      draw (baton) {
        new ActionDropdownView({ el: this, point: 'io.ox/mail/links/inline', caret: false })
          .setSelection(baton.array(), { data: baton.array(), app, isThread: baton.isThread })
      }
    })

    app.listView.on('selection:more', function (list, node) {
      const baton = ext.Baton({ data: list })
      // remember if this list is based on a single thread
      baton.isThread = baton.data.length === 1 && /^thread\./.test(baton.data[0])
      // resolve thread
      baton.data = api.resolve(baton.data, app.isThreaded())
      // call action
      // we open a dropdown here with options.
      ext.point('io.ox/mail/mobile/swipeButtonMore').invoke('draw', node, baton)
      _.defer(() => node.find('button.dropdown-toggle').click())
    })
  },

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

  'change:checkboxes' (app) {
    if (_.device('smartphone')) return
    if (app.listView.selection.getBehavior() === 'alternative') {
      app.listView.toggleCheckboxes(true)
    } else {
      app.props.on('change:checkboxes', function (model, value) {
        app.listView.toggleCheckboxes(value)
      })
    }
  },

  // Respond to change:checkboxes on mobiles. Change "edit" to "cancel" on button
  'change:checkboxes-mobile' (app) {
    if (_.device('!smartphone')) return

    // initial hide
    app.listControl.$el.toggleClass('toolbar-bottom-visible', false)

    app.props.on('change:checkboxes', function (model, value) {
      app.listView.toggleCheckboxes(value)
      app.listControl.$el.toggleClass('toolbar-bottom-visible', value)
      if (value) {
        app.pages.getNavbar('listView')
          .setRight(gt('Cancel'))
          .hide('.left')
      } else {
        app.pages.getNavbar('listView')
          .setRight(gt('Edit'))
          .show('.left')
        // reset navbar title on cancel
        app.folder.getData().done(function (data) {
          app.pages.getCurrentPage().navbar.setTitle(data.title)
        })

        // reset selection
        app.listView.selection.selectNone()
      }
    })
  },

  // Respond to change of view options that require redraw
  'change:viewOptions' (app) {
    //
    settings.on('change:exactDates change:alwaysShowSize change:showTextPreview', redraw)

    app.props.on('change:listViewLayout', function (model, value) {
      app.props.set({ checkboxes: value === 'checkboxes', showAvatars: value === 'avatars' })
      redraw()
    })

    function redraw () {
      app.listView.redraw()
      app.listView.$el.trigger('scroll')
      toggleClasses()
    }

    // update classes on folder change, e.g. text preview is not available for external accounts
    app.on('folder:change', toggleClasses)
    toggleClasses()

    function toggleClasses () {
      app.listView.$el
        .toggleClass('show-avatars', app.props.get('showAvatars'))
        .toggleClass('show-text-preview', app.useTextPreview())
    }
  },

  'fix-mobile-lazyload' (app) {
    if (_.device('!smartphone')) return
    // force lazyload to load, otherwise the whole pane will stay empty...
    app.pages.getPage('detailView').on('pageshow', function () {
      $(this).scrollTop(0)
      $(this).find('li.lazy').trigger('scroll')
    })
  },

  // respond to pull-to-refresh in mail list on mobiles
  'on:pull-to-refresh' (app) {
    if (_.device('!touch')) return
    app.on('pull-to-refresh', function () {
      api.refresh().always(function () {
        app.listView.removePullToRefreshIndicator()
      })
    })
  },

  'contextual-help' (app) {
    app.getContextualHelp = function () {
      return 'ox.appsuite.user.sect.email.gui.html'
    }
  },

  a11y (app) {
    app.listView.$el.attr('aria-label', gt('List view'))
    // mail list: focus mail detail view on <enter>
    // mail list: focus folder on <escape>
    app.listView.$el.on('keydown', '.list-item', function (event) {
      // focus message?
      if (event.which === 13) {
        openMessageByKeyboard = true
        return
      }
      // if a message is selected (mouse or keyboard) the focus is set on body
      if (event.which === 27) {
        app.folderView.tree.$('.folder.selected').focus()
        return false
      }
    })
    // detail view: return back to list view via <escape>
    app.threadView.$el.on('keydown', function (event) {
      if (event.which !== 27) return
      if ($(event.target).is('.dropdown-toggle, :input')) return
      // make sure the detail view closes in list layout
      app.getWindow().nodes.main.removeClass('preview-visible')
      app.listView.restoreFocus(true)
    })
    // folder tree: focus list view on <enter>
    app.folderView.tree.$el.on('keydown', '.folder', function (event) {
      // check if it's really the folder - not the contextmenu toggle
      if (!$(event.target).hasClass('folder')) return
      if (event.which === 13) app.listView.restoreFocus(true)
    })
  },

  'auto-expunge' (app) {
    if (!settings.get('features/autoExpunge', false)) return

    function isDeleted (model) {
      return (model.get('flags') & 2) === 2
    }

    app.listView.on('collection:load collection:paginate collection:reload', function () {
      // any deleted message?
      const any = this.collection.any(isDeleted)
      if (any) api.expunge(app.folder.get())
    })
  },

  // change to default folder on no permission or folder not found errors
  'folder-errors' (app) {
    // will be thrown if the external mail account server somehow does not support starttls anymore
    folderAPI.on('error:MSG-0092', function (error) {
      yell(error)
    })
    app.folder.handleErrors()

    // deactivated secondary mail account
    ox.on('account:status', function (data) {
      if (!data.deactivated) return
      if (app.folder.get().indexOf(data.root_folder) < 0) return
      app.folder.setDefault()
    })
  },

  'database-drafts' () {
    // edit of existing draft
    composeAPI.on('before:send before:save', function (id, data) {
      const editFor = data.meta.editFor
      if (!editFor || data.mailPath) return

      const cid = _.cid({ id: editFor.originalId, folder_id: editFor.originalFolderId })
      const draftIds = accountAPI.getFoldersByType('drafts')
      draftIds.forEach(function (id) {
        api.pool.getByFolder(id).forEach(function (collection) {
          collection.remove(cid)
        })
      })
    })
    // new draft created
    composeAPI.on('after:save', function (data) {
      if (data.mailPath) return
      const folder = app.folder.get()
      if (accountAPI.is('drafts', folder)) app.listView.reload()
    })
    // existing draft removed
    composeAPI.on('after:send', function (data) {
      const editFor = data.meta.editFor
      if (!editFor || data.mailPath) return
      const folder = app.folder.get()
      if (accountAPI.is('drafts', folder)) app.listView.reload()
    })
  },

  'real-drafts' () {
    // edit of existing draft
    composeAPI.on('before:send', function removeFromPool (space, data) {
      if (!data.mailPath) return
      const id = (data.mailPath || {}).id
      const folder = (data.mailPath || {}).folderId
      api.pool.getByFolder(folder).forEach(function (collection) {
        collection.remove(_.cid({ id, folder_id: folder }))
      })
    })

    composeAPI.on('after:remove', function refreshDrafts (data, result) {
      if (data.mailPath.folderId === 'default0/Drafts' && result.success) folderAPI.get(data.mailPath.folderId, { cache: false })
    })

    // update
    composeAPI.on('after:send after:update after:remove after:save add mailref:changed', function refreshFolder (data, result) {
      const mailPath = data.mailPath || result.mailPath
      if (!mailPath) return
      // immediate reload when currently selected
      const folder = app.folder.get()
      if (accountAPI.is('drafts', folder)) return app.listView.reload()
      // delayed reload on next select

      api.pool.getByFolder(mailPath.folderId).forEach(function (collection) {
        collection.expire()
      })
    })
  },

  'refresh-folders' () {
    const resetMailFolders = _.throttle(function () {
      // reset collections and folder (to update total count)
      const affectedFolders = ['inbox', 'sent', 'drafts']
        .map(function (type) {
          const folders = accountAPI.getFoldersByType(type)
          api.pool.resetFolder(folders)
          return folders
        })
        .flat()
      folderAPI.multiple(affectedFolders, { cache: false })
      api.trigger('refresh.all')
    }, 5000, { leading: false })

    function refreshFolders (data, result) {
      if (result.error) {
        return $.Deferred().reject(result).promise()
      } else if (result.data) {
        const folder = result.data.folderId
        $.when(accountAPI.getUnifiedMailboxName(), accountAPI.getPrimaryAddress())
          .done(function (isUnified, senderAddress) {
            // check if mail was sent to self to update inbox counters correctly
            let sendToSelf = false
            _.chain(_.union(data.to, data.cc, data.bcc)).each(function (item) {
              if (item[1] === senderAddress[1]) {
                sendToSelf = true
              }
            })
            // wait a moment, then update folders as well
            setTimeout(function () {
              if (isUnified !== null) {
                folderAPI.refresh()
              } else if (sendToSelf) {
                folderAPI.reload(folder, accountAPI.getInbox())
              } else {
                folderAPI.reload(folder)
              }
            }, 5000)
          })
      }
    }

    // only needed for db-based drafts
    composeAPI.on('after:save', function (data, result) {
      if (data.mailPath) return
      resetMailFolders()
      refreshFolders(data, result)
    })

    composeAPI.on('after:send', function (data, result) {
      resetMailFolders()
      refreshFolders(data, result)
    })
  },

  sidepanel (app) {
    if (_.device('smartphone')) return
    ext.point('io.ox/mail/sidepanel').extend({
      id: 'tree',
      index: 100,
      draw (baton) {
        this.append(baton.app.treeView.$el)
      }
    })
  },

  'primary-action' (app) {
    // we don't offer this for guests at all
    if (capabilities.has('guest')) {
      const sidepanel = app.getWindow().nodes.sidepanel.addClass('pt-16')
      ext.point('io.ox/mail/sidepanel').invoke('draw', sidepanel, ext.Baton({ app }))
      return
    }

    ext.point('io.ox/mail/sidebar').extend({
      id: 'standard-folders',
      index: 100,
      async draw () {
        const $el = $('<div role="presentation">').appendTo(this)
        const folders = await folderAPI.list('virtual/standard')
        folders.forEach(folder => {
          const type = accountAPI.getType(folder.id)
          const icon = util.getMailFolderIcon(folder.id)
          $el.append(
            $('<button type="button" class="btn btn-default">')
              .attr({ 'data-type': type, 'data-id': folder.id, title: folder.title })
              .append(createIcon(icon))
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
      point: 'io.ox/mail',
      label: gt('New email'),
      action: 'io.ox/mail/actions/compose',
      icon: 'bi/pencil.svg'
    })

    function setFolder (event) {
      event.data.app.folder.set(event.data.id)
    }
  },

  'unified-folder-support' () {
    // only register if we have a unified mail account
    accountAPI.getUnifiedMailboxName().done(function (unifiedMailboxName) {
      if (!unifiedMailboxName) {
        return
      }

      const checkForSync = function (model) {
        // check if we need to sync unified folders
        const accountId = api.getAccountIDFromFolder(model.get('folder_id'))
        const folderTypes = {
          7: 'INBOX',
          9: 'Drafts',
          10: 'Sent',
          11: 'Spam',
          12: 'Trash'
        }

        return accountAPI.get(accountId).then(function (accountData) {
          let folder, originalFolderId, unifiedFolderId, unifiedSubfolderId
          if (!accountData) {
            folder = folderAPI.pool.models[model.get('folder_id')]
            // check if we are in the unified folder
            if (folder && folder.is('unifiedfolder')) {
              originalFolderId = model.get('original_folder_id')
              unifiedSubfolderId = model.get('folder_id') + '/' + originalFolderId
              // unified folder has special mail ids
              const id = model.get('original_id')

              return [{ folder_id: originalFolderId, id }, { folder_id: unifiedSubfolderId, id }]
            }
            // check if we are in the unified folder's subfolder
            folder = folderAPI.pool.models[folder.get('folder_id')]
            if (folder && folder.is('unifiedfolder')) {
              unifiedFolderId = folder.id
              originalFolderId = model.get('folder_id').replace(folder.id + '/', '')
              // unified folder has special mail ids

              return [{ folder_id: unifiedFolderId, id: originalFolderId + '/' + model.get('id') }, { folder_id: originalFolderId, id: model.get('id') }]
            }
            // check if we are in a standard folder that needs to be synced to a unified folder
          } else if (accountData.unified_inbox_enabled) {
            folder = folderAPI.pool.models[model.get('folder_id')]
            const folderType = folderTypes[folder.get('standard_folder_type')]

            if (folderType) {
              unifiedFolderId = unifiedMailboxName + '/' + folderType
              unifiedSubfolderId = unifiedFolderId + '/' + folder.get('id')
              // unified folder has special mail ids

              return [{ folder_id: unifiedFolderId, id: model.get('folder_id') + '/' + model.get('id') }, { folder_id: unifiedSubfolderId, id: model.get('id') }]
            }
          }
          return $.Deferred().reject()
        })
      }

      api.pool.get('detail').on('change:flags', function (model, value, options) {
        options = options || {}

        if (!model || options.unifiedSync) return

        // get previous and current flags to determine if unseen bit has changed
        const previous = util.isUnseen(model.previous('flags'))
        const current = util.isUnseen(model.get('flags'))
        if (previous === current) return
        checkForSync(model).done(function (mailsToSync) {
          mailsToSync.forEach(function (mail) {
            const obj = api.pool.get('detail').get(_.cid(mail))

            if (obj) {
              const changes = {
                flags: current ? obj.get('flags') & ~32 : obj.get('flags') | 32
              }
              if (!current) {
                changes.unseen = false
              }
              obj.set(changes, { unifiedSync: true })

              // update thread model
              api.threads.touch(obj.attributes)
              api.trigger('update:' + _.ecid(obj.attributes), obj.attributes)
            } else {
              // detail models not loaded yet. Just trigger folder manually
              folderAPI.changeUnseenCounter(mail.folder_id, current ? +1 : -1)
            }
            // mark folder as expired in pool (needed for listviews to draw correct)
            api.pool.resetFolder(mail.folder_id)
          })
        })
      })

      api.pool.get('detail').on('remove', function (model) {
        if (!model) return
        // check if removed message was unseen
        const unseen = util.isUnseen(model.get('flags'))
        checkForSync(model).done(function (modelsToSync) {
          modelsToSync.forEach(function (mail) {
            if (unseen) {
              folderAPI.changeUnseenCounter(mail.folder_id, -1)
            }
            // mark folder as expired in pool (needed for listviews to draw correct)
            api.pool.resetFolder(mail.folder_id)
          })
        })
      })
    })
  },

  sockets (app) {
    ox.on('socket:mail:new', function (data) {
      folderAPI.reload(data.folder)
      // push arrives, other folder selected
      if (data.folder !== app.folder.get(data.folder)) {
        api.pool.getByFolder(data.folder).forEach(model => model.expire())
      } else {
        app.listView.reload()
      }
    })
  },

  'vacation-notice' (app) {
    if (!capabilities.has('mailfilter_v2')) return
    const placeholder = $('<div class="placeholder">')
    app.listControl.addToSlot({ header: placeholder })
    import('@/io.ox/mail/mailfilter/vacationnotice/indicator').then(function ({ default: VacationNoticeView }) {
      // actually `before` is called after view model was loaded (async)
      new VacationNoticeView().attachTo(placeholder).on('drawn', () => placeholder.remove())
    })
  },

  'autoforward-notice' (app) {
    if (!capabilities.has('mailfilter_v2')) return
    const placeholder = $('<div class="placeholder">')
    app.listControl.addToSlot({ header: placeholder })
    import('@/io.ox/mail/mailfilter/autoforward/indicator').then(function ({ default: AutoforwardView }) {
      // actually `before` is called after view model was loaded (async)
      new AutoforwardView().attachTo(placeholder).on('drawn', () => placeholder.remove())
    })
  },

  /**
   * Add listener for browser tab communication. Event needs a
   * 'propagate' string for propagation
   */
  'refresh-from-broadcast' () {
    if (!ox.tabHandlingEnabled) return
    const events = tabApi.communicationEvents
    events.listenTo(events, 'email-send', function () {
      const folder = app.folder.get()
      if (accountAPI.is('sent', folder) || accountAPI.is('drafts', folder)) app.listView.reload()
      folderAPI.refresh()
    })
  }
})

// launcher
app.setLauncher(function () {
  // get window
  const appWindow = ox.ui.createWindow({
    name: 'io.ox/mail',
    title: 'Inbox',
    chromeless: true
  })

  app.setWindow(appWindow)
  app.settings = settings
  window.mailapp = app

  ox.once('mail:detail:body:render', () => performance.mark('mail:detail:first_render'))

  commons.addFolderSupport(app, null, 'mail', app.options.folder)
    .always(function always () {
      app.mediate()
      appWindow.show()
    })
    .fail(function fail (result) {
      // missing folder information indicates a connection failure
      const message = settings.get('folder/inbox') && result && result.error
        ? result.error + ' ' + gt('Application may not work as expected until this problem is solved.')
      // default error
        : api.mailServerDownMessage
      yell('error', message)
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
