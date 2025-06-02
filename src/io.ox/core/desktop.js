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

import _ from '@/underscore'
import $ from '@/jquery'
import Backbone from '@/backbone'
import ox from '@/ox'

import Events from '@/io.ox/core/event'
import FloatingWindow from '@/io.ox/backbone/views/window'
import ext from '@/io.ox/core/extensions'
import cache from '@/io.ox/core/cache'
import yell from '@/io.ox/core/yell'
import upsell from '@/io.ox/core/upsell'
import folderAPI from '@/io.ox/core/folder/api'
import apps from '@/io.ox/core/api/apps'
import capabilities from '@/io.ox/core/capabilities'
import registry from '@/io.ox/core/main/registry'

import '@/io.ox/core/main/icons'

import { settings } from '@/io.ox/core/settings'

import gt from 'gettext'

/**
 * Core UI
 */

// current window
let currentWindow = null
let appGuid = 0
const appCache = new cache.SimpleCache('app-cache', true)

const isMobileClosable = window => _.device('smartphone') && window.attributes && !!window.get('closable')

const AbstractApp = Backbone.Model.extend({

  defaults: {
    title: ''
  },

  initialize (options) {
    const self = this
    this.options = options || {}
    this.guid = this.options.guid || appGuid++
    this.id = this.id || (this.options.refreshable ? this.options.name : '') || 'app-' + this.guid
    this.set('path', this.options.path ? this.options.path : this.getName() + '/main')
    this.set('id', this.id)
    this.set('openInTab', this.options.openInTab)
    this.set('tabUrl', this.options.tabUrl)
    this.getInstance = function () {
      return self
    }
    this.load = options.load || (() => {
      console.warn(`Missing load-function in app ${this.getName()}`)
      return Promise.resolve(true)
    })
  },

  getName () {
    return this.get('name')
  },

  setTitle (title) {
    this.set('title', title)
    if (this.options.floating) {
      if (this.getWindow().floating) {
        this.getWindow().floating.setTitle(title)
      }
      return
    }
    return this
  },

  getTitle () {
    return this.get('title')
  },

  getWindow: $.noop,

  saveRestorePoint: $.noop,

  call: $.noop
})

ox.ui.AppPlaceholder = AbstractApp

const apputil = {
  LIMIT: 265000,
  length (obj) {
    return JSON.stringify(obj).length
  },
  // crop save point
  crop (list, data, pos) {
    const length = apputil.length
    const latest = list[pos]
    const exceeds = apputil.LIMIT < length(list) - length(latest || '') + length(data)

    if (exceeds) {
      if (latest) {
        // use latest successfully saved state
        data = latest
      } else {
        // remove data property
        data.point.data = {}
      }
      // notify user if not mail compose. Mail compose is more likely to be hit,
      // but are Save as draft and autosave to prevent data loss
      if (!('exceeded' in data) && data.module !== 'io.ox/mail/compose') {
        yell('warning', gt('Failed to automatically save current stage of work. Please save your work to avoid data loss in case the browser closes unexpectedly.'))
        // flag to yell only once
        data.exceeded = true
      }
    } else {
      delete data.exceeded
    }
    return data
  }
}

