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

// cSpell:ignore davmanual, easmanual

import $ from '@/jquery'
import _ from '@/underscore'
import { device } from '@/browser'

import Backbone from '@/backbone'
import ox from '@/ox'
import Wizard from '@/io.ox/core/tk/wizard'
import http from '@/io.ox/core/http'
import views from '@/io.ox/onboarding/views'
import { getCurrentUser } from '@/io.ox/core/api/user'
import { appList, productNames, titles } from '@/io.ox/onboarding/util'
import '@/io.ox/onboarding/style.scss'

import { settings, defaults } from '@/io.ox/onboarding/settings'
import gt from 'gettext'

let config

function getStoreIcon (platform) {
  const languagePrefix = ox.language.slice(0, 2).toUpperCase()
  const country = _.contains(['EN', 'DE', 'ES', 'FR'], languagePrefix) ? languagePrefix : 'EN'
  // settings.get 2nd parameter default values don't work if setting has a / in it
  return (settings.get(platform + '/storeIcon') || defaults[platform]?.storeIcon || '').replace('$country', country)
}

function getOnboardingConfig (actionId) {
  if (!config) {
    config = http.GET({
      module: 'onboarding',
      params: {
        action: 'config'
      }
    })
  }

  return config.then(config => {
    const action = config.actions.find(action => { return action.id === actionId })
    return action && action.data
  })
}

function getMailConfig () {
  const configModel = new Backbone.Model()
  getOnboardingConfig('display/mailmanual').then(data => configModel.set('data', data))
  return configModel
}

function getCalendarConfig () {
  const configModel = new Backbone.Model()
  getOnboardingConfig('display/davmanual').then(data => {
    configModel.set('url', data.caldav_url)
    configModel.set('login', data.caldav_login)
  })
  return configModel
}

function getContactsConfig () {
  const configModel = new Backbone.Model()
  getOnboardingConfig('display/davmanual').then(data => {
    configModel.set('url', data.carddav_url)
    configModel.set('login', data.carddav_login)
  })
  return configModel
}

function getEasConfig () {
  const configModel = new Backbone.Model()
  getOnboardingConfig('display/easmanual').then(data => {
    configModel.set('url', data.eas_url)
    configModel.set('login', data.eas_login)
  })
  return configModel
}

