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

import commons from '@/io.ox/core/commons'
import ext from '@/io.ox/core/extensions'
import capabilities from '@/io.ox/core/capabilities'
import folderAPI from '@/io.ox/core/folder/api'
import TreeView from '@/io.ox/core/folder/tree'
import FolderView from '@/io.ox/core/folder/view'
import DatePicker from '@/io.ox/backbone/views/datepicker'
import ListViewControl from '@/io.ox/core/tk/list-control'
import CalendarListView from '@/io.ox/calendar/list/listview'
import Bars from '@/io.ox/core/toolbars-mobile'
import PageController from '@/io.ox/core/page-controller'
import api from '@/io.ox/calendar/api'
import addFolderSelectSupport from '@/io.ox/calendar/folder-select-support'
import ModalDialog from '@/io.ox/backbone/views/modal'
import miniViews from '@/io.ox/backbone/mini-views'
import yell from '@/io.ox/core/yell'
import '@/io.ox/calendar/mobile-navbar-extensions'
import '@/io.ox/calendar/mobile-toolbar-actions'
import '@/io.ox/calendar/toolbar'
import '@/io.ox/calendar/actions'
import '@/io.ox/calendar/search'
import '@/io.ox/calendar/week/view'
import '@/io.ox/calendar/style.scss'
import '@/io.ox/calendar/import'
import _ from '@/underscore'
import ox from '@/ox'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import tabApi from '@/io.ox/core/api/tab'
import openSettings from '@/io.ox/settings/util'

import { settings } from '@/io.ox/calendar/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'

import gt from 'gettext'

