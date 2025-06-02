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

import ext from '@/io.ox/core/extensions'
import folderAPI from '@/io.ox/core/folder/api'
import accountAPI from '@/io.ox/core/api/account'
import attachmentAPI from '@/io.ox/core/api/attachment'
import resourceAPI from '@/io.ox/core/api/resource'
import HelpLinkView from '@/io.ox/backbone/mini-views/helplink'
import FolderInfoView from '@/io.ox/core/tk/folder-info'
import { createIcon, createButton } from '@/io.ox/core/components'

import gt from 'gettext'

const commons = {

  /**
   * Common show window routine
   */
  showWindow (win) {
    return function () {
      const def = $.Deferred()
      win.show(def.resolve)
      return def
    }
  },

  simpleMultiSelection (node, selection, grid) {
    const length = selection.length

    if (length <= 1) return

    // #. %1$s is the number of selected items
    // #, c-format
    const pattern = gt.ngettext('%1$s item selected', '%1$s items selected', length)

    // create a <span> element with the number of items for the placeholder
    const nodes = _.noI18n.assemble(pattern, function () { return $('<span class="number">').text(_.noI18n(length)) }, $.txt)

    node.idle().empty().append(
      $('<div class="flex-center multi-selection-message">').append(
        $('<div class="message" id="' + grid.multiselectId + '">').append(nodes)
      )
    )
  },

  wireGridAndSelectionChange (grid, id, draw, node, api) {
    let last = ''; let label
    grid.selection.on('change', function (e, selection) {
      const len = selection.length
      // work with reduced string-based set
      const flat = JSON.stringify(_([].concat(selection)).map(function (o) {
        return { folder_id: String(o.folder_id || o.folder), id: String(o.id), recurrence_position: String(o.recurrence_position || 0) }
      }))

      function updateLabel () {
        const parent = node.parent()
        if (len <= 1 && label) {
          // reset label
          parent.attr('aria-label', _.escape(label))
        } else if (len > 1) {
          // remember label
          label = label || parent.attr('aria-label')
          // overwrite
          parent.attr('aria-label', gt('Selection Details'))
        }
      }

      // has anything changed?
      if (flat !== last) {
        if (len === 1) {
          // single selection
          node.css('height', '')
          draw(selection[0])
        } else if (len > 1) {
          // multi selection
          if (draw.cancel) draw.cancel()
          node.css('height', '100%')
          commons.simpleMultiSelection(node, this.unique(this.unfold()), grid)
        } else {
          // empty
          if (draw.cancel) draw.cancel()
          node.css('height', '100%').idle().empty().append(
            $('<div class="io-ox-center">').append(
              $('<div class="io-ox-multi-selection">').append(
                $.svg({ src: 'themes/default/illustrations/empty-selection-generic.svg', width: 200, height: 96, role: 'presentation' })
                  .addClass('illustration'),
                $('<div class="summary empty">').text(gt('No elements selected'))
              )
            )
          )
          if (_.device('smartphone')) {
            // don't stay in empty detail view
            const vsplit = node.closest('.vsplit')
            // only click if in detail view to prevent infinite loop
            if (!vsplit.hasClass('vsplit-reverse')) {
              // trigger back button
              vsplit.find('.rightside-navbar a>i').last().trigger('click')
            }
          }
        }
        // landmark label
        updateLabel()
        // remember current selection
        last = flat
      }
    })

    // look for id change
    if (api) {
      api.on('change:id', function (e, data, formerId) {
        const list = grid.selection.get()
        if (list.length && list[0].id === formerId) {
          grid.selection.set({ id: data.id, folder_id: data.folder_id })
        }
      })
    }
  },

  /**
   * Wire grid & API
   */
  wireGridAndAPI (grid, api, getAll, getList) {
    // all request
    grid.setAllRequest(function () {
      return api[getAll || 'getAll']({ folder: this.prop('folder') })
    })
    // list request
    grid.setListRequest(function (ids) {
      return api[getList || 'getList'](ids)
    })
    // clean up selection index on delete
    api.on('beforedelete', function (e, ids) {
      grid.selection.removeFromIndex(ids)

      const list = grid.selection.get(); let index
      if (list.length > 0) {
        if (_.device('smartphone')) {
          // preparation to return to vgrid
          grid.selection.clear(true)
        } else {
          index = grid.selection.getIndex(list[0])
          grid.selection.clear(true).selectIndex(index + 1)
          if (grid.getIds().length === list.length) {
            grid.selection.trigger('change', [])
          }
        }
      }
    })
  },

  wireGridAndSearch (grid, app, emptyFolderMessage) {
    grid.getEmptyMessage = function () {
      const isSearch = !!app.props.get('searching')
      const file = isSearch ? 'empty-search' : 'empty-folder'
      return $('<div class="text-center">').append(
        $.svg({ src: `themes/default/illustrations/${file}.svg`, width: 200, height: 96, role: 'presentation' })
          .addClass('illustration'),
        $('<div>').text(
          isSearch ? gt('No search results') : (emptyFolderMessage || gt('This folder is empty'))
        )
      )
    }
  },

  /**
   * Wire grid & window
   */
  wireGridAndWindow (grid, win) {
    let top = 0
    const on = function () {
      grid.keyboard(true)
      if (grid.selection.get().length) {
        // only retrigger if selection is not empty; hash gets broken if caches are empty
        // TODO: figure out why this was important
        grid.selection.retriggerUnlessEmpty()
      }
    }

    grid.setApp(win.app)
    // show
    win.on('show idle', on)
    // hide
      .on('hide busy', function () {
        grid.keyboard(false)
      })
      .on('beforeshow', function () {
        if (top !== null) { grid.scrollTop(top) }
      })
      .on('beforehide', function () {
        top = grid.scrollTop()
      })
    // publish grid
    if (win.app) {
      win.app.getGrid = function () {
        return grid
      }
    }
    // already visible?
    if (win.state.visible) { on() }
  },

  /**
   * [ description]
   * @param  {object} app  application object
   * @param  {object} grid grid object
   * @return               void
   */
  addGridToolbarFolder (app, grid) {
    const point = ext.point(app.get('name') + '/vgrid/toolbar')
    point.extend({
      id: 'info',
      index: 100,
      draw (baton) {
        if (_.device('smartphone')) return
        this.addClass('items-center').append(
          new FolderInfoView({ app: baton.app }).render().$el
        )
      }
    })
    point.invoke('draw', grid.getToolbar(), ext.Baton({ app }))
  },

  /**
   * Wire first refresh
   */
  wireFirstRefresh (app, api) {
    // don't need first refresh if persistence=false
    if (ox.serverConfig.persistence === false) return
    // open (first show)
    app.getWindow().on('open', function () {
      if (api.needsRefresh(app.folder.get())) {
        api.trigger('refresh^', app.folder.get())
      }
    })
  },

  /**
   * Wire grid and API refresh
   */
  wireGridAndRefresh (grid, api, win) {
    const refreshAll = function () {
      grid.refresh(true)
      if (_.device('smartphone')) grid.selection.retrigger()
    }
    const refreshList = function () {
      grid.repaint()
      grid.selection.retrigger()
    }
    const pending = function () {
      grid.pending()
    }
    const off = function () {
      api.off('refresh.all refresh:all:local', refreshAll)
        .off('refresh.pending', pending)
        .off('refresh.list', refreshList)
    }
    const on = function () {
      off()
      api.on('refresh.all refresh:all:local', refreshAll)
        .on('refresh.pending', pending)
        .on('refresh.list', refreshList)
        .trigger('refresh.all')
    }
    win.on({ show: on, hide: off })
    // already visible?
    if (win.state.visible) { on() }
  },

  wirePerspectiveEvents (app) {
    const win = app.getWindow()
    let oldPerspective = null
    win.on('show', function () {
      oldPerspective = win.currentPerspective
      if (win.currentPerspective) {
        app.trigger('perspective:' + win.currentPerspective + ':show')
      }
    })

    win.on('hide', function () {
      oldPerspective = win.currentPerspective
      if (win.currentPerspective) {
        app.trigger('perspective:' + win.currentPerspective + ':hide')
      }
    })

    win.on('change:perspective', function (e, newPerspective) {
      if (oldPerspective) {
        app.trigger('perspective:' + oldPerspective + ':hide')
      }
      oldPerspective = newPerspective
      app.trigger('perspective:' + newPerspective + ':show')
    })

    win.on('change:initialPerspective', function (e, newPerspective) {
      oldPerspective = newPerspective
      app.trigger('perspective:' + newPerspective + ':show')
    })
  },

  /**
   * Add folder support
   */
  addFolderSupport (app, grid, type, defaultFolderId) {
    app.folder
      .updateTitle(app.getWindow())
      .setType(type)
    if (grid) {
      app.folder.updateGrid(grid)
    }

    // hash support
    app.getWindow().on('show', function () {
      if (grid) {
        grid.selection.retriggerUnlessEmpty()
      }
      _.url.hash('folder', app.folder.get())
    })

    defaultFolderId = _.url.hash('folder') || defaultFolderId

    function apply (id) {
      return app.folder.set(id).then(_.identity, function () {
        // fallback to default on error
        return $.when(app.folder.setDefault())
      })
    }

    // explicit vs. default
    if (defaultFolderId !== undefined) {
      return apply(defaultFolderId)
    } else if (type === 'mail') {
      return accountAPI.getUnifiedInbox().then(function (id) {
        if (id === null) return app.folder.setDefault()
        return apply(id)
      })
    }
    return app.folder.setDefault()
  },

  /**
   * stores state of property collection for a specified key property
   * @param {object}   grid
   * @param {object}   options
   * @param {string}   options.keyprop cache id / changes on this trigger cache set
   * @param {string[]} options.props   cached properties
   */
  addPropertyCaching (grid, options) {
    // be robust
    grid = grid || { prop: $.noop() }

    const mapping = {}
    const superprop = grid.prop
    const opt = $.extend({
      keyprop: 'folder',
      props: ['sort', 'order']
    }, options || {})
    // fluent cache
    let storage = {}
    const cache = {
      set (id, key, value) {
        storage[id] = storage[id] || {}
        storage[id][key] = value
      },
      get (id, key) {
        // return specific/all prop(s)
        return !key ? storage[id] || {} : (storage[id] || {})[key]
      },
      remove (id) {
        storage[id] = {}
      },
      clear () {
        storage = {}
      }
    }

    // ensure array
    opt.props = [].concat(opt.props)

    // register props
    _.each(opt.props, function (key) {
      mapping[key] = true
    })

    // save state if key property is changed
    function process (key, value) {
      let id
      const fulfilled = key === opt.keyprop &&
                               typeof value !== 'undefined' &&
                               value !== superprop(opt.keyprop)
      // condition fulfilled
      if (fulfilled) {
        // current key property value valid (used as cache id)
        id = superprop(opt.keyprop)
        if (id) {
          // collect and store current props
          cache.remove(id)
          _.each(opt.props, function (prop) {
            cache.set(id, prop, superprop(prop))
          })
        }
      }
    }
    if (_.isUndefined(grid.propcache)) {
      // access property cache via grid
      grid.propcache = function (key, fallback, id) {
        id = id || superprop(opt.keyprop)
        return mapping[key] ? cache.get(id, key) || fallback : fallback
      }

      // overwrite prop method
      grid.prop = function (key, value) {
        process(key, value)
        return superprop.call(grid, key, value)
      }
    }
  },

  addGridFolderSupport (app, grid) {
    app.folder.updateGrid(grid)
    app.getWindow().on('show', function () {
      grid.selection.retriggerUnlessEmpty()
    })
  },

  vsplit: (function () {
    let selectionInProgress = false

    const click = function (e) {
      e.preventDefault()
      if (selectionInProgress) {
        // prevent execution of selection to prevent window from flipping back
        selectionInProgress = false
      }
      $(this).parent().find('.rightside-inline-actions').empty()
      $(this).closest('.vsplit').addClass('vsplit-reverse').removeClass('vsplit-slide')
      if (e.data.app && e.data.app.getGrid) {
        if (_.device('smartphone')) {
          e.data.app.getGrid().selection.trigger('changeMobile')
        }
        e.data.app.getGrid().selection.clear()
      }

      if (_.device('smartphone')) {
        $(this).closest('.vsplit').find('.leftside .tree-container').trigger('changeMobile')
      }
    }

    const select = function () {
      const node = $(this)
      selectionInProgress = true
      setTimeout(function () {
        if (selectionInProgress) {
          // still valid
          node.closest('.vsplit').addClass('vsplit-slide').removeClass('vsplit-reverse')
          selectionInProgress = false
        }
      }, 100)
    }

    return function (parent, app) {
      const sides = {}
      parent.addClass('vsplit').append(
        // left
        sides.left = $('<div class="leftside">')
          .attr({
            role: 'complementary',
            'aria-label': gt('Item list')
          })
          .on('select', select),
        // navigation
        $('<div class="rightside-navbar">').append(
          $('<div class="rightside-inline-actions">'),
          $('<a href="#" tabindex="-1">').append(
            createIcon('bi/chevron-left.svg'), $.txt(' '), $.txt(gt('Back'))
          ).on('click', { app }, click)
        ),
        // right
        sides.right = $('<div class="rightside">')
      )
      //
      return sides
    }
  }()),

  help (baton) {
    if (_.device('smartphone')) return

    this.find('.generic-toolbar.bottom:last-of-type').append(
      new HelpLinkView({ href: getLink(baton && baton.app && baton.app.id) })
        .render().$el.addClass('btn btn-toolbar btn-translucent-white')
    )

    function getLink (id) {
      if (id === 'io.ox/mail') return 'ox.appsuite.user.sect.email.gui.foldertree.html'
      if (id === 'io.ox/files') return 'ox.appsuite.user.sect.drive.gui.foldertree.html'
      if (id === 'io.ox/contacts') return 'ox.appsuite.user.sect.contacts.gui.foldertree.html'
      if (id === 'io.ox/calendar') return 'ox.appsuite.user.sect.calendar.gui.foldertree.html'
      if (id === 'io.ox/tasks') return 'ox.appsuite.user.sect.tasks.gui.foldertree.html'
      return 'ox.appsuite.user.sect.dataorganisation.folder.html'
    }
  },

  mediateFolderView (app) {
    ext.point(app.get('name') + '/sidepanel').extend({
      id: 'toggle-folderview',
      index: 1000,
      draw () {
        const guid = _.uniqueId('control')
        this.addClass('bottom-toolbar').append(
          $('<div class="generic-toolbar bottom visual-focus" role="region">').attr('aria-labelledby', guid).append(
            createButton({ variant: 'toolbar', icon: { name: 'bi/layout-sidebar.svg', title: gt('Close folder view') } })
              .addClass('btn-translucent-white')
              .attr({ id: guid, 'data-action': 'close-folder-view' })
              .on('click', () => app.folderView.toggle(false))
          )
        )
      }
    })

    ext.point(app.get('name') + '/sidepanel').extend({
      id: 'help',
      index: 1100,
      draw: commons.help
    })

    // app.on({
    //   'folderview:open': onFolderViewOpen.bind(null, app),
    //   'folderview:close': onFolderViewClose.bind(null, app)
    // })

    const grid = app.getGrid(); const topbar = grid.getTopbar()
    ext.point(app.get('name') + '/vgrid/second-toolbar').invoke('draw', topbar, ext.Baton({ grid }))
    // onFolderViewClose(app)

    // if (app.folderViewIsVisible()) _.defer(onFolderViewOpen, app)
  },

  addFolderViewToggle (app) {
    if (_.device('smartphone')) return
    app.toggleFolderView = async function (e) {
      e.preventDefault()
      app.trigger('before:change:folderview')
      app.folderView.toggle(e.data.state)

      if (e.data.state) {
        app.folderView.tree.getNodeView(app.folder.get()).$el.focus()
      } else {
        const { default: a11y } = await import('@/io.ox/core/a11y')
        a11y.getTabbable(app.getWindow().nodes.body.find('.classic-toolbar'))[0].focus()
      }
    }

    ext.point(app.get('name') + '/sidepanel').extend({
      id: 'toggle-folderview',
      index: 1000,
      draw () {
        if (_.device('smartphone')) return
        const guid = _.uniqueId('control')
        this.addClass('bottom-toolbar').append(
          $('<div class="generic-toolbar bottom visual-focus" role="region">').attr('aria-labelledby', guid).append(
            createButton({ variant: 'toolbar', icon: { name: 'bi/layout-sidebar.svg', title: gt('Close folder view') } })
              .addClass('btn-translucent-white')
              .attr({ id: guid, 'data-action': 'close-folder-view' })
              .on('click', () => app.folderView.toggle(false))
          )
        )
      }
    })

    ext.point(app.get('name') + '/sidepanel').extend({
      id: 'help',
      index: 1100,
      draw: commons.help
    })
  }
}

