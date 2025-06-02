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

import api from '@/io.ox/tasks/api'
import ext from '@/io.ox/core/extensions'
import VGrid from '@/io.ox/core/tk/vgrid'
import template from '@/io.ox/tasks/view-grid-template'
import commons from '@/io.ox/core/commons'
import * as util from '@/io.ox/tasks/util'
import viewDetail from '@/io.ox/tasks/view-detail'
import folderAPI from '@/io.ox/core/folder/api'
import TreeView from '@/io.ox/core/folder/tree'
import FolderView from '@/io.ox/core/folder/view'
import Bars from '@/io.ox/core/toolbars-mobile'
import PageController from '@/io.ox/core/page-controller'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import yell from '@/io.ox/core/yell'
import { createButton, createIcon } from '@/io.ox/core/components'
import '@/io.ox/tasks/toolbar'
import '@/io.ox/tasks/search'
import '@/io.ox/tasks/mobile-navbar-extensions'
import '@/io.ox/tasks/mobile-toolbar-actions'

import { settings } from '@/io.ox/tasks/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'

import gt from 'gettext'

// application object
const app = ox.ui.createApp({
  name: 'io.ox/tasks',
  id: 'io.ox/tasks',
  title: 'Tasks'
})

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
        extension: 'io.ox/tasks/mobile/navbar'
      })
    })

    app.pages.addPage({
      name: 'listView',
      startPage: true,
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/tasks/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'listView',
        extension: 'io.ox/tasks/mobile/toolbar'
      }),
      secondaryToolbar: new Bars.ToolbarView({
        baton,
        // nasty, but saves duplicate code. We reuse the toolbar from detailView for multiselect
        page: 'detailView',
        extension: 'io.ox/tasks/mobile/toolbar'
      })
    })

    app.pages.addPage({
      name: 'detailView',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/tasks/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'detailView',
        extension: 'io.ox/tasks/mobile/toolbar'

      })
    })

    // important
    // tell page controller about special navigation rules
    app.pages.setBackbuttonRules({
      listView: 'folderTree'
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
      classes: 'rightside translucent-medium'
    })
  },
  /*
  * Init all nav- and toolbar labels for mobile
  */
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
      // no title
      .setTitle('')
      .setLeft(
        // #. Used as button label for a navigation action, like the browser back button
        gt('Back')
      )

    // TODO: restore last folder as starting point
    app.pages.showPage('listView')
  },

  'toolbars-mobile' (app) {
    if (!_.device('smartphone')) return

    // tell each page's back button what to do
    app.pages.getNavbar('listView').on('leftAction', function () {
      app.pages.goBack()
    })

    app.pages.getNavbar('detailView').on('leftAction', function () {
      app.pages.goBack()
    })

    // checkbox toggle
    app.pages.getNavbar('listView').on('rightAction', function () {
      if (app.props.get('checkboxes') === true) {
        // leave multiselect? -> clear selection
        app.grid.selection.clear()
        app.grid.showTopbar(false)
        app.grid.showToolbar(false)
        app.pages.getNavbar('listView').setRight(gt('Edit')).show('.left')
      } else {
        // also show sorting options
        app.grid.showTopbar(true)
        app.grid.showToolbar(true)
        app.pages.getNavbar('listView').setRight(gt('Cancel')).hide('.left')
      }
      app.props.set('checkboxes', !app.props.get('checkboxes'))
    })
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
      * Split into left and right pane
      */
  vsplit (app) {
    // replacing vsplit with new pageController
    // TODO: refactor app.left and app.right
    const left = app.pages.getPage('listView')
    const right = app.pages.getPage('detailView')

    app.left = left
    app.right = right.addClass('f6-target flex-col task-detail-container').attr({
      tabindex: -1,
      'aria-label': gt('Task Details')
    }).scrollable()
  },

  vgrid (app) {
    const grid = app.grid
    const savedWidth = app.settings.get('vgrid/width/' + _.display())

    // do not apply on touch devices. it's not possible to change the width there
    if (!_.device('touch') && savedWidth) {
      app.left.css('width', savedWidth + 'px')
    }
    app.left.append(app.gridContainer)
    app.left.attr({
      role: 'navigation',
      'aria-label': 'Task list'
    })

    grid.addTemplate(template.main)

    commons.wireGridAndAPI(grid, api)
    commons.wireGridAndWindow(grid, app.getWindow())
    commons.wireFirstRefresh(app, api)
    commons.wireGridAndRefresh(grid, api, app.getWindow())
    commons.wireGridAndSearch(grid, app, gt('This task list is empty'))

    if (_.device('smartphone')) {
      // remove some stuff from toolbar once
      app.grid.one('meta:update', function () {
        app.grid.getToolbar().find('.select-all-toggle, .grid-info').hide()
      })
    }
    // custom requests
    const allRequest = function () {
      let datacopy
      const done = grid.prop('done')
      const sort = grid.prop('sort')
      const order = grid.prop('order')
      let column

      if (sort !== 'urgency') {
        column = sort
      } else {
        column = 317
      }
      return api.getAll({ folder: this.prop('folder'), sort: column, order }).then(function (data) {
        if (sort !== 'urgency') {
          datacopy = _.copy(data, true)
        } else {
          datacopy = util.sortTasks(data, order)
        }

        if (!done) {
          datacopy = _(datacopy).filter(function (obj) {
            return obj.status !== 3
          })
        }
        return datacopy
      })
    }

    const listRequest = function (ids) {
      return api.getList(ids).then(function (list) {
        // use compact to eliminate unmatched tasks to prevent errors (maybe deleted elsewhere)
        const listcopy = _.copy(_.compact(list), true)

        return listcopy
      })
    }

    grid.setAllRequest(allRequest)
    grid.setListRequest(listRequest)
  },

  'restore-grid-options' (app) {
    app.getGridOptions = function (folder) {
      const options = app.settings.get(['viewOptions', folder], {})
      return _.extend({ done: true, sort: 'urgency', order: 'asc' }, options)
    }

    function restore (folder) {
      const data = app.getGridOptions(folder)
      app.grid.props.set(data)
    }

    app.on('folder:change', restore)
    restore(app.folder.get())
  },

  'store-grid-options' (app) {
    app.grid.props.on('change', _.debounce(function () {
      if (app.props.get('find-result')) return
      const folder = app.folder.get(); const data = app.grid.props.toJSON()
      app.settings
        .set(['viewOptions', folder], { done: data.done, sort: data.sort, order: data.order })
        .set('listViewLayout', data.listViewLayout)
        .save()
    }, 500))
  },

  'grid-options' (app) {
    const grid = app.grid
    function updateGridOptions () {
      const props = grid.props
      // update api property (used cid in api.updateAllCache, api.create)
      api.options.requests.all.sort = props.get('sort') !== 'urgency' ? props.get('sort') : 317
      api.options.requests.all.order = props.get('order')
    }

    grid.selection.on('change', app.removeButton)

    grid.on('change:prop', function () {
      updateGridOptions()
      // hasDeletePermission = undefined;
    })

    commons.addGridToolbarFolder(app, grid)
    updateGridOptions()
  },

  'show-task' (app) {
    // detailview lfo callbacks
    const showTask = function (obj) {
      // be busy
      app.right.busy({ empty: true })
      // cids should also work
      if (_.isString(obj)) obj = _.cid(obj)
      // remove unnecessary information
      obj = { folder: obj.folder || obj.folder_id, id: obj.id }
      api.get(obj)
        .done(_.lfo(drawTask))
        .fail(_.lfo(drawFail, obj))
    }

    showTask.cancel = function () {
      _.lfo(drawTask)
      _.lfo(drawFail)
    }

    const drawTask = function (data) {
      const baton = ext.Baton({ data })
      // since we use a classic toolbar on non-smartphone devices, we disable inline ox.ui.createApps in this case
      baton.disable('io.ox/tasks/detail-inline', 'inline-links')
      app.right.idle().empty().append(viewDetail.draw(baton))
    }

    const drawFail = function (obj) {
      app.right.idle().empty().append(
        $.fail(gt('Couldn\'t load that task.'), function () {
          showTask(obj)
        })
      )
    }

    commons.wireGridAndSelectionChange(app.grid, 'io.ox/tasks', showTask, app.right, api)
  },
  /*
        * Always change pages on tap, don't wait for data to load
        */
  'select:task-mobile' (app) {
    if (_.device('!smartphone')) return
    app.grid.getContainer().on('click', '.vgrid-cell.selectable', function () {
      if (app.props.get('checkboxes') === true) return
      // hijack selection event hub to trigger page-change event
      app.grid.selection.trigger('pagechange:detailView')
      app.pages.changePage('detailView')
    })
  },
  /*
        * Folder view support
        */
  'folder-view' (app) {
    if (_.device('smartphone')) return

    // tree view
    app.treeView = new TreeView({ app, contextmenu: true, flat: true, indent: false, module: 'tasks' })
    FolderView.initialize({ app, tree: app.treeView })
    app.folderView.resize.enable()
  },

  'folder-view-mobile' (app) {
    if (_.device('!smartphone')) return

    const nav = app.pages.getNavbar('folderTree')
    const page = app.pages.getPage('folderTree')

    nav.on('rightAction', function () {
      app.toggleFolders()
    })

    const tree = new TreeView({ app, contextmenu: true, flat: true, indent: false, module: 'tasks' })

    // initialize folder view
    FolderView.initialize({ app, tree })
    page.append(tree.render().$el)
  },

  'vgrid-checkboxes' (app) {
    // always hide checkboxes on smartphone devices initially
    if (_.device('smartphone')) return
    const grid = app.getGrid()
    grid.setEditable(app.props.get('checkboxes'))
  },

  /*
        * Set folderview property
        */
  'prop-folderview' (app) {
    app.props.set('folderview', _.device('smartphone') ? false : app.settings.get('folderview/visible/' + _.display(), true))
  },

  /*
        * Store view options
        */
  'store-view-options' (app) {
    if (_.device('smartphone')) return
    app.props.on('change', _.debounce(function () {
      if (app.props.get('find-result')) return
      const data = app.props.toJSON()
      app.settings
        .set('showCheckboxes', data.checkboxes)
        .save()
    }, 500))
  },

  /*
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

  'change:folder-mobile' () {
    if (_.device('!smartphone')) return
    const updateTitle = _.throttle(function () {
      let title
      if (app.grid.meta.total !== 0) {
        title = app.grid.meta.title + ' (' + app.grid.meta.total + ')'
      } else {
        title = app.grid.meta.title
      }
      app.pages.getNavbar('listView').setTitle(title)
    }, 500)

    // set title and item amount in navbar
    app.grid.on('meta:update', updateTitle)
  },

  /*
        * Respond to change:checkboxes
        */
  'change:checkboxes' (app) {
    app.props.on('change:listViewLayout', function (model, value) {
      app.props.set({ checkboxes: value === 'checkboxes' })
    })
    app.props.on('change:checkboxes', function (model, value) {
      app.getGrid().setEditable(value)
    })
  },

  /*
        * Folderview toolbar
        */
  'folderview-toolbar' (app) {
    if (_.device('smartphone')) return
    commons.mediateFolderView(app)
  },

  /*
        * change to default folder on no permission or folder not found errors
        */
  'no-permission' (app) {
    // use debounce, so errors from folder and app api are only handled once.
    const handleError = _.debounce(function (error) {
      // work with (error) and (event, error) arguments
      if (error && !error.error) {
        if (arguments[1] && arguments[1].error) {
          error = arguments[1]
        } else {
          return
        }
      }
      // only change if folder is currently displayed
      if (error.error_params[0] && String(app.folder.get()) !== String(error.error_params[0])) {
        return
      }
      yell(error)
      // try to load the default folder
      // guests do not have a default folder, so the first visible one is chosen
      app.folder.setDefault()
    }, 300)

    folderAPI.on('error:FLD-0008', handleError)
    api.on('error:FLD-0008', handleError)
    api.on('error:TSK-0023', function (e, error) {
      // check if folder is currently displayed
      if (String(app.folder.get()) !== String(error.error_params[1])) {
        return
      }
      // see if we can still access the folder, although we are not allowed to view the contents
      // this is important because otherwise we would not be able to change permissions (because the view jumps to the default folder all the time)
      folderAPI.get(app.folder.get(), { cache: false }).fail(function (error) {
        if (error.code === 'FLD-0003') {
          handleError(error)
        }
      })
    })
  },

  /*
        * Drag and Drop support
        */
  'drag-n-drop' (app) {
    if (_.device('touch')) return
    app.getWindow().nodes.outer.on('selection:drop', function (e, baton) {
      actionsUtil.invoke('io.ox/tasks/actions/move', baton)
    })
  },

  'create:task' (app) {
    // jump to newly created items
    api.on('create', function (e, data) {
      app.grid.selection.set(data)
    })
  },

  move (app) {
    if (!_.device('smartphone')) return
    api.on('move', function () {
      if (app.pages.getCurrentPage().name === 'detailView') {
        app.pages.goBack()
      }
      app.grid.selection.clear()
    })
  },

  /*
        * Add support for selection:
        */
  'selection-doubleclick' (app) {
    // detail app does not make sense on small devices
    // they already see tasks in full screen
    if (_.device('smartphone')) return
    app.grid.selection.on('selection:doubleclick', function (e, key) {
      ox.launch(() => import('@/io.ox/tasks/detail/main'), { cid: key })
    })
  },

  /*
        * Handle delete event based on keyboard shortcut
        */
  'selection-delete' (app) {
    app.grid.selection.on('selection:delete', function (e, list) {
      const baton = ext.Baton({ data: list })
      actionsUtil.invoke('io.ox/tasks/actions/delete', baton)
    })
  },

  /*
        * Handle delete event based on keyboard shortcut
        */
  'delete-mobile' (app) {
    if (_.device('!smartphone')) return
    api.on('delete', function () {
      if (app.pages.getCurrentPage().name === 'detailView') {
        app.pages.goBack()
      }
    })
  },

  // to update the context menu in the foldertree
  'api-events' (app) {
    api.on('create update delete refresh.all', function () {
      folderAPI.reload(app.folder.get())
    })
  },

  'contextual-help' (app) {
    app.getContextualHelp = function () {
      return 'ox.appsuite.user.sect.tasks.gui.html'
    }
  },

  sidepanel (app) {
    if (_.device('smartphone')) return
    ext.point('io.ox/tasks/sidepanel').extend({
      id: 'tree',
      index: 100,
      draw (baton) {
        // render tree and add to DOM
        this.append(baton.app.treeView.$el)
      }
    })
  },

  'primary-action' (app) {
    app.addPrimaryAction({
      point: 'io.ox/tasks',
      label: gt('New task'),
      action: 'io.ox/tasks/actions/create',
      toolbar: 'create'
    })
  },

  'categories-search' (app) {
    if (!coreSettings.get('features/categories', false)) return

    ox.on('search:category', function search (name) {
      const app = ox.ui.App.getCurrentApp()
      if (app.get('id') !== 'io.ox/tasks') return
      const search = app.searchView
      search.filters.add('words', name)
      // TODO: why this line is needed?
      search.$input.val(name)
      search.submit()
    })
  }
})

