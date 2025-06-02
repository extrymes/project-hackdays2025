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

import ox from '@/ox'
import _ from '@/underscore'

export function getAbout (event) {
  const extended = event.altKey || !!event.metaKey || !!event.ctrlKey
  event.preventDefault()
  import('@/io.ox/core/about/about').then(function ({ default: about }) {
    about.show({ extended })
  })
}

export function getHelp () {
  // get active app (ignoring 'help')
  const app = [].concat(ox.ui.App.getCurrentFloatingApp(), ox.ui.App.getCurrentApp())
    .filter(function (app) { return app && app.get('name') !== 'io.ox/help' })
    .shift()

  if (app && app.getContextualHelp) return app.getContextualHelp()

  return _.extend({
    base: 'help',
    target: 'index.html'
  }, app && app.get('help'))
}
