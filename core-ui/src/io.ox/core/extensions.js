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

// cSpell:ignore befores

import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import Events from '@/io.ox/core/event'

// global registry
let registry = {}

// sort by index
const indexSorter = function (a, b) {
  if (a.index === 'first') return -1
  if (b.index === 'first') return 1
  if (a.index === 'last') return 1
  if (b.index === 'last') return -1
  return a.index - b.index
}

// never leak
$(window).on('unload', function () {
  _(registry).each(function (ext) {
    ext.clear()
  })
  registry = {}
})

const Point = function (options) {
  this.id = String(options.id)
  this.description = options.description || ''

  let extensions = []
  const orphans = {}
  let replacements = {}
  const disabled = {}
  // get enabled extensions
  const list = function () {
    return _.chain(extensions)
      .select(function (obj) {
        return !disabled[obj.id] && !disabled['*']
      })
  }
  // look for existing extension
  const has = function (id) {
    return _(extensions)
      .select(function (o) {
        return o.id === id
      })
      .length > 0
  }
  const self = this
  const sort = function () {
    const basicList = []
    const befores = orphans.before || {}
    const afters = orphans.after || {}

    _(extensions).each(function (ext) {
      let list
      if (ext.before) {
        list = befores[ext.before]
        if (!list) {
          list = befores[ext.before] = []
        }
      } else if (ext.after) {
        list = afters[ext.after]
        if (!list) {
          list = afters[ext.after] = []
        }
      } else {
        list = basicList
      }

      list.push(ext)
    })

    extensions = []
    basicList.sort(indexSorter)
    const circleGuard = {}

    function fnAddExtension (ext) {
      if (circleGuard[ext.id]) {
        throw new Error('Circular References detected for extension point ' + self.id + ' and extension ' + ext.id)
      }
      circleGuard[ext.id] = true
      const before = befores[ext.id]
      if (before) {
        delete befores[ext.id]
        before.sort(indexSorter)
        _(before).each(fnAddExtension)
      }
      extensions.push(ext)
      const after = afters[ext.id]
      if (after) {
        delete afters[ext.id]
        after.sort(indexSorter)
        _(after).each(fnAddExtension)
      }
      delete circleGuard[ext.id]
    }

    _(basicList).each(fnAddExtension)

    orphans.before = befores
    orphans.after = afters
  }

  Events.extend(this)

  function createInvoke (point, ext) {
    return function (name, context) {
      // get variable set of arguments
      const args = $.makeArray(arguments).slice(2)
      const fn = ext[name]
      if (fn) {
        return fn.apply(context, args)
      }
    }
  }

  this.has = has

  /**
   * registers extension if id is not taken yet
   * @chainable
   * @param  {extension}
   * @return {point}
   */
  this.extend = function () {
    const items = _(arguments).flatten()

    _(items).each(function (extension) {
      if (extension.invoke) {
        console.error(extension)
        throw new Error('Extensions must not have their own invoke method')
      }

      let id = extension.id

      if (!id) {
        extension.id = id = 'default'
        extension.index = extension.index || 100
      } else {
        extension.index = extension.index || 1000000000
      }

      // skip duplicates (= same id)
      if (has(id)) {
        if (ox.debug) console.warn('Extensions MUST HAVE unique identifiers! Point: %s ID: %s', this.id, extension.id)
        return
      }

      if ('enabled' in extension) {
        if (_.isObject(extension.enabled)) {
          return console.error("Extending of '" + this.id + "' with '" + id + "' failed. Ensure extensions 'enabled' property is a primitive.")
        }
        if (!extension.enabled) this.disable(id)
        delete extension.enabled
      }

      extension.invoke = createInvoke(this, extension)

      // apply replacements
      _(replacements[id]).each(function (arg) {
        _.extend(extension, _.isFunction(arg) ? arg(_.extend({}, extension)) : arg)
      })
      delete replacements[id]

      extensions.push(extension)
      sort()

      if (!extension.metadata) {
        extension.metadata = function (name, args) {
          if (this[name]) {
            if (_.isFunction(this[name])) {
              return this[name].apply(this, args)
            }
            return this[name]
          }
          return undefined
        }
      }

      this.trigger('extended', extension)
    }, this)

    return this
  }

  /**
   * extends existing extension OR registers extension if id is not taken yet
   * registers extension (for point) if id is not taken yet
   * replace(replacement) or replace(id, function (original) { ... });
   * @chainable
   * @param  {extension}
   * @return {point}
   */
  this.replace = function (arg, fn) {
    const id = arguments.length === 2 ? arg : arg.id

    if (!id) throw new Error('Replacements must have an id!')

    const replaced = _(extensions).find(function (extension) {
      if (extension.id !== id) return false
      _.extend(extension, fn ? fn(_.extend({}, extension)) : arg)
      return true
    })

    if (replaced) sort(); else (replacements[id] = replacements[id] || []).push(fn || arg)

    return this
  }

  this.clear = function () {
    extensions = {}
    replacements = {}
  }

  /**
   * get all extensions
   * @return {object[]}
   */
  this.all = function () {
    return extensions
  }

  this.get = function (id, callback) {
    const extension = _(extensions).chain()
      .filter(function (obj) { return obj.id === id }).first().value()
    if (!_.isFunction(callback)) return extension
    if (extension) {
      callback(extension)
      sort()
    }
    return this
  }

  /**
   * get all extension ids
   * @return {string[]}
   */
  this.keys = function () {
    return _(extensions).pluck('id')
  }

  // public for testing purposes
  this.sort = function () {
    sort()
    return this
  }

  /**
   * get all enabled extensions
   * @return {object[]}
   */
  this.list = function () {
    return list().value()
  }

  this.chain = function () {
    return list()
  }

  this.each = function (cb) {
    list().each(cb)
    return this
  }

  this.map = function (cb) {
    return list().map(cb)
  }

  this.filter = this.select = function (cb) {
    return list().select(cb).value()
  }

  this.reduce = this.inject = function (cb, memo) {
    return list().inject(cb, memo).value()
  }

  this.pluck = function (id) {
    return list().pluck(id).value()
  }

  this.invoke = function (name, context, baton) {
    const o = list()
    const args = ['invoke'].concat($.makeArray(arguments))
    // let's have debug-friendly exceptions
    function error (e) {
      console.error('point("' + self.id + '").invoke("' + name + '")', e.message, {
        args: args.slice(3),
        context,
        exception: e
      })
    }
    // manual invoke to consider baton
    if (baton instanceof Baton) {
      const previousInvoke = baton.invoke
      try {
        baton.invoke = { name, id: this.id }
        return o
          .map(function (ext) {
            if (baton.isDisabled(self.id, ext.id) || !_.isFunction(ext[name])) return undefined
            // stopped?
            if (baton.isPropagationStopped()) return undefined
            // inject current extension
            baton.extension = ext
            // call
            try {
              return ext[name].apply(context, args.slice(3))
            } catch (e) {
              return error(e)
            }
          })
      } catch (e) {
        error(e)
      } finally {
        baton.invoke = previousInvoke
      }
    } else {
      try {
        return o.invoke.apply(o, args)
      } catch (e) {
        error(e)
      }
    }
  }

  this.disable = function (id) {
    disabled[id] = true
    return this
  }

  this.enable = function (id) {
    delete disabled[id]
    return this
  }

  this.toggle = function (id, state) {
    state = _.isBoolean(state) ? state : disabled[id]
    return state ? this.enable(id) : this.disable(id)
  }

  this.isEnabled = function (id) {
    return !disabled[id] && !disabled['*']
  }

  this.inspect = function () {
    console.debug('Extension point', this.id, {
      disabled,
      replacements,
      extensions: JSON.stringify(this.all())
    })
  }

  // invoke extensions 'perform' as a waterfall
  this.cascade = function (context, baton) {
    baton = Baton.ensure(baton)
    const point = this
    return point.reduce(function (def, ext) {
      if (!def || !def.then) def = $.when(def)
      return def.then(function success (obj) {
        if (obj && obj.warnings) baton.warning = obj.warnings
        if (baton.isPropagationStopped()) return
        if (baton.isDisabled(point.id, ext.id)) return
        return ext.perform.apply(context, [baton])
      }, function failure (err) {
        if (!baton.catchErrors) throw err
        if (err && err.error) baton.error = err.error
        if (err && err.code) baton.errorCode = err.code
        if (err && err.warnings) baton.warning = err.warnings
        baton.rejected = true
        if (baton.isPropagationStopped()) return
        if (baton.isDisabled(point.id, ext.id)) return
        return ext.perform.apply(context, [baton])
      })
    }, $.when())
  }

  /**
   * get number of enabled extensions
   * @return { integer }
   */
  this.count = function () {
    return list().value().length
  }

  function randomSort () { return Math.round(Math.random()) - 0.5 }

  this.shuffle = function () {
    extensions.sort(randomSort)
    _(extensions).each(function (ext, index) {
      ext.index = 100 + 100 * index
    })
    return this
  }

  this.options = function (defaults) {
    let options = defaults || {}
    this.each(function (obj) {
      options = _.extend(options, obj)
    })
    // remove extension stuff
    delete options.id
    delete options.index
    delete options.invoke
    delete options.metadata
    return options
  }

  this.prop = function (id) {
    return list().pluck(id).compact().first().value()
  }
}

