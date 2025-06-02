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

import _ from '@/underscore'
import ox from '@/ox'

const hash = {
  'mail-compose': () => {
    console.error('Using registry with mail-compose was removed. Switch to "io.ox/mail/compose"!')
    return Promise.resolve()
  },
  'client-onboarding': () => {
    console.error('Using registry with client-onboarding was removed. Switch to "io.ox/onboarding/main"!')
  },
  'io.ox/mail/compose': () => import('@/io.ox/mail/compose/main.js'),
  'io.ox/calendar/edit': () => import('@/io.ox/calendar/edit/main.js'),
  'io.ox/calendar/freetime': () => import('@/io.ox/calendar/freetime/main.js'),
  'io.ox/contacts/distrib': () => import('@/io.ox/contacts/distrib/main.js'),
  'io.ox/contacts/edit': () => import('@/io.ox/contacts/edit/main.js'),
  'io.ox/editor': () => import('@/io.ox/editor/main.js'),
  'io.ox/tasks/edit': () => import('@/io.ox/tasks/edit/main.js'),
  'io.ox/onboarding/clients/wizard': () => import('@/io.ox/onboarding/clients/wizard.js')
}

const custom = {}

export default {
  set (id, path) {
    custom[id] = path
  },
  get (id) {
    return custom[id] || hash[id]
  },
  call (id, name) {
    const args = _(arguments).toArray().slice(2)
    return ox.load(this.get(id)).then(function ({ default: m }) {
      // non-apps
      if (m.run && _.isFunction(m.run)) return m.run.apply(m, args)
      if (!m.reuse || !m.getApp) return
      // app
      if (m.reuse(name, args[0])) return
      const app = m.getApp()
      return app.launch().then(function () {
        if (!_.isFunction(app[name])) return
        return app[name].apply(this, args)
      })
    })
  }
}
