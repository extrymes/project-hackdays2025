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
import http from '@/io.ox/core/http'
import upsell from '@/io.ox/core/upsell'
import capabilities from '@/io.ox/core/capabilities'
import ext from '@/io.ox/core/extensions'
import icons from '@/io.ox/core/main/icons'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import '@/io.ox/core/main/autologout'
import apps from '@/io.ox/core/api/apps'
import theming from '@/io.ox/core/theming/main'
import logout from '@/io.ox/core/main/logout'
import * as helpUtil from '@/io.ox/help/util'
import { settings } from '@/io.ox/core/settings'
import { createIcon } from '@/io.ox/core/components'
import { controller as notificationAreaController } from '@/io.ox/core/notifications/main'
import tabApi from '@/io.ox/core/api/tab'
import gt from 'gettext'
import openSettings from '@/io.ox/settings/util'
import { UserView } from '@/io.ox/core/main/userView'

function toggleOverlay (force) {
  $('#io-ox-appcontrol').toggleClass('open', force)
  $('#io-ox-launchgrid-overlay, #io-ox-launchgrid-overlay-inner').toggle(force)
}

const LauncherView = Backbone.View.extend({
  tagName: 'button',
  className: 'btn btn-toolbar btn-topbar',
  attributes: {
    role: 'menuitem',
    tabindex: -1
  },
  events: {
    click: 'onClick',
    'click .closer': 'quitApp'
  },
  initialize (options) {
    this.pos = options.pos
    this.quicklaunch = options.quicklaunch
    this.listenTo(this.model, 'change:hasBadge', this.toggleBadge)
    this.listenTo(this.model, 'change:tooltip', this.updateTooltip)
    this.listenTo(this.model, 'change:title', this.updateTitle)
    this.listenTo(settings, 'change:coloredIcons', this.render)
    this.$cell = $()
  },
  addAccessKey () {
    if (this.pos <= 9 && this.pos !== 0) this.$el.attr('accesskey', this.pos)
  },
  checkUpsell () {
    const requires = this.model.get('requires')
    return !upsell.has(requires)
  },
  drawUpsellIcon (elem) {
    if (!this.checkUpsell()) return
    elem.addClass('upsell').append(createIcon('bi/stars.svg').addClass('upsell-icon'))
  },
  async onClick () {
    if (!this.checkUpsell()) {
      // close notification area when an app is launched. This is especially important on mobile, otherwise users will have apps opened in the background without noticing them. See OXUIB-1880
      notificationAreaController.trigger('hide')

      if (this.model.options.mobilelazyload) {
        // WORKAROUND: OXUIB-932 - lazyload current edited drafts on mobile
        return this.model.trigger('mobilelazyload')
      }
      // used on mobile
      if (this.model.get('state') === 'running' && this.model.get('closable')) {
        this.model.launch()
        return
      }
      if (tabApi.openInTabEnabled() && this.model.get('openInTab')) {
        // we must stay synchronous to prevent popup-blocker
        tabApi.openChildTab(this.model.get('tabUrl'))
        return
      }

      // if there is a custom quicklaunch function for this app, use it. Else just use the default launch function
      if (this.quicklaunch && this.model.quickLaunch) this.model.quickLaunch()
      else ox.launch(this.model.load)
    } else {
      const requires = this.model.get('requires')
      upsell.trigger({ type: 'app', id: this.model.get('id'), missing: upsell.missing(requires) })
    }
  },
  quitApp (e) {
    // used on mobile
    e.preventDefault()
    e.stopPropagation()
    this.model.quit()
  },
  render () {
    this.$el.empty().attr({
      'data-id': this.model.get('id'),
      'data-app-name': this.model.get('name')
    }).toggleClass('active', ox.ui.App.isCurrent(this))
    this.getIcon()
    // important: do not add< circle element via append (https://stackoverflow.com/a/3642265)
    this.badge = $('<svg height="8" width="8" class="indicator" focusable="false"><circle cx="4" cy="4" r="4"></svg>')
      .toggleClass('hidden', !this.model.get('hasBadge'))
    if (this.quicklaunch) this.renderQuicklaunchIcon()
    else this.renderDropdownIcon()
    this.updateTooltip()
    this.addAccessKey()
    return this
  },
  renderQuicklaunchIcon () {
    this.$cell = $('<div class="lcell" aria-hidden="true">').append(this.badge, this.$icon)
    this.$el.append(this.$cell)
    this.drawUpsellIcon(this.$el)
  },
  renderDropdownIcon () {
    const appColor = this.model.get('userContentIconColor') || theming.getAppColor(this.model.get('name'))
    this.$cell = $('<div class="lcell">').append(
      this.badge,
      $('<div class="icon-wrap flex-center" aria-hidden="true">').append(
        $('<div class="icon-background">').css('backgroundColor', appColor),
        this.$icon.css('color', appColor)
      ),
      $('<div class="title">').text(this.model.get('title'))
    )
    // checks for upsell and append an icon if needed
    this.drawUpsellIcon(this.$cell.find('.title'))
    this.$el.append(this.$cell)
  },
  getIcon () {
    let icon = this.model.get('icon')
    // check for compose apps
    if (this.model.get('closable') && _.device('smartphone')) {
      icon = ox.ui.appIcons[this.model.options.name]
      // some apps have icons for the taskbar, better than using the fallback
      const userIcon = this.model.options.userContentIcon
      if (!icon && userIcon) {
        // support for SVG markup string, or DOM elements, or JQuery objects
        icon = _.isString(userIcon) ? createIcon(userIcon) : $(userIcon)
      }
    }
    this.$icon = icon ? icon.clone() : icons.fallback.clone()
  },
  toggleBadge () {
    this.badge.toggleClass('hidden', !this.model.get('hasBadge'))
  },
  updateTooltip () {
    if (!this.quicklaunch) return
    let tooltip = this.model.get('tooltip')
    const title = this.model.get('title')
    tooltip = title + (tooltip ? ' (' + tooltip + ')' : '')
    this.$el.attr('aria-label', tooltip)
    this.$cell.attr({ 'aria-hidden': true, title: tooltip })
  },
  updateTitle (model, newTitle) {
    const $title = this.$el.find('.title')
    $title.text(newTitle)
    this.drawUpsellIcon($title)
  }
})

