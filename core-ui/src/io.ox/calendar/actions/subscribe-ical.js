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

import yell from '@/io.ox/core/yell'
import ext from '@/io.ox/core/extensions'
import ModalDialog from '@/io.ox/backbone/views/modal'
import mini from '@/io.ox/backbone/mini-views/common'
import http from '@/io.ox/core/http'
import folderAPI from '@/io.ox/core/folder/api'

import { settings } from '@/io.ox/calendar/settings'
import gt from 'gettext'

function iCalProbe (model) {
  const config = { uri: model.get('uri') }
  if (model.get('ical-user')) config.login = model.get('ical-user')
  if (model.get('ical-pw')) config.password = model.get('ical-pw')
  return http.PUT({
    module: 'chronos/account',
    params: {
      action: 'probe'
    },
    data: {
      'com.openexchange.calendar.provider': 'ical',
      'com.openexchange.calendar.config': config
    }
  })
}

ext.point('io.ox/calendar/subscribe/ical').extend({
  id: 'input',
  index: 100,
  render () {
    this.$body.append(
      $('<div class="form-group">').append(
        mini.getInputWithLabel('uri', gt('iCal URL'), this.model)
      )
    )
  }
})

ext.point('io.ox/calendar/subscribe/ical').extend({
  id: 'alert',
  index: 300,
  render (baton) {
    if (!baton.data.type) return
    if (!baton.data.text) return

    this.$body.append(
      $('<div class="alert">').addClass('alert-' + baton.data.type).text(
        baton.data.text
      )
    )
  }
})

ext.point('io.ox/calendar/subscribe/ical').extend({
  id: 'login',
  index: 400,
  render (baton) {
    if (!baton.data.showLogin) return

    const guid = _.uniqueId('form-control-label-')
    this.$body.append(
      $('<div class="form-group">').append(
        $('<label>').attr('for', guid).text(gt('Login')),
        new mini.InputView({ name: 'ical-user', model: this.model, id: guid, autocomplete: false }).render().$el
      )
    )
  }
})

ext.point('io.ox/calendar/subscribe/ical').extend({
  id: 'password',
  index: 500,
  render (baton) {
    if (!baton.data.showPassword) return

    const guid = _.uniqueId('form-control-label-')
    this.$body.append(
      $('<div class="form-group">').append(
        $('<label>').attr('for', guid).text(gt('Password')),
        new mini.PasswordView({ name: 'ical-pw', model: this.model, id: guid, autocomplete: false }).render().$el
      )
    )
  }
})

ext.point('io.ox/calendar/subscribe/ical').extend({
  id: 'alarms',
  index: 600,
  render () {
    this.$body.append(
      $('<div class="alert alert-info">').text(gt('Your default reminders will be applied to this calendar.'))
    )
  }
})

export default function () {
  new ModalDialog({
    title: gt('Subscribe to iCal feed'),
    point: 'io.ox/calendar/subscribe/ical',
    help: 'ox.appsuite.user.sect.calendar.folder.subscribe.html',
    model: new Backbone.Model(),
    focus: 'input',
    async: true,
    width: 500
  })
    .addCancelButton()
    .addButton({ label: gt('Subscribe'), action: 'subscribe' })
    .on('subscribe', function () {
      const self = this
      iCalProbe(this.model).then(function (data) {
        data.module = 'event'
        // apply default alarms
        data['com.openexchange.calendar.config'] = _.extend({}, data['com.openexchange.calendar.config'], {
          defaultAlarmDate: settings.get('chronos/defaultAlarmDate', []),
          defaultAlarmDateTime: settings.get('chronos/defaultAlarmDateTime', [])
        })

        return folderAPI.create('1', data)
      }).then(function () {
        yell('success', gt('iCal feed has been imported successfully'))
        self.close()
      }).catch(function (err) {
        if (/^ICAL-PROV-401(0|1|2|3)$/.test(err.code)) {
          // trigger rerendering
          const data = {
            text: err.error,
            type: /^ICAL-PROV-401(0|2)$/.test(err.code) ? 'warning' : 'danger',
            showLogin: /^ICAL-PROV-401(0|1)$/.test(err.code),
            showPassword: true
          }
          const baton = new ext.Baton({ view: self, model: self.model, data })
          self.$body.empty()
          self.point.invoke('render', self, baton)
        } else {
          yell(err)
        }
        self.idle()
      })
    })
    .open()
};