function disable (baton, disabled) {
  _(disabled).each(function (extension, point) {
    if (_.isArray(extension)) {
      _(extension).each(function (ext) {
        baton.disable(point, ext)
      })
    } else {
      baton.disable(point, extension)
    }
  })
}

function Baton (obj) {
  // bypass?
  if (obj instanceof Baton) return obj
  // called via new?
  if (this instanceof Baton) {
    // to be safe
    this.data = {}
    this.options = {}
    this.flow = { disable: {} }
    this.$ = {}
    // just copy given object
    _.extend(this, _(obj).omit('isDefaultPrevented', 'isPropagationStopped'))
  } else {
    // for the lazy way: b = Baton() instead of b = new Baton()
    return new Baton(obj)
  }
}

Baton.ensure = function (obj) {
  if (obj instanceof Baton) return obj
  if ('data' in obj) return new Baton(obj)
  return new Baton({ data: obj })
}

Baton.prototype = {

  isPrevented: false,
  isStopped: false,

  isDefaultPrevented () {
    return this.isPrevented
  },

  isPropagationStopped () {
    return this.isStopped
  },

  preventDefault () {
    this.isPrevented = true
  },

  stopPropagation () {
    this.isStopped = true
  },

  resumePropagation () {
    this.isStopped = false
  },

  first () {
    return _.isArray(this.data) ? this.data[0] : this.data
  },

  array () {
    return [].concat(this.data)
  },

  set (property, obj) {
    _.extend(this[property], obj)
    return this
  },

  // shallow copy (since batons also contain DOM nodes)
  // be careful as this function can only clone attributes that are objects correctly, (doesn't work correctly with arrays or strings)
  clone (options = {}) {
    const clone = new Baton()

    const shallowCopy = { ...this, ...options }
    Object.keys(shallowCopy).forEach(key => {
      const value = shallowCopy[key]
      const type = typeof value
      const doSpread = type === 'object' && (!value?.append && value !== null)
      // object, no jQuery
      clone[key] = doSpread ? { ...value } : value
    })
    return clone
  },

  dispose () {
    for (const id in this) {
      /* eslint no-prototype-builtins: "off" */
      if (this.hasOwnProperty(id)) this[id] = null
    }
    this.disposed = true
  },

  enable (pointId, extensionId) {
    // typical developer mistake (forget pointId actually)
    if (arguments.length < 2) console.warn('Baton.enable(pointId, extensionId) needs two arguments!')
    const hash = this.flow.disable
    if (!hash[pointId]) return
    hash[pointId] = _(hash[pointId]).without(extensionId)
  },

  disable (pointId, extensionId) {
    if (_.isObject(pointId) || !pointId) return disable(this, pointId)
    // typical developer mistake (forget pointId actually)
    if (arguments.length < 2) console.warn('Baton.disable(pointId, extensionId) needs two arguments!')
    const hash = this.flow.disable;
    (hash[pointId] = hash[pointId] || []).push(extensionId)
  },

  isDisabled (pointId, extensionId) {
    if (extensionId === 'default' && this.isDefaultPrevented()) return true
    const list = this.flow.disable[pointId]
    return list === undefined ? false : list.includes(extensionId)
  },

  branch (id, context, $el) {
    const previousElement = this.$el
    this.$el = $el
    that.point(this.invoke.id + '/' + id).invoke(this.invoke.name, context || $el, this)
    this.$el = previousElement
    return $el
  }
}

// if not allread a baton extend new baton instace with 'object'
Baton.wrap = function (object) {
  return object instanceof Baton ? object : new Baton(object)
}

const that = {

  /**
   * get point (if necessary also created and registered before)
   * @param  {string} id
   * @return {point}
   */
  point (id) {
    id = id || ''
    if (registry[id] !== undefined) {
      return registry[id]
    }
    return (registry[id] = new Point({ id }))
  },

  /**
   * get extension ids
   * @return {string[]} ids
   */
  keys () {
    return _.keys(registry)
  },

  Baton,

  indexSorter
}

export default that
