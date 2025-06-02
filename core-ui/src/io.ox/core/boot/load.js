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
import ox from '@/ox'

import { changeLanguage } from '@/gettext'
import ext from '@/io.ox/core/extensions'
import util from '@/io.ox/core/boot/util'
import session from '@/io.ox/core/session'
import http from '@/io.ox/core/http'
import capabilities from '@/io.ox/core/capabilities'
import manifests from '@/io.ox/core/manifests'
import socket from '@/io.ox/core/sockets'
import locale from '@/io.ox/core/locale'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import moment from '@/io.ox/core/moment'
import { triggerReady } from '@/io.ox/core/events'
import { hasFeature } from '@/io.ox/core/feature'

ext.point('io.ox/core/boot/load').extend([{
  id: 'i18n',
  async run (baton) {
    const language = locale.deriveSupportedLanguageFromLocale((baton && baton.sessionData && baton.sessionData.language) || ox.locale)
    // apply session data (again) & page title
    if (baton.sessionData) session.set(baton.sessionData)
    ox.trigger('change:document:title')
    // load UI
    util.debug('Load UI > load i18n plugins and set current locale', ox.locale)

    // sign in phase is over (important for gettext)
    ox.signin = false

    // we have to clear the device function cache or there might be invalid return values, like for example wrong locale data (see Bug 51405).
    _.device.cache = {}
    // make sure we have loaded precore.js now
    ox.language = language
    await changeLanguage(language)
    triggerReady('i18n')
    util.debug('Load UI > current locale and i18n plugins DONE.')
  }
}, {
  id: 'url.key',
  run () {
    let key = mailSettings.get('url.key')
    if (!key) {
      // look for old key as cookie (pre 8.11) or create a new one
      key = _.getCookie('url.key') || _.url.hash.generateKey()
      mailSettings.set('url.key', key).save()
    }
    _.url.hash.setObfuscationKey(key)
  }
}, {
  id: 'locale',
  run () {
    // run after language is set
    // return require(['io.ox/core/locale'])
  }
}, {
  id: 'warnings',
  run () {
    // don't block
    import('@/io.ox/core/boot/warning').then(() => ext.point('io.ox/core/boot/warning').invoke('draw'))
  }
}, {
  id: 'tabHandling',
  async run () {
    util.debug('Load "tabHandling"')

    const { default: tabAPI } = await import('@/io.ox/core/api/tab')
    if (!util.checkTabHandlingSupport()) { return tabAPI.disable() }
    if (capabilities.has('guest')) { return tabAPI.enableGuestMode() }
    return tabAPI.enable()
  }
}, {
  id: 'compositionSpaces',
  run () {
    // guests don't have webmail for example
    if (!capabilities.has('webmail')) return
    ox.ui.spaces = ox.ui.spaces || {}
    ox.ui.spacedata = ox.ui.spacedata || {}

    // handling edit draft with active space
    $.when(
      http.GET({ url: 'api/mail/compose', params: { action: 'all', columns: 'subject,meta,security' } }),
      import('@/io.ox/mail/compose/api')
    ).then(function (data, { default: composeAPI }) {
      const list = _(data).first() || []
      composeAPI.space.process(list)
      for (const space of list) {
        const { id, meta, security } = space
        ox.ui.spacedata[space.id] = { id, meta, security }
      }
    }).catch(function (e) {
      // add a catch such that the boot process is not stopped due to errors
      if (ox.debug) console.error(e)
    })
  }
}, {
  id: 'load',
  run () {
    util.restore()

    // remove unnecessary stuff
    util.cleanUp()
    prefetch()
    setupSockets()
    // "core" namespace has now a very similar timing to "io.ox/core/main" namespace
    // the only difference is, "core" plugins are loaded completely before
    // "io.ox/core/main" plugins
    const loadCore = manifests.manager.loadPluginsFor('core').catch(function (error) {
      console.error('Could not load plugins for namespace "core".', error)
    }).then(async function () {
      const [core] = await Promise.all([
        import('@/io.ox/core/main'),
        manifests.manager.loadPluginsFor('io.ox/core/main').catch(error => {
          console.error('Could not load plugins for namespace "io.ox/core/main".', error)
        })
      ])
      return core
    })
    return loadCore.then(function success ({ default: core }) {
      performance.mark('boot:end')
      util.debug('DONE!')
      ox.trigger('boot:done')

      // clear password (now); if cleared or set to "******" too early,
      // Chrome won't store anything or use that dummy value (see bug 36950)
      $('#io-ox-login-password').val('')
      // final step: launch
      core.launch()
    }).catch(function fail (e) {
      console.error('Cannot launch core!', e)
      ox.trigger('boot:fail')

      // clear the caches in a case of error as it might contain corrupted data
      ;(async () => {
        try {
          const keys = await self.caches.keys()
          await Promise.allSettled(keys.map(key => key !== 'log' && caches.delete(key)))
        } finally {
          ox.trigger('server:down')
        }
      })()
    })
  }
}])