/*
     * View container
     */

// view container with dispose capability
const originalCleanData = $.cleanData
const triggerDispose = function (elem) {
  $(elem).triggerHandler('dispose')
}

$.cleanData = function (list) {
  _(list).map(triggerDispose)
  return originalCleanData.call(this, list)
}

// factory
$.createViewContainer = function (baton, api, getter, options) {
  options = options || {}
  const cidGetter = options.cidGetter || _.ecid
  let data = baton instanceof ext.Baton ? baton.data : baton
  let cid = _.cid(data)
  let ecid = cidGetter(data)
  const shortEcid = 'recurrenceID' in data ? cidGetter({ id: data.id, folder: (data.folder_id || data.folder) }) : null
  let node = $('<div>').attr('data-cid', _([].concat(data)).map(_.cid).join(','))

  function refresh (data, changed, options = { useCache: true }) {
    getter = (getter || (api ? api.get : null))
    if (!getter) return $.when()
    // get fresh object
    return getter(api.reduce(data), options.useCache).then(function (data) {
      if (baton instanceof ext.Baton) {
        if (data instanceof Backbone.Model && baton.model instanceof Backbone.Model) {
          baton.model = data
          baton.data = data.toJSON()
        } else {
          baton.data = data
        }
      } else {
        baton = data
      }
      // if we have some additional update data for this change provide them to the handler
      if (changed && changed.updateData) {
        baton.updateData = changed.updateData
      } else {
        delete baton.updateData
      }
      if (node) node.triggerHandler('redraw', baton)
    })
  }

  let update = function update (obj, changed) {
    const e = obj && obj.type ? obj : undefined
    const appointment = obj && obj.type ? undefined : obj
    const changedId = changed && (changed.former_id || (changed.id && changed.id !== data.id))
    const changedFolder = appointment && data && appointment.folder !== data.folder

    // disable cache for attachment ready event
    const useCache = !e || e.type.indexOf('synced:') !== 0
    if (changedId) data = changed
    if (changedFolder) data = appointment
    // fallback for create trigger
    if (!data.id) data.id = arguments[1].id
    refresh(data, changed, { useCache })
  }

  const move = function (appointmentData, targetFolderId) {
    if (data) data.folder_id = targetFolderId
    if (update) update(appointmentData)
  }

  function forceRefresh () {
    if (!update) return
    refresh(data, undefined, { useCache: false })
  }

  // we use redraw directly if we're in multiple mode
  // each redraw handler must get the data on its own
  const redraw = _.debounce(function () {
    if (node) node.triggerHandler('redraw', baton)
  }, 10)

  const remove = function () {
    if (node) node.trigger('view:remove').remove()
  }

  // checks if folder permissions etc. have changed, and triggers redraw.
  // Important to update inline links
  const checkFolder = function (folder) {
    const data = this
    if (folder === data.folder.toString() && api) {
      api.trigger('update:' + data.cid)
    }
  }

  if (_.isArray(data)) {
    // multiple items - just listen to generic events.
    // otherwise "select all" of some thousands items freezes browser
    folderAPI.on('update', redraw)
    // ignore move case for multiple
    api.on('delete update', redraw)
  } else {
    // single item
    folderAPI.on('update', checkFolder, { cid, folder: data.folder_id || data.folder })
    api.on('delete:' + ecid + (shortEcid ? ' delete:' + shortEcid : ''), remove)
    api.on('create update:' + ecid + (shortEcid ? ' update:' + shortEcid : ''), update)
    api.on('move:' + ecid, move)
    if (api.getAttachmentsHashKey) attachmentAPI.on(`synced:${api.getAttachmentsHashKey(data)}`, update)
    if (data.attendees) {
      data.attendees.map(attendee => attendee.resource).filter(Boolean).forEach(resource => {
        resourceAPI.on(`update:${resource.id} remove:${resource.id}`, forceRefresh)
      })
    }
  }

  return node.one('dispose', function () {
    if (_.isArray(data)) {
      folderAPI.off('update', redraw)
      api.off('delete update', redraw)
    } else {
      folderAPI.off('update', checkFolder)
      api.off('delete:' + ecid, remove)
      api.off('create update:' + ecid + (shortEcid ? ' update:' + shortEcid : ''), update)
      api.off('move:' + ecid, move)
      if (api.getAttachmentsHashKey) attachmentAPI.off(`synced:${api.getAttachmentsHashKey(data)}`, update)
      if (data.attendees) {
        data.attendees.map(attendee => attendee.resource).filter(Boolean).forEach(resource => {
          resourceAPI.off(`update:${resource.id} remove:${resource.id}`, forceRefresh)
        })
      }
    }
    api = update = data = node = getter = cid = ecid = null
  })
}

// located here since we need a translation for 'Retry'

$.fail = function (msg, retry) {
  const tmp = $('<div>')
    .addClass('io-ox-fail')
    .append(
      $('<span>').text(msg)
    )
  if (retry) {
    tmp.append(
      $('<span>').text(' ')
    )
      .append(
        $('<a>', { href: '#' }).text(gt('Retry'))
          .on('click', function (e) {
            e.preventDefault()
            $(this).closest('.io-ox-center').remove()
            retry.apply(this, arguments)
          })
      )
  }
  return tmp.center()
}

export default commons
