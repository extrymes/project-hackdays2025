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
import * as util from '@/io.ox/contacts/util'
import * as coreUtil from '@/io.ox/core/util'
import api from '@/io.ox/contacts/api'
import VGrid from '@/io.ox/core/tk/vgrid'
import viewDetail from '@/io.ox/contacts/view-detail'
import ext from '@/io.ox/core/extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import commons from '@/io.ox/core/commons'
import capabilities from '@/io.ox/core/capabilities'
import openSettings from '@/io.ox/settings/util'

import folderAPI from '@/io.ox/core/folder/api'
import Bars from '@/io.ox/core/toolbars-mobile'
import PageController from '@/io.ox/core/page-controller'
import TreeView from '@/io.ox/core/folder/tree'
import FolderView from '@/io.ox/core/folder/view'
import svg from '@/io.ox/core/svg'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { createIcon } from '@/io.ox/core/components'
import '@/io.ox/contacts/toolbar'
import '@/io.ox/contacts/mobile-navbar-extensions'
import '@/io.ox/contacts/mobile-toolbar-actions'
import '@/io.ox/contacts/search'
import '@/io.ox/contacts/style.scss'

import { settings } from '@/io.ox/contacts/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'

import gt from 'gettext'

// application object
const app = ox.ui.createApp({
  name: 'io.ox/contacts',
  id: 'io.ox/contacts',
  title: 'Address Book'
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
        extension: 'io.ox/contacts/mobile/navbar'
      })
    })

    app.pages.addPage({
      name: 'listView',
      startPage: true,
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/contacts/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'listView',
        extension: 'io.ox/contacts/mobile/toolbar'
      }),
      secondaryToolbar: new Bars.ToolbarView({
        baton,
        // nasty, but saves duplicate code. We reuse the toolbar from detailView for multiselect
        page: 'detailView',
        extension: 'io.ox/contacts/mobile/toolbar'
      })
    })

    app.pages.addPage({
      name: 'detailView',
      navbar: new Bars.NavbarView({
        baton,
        extension: 'io.ox/contacts/mobile/navbar'
      }),
      toolbar: new Bars.ToolbarView({
        baton,
        page: 'detailView',
        extension: 'io.ox/contacts/mobile/toolbar'

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

  subscription (app) {
    app.subscription = {
      wantedOAuthScopes: ['contacts_ro']
    }
  },

  'folder-view-mobile' (app) {
    if (_.device('!smartphone')) return

    const nav = app.pages.getNavbar('folderTree')
    const page = app.pages.getPage('folderTree')

    nav.on('rightAction', function () {
      app.toggleFolders()
    })

    const tree = new TreeView({ app, icons: false, contextmenu: true, flat: true, indent: false, module: 'contacts' })

    // initialize folder view
    FolderView.initialize({ app, tree })
    page.append(tree.render().$el)
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
    app.right = right.addClass('f6-target flex-col')
      .attr({
        tabindex: -1,
        'aria-label': gt('Contact Details')
      }).scrollable()
  },

  vgridTemplate (app) {
    const grid = app.grid
    const savedWidth = app.settings.get('vgrid/width/' + _.display())

    // do not apply on touch devices. it's not possible to change the width there
    if (!_.device('touch') && savedWidth) {
      app.left.css('width', savedWidth + 'px')
    }

    app.left.append(app.gridContainer.addClass('translucent-low'))

    // add template
    grid.addTemplate({
      build () {
        let name
        let description
        let location
        let photo
        let privateFlag
        this.addClass('contact').append(
          photo = $('<div class="avatar">').attr('aria-hidden', true),
          privateFlag = createIcon('bi/eye-slash.svg').addClass('private-flag').hide(),
          name = $('<div class="fullname">').attr('aria-hidden', true),
          description = $('<div class="description">').attr('aria-hidden', true),
          location = $('<div class="gray">').attr('aria-hidden', true)
        )
        return { name, private_flag: privateFlag, description, location, photo }
      },
      set (data, fields) {
        let fullname, name, description
        if (data.mark_as_distributionlist === true) {
          name = data.display_name || ''
          fields.name.text(name)
          fields.private_flag.get(0).style.display = data.private_flag ? '' : 'none'
          fields.description.text(gt('Distribution list'))
          fields.location.text('')
          fields.photo
            .empty()
            .addClass('distribution-list')
            .append(createIcon('bi/list.svg'))
            .css('background-image', '')
        } else {
          fullname = $.trim(util.getFullName(data))
          if (fullname) {
            name = fullname
            // use html output
            coreUtil.renderPersonalName({ $el: fields.name.empty(), html: util.getFullName(data, true) }, data)
          } else {
            name = $.trim(util.getFullName(data) || data.yomiLastName || data.yomiFirstName || data.display_name || util.getMail(data))
            coreUtil.renderPersonalName({ $el: fields.name.empty(), name }, data)
          }
          description = util.getSummaryBusiness(data)
          fields.private_flag.get(0).style.display = data.private_flag ? '' : 'none'
          fields.description.text(description)
          fields.location.text(util.getSummaryLocation(data))
          const url = api.getContactPhotoUrl(data, 48)
          const node = fields.photo.empty()
          if (url) {
            node.css('background-image', 'url(' + url + ')')
          } else {
            const initials = util.getInitials(data)
            const initialsColor = util.getInitialsColor(initials)
            node
              .css('background-image', '')
              .addClass('empty initials ' + initialsColor)
              .append(svg.circleAvatar(initials))
          }
          if (name === '' && description === '') {
            // nothing is written down, add some text, so user isn’t confused
            fields.name.addClass('gray').text(gt('Empty name and description found.'))
            fields.description.text(gt('Edit to set a name.'))
          } else {
            fields.name.removeClass('gray')
          }
        }
        this.attr('aria-label', name || description || gt('Empty name and description found.'))
      }
    })

    // The label function can be overwritten by an extension.
    let getLabel = function (data, field) {
      return String(data[field || 'sort_name'] || 'Ω')
        .trim().slice(0, 1).toUpperCase()
        .replace(/[ÄÀÁÂÃÄÅ]/g, 'A')
        .replace(/[Ç]/g, 'C')
        .replace(/[ÈÉÊË]/g, 'E')
        .replace(/[ÌÍÎÏ]/g, 'I')
        .replace(/[Ñ]/g, 'N')
        .replace(/[ÖÒÓÔÕØ]/g, 'O')
        .replace(/[ß]/g, 'S')
        .replace(/[ÜÙÚÛ]/g, 'U')
        .replace(/[ÝŸ]/g, 'Y')
      // digits, punctuation and others
        .replace(/[[\u0020-\u0040\u005B-\u017E]/g, '#')
        .replace(/[^A-Z#]/, 'Ω')
    }
    ext.point('io.ox/contacts/getLabel').each(function (extension) {
      if (extension.getLabel) getLabel = extension.getLabel
    })

    // add label template
    grid.addLabelTemplate({
      build () {
        // need to apply this here or label is not affected by correct css when height is calculated
        this.addClass('vgrid-label')
      },
      set (data) {
        this.text(getLabel(data, grid.getLabelField()))
      }
    })

    grid.getLabelField = function () {
      return this.props.get('sort') === 607 ? 'sort_name' : 'first_name'
    }

    // requires new label?
    grid.requiresLabel = function (i, data, current) {
      if (!data) return false
      const field = this.getLabelField()
      const prefix = getLabel(data, field)
      return (i === 0 || prefix !== current) ? prefix : false
    }
  },

  vgrid (app) {
    const grid = app.grid

    commons.wireGridAndAPI(grid, api)
    commons.wireGridAndWindow(grid, app.getWindow())
    commons.wireFirstRefresh(app, api)
    commons.wireGridAndRefresh(grid, api, app.getWindow())
    commons.wireGridAndSearch(grid, app, gt('This address book is empty'))

    app.props.on('change:sort change:order', function () {
      app.grid.props.set('sort', app.props.get('sort'))
      app.grid.props.set('order', app.props.get('order'))
      app.grid.refresh()
    })

    app.grid.props.set('sort', app.props.get('sort'))
    app.grid.props.set('order', app.props.get('order'))

    app.grid.setAllRequest(function () {
      const sort = app.grid.props.get('sort')
      const order = app.grid.props.get('order')
      return api.getAll({ folder: this.prop('folder'), sort, order }).then(response => {
        // do nothing if sort by last_name
        if (sort === 607) return response
        // local sort if sort by first_name
        response.forEach(item => {
          item.sort_name_first = [item.first_name, item.last_name].filter(Boolean).join('_').toLowerCase()
        })
        return response.sort((a, b) => {
          return a.sort_name_first.localeCompare(b.sort_name_first)
        })
      }).then(response => {
        if (order === 'asc') return response
        return response.reverse()
      })
    })
  },

  thumbindex (app) {
    // A11y: This needs some work!

    const fullIndex = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

    /**
     * Thumb index
     */
    function Thumb (opt) {
      if (this instanceof Thumb) {
        if (_.isString(opt)) {
          this.text = opt
        } else {
          _.extend(this, opt || {})
        }
      } else {
        return new Thumb(opt)
      }
    }

    Thumb.prototype.draw = function (baton) {
      const node = $('<li class="thumb-index" role="option">')
        .attr('id', _.uniqueId('ti_'))
        .text(this.label || this.text)
      if (this.enabled(baton)) {
        node.data('text', this.text)
      } else {
        node.addClass('thumb-index-disabled').attr('aria-disabled', true)
      }
      return node
    }

    Thumb.prototype.enabled = function (baton) {
      return this.text in baton.labels
    }

    function thumbClick (e, params) {
      params = _.extend({ inputdevice: 'mouse' }, params)
      const text = $(this).data('text')
      const silent = _.device('smartphone') || params.inputdevice !== 'keyboard'
      if (text) app.grid.scrollToLabelText(text, silent)
    }

    function thumbMove (e) {
      e.preventDefault()
      if (e.originalEvent && e.originalEvent.targetTouches) {
        const touches = e.originalEvent.targetTouches[0]
        const x = touches.clientX
        const y = touches.clientY
        const element = document.elementFromPoint(x, y)
        const text = $(element).data('text')
        if (text) app.grid.scrollToLabelText(text, /* silent? */ _.device('smartphone'))
      }
    }

    app.Thumb = Thumb

    app.left.addClass('flex-row').prepend(
      // thumb index
      app.thumbs = $('<ul class="contact-grid-index listbox" tabindex="0" role="listbox">')
      // #. index used in contacts list to jump to names with a specific starting letter
        .attr('aria-label', gt('Starting letter index'))
        .on('click', '.thumb-index', thumbClick)
        .on('touchmove', thumbMove)
    )
    // draw thumb index
    const baton = new ext.Baton({ app, data: [], Thumb })

    ext.point('io.ox/contacts/thumbIndex').extend({
      index: 100,
      id: 'draw',
      draw () {
        // get labels
        baton.labels = app.grid.getLabels().textIndex || {}

        // update thumb list
        ext.point('io.ox/contacts/thumbIndex').invoke('getIndex', app.thumbs, baton)

        app.thumbs.empty()

        _(baton.data).each(function (thumb) {
          app.thumbs.append(thumb.draw(baton))
        })
      },
      getIndex (baton) {
        const keys = _(baton.labels).keys()
        baton.data = _.map(fullIndex, baton.Thumb)

        // add omega thumb for any other leading chars
        if (!_(keys).any(function (char) { return char === 'Ω' })) return
        baton.data.push(new baton.Thumb({
          label: 'Ω',
          text: 'Ω',
          enabled: _.constant(true)
        }))
      }
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
  },
  'toolbars-mobile' () {
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
        // hide folder button on the left
        app.pages.getNavbar('listView').setRight(gt('Edit')).show('.left')
      } else {
        app.pages.getNavbar('listView').setRight(gt('Cancel')).hide('.left')
      }
      app.props.set('checkboxes', !app.props.get('checkboxes'))
    })
  },

  'swipe-mobile' () {
  },

  'show-contact' (app) {
    if (_.device('smartphone')) return
    // LFO callback
    const grid = app.grid

    const showContact = function (obj, useCache) {
      // get contact
      app.right.parent().off('scroll')
      app.right.busy({ empty: true })
      if (obj && obj.id !== undefined) {
        app.currentContact = api.reduce(obj)
        api.get(app.currentContact, useCache)
          .done(_.lfo(drawContact))
          .fail(_.lfo(drawFail, obj))
      } else {
        app.right.idle().empty()
      }
    }

    showContact.cancel = function () {
      _.lfo(drawContact)
      _.lfo(drawFail)
    }

    const drawContact = function (data) {
      const baton = ext.Baton({ data, app })
      baton.disable('io.ox/contacts/detail', 'inline-actions')
      if (grid.getMode() === 'all') baton.disable('io.ox/contacts/detail', 'breadcrumb')
      app.right.idle().empty().append(viewDetail.draw(baton))
    }

    const drawFail = function (obj) {
      app.right.idle().empty().append(
        $.fail(gt('Couldn\'t load contact data.'), function () {
          showContact(obj)
        })
      )
    }

    app.showContact = showContact
    commons.wireGridAndSelectionChange(grid, 'io.ox/contacts', showContact, app.right, api)
  },

  'show-contact-mobile' (app) {
    if (_.device('!smartphone')) return
    // LFO callback
    const grid = app.grid

    const showContact = function (obj) {
      // get contact
      // app.pages.getPage('detailView').busy();
      if (obj && obj.id !== undefined) {
        app.right.empty().busy()
        app.currentContact = api.reduce(obj)
        api.get(app.currentContact)
          .done(_.lfo(drawContact))
          .fail(_.lfo(drawFail, obj))
      } else {
        app.right.idle()
      }
    }

    showContact.cancel = function () {
      _.lfo(drawContact)
      _.lfo(drawFail)
    }

    const drawContact = function (data) {
      const baton = ext.Baton({ data, app })
      baton.disable('io.ox/contacts/detail', 'inline-actions')
      app.right.idle().empty().append(viewDetail.draw(baton))
    }

    const drawFail = function (obj) {
      app.right.idle().empty().append(
        $.fail(gt('Couldn\'t load contact data.'), function () {
          showContact(obj)
        })
      )
    }

    app.showContact = showContact
    commons.wireGridAndSelectionChange(grid, 'io.ox/contacts', showContact, app.right, api)
  },

  // Always change pages on tap, don't wait for data to load
  'select:contact-mobile' (app) {
    if (_.device('!smartphone')) return
    app.grid.getContainer().on('click', '.vgrid-cell.selectable', function () {
      if (app.props.get('checkboxes') === true) return
      // hijack selection event hub to trigger page-change event
      app.grid.selection.trigger('pagechange:detailView')
      app.pages.changePage('detailView')
    })
  },

  'selection-doubleclick' (app) {
    // detail app does not make sense on small devices
    // they already see tasks in full screen
    if (_.device('smartphone')) return
    app.grid.selection.on('selection:doubleclick', function (e, key) {
      ox.launch(() => import('@/io.ox/contacts/detail/main'), { cid: key })
    })
  },

  'delete:contact-mobile' (app) {
    if (_.device('!smartphone')) return
    api.on('delete', function () {
      if (app.pages.getCurrentPage().name === 'detailView') {
        app.pages.goBack()
      }
    })
  },

  'update:image' () {
    api.on('update:image', function (evt, updated) {
      // compare cids, because of all kind of different results from some strange API
      if (_.cid(updated) === _.cid(app.currentContact)) {
        app.showContact(app.currentContact)
      }
    })
  },

  'update:contact' () {
    api.on('update:contact', function (e, updated) {
      if (_.cid(updated) === _.cid(app.currentContact)) {
        const useCache = false
        app.showContact(app.currentContact, useCache)
      }
    })
  },

  'folder-view' (app) {
    app.treeView = new TreeView({ app, icons: false, contextmenu: true, flat: true, indent: false, module: 'contacts' })
    FolderView.initialize({ app, tree: app.treeView })
    app.folderView.resize.enable()
  },

  addFolderInfo (app) {
    if (_.device('smartphone')) return
    const grid = app.grid
    commons.addGridToolbarFolder(app, grid, 'CONTACTS')
    // addressbook folder no longer have a total count
    grid.on('change:ids', () => {
      if (grid.getMode() !== 'all') return
      const folder = grid.prop('folder')
      const model = folderAPI.pool.getModel(folder)
      if (model) model.set('total_ids', grid.getIds().length)
    })
  },

  'prop-fullnameformat' (app) {
    // redraw contact if fullNameFormat changes to correctly display selected contact name
    settings.on('change:fullNameFormat', function () {
      app.showContact(app.currentContact)
    })
  },

  'prop-mapService' (app) {
    // redraw contact if mapService changes
    settings.on('change:mapService', function () {
      app.showContact(app.currentContact)
    })
  },

  'prop-folderview' (app) {
    app.props.set('folderview', _.device('smartphone') ? false : app.settings.get('folderview/visible/' + _.display(), true))
  },

  'store-view-options' (app) {
    if (_.device('smartphone')) return
    app.props.on('change', _.debounce(function () {
      if (app.props.get('find-result')) return
      const data = app.props.toJSON()
      app.settings
        .set('listViewLayout', data.listViewLayout)
        .save()
    }, 500))
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

  'change:folder' (app) {
    if (_.device('smartphone')) return
    // folder change
    app.grid.on('change:ids', function () {
      ext.point('io.ox/contacts/thumbIndex').invoke('draw', app.thumbs, app.baton)
    })
  },

  'folder-view-mobile-listener' () {
    if (_.device('!smartphone')) return
    // always change folder on click
    // No way to use tap here since folderselection really messes up the event chain
    app.pages.getPage('folderTree').on('click', '.folder.selectable', function (e) {
      if (app.props.get('mobileFolderSelectMode') === true) {
        // open menu
        $(e.currentTarget).trigger('contextmenu')
        // do not change page in edit mode
        return
      }

      // do not open listview when folder is virtual
      const id = $(e.target).closest('.folder').data('id')
      if (folderAPI.isVirtual(id)) return

      app.pages.changePage('listView')
    })
  },

  'change:folder-mobile' () {
    if (_.device('!smartphone')) return
    app.grid.on('change:ids', function () {
      ext.point('io.ox/contacts/thumbIndex').invoke('draw', app.thumbs, app.baton)
      app.folder.getData().done(function (d) {
        app.pages.getNavbar('listView').setTitle(d.title)
      })
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

  'change:options' (app) {
    app.props
      .on('change:checkboxes change:showAvatars', redraw)
      .on('change:listViewLayout', function (model, value) {
        app.props.set({ checkboxes: value === 'checkboxes', showAvatars: value === 'avatars' })
        redraw()
      })

    function redraw () {
      app.getGrid().setEditable(app.props.get('checkboxes'))
      app.getGrid().getContainer().toggleClass('show-avatars', app.props.get('showAvatars'))
    }

    redraw()
  },

  'folderview-toolbar' (app) {
    if (_.device('smartphone')) return
    commons.mediateFolderView(app)
  },

  // change to default folder on no permission or folder not found errors
  'folder-error' (app) {
    app.folder.handleErrors()
  },

  'account-errors' (app) {
    let accountError
    app.treeView.on('click:account-error', function (folder) {
      accountError = folder.meta && folder.meta.errors ? folder.meta : false

      if (!accountError) return
      accountError.error = gt('The subscription could not be updated due to an error and must be recreated.')

      new ModalDialog({
        point: 'io.ox/contacts/account-errors',
        // #. title of dialog when contact subscription needs to be recreated on error
        title: gt('Contacts account error')
      })
        .extend({
          default () {
            this.$body.append(
              $('<div class="info-text">')
                .css('word-break', 'break-word')
                .text(accountError.error)
            )
          }
        })
        .addCancelButton()
        .addButton({ label: gt('Edit subscription'), action: 'subscription', className: 'btn-primary' })
        .on('subscription', () => openSettings('virtual/settings/io.ox/core/sub'))
        .open()
    })
  },

  'api-events' (app) {
    api.on('create update delete refresh.all', function () {
      folderAPI.reload(app.folder.get())
    })
  },

  import () {
    api.on('import', function () {
      // update current detailview
      api.trigger('update:' + _.ecid(app.currentContact))
    })
  },

  'api-create-event' (app) {
    if (_.device('smartphone')) return

    api.on('create', function (e, data) {
      data.folder_id = data.folder_id || data.folder
      app.folder.set(data.folder_id).done(function () {
        app.grid.setPreSelection(data)
      })
    })
  },

  'drag-and-drop' (app) {
    // drag & drop
    app.getWindow().nodes.outer.on('selection:drop', function (e, baton) {
      actionsUtil.invoke('io.ox/contacts/actions/move', baton)
    })
  },

  'contextual-help' (app) {
    app.getContextualHelp = function () {
      return 'ox.appsuite.user.sect.contacts.gui.html'
    }
  },

  sidepanel (app) {
    ext.point('io.ox/contacts/sidepanel').extend({
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
      point: 'io.ox/contacts',
      label: gt('New contact'),
      action: 'io.ox/contacts/actions/create',
      toolbar: 'create'
    })
  },

  detailviewResizehandler (app) {
    if (_.device('smartphone')) return
    app.right.toggleClass('small-width', app.right.width() < 500)
    $(document).on('resize', function () {
      app.right.toggleClass('small-width', app.right.width() < 500)
    })
  },

  'categories-search' (app) {
    if (!coreSettings.get('features/categories', false)) return

    ox.on('search:category', function search (name) {
      const app = ox.ui.App.getCurrentApp()
      if (app.get('id') !== 'io.ox/contacts') return
      const search = app.searchView
      search.filters.add('categories', `"${name}"`)
      search.submit()
    })
  }
})

// launcher
app.setLauncher(function (options) {
  // get window
  const win = ox.ui.createWindow({
    name: 'io.ox/contacts',
    chromeless: true
  })

  app.setWindow(win)
  app.settings = settings

  const listViewLayout = app.settings.get('listViewLayout', 'avatars')
  app.props = new Backbone.Model({
    listViewLayout,
    showAvatars: _.device('smartphone') ? false : listViewLayout === 'avatars',
    checkboxes: _.device('smartphone') ? false : listViewLayout === 'checkboxes',
    mobileFolderSelectMode: false,
    sort: 607,
    order: 'asc'
  })

  app.gridContainer = $('<div class="contact-grid-container">')
    .attr({
      role: 'navigation',
      'aria-label': gt('Contacts')
    })

  app.grid = new VGrid(app.gridContainer, {
    settings,
    hideTopbar: _.device('smartphone'),
    hideToolbar: _.device('smartphone'),
    containerLabel: gt('Contact list. Select a contact to view details.'),
    dividerThreshold: settings.get('dividerThreshold', 30),
    showCheckbox: false
  })

  app.gridContainer.find('.vgrid-toolbar').attr('aria-label', gt('Contacts toolbar'))

  app.getGrid = function () {
    return app.grid
  }

  if (capabilities.has('gab !alone') && !options.folder && app.settings.get('startInGlobalAddressbook', true)) options.folder = util.getGabId()

  const def = $.Deferred()
  commons.addFolderSupport(app, app.grid, 'contacts', options.folder)
    .always(function () {
      app.mediate()
      if (_.device('!smartphone')) {
        const observer = new ResizeObserver(() => {
          const $dl = app.right.find('dl.definition-list.contact-header')
          if ($dl.width() > 453) $dl.removeClass('small')
          else $dl.addClass('small')
        })
        observer.observe(app.right.get(0))
      }
      // only resolve once mediate was called otherwise we get ugly runtime issues
      def.resolve()
      win.show()
    })
  return def
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
  return $.when()
})

export default {
  getApp: app.getInstance
}