ox.ui.App = AbstractApp.extend({

  defaults: {
    window: null,
    state: 'ready',
    saveRestorePointTimer: null,
    launch () { return $.when() },
    resume () { return $.when() },
    quit () { return $.when() }
  },

  initialize () {
    const self = this
    // call super constructor
    AbstractApp.prototype.initialize.apply(this, arguments)

    this.set('uniqueID', _.now() + '.' + String(Math.random()).substr(3, 4))

    const save = $.proxy(this.saveRestorePoint, this)
    $(window).on('unload', save)
    // 10 secs
    if (!this.disableRestorePointTimer) this.set('saveRestorePointTimer', setInterval(save, 10 * 1000))

    // add folder management
    this.folder = (function () {
      let folder = null; let that; let win = null; let grid = null; let type; const initialized = $.Deferred()

      folderAPI.on('after:rename', function (id, data) {
        if (win) win.setTitle(data.title || '')
      })

      that = {

        initialized: initialized.promise(),

        unset () {
          // unset
          folder = null
          _.url.hash('folder', null)
          // update window title?
          if (win) {
            win.setTitle('')
          }
          // update grid?
          if (grid) {
            grid.clear()
          }
        },

        set: (function () {
          function change (id, data, app, def, favorite) {
            // app has changed while folder was requested
            const appchange = _.url.hash('app') !== app
            // remember
            folder = String(id)
            // only change if the app did not change
            if (!appchange) {
              // update window title & toolbar?
              if (win) {
                const model = folderAPI.pool.getModel(id)
                win.setTitle(model.getTitle())
                win.updateToolbar()
              }
              // update grid?
              if (grid && grid.prop('folder') !== folder) {
                grid.busy().prop('folder', folder)
                grid.refresh()
                // load fresh folder & trigger update event
                folderAPI.reload(id)
              }
              // update hash
              _.url.hash('folder', folder)
              self.trigger('folder:change', folder, data, favorite)
            }
            def.resolve(data, appchange)

            if (initialized.state() !== 'resolved') {
              initialized.resolve(folder, data)
            }
          }

          return function (id, favorite) {
            const def = $.Deferred()
            if (id !== undefined && id !== null && String(id) !== folder) {
              const app = _.url.hash('app')
              const model = folderAPI.pool.getModel(id)
              const data = model.toJSON()

              if (model.has('title')) {
                change(id, data, app, def, favorite)
              } else {
                folderAPI.get(id).then(
                  function success (data) {
                    change(id, data, app, def, favorite)
                  },
                  function fail () {
                    console.warn('Failed to change folder', id)
                    def.reject()
                  }
                )
              }
            } else if (String(id) === folder) {
              // see Bug 34927 - [L3] unexpected application error when clicking on "show all messages in inbox" in notification area
              def.resolve(folderAPI.pool.getModel(id).toJSON(), false)
            } else {
              def.reject()
            }
            return def
          }
        }()),

        setType (t) {
          type = t
          return this
        },

        setDefault () {
          return $.when().then(function () {
            const defaultFolder = folderAPI.getDefaultFolder(type)
            if (defaultFolder) {
              return that.set(defaultFolder)
            }
            return folderAPI.getExistingFolder(type).then(
              function (id) {
                return that.set(id)
              },
              function () {
                return $.Deferred().reject({ error: gt('Could not get a default folder for this application.') })
              }
            )
          })
        },

        isDefault () {
          return $.when().then(function () {
            const defaultFolder = folderAPI.getDefaultFolder(type)
            return String(folder) === String(defaultFolder)
          })
        },

        get () {
          return folder
        },

        getData () {
          if (folder === null) return $.Deferred().resolve({})
          const model = folderAPI.pool.getModel(folder)
          return $.Deferred().resolve(model.toJSON())
        },

        // getData() became internally sync over time, but it kept its async return value
        // getModel() is sync; return undefined if model doesn't exist (yet)
        getModel () {
          return folderAPI.pool.getModel(folder)
        },

        can (action) {
          if (folder === null) return $.when(false)

          return folderAPI.get(folder).then(function (data) {
            return folderAPI.can(action, data)
          })
        },

        updateTitle (w) {
          win = w
          return this
        },

        updateGrid (g) {
          grid = g
          return this
        },

        destroy () {
          that = win = grid = null
        },

        handleErrors: (function () {
          const process = _.debounce(function (error) {
            // refresh parent folder or if flat all
            const model = folderAPI.pool.getModel(self.folder.get())
            if (model) folderAPI.list(model.get('folder_id'), { cache: false })
            self.folder.setDefault()
            yell(error)
          }, 1000, true)

          const regexStr = '(' +
                                // permission denied (calendar)
                                'APP-0013|' +
                                // permission denied (contacts)
                                'CON-0104|' +
                                // permission denied
                                'FLD-0003|' +
                                // not found
                                'FLD-0008|' +
                                // folder storage service no longer available
                                'FLD-1004|' +
                                // The supplied folder is not supported. Please select a valid folder and try again.
                                'CAL-4060|' +
                                // mail folder "..." could not be found on mail server
                                'IMAP-1002|' +
                                // imap no read permission
                                'IMAP-2041|' +
                                // infostore no read permission
                                'IFO-0400|' +
                                // The provided "..." (e.g. dropbox) resource does not exist
                                'FILE_STORAGE-0005|' +
                                'FILE_STORAGE-0055|' +
                                // permission denied (tasks)
                                'TSK-0023' +
                            ')'
          const regex = new RegExp(regexStr)

          return function () {
            self.listenTo(ox, 'http:error', function (error, request) {
              const folder = request.params.folder || request.data.folder || error.folder || request.params.id
              if (folder !== self.folder.get()) return
              // don't show expected errors see Bug 56276
              if ((error.code === 'IMAP-1002' || error.code === 'FLD-0008') && folderAPI.isBeingDeleted(folder)) return
              if (!regex.test(error.code)) return
              // special handling for no permission. if api.get fails, 'http-error' is triggered again
              if (/(IMAP-2041|IFO-0400|APP-0013|CON-0104|TSK-0023)/.test(error.code)) return folderAPI.get(self.folder.get(), { cache: false })
              process(error)
            })
          }
        }())

      }

      return that
    }())
  },

  setLauncher (fn) {
    this.set('launch', fn)
    return this
  },

  setResume (fn) {
    this.set('resume', fn)
    return this
  },

  setQuit (fn) {
    this.set('quit', fn)
    return this
  },

  setWindow (win) {
    if (!this.options.floating) $('html').removeClass('complete')
    this.set('window', win)

    win.app = this
    if (this.options.floating) {
      const model = this.options.floatingWindowModel || new FloatingWindow.Model(
        _.extend(_(this.options).pick('closable', 'resizable', 'displayStyle', 'size', 'taskbarIcon', 'title', 'name'), { win })
      )
      win.floating = new FloatingWindow.View({ el: win.nodes.outer, model }).render()

      win.floating.listenTo(model, 'quit', function () {
        // prevent multiple clicks on quit button etc
        win.floating.$header.attr('disabled', 'disabled').find('.controls button').attr('disabled', 'disabled')
        win.app.quit().then(function () {
          model.trigger('close')
        }).catch(function (err) {
          win.floating.$header.attr('disabled', false).find('.controls button').attr('disabled', false)

          // expect dirty dialog exception
          if (err?.message === 'dirtyDialogDiscarded') return
          throw err
        })
      })

      // handle dropzone
      win.floating.listenTo(model, 'change:active change:minimized', function (model) {
        if (!win.app.dropZone) return
        const active = model.get('active') && !model.get('minimized')
        if (!active && win.app.dropZone.remove) return win.app.dropZone.remove()
        if (win.app.dropZone.include) win.app.dropZone.include()
      })

      win.app.once('quit', function () { model.trigger('close') })
    } else {
      win.nodes.outer?.attr('role', 'document')
      win.nodes.footer?.attr('role', 'region')
    }
    // add app name
    if (this.has('name')) {
      win.nodes.outer.attr('data-app-name', this.get('name'))
    }
    return this
  },

  getWindow () {
    return this.get('window')
  },

  getWindowNode () {
    return this.has('window') ? this.get('window').nodes.main : $()
  },

  getWindowTitle () {
    return this.has('window') ? this.get('window').getTitle() : ''
  },

  /**
   * Add mediator extensions
   * ext.point('<app-name>/mediator'').extend({ ... });
   */
  mediator (obj) {
    ox.ui.App.mediator(this.getName(), obj)
  },

  /**
   * setup all mediator extensions
   */
  mediate () {
    const self = this
    return ext.point(this.getName() + '/mediator').each(function (extension) {
      try {
        if (extension.setup) extension.setup(self)
      } catch (e) {
        console.error('mediate', extension.id, e.message, e)
      }
    })
  },

  /**
   * Registers an event handler at a global browser object (e.g. the
   * window, the document, or the `<body>` element) that listens to the
   * specified event or events. The event handler will only be active
   * while the application window is visible, and will be inactive while
   * the application window is hidden.
   *
   * @param {object | string} target       The target object that will trigger the specified events. Can be
   *                                       any object or value that can be passed to the jQuery constructor.
   * @param {string}          eventType    The event name(s) the handler function will be registered for.
   * @param {Function}        eventHandler The event handler function bound to the specified events.
   */
  registerGlobalEventHandler (target, eventType, eventHandler) {
    const $target = $(target); const win = this.getWindow()
    function startListening () { $target.on(eventType, eventHandler) }
    function stopListening () { $target.off(eventType, eventHandler) }
    win.on({ show: startListening, hide: stopListening, quit: stopListening })
    if (win.state.visible) { startListening() }
  },

  /**
   * Registers an event handler at the browser window that listens to
   * `resize` events. The event handler will only be active while the
   * application window is visible, and will be inactive while the
   * application window is hidden.
   *
   * @param {Function} resizeHandler The resize handler function bound to `resize` events of the browser
   *                                 window. Will be called when:
   *                                 - the application is visible, and the browser window triggers a
   *                                 `resize` event,
   *                                 - the application window becomes visible,
   *                                 - immediately on registration if the application window is visible.
   */
  registerWindowResizeHandler (resizeHandler) {
    const win = this.getWindow()
    this.registerGlobalEventHandler(window, 'resize', resizeHandler)
    win.on('show', resizeHandler)
    if (win.state.visible) { resizeHandler() }
  },

  setState (obj) {
    if (this.options.floating || this.options.plugged) return
    for (const id in obj) {
      _.url.hash(id, ((obj[id] !== null) ? String(obj[id]) : null))
    }
  },

  getState () {
    return _.url.hash()
  },

  async launch (options) {
    const self = this
    const name = this.getName()
    performance.mark(`app:launch:${name}`)

    // update hash (not for floating apps, e.g. mail editor; or plugged apps, e.g. spreadsheet viewer)
    if (!this.options.floating && !this.options.plugged) {
      if (name !== _.url.hash('app')) {
        _.url.hash({ folder: null, perspective: null, id: null })
      }
      if (name) {
        _.url.hash('app', name)
      }
    }

    if (this.get('state') === 'ready') {
      if (_.isFunction(this.load)) await ox.load(this.load)
      this.set('state', 'initializing')
      ox.trigger('app:init', this)
      _.extend(this.options, options)
      if (name) {
        ext.point(name + '/main').invoke('launch', this, this.options)
      }
      try {
        const fn = this.get('launch')
        const result = await (fn.call(this, this.options) || $.when())
        apps.add(self)
        self.set('state', 'running')
        self.trigger('launch', self)
        performance.mark(`app:start:${name}`)
        ox.trigger('app:start', self)
        // add closable apps that don't use floating windows to the taskbar
        if (self.get('closable') && !self.get('floating') && !_.device('smartphone')) FloatingWindow.addNonFloatingApp(self, options)
        return result
      } catch (e) {
        console.error('Error while launching application:', e.message, e, this)
        const autoStart = settings.get('autoStart')
        // don't autostart mail for guests just because any other app failed. Usually doesn't work and doesn't have permission for it.
        if (autoStart !== 'none' && !capabilities.has('guest')) {
          const app = apps.get(autoStart.replace(/\/main$/, ''))
          ox.launch(app.load)
        }
        throw arguments
      }
      // don't resume apps that are currently initializing
    } else if (this.get('state') !== 'initializing' && this.has('window')) {
      // toggle app window
      this.get('window').show()
      this.trigger('resume', this)
      performance.mark(`app:resume:${name}`)
      ox.trigger('app:resume', this)

      if (name) {
        ext.point(name + '/main').invoke('resume', this, options)
      }
      try {
        const fnResume = this.get('resume')
        return await fnResume.call(this, options)
      } catch (e) {
        console.error('Error while resuming application:', e.message, e, this)
      }
      // if image previews were already displayed in the files app, it might happen that another app (e.g. latest files widget) did some changes to the pool
      // and the previews were redrawn but not displayed since the 'appear' event has not been triggered
      $(window).trigger('resize.lazyload')
    }
  },

  quit (force, options) {
    // call quit function
    const def = force ? $.when() : (this.get('quit').call(this, options) || $.when()); let win; let self = this
    return def.then(function () {
      // not destroyed?
      if (force && self.destroy) {
        self.destroy()
      }
      // update hash but don't delete information of other apps that might already be open at this point (async close when sending a mail for example);
      if ((!self.floating && !self.get('plugged')) && (self.getWindow() && self.getWindow().state.visible) && (!_.url.hash('app') || self.getName() === _.url.hash('app').split(':', 1)[0])) {
        // we are still in the app to close so we can clear the URL
        _.url.hash({ app: null, folder: null, perspective: null, id: null })
      }
      // don't save
      clearInterval(self.get('saveRestorePointTimer'))
      self.removeRestorePoint()
      $(window).off('unload', $.proxy(self.saveRestorePoint, self))
      // destroy stuff
      self.folder.destroy()
      if (self.has('window')) {
        win = self.get('window')
        win.trigger('quit')
        ox.ui.windowManager.trigger('window.quit', win)
        win.destroy()
      }
      if (self.dropZone && self.dropZone.remove) self.dropZone.remove()
      // remove from list
      apps.remove(self)
      // mark as not running
      self.trigger('quit')
      ox.trigger('app:stop', self)
      self.set('state', 'stopped')
      // remove app's properties
      for (const id in self) {
        delete self[id]
      }
      // don't leak
      self = win = null
    })
  },

  saveRestorePoint () {
    const self = this; const uniqueID = self.get('uniqueID')
    if (this.failSave) {
      // mail compose has a separate setting
      if (this.get('name') === 'io.ox/mail/compose' && !settings.get('features/storeMailSavePoints', true)) return $.when()

      return ox.ui.App.getSavePoints().then(function (list) {
        // might be null, so:
        list = list || []
        let data, ids, pos
        try {
          data = self.failSave()
          ids = _(list).pluck('id')
          pos = _(ids).indexOf(uniqueID)
          if (data) {
            data.floating = self.get('floating')
            data.id = uniqueID
            data.cid = self.cid
            data.timestamp = _.now()
            data.version = ox.version
            data.ua = navigator.userAgent
            // consider db limit for jslob
            data = apputil.crop(list, data, pos)
            if (pos > -1) {
              // replace
              list.splice(pos, 1, data)
            } else {
              // add
              list.push(data)
            }
          }
        } catch (e) {
          // looks broken, so remove from list
          if (pos > -1) { list.splice(pos, 1); delete self.failSave }
        }
        if (list.length > 0) {
          return ox.ui.App.setSavePoints(list)
        }
        return $.when()
      })
    }
    return $.when()
  },

  removeRestorePoint () {
    const uniqueID = this.get('uniqueID')
    return ox.ui.App.removeRestorePoint(uniqueID)
  }

})