function getManualAppConfig (type) {
  const configModel = new Backbone.Model()
  if (type === 'drive') {
    const login = ox.user || config.userData.get('email1')
    configModel.set({ url: ox.abs, login })
  } else {
    configModel.set({ login: config.userData.get('email1') })
  }
  return configModel
}
// all available setup scenarios
const scenarios = {
  windows: {
    mailsync () {
      return new views.MailSyncView({
        userData: config.userData,
        expanded: true,
        config: getMailConfig()
      })
    },
    addressbook () {
      return new views.SyncView({
        description: gt('To synchronize Address Book, please enter the following settings in your CardDav client:'),
        config: getContactsConfig()
      })
    },
    calendar () {
      return new views.SyncView({
        description: gt('To synchronize Calendar, please enter the following settings in your CalDav client:'),
        config: getCalendarConfig()
      })
    },
    drive () {
      return new views.DownloadView({
        link: settings.get('windows/driveapp/url', defaults.windows.driveapp.url),
        config: getManualAppConfig('drive')
      })
    }
  },
  android: {
    mailsync () {
      return new views.MailSyncView({
        userData: config.userData,
        expanded: true,
        config: getMailConfig()
      })
    },
    mailapp () {
      if (device('android')) {
        return new views.MobileDownloadView({
          app: settings.get('android/mailapp', defaults.android.mailapp),
          title: productNames.mail,
          storeIcon: getStoreIcon('android'),
          iconClass: 'mailapp playstore',
          config: getManualAppConfig('mail')
        })
      }
      return new views.DownloadQrView({
        title: titles.android.mailapp,
        url: settings.get('android/mailapp/url', defaults.android.mailapp.url),
        config: getManualAppConfig('mail'),
        storeIcon: getStoreIcon('android')
      })
    },
    driveapp () {
      if (device('android')) {
        return new views.MobileDownloadView({
          app: settings.get('android/driveapp', defaults.android.driveapp),
          title: productNames.drive,
          storeIcon: getStoreIcon('android'),
          iconClass: 'driveapp playstore',
          config: getManualAppConfig('drive')
        })
      }
      return new views.DownloadQrView({
        title: titles.android.driveapp,
        url: settings.get('android/driveapp/url', defaults.android.driveapp.url),
        config: getManualAppConfig('drive'),
        storeIcon: getStoreIcon('android')
      })
    },
    addressbook () {
      return new views.SyncView({
        description: gt('To synchronize Address Book, please enter the following settings in your CardDav client:'),
        config: getContactsConfig()
      })
    },
    calendar () {
      return new views.SyncView({
        description: gt('To synchronize Calendar, please enter the following settings in your CalDav client:'),
        config: getCalendarConfig()
      })
    },
    eassync () {
      return new views.SyncView({
        description: gt('To synchronize Mail, Calendar and Address Book via Exchange Active Sync, please enter the following settings:'),
        config: getEasConfig()
      })
    },
    syncapp () {
      if (device('android')) {
        return new views.MobileDownloadView({
          app: settings.get('android/syncapp', defaults.android.syncapp),
          title: titles.android.syncapp,
          storeIcon: getStoreIcon('android'),
          iconClass: 'syncapp playstore',
          config: getManualAppConfig('mail')
        })
      }
      return new views.DownloadQrView({
        title: titles.android.syncapp,
        url: settings.get('android/syncapp/url', defaults.android.syncapp.url),
        config: getManualAppConfig('mail'),
        storeIcon: getStoreIcon('android')
      })
    }
  },
  macos: {
    mailCalendarAddressbook () {
      return new views.DownloadConfigView({
        type: 'mail,caldav,carddav'
      })
    },
    mailsync () {
      return new views.DownloadConfigView({
        type: 'mail',
        config: getMailConfig()
      })
    },
    addressbook () {
      return new views.DownloadConfigView({
        type: 'carddav',
        config: getContactsConfig()
      })
    },
    calendar () {
      return new views.DownloadConfigView({
        type: 'caldav',
        config: getCalendarConfig()
      })
    },
    drive () {
      return new views.DownloadQrView({
        title: titles.macos.drive,
        url: settings.get('macos/driveapp/url', defaults.macos.driveapp.url),
        config: getManualAppConfig('drive'),
        storeIcon: getStoreIcon('macos'),
        iconClass: 'driveapp macappstore',
        appIcon: settings.get('macos/driveapp/icon', defaults.macos.driveapp.icon),
        showQR: false
      })
    }
  },
  ios: {
    mailCalendarAddressbook () {
      if (device('ios')) {
        return new views.DownloadConfigView({
          type: 'mail,caldav,carddav',
          userData: config.userData
        })
      }
      return new views.DownloadQrView({
        type: 'mail,caldav,carddav',
        title: titles.ios.combined,
        description: gt('Please scan this code with your phone\'s camera:')
      })
    },
    mailsync () {
      if (device('ios')) {
        return new views.DownloadConfigView({
          type: 'mail',
          userData: config.userData,
          config: getMailConfig()
        })
      }
      return new views.DownloadQrView({
        type: 'mail',
        title: titles.ios.mailsync,
        description: gt('Please scan this code with your phone\'s camera:'),
        config: getMailConfig()
      })
    },
    mailapp () {
      if (device('ios')) {
        return new views.MobileDownloadView({
          app: settings.get('ios/mailapp', defaults.ios.mailapp),
          title: productNames.mail,
          storeIcon: getStoreIcon('ios'),
          iconClass: 'mailapp appstore',
          config: getManualAppConfig('mail')
        })
      }
      return new views.DownloadQrView({
        title: titles.ios.mailapp,
        url: settings.get('ios/mailapp/url', defaults.ios.mailapp.url),
        config: getManualAppConfig('mail'),
        storeIcon: getStoreIcon('ios')
      })
    },
    driveapp () {
      if (device('ios')) {
        return new views.MobileDownloadView({
          app: settings.get('ios/driveapp', defaults.ios.driveapp),
          title: productNames.drive,
          storeIcon: getStoreIcon('ios'),
          iconClass: 'driveapp appstore',
          config: getManualAppConfig('drive')
        })
      }
      return new views.DownloadQrView({
        title: titles.ios.driveapp,
        url: settings.get('ios/driveapp/url', defaults.ios.driveapp.url),
        config: getManualAppConfig('drive'),
        storeIcon: getStoreIcon('ios')
      })
    },
    eassync () {
      if (device('ios')) {
        return new views.DownloadConfigView({
          type: 'eas',
          config: getEasConfig()
        })
      }
      return new views.DownloadQrView({
        description: gt('Scan this code with your phone\'s camera to synchronize your Mail, Calendar and Address Book via Exchange Active Sync:'),
        type: 'eas',
        config: getEasConfig()
      })
    },
    addressbook () {
      if (device('ios')) {
        return new views.DownloadConfigView({
          type: 'carddav',
          config: getContactsConfig()
        })
      }
      return new views.DownloadQrView({ title: titles.ios.addressbook, type: 'carddav', config: getContactsConfig() })
    },
    calendar () {
      if (device('ios')) {
        return new views.DownloadConfigView({
          type: 'caldav',
          config: getCalendarConfig()
        })
      }
      return new views.DownloadQrView({ title: titles.ios.calendar, type: 'caldav', config: getCalendarConfig() })
    }
  }
}

function drawScaffold () {
  this.$('div[role="document"]').addClass('connect-wizard')
  this.$('.wizard-title').text(gt('Connect your device'))
  this.$('.wizard-footer').empty().append(
    $('<button type="button" class="btn btn-default" data-action="close">').text(gt('Close')),
    this.parent.currentStep === 0 ? '' : $('<button type="button" class="btn btn-default" data-action="back">').text(gt('Back'))
  )
}

