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
import ox from '@/ox'
import session from '@/io.ox/core/session'
import ext from '@/io.ox/core/extensions'
import Stage from '@/io.ox/core/extPatterns/stage'
import capabilities from '@/io.ox/core/capabilities'
import HelpLinkView from '@/io.ox/backbone/mini-views/helplink'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import logout from '@/io.ox/core/main/logout'
import refresh from '@/io.ox/core/main/refresh'
import addLauncher from '@/io.ox/core/main/addLauncher'
import contactAPI from '@/io.ox/contacts/api'
import userAPI from '@/io.ox/core/api/user'
import upsell from '@/io.ox/core/upsell'
import '@/io.ox/core/theming/main'
import * as helpUtil from '@/io.ox/help/util'
import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { createButton, createIcon } from '@/io.ox/core/components'
import { initNotifications, controller as notificationAreaController } from '@/io.ox/core/notifications/main'
import openSettings from '@/io.ox/settings/util'
import { UserView } from '@/io.ox/core/main/userView'
import { changePassword } from '@/io.ox/settings/security/change-password'
import { invoke } from '@/io.ox/backbone/views/actions/util'

const extensions = {
  about () {
    this.link('about', gt('About'), event => helpUtil.getAbout(event))
  }
}

ext.point('io.ox/core/appcontrol/right').extend({
  id: 'upsell',
  index: 50,
  draw () {
    if (_.device('smartphone')) return

    const setting = settings.get('features/upsell/secondary-launcher', {})
    const newSetting = settings.get('features/upsell/upgrade-button', {})
    if (!setting.enabled && !newSetting.enabled) return
    const requires = newSetting.requires || setting.requires || 'active_sync || caldav || carddav'
    if (upsell.has(requires)) return
    if (!upsell.enabled(requires)) return
    this.append(
      $('<li class="launcher ms-16 me-16" role="presentation">').append(
        createButton({ variant: 'default btn-outline', text: gt('Upgrade') })
          .on('click', { requires }, function (e) {
            e.preventDefault()
            upsell.trigger({ type: 'custom', id: 'upgrade-button', missing: upsell.missing(e.data.requires) })
          })
      )
    )
  }
})

ext.point('io.ox/core/appcontrol/right').extend({
  id: 'notifications',
  index: 100,
  async draw () {
    this.append($('<li id="io-ox-notifications-toggle" role="presentation">'))
    initNotifications()
  }
})

ext.point('io.ox/core/appcontrol/right').extend({
  id: 'refresh-mobile',
  index: 200,
  draw () {
    if (_.device('smartphone')) return

    const node = createIcon('bi/arrow-repeat.svg')

    this.append(
      addLauncher(
        'right',
        node,
        function () {
          refresh()
          return $.when()
        },
        gt('Refresh')
      ).attr('id', 'io-ox-refresh-icon')
    )

    function setLabel () {
      const minutes = parseInt(settings.get('refreshInterval', 300000), 10) / 60000
      return node.attr('title', gt('Refresh. Current interval (%1$s min) can be customized in settings.', minutes))
    }

    setLabel()
    settings.on('change:refreshInterval', setLabel)
  }
})

ext.point('io.ox/core/appcontrol/right').extend({
  id: 'help-dropdown',
  index: 300,
  draw () {
    if (_.device('smartphone')) return

    // single item (no dropdown)
    if (ext.point('io.ox/core/appcontrol/right/help').list().length <= 1) {
      const helpView = new HelpLinkView({ href: helpUtil.getHelp })
      if (helpView.$el.hasClass('hidden')) return
      return this.append(
        addLauncher('right', helpView.render().$el.addClass('launcher-icon').attr('tabindex', -1)).attr('id', 'io-ox-context-help-icon')
      )
    }

    // multiple items
    const ul = $('<ul id="topbar-help-dropdown" class="dropdown-menu dropdown-menu-right" role="menu">')
    const $toggle = createButton({ variant: 'toolbar', icon: { name: 'bi/question-circle.svg', className: 'launcher-icon', title: gt('Help') } })
      .addClass('btn-topbar dropdown-toggle f6-target')
      .attr({ 'data-toggle': 'dropdown', tabindex: -1 })
    const dropdown = new Dropdown({
      // have a simple model to track changes (e.g. availability)
      model: new Backbone.Model({}),
      attributes: { role: 'presentation' },
      tagName: 'li',
      id: 'io-ox-topbar-help-dropdown-icon',
      className: 'launcher dropdown',
      $ul: ul,
      $toggle
    })

    ext.point('io.ox/core/appcontrol/right/help').invoke('extend', dropdown)
    this.append(dropdown.render().$el.find('a').attr('tabindex', -1).end())
  }
})