function saveRestoreEnabled () {
  // no smartphones and feature toggle which is overridable by url parameter
  const urlForceOff = typeof _.url.hash('restore') !== 'undefined' && /^(0|false)$/i.test(_.url.hash('restore'))
  const urlForceOn = typeof _.url.hash('restore') !== 'undefined' && /^(1|true)$/i.test(_.url.hash('restore'))

  return urlForceOn || (!urlForceOff && settings.get('features/storeSavePoints', true))
}
// static methods
_.extend(ox.ui.App, {

  /**
   * Add mediator extensions
   * ext.point('<app-name>/mediator'').extend({ ... });
   */
  mediator (name, obj) {
    // get extension point
    const point = ext.point(name + '/mediator'); let index = 0
    // loop over key/value object
    _(obj).each(function (fn, id) {
      point.extend({ id, index: (index += 100), setup: fn })
    })
  },

  canRestore () {
    // use get instead of contains since it might exist as empty list
    return this.getSavePoints().then(function (list) {
      return list && list.length > 0
    })
  },

  // utility function to clean savepoints of unsupported versions in jslob (not localstorage)
  cleanupSavepoints () {
    if (settings.get('savepointCleanup', false)) return
    settings.set('savepoints', []).save().then(function () {
      settings.set('savepointCleanup', ox.version).save()
    })
  },

  getSavePoints () {
    if (!saveRestoreEnabled()) return $.when([])

    return appCache.get('savepoints').then(function (list) {
      list = list || []
      // get restorepoints by Id too (those are saved in jslob so they survive logouts), don't return standard savepoints from jslob (those are artefacts from old versions, they are removed on the next save)
      const savepointsById = settings.get('savepoints', []).filter(function (savepoint) { return savepoint.restoreById })
      list = [].concat(list, savepointsById)

      return _(list || []).filter(function (obj) {
        const hasPoint = 'point' in obj
        const sameUA = obj.ua === navigator.userAgent
        return (hasPoint && (sameUA || obj.restoreById))
      })
    })
  },

  setSavePoints (list) {
    if (!saveRestoreEnabled()) {
      return $.Deferred().resolve([])
    }
    list = list || []
    const pointsById = _(list).filter(function (point) {
      return point.restoreById
    })
    list = _(list).filter(function (point) {
      return !point.restoreById
    })
    // set both types of savepoints
    settings.set('savepoints', pointsById)
    return appCache.add('savepoints', list)
  },

  removeAllRestorePoints () {
    return this.setSavePoints([])
  },

  removeRestorePoint: (function () {
    const hash = {}
    // Issue caused by multiple almost simultaneous removeRestorePoint calls.
    // All callbacks work on same state of that list as getSavePoints (t3, t4...)
    // resolves before setSavePoints of previous calls (t1, t2...). Minimal
    // solution/workaround as backport (reduce potential impacts) by maintaining
    // a list of deleted ids
    function getPoint (list, id) {
      const ids = _(list).pluck('id')
      const pos = _(ids).indexOf(id)
      return list[pos]
    }

    function cleanupHash (list) {
      _(hash).each(function (value, id) {
        if (getPoint(list, id)) return
        // point finally removed
        delete hash[id]
      })
    }

    return function (id) {
      const self = this
      hash[id] = true
      return this.getSavePoints().then(function (list) {
        list = (list || []).slice()
        // remove already removed ones from 'removeHash'
        cleanupHash(list)

        let ids = _(list).pluck('id')
        // loop all 'to be removed' ones
        _(hash).each(function (value, id) {
          let pos = _(ids).indexOf(id)
          const point = list[pos]
          if (pos > -1) {
            list.splice(pos, 1)
          }
          // if this is a point that's restored by id we need to remove it in the settings
          if (point && point.restoreById) {
            const pointsById = settings.get('savepoints', [])
            ids = _(pointsById).pluck('id')
            pos = _(ids).indexOf(id)
            if (pos > -1) {
              pointsById.splice(pos, 1)
              settings.set('savepoints', pointsById).save()
            }
          }
        })
        return self.setSavePoints(list).then(function () {
          return list
        })
      })
    }
  })(),

  restore () {
    this.cleanupSavepoints()
    return $.when(this.getSavePoints()).then(function (list, spaces) {
      return this.restoreLoad({ list, spaces })
    }.bind(this))
  },

  restoreLoad (options) {
    const self = this
    const list = options.list || []
    const spaces = options.spaces || []
    return $.when.apply($,
      _([].concat(list, spaces)).map(function (obj) {
        return ox.load(registry.get(obj.module)).then(function ({ default: m }) {
          const app = m.getApp(obj.passPointOnGetApp ? obj.point : undefined)
          if (obj.cid) app.cid = obj.cid
          // floating windows are restored as dummies. On click the dummy starts the complete app. This speeds up the restore process.
          if (_.device('!smartphone') && (app.options.floating || app.options.closable)) {
            let model, win
            if (app.options.floating) {
              // note: cid is stored as model property here
              model = new FloatingWindow.Model({
                cid: obj.cid,
                minimized: true,
                id: obj.id,
                title: obj.description,
                closable: true,
                lazy: true,
                taskbarIcon: app.options.taskbarIcon,
                name: app.options.name
              })
              win = new FloatingWindow.TaskbarElement({ model }).render()
              FloatingWindow.collection.add(model)
            } else {
              win = FloatingWindow.addNonFloatingApp(app, { lazyload: true })
              model = win.model
            }
            win.listenToOnce(model, 'lazyload', function () {
              const oldId = obj.id
              obj = _.clone(obj)
              if (app.options.floating) {
                // copy app options over to window model
                model.set(_(app.options).pick('closable', 'displayStyle', 'size', 'taskbarIcon', 'title'))
                app.launch({ floatingWindowModel: model }).then(function () {
                  // update unique id
                  obj.id = app.get('uniqueID')
                  if (app.failRestore) return app.failRestore(obj.point)
                  return $.when()
                }).then(function () {
                  // replace restore point with old id with restore point with new id (prevents duplicates)
                  self.removeRestorePoint(oldId).then(self.getSavePoints).then(function (sp) {
                    sp.push(obj)
                    if (obj.keepOnRestore !== false) self.setSavePoints(sp)
                  })
                },
                function (e) {
                  if (!e || e.code !== 'MSG-0032') return
                  // restoreById-savepoint after draft/composition space got deleted
                  _.delay(function () {
                    ox.ui.App.removeRestorePoint(oldId)
                    model.trigger('close')
                  })
                },
                function (e) {
                  if (!e || e.code !== 'MSG-0032') return
                  // restoreById-savepoint after draft/composition space got deleted
                  _.delay(function () {
                    ox.ui.App.removeRestorePoint(oldId)
                    model.trigger('close')
                  })
                })
                return
              }
              app.launch().then(function () {
                // update unique id
                obj.id = app.get('uniqueID')
                // WORKAROUND: OXUIB-932 - lazyload current edited drafts on mobile
                if (this?.failRestore && obj.module === 'io.ox/mail/compose') {
                  app.set('title', obj.description || app.get('title'))
                  app.options.mobilelazyload = true
                  return app.on('mobilelazyload', function () {
                    obj = _.clone(obj)
                    // update unique id
                    obj.id = this.get('uniqueID')
                    return this.failRestore(obj.point).then(function () {
                      app.set('restored', true)
                      delete app.options.mobilelazyload
                      app.launch()
                    })
                  })
                }

                if (app.failRestore) {
                  // restore
                  return app.failRestore(obj.point)
                }
                return $.when()
              }).then(function () {
                // replace restore point with old id with restore point with new id (prevents duplicates)
                self.removeRestorePoint(oldId).then(self.getSavePoints).then(function (sp) {
                  sp.push(obj)
                  self.setSavePoints(sp)
                })
              })
            })
            return $.when()
          }
          const oldId = obj.id
          return app.launch().then(function (launchedApp) {
            launchedApp = launchedApp || app
            // update unique id
            obj.id = launchedApp.get('uniqueID')
            if (launchedApp.failRestore) {
              // restore
              return launchedApp.failRestore(obj.point).then(function () {
                launchedApp.set('restored', true)
              })
            }
          },
          function (e) {
            if (!e || e.code !== 'MSG-0032') return
            // restoreById-savepoint after draft got deleted
            _.delay(function () {
              ox.ui.App.removeRestorePoint(oldId)
            })
          })
        })
      })
    )
      .done(function () {
        // we don't remove that savepoint now because the app might crash during restore!
        // in this case, data would be lost
        self.setSavePoints(list)
      })
  },

  get (name) {
    return apps.where({ name })
  },

  getByCid (cid) {
    return apps.get(cid)
  },

  reuse (cid) {
    const app = apps.find(function (m) { return m.cid === cid })
    if (app) {
      // Special case: There exists a unrestored restore point for the same app.
      // Then, there must exist a corresponding model which will react on the lazyload event
      if (app.get('state') === 'ready') {
        const model = FloatingWindow.collection.findWhere({ cid })
        if (model) {
          model.trigger('lazyload')
          return true
        }
      }
      app.launch()
      return true
    }
    return false
  },

  isCurrent (app) {
    const current = ox.ui.App.getCurrentApp()
    return !!(current && current.get('name') === (_.isString(app) ? app : app.model.get('name')))
  },

  getCurrentApp () {
    return currentWindow !== null ? currentWindow.app : null
  },

  getCurrentFloatingApp () {
    return _.chain(apps.pluck('window')).compact()
      .map(function (win) {
        return win.floating && win.floating.model && win.floating.model.get('active') ? win.app : undefined
      }).compact().first().value()
  },

  getCurrentWindow () {
    return currentWindow
  }
})

