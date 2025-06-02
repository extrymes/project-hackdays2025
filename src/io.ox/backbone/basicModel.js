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

import Backbone from '@/backbone'
import _ from '@/underscore'
import $ from '@/jquery'

import ext from '@/io.ox/core/extensions'
import gt from 'gettext'

function ValidationErrors () {
  this.errors = {}

  this.add = function (attribute, error) {
    (this.errors[attribute] || (this.errors[attribute] = [])).push(error)
    return this
  }

  this.hasErrors = function () {
    return !_.isEmpty(this.errors)
  }

  this.errorsFor = function (attribute) {
    return this.errors[attribute]
  }

  this.each = function () {
    const wrapped = _(this.errors)
    return wrapped.each.apply(wrapped, $.makeArray(arguments))
  }
}

const BasicModel = Backbone.Model.extend({

  initialize (obj) {
    const self = this
    this._valid = true
    this.attributeValidity = {}
    this.id = obj.id

    this.on('change:id', function () {
      self.id = self.get('id')
    })

    if (this.init) {
      this.init()
    }

    // model might already have a prop or function 'url'
    this.url = this.url || 'invalidURL'
  },

  point (subpath) {
    if (/^\//.test(subpath)) {
      subpath = subpath.substring(1)
    }
    return ext.point(this.ref + subpath)
  },

  validate (attributes, evt, options) {
    options = options || {}

    const self = this
    const errors = self.errors = new ValidationErrors()
    attributes = attributes || this.toJSON()
    this.point('validation').invoke('validate', errors, attributes, errors, this)
    if (options.isSave) {
      this.point('validation/save').invoke('validate', errors, attributes, errors, this)
    }

    if (errors.hasErrors()) {
      const validAttributes = {}
      _(attributes).chain().keys().each(function (key) {
        validAttributes[key] = true
      })
      errors.each(function (messages, attribute) {
        validAttributes[attribute] = false
        self.trigger('invalid:' + attribute, messages, errors, self)
      })
      // Trigger a valid:attribute event for all attributes that have turned valid
      _(self.attributeValidity).each(function (wasValid, attribute) {
        if (!wasValid && validAttributes[attribute]) {
          self.trigger('valid:' + attribute, self)
        }
      })
      self.attributeValidity = validAttributes
      self.trigger('invalid', errors, self)
      self._valid = false
    } else if (!self._valid) {
      _(self.attributeValidity).each(function (wasValid, attribute) {
        if (!wasValid) {
          self.trigger('valid:' + attribute, self)
        }
      })
      _(attributes).chain().keys().each(function (key) {
        self.attributeValidity[key] = true
      })
      self._valid = true
      this.trigger('valid')
    }
  },
  parse () {
    return {}
  },
  sync (action, model, callbacks) {
    const self = this

    // action is one of 'update', 'create', 'delete' or 'read'
    if (action === 'delete') {
      action = 'destroy'
    }
    if ((action === 'update' || action === 'create')) {
      // isValid actually calls the validate function, no need to do this manually
      if (!this.isValid({ isSave: true })) {
        let errorMessage = gt('The dialog contains invalid data')
        const errors = this.errors.errors

        // if it's only one error and it has an error message we show that instead of the generic message
        // there may be more errors for one attribute (stored in an array), we just pick the first one
        if (_(errors).size() === 1 && _.isString(errors[_(errors).keys()[0]][0])) {
          errorMessage = errors[_(errors).keys()[0]]
        }
        return $.Deferred().reject({ error: errorMessage, model: this })
      }
    }
    if (this.syncer) {
      this.trigger(action + ':start')
      this.trigger('sync:start')

      return this.syncer[action](model)
        .done(function (response) {
          callbacks.success(model, response)
          self.trigger(action, response)
          self.trigger('sync', response)
        })
        .fail(function (response) {
          if (response?.xhr?.status === 404 || response?.xhr?.status === 0) {
            response.error = gt('Server unreachable')
          }
          callbacks.error(model, response)
          self.trigger(action + ':fail', response)
          self.trigger('sync:fail', response)
        })
        .always(function () {
          self.trigger(action + ':always')
          self.trigger('sync:always')
        })
    }
    throw new Error('No Syncer specified!')
  },
  isSet () {
    const self = this
    return _(arguments).all(function (attribute) {
      return self.has(attribute) && self.get(attribute) !== ''
    })
  },

  isAnySet () {
    const self = this
    return _(arguments).any(function (attribute) {
      return self.has(attribute) && self.get(attribute) !== ''
    })
  },
  isValid (options) {
    this.validate(this.toJSON(), null, options)
    return this._valid
  },
  hasValidAttributes () {
    const self = this
    return _(arguments).all(function (attr) {
      return self.attributeValidity[attr]
    })
  },
  invalidAttributes () {
    const self = this
    return _(this.attributeValidity).chain().keys().filter(function (attr) {
      return !self.attributeValidity[attr]
    }).values()._wrapped
  }
})

export default BasicModel