// greedy prefetch for mail app
// we need to get the default all/threadedAll request out as soon as possible
async function prefetch () {
  if (!capabilities.has('webmail')) return

  const columns = http.defaultColumns.mail
  await mailSettings.ensureData()
  // always extend columns (we can do that now and if we start with mail with need this)
  // avoid any unnecessary and potentially slow columns (https://jira.open-xchange.com/browse/DOP-2955)
  if (mailSettings.get('features/textPreview', true)) {
    columns.all += ',662'
    columns.unseen += ',662'
    columns.search += ',662'
    columns.flagged += ',662'
  }

  // don't add authenticity_preview column here as it is potentially slow, too (see  https://jira.open-xchange.com/browse/OXUIB-2009)
  /*
  if (mailSettings.get('features/authenticity', false)) {
    // we don't add 664 for search
    columns.unseen += ',664'
    columns.all += ',664'
    columns.flagged += ',664'
  }
  */

  // upper adjustments must be done also if prefetchOnBoot in not needed
  if (!mailSettings.get('features/prefetchOnBoot', true)) return

  const folder = 'default0/INBOX'
  const sort = mailSettings.get(['viewOptions', folder, 'sort'], 661)

  // edge case: no prefetch if sorting is 'from-to' (need too many settings we don't have yet)
  if (sort === 'from-to') return

  const thread = mailSettings.get('threadSupport', true) ? mailSettings.get(['viewOptions', folder, 'thread'], true) : false
  const action = thread ? 'threadedAll' : 'all'
  const params = {
    action,
    folder,
    categoryid: 'general',
    columns: columns.all,
    sort,
    order: mailSettings.get(['viewOptions', folder, 'order'], 'desc'),
    includeSent: true,
    max: 300,
    timezone: 'utc',
    limit: '0,' + mailSettings.get('listview/primaryPageSize', 50),
    deleted: !mailSettings.get('features/ignoreDeleted', false)
  }

  // mail categories (aka tabbed inbox)
  if (_.device('smartphone') || !capabilities.has('mail_categories') || !mailSettings.get('categories/enabled')) {
    delete params.categoryid
  }

  if (!thread) {
    // delete instead of adding to maintain proper order of parameters
    delete params.includeSent
    delete params.max
  }

  http.GET({ module: 'mail', params }).done(function (data) {
    // the collection loader will check ox.rampup for this data
    ox.rampup['mail/' + _.cacheKey(params)] = data
  })
}

function setupSockets () {
  // get connected socket
  if (hasFeature('pns')) return
  socket.getSocket().done(function (socket) {
    if (capabilities.has('webmail')) {
      socket.on('ox:mail:new', function (data) {
        // simple event forwarding
        // don't log sensitive data here (data object)
        try {
          ox.websocketlog.push({
            timestamp: _.now(),
            date: moment().format('D.M.Y HH:mm:ss'),
            event: 'ox:mail:new',
            data: { folder: data.folder, id: data.id },
            via: 'middleware'
          })
        } catch (e) {
          console.log(e)
        }
        ox.trigger('socket:mail:new', data)
      })
    }

    if (capabilities.has('calendar')) {
      // only call update by push max every 10s, to reduce load
      let throttleCache = []
      const sendUpdateEvent = _.throttle(function () {
        const data = {
          folders: _(throttleCache).chain().pluck('folders').flatten().compact().unique().value(),
          invitations: _(throttleCache).chain().pluck('needsAction').flatten().compact().unique(function (event) {
            return event.id + '.' + event.folder + '.' + event.recurrenceId
          }).value()
        }
        ox.trigger('socket:calendar:updates', data)
        throttleCache = []
      }, 10000)

      socket.on('ox:calendar:updates', function (data) {
        // simple event forwarding
        // don't log sensitive data here (data object)
        try {
          ox.websocketlog.push({
            timestamp: _.now(),
            date: moment().format('D.M.Y HH:mm:ss'),
            event: 'ox:calendar:updates',
            data: { folders: data.folders, invitations: data.needsAction },
            via: 'middleware'
          })
        } catch (e) {
          console.log(e)
        }
        throttleCache.push(data)
        sendUpdateEvent()
      })
    }
  })
}