// show
$('#io-ox-core').show()

// check if any open application has unsaved changes
window.onbeforeunload = function () {
  // find an applications with unsaved changes
  const unsavedChanges = apps.some(function (app) {
    return _.isFunction(app.hasUnsavedChanges) && app.hasUnsavedChanges()
  })

  // browser will show a confirmation dialog, if onbeforeunload returns a string
  ox.trigger('beforeunload', unsavedChanges)
  if (unsavedChanges) {
    return gt('There are unsaved changes.')
  }
}

/**
 * Create app
 */
ox.ui.createApp = function (options) {
  if (upsell.visible(options.requires) && _.device(options.device)) {
    return apps.add(new ox.ui.App(options))
  }
}

ox.ui.screens = (function () {
  let current = null

  const that = {

    add (id) {
      return $('<div>', { id: 'io-ox-' + id }).addClass('abs').hide()
        .appendTo('#io-ox-screens')
    },

    get (id) {
      return $('#io-ox-screens').find('#io-ox-' + id)
    },

    current () {
      return current
    },

    hide (id) {
      this.get(id).hide()
      this.trigger('hide-' + id)
    },

    show (id) {
      $('#io-ox-screens').children().each(function () {
        const attr = $(this).attr('id')
        const screenId = String(attr || '').substr(6)
        if (screenId !== id && screenId !== 'ad-skyscraper') {
          that.hide(screenId)
        }
      })
      this.get(id).show()
      current = id
      this.trigger('show-' + id)
    }
  }

  Events.extend(that)

  return that
}())

