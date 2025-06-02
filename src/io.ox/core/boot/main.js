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
import ext from '@/io.ox/core/extensions'
import Stage from '@/io.ox/core/extPatterns/stage'
import util from '@/io.ox/core/boot/util'
import form from '@/io.ox/core/boot/form'
import config from '@/io.ox/core/boot/config'
import { addDictionary, applyCustomizations } from '@/gettext'
import manifests, { manifestManager } from '@/io.ox/core/manifests'
import { addReadyListener, triggerReady } from '@/io.ox/core/events'
import { updateFavicons } from '@/io.ox/core/theming/util'
import { InvalidConfigurationError } from '@/io.ox/core/boot/rampup'

const synonyms = {
  guest: 'useForm',
  guest_password: 'useForm',
  anonymous_password: 'useForm',
  reset_password: 'useForm',
  message: 'useForm',
  message_continue: 'useForm'
}

const exports = {

  async start (options) {
    performance.mark('boot:start')
    try {
      await config.server()
      await manifests.reload()
      const [i18nPlugins] = await Promise.all([
        manifests.manager.loadPluginsFor('i18n'),
        manifests.manager.loadPluginsFor('login')
      ])
      i18nPlugins
        .filter(({ dictionary }) => !!dictionary)
        .forEach(({ dictionary, gt }) => addDictionary(dictionary, gt))
    } catch (error) {
      console.log(error)
      util.debug('Error while loading config from server', error)
      ox.trigger('server:down', error)
    }
    applyCustomizations()

    options = options || {}
    // use extensions to determine proper login method
    const baton = ext.Baton({ hash: _.url.hash(), logins: this })
    return Stage.run('io.ox/core/boot/login', baton, { methodName: 'login', beginAfter: options.after, softFail: true }).then(function () {
      // a11y: remove meta viewport for desktop
      if (_.device('desktop')) $('meta[name="viewport"]').remove()
    })
  },

  invoke (loginType) {
    // invoke login method
    const type = synonyms[loginType] || loginType
    if (_.isFunction(this[type])) {
      util.debug('Using login type', type)
      return this[type]()
    }
    $('#io-ox-login-container').empty().append(
      $('<div class="alert alert-info">').text('Unknown login type.')
    )
    $('#background-loader').fadeOut(250)
  },
  defaultLogin () {
    if (!Stage.isRunning('io.ox/core/boot/login')) {
      this.start({ after: 'autologin' })
    }
  },
  useForm () {
    // avoid multiple calls
    this.useForm = $.noop

    // forceHTTPS
    if (ox.serverConfig.forceHTTPS && window.location.protocol !== 'https:' && !ox.debug) {
      window.location.href = 'https:' + window.location.href.substring(window.location.protocol.length)
      return
    }

    // set page title now
    ox.on('language', function (lang, dictionaries) {
      ox.trigger('change:document:title', dictionaries['io.ox/core'].pgettext('word', 'Sign in'))
    })

    form()
  },

  propagateSession () {
    if (window.parent) window.parent.postMessage(_.url.hash('session'), window.location.origin)
    if (window.opener) window.opener.postMessage(_.url.hash('session'), window.location.origin)
    util.debug('Propagated session', _.url.hash('session'))
  }
}

//
// Different login types are implemented as extensions
//

ext.point('io.ox/core/boot/login').extend(
  {
    id: 'i18n',
    index: 50,
    async login () {

    }
  },
  {
    id: 'explicit',
    index: 100,
    login (baton) {
      if (baton.hash.login_type !== undefined) {
        baton.stopPropagation()
        baton.logins.invoke(baton.hash.login_type)
      }
    }
  },
  {
    id: 'no-autologin',
    index: 300,
    login (baton) {
      // oidc skips auto-login anyhow
      if (ox.serverConfig?.oidcLogin || baton.hash.autologin === 'false') {
        // disable autologin
        baton.disable('io.ox/core/boot/login', 'autologin')
      }
    }
  },
  {
    id: 'default',
    index: 1000000000000,
    login (baton) {
      baton.logins.useForm()
    },
    relogin () {
      util.gotoSignin('login_type=useForm')
    }
  }
)

//
// Respond to login events
//

ox.once({

  'login:success': async function (data) {
    performance.mark('login:success')

    Stage.abortAll('io.ox/core/boot/login')
    util.debugSession('login process successful')

    $('#background-loader').fadeIn(util.DURATION, function () {
      $('#io-ox-login-screen').hide().empty()
    })

    await manifestManager.loadPluginsFor('rampup')
    let baton = ext.Baton({ sessionData: data })
    util.debug('loaded rampup namespace > running rampup phase')
    try {
      await Stage.run('io.ox/core/boot/rampup', baton, { methodName: 'fetch' })
    } catch (error) {
      if (error instanceof InvalidConfigurationError) {
        ox.trigger('configuration:invalid', error.message)
        return
      } else {
        console.error(error.message)
      }
    }

    ox.rampup = _.clone(baton.data)
    util.debug('finished rampup phase > getting boot/load namespace', ox.rampup)
    triggerReady('rampup', ox.rampup)

    await import('@/io.ox/core/boot/load')

    // create new baton, but share collected data
    baton = ext.Baton(_.extend({}, baton, ox.rampup))
    util.debug('running boot/load phase')
    await Stage.run('io.ox/core/boot/load', baton)
    if (!util.checkTabHandlingSupport()) return
    // do not propagate the received login that all tabs received too to all the tabs again
    if (data && data.tabSessionLogin) return
    const { default: tabAPI } = await import('@/io.ox/core/api/tab')
    util.debugSession('propagateLogin', ox.session)
    tabAPI.propagate('propagateLogin', {
      session: ox.session,
      language: ox.language,
      theme: ox.theme,
      user: ox.user,
      user_id: ox.user_id,
      context_id: ox.context_id,
      exceptWindow: tabAPI.getWindowName(),
      storageKey: tabAPI.DEFAULT_STORAGE_KEYS.SESSION
    })
  },

  'login:fail' () {
    if (!Stage.isRunning('io.ox/core/boot/login')) {
      exports.start({ after: 'autologin' })
    } // Otherwise continue thru the other login stages
  },

  'login:fail:session-based' (baton) {
    baton.stopPropagation()
    if ($('#showstopper').is(':visible')) return
    $('.throbber').hide()
    $('#showstopper, #showstopper .session').show()
  }
})

addReadyListener('capabilities:server', updateFavicons)

export default exports