const api = {
  quickLaunchLimit: 5,
  getQuickLauncherCount () {
    const n = settings.get('apps/quickLaunchCount', 3)
    if (!_.isNumber(n)) return 0
    return Math.min(this.quickLaunchLimit, apps.forLauncher().length, n)
  },
  getQuickLauncherDefaults () {
    return 'io.ox/mail,io.ox/calendar,io.ox/files'
  },
  getQuickLauncherItems () {
    const count = this.getQuickLauncherCount()
    const list = String(settings.get('apps/quickLaunch', this.getQuickLauncherDefaults())).trim().split(/,\s*/)
    const str = list.map(o => o.replace(/\/main$/, '')).filter(function (o) {
      if (o.indexOf('customQuickLaunchers') !== -1) return o
      return apps.get(o)
    }).join(',')
    // We fill up the list with 'none' in case we have more slots than defaults
    return ((str || 'none') + new Array(count).join(',none')).split(',').slice(0, count)
  }
}

// reverted for 7.10
const QuickLaunchersCollection = Backbone.Collection.extend({
  initialize () {
    this.reload()
    settings.on('change:apps/quickLaunch change:apps/quickLaunchCount', this.reload.bind(this))
    this.listenTo(apps, 'add reset', this.reload)
  },
  reload () {
    this.reset(this.fetch())
  },
  fetch () {
    return api.getQuickLauncherItems()
      .map(function (o) {
        if (o.indexOf('customQuickLaunchers') !== -1) {
          return {
            isCustomLauncher: true,
            extensionId: o.replace('io.ox/core/appcontrol/customQuickLaunchers/', '')
          }
        }
        return apps.get(o.replace(/\/main$/, ''))
      })
      .filter(Boolean)
  }
})