ox.ui.windowManager = (function () {
  const that = Events.extend({})
  // list of windows
  let windows = []
  // get number of open windows
  const numOpen = function () {
    return _(windows).inject(function (count, obj) {
      return count + (obj.state.open ? 1 : 0)
    }, 0)
  }

  that.getWindows = function () {
    return windows.slice()
  }

  ox.ui.screens.on('hide-windowmanager', function () {
    if (currentWindow) {
      currentWindow.hide()
    }
  })

  that.hide = function () {
    ox.ui.screens.hide('windowmanager')
  }

  that.show = function () {
    ox.ui.screens.show('windowmanager')
  }

  that.on('window.open window.show', function (e, win) {
    // show window manager
    this.show()
    // move/add window to top of stack
    windows = _(windows).without(win)
    if (!win.options.floating) {
      _(windows).each(function (w) { w.nodes.body.removeAttr('role') })
      if (win.options.name !== 'io.ox/settings') win.nodes.body.attr('role', 'main')
    } else {
      win.nodes.body.attr('role', 'region')
    }
    windows.unshift(win)
    // add current windows to cache
    if (windows.length > 1) {
      const winCache = _(windows).map(function (w) {
        return w.name
      })
      appCache.add('windows', winCache || [])
    }
  })

  that.on('window.beforeshow', function () {
    that.trigger('empty', false)
  })

  that.on('window.close window.quit window.pre-quit', function (e, win, type) {
    // fallback for different trigger functions
    if (!type) {
      type = e.type + '.' + e.namespace
    }
    const pos = _(windows).indexOf(win); let i; let $i; let w
    if (pos !== -1) {
      // quit?
      if (type === 'window.quit') {
        // remove item at pos
        windows.splice(pos, 1)
      } else if (type === 'window.close' || type === 'window.pre-quit') {
        // close?
        // add/move window to end of stack
        windows = _(windows).without(win)
        windows.push(win)
      }
      // find first open window
      for (i = 0, $i = windows.length; i < $i; i++) {
        w = windows[i]
        // don't restore a floating window on close (only fullscreen apps)
        if (w !== win && w.state.open && !w.floating) {
          w.resume()
          break
        }
      }
      // remove the window from cache if it's there
      appCache.get('windows').done(function (winCache) {
        const index = _.indexOf(winCache, win.name)
        if (index > -1) {
          winCache.splice(index, 1)
          appCache.add('windows', winCache || [])
        }
      })
    }

    const isEmpty = numOpen() === 0
    if (isEmpty) {
      appCache.get('windows').done(function (winCache) {
        that.trigger('empty', true, winCache ? winCache[1] || null : null)
      })
    } else {
      that.trigger('empty', false)
    }
  })

  return that
}())