ext.point('io.ox/core/appcontrol/right/help').extend({
  id: 'help',
  index: 100,
  extend () {
    const helpView = new HelpLinkView({
      attributes: {
        role: 'menuitem',
        tabindex: -1
      },
      content: gt('Help'),
      href: helpUtil.getHelp
    })

    // in case of disabled 'showHelpLinks' feature
    if (helpView.$el.hasClass('hidden')) return

    this.append(helpView.render().$el)
  }
})

ext.point('io.ox/core/appcontrol/right/help').extend({
  id: 'shortcuts',
  index: 110,
  extend: function () {
    this.link('shortcuts', gt('Keyboard shortcuts'), () => {
      invoke('io.ox/shortcuts/actions/showHelp')
    })
  }
})

// 'feedback' index 150

ext.point('io.ox/core/appcontrol/right/help').extend({
  id: 'divider-first',
  index: 200,
  extend () {
    this.divider()
  }
})

// 'intro-tour'  index 210
// 'get-started' index 250

ext.point('io.ox/core/appcontrol/right/help').extend({
  id: 'divider-second',
  index: 300,
  extend () {
    this.divider()
  }
})

ext.point('io.ox/core/appcontrol/right/help').extend({
  id: 'about',
  index: 400,
  extend () {
    extensions.about.apply(this, arguments)
  }
})

ext.point('io.ox/core/appcontrol/right').extend({
  id: 'settings-dropdown',
  index: 400,
  draw () {
    if (_.device('smartphone')) return

    const $ul = $('<ul id="topbar-settings-dropdown" class="dropdown-menu dropdown-menu-right" role="menu">')
    const $toggle = createButton({
      variant: 'toolbar',
      tabindex: -1,
      icon: {
        name: 'bi/gear.svg',
        title: gt('Settings')
      }
    })
      .addClass('btn-topbar dropdown-toggle f6-target')
      .attr('data-toggle', 'dropdown')

    const dropdown = new Dropdown({
      // have a simple model to track changes (e.g. availability)
      model: new Backbone.Model({}),
      attributes: { role: 'presentation' },
      tagName: 'li',
      id: 'io-ox-topbar-settings-dropdown-icon',
      className: 'launcher dropdown',
      $ul,
      $toggle
    })

    // ext.point('io.ox/core/appcontrol/right/settings').invoke('extend', dropdown)
    this.append(dropdown.render().$el.find('a').attr('tabindex', -1).end())

    dropdown.on('open', function () {
      const app = ox.ui.App.getCurrentApp()
      const appId = app ? app.get('id') : undefined
      this.$ul.empty()
      this.model = app ? app.props : this.model
      ext.point('io.ox/topbar/settings-dropdown').invoke('render', this, ext.Baton({ app, appId }))
    })
  }
})

