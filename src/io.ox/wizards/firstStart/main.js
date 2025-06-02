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

import ox from '@/ox'
import Stage from '@/io.ox/core/extPatterns/stage'
import { settings } from '@/io.ox/core/settings'
import ext from '@/io.ox/core/extensions'
import userAPI from '@/io.ox/core/api/user'
import manifests from '@/io.ox/core/manifests'

// eslint-disable-next-line no-new
new Stage('io.ox/core/stages', {
  id: 'firstStartWizard',
  index: 200,
  run (baton) {
    if (manifests.manager.pluginsFor('io.ox/wizards/firstStart').length === 0 ||
      settings.get('wizards/firstStart/finished', false)) {
      return $.when()
    }
    const def = $.Deferred()
    const topbar = $('#io-ox-topbar')

    baton.data.popups.push({ name: 'firstStartWizard' })
    topbar.hide()
    ox.idle()
    Promise.all([
      userAPI.getCurrentUser(),
      manifests.manager.loadPluginsFor('io.ox/wizards/firstStart')
    ]).then(function ([user]) {
      ext.point('io.ox/firstStartWizard').invoke('setup', null, new ext.Baton({ model: user }))
      return import('@/io.ox/core/tk/wizard').then(({ default: wizard }) => wizard)
    }).then(function (Tour) {
      return Tour.registry.get('firstStartWizard').get('run')()
    }).then(function () {
      settings.set('wizards/firstStart/finished', true).save()
      topbar.show()
      ox.busy()
      def.resolve()
    }).catch(async function () {
      (await import('@/io.ox/core/main')).default.logout()
      def.reject()
    })
    return def
  }
})

export default {
}