/**
 * Create window
 */
ox.ui.createWindow = (function () {
  // window guid
  let guid = 0

  const defaultPane = $('#io-ox-windowmanager-pane')

  // window class
  const Window = function (options) {
    this.options = options || {}
    this.id = options.id
    this.name = options.name || 'generic'
    this.nodes = { title: $(), toolbar: $(), controls: $(), closeButton: $(), disabled: $() }
    this.state = { visible: false, running: false, open: false }
    this.app = null
    this.detachable = false
    this.simple = false
    this.page = options.page

    const pane = this.page ? this.page : defaultPane

    let quitOnClose = false
    const perspectives = {}
    let self = this
    let firstShow = true
    const shown = $.Deferred()
    const name = this.name

    this.updateToolbar = function () {
      const folder = this.app && this.app.folder ? this.app.folder.get() : null
      const baton = ext.Baton({ window: this, $: this.nodes, app: this.app, folder })
      ext.point(name + '/toolbar').invoke('draw', this.nodes.toolbar.empty(), baton)
    }

    this.shown = shown.promise()

    function considerScrollbarWidth (element) {
      // get scrollbar width and fix header
      const test = $('<div style="width: 100px; visibility: hidden; overflow-y: scroll;">').appendTo('body')
      const width = 100 - test[0].clientWidth
      test.remove()
      // apply padding
      element.css('padding-right', width)
    }

    this.setHeader = function (node, position) {
      position = position || (_.device('smartphone') ? 'top' : settings.get('features/windowHeaderPosition', 'bottom'))
      if (position === 'top') {
        this.nodes.header.append(node.addClass('container'))
        this.nodes.outer.addClass('header-top')
      } else {
        this.nodes.footer.append(node.addClass('container'))
        this.nodes.outer.addClass('header-bottom')
      }
      considerScrollbarWidth(this.nodes.header)
      return this.nodes.header
    }

    this.resume = function () {
      this.show(_.noop, true)
    }

    this.show = function (cont, resume) {
      // if anything went wrong always reset visibility of io-ox-app-control
      if (!isMobileClosable(this.app)) $('#io-ox-appcontrol').show()
      else $('#io-ox-appcontrol').hide()
      // remove potential detail popups on smartphones
      if (_.device('smartphone')) $('.detail-popup').remove()
      // this is for apps that have a lot of rampup to do
      // once they are ready trigger revealApp and it shows up
      if (this.app && this.app.get('startHidden')) {
        this.app.once('revealApp', function () {
          self.app.set('startHidden', false)

          if (self.app.get('prefetchDom')) {
            self.nodes.outer
              .removeAttr('aria-hidden')
              .css('visibility', '')
          }

          // setting resume true, forces the app to become the current window.
          self.show(cont, true)
        })

        // for apps that need DOM access while loading  e.g. to calculate width
        if (this.app.get('prefetchDom')) {
          // for a11y to hide app and prevent focus loss, but enable css calculations
          this.nodes.outer
            .attr('aria-hidden', true)
            .css('visibility', 'hidden')

          this.nodes.outer.prependTo(pane)
        }

        return this
      }

      let appchange = false
      // the viewer can be a plugged application that must have a different handling that the root application
      const appPlugged = this.app && this.app.options.plugged
      // TODO: URL changes on app change? direct links?
      // use the url app string before the first ':' to exclude parameter additions (see how mail write adds the current mode here)
      if (!this.floating && !this.app.options.mobilelazyload && !appPlugged && currentWindow && _.url.hash('app') && self.name !== _.url.hash('app').split(':', 1)[0]) {
        appchange = true
      }
      ox.trigger('change:document:title', this.app.get('title'))
      // get node and its parent node
      const node = this.nodes.outer; const parent = node.parent()
      // if not current window or if detached (via funny race conditions)
      if ((!appchange || resume) && self && (currentWindow !== this || parent.length === 0)) {
        // show
        const isNewNode = node.parent().length === 0
        if (isNewNode) {
          if (this.floating) {
            this.floating.open(true)
          } else if (this.simple) {
            node.insertAfter('#io-ox-appcontrol')

            // during the iframe resizing refactoring the body node got some !important styles.
            // we don't want to create side effects here and break the resizing again (super fragile), so we just use more important styles to allow scrolling on mobile again
            document.body.style.setProperty('overflow-y', 'auto', 'important')
          } else {
            if (isMobileClosable(this.app)) this.slideOut(node)
            pane.append(node)
          }
        }
        ox.ui.windowManager.trigger('window.beforeshow', self)
        this.trigger('beforeshow')
        this.updateToolbar()
        // set current appname in url, was lost on returning from edit app
        if (!this.floating && !appPlugged && (!_.url.hash('app') || self.app.getName() !== _.url.hash('app').split(':', 1)[0])) {
          // just get everything before the first ':' to exclude parameter additions
          _.url.hash('app', self.app.getName())
        }
        node.show()

        if (self === null) return

        ox.ui.windowManager.prevWindow = currentWindow

        // on smartphones: Don't hide the window under the current one (window should be visible in the background while slide animation is running)
        if (_.device('smartphone')) {
          const newWindow = self
          const newWindowIsClosable = isMobileClosable(newWindow.app)
          const currentWindowIsClosable = currentWindow && isMobileClosable(currentWindow.app)
          if (currentWindow && currentWindow !== newWindow && !newWindowIsClosable) {
            if (currentWindowIsClosable) currentWindow.slideOut($(`#${currentWindow.id}`))
            else currentWindow.hide()
            // id can contain slashes or dots, so we need to escape it
            $(`[id="${newWindow.id}"]`).removeAttr('aria-hidden')
          } else if (currentWindow && !currentWindowIsClosable) {
            $(`[id="${currentWindow.id}"]`).attr('aria-hidden', true)
          }

          if (!isNewNode && isMobileClosable(self.app)) this.slideIn(node)
        // don't hide window if this is a floating one
        } else {
          if (!this.floating && currentWindow && currentWindow !== self && !this.page) {
            currentWindow.hide()
          }
          if (!this.floating && !appPlugged) {
            currentWindow = self
          }
        }

        if (!this.floating && !appPlugged) currentWindow = self

        _.call(cont)
        self.state.visible = true
        self.state.open = true
        self.trigger('show')

        if (firstShow) {
          shown.resolve()
          // alias for open
          self.trigger('show:initial')
          self.trigger('open')
          self.state.running = true
          ox.ui.windowManager.trigger('window.open', self)
          performance.mark(`app:ready:${self.app.get('name')}`)
          ox.trigger('app:ready', self.app)
          firstShow = false
        }

        ox.ui.windowManager.trigger('window.show', self)
        apps.trigger('resume', self.app)
      } else {
        _.call(cont)
      }
      return this
    }

    this.slideOut = function ($el) {
      $('#io-ox-appcontrol').show()
      $el.one('transitionend', () => {
        $el.removeClass('complete')
      })
      $el.css('top', '100%')
    }

    this.slideIn = function ($el) {
      $('#io-ox-appcontrol').hide()
      $el.one('transitionend', () => {
        $el.addClass('complete')
      })
      $el.css('top', 0)
    }

    this.hide = function () {
      // floating windows have their own hiding mechanism
      if (this.floating) return
      // might have been removed (56913)
      if (!this.trigger) return this

      // detach if there are no iframes
      this.trigger('beforehide')
      // TODO: decide on whether or not to detach nodes
      if (this.simple || (this.detachable && this.nodes.outer.find('iframe').length === 0)) {
        this.nodes.outer.detach()
        $('body').css('overflowY', '')
      } else {
        this.nodes.outer.hide()
      }
      this.state.visible = false
      this.trigger('hide')
      ox.ui.windowManager.trigger('window.hide', this)
      if (currentWindow === this) currentWindow = null
      return this
    }

    this.toggle = function () {
      if (currentWindow === this) {
        this.hide()
      } else {
        this.show()
      }
      return this
    }

    this.preQuit = function () {
      this.hide()
      this.state.open = false
      if (this.floating) this.floating.minimize()
      ox.ui.windowManager.trigger('window.pre-quit', this)
      return this
    }

    this.close = function () {
      // local self
      let self = this

      // might have been removed (56913)
      if (!this.trigger) return this

      if (quitOnClose && this.app !== null) {
        this.trigger('beforequit')
        this.app.quit()
          .done(function () {
            self.state.open = false
            self.state.running = false
            self = null
          })
      } else {
        this.hide()
        this.state.open = false
        this.trigger('close')
        ox.ui.windowManager.trigger('window.close', this)
      }
      return this
    }

    const BUSY_SELECTOR = 'input:not([type="file"], [type="hidden"]), select, textarea, button'

    this.busy = function (pct, sub, callback) {
      // use self instead of this to make busy/idle robust for callback use
      let blocker
      if (self) {
        blocker = self.nodes.blocker
        // steal focus
        $('body').focus()
        self.nodes.disabled = self.nodes.disabled.add(self.nodes.main.find(BUSY_SELECTOR)
          .not(':disabled').prop('disabled', true))
        if (_.isNumber(pct)) {
          pct = Math.max(0, Math.min(pct, 1))
          blocker.idle().find('.progress-bar').eq(0).css('width', (pct * 100) + '%').parent().show()
          if (_.isNumber(sub)) {
            blocker.find('.progress-bar').eq(1).css('width', (sub * 100) + '%').parent().show()
          } else if (_.isString(sub)) {
            blocker.find('.footer').text(sub)
          }
          blocker.show()
        } else {
          blocker.find('.progress').hide()
          blocker.busy().show()
        }
        if (_.isFunction(callback)) {
          callback.call(blocker)
        }
        self.trigger('busy')
      }
      return this
    }

    this.idle = function () {
      if (isMobileClosable(self.app)) this.slideIn($('#' + self.id))
      // use self instead of this to make busy/idle robust for callback use
      if (self) {
        self.nodes.blocker.find('.progress').hide()
          .end().idle().hide()
          .find('.header, .footer').empty()
        self.nodes.disabled.prop('disabled', false)
        self.nodes.disabled = $()
        self.trigger('idle')
      }
      return this
    }

    this.destroy = function () {
      // hide window
      this.hide()
      // trigger event
      this.trigger('destroy')
      // disconnect from app
      if (this.app !== null) {
        this.app.win = null
        this.app = null
      }
      // destroy everything
      this.events.destroy()
      this.show = this.busy = this.idle = $.noop
      this.nodes.outer.remove()
      this.nodes = self = null
      return this
    }

    this.setQuitOnClose = function (flag) {
      quitOnClose = !!flag
      return this
    }

    const title = ''

    this.getTitle = function () {
      return title
    }

    this.setTitle = function (str) {
      ox.trigger('change:document:title', [str, this.app.get('title')])
      return this
    }

    this.addClass = function () {
      const o = this.nodes.outer
      return o.addClass.apply(o, arguments)
    }

    this.addButton = function (options) {
      const o = $.extend({
        label: 'Action',
        action: $.noop
      }, options || {})

      return $('<div>')
        .addClass('io-ox-toolbar-link')
        .text(String(o.label))
        .on('click', o.action)
        .appendTo(this.nodes.toolbar)
    }

    this.addPerspective = function (p) {
      if (!perspectives[p.name]) {
        perspectives[p.name] = p
      }
    }

    this.getPerspective = function () {
      const cur = this.currentPerspective.split(':')[0]
      return perspectives[cur]
    }

    this.currentPerspective = 'main'

    this.setChromeless = function (mode) {
      this.nodes.outer.toggleClass('chromeless-window', !!mode)
    }
  }

  // window factory
  return function (options) {
    const opt = $.extend({
      chromeless: false,
      classic: false,
      id: 'window-' + guid,
      name: '',
      title: '',
      toolbar: false,
      width: 0,
      floating: false
    }, options)

    // create new window instance
    const win = new Window(opt)

    // window container
    win.nodes.outer = $('<div class="abs window-container">').attr({ id: opt.id, 'data-window-nr': guid })

    // create very simple window?
    if (opt.simple) {
      win.simple = true
      win.nodes.outer.addClass('simple-window').append(
        win.nodes.main = $('<div class="window-content" tabindex="-1">')
      )
      // TODO: check blocker idle/busy
      win.nodes.blocker = $()
      // TODO: needed?
      // win.nodes.sidepanel = $();
      win.nodes.head = $()
      win.nodes.body = $()
      // TODO: footer?
    } else {
      win.nodes.outer.append(
        win.nodes.blocker = $('<div class="abs window-blocker">').hide()
          .append(
            $('<div class="abs header">'),
            $('<div class="progress first"><div class="progress-bar" style="width:0"></div></div>').hide(),
            $('<div class="progress second"><div class="progress-bar" style="width: 0"></div></div>').hide(),
            $('<div class="abs footer">')
          ),
        win.nodes.header = $('<div class="window-header">').hide(),
        $('<div class="window-container-center">')
          .append(
            win.nodes.sidebar = $('<div class="window-sidebar translucent-constant">').hide(),
            win.nodes.sidepanel = $('<div class="window-sidepanel translucent-constant">').hide(),
            win.nodes.body = $('<div class="window-body">').append(
              win.nodes.main = $('<div class="window-content">')
            )
          )
          // capture controller events
          .on('controller:quit', function () {
            if (win.app) { win.app.quit() }
          }),
        win.nodes.footer = $('<div class="window-footer">').hide()
      )

      // classic window header?
      if (opt.classic) win.nodes.outer.addClass('classic')

      // add default css class
      if (opt.name) {
        win.nodes.outer.addClass(opt.name.replace(/[./]/g, '-') + '-window')
      }

      ext.point(opt.name + '/window-body').invoke('draw', win.nodes)
    }

    // add event hub
    Events.extend(win)

    // fix height/position/appearance
    if (opt.chromeless) win.setChromeless(true)

    // inc
    guid++

    // return window object
    return win
  }
}())