// reverted for 7.10
const QuickLaunchersView = Backbone.View.extend({
  attributes: {
    id: 'io-ox-quicklaunch',
    role: 'toolbar'
  },
  events: {
    'click button': 'onClick',
    contextmenu: 'onContextmenu'
  },
  initialize () {
    this.collection = new QuickLaunchersCollection()
    this.listenTo(this.collection, { reset: this.render })
  },
  onClick () {
    toggleOverlay(false)
  },
  onContextmenu (e) {
    e.preventDefault()
    if (settings.isConfigurable('apps/quickLaunch') && api.getQuickLauncherCount() !== 0 && !_.device('smartphone')) {
      import('@/io.ox/core/settings/dialogs/quickLauncherDialog').then(function ({ default: quickLauncherDialog }) {
        quickLauncherDialog.openDialog()
      })
    }
  },
  render () {
    this.$el.empty().append(
      this.collection.map(function (model) {
        if (model.get('isCustomLauncher')) {
          // something broken? just leave this one out
          if (!ext.point('io.ox/core/appcontrol/customQuickLaunchers').get(model.get('extensionId'))) return ''
          return ext.point('io.ox/core/appcontrol/customQuickLaunchers').get(model.get('extensionId')).draw()
        }

        // app has requirements that are not met and are not available for upsell (guests do not have upsell at all)
        if (model.get('requires') && !capabilities.has(model.get('requires')) && (capabilities.has('guest') || !upsell.enabled(model.get('requires')))) return ''

        return new LauncherView({
          tagName: 'button',
          attributes: { tabindex: -1, type: 'button' },
          model,
          quicklaunch: true
        }).render().$el.attr('tabindex', -1)
      })
    )
    this.$el.find('button').first().removeAttr('tabindex')
    return this
  }
})

ext.point('io.ox/core/appcontrol/sideview').extend({
  id: 'edit-personal-data-mobile',
  index: 20,
  draw () {
    this.$el.append(this.createMenuButton({
      device: 'smartphone',
      name: 'my-contact-data',
      text: gt('Edit personal data'),
      icon: 'person',
      async action () {
        const { default: userSettings } = await import('@/io.ox/core/settings/user')
        userSettings.openModalDialog()
      }
    })
    )
  }
}, {
  id: 'settings-mobile',
  index: 40,
  draw () {
    this.$el.append(this.createMenuButton({
      device: 'smartphone',
      name: 'settings',
      text: gt('Settings'),
      icon: 'gear',
      action: () => openSettings()
    }))
  }
}, {
  id: 'onboarding-mobile',
  index: 60,
  enabled: capabilities.has('client-onboarding'),
  draw () {
    if (!settings.get('onboardingWizard')) return
    this.$el.append(this.createMenuButton({
      device: 'smartphone',
      name: 'onboarding',
      icon: 'phone',
      text: gt('Connect this device'),
      async action () {
        const { default: onboardingWizard } = await import('@/io.ox/onboarding/main')
        onboardingWizard.load()
      }
    }))
  }
}, {
  id: 'help',
  index: 100,
  draw () {
    this.$el.append(this.createMenuButton({
      name: 'help',
      icon: _.device('smartphone') ? 'question-circle' : undefined,
      text: gt('Help'),
      async action () {
        const { default: HelpApp } = await import('@/io.ox/help/main')
        const opt = { href: helpUtil.getHelp() }

        if (HelpApp.reuse(opt)) return
        HelpApp.getApp(opt).launch()
      }
    }))
  }
}, {
  id: 'settings',
  index: 300,
  draw () {
    this.$el.append(this.createMenuButton({
      device: '!smartphone',
      name: 'settings',
      text: gt('Settings'),
      action: () => openSettings()
    })
    )
  }
}, {
  id: 'about-mobile',
  index: 500,
  draw () {
    this.$el.append(this.createMenuButton({
      device: 'smartphone',
      name: 'about',
      text: gt('About'),
      icon: 'info-circle',
      action (event) { helpUtil.getAbout(event) }
    }))
  }
}, {
  id: 'logout',
  index: 'last',
  draw () {
    this.$el.append(
      // using a different name not to confuse e2e tests
      this.createMenuButton({
        name: 'launcher-logout',
        text: gt('Sign out'),
        icon: _.device('smartphone') ? 'box-arrow-right' : undefined,
        action (event) {
          event.preventDefault()
          logout()
        }
      })
    )
  }
})