const wizard = {
  run () {
    const options = {
      id: 'connect-wizard',
      title: gt('Connect your device')
    }

    const lastFocusedElements = {}

    function storeFocus (change) {
      const id = Object.keys(change)[0]
      if (change[id]) lastFocusedElements[id] = change[id]
    }

    function restoreFocus () {
      if (!this.id || !lastFocusedElements[this.id]) focusFirstButton.call(this)
      this.$el.find(`button[data-${this.id}="${lastFocusedElements[this.id]}"]`).focus()
      if (this.id === 'platform') delete lastFocusedElements.app
    }

    function focusFirstButton () {
      this.$('.content-container').find('button:not(:disabled):visible:first').focus()
    }

    if (!Wizard.registry.get('connect-wizard')) {
      Wizard.registry.add(options, function addToWizardRegistry () {
        let connectWizard = new Wizard({ disableMobileSupport: true })
        let platform

        // set platform if mobile device detected
        if (device('ios && smartphone')) {
          platform = 'ios'
        } else if (device('android && smartphone')) {
          platform = 'android'
        } else {
          platform = undefined
        }

        // setup model and views
        connectWizard.userData = {}
        connectWizard.model = new Backbone.Model({ app: undefined, platform })
        connectWizard.platformsView = new views.PlatformView({ model: connectWizard.model })
        connectWizard.appsView = new views.AppView({ model: connectWizard.model })
        connectWizard.progressView = new views.ProgressionView(connectWizard)

        // ensure that everything is reset on close
        connectWizard.on('stop', function onStop () {
          connectWizard.model = null
          connectWizard.platformsView.remove()
          connectWizard.platformsView = null
          connectWizard.appsView.remove()
          connectWizard.appsView = null
          connectWizard.progressView.remove()
          connectWizard.progressView = null
          connectWizard = null
        })
        connectWizard.on('reset', function onReset () {
          connectWizard.model.set({ app: undefined, platform })
          connectWizard.shift(0 - connectWizard.currentStep)
        })
        connectWizard.appsView.render()
        connectWizard.progressView.render()

        // listen for upsell
        connectWizard.model.once('scenario:upsell', function onSelectUpsell (target) {
          import('@/io.ox/core/upsell').then(({ default: upsell }) => {
            const app = appList.find(app => {
              return app.get('platform') === connectWizard.model.get('platform') && app.get('app') === target.attr('data-app')
            })

            if (!app) return

            const missing = app.get('cap')
            if (upsell.has(missing.replace(/,/g, ' '))) return
            // closes wizard
            if (connectWizard) connectWizard.trigger('step:close')
            upsell.trigger({
              type: 'custom',
              id: target.attr('data-app'),
              missing
            })
          })
        })

        // don't start with platforms view on mobile
        if (!device('smartphone')) {
          connectWizard.platformsView.render()

          connectWizard.step({
            id: 'platform',
            back: false,
            next: false,
            focusWatcher: false,
            disableMobileSupport: true
          })
            .on('before:show', function onBeforeShow () {
              // draw list of available platforms
              drawScaffold.call(this)
              this.$('.wizard-content').append(
                connectWizard.progressView.$el,
                connectWizard.platformsView.$el
              )
              // trigger next step only once
              connectWizard.model.once('change', function onChangeOnce (model) {
                storeFocus(model.changed)
                if (!model.get('platform')) return
                connectWizard.next()
              })
            })
            .on('show', function onShow () { restoreFocus.call(this) })
            .end()
        }
        connectWizard.step({
          id: 'app',
          back: false,
          next: false,
          focusWatcher: false,
          disableMobileSupport: true
        })
          .on('before:show', function onBeforeShow () {
            // draw list of apps for chosen platform
            drawScaffold.call(this)
            this.$('.wizard-content').append(
              connectWizard.progressView.$el,
              connectWizard.appsView.$el
            )

            // trigger next step only once
            connectWizard.model.once('change', function onChangeOnce (model) {
              storeFocus(model.changed)
              if (!model.get('app') && !model.get('platform')) return
              connectWizard.next()
            })
          })
          .on('show', function onShow () { restoreFocus.call(this) })
          .on('back', function onBack () { connectWizard.model.set('platform', undefined) })
          .end()
          .step({
            id: 'setup',
            back: false,
            next: false,
            focusWatcher: false,
            disableMobileSupport: true
          })
          .on('before:show', function onBeforeShow () {
            const self = this
            // draw scenario for chosen app and platform
            drawScaffold.call(this)
            const view = scenarios[connectWizard.model.get('platform')][connectWizard.model.get('app')]()
            view.render()
            self.$('.wizard-content').empty().append(
              connectWizard.progressView.$el,
              view.$el)
          })
          .on('show', function onShow () { restoreFocus.call(this) })
          .on('back', function onBack () { connectWizard.model.set('app', undefined) })
          .end()
        connectWizard.start()
        window.connectWizard = connectWizard
      })
    }
    Wizard.registry.run('connect-wizard')
  },
  load () {
    settings.load()
    getOnboardingConfig()
    getCurrentUser().then(model => {
      config.userData = model
      wizard.run()
    })
  }
}
export default wizard