ext.point('io.ox/topbar/settings-dropdown').extend(
  {
    id: 'onboarding',
    index: 5000,
    render () {
      if (!capabilities.has('client-onboarding')) return
      if (!settings.get('onboardingWizard', true)) return
      this.link('onboarding', gt('Connect your device') + ' ...', async function () {
        const { default: onboardingWizard } = await import('@/io.ox/onboarding/main')
        onboardingWizard.load()
      })
    }
  },
  {
    id: 'connect-device-divider',
    index: 6000,
    render (baton) {
      this.divider()
    }
  },
  {
    id: 'final-divider',
    index: 20,
    render () {
      this.divider()
    }
  },
  {
    id: 'settings',
    index: 10,
    render (baton) {
      const folder = baton.appId && `virtual/settings/${baton.appId}`
      this.link('settings-app', gt('All settings') + ' ...', () => openSettings(folder))
    }
  }
)

ext.point('io.ox/core/appcontrol/right/account').extend({
  id: 'user',
  index: 5,
  extend () {
    if (settings.get('user/internalUserEdit', true) === false) return
    if (capabilities.has('guest')) return

    this.$ul.append(new UserView().render().$el)
    this.divider()
  }
}, {
  id: 'change-user-data',
  index: 150,
  extend () {
    // check if users can edit their own data (see bug 34617)
    if (settings.get('user/internalUserEdit', true) === false) return

    this.link('my-contact-data', gt('Edit personal data'), function (e) {
      e.preventDefault()
      import('@/io.ox/core/settings/user').then(function ({ default: userSettings }) {
        userSettings.openModalDialog()
      })
    })
  }
}, {
  id: 'change-user-password',
  index: 175,
  extend () {
    if (!capabilities.has('edit_password && guest')) return

    const linkText = function (empty) { return empty ? gt('Add login password') : gt('Change login password') }

    this.link('change-password',
      linkText(settings.get('password/emptyCurrent')),
      function (e) {
        e.preventDefault()
        changePassword()
      })

    this.listenTo(settings, 'change:password/emptyCurrent', function (value) {
      this.$el.find('[data-name="change-password"]')
        .text(linkText(value))
    }.bind(this))
  }
}, {
  id: 'logout',
  index: 1000,
  extend () {
    // Group available signout calls here, including appsuite, Guard, etc
    ext.point('io.ox/core/appcontrol/right/account/signouts').invoke('extend', this)
  }
})

ext.point('io.ox/core/appcontrol/right/account/signouts').extend({
  id: 'logout',
  index: 100,
  extend () {
    this.link('logout', gt('Sign out'), function (e) {
      e.preventDefault()
      logout({ manualLogout: true })
    })
  }
})

ext.point('io.ox/core/appcontrol/right').extend({
  id: 'account',
  index: 2000,
  draw () {
    if (_.device('smartphone')) return
    const title = ox.openedInBrowserTab
      ? gt('Sign out')
    // #. tooltip of dropdown menu in topbar (contact image icon)
      : gt('My account')
    const ul = $('<ul id="topbar-account-dropdown" class="dropdown-menu dropdown-menu-right" role="menu">')
    const $toggle = $('<button type="button" class="btn btn-toolbar btn-topbar dropdown-toggle f6-target" data-toggle="dropdown" tabindex="-1">').attr('aria-label', title)
    const dropdown = new Dropdown({
      // have a simple model to track changes (e.g. availability)
      model: new Backbone.Model({}),
      attributes: { role: 'presentation' },
      tagName: 'li',
      id: 'io-ox-topbar-account-dropdown-icon',
      className: 'launcher dropdown',
      $ul: ul,
      $toggle
    })

    updatePicture()
    ext.point('io.ox/core/appcontrol/right/account').invoke('extend', dropdown)
    this.append(dropdown.render().$el.find('a').attr('tabindex', -1).on('click', () => notificationAreaController.trigger('hide')).end())

    // via global address book
    contactAPI.on('reset:image update:image', updatePicture)
    // via my contact data
    userAPI.on('reset:image:' + ox.user_id + ' update:image:' + ox.user_id, updatePicture)
    userAPI.on('update', updatePicture)

    function updatePicture () {
      $toggle.empty().append(
        contactAPI.pictureHalo(
          $('<div class="contact-picture" aria-hidden="true">').attr('title', title)
            .append(userAPI.getTextNode(ox.user_id, { type: 'initials', textZoom: false })),
          { internal_userid: ox.user_id },
          { width: 40, height: 40, fallback: false }
        )
      )
    }
  }
})

