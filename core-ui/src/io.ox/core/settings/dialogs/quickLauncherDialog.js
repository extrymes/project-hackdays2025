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
import DisposableView from '@/io.ox/backbone/views/disposable'
import ModalDialog from '@/io.ox/backbone/views/modal'
import apps from '@/io.ox/core/api/apps'
import upsell from '@/io.ox/core/upsell'
import capabilities from '@/io.ox/core/capabilities'
import mini from '@/io.ox/backbone/mini-views/common'
import appcontrol from '@/io.ox/core/main/appcontrol'
import ext from '@/io.ox/core/extensions'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

const availableApps = apps.forLauncher().filter(function (model) {
  const requires = model.get('requires')
  // no requirements, has capability or possible upsell(not for guests)
  return !requires || upsell.has(requires) || (!capabilities.has('guest') && upsell.enabled(requires))
}).map(function (o) {
  return {
    label: o.getTitle(),
    value: o.get('id')
  }
}).concat(_(ext.point('io.ox/core/appcontrol/customQuickLaunchers').list()).map(function (customLauncher) {
  return {
    label: customLauncher.label,
    value: 'io.ox/core/appcontrol/customQuickLaunchers/' + customLauncher.id
  }
}), [{ label: gt('None'), value: 'none' }])

// Check that the app exists in available applications
function getAvailablePath (app) {
  return _(availableApps).findWhere({ value: app }) ? app : ''
}

const QuickLaunchModel = Backbone.Model.extend({
  initialize () {
    appcontrol.getQuickLauncherItems().forEach(function (item, i) {
      this.set('apps/quickLaunch' + i, getAvailablePath(item))
    }.bind(this))
  },
  toString () {
    return _.range(appcontrol.getQuickLauncherCount()).map(function (i) {
      return this.get('apps/quickLaunch' + i)
    }.bind(this)).join(',')
  }
})

const QuickLauncherSettingsView = DisposableView.extend({
  initialize () {
    this.listenTo(this.model, 'change', function () {
      settings.set('apps/quickLaunch', this.model.toString())
    })
  },
  render () {
    this.$el.append(
      _.range(appcontrol.getQuickLauncherCount()).map(function (i) {
        // #. %s is the number of the quicklauncher (1-3)
        return this.getMultiSelect('apps/quickLaunch' + i, gt('Position %s', i + 1), { pos: i })
      }, this)
    )
    return this
  },
  getMultiSelect (name, label, options) {
    options = options || {}
    const id = 'settings-' + name
    const view = new mini.SelectView({ id, name, model: this.model, list: availableApps, pos: options.pos })

    // invalid or not available app? set to 'none'
    if (!_(_(availableApps).pluck('value')).contains(this.model.get(name))) this.model.set(name, 'none')

    view.listenTo(this.model, 'change:' + name, function () {
      const appName = this.model.get(name)
      const model = this.model
      // remove duplicates if appName is not 'none'
      if (appName === 'none') return
      _(this.model.attributes).each(function (value, slotName) {
        if (slotName !== name && value === appName) {
          model.set(slotName, 'none')
        }
      })
    })

    return $('<div class="form-group row">').append(
      $('<div class="col-md-12">').append(
        $('<label>').attr('for', id).text(label),
        view.render().$el
      )
    )
  }
})

const openDialog = function () {
  const prevSettings = settings.get('apps/quickLaunch')
  new ModalDialog({
    title: gt('Change quick launch bar'),
    width: 360
  })
    .build(function () {
      this.$body.append(
        new QuickLauncherSettingsView({ model: new QuickLaunchModel() }).render().$el
      )
    })
    .addCancelButton()
    .addButton({ action: 'apply', label: gt('Save changes') })
    .on('cancel', function () {
      settings.set('apps/quickLaunch', prevSettings).save()
    })
    .on('apply', function () {
      settings.save()
    })
    .open()
}

export default {
  openDialog
}
