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
import capabilities from '@/io.ox/core/capabilities'
import { getLoadedSettings, getSettings } from '@/io.ox/core/settings'
import ModalDialogView from '@/io.ox/backbone/views/modal'
// import switchboardAPI from '@/io.ox/switchboard/api'

import '@/io.ox/help/style.scss'

import gt from 'gettext'
import { hasFeature } from '@/io.ox/core/feature'

function getLocale (language = ox.language) {
  // see: https://oxpedia.org/wiki/index.php?title=AppSuite:Available_Translations
  if (/^(en_US|en_GB|de_DE|fr_FR|es_ES|es_MX|nl_NL|pl_PL|ja_JP|it_IT|zh_CN|zh_TW|tr_TR)$/.test(language)) return language
  // special mapping
  if (language === 'fr_CA') return 'fr_FR'
  if (language === 'ca_ES') return 'es_ES'
  // british english
  if (/^(en_AU|en_DE|en_IE|en_NZ|en_SG|en_ZA)$/.test(language)) return 'en_GB'
  const match = language.match(/^(de|fr|es|nl|pl|ja|it|zh|zh|tr)/)
  if (match) return `${match[0]}_${match[0].toUpperCase()}`
  // general fallback
  return 'en_US'
}

function getAddress (opt) {
  let href = opt.href
  let base = opt.base
  // if target is dynamic, execute as function
  if (_.isFunction(href)) href = opt.href()

  if (_.isObject(href)) {
    base = href.base || base
    href = href.target || href
  }
  return base + '/l10n/' + getLocale() + '/' + href
}

function traverseFeatures (features) {
  const result = []
  for (const key of Object.keys(features)) {
    if (_.isObject(features[key])) {
      result.push(...traverseFeatures(features[key]).map(p => `${key}-${p}`))
    } else if (features[key] === true) {
      result.push(key)
    }
  }
  return result
}

