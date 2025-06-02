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
import Backbone from '@/backbone'

import ext from '@/io.ox/core/extensions'
import * as util from '@/io.ox/core/settings/util'
import api from '@/io.ox/core/api/appPasswordApi'
import yell from '@/io.ox/core/yell'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { createIcon } from '@/io.ox/core/components'

import '@/io.ox/settings/security/appPasswords/settings/style.scss'

import gt from 'gettext'

const POINT = 'io.ox/settings/security/appPasswords/addDevice/'
let INDEX = 0

function doAdd (model) {
  const def = $.Deferred()
  if (model.get('name') && model.get('scope')) {
    import('@/io.ox/core/api/appPasswordApi').then(({ default: api }) => {
      const name = model.get('name')
      const scope = model.get('scope')
      api.addPassword(name, scope)
        .then(function (data) {
          showPassword(name, data, def)
        }, function (error) {
          yell('error', gt('There was a problem adding the password.'))
          console.error(error)
        })
    })
  } else {
    if (!model.get('name')) {
      $('input[name="name"]').focus()
    }
    if (!model.get('scope')) {
      $('select[name="scope"]').focus()
    }
  }
}

function getApplicationOptions () {
  const def = $.Deferred()
  api.getApps().then(function (apps) {
    const values = []
    apps = apps.sort(function (a, b) {
      if (a.sort && b.sort) {
        if (a.sort - b.sort === 0) { // If same sort value, alphabetical
          return a.displayName.localeCompare(b.displayName)
        }
        return a.sort - b.sort
      }
      if (a.sort) return -1 // Items with sort value take priority over those missing.
      if (b.sort) return 1
      // Fallback alphabetical
      return a.displayName.localeCompare(b.displayName)
    })
    apps.forEach(function (app) {
      values.push({
        label: app.displayName,
        value: app.name
      })
    })
    def.resolve(values)
  }, function (error) {
    yell('error', gt('There was a problem getting the list of available applications from the server.'))
    console.error(error)
    def.reject()
  })
  return def
}

ext.point(POINT).extend(
  {
    index: INDEX += 100,
    id: 'AppLabel',
    render () {
      const label = $('<div class="appAddSpan">').append(gt('To add a password, select an application to use with a new password, as well as a new descriptive name for the password.'))
      this.append(
        label,
        $('<br>')
      )
    }
  },
  {
    index: INDEX += 100,
    id: 'AppSelector',
    render (baton) {
      if (!baton.model) {
        baton.model = new Backbone.Model()
      }
      const placeholder = $('<div>')
      let spinner
      this.append(
        placeholder,
        (spinner = $('<div>').busy())
      )

      getApplicationOptions().then(function (apps) {
        // empty placeholder, needed for OXUIB-1604
        apps.unshift({ label: gt('Choose an application'), value: '' })
        const selector = util.compactSelect('scope', gt('Application'), baton.model, apps, { width: 6 })
        selector.find('option[value=""]').prop({ disabled: true })
        placeholder.replaceWith(selector)
        spinner.remove()
      }, function () {
        spinner.remove()
      })
    }
  },
  {
    index: INDEX += 100,
    id: 'nameInput',
    render (baton) {
      const input = util.input('name', gt('Password name'), baton.model)
      baton.model.set('name', gt('My Phone'))
      input[1].val(gt('My Phone')).on('click', function () {
        $(this).select()
      })
      this.append(
        $('<div class="form-group row">').append($('<div class="col-md-6">').append(input)),
        $('<br>')
      )
    }
  },
  {
    index: INDEX += 100,
    id: 'Button',
    render (baton) {
      const button = $('<div class="form-group buttons">').append(
        $('<button type="button" class="btn btn-primary">')
          .append(createIcon('bi/plus-lg.svg').addClass('me-8'), $.txt(gt('Add new password')))
          .on('click', function () {
            doAdd(baton.model)
          })
      )
      this.append(button)
    }
  }
)

function showPassword (app, data, def) {
  import('@/io.ox/settings/security/appPasswords/settings/pane').then(({ default: list }) => {
    new ModalDialog({
      async: true,
      title: gt('Password Created')
    })
      .build(function () {
        const success = gt('A password was created successfully.  Please use the following settings in the application:')
        const label = $('<span for="appPassLoginInfo">').append(success)
        const loginDiv = $('<div id="appPassLoginInfo" class="login_info selectable-text">')
        const username = gt('Username: %s', data.login)
        const password = gt('Password: %s', '<span class="appPassword">' + data.password + '</span>')
        loginDiv.append(username).append('<br>').append(password)
        this.$body.append(label, loginDiv)
      })
      .addButton({ action: 'ok', label: gt('Close') })
      .on('ok', function () {
        this.close()
        def.resolve()
        list.refresh()
      })
      .open()
  })
}

export default {
  start: open
}