const LauncherActionView = Backbone.View.extend({
  tagName: 'li',
  className: 'menu-actions',
  events: {
    'click button.launcher-action': 'onClickAction'
  },
  createMenuButton ({ device, icon, text, action }) {
    if (device && !_.device(device)) return

    const $button = $('<button class="launcher-action btn btn-toolbar ellipsis" draggable="false" tabindex="-1" role="menuitem">')
      .attr({ 'data-name': name || '' })

    if (icon) $button.append(createIcon(`bi/${icon}.svg`).addClass('bi-24 mr-16 align-middle'))
    if (text) $button.append($('<span>').text(text))
    if (typeof action === 'function') $button.on('click', action)

    return $('<li role="presentation">').append($button)
  },
  render () {
    this.$el.empty()
    ext.point('io.ox/core/appcontrol/sideview').invoke('draw', this, ext.Baton({}))
    this.$el.attr('role', 'none')
    return this
  }
})

// hint: shared node references so multiple view instances won't work
const LaunchersView = Dropdown.extend({
  attributes: { role: 'presentation', dontprocessonmobile: 'true' },
  tagName: 'li',
  options: { dontProcessOnMobile: true },
  className: 'launcher dropdown',
  id: 'io-ox-launcher',
  $ul: $('<ul class="launcher-dropdown dropdown-menu">'),
  $menu: $('<div class="menu" role="group">'),
  // this should be a link. Otherwise, this can cause strange focus issues on iOS when having the cursor inside an iframe before clicking this (see Bug 63441)
  $toggle: $('<button type="button" class="btn btn-toolbar btn-topbar dropdown-toggle launcher-btn" tabindex="0" dontprocessonmobile="true">')
    .attr('aria-label', gt('Navigate to:'))
    .append($('<div aria-hidden="true">').attr('title', gt('All Applications')).append($(icons.launcher).addClass('larger'))),
  initialize () {
    Dropdown.prototype.initialize.apply(this, arguments)
    // Overwriting keydown event from @open-xchange/bootstrap/src/dropdown as it only works for <a>
    this.$ul.on('keydown', 'button', this.onKeyDown)

    const appsView = new AppsView(this.collection)
    this.$ul.append(appsView.render().$el)
    this.$apps = appsView.$apps

    if (_.device('smartphone')) {
      this.$ul.prepend(
        new UserView({
          tagName: 'div',
          editable: settings.get('user/internalUserEdit', true),
          ellipsis: true
        }).render().$el)
      this.$ul.append(new DraftsView(this.collection).render().$el)
    }
    this.$ul.append(this.$menu)
    this.$menu.empty().append(new LauncherActionView().render().$el)

    // disable closing by clicking the menus void
    this.$ul.on('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
    })
  },
  onKeyDown (e) {
    if (e.which === 38 || e.which === 40) {
      e.preventDefault()
      e.stopPropagation()
      const $target = $(e.target)
      const $list = $target.closest('ul').find('button:visible[role^="menuitem"]')
      let index = $list.index($target)

      if (e.which === 38) index--
      if (e.which === 40) index++

      if (index < 0) index += $list.length
      if (index >= $list.length) index -= $list.length

      _.defer(function () {
        $list.eq(index).get(0).focus()
      })
    }
  },
  dispose () {
    this.$ul.off('keydown', 'button', this.onKeyDown)
    Dropdown.prototype.dispose.apply(this, arguments)
  }
})

const AppsView = Backbone.View.extend({
  $apps: $('<div class="apps" role="group">'),
  initialize (collection) {
    this.collection = collection
  },
  render () {
    this.$el = $('<div>)')
      .toggleClass('mb-16', _.device('smartphone'))
      .append(
        $('<h3 class="mb-16 mt-0">').text(gt('Apps')),
        this.$apps
      )

    const update = () => {
      this.$apps.empty().append(
        this.collection.forLauncher().map((model, i) => {
          return $('<li role="presentation">').append(new LauncherView({ model, pos: i + 1 }).render().$el)
        })
      )

      // draw custom launchers. Some items that appear in the launcher are not full apps, like the enterprise picker dialog
      ext.point('io.ox/core/appcontrol/customLaunchers').invoke('draw', this.$apps)
    }

    this.listenTo(this.collection, 'add remove launcher:update launcher:sort', update)
    update()

    return this
  }
})

