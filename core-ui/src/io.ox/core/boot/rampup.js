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
import $ from '@/jquery'
import http from '@/io.ox/core/http'
import ext from '@/io.ox/core/extensions'
import ox from '@/ox'
import doMultifactor from '@/io.ox/core/boot/multifactor'
import capabilities from '@/io.ox/core/capabilities'
import { manifestManager } from '@/io.ox/core/manifests'
import { triggerReady } from '@/io.ox/core/events'
import { settings as coreSettings } from '@/io.ox/core/settings'

export class InvalidConfigurationError extends Error {}

function loadUserTheme () {
  ox.theme = _.sanitize.option(_.url.hash('theme')) || (coreSettings._loaded && coreSettings.get('theme')) || 'default'
}

// The rampup stages are executed asynchronous with a jQuery.when() in
// `../extPatterns/stage.js`
ext.point('io.ox/core/boot/rampup').extend([{
  id: 'user-theme',
  fetch () {
    // execution starts after jslobs are fetched
    coreSettings.ready(loadUserTheme)
  }
}, {
  id: 'multifactor',
  fetch (baton) {
    if (baton.sessionData && baton.sessionData.requires_multifactor) {
      return doMultifactor()
    }
  }
}, {
  id: 'user config',
  async fetch (baton) {
    const { default: config } = await import('@/io.ox/core/boot/config')
    // need to wait for user data, since it contains capabilities for the user which are needed for manifestmanager
    const { capabilities } = await config.user()
    baton.capabilities = capabilities
  }
}, {
  id: 'http_pause',
  fetch () {
    http.pause()
  }
}, {
  id: 'jslobs',
  async fetch (baton) {
    const modules = await manifestManager.loadPluginsFor('settings')
    baton.jslobs = Promise.all(modules.map(({ settings } = {}) => settings.load().then(() => settings)))
    baton.jslobs.then(() => { triggerReady('settings') })
  }
}, {
  id: 'oauth',
  fetch (baton) {
    if (!capabilities.has('oauth')) return
    const oauth = baton.data.oauth = {}
    http.GET({ module: 'oauth/accounts', params: { action: 'all' } })
      .then(data => { oauth.accounts = data })
    http.GET({ module: 'oauth/services', params: { action: 'all' } })
      .then(data => { oauth.services = data })
    http.GET({ module: 'recovery/secret', params: { action: 'check' } })
      .then(data => { oauth.secretCheck = data })
  }
}, {
  id: 'user',
  fetch (baton) {
    const id = baton.sessionData.user_id
    http.GET({ module: 'user', params: { action: 'get', id } })
      .then(data => { baton.data.user = data })
  }
}, {
  id: 'accounts',
  fetch (baton) {
    http.GET({ module: 'account', params: { action: 'all' } })
      .then(data => { baton.data.accounts = data })
  }
}, {
  id: 'http_resume',
  fetch (baton) {
    return Promise.all([http.resume(), baton.jslobs])
  }
}, {
  id: 'validity',
  async fetch (baton) {
    // we need to check certain settings, user data, capabilities, accounts, default folders
    // also throwing exception from certain stages doesn't work as desired
    // all settings are also available/ready at this point
    // that's why we keep this at a central place
    const invalid = await hasInvalidConfiguration(baton)
    if (invalid) {
      // generate a log entry at UI middleware for debugging purposes
      $.get(`${ox.root}/log/invalidConfiguration/${invalid}/${ox.context_id}/${ox.user_id}`)
      throw new InvalidConfigurationError(invalid)
    }

    async function hasInvalidConfiguration ({ data }) {
      // server config
      if (_.isEmpty(ox.serverConfig)) return 'server-config'
      // capabilities
      if (!capabilities.size()) return 'capabilities'
      // no further checks for guest users
      if (capabilities.has('guest')) return false
      // user data
      if (!data.user?.user_id) return 'user-data'
      // dynamic theming
      if (ox.serverConfig.enforceDynamicTheme) {
        // no capability check!
        const { settings } = await import('@/io.ox/core/theming/dynamic/settings')
        if (!settings.get('mainColor') || !settings.get('logoURL')) return 'dynamic-theme'
      }
      // mail
      if (capabilities.has('webmail')) {
        if (!data.accounts?.length) return 'primary-account'
        const { settings } = await import('@/io.ox/mail/settings')
        if (settings.get('namespace') === undefined) return 'namespace'
        if (_.isEmpty(settings.get('defaultFolder'))) return 'default-mail-folders'
        if (!settings.get('defaultFolder/inbox')) return 'inbox'
      }
      // nothing invalid
      return false
    }
  }
}
])

try {
  // sneak things in during e2e testing
  const puppeteer = sessionStorage?.getItem('puppeteer')
  if (puppeteer) window.puppeteer = JSON.parse(puppeteer)
} catch (e) {
  console.error('Bad JSON in sessionStorage/puppeteer')
}
