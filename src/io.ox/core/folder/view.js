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
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/core/folder/api'
import * as util from '@/io.ox/contacts/util'
import { check, invoke } from '@/io.ox/backbone/views/actions/util'
import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { createIcon, createButton } from '@/io.ox/core/components'

function initialize (options) {
  options = _.extend({
    firstResponder: 'listView',
    autoHideThreshold: 700
  }, options)

  const app = options.app
  const tree = options.tree
  const module = tree.options.module
  const POINT = app.get('name') + '/folderview'
  let visible = false
  let open = app.settings.get('folderview/open', {})
  const nodes = app.getWindow().nodes
  const sidepanel = nodes.sidepanel
  const sidebar = nodes.sidebar
  let hiddenByWindowResize = false
  let forceOpen = false
  const DEFAULT_WIDTH = 280

  // smart defaults for flat folders
  if (!open) {
    open = {}
    // open private and public by default
    if (/^(contacts|calendar|event|tasks)$/.test(module)) {
      open[_.display()] = ['virtual/flat/' + module + '/private', 'virtual/flat/' + module + '/public']
    }
  }

  //
  // Utility functions
  //

  function storeVisibleState () {
    app.settings.set('folderview/visible/' + _.display(), visible).save()
  }

  function storeWidth (width) {
    if (width === undefined) {
      app.settings.remove('folderview/width/' + _.display())
    } else {
      app.settings.set('folderview/width/' + _.display(), width)
    }
    app.settings.save()
  }

  function getWidth () {
    return app.settings.get('folderview/width/' + _.display(), DEFAULT_WIDTH)
  }

  function applyWidth (x) {
    const width = x === undefined ? '' : x + 'px'
    nodes.sidepanel.css('width', width)
  }

  function applyInitialWidth () {
    applyWidth(getWidth())
  }

  function resetLeftPosition () {
    const win = app.getWindow()
    const chromeless = win.options.chromeless
    const tooSmall = $(document).width() <= app.folderView.resize.autoHideThreshold
    nodes.body.css('left', chromeless || tooSmall ? 0 : 50)
  }

  // trigger generic resize event so that other components can respond to it
  const populateResize = _.debounce(() => $(document).trigger('resize'), 200)

  //
  // Add API
  //

  app.folderView = {

    tree,
    forceOpen,

    isVisible () {
      return visible
    },

    show () {
      visible = true
      if (!hiddenByWindowResize) storeVisibleState()
      applyInitialWidth()
      app.trigger('folderview:open')
      sidepanel.show()
      sidebar.hide()
      populateResize()
    },

    hide () {
      visible = false
      forceOpen = false
      if (!hiddenByWindowResize) storeVisibleState()
      resetLeftPosition()
      sidepanel.hide()
      sidebar.show()
      app.trigger('folderview:close')
      populateResize()
    },

    toggle (state) {
      if (state === undefined) state = !visible
      this[state ? 'show' : 'hide']()
    },

    resize: (function () {
      let maxSidePanelWidth = 0
      const minSidePanelWidth = options.tree.options.minWidth || 240
      let base; let width

      function mousemove (e) {
        const x = e.pageX - base
        if (x > maxSidePanelWidth || x < minSidePanelWidth) return
        app.trigger('folderview:resize')
        applyWidth(width = x)
        populateResize()
      }

      function mouseup (e) {
        $(this).off('mousemove.resize mouseup.resize')
        populateResize()
        // auto-close?
        if (e.pageX - base < minSidePanelWidth * 0.75) {
          app.folderView.hide()
        } else if (sidepanel.css('display') === 'none' && sidepanel.width() * 0.75 > minSidePanelWidth) {
          storeWidth(minSidePanelWidth)
          app.folderView.show()
        } else {
          storeWidth(width || DEFAULT_WIDTH)
        }
      }

      function mousedown (e) {
        e.preventDefault()
        base = e.pageX - sidepanel.width()
        maxSidePanelWidth = $(document).width() / 2
        $(document).on({
          'mousemove.resize': mousemove,
          'mouseup.resize': mouseup
        })
      }

      return {
        enable () {
          [sidepanel, sidebar].forEach(el => el.append(
            $('<div class="resizebar">').on('mousedown.resize', mousedown)
          ))
        },
        autoHideThreshold: options.autoHideThreshold
      }
    }())
  }

  app.folderViewIsVisible = function () {
    return visible
  }

  app.addPrimaryAction = function (options) {
    const baton = ext.Baton({ app: this, appId: this.get('id'), folder_id: app.folder.get() })
    let $buttonSidebar
    let $toggle
    let $buttonSidepanel
    let sidepanelDropdown
    let sidebarDropdown
    let $buttonGroup
    if (options.action) {
      // we have a primary action
      // -> button in sidebar plus split button in sidepanel
      $buttonSidebar = createButton({
        variant: 'primary',
        icon: {
          name: options.icon || 'bi/plus-lg.svg',
          title: options.label
        },
        disabled: true
      }).on('click', { baton }, onClick)
      // split button
      $buttonSidepanel = createButton({ variant: 'primary', text: options.label, disabled: true })
        .on('click', { baton }, onClick)
      const $toggle = createButton({ variant: 'primary', icon: { name: 'bi/chevron-down.svg', className: 'bi-12', title: gt('More actions') } }).addClass('dropdown-toggle')
      sidepanelDropdown = new Dropdown({ $toggle }).render()
      $buttonGroup = $('<div class="btn-group" role="toolbar">')
        .append($buttonSidepanel, sidepanelDropdown.$toggle, sidepanelDropdown.$ul)
    } else {
      // NO primary action
      // -> dropdown in both sidebar AND sidepanel
      $buttonSidepanel = $()
      $toggle = $('<button type="button" class="btn btn-primary flex-center">').append(
        $('<span class="flex-grow">').text(options.label),
        createIcon('bi/chevron-down.svg').addClass('bi-12')
      )
      sidepanelDropdown = new Dropdown({ $toggle }).render()
      $toggle = createButton({ variant: 'primary', icon: { name: options.icon || 'bi/plus-lg.svg', title: options.label } })
      sidebarDropdown = new Dropdown({ $toggle }).render()
      ext.point('io.ox/secondary').invoke('render', sidebarDropdown, baton)
    }

    ext.point('io.ox/secondary').invoke('render', sidepanelDropdown, baton)

    // keep baton up to date
    app.on('folder:change', id => { baton.folder_id = id })

    ext.point(options.point + '/sidepanel').extend({
      id: 'primary-action',
      index: 10,
      draw () {
        this.append(
          $('<div class="primary-action" role="region">').attr('aria-label', options.label).append($buttonGroup || sidepanelDropdown.$el)
        )
      }
    })

    ext.point(options.point + '/sidebar').extend(
      {
        id: 'primary-action',
        index: 10,
        draw () {
          this.append($buttonSidebar || sidebarDropdown.$el)
        }
      },
      {
        id: 'open-folder-view',
        index: 10000,
        draw (baton) {
          this.append(
            createButton({ variant: 'toolbar', icon: { name: 'bi/layout-split.svg', title: gt('Open folder view'), className: 'bi-14' } })
              .addClass('margin-top-auto btn-translucent-white')
              .on('click', () => baton.app.folderView.toggle(true))
          )
        }
      }
    )

    function onClick (e) {
      invoke(options.action, e.data.baton)
    }

    function updateState () {
      // primary action
      if (options.action) {
        check(options.action, baton).then(bool => {
          $buttonSidepanel.prop('disabled', !bool)
          $buttonSidebar.prop('disabled', !bool)
        })
      }
      // secondary actions
      sidepanelDropdown.$ul.add(sidebarDropdown?.$ul).find('[data-name]').each(function () {
        const $el = $(this)
        check($el.attr('data-name'), baton).then(bool => {
          // remove link when it has drawDisabled explicitly set to false
          if (!bool && !ext.point($el.attr('data-name')).reduce((m, o) => o.drawDisabled !== false, true)) $el.parent().remove()
          $el.prop('disabled', !bool).toggleClass('disabled', !bool)
        })
      })
    }

    this.on('folder:change', updateState)
    api.on('after:folder:refresh^', updateState)

    const sidepanel = this.getWindow().nodes.sidepanel
    ext.point(options.point + '/sidepanel').invoke('draw', sidepanel, ext.Baton({ app: this }))
    const sidebar = this.getWindow().nodes.sidebar
    ext.point(options.point + '/sidebar').invoke('draw', sidebar, ext.Baton({ app: this }))
    updateState()
  }

  //
  // Respond to window resize
  //

  function handleWindowResize () {
    // get current width
    const width = $(document).width()
    // skip if window is invisible
    if (!nodes.outer.is(':visible')) return
    // respond to current width
    const threshold = app.folderView.resize.autoHideThreshold
    if (!app.folderView.forceOpen && !hiddenByWindowResize && visible && width <= threshold) {
      app.folderView.hide()
      hiddenByWindowResize = true
    } else if (hiddenByWindowResize && width > threshold) {
      app.folderView.show()
      hiddenByWindowResize = false
    }
  }

  $(window).on('resize', _.throttle(handleWindowResize, 200))

  //
  // Extensions
  //

  // default options
  ext.point(POINT + '/options').extend({
    id: 'defaults',
    index: 100,
    rootFolderId: '1',
    type: undefined,
    view: 'ApplicationFolderTree',
    // disable folder popup as it takes to much space for startup on small screens
    visible: _.device('smartphone') ? false : app.settings.get('folderview/visible/' + _.display(), true)
  })

  //
  // Initialize
  //

  // migrate hidden folders
  if (module) {
    // yep, folder/hidden is one key
    let hidden = settings.get(['folder/hidden'])
    if (hidden === undefined) {
      hidden = app.settings.get('folderview/blacklist', {})
      if (_.isObject(hidden)) settings.set(['folder/hidden'], hidden).save()
    }
  }

  // work with old non-device specific setting (<= 7.2.2) and new device-specific approach (>= 7.4)
  if (open && open[_.display()]) open = open[_.display()]
  open = _.isArray(open) ? open : []

  // apply
  tree.open = open

  // set initial folder?
  const id = app.folder.get()

  if (_.device('smartphone')) {
    // due to needed support for older androids we use click here
    tree.$el.on('click', '.folder', _.debounce(function (e) {
      // use default behavior for arrow
      const mobileSelectMode = app.props.get('mobileFolderSelectMode')
      // prevent `folder-arrow`/`color-label` from also opening the dropdown menu
      if ($(e.target).is('.folder-arrow, .fa, .color-label')) return
      // use default behavior for non-selectable virtual folders
      const targetFolder = $(e.target).closest('.folder')
      // toggle subfolders when clicking section label (or 'My Folders' in mail) outside edit mode
      if (!mobileSelectMode && (targetFolder.hasClass('section') || targetFolder.data().model === 'virtual/myfolders')) {
        $(e.target).siblings('.folder-arrow').click()
        return
      }
      if (mobileSelectMode && $(targetFolder).attr('data-contextmenu')) {
        return tree.dropdown.$('.dropdown-toggle').trigger('click', 'foldertree')
      }

      // return here as we can not change the page to a virtual folder with the exception of a selectable virtual folder
      if (targetFolder.is('.virtual') && tree.selection.selectableVirtualFolders[targetFolder.data().id] !== true) return

      // default 'listView'
      if (options.firstResponder) app.pages.changePage(options.firstResponder)
      // callback for custom actions after pagechange
      if (options.respondCallback) options.respondCallback()
    }, 10))

    if (id) {
      // defer so that favorite folders are drawn already
      _.defer(tree.selection.preselect.bind(tree.selection, id))
    }
  } else if (id) {
    // defer so that favorite folders are drawn already
    _.defer(function () {
      api.path(id).done(function (path) {
        // get all ids except the folder itself, therefore slice(0, -1);
        const ids = _(path).pluck('id').slice(0, -1)
        const folder = _(path).where({ id })[0]
        // in our apps folders are organized in virtual folders, we need to open the matching section too (private, shared, public)
        // folder 6 is special, it's the global addressbook and the only system folder under public section. Folderdata alone does not give this info.
        const section = folder.id === util.getGabId() ? 'public' : api.getSection(folder.type, folder.id)

        if (section && /(mail|contacts|calendar|tasks|infostore)/.test(tree.module) && tree.flat && tree.context === 'app') {
          const module = tree.module === 'calendar' ? 'event' : tree.module
          ids.push('virtual/flat/' + module + '/' + section)
        }
        tree.open = _(tree.open.concat(ids)).uniq()
      })
        .always(function () {
          // defer selection; might be too fast otherwise
          tree.onAppear(id, function () {
            _.defer(function () {
              tree.selection.preselect(id)
              tree.selection.scrollIntoView(id)
              // trigger change event manually for virtual folders, needed for someviews to update correctly after initializing (myshares folder for example)
              if (api.isVirtual(id)) {
                tree.selection.triggerChange()
              }
            })
          })
          // render now
          tree.render()
        })
    })
  } else {
    tree.render()
  }

  // a11y adjustments
  tree.$('.tree-container').attr({
    'aria-label': gt('Folders')
  })

  // add "flat" class to allow specific CSS rules
  tree.$('.tree-container').toggleClass('flat-tree', api.isFlat(tree.options.module))

  // apply all options
  _(ext.point(POINT + '/options').all()).each(function (obj) {
    options = _.extend(obj, options || {})
  })

  function showFolder (id, index, path) {
    // ignore system root
    if (index === 0) return
    // expand parents
    if (index !== (path.length - 1)) {
      return this.onAppear(id, function (node) {
        if (!node.isOpen()) node.toggle(true)
      })
    }
    // scroll leaf into view
    this.onAppear(id, function (node) {
      // cause folder node contains all sub folder nodes and can become quite large
      node.$el.intoView(this.$el, { ignore: 'bottom:partial' })
    })
  }

  // respond to folder change events

  (function folderChangeEvents () {
    let ignoreChangeEvent = false

    // on change via app.folder.set
    app.on('folder:change', function (id, data, favorite) {
      if (ignoreChangeEvent) return
      tree.traversePath(id, showFolder)

      if (tree.$el.find(`[data-id="${CSS.escape(id)}"]`).length) {
        // check before selection if node is inside tree
        tree.selection.set(id, favorite)
      } else {
        // wait for node to appear inside tree before selection
        tree.on('appear:' + id, function () {
          tree.selection.set(id, favorite)
          tree.off('appear:' + id)
        })
      }
    })

    // on selection change
    tree.on('change', function (id) {
      // updates folder manager
      ignoreChangeEvent = true
      app.folder.set(id)
      ignoreChangeEvent = false
    })

    // on selection change
    tree.on('virtual', function (id) {
      app.trigger('folder-virtual:change', id)
    })

    api.on('create', _.debounce(function (data) {
      // compare folder/node.js onSort delay
      tree.traversePath(data.id, showFolder)
    }, 15))
  }())

  // respond to folder removal
  api.on('before:remove', function (data) {
    // select parent or default folder
    const id = /^(1|2)$/.test(data.folder_id) ? api.getDefaultFolder(data.module) || '1' : data.folder_id
    tree.selection.set(id)
  })

  // respond to folder move
  api.on('move', function (id, newId) {
    tree.traversePath(newId, showFolder)
    tree.selection.set(newId)
  })

  // respond to open/close
  tree.on('open close', function () {
    const open = this.getOpenFolders()
    app.settings.set('folderview/open/' + _.display(), open).save()
  })

  // debug
  window.tree = tree

  // initial visibility
  const state = app.settings.get('folderview/visible/' + _.display(), true)
  app.folderView.toggle(state)
}

export default {
  initialize
}