// launcher
app.setLauncher(function (options) {
  let showSwipeButton = false
  let hasDeletePermission

  // get window
  const win = ox.ui.createWindow({
    name: 'io.ox/tasks',
    title: 'Tasks',
    chromeless: true
  })

  win.addClass('io-ox-tasks-main')
  app.setWindow(win)
  app.settings = settings

  const removeButton = function () {
    if (showSwipeButton) {
      const g = grid.getContainer()
      $('.swipeDelete', g).remove()
      showSwipeButton = false
    }
  }

  app.removeButton = removeButton

  ext.point('io.ox/tasks/swipeDelete').extend({
    index: 666,
    id: 'deleteButton',
    draw (baton) {
      // remove old buttons first
      if (showSwipeButton) {
        removeButton()
      }
      const div = $('<div class="swipeDelete fadein fast">').append(createIcon('bi/trash.svg'))
      this.append(
        div.on('mousedown', function (e) {
          // we have to use mousedown as the selection listens to this, too
          // otherwise we are to late to get the event
          e.stopImmediatePropagation()
        })
          .on('click', function (e) {
            e.preventDefault()
            removeButton()
            showSwipeButton = false
            actionsUtil.invoke('io.ox/tasks/actions/delete', baton)
          })
      )
      showSwipeButton = true
    }
  })

  // swipe handler
  const swipeLeftHandler = function (e, id, cell) {
    const obj = _.cid(id)
    if (hasDeletePermission === undefined) {
      folderAPI.get(obj.folder_id).done(function (data) {
        if (folderAPI.can('delete', data)) {
          hasDeletePermission = true
          ext.point('io.ox/tasks/swipeDelete').invoke('draw', cell, obj)
        }
      })
    } else if (hasDeletePermission) {
      ext.point('io.ox/tasks/swipeDelete').invoke('draw', cell, obj)
    }
  }

  const listViewLayout = app.settings.get('listViewLayout', 'simple')
  app.props = new Backbone.Model({
    listViewLayout,
    checkboxes: _.device('smartphone') ? false : listViewLayout === 'checkboxes',
    folderEditMode: false
  })

  app.gridContainer = $('<div class="abs grid-container translucent-low">')
    .attr({ role: 'navigation', 'aria-label': gt('Tasks') })

  const grid = new VGrid(app.gridContainer, {
    settings,
    swipeLeftHandler,
    swipeRightHandler: removeButton,
    showToggle: _.device('smartphone'),
    hideTopbar: _.device('smartphone'),
    hideToolbar: _.device('smartphone'),
    // if it's shown, it should be on the top
    toolbarPlacement: 'top',
    templateOptions: { tagName: 'li', defaultClassName: 'vgrid-cell list-unstyled' },
    showCheckbox: false
  })
  app.gridContainer.find('.vgrid-toolbar').attr('aria-label', gt('Tasks toolbar'))

  app.grid = grid

  // workaround: windowmanager not visible so height calculation for grid item fails
  if (!ox.ui.screens.current()) ox.ui.screens.one('show-windowmanager', grid.paint.bind(grid))

  app.getGrid = function () {
    return grid
  }

  // ready for show
  commons.addFolderSupport(app, grid, 'tasks', options.folder)
    .always(function () {
      app.mediate()
      win.show()
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

// extension points
ext.point('io.ox/tasks/vgrid/toolbar').extend({
  id: 'dropdown',
  index: 1000000000000,
  draw () {
    const dropdown = new Dropdown({
      model: app.grid.props,
      tagName: 'div',
      caret: false,
      $toggle: createButton({ href: '#', variant: 'none', icon: { name: 'bi/three-dots.svg', title: gt('More options') } })
    })
      .link('select-all', gt('Select all'), function () {
        app.grid.selection.selectAll()
      })
      .divider()
      .header(gt('Sort by'))
      .option('sort', 'urgency', gt('Urgency'))
      .option('sort', '300', gt('Status'))
      .option('sort', '317', gt('Due date'))
      .option('sort', '200', gt('Subject'))
      .option('sort', '309', gt('Priority'))
      .divider()
      .header(gt('Sort order'))
      .option('order', 'asc', gt('Ascending'))
      .option('order', 'desc', gt('Descending'))
      .divider()
      .option('done', true, gt('Show done tasks'))
      .listenTo(app.grid.props, 'change:sort change:order change:done', function () {
        app.grid.refresh()
      })

    this.append(
      $('<div class="grid-options dropdown ml-auto">').append(
        dropdown.render().$el.attr('data-dropdown', 'sort')
      )
    )
  }
})

export default {
  getApp: app.getInstance
}