const DraftsView = Backbone.View.extend({
  $drafts: $('<div class="drafts" role="group">'),
  initialize (collection) {
    this.collection = collection
  },
  render () {
    this.$el = $('<div class="mb-16">').append(
      $('<h3 class="mb-16 mt-0">').text(gt('Drafts')),
      this.$el.append(this.$drafts)
    )

    const update = () => {
      this.$el.addClass('hidden').attr('aria-hidden', 'true')
      this.$drafts.empty().append(
        this.collection.where({ closable: true }).map(model => {
          this.$el.removeClass('hidden').removeAttr('aria-hidden')
          return $('<li role="presentation">').append(new LauncherView({ model }).render().$el)
        })
      )
    }

    this.listenTo(this.collection, 'add remove launcher:update launcher:sort', update)
    update()

    return this
  }
})

ext.point('io.ox/core/appcontrol').extend({
  id: 'init',
  index: 100,
  draw () {
    let overlay
    $('#io-ox-core').append(
      overlay = $('<div id="io-ox-launchgrid-overlay">').on('click', toggleOverlay)
    )
    if (_.device('smartphone')) {
      overlay.on('touchstart', function (e) {
        e.preventDefault()
        toggleOverlay()
      })
    }
    initRefreshAnimation()

    apps.on('launch resume', function (model) {
      if (model.get('floating')) return

      $('.launcher-dropdown').find('.lcell[data-app-name]')
        .removeClass('active').end()
        .find(`.lcell[data-app-name="${CSS.escape(model.get('name'))}"]`).addClass('active')

      $('#io-ox-quicklaunch').find('button[data-id]')
        .removeClass('active').end()
        .find(`button[data-id="${CSS.escape(model.get('name'))}"]`).addClass('active')

      _.defer(function () {
        $(document).trigger('resize')
      })
    })
  }
})

ext.point('io.ox/core/appcontrol/left').extend({
  id: 'skiplinks',
  index: 100,
  draw () {
    this.append(
      $('<a class="skip-links sr-only sr-only-focusable" href="#">').append(
        $('<span>').text(gt('Skip to main content'))
      )
    )
  }
})

ext.point('io.ox/core/appcontrol/left').extend({
  id: 'logo',
  index: 200,
  draw () {
    const { productName } = ox.serverConfig
    const logoTopbarElement = $('<div id="io-ox-top-logo" class="me-8 ms-10">')
    const logoContainer = $('<div class="logo-container p-8">')
    const logoButton = $(`<button type="button" class="logo-btn btn btn-link" target="_blank" aria-label="${productName}">`)
    const logoLink = $(`<a class="btn btn-link logo-btn" target="_blank" aria-label="${productName}">`)

    function getAction () {
      const autoStart = settings.get('autoStart', 'io.ox/mail')
      const actionSetting = settings.get('logoAction', 'autoStart')
      const action = actionSetting === 'autoStart' ? autoStart : actionSetting

      if (!action || (action === 'autoStart' && autoStart === 'none')) return { el: 'none' }
      if ((/^https?:/).test(action)) return { el: 'link', action }
      if (tabApi.openInTabEnabled() && (/^io\.ox\/office\/portal/).test(action)) {
        const url = tabApi.createUrl({ app: action }, { exclude: 'folder', suffix: `office?app=${action.substring(0, 20)}` })
        return { el: 'link', action: url }
      }
      if (action) return { el: 'button', action }
    }

    function renderLogo () {
      const { el, action } = getAction()
      logoTopbarElement.empty()

      if (el === 'none') return logoTopbarElement.append(logoContainer)
      logoContainer.attr('aria-hidden', true)
      if (el === 'link') {
        logoLink.attr('href', action)
        return logoTopbarElement.append(logoLink.append(logoContainer))
      }
      if (el === 'button') {
        logoButton.on('click', function () {
          const app = apps.get(action.replace(/\/main$/, ''))
          if (!app) return
          notificationAreaController.trigger('hide')
          ox.launch(app.load)
        })
        return logoTopbarElement.append(logoButton.append(logoContainer))
      }
    }

    this.append(renderLogo())
    theming.renderLogo(logoContainer)

    if (ox.openedInBrowserTab || (tabApi.openInTabEnabled() && _.url.hash('app') === 'io.ox/files/detail')) return

    settings.on('change:logoAction change:autoStart', () => {
      $('#io-ox-top-logo').replaceWith(renderLogo())
    })
  }
})
ext.point('io.ox/core/appcontrol').extend({
  id: 'apptitle',
  index: 300,
  draw (baton) {
    const $header = $('<h1 class="sr-only">')
    ox.on('app:start app:resume', e => $header.text(e.options.title))
    this.append($header)
  }
})