function createInstance (options) {
  const opt = _.extend({
    base: 'help',
    href: 'index.html',
    modal: false
  }, options)
  // #. This is a concatenated string to build a window title like "OX Appsuite help"
  const windowTitle = gt('%1$s Help', ox.serverConfig.productName || 'OX App Suite')

  const app = ox.ui.createApp({
    name: 'io.ox/help',
    title: windowTitle,
    closable: true,
    floating: !_.device('smartphone'),
    size: 'width-xs height-xs',
    href: opt.href
  })

  app.cid = 'io.ox/help:' + getAddress(opt)

  app.showModal = function (iframe) {
    const modal = new ModalDialogView({
      focus: _.device('smartphone') ? '' : 'iframe',
      title: windowTitle,
      width: 640,
      maximize: 650
    }).build(function () {
      this.$el.addClass('inline-help')
      this.$body.append(iframe.addClass('abs'))
    }).addCloseButton()
      .on('close', function () { app.quit() })
      .open()
    $.noop(modal)
  }

  app.showFloatingWindow = function (iframe) {
    let win = app.getWindow()

    if (!win) {
      app.setWindow(win = ox.ui.createWindow({
        name: 'io.ox/help',
        chromeless: true,
        // attributes for the floating window
        floating: !_.device('smartphone'),
        closable: true,
        title: gt('Online help')
      }))
      win.addClass('inline-help')
      win.nodes.main.append(iframe)
    }

    if (_.device('smartphone')) {
      win.setHeader(
        $('<div class="header">').append(
          $('<button type="button" class="btn btn-link">')
            .text(gt('Close'))
            .on('click', function () { app.quit() })
        )
      )
      win.nodes.header.show()
    }
    win.show()
    win.idle()
  }

  app.createIframe = function () {
    const iframe = $('<iframe class="hidden inline-help-iframe" frameborder="0">')
      .attr({ src: getAddress(opt), title: gt('loading') })

    function onEscape (e) {
      if (e.which !== 27) return
      e.preventDefault()
      $('.inline-help').find('[data-action="cancel"], [data-action="close"]').click()
    }

    function onShiftTab (e) {
      if (!opt.modal) return
      if (!(e.which === 9 && e.shiftKey)) return
      e.preventDefault()
      $('.inline-help').find('[data-action="cancel"]').focus()
    }

    function onTab (e) {
      if (opt.modal) return
      if (!(e.which === 9 && !e.shiftKey)) return
      e.preventDefault()
      $('.io-ox-help-window').find('[data-action="minimize"]').focus()
    }

    const activate = function () {
      if (opt.modal || !this.getWindow().floating) return
      this.getWindow().floating.activate()
    }.bind(this)

    iframe.on('load', async function () {
      // mark the iframes html as embedded class and modal to override the styles in the help less files
      let classesToAdd = opt.modal ? 'embedded in-modal' : 'embedded'
      const contents = $(this).contents()
      const firstTabbable = contents.find('.oxhelp-content a:first')
      const lastTabbable = contents.find('.navbar-nav a:eq(2)')
      const caps = capabilities.getFlat()
      const navigation = contents.find('.oxhelp-navigation-top')
      const navbar = navigation.find('nav')
      const helpContent = contents.find('.oxhelp-content')

      navigation.before(helpContent)

      // hides the top-bar and always displays navigation (without toggle), see OXUIB-325
      navbar.removeClass('navbar-inverse')
      navbar.find('.navbar-header').hide()
      navbar.find('#ox-main-nav').removeClass('collapse')

      _(caps.enabled).each(function (cap) {
        classesToAdd += ' cap-' + cap
      })

      getLoadedSettings().forEach(path => {
        const settings = getSettings(path)
        if (!settings) return

        const features = settings._tree.features
        if (!features) return

        traverseFeatures(features)
          // ignore special namespaces for temporary internal use (feature testing)
          .filter(p => !/^\./.test(p))
          .map(p => `feat-${path.replace(/[./]/g, '-')}-${p}`)
          .forEach(c => (classesToAdd += ` ${c}`))
      })

      if (hasFeature('zoom')) {
        classesToAdd += ' feat-zoom'
      }

      if (hasFeature('jitsi')) {
        classesToAdd += ' feat-jitsi'
      }

      contents.find('html')
        .addClass(classesToAdd)
      // attach handler to bring the app to front when clicking into the iframe
        .on('mousedown', activate)
      // remove brand link because this is most likely an empty link
        .find('.navbar-brand').remove()

      contents.find('body').on('keydown', onEscape)
      firstTabbable.on('keydown', onShiftTab)
      lastTabbable.on('keydown', onTab)

      $(this).attr('title', contents.attr('title'))
        .removeClass('hidden')

      _.defer(function () {
        // set the focus to the first navigation link after loading and dom construction
        iframe.focus()
        firstTabbable.focus()
      })

      $(this.contentWindow).on('dragover drop', false)

      this.contentWindow.addEventListener('beforeunload', function () {
        iframe.addClass('hidden')
        contents.find('html').off('mousedown', activate)
        contents.find('body').off('keydown', onEscape)
        firstTabbable.off('keydown', onShiftTab)
        lastTabbable.off('keydown', onTab)
      })
    })
    return iframe
  }

  app.setLauncher(function () {
    const iframe = app.createIframe()
    if (opt.modal) return app.showModal(iframe)
    app.showFloatingWindow(iframe)
    if (!_.device('smartphone')) app.getWindow().floating.activate()
  })
  // very strange to directly call the launch function. comment this out for now cause this causes the launch function to be called 2 times...
  /* app.launch().then(function () {
    if (opt.modal || !this.getWindow().floating) return
    // activate this app after launch to prevent it staying in background
    // when opened from a modal inside another floating app
    app.getWindow().floating.activate()
  }) */
  return app
}

ext.point('io.ox/help/main').extend({
  id: 'ensure-active-state',
  resume () {
    if (this.options.modal || !this.getWindow().floating) return
    this.getWindow().floating.activate()
  }
})

export default {
  getApp: createInstance,
  reuse (opt) {
    return ox.ui.App.reuse('io.ox/help:' + getAddress(opt))
  },
  getAddress,
  getLocale
}