const dedicatedLogoutButton = settings.get('features/dedicatedLogoutButton', false) === true && _.device('!small')
if (dedicatedLogoutButton) {
  ext.point('io.ox/core/appcontrol/right').extend({
    id: 'logout-button',
    index: 1000,
    draw () {
      const logoutButton = addLauncher('right', createIcon('bi/box-arrow-right.svg').addClass('launcher-icon'), function () {
        logout({ manualLogout: true })
      }, gt('Sign out'))
      logoutButton.find('a')
        .attr('data-action', 'sign-out')
        .tooltip({
          title: gt('Sign out'),
          placement (tip, el) {
            return ($(window).width() - $(el).offset().left - el.offsetWidth) < 80 ? 'left' : 'auto'
          }
        })
      this.append(logoutButton)
    }
  })
}

// TODO: APPCONTROL

(function logoutHint () {
  const data = _.clone(settings.get('features/logoutButtonHint', {}))

  if (!data.enabled) return

  ext.point('io.ox/core/appcontrol/right').extend({
    id: 'logout-button-hint',
    index: 2100,
    draw () {
      settings.set('features/logoutButtonHint/active', true).save()
      // exit: first start with enabled feature
      if (!_.isBoolean(data.active)) return
      // exit: logged out successfully
      if (!data.active) return
      // exit: tab reload with autologin
      if (_.device('reload') && session.isAutoLogin()) return

      // topbar action, dropdown action
      const link = this.find('[data-action="sign-out"], #io-ox-topbar-account-dropdown-icon > a').first()
      // popover
      link.popover({
        // language; not locale
        content: data[ox.language] || gt('You forgot to sign out last time. Always use the sign-out button when you finished your work.'),
        template: '<div class="popover popover-signout" role="tooltip"><div class="arrow"></div><div class="popover-content popover-content-signout"></div></div>',
        placement: 'bottom',
        container: 'body'
      })
      // prevent logout action when clicking hint
      this.get(0).addEventListener('click', function (e) {
        if (e.target.classList.contains('popover-content-signout')) e.stopImmediatePropagation()
        link.popover('destroy')
      }, true)
      // close on click
      $(document).one('click', link.popover.bind(link, 'destroy'))
      // show
      _.defer(link.popover.bind(link, 'show'))
    }
  })
})()

// eslint-disable-next-line no-new
new Stage('io.ox/core/stages', {
  id: 'client-onboarding-hint',
  index: 3000,
  run (baton) {
    if (capabilities.has('!client-onboarding')) return
    if (!_.device('smartphone')) return
    // exit: tab reload with autologin
    if (_.device('reload') && session.isAutoLogin()) return

    const conf = _.extend({ enabled: true, remaining: 2 }, settings.get('features/clientOnboardingHint', {}))
    // server prop
    if (!conf.enabled || !conf.remaining) return
    baton.data.popups.push({ name: 'client-onboarding-hint' })

    // banner action, topbar action, dropdown action
    const link = $('#io-ox-appcontrol #io-ox-topbar-account-dropdown-icon > a')
    // popover
    link.popover({
      // #. %1$s is the product name
      // #, c-format
      content: gt("Did you know that you can take %1$s with you? Just click this icon and choose 'Connect your device' from the menu.", ox.serverConfig.productName),
      template: '<div class="popover popover-onboarding" role="tooltip"><div class="arrow"></div><div class="popover-content popover-content-onboarding"></div></div>',
      placement: 'bottom',
      container: 'body'
    })
    // show
    _.defer(link.popover.bind(link, 'show'))
    // close on any click
    document.body.addEventListener('click', close, true)
    function close () {
      settings.set('features/clientOnboardingHint/remaining', Math.max(0, conf.remaining - 1)).save()
      link.popover('destroy')
      document.body.removeEventListener('click', close, true)
    }
  }
})