ext.point('io.ox/core/appcontrol').extend({
  id: 'left',
  index: 350,
  draw () {
    const $el = $('<div id="io-ox-topleftbar" class="justify-start flex-grow me-auto">')
    this.append($el)
    ext.point('io.ox/core/appcontrol/left').invoke('draw', $el)
  }
})

// reverted for 7.10
ext.point('io.ox/core/appcontrol/left').extend({
  id: 'quicklauncher',
  index: 400,
  draw () {
    if (_.device('smartphone')) return
    const quicklaunchers = window.quicklaunchers = new QuickLaunchersView()
    this.append(quicklaunchers.render().$el)
  }
})

ext.point('io.ox/core/appcontrol/right').extend({
  id: 'mobile-search',
  index: 120,
  draw () {
    if (!_.device('smartphone')) return
    this.append($('<li id="io-ox-topbar-mobile-search-container" role="presentation">'))
  }
})

ext.point('io.ox/core/appcontrol/right').extend({
  id: 'launcher',
  index: 125,
  draw () {
    if (!_.device('smartphone')) return

    const appLauncher = window.launchers = new LaunchersView({
      collection: apps,
      dontProcessOnMobile: true
    })

    const $closeButton = $(`<button class="btn btn-default btn-close bi-32" tabindex="-1" role="menuitem" title="${gt('Close')}">`)
      .append(createIcon('bi/x.svg').addClass('bi-24'))
      .on('click', event => event.preventDefault())

    appLauncher.$ul.append(
      $('<li role="presentation">')
        .append($closeButton)
    )
    appLauncher.$el.on('shown.bs.dropdown', () => appLauncher.$ul.removeAttr('style'))
    this.append(appLauncher.render().$el)
  }
})

if (!_.device('smartphone') && settings.get('features/enterprisePicker/enabled', false)) {
  const openPicker = _.debounce(async function () {
    const { default: popup } = await import('@/io.ox/contacts/enterprisepicker/dialog')
    popup.open($.noop, { selection: { behavior: 'none' } })
  }, 300, true)

  ext.point('io.ox/core/appcontrol/right').extend({
    id: 'enterprisePicker',
    index: 130,
    draw () {
      if (!settings.get('features/enterprisePicker/showTopRightLauncher', false)) return ''

      const node = $('<li role="presentation" class="launcher">').append(
        $('<button id="io-ox-enterprise-picker-icon" class="launcher-btn btn btn-toolbar btn-topbar" tabindex="-1">').attr('aria-label', gt('Address directory')).append(createIcon('bi/journal-text.svg'))
          .on('click', openPicker)
      )
      this.append(node)
    }
  })

  ext.point('io.ox/core/appcontrol/customLaunchers').extend({
    id: 'enterprisePicker',
    index: 100,
    draw () {
      if (!settings.get('features/enterprisePicker/showLauncher', true)) return ''

      this.append(
        $('<li role="presentation">').append(
          $('<a tabindex="-1" href="#" role="menuitem" class="btn btn-toolbar btn-topbar">').append(
            $('<div class="lcell">').append(
              // just use same color as contacts
              $('<div class="icon-wrap flex-center" aria-hidden="true">').append(
                $('<div class="icon-background">').css('backgroundColor', theming.getAppColor('io.ox/contacts')),
                createIcon('bi/journal-text.svg').css('color', theming.getAppColor('io.ox/contacts'))
              ),
              $('<div class="title">').text(gt('Address directory'))
            ).on('click', openPicker)
          )
        )
      )
    }
  })

  ext.point('io.ox/core/appcontrol/customQuickLaunchers').extend({
    id: 'enterprisePicker',
    label: gt('Address directory'),
    index: 100,
    draw () {
      if (!settings.get('features/enterprisePicker/showLauncher', true)) return ''

      return $('<button tabindex="-1" type="button" class="btn btn-topbar btn-toolbar">').attr('aria-label', gt('Address directory')).append(
        $('<div aria-hidden="true">').attr('title', gt('Address directory')).append(createIcon('bi/journal-text.svg'))
      ).on('click', openPicker)
    }
  })
}

