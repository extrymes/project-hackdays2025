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
import http from '@/io.ox/core/http'
import yell from '@/io.ox/core/yell'
import { addReadyListener } from '@/io.ox/core/events'

const clone = function (obj) {
  // simple, fast, and robust
  if (_.isUndefined(obj)) {
    return undefined
  }
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch (e) {
    console.error(obj, e, e.stack)
    throw e
  }
}

const getParts = function (key) {
  return _.isArray(key) ? key : String(key).split(/\//)
}

const get = function (source, path, defaultValue) {
  // no argument?
  if (path === undefined) { return clone(source) }
  // get parts
  let key; const parts = getParts(path); let tmp = source || {}
  while (parts.length) {
    key = parts.shift()
    if (!_.isObject(tmp) || !(key in tmp)) return defaultValue
    tmp = tmp[key]
  }
  return clone(tmp)
}

// pending requests?
const pending = {}

const _cache = {}

export class Settings {
  constructor (path, tree, meta, defaultData) {
    _cache[path] = this
    if (typeof tree === 'function' && typeof defaultData === 'undefined') {
      this._defaultData = tree
      tree = {}
    }

    this._path = path
    this._tree = tree || {}
    this._meta = meta || {}

    this._detached = false
    this._saved = JSON.parse(JSON.stringify(tree))
    this._loaded = false

    /**
     * Save settings to backend.
     *
     * You can use the request object to find out whether the save
     * attempt was successful.
     *
     * @return {jQuery.Deferred} The deferred object of the request sent
     */
    this.save = (() => {
      let request
      const sendRequest = (data) => {
        request = http.PUT({
          module: 'jslob',
          params: { action: 'set', id: path },
          data
        })
          .done(() => {
            this._saved = JSON.parse(JSON.stringify(data))
            this.trigger('save')
          })
          .fail((e) => {
            if (ox.debug) console.error('jslob:set', e)
          })
          .always(() => {
            delete pending[path]
          })
      }
      // limit to 5 seconds
      const save = _.throttle(sendRequest, 5000)

      return function (custom, options) {
        if (!this._loaded) {
          console.warn(`Settings ${this._path} are tried to be saved before they were loaded.`)
          return $.when()
        }
        // options
        const opt = $.extend({
          force: false
        }, options)

        if (this._detached) console.warn('Not saving detached settings.', path)
        if (this._detached || (!custom && _.isEqual(this._saved, this._tree))) return $.when()

        const data = { tree: custom || this._tree, meta: this._meta }

        // don't save undefined
        if (data.tree === undefined) return $.when()

        pending[path] = this

        if (opt.force) {
          sendRequest(data.tree)
        } else {
          save(data.tree)
        }
        return request
      }
    })()

    _.extend(this, Backbone.Events)
  }

  get (path, defaultValue) {
    if (!this._loaded) console.warn(`Access ${path} in ${this._path} before these settings are loaded.`, this.id)
    return get(this._tree, path, defaultValue)
  }

  meta (path) {
    return get(this._meta, path, {})
  }

  isConfigurable (path) {
    const meta = this.meta(path)
    // default is true!
    return 'configurable' in meta ? meta.configurable : true
  }

  contains (path) {
    let key; const parts = getParts(path); let tmp = this._tree || {}
    while (parts.length) {
      key = parts.shift()
      if (parts.length) {
        if (_.isObject(tmp)) {
          tmp = tmp[key]
        } else {
          return false
        }
      } else {
        return _.isObject(tmp) && key in tmp
      }
    }
  }

  _resolve (path, callback, create) {
    let key; const parts = getParts(path); let tmp = this._tree || {}; let notPlainObject
    while (parts.length) {
      key = parts.shift()
      if (_.isObject(tmp)) {
        if (parts.length) {
          notPlainObject = !!create && (!_.isObject(tmp[key]) || _.isArray(tmp[key]))
          tmp = notPlainObject ? (tmp[key] = {}) : tmp[key]
        } else {
          callback(tmp, key)
        }
      } else break
    }
  }

  set (path, value, options) {
    // options
    const opt = $.extend({
      silent: false
    }, options)

    // overwrite entire tree?
    if (arguments.length === 1 && _.isObject(path)) {
      this._tree = path
      if (!opt.silent) this.trigger('reset', this._tree)
    } else {
      this._resolve(path, (tmp, key) => {
        const previous = tmp[key]
        const isChange = JSON.stringify(value) !== JSON.stringify(previous)
        if (value === undefined) {
          delete tmp[key]
        } else {
          tmp[key] = value
        }
        if (!isChange) return
        if (!opt.silent) this.trigger('change:' + path, value, previous).trigger('change', path, value, previous)
      }, true)
    }
    return this
  }

  remove (path) {
    this._resolve(path, (tmp, key) => {
      const value = tmp[key]
      delete tmp[key]
      this.trigger('remove:' + path).trigger('remove change', path, value)
    })
    return this
  }

  async _applyDefaults () {
    // sneak in settings for e2e testing that are impossible to set by HTTP API
    const overrides = window.puppeteer?.settings?.[this._path] || {}
    if (typeof this._defaultData === 'function') {
      this._tree = _.extend({}, await this._defaultData(), this._tree, overrides)
    } else if (typeof this._defaultData === 'object') {
      this._tree = _.extend({}, this._defaultData, this._tree, overrides)
    }
  }

  stringify () {
    return JSON.stringify(this.get())
  }

  detach () {
    this._detached = true
    return this
  }

  async load () {
    if (this._initRequest) return this._initRequest

    // let data

    const load = () => {
      return http.PUT({
        module: 'jslob',
        params: { action: 'list' },
        data: [this._path]
      })
        .then(
          (data) => {
            if (!this._detached) {
              this._tree = data[0].tree
              this._meta = data[0].meta
              this._saved = JSON.parse(JSON.stringify(this._tree))
              return this._applyDefaults()
            }
            return $.when()
          },
          (e) => {
            this._tree = {}
            this._meta = {}
            this._saved = {}
            this._detached = true
            console.error('Cannot load jslob', this._path, e)
            return this._applyDefaults()
          }
        )
        .then(() => {
          this._loaded = true
          this.trigger('load', this._tree, this._meta)
          return { tree: this._tree, meta: this._meta, id: this._path }
        })
    }

    if (ox.online) {
      // online
      this._initRequest = load()
      return this._initRequest
    }
    // offline
    this.detach()
    return $.Deferred().resolve({ tree: this._tree, meta: this._meta })
  }

  async ensureData () {
    await (this._initRequest || this.load())
    return this
  }

  // reload settings from server
  // this does not trigger any change events!
  reload () {
    if (this._detached) return $.when()

    this._initRequest = http.PUT({ module: 'jslob', params: { action: 'list' }, data: [this._path] })
      .then((data) => {
        this._tree = data[0].tree
        this._meta = data[0].meta
        this._saved = JSON.parse(JSON.stringify(this._tree))
        this._applyDefaults()
        this.trigger('reload', this._tree, this._meta)
        return { tree: this._tree, meta: this._meta }
      })

    return this._initRequest
  }

  clear () {
    return http.PUT({
      module: 'jslob',
      params: { action: 'set', id: this._path },
      data: {}
    })
      .done(() => {
        this._tree = {}
        this._meta = {}
        this.trigger('reset')
      })
  }

  isPending () {
    return !!pending[this._path]
  }

  getAllPendingSettings () {
    return pending
  }

  /**
   * facade for this.save to notify user in case of errors
   * @return {jQuery.Deferred}
   */
  saveAndYell (custom, options) {
    const def = this.save(custom, options)
    // options
    const opt = $.extend({
      debug: false
    }, options)

    // debug
    if (opt.debug) {
      def.always(() => {
        const list = _.isArray(this) ? this : [this]
        _.each(list, (current) => {
          if (current.state) {
            console.warn('SAVEANDYELL: ' + current.state())
          } else if (def.state) {
            console.warn('SAVEANDYELL: ' + def.state())
          }
        })
      })
    }

    // yell on reject
    return def.fail((e) => {
      const obj = e || { type: 'error' }
      // use obj.message for custom error message
      yell(obj)
    })
  }

  /**
   * Save settings to backend.
   *
   * Does the same .save(null, { force: true })
   * but assign a 'merge' action instead of 'set'
   *
   * @return {jQuery.Deferred} The deferred object of the request sent
   *
   */
  merge (custom) {
    if (this._detached) console.warn('Not merging/saving detached settings.', this._path)
    if (this._detached || (!custom && _.isEqual(this._saved, this._tree))) return $.when()

    const treeData = custom || this._tree

    // don't save undefined
    if (treeData === undefined) return $.when()

    pending[this._path] = this

    return http.PUT({
      module: 'jslob',
      params: { action: 'update', id: this._path },
      data: treeData
    })
      .done(() => {
        this._saved = JSON.parse(JSON.stringify(treeData))
        this.trigger('save')
      })
      .always(() => {
        delete pending[this._path]
      })
  }

  // convenience function
  ready (callback) {
    addReadyListener('settings', callback)
  }
}

export const settings = new Settings('io.ox/core', () => import(/* @vite-ignore */'@/io.ox/core/settings/defaults').then(({ default: data }) => data))

// migrating data
settings.once('load', () => {
  // added for 8.1 (March); can probably removed after a few months
  // rename 'themes' to 'theming'
  if (!settings.get('theming')) {
    settings.set('theming', settings.get('themes'))
  }
})

// always attach globally as this is will also used in production environments
window.settings = function settings (path) {
  if (!_cache[path]) throw new Error(`No such settings: "${path}"`)
  return _cache[path]
}

export function getLoadedSettings () {
  return Object.keys(_cache)
}

export function getSettings (path) {
  return _cache[path]
}
