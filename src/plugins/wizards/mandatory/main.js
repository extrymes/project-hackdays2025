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
import moment from '@open-xchange/moment'
import ext from '@/io.ox/core/extensions'
import ox from '@/ox'
import Tour from '@/io.ox/core/tk/wizard'
import mini from '@/io.ox/backbone/mini-views/common'
import TimezonePicker from '@/io.ox/backbone/mini-views/timezonepicker'

import { settings } from '@/io.ox/core/settings'

import gt from 'gettext'

ext.point('io.ox/firstStartWizard').extend({
  id: 'initialize',
  index: 'first',
  setup ({ model }) {
    Tour.registry.add({
      id: 'firstStartWizard'
    }, function () {
      const tour = new Tour()
      const def = $.Deferred()
      const baton = ext.Baton.ensure(tour)

      baton.user = model
      baton.tour = tour
      ext.point('io.ox/firstStartWizard/steps').invoke('setup', tour, baton)

      tour.on('stop', function (reason) {
        if (reason && reason.cancel) {
          def.reject()
        } else {
          baton.user.save()
          settings.save()
          // normally this could cause problems but at this early stage no app is loaded, so it should work
          moment.tz.setDefault(settings.get('timezone'))
          def.resolve()
        }
      })
      return def
    })
  }
})

ext.point('io.ox/firstStartWizard/steps').extend({
  id: 'welcome',
  index: 100,
  setup () {
    const tour = this
    this.step()
      .mandatory()
      .title(gt('Welcome to %s', ox.serverConfig.productName))
      .content(gt('Before you can continue using the product, you have to enter some basic information. It will take less than a minute.'))
      .beforeShow(function () {
        const step = this
        step.footer($('<button type="button" class="btn pull-left">')
          .text(gt('Back to sign in'))
          .on('click', function () {
            tour.trigger('stop', { cancel: true })
          })
        )
      })
      .end()
  }
})

ext.point('io.ox/firstStartWizard/steps').extend({
  id: 'your_name',
  index: 200,
  setup (baton) {
    this.step()
      .mandatory()
      .title(gt('Your name'))
      .content($('<form class="form-horizontal" />').append(
        $('<div class="control-group" />').append(
          $('<label class="control-label" for="first_name" />').text(gt('First name')),
          $('<div class="controls" />').append(
            new mini.InputView({ name: 'first_name', model: baton.user }).render().$el
          )
        ),
        $('<div class="control-group" />').append(
          $('<label class="control-label" for="last_name" />').text(gt('Last name')),
          $('<div class="controls" />').append(
            new mini.InputView({ name: 'last_name', model: baton.user }).render().$el
          )
        )
      ))
      .beforeShow(function () {
        const step = this
        // reset name, because we want to start without any previous data
        baton.user.set('first_name')
        baton.user.set('last_name')
        step.toggleNext(false)
        step.parent.options.model.set('paused', [1])
        baton.user.on('change', function () {
          const isComplete = !_.isEmpty($.trim(baton.user.get('first_name'))) && !_.isEmpty($.trim(baton.user.get('last_name')))
          if (isComplete && _.device('smartphone')) {
            step.parent.options.model.set('paused', [])
            return
          }
          step.toggleNext(isComplete)
        })
      })
      .on('show', function () {
        this.$el.find('input:first').focus()
      })
      .end()
  }
})

ext.point('io.ox/firstStartWizard/steps').extend({
  id: 'timezone',
  index: 300,
  setup () {
    this.step()
      .mandatory()
      .title(gt('Your timezone'))
      .content(new TimezonePicker({ name: 'timezone', model: settings }).render().$el)
      .end()
  }
})

ext.point('io.ox/firstStartWizard/steps').extend({
  id: 'start_tour',
  index: 'last',
  setup () {
    this.start()
  }
})

export default {}