// deactivated since 7.10.0
ext.point('io.ox/core/appcontrol').extend({
  id: 'search',
  index: 500,
  draw () {
    const search = $('<div id="io-ox-topsearch" class="flex-center">')
    this.append(search)
  }
})

ext.point('io.ox/core/appcontrol').extend({
  id: 'right',
  index: 600,
  draw () {
    const taskbar = $('<ul class="taskbar list-unstyled" role="toolbar">').toggleClass('me-16', !_.device('smartphone'))
    this.append($('<div id="io-ox-toprightbar" class="justify-end flex-grow ms-auto">').append(taskbar))
    ext.point('io.ox/core/appcontrol/right').invoke('draw', taskbar)
  }
})

ext.point('io.ox/core/appcontrol').extend({
  id: 'show',
  index: 10000,
  draw () {
    this.attr('role', 'banner').show()
  }
})

ext.point('io.ox/core/appcontrol/left').extend({
  id: 'launcher',
  index: 300,
  draw () {
    if (_.device('smartphone')) return
    const taskbar = $('<ul class="taskbar list-unstyled m-0" role="toolbar">')
    const appLauncher = window.launchers = new LaunchersView({
      collection: apps,
      dontProcessOnMobile: true
    })
    taskbar.append(appLauncher.render().$el)
    this.append(taskbar)
  }
})

function initRefreshAnimation () {
  let count = 0
  let timer = null

  // unprompted animations can be challenging for users with attention deficit disorders,
  // so we'll only do it if the user has not set their system to reduce motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let useSpinner = !mediaQuery.matches
  mediaQuery.addEventListener('change', e => { useSpinner = !e.matches })

  const duration = useSpinner ? 500 : 1500
  let refreshIcon = $()

  function off () {
    if (count === 0 && timer === null) {
      $('#io-ox-refresh-icon .apptitle').attr('aria-label', gt('Refresh'))

      if (useSpinner) {
        refreshIcon = refreshIcon.length ? refreshIcon : $('#io-ox-refresh-icon').find('svg')
        if (refreshIcon.hasClass('animate-spin')) {
          refreshIcon.addClass('animation-paused')
          let done = false
          setTimeout(function () { done = true }, 2546)
          refreshIcon.on('animationiteration', function (event) {
            if (done) $(event.target).removeClass('animate-spin')
          })
        }
      }
    }
  }

  http.on('start', function (e, xhr, options) {
    if (count === 0) {
      if (timer === null && !options.silent) {
        $('#io-ox-refresh-icon .apptitle').attr('aria-label', gt('Currently refreshing'))

        if (useSpinner) {
          refreshIcon = refreshIcon.length ? refreshIcon : $('#io-ox-refresh-icon').find('svg')
          if (!refreshIcon.hasClass('animate-spin')) {
            refreshIcon.addClass('animate-spin').removeClass('animation-paused')
          }
        }
      }
      clearTimeout(timer)
      timer = setTimeout(function () {
        timer = null
        off()
      }, duration)
    }
    count++
  })

  http.on('stop', function () {
    count = Math.max(0, count - 1)
    off()
  })
}

export default _.extend(api, {
  LauncherView,
  LaunchersView
})
