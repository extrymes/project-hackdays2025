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
import ModelFactory from '@/io.ox/backbone/modelFactory'
import Validators from '@/io.ox/backbone/validation'
import api from '@/io.ox/core/api/mailfilter'
import * as settingsUtil from '@/io.ox/settings/util'
import * as util from '@/io.ox/mail/mailfilter/settings/util'

import gt from 'gettext'

function buildFactory (ref, api) {
  const factory = new ModelFactory({
    api,
    ref,
    model: {
      idAttribute: 'id',
      initialize () {
        this.on('change', this.onChangeAttribute)
        // ugly way of calling OXModel.prototype.initialize inside modelFactory.js
        // but OXModel cannot be accessed from outside
        Object.getPrototypeOf(Object.getPrototypeOf(this)).initialize.apply(this, arguments)
      },
      onChangeAttribute () {
        const self = this
        if (!this.changed.actioncmds && !this.changed.test) return
        $.when(
          util.getDefaultRulename(this.previousAttributes()),
          util.getDefaultRulename(this.attributes)
        ).done(function (oldRulename, newRulename) {
          if (self.get('rulename') !== oldRulename && self.get('rulename') !== gt('New rule')) return
          self.set('rulename', newRulename)
        })
      },
      toJSON () {
        const data = JSON.parse(JSON.stringify(this.attributes))
        let list = []
        // first level
        if (data.test) list.push(data.test)
        _.each(data.test.tests, function (obj) {
          // second level
          list.push(obj)
          // third level
          if (obj.tests) list = list.concat(obj.tests)
        })
        _.each(list, removeClientOnlyProperties)
        return data
      }
    },

    update (model) {
      // yell on reject
      return settingsUtil.yellOnReject(
        api.update(model.toJSON())
      )
    },
    create (model) {
      // yell on reject
      return settingsUtil.yellOnReject(
        api.create(model.toJSON())
      )
    }

  })

  Validators.validationFor(ref, {
    rulename: { format: 'string' },
    test: { format: 'object' },
    actioncmds: { format: 'array' },
    flags: { format: 'array' },
    active: { format: 'boolean' }

  })

  return factory
}

function removeClientOnlyProperties (data) {
  if (data.id === 'size') {
    delete data.sizeValue
    delete data.unit
  }
}

function provideEmptyModel () {
  return {
    rulename: gt('New rule'),
    test: {
      id: 'true'
    },
    actioncmds: [],
    flags: [],
    active: true
  }
}

export default {
  api,
  protectedMethods: {
    buildFactory,
    provideEmptyModel
  }
}