// application object
const app = ox.ui.createApp({
  name: 'io.ox/calendar',
  id: 'io.ox/calendar',
  title: 'Calendar'
}); let win

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

    // create empty startup page
    // such that the first change:page will always trigger a real page change with view initialization
    app.pages.addPage({
      name: 'start',
      startPage: true
    })

    app.pages.addPage({
      name: 'folderTree',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/calendar/mobile/navbarFoldertree'
      })
    })

    // create 3 pages with toolbars and navbars
    app.pages.addPage({
      name: 'month',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/calendar/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'month',
        extension: 'io.ox/calendar/mobile/toolbar'
      })
    })

    app.pages.addPage({
      name: 'week:day',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/calendar/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'week',
        extension: 'io.ox/calendar/mobile/toolbar'
      })
    })

    app.pages.addPage({
      name: 'list',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/calendar/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'list',
        extension: 'io.ox/calendar/mobile/toolbar'
      }),
      secondaryToolbar: new Bars.ToolbarView({
        baton,
        page: 'list/multiselect',
        extension: 'io.ox/calendar/mobile/toolbar'
      })
    })

    app.pages.addPage({
      name: 'detailView',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/calendar/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'detailView',
        extension: 'io.ox/calendar/mobile/toolbar'

      })
    })

    // important
    // tell page controller about special navigation rules
    app.pages.setBackbuttonRules({
      month: 'folderTree',
      'week:day': 'month',
      list: 'folderTree'
    })
  },
  /*
   * Pagecontroller
   */
  'pages-desktop' (app) {
    if (_.device('smartphone')) return
    const c = app.getWindow().nodes.main

    app.pages = new PageController({ appname: app.options.name })

    // create empty startup page
    // such that the first change:page will always trigger a real page change with view initialization
    app.pages.addPage({
      name: 'start',
      container: c,
      startPage: true
    })

    app.pages.addPage({
      name: 'month',
      container: c
    })

    app.pages.addPage({
      name: 'week:day',
      container: c
    })

    app.pages.addPage({
      name: 'week:workweek',
      container: c
    })

    app.pages.addPage({
      name: 'week:week',
      container: c
    })

    app.pages.addPage({
      name: 'list',
      container: c
    })

    app.pages.addPage({
      name: 'listView',
      classes: 'leftside'
    })

    app.pages.addPage({
      name: 'detailView',
      classes: 'rightside'
    })

    app.pages.addPage({
      name: 'year',
      container: c
    })
  },

  subscription (app) {
    app.subscription = {
      wantedOAuthScopes: ['calendar_ro']
    }
  },

  'list-vsplit' (app) {
    if (_.device('smartphone')) return
    app.left = app.pages.getPage('listView')
    app.right = app.pages.getPage('detailView')
  },

  'list-vsplit-mobile' (app) {
    if (_.device('!smartphone')) return
    app.left = app.pages.getPage('list')
    app.right = app.pages.getPage('detailView')
  },

  'navbars-mobile' (app) {
    if (_.device('!smartphone')) return

    app.pages.getNavbar('month')
      .on('leftAction', function () {
        app.pages.goBack()
      })
      .setLeft(gt('Calendars'))

    app.pages.getNavbar('week:day')
      .on('leftAction', function () {
        app.pages.changePage('month', { animation: 'slideright' })
      })
      .setLeft(gt('Back'))

    app.pages.getNavbar('list')
      .on('leftAction', function () {
        app.pages.goBack()
      })
      .setLeft(gt('Calendars'))
      .setRight(
        // #. Used as a button label to enter the "edit mode"
        gt('Edit')
      )

    app.pages.getNavbar('folderTree')
      .setTitle(gt('Calendars'))
      .setLeft(gt('Edit'))
      .setRight(gt('Back'))

    app.pages.getNavbar('detailView')
      .setTitle('')
      .setLeft(
        // #. Used as button label for a navigation action, like the browser back button
        gt('Back')
      )

    app.pages.getNavbar('detailView').on('leftAction', function () {
      app.pages.goBack()
    })

    // checkbox toggle
    app.pages.getNavbar('list').on('rightAction', function () {
      if (app.props.get('checkboxes') === true) {
        // leave multiselect? -> clear selection
        app.listView.selection.clear()
        app.pages.getNavbar('list').setRight(gt('Edit')).show('.left')
      } else {
        app.pages.getNavbar('list').setRight(gt('Cancel')).hide('.left')
      }
      app.props.set('checkboxes', !app.props.get('checkboxes'))
      app.listView.toggleCheckboxes(app.props.get('checkboxes'))
      app.listControl.$el.toggleClass('toolbar-top-visible', app.props.get('checkboxes'))
    })
  },

  'mini-calendar' (app) {
    ext.point('io.ox/calendar/sidepanel').extend({
      id: 'mini-calendar',
      index: 50,
      draw () {
        if (_.device('smartphone')) return
        const layoutRanges = { 'week:workweek': 'week', 'week:week': 'week', month: 'month', year: 'year' }

        new DatePicker({ parent: this.closest('#io-ox-core'), showTodayButton: false })
          .on('select', function (date) {
            app.setDate(date, { propagate: false })
            this.setDate(date, true)
          })
          .listenTo(app.props, 'change:date', function (model, value) {
            // check if the layout supports ranges (week, month year). If the new date is still within that range, we don't need to change the mini calendar
            // those layouts set it always to the first day within their specific range and would overwrite the selection of the user, see(bug 57223)
            const unit = layoutRanges[app.props.get('layout')]
            if (unit && moment(value).startOf(unit).valueOf() === moment(this.getDate()).startOf(unit).valueOf()) return

            this.setDate(value, true)
          })
          .listenTo(app.props, 'change:showMiniCalendar', function (model, value) {
            this.$el.toggle(!!value)
          })
          .render().$el
          .toggle(app.props.get('showMiniCalendar'))
          .appendTo(this)
      }
    })
  },

  'folder-view' (app) {
    if (_.device('smartphone')) return

    // 360px minimum width to support mini calendar and 200% text zoom.
    // Solution is not optimal, but works for now
    app.treeView = new TreeView({ minWidth: 280, app, contextmenu: true, flat: true, indent: false, module: 'calendar', dblclick: true })
    FolderView.initialize({ app, tree: app.treeView })
    app.folderView.resize.enable()
    app.folderView.tree.$el.attr('aria-label', gt('Calendars'))
  },

  'folder-view-mobile' (app) {
    if (_.device('!smartphone')) return

    const nav = app.pages.getNavbar('folderTree')
    const page = app.pages.getPage('folderTree')

    nav.on('leftAction', function () {
      app.toggleFolders()
    })

    nav.on('rightAction', function () {
      app.pages.changePage('month', { animation: 'slideleft' })
    })

    const tree = new TreeView({
      app,
      contextmenu: true,
      flat: true,
      indent: false,
      module: 'calendar'
    })
    // initialize folder view
    FolderView.initialize({ app, tree, firstResponder: false })
    tree.$el.addClass('calendar')
    page.append(tree.render().$el)
    app.treeView = tree
  },

  'folder-create' (app) {
    folderAPI.on('create', function (folder) {
      if (folder.module !== 'calendar') return
      app.folders.add(folder.id)
      app.folder.set(folder.id)
    })
  },

  'folder-remove' (app) {
    folderAPI.on('hide remove', function (id) {
      app.folders.remove(id)
    })
    api.on('all:fail', function (id) {
      app.folders.remove(id, { silent: true })
      folderAPI.refresh()
    })
  },

  'multi-folder-selection' (app) {
    addFolderSelectSupport(app)
    app.on('folder:change', function () {
      app.folders.reset()
    })
    app.folderView.tree.on('dblclick', function (e, folder) {
      if (!folder) return
      if ($(e.target).hasClass('color-label')) return
      if (folderAPI.isVirtual(folder)) return
      app.folder.set(folder)
      if (app.folders.isSingleSelection()) app.folders.reset()
      else app.folders.setOnly(folder)
    })
  },

  'toggle-folder-view' (app) {
    commons.addFolderViewToggle(app)
  },

  'account-errors' (app) {
    app.treeView.on('click:account-error', function (folder) {
      const accountError = folder['com.openexchange.calendar.accountError']
      if (!accountError) return

      const requiresAccountUpdate = /(OAUTH-0013)/.test(accountError.code)
      new ModalDialog({
        model: new Backbone.Model(),
        point: 'io.ox/calendar/account-errors',
        title: gt('Calendar account error')
      })
        .extend({
          default () {
            this.config = _.clone(folder['com.openexchange.calendar.config'])

            this.$body.append(
              $('<div class="form-group">').append(
                $('<div class="info-text">')
                  .css('word-break', 'break-word')
                  .text(accountError.error)
              )
            )
          },
          password () {
            if (!/^(LGI-0025)$/.test(accountError.code) && !/^(ICAL-PROV-4012)$/.test(accountError.code) && !/^(ICAL-PROV-4013)$/.test(accountError.code)) return
            // improve error message
            this.$('.info-text').text(gt('The password was changed recently. Please enter the new password.'))
            // fallback
            if (_.isEmpty(this.config)) return console.warn('Could not find com.openexchange.calendar.config in folder data')
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
                const changes = _.pick(folder, 'module', 'subscribed', 'com.openexchange.calendar.provider')
                changes['com.openexchange.calendar.config'] = _.extend(this.config, { password: this.model.get('password') })
                folderAPI.update(folder.id, changes).fail(yell).done(function () {
                  folderAPI.flat({ module: 'calendar', all: true, force: true, cache: false })
                })
              }.bind(this))
          },

          retry () {
            if (requiresAccountUpdate || accountError.code === 'LGI-0025') return
            this.addButton({ label: gt('Try again'), action: 'retry', className: 'btn-primary' })
              .on('retry', function () {
                yell('warning', gt('Refreshing calendar might take some time...'))
                api.refreshCalendar(folder.id).then(function () {
                  yell('success', gt('Successfully refreshed calendar'))
                }, yell).always(function () {
                  folderAPI.pool.unfetch(folder.id)
                  folderAPI.refresh()
                })
              })
          },

          edit () {
            if (!requiresAccountUpdate || accountError.code === 'LGI-0025') return
            this.addButton({ label: gt('Edit accounts'), action: 'accounts', className: 'btn-primary' })
              .on('accounts', () => openSettings('virtual/settings/io.ox/settings/accounts'))
          }
        })
        .addCancelButton()
        .open()
    })
  },

  views (app) {
    const list = [
      { view: 'week', mode: 'day', load: () => import('@/io.ox/calendar/week/view') },
      { view: 'month', load: () => import('@/io.ox/calendar/month/view') },
      { view: 'list', load: () => import('@/io.ox/calendar/list/view') }
    ]
    const defaultPage = _.device('smartphone') ? 'week:day' : 'week:workweek'
    const views = {}
    let deepLink = _.url.hash('id')
    _.url.hash('id', null)
    if (_.device('!smartphone')) {
      list.push(
        { view: 'week', mode: 'workweek', load: () => import('@/io.ox/calendar/week/view') },
        { view: 'week', mode: 'week', load: () => import('@/io.ox/calendar/week/view') },
        { view: 'year', load: () => import('@/io.ox/calendar/year/view') }
      )
    }
    list.forEach(function ({ view, mode, load } = {}) {
      const item = mode ? `${view}:${mode}` : view
      const node = app.pages.getPage(item)
      node.one('pagebeforeshow', function () {
        load().then(function success ({ default: View }) {
          const view = new View({
            mode: mode || (_.device('smartphone') ? 'day' : 'workweek'),
            app,
            deepLink
          })
          // reset, because we only want a deepLink to happen once opening the app
          deepLink = null
          node.append(view.$el)
          view.render()
          app.perspective = views[item] = view
          app.getWindow().trigger('change:perspective', view)
          // finally store the layout. will not change anything if already selected
          app.props.set('layout', item)
        }, function fail () {
          if (item !== defaultPage) return app.pages.changePage(defaultPage)
        })
      })
      node.on('pagebeforeshow', function () {
        const perspectives = ['week:day', 'week:workweek', 'week:week', 'month', 'list', 'year']
        if (!views[item]) return
        views[item].trigger('show')
        app.perspective = views[item]
        // trigger change perspective so toolbar is redrawn (no more lost today button)
        app.getWindow().trigger('change:perspective', views[item])
        app.props.set('layout', item)

        if (_.find(views, function (view, viewName) { return perspectives.indexOf(item) > perspectives.indexOf(viewName) })) views[item].refresh(false)
      })
      node.on('pageshow', function () {
        // update the indicator arrows after the page is visible, otherwise we get wrong calculations
        if (!app || !app.perspective || !app.perspective.appointmentView || !app.perspective.appointmentView.updateHiddenIndicators) return
        app.perspective.appointmentView.updateHiddenIndicators()
      })
    })
  },

  listview (app) {
    app.listView = new CalendarListView({ app, draggable: false, pagination: false, labels: true, ignoreFocus: true, noPullToRefresh: true })
    app.listView.model.set({ view: 'list' }, { silent: true })
    // for debugging
    if (!window.list) window.list = app.listView
  },

  'list-view-control' (app) {
    app.listControl = new ListViewControl({ id: 'io.ox/chronos', listView: app.listView, app })
    app.left.append(
      app.listControl.render().$el
        .attr('aria-label', gt('Appointments'))
        .find('.toolbar')
        // #. toolbar with 'select all' and 'sort by'
        .attr('aria-label', gt('Appointment options'))
        .end()
    )
    // make resizable
    app.listControl.resizable()
  },

  'toggle-folder-editmode' (app) {
    if (_.device('!smartphone')) return

    const toggle = function () {
      const page = app.pages.getPage('folderTree')
      const state = app.props.get('mobileFolderSelectMode')
      const left = state ? gt('Edit') : gt('Cancel')
      app.props.set('mobileFolderSelectMode', !state)
      app.pages.getNavbar('folderTree').setLeft(left)
      app.pages.getNavbar('folderTree').$el.find('.right').toggle(!!state)
      page.toggleClass('mobile-edit-mode', !state)
    }

    app.toggleFolders = toggle
  },

  /*
   * Default application properties
   */
  props (app) {
    const layout = _.device('smartphone') ? 'week:day' : settings.get('layout', settings.get('viewView', 'week:week'))
    // introduce shared properties
    app.props = new Backbone.Model({
      date: moment().valueOf(),
      layout,
      checkboxes: _.device('smartphone') ? false : app.settings.get('showCheckboxes', false),
      mobileFolderSelectMode: false,
      showMiniCalendar: app.settings.get('showMiniCalendar', true),
      showMonthviewWeekend: app.settings.get('showMonthviewWeekend', true)
    })

    // convenience functions
    app.getDate = function () {
      return moment(app.props.get('date'))
    }

    app.setDate = function (newDate, opt) {
      // try to keep month and year if possible
      if (!_.isArray(newDate._i)) return app.props.set('date', moment(newDate).valueOf(), opt)
      const oldDate = this.getDate()
      const initArgs = newDate._i
      const year = initArgs.length > 0 ? initArgs[0] : oldDate.year()
      const month = initArgs.length > 1 ? initArgs[1] : oldDate.month()
      let day = initArgs.length > 2 ? initArgs[2] : oldDate.date()
      // don't try to select dates that don't exist
      if (_.isNaN(moment([year, month, day]).valueOf())) day = 1
      app.props.set('date', moment([year, month, day]).valueOf(), opt)
    }
  },

  'listview-checkboxes' (app) {
    if (_.device('smartphone')) app.listControl.$el.toggleClass('toolbar-top-visible', app.props.get('checkboxes'))
    else app.listControl.$('.select-all').toggle(app.props.get('checkboxes'))
    app.listView.toggleCheckboxes(app.props.get('checkboxes'))
  },

  /*
   * Set folderview property
   */
  'prop-folderview' (app) {
    if (_.device('smartphone')) return
    app.props.set('folderview', app.settings.get('folderview/visible/' + _.display(), true))
  },

  /*
   * Set folderview property
   */
  'prop-folderview-mobile' (app) {
    if (_.device('!smartphone')) return
    app.props.set('folderview', false)
  },

  /*
   * Store view options
   */
  'store-view-options' (app) {
    if (_.device('smartphone')) return

    app.props.on('change', _.debounce(function (model, options) {
      if (!options || options.fluent || app.props.get('find-result')) return
      const data = app.props.toJSON()
      app.settings
        .set('showCheckboxes', data.checkboxes)
        .set('showMiniCalendar', data.showMiniCalendar)
        .set('showMonthviewWeekend', data.showMonthviewWeekend)
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

  /*
   * Respond to change:checkboxes
   */
  'change:checkboxes' (app) {
    if (_.device('smartphone')) return
    function toggleTopbar (value) {
      app.listControl.$el.toggleClass('toolbar-top-visible', value)
    }
    app.props.on('change:checkboxes', function (model, value) {
      app.listView.toggleCheckboxes(value)
      if (value) toggleTopbar(true)
      app.listControl.$('.select-all').toggle('value', function () {
        if (!value) toggleTopbar(false)
      })
    })
  },

  /*
   * Respond to layout change
   */
  'change:layout' (app) {
    app.props.on('change:layout', function (model, value) {
      // no animations on desktop
      app.pages.changePage(value, { disableAnimations: true })
    })
    app.settings.on('change:layout', function (value) {
      app.props.set('layout', value)
    })
  },

  /*
   * change to default folder on no permission or folder not found errors
   */
  'folder-error' (app) {
    app.folder.handleErrors()
  },

  create (app) {
    api.on('create move', function (event) {
      const folder = folderAPI.pool.getModel(event.folder)
      // do not select public folder if allPublic is selected
      if (app.folders.isSelected('cal://0/allPublic') && folder && folder.is('public')) return
      if (app.folders.isSingleSelection()) return
      app.folders.add(event.folder)
      const model = folderAPI.pool.getModel(event.folder)
      model.trigger('change', model)
    })
  },

  /*
   * Handle page change on delete on mobiles
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

  /*
   * mobile only
   *
   */
  'show-weekview-mobile' (app) {
    if (_.device('!smartphone')) return
    app.pages.getPage('week:day').on('pageshow', function () {
      app.pages.getNavbar('week:day').setLeft(app.getDate().format('MMMM'))
      // app.pages.getPageObject('week').perspective.view.setScrollPos();
    })
  },

  /*
  * Add support for selection:
  */
  'selection-doubleclick' (app) {
    // detail app does not make sense on small devices
    // they already see appointments in full screen
    if (_.device('smartphone')) return
    app.listView.on('selection:doubleclick', function (list) {
      if (list.length < 1) return
      ox.launch(() => import('@/io.ox/calendar/detail/main'), { cid: list[0] })
    })
  },

  /*
   * Add support for virtual folder "All my public appointments"
   */
  'virtual-folders' (app) {
    if (capabilities.has('guest')) return
    app.folderView.tree.selection.addSelectableVirtualFolder('cal://0/allPublic')
  },

  'contextual-help' (app) {
    app.getContextualHelp = function () {
      return 'ox.appsuite.user.sect.calendar.gui.html'
    }
  },

  sidepanel (app) {
    ext.point('io.ox/calendar/sidepanel').extend({
      id: 'tree',
      index: 100,
      draw (baton) {
        if (_.device('smartphone')) return
        // render tree and add to DOM
        this.append(baton.app.treeView.$el)
      }
    })
  },

  'primary-action' (app) {
    app.addPrimaryAction({
      point: 'io.ox/calendar',
      label: gt('New appointment'),
      action: 'io.ox/calendar/detail/actions/create'
    })
  },

  // Add listener for browser tab communication. Event needs a 'propagate' string for propagation
  'refresh-from-broadcast' () {
    if (!ox.tabHandlingEnabled) return
    const events = tabApi.communicationEvents
    events.listenTo(events, 'appointment-create', function () {
      api.trigger('refresh.all')
    })
  },

  'categories-search' (app) {
    if (!coreSettings.get('features/categories', false)) return

    ox.on('search:category', function search (name) {
      const app = ox.ui.App.getCurrentApp()
      if (app.get('id') !== 'io.ox/calendar') return
      const search = app.searchView
      search.filters.add('categories', `"${name}"`)
      search.submit()
    })
  }

})

function getPerspective (perspective) {
  // check at first, if this is a known perspective
  if (['week:day', 'month', 'list', 'week:workweek', 'week:week', 'year'].indexOf(perspective) < 0) {
    perspective = _.device('smartphone') ? 'week:day' : 'week:workweek'
  }

  if (_.device('smartphone') && _.indexOf(['week:workweek', 'week:week', 'calendar'], perspective) >= 0) {
    perspective = 'week:day'
  } else if (_.device('smartphone') && _.indexOf(['week:day', 'list', 'month'], perspective) < 0) {
    perspective = 'week:day'
  }

  return perspective
}

// launcher
app.setLauncher(function (options) {
  // get window
  app.setWindow(win = ox.ui.createWindow({
    name: 'io.ox/calendar',
    chromeless: true
  }))

  app.settings = settings

  win.addClass('io-ox-calendar-main')

  if (!options.folder && capabilities.has('guest')) {
    // try to select the first shared folder available
    if (folderAPI.getFlatCollection('calendar', 'shared').fetched) {
      addFolderSupport(folderAPI.getFlatCollection('calendar', 'shared').models[0].get('id'))
    } else {
      // shared section wasn't fetched yet. Do it now.
      folderAPI.flat({ module: 'calendar' }).done(function (sections) {
        addFolderSupport((sections.shared[0] || {}).id)
      })
    }
  } else {
    addFolderSupport(options.folder)
  }

  function addFolderSupport (folder) {
    folder = folder || folderAPI.getDefaultFolder('calendar')
    commons.addFolderSupport(app, null, 'calendar', folder)
      .always(function () {
        app.mediate()
        win.show()
      })
      .fail(function (result) {
        let message = gt('Application may not work as expected until this problem is solved.')
        if (result && result.error) message = result.error + ' ' + message
        yell('error', message)
      })
      .done(function () {
        // app perspective
        const lastPerspective = getPerspective(options.perspective || app.props.get('layout'))
        app.pages.changePage(lastPerspective, { disableAnimations: true })
      })
  }
})

// set what to do if the app is started again
// this way we can react to given options, like for example a different folder
app.setResume(function (options) {
  let ret = $.when()
  // only consider folder option and perspective option
  if (options) {
    const defs = []
    const appNode = this.getWindow()
    appNode.busy()
    if (options.folder && options.folder !== this.folder.get()) {
      defs.push(this.folder.set(options.folder))
    }
    if (options.perspective && options.perspective !== app.props.get('layout')) {
      const perspective = getPerspective(options.perspective)
      if (_.device('smartphone')) defs.push(app.props.set('layout', perspective))
    }
    ret = $.when.apply(this, defs)
    ret.always(function () {
      appNode.idle()
    })
  }
  return ret
})

export default {
  getApp: app.getInstance
}