// wraps require function
ox.load = (function () {
  let def
  const $blocker = $('#background-loader')
  let buttonTimer
  let launched

  function startTimer () {
    const blockerTimer = setTimeout(function () {
      // visualize screen blocker
      ox.busy(true)
      buttonTimer = setTimeout(function () {
        // add button to abort
        if (!$blocker[0].firstChild) {
          const button = $('<button type="button" class="btn btn-primary">').text(gt('Cancel')).fadeIn()
          button.on('click', function () {
            def.reject(true)
            clear(blockerTimer)
          })
          $blocker
            .append(button)
          button.focus()
        }
      }, 5000)
    }, 1000)
    return blockerTimer
  }

  function clear (blockerTimer) {
    clearTimeout(blockerTimer)
    clearTimeout(buttonTimer)
    blockerTimer = null
    buttonTimer = null
    setTimeout(function () {
      if (blockerTimer === null) {
        ox.idle()
      }
    }, 0)
  }

  function clearViaLauncher (blockerTimer) {
    // launched is a deferred used for a delayed clear
    launched.always(function () {
      clear(blockerTimer)
    })
  }

  return async function (cb, data) {
    if (arguments.length < 1 || (arguments.length === 2 && _.isFunction(data))) throw new Error('ox.load does not support callback params.')
    if (!_.isFunction(cb)) {
      console.error('ox.load is not used with a callback function', cb)
      return Promise.resolve()
    }

    def = $.Deferred()
    launched = data && data.launched ? data.launched : $.Deferred().resolve()

    // block UI
    if (!$blocker.hasClass('secure')) {
      ox.busy()
    }
    const blockertimer = startTimer()

    return cb().finally(() => clearViaLauncher(blockertimer))
  }
}())

// simple launch
const pendingLaunches = new Map()
ox.launch = function (cb, data) {
  if (!_.isFunction(cb)) return console.error('ox.launch is not used with a callback function', cb)

  // reuse the result, if the callback function is the same
  // this is necessary, to prevent duplicate launches at the same time
  if (pendingLaunches.has(cb)) return pendingLaunches.get(cb)

  const result = (async () => {
    const loadStart = Date.now()

    try {
      const { default: m } = await ox.load(cb, data)
      if (!m || !m.getApp) {
        console.error('Couldn\'t launch app', cb, m)
        return
      }
      const app = m.getApp(data)
      await app.launch(data)
      ox.trigger('loadtime', { app: this, id: this.id, loadStart, loadEnd: Date.now() })
      return app
    } catch (error) {
      console.error(error)
      yell('error', gt('Failed to start application. Maybe you have connection problems. Please try again.'))
    } finally {
      pendingLaunches.delete(cb)
    }
  })()
  pendingLaunches.set(cb, result)

  return result
}

export { ox }

export default ox.ui
