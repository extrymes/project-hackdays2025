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
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import http from '@/io.ox/core/http'
import capabilities from '@/io.ox/core/capabilities'
import * as util from '@/io.ox/onboarding/util'
import { createIcon } from '@/io.ox/core/components'
import upsell from '@/io.ox/core/upsell'

import gt from 'gettext'

function createQr (url) {
  return import('qrcode').then(function (qrcode) {
    let qr
    qrcode.toDataURL(url, function (err, url) {
      if (err) console.error(err)
      qr = url
    })
    return qr
  })
}

function getDownloadUrl (type) {
  return http.GET({
    module: 'onboarding',
    params: {
      action: 'link',
      type
    }
  }).then(function (data) {
    return data
  })
}

const getAppConfigurationElement = syncViewConfig => {
  const syncView = new SyncView({ config: syncViewConfig, description: gt('Open the app on your device and enter the following information.') })
  return $('<div class="configuration-container">').append(
    $('<h4>').text(gt('Automatic configuration')),
    syncView.render().$el
  )
}

const getAppIconElement = (appIconClass, appIcon) => {
  return $('<img class="app-icon applink" role="button">')
    .addClass(appIconClass)
    .attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')
    .css('background-image', appIcon ? 'url(' + appIcon + ')' : '')
}

const DownloadQrView = ExtensibleView.extend({

  tagName: 'div',
  className: 'content-container',
  point: 'io.ox/onboarding/clients/qr-code',

  initialize (options) {
    this.url = options.url
    this.type = options.type
    this.config = options.config
    this.title = options.title
    if (options.showQR !== false) this.qrCode = new Backbone.Model()
    // #. 1$s type of application to synchronize, which is either Address Book or Calendar
    this.description = options.description || gt('Scan this code with your phone\'s camera to synchronize your "%1$s":', this.title)
    this.storeIcon = options.storeIcon
    this.appIconClass = options.iconClass
    this.appIcon = options.appIcon
    this.listenTo(this.qrCode, 'change', this.updateQr)
    if (!this.url) {
      this.generatedUrl = new Backbone.Model()
      this.listenTo(this.generatedUrl, 'change', this.updateUrl)
    }
  },

  events: {
    'click .applink': 'onClick'
  },

  render () {
    // url only specified for store links
    // show manual config additionally
    if (this.url) return this.renderAppConfig()

    this.syncView = this.type === 'mail'
      ? new MailSyncView({ config: this.config })
      : new SyncView({ config: this.config })

    this.$el.busy().append(
      $('<div class="description">').append($('<p class="prompt">').text(this.description)),
      $('<img class="qrcode">'),
      $('<p class="link-info">').text(gt('Link: ')).append($('<a class="link">')),
      $('<p class="hint">').text(gt('Please note: After downloading you will have to enable the profile in the Settings app to complete the installation.')),
      (this.type !== 'mail,caldav,carddav') && this.syncView.render().$el
    )
    this.getQrUrl()
    return this
  },

  renderAppConfig () {
    this.$el.busy().append(
      $('<div class="download-container">').append(
        $('<div class="description-container">').append(
          $('<h4>').text(gt('Download and Install')),
          // #. 1$s name of the product to install, e.g. OX Mail or Drive
          $('<div class="description">').append($('<p class="prompt">').text(
            this.qrCode
              ? gt('To install %1$s, please scan this QR code with your phone or click on the download button:', this.title)
              : gt('To install %1$s, please click on the download button:', this.title)
          ))
        ),
        $('<div class="image-container">').append(
          this.qrCode
            ? $('<img class="qrcode">')
            : $('<div class="app-icon-container mobile-download">').append(getAppIconElement(this.appIconClass, this.appIcon)),
          $('<img class="store-icon applink" role="button">').attr('src', this.storeIcon).on('error', function () { this.remove() })

        )
      ),
      $('<div class="divider" role="separator">'),
      getAppConfigurationElement(this.config)
    )
    if (this.qrCode) this.getQr()
    else this.$el.idle()
    return this
  },

  getQr () {
    const self = this
    createQr(this.url).then(function (qr) {
      self.qrCode.set('src', qr)
    })
  },

  getQrUrl () {
    const self = this
    getDownloadUrl(this.type).then(function (url) {
      self.url = url
      self.generatedUrl.set('url', url)
      self.getQr()
    })
  },

  updateUrl () {
    const url = this.generatedUrl.get('url')
    this.$('.link-info .link').text(url).attr('href', url)
  },

  updateQr () {
    this.$('.qrcode').attr('src', this.qrCode.get('src'))
    this.$el.idle()
  },

  onClick () {
    window.open(this.url)
  }
})

const DownloadView = ExtensibleView.extend({

  tagName: 'div',
  className: 'content-container',
  point: 'io.ox/onboarding/clients/download',

  initialize (options) {
    this.link = options.link
    this.config = options.config
  },

  events: {
    'click .download': 'onClick'
  },

  render () {
    this.$el.append(
      $('<div class="description">').append(
        // #. 1$s name of the product, usually OX Drive
        $('<p class="prompt">').text(gt('Download %1$s for Windows', util.titles.windows.drive))
      ),
      // #. 1$s name of the product, usually OX Drive
      $('<button type="button" data-action="download" class="btn btn-link download">')
        .text(gt('%1$s for Windows', util.titles.windows.drive))
        .append(createIcon('bi/download.svg')),
      $('<div class="divider" role="separator">'),
      getAppConfigurationElement(this.config)

    )
    return this
  },

  onClick () {
    const self = this
    import('@/io.ox/core/download').then(function ({ default: download }) {
      download.url(self.link)
    })
  }
})

const DownloadConfigView = ExtensibleView.extend({

  tagName: 'div',
  className: 'content-container',
  point: 'io.ox/onboarding/clients/download-config',

  initialize (options) {
    this.type = options.type
    this.config = options.config
  },

  events: {
    'click .btn.download': 'onClick'
  },

  render () {
    this.syncView = this.type === 'mail'
      ? new MailSyncView({ config: this.config })
      : new SyncView({ config: this.config })

    this.$el.append(
      $('<div class="description">').append(
        $('<p class="prompt">').text(gt('Please download the configuration to automatically set up your account.'))
      ),
      $('<button type="button" data-action="download" class="btn btn-primary download">').text(gt('Download configuration')),
      (this.type !== 'mail,caldav,carddav') && this.syncView.render().$el
    )
    return this
  },

  onClick () {
    getDownloadUrl(this.type).then(function (url) {
      import('@/io.ox/core/download').then(function ({ default: download }) {
        download.url(url)
      })
    })
  }
})

const MobileDownloadView = ExtensibleView.extend({

  tagName: 'div',
  className: 'content-container mobile',
  point: 'io.ox/onboarding/clients/mobile-download',

  initialize (options) {
    this.appIconClass = options.iconClass
    this.storeIcon = options.storeIcon
    this.url = options.app.url
    this.title = options.title
    this.config = options.config
    if (options.app.icon) {
      this.appIcon = options.app.icon
      this.appIconClass = ''
    }
  },

  events: {
    'click .applink': 'onClick'
  },

  render () {
    this.$el.append(
      $('<div class="mobile-download">').append(
        $('<div class="app-icon-container">').append(
          getAppIconElement(this.appIconClass, this.appIcon),
          $('<p class="app-info">').text(this.title)
        ),
        $('<img class="store-icon applink" role="button">').attr('src', this.storeIcon).on('error', function () { this.remove() })
      ),
      $('<div class="divider" role="separator">'),
      getAppConfigurationElement(this.config)

    )
  },

  onClick () {
    window.open(this.url)
  }
})

const MailSyncView = ExtensibleView.extend({

  tagName: 'div',
  className: 'content-container',
  point: 'io.ox/onboarding/clients/mail-sync',

  initialize (options) {
    this.userData = options.userData
    this.type = options.title
    this.expanded = options.expanded || false
    this.mailConfig = options.config
    this.listenTo(this.mailConfig, 'change', this.updateMailConfig)
  },

  events: {
    'click .manual-toggle': 'onToggle'
  },

  render () {
    if (this.userData) {
      this.$el.append(
        $('<div class="description">')
          .append(
            // #, %1s primary email address of the current user
            $('<p class="info">').html(gt('Please try to add your mail address <b>%1$s</b> to check whether your mail client can automatically configure your email account.', this.userData.get('email1'))),
            $('<p class="info">').text(gt('If an automatic configuration is not possible, please use the following information to manually set up your mail account:'))
          )
      )
    }
    this.$el.append(
      this.expanded
        ? $('<div class="manual-container">')
        : [
            $('<a href="#" role="button" class="manual-toggle" aria-expanded="false">').text(gt('Show manual configuration options')),
            $('<div class="manual-container">').hide()
          ]
    )
    this.renderManualConfig()
    return this
  },

  renderManualConfig () {
    this.$('.manual-container').append(
      $('<div class="manual-description">').text(gt('Incoming Server Settings (IMAP)')),
      $('<pre class="manual-config">')
        .append(
          $('<div class="title incoming">')
            .append(
              $('<div class="server">').text(gt('Server')),
              $('<div class="port">').text(gt('Port')),
              $('<div class="username">').text(gt('Username')),
              $('<div class="connection">').text(gt('Connection')),
              $('<div class="pass">').text(gt('Password'))
            ),
          $('<div class="values incoming">')
            .append(
              $('<div class="server">'),
              $('<div class="port">'),
              $('<div class="username">'),
              $('<div class="connection">'),
              $('<div class="pass">')
            )
        ),
      $('<div class="manual-description">').text(gt('Outgoing Server Settings')),
      $('<pre class="manual-config">')
        .append(
          $('<div class="title outgoing">')
            .append(
              $('<div class="server">').text(gt('Server')),
              $('<div class="port">').text(gt('Port')),
              $('<div class="username">').text(gt('Username')),
              $('<div class="connection">').text(gt('Connection')),
              $('<div class="pass">').text(gt('Password'))
            ),
          $('<div class="values outgoing">')
            .append(
              $('<div class="server">'),
              $('<div class="port">'),
              $('<div class="username">'),
              $('<div class="connection">'),
              $('<div class="pass">')
            )
        )
    )
  },

  updateMailConfig () {
    this.mailConfigData = this.mailConfig.get('data')
    this.$('.values.incoming').empty()
      .append(
        $('<div class="server">').text(this.mailConfigData.imapServer),
        $('<div class="port">').text(this.mailConfigData.imapPort),
        $('<div class="username">').text(this.mailConfigData.imapLogin),
        $('<div class="connection">').text(this.mailConfigData.imapSecure ? 'SSL/TLS' : 'STARTTLS'),
        $('<div class="pass">').text(gt('Your account password'))
      )
    this.$('.values.outgoing').empty()
      .append(
        $('<div class="server">').text(this.mailConfigData.smtpServer),
        $('<div class="port">').text(this.mailConfigData.smtpPort),
        $('<div class="username">').text(this.mailConfigData.smtpLogin),
        $('<div class="connection">').text(this.mailConfigData.smtpSecure ? 'SSL/TLS' : 'STARTTLS'),
        $('<div class="pass">').text(gt('Your account password'))
      )
  },

  onToggle (e) {
    $(e.currentTarget).find('i.fa').toggleClass('fa-chevron-right fa-chevron-down').end()
      .attr('aria-expanded', function (i, v) { return v === 'false' })
    this.$('.manual-container').toggle()
  }
})

const SyncView = ExtensibleView.extend({

  tagName: 'div',
  className: 'content-container',
  point: 'io.ox/onboarding/clients/sync',

  initialize (options) {
    this.config = options.config
    this.description = options.description
    this.listenTo(this.config, 'change', this.renderManualConfig)
  },

  events: {
    'click .manual-toggle': 'onToggle'
  },

  render () {
    const needsDescription = !!this.description

    if (needsDescription) {
      this.$el.append(
        $('<div class="description">')
          .append(
            $('<p class="info">').text(this.description)
          )
      )
    }
    this.$el.append(
      !needsDescription ? $('<a href="#" role="button" class="manual-toggle" aria-expanded="false">').text(gt('Show manual configuration options')) : '',
      $('<div class="manual-container">').toggle(needsDescription)
    )
    this.renderManualConfig()
    return this
  },

  renderManualConfig () {
    this.$('.manual-container').empty().append(
      $('<pre class="manual-config">').append(
        $('<div class="title">')
          .append(
            this.config.get('url') ? $('<div class="url">').text(gt('Server URL')) : '',
            $('<div class="login">').text(gt('Username')),
            $('<div class="pass">').text(gt('Password'))
          ),
        $('<div class="values">')
          .append(
            this.config.get('url') ? $('<div class="url">').text(this.config.get('url')) : '',
            $('<div class="login">').text(this.config.get('login')),
            $('<div class="pass">').text(gt('Your account password'))
          )
      )
    )
  },

  onToggle (e) {
    $(e.currentTarget).find('i.fa').toggleClass('fa-chevron-right fa-chevron-down').end()
      .attr('aria-expanded', function (i, v) { return v === 'false' })
    this.$('.manual-container').toggle()
  }
})

const PlatformView = ExtensibleView.extend({

  tagName: 'div',
  className: 'content-container',
  point: 'io.ox/onboarding/clients/plattform',

  initialize () {
    this.listView = new ListView({ collection: util.platformList, model: this.model })
  },

  render () {
    this.$el.append(
      $('<div class="description">')
        .append(
          // #. variable %1$s is the name of the product, e.g. App Suite
          $('<p class="info">').text(gt('This wizard helps you to use %1$s on other devices.', ox.serverConfig.productName)),
          $('<p class="prompt">').text(gt('Which device do you want to configure?'))
        ),
      this.listView.render().$el
    )
    return this
  }
})

const AppView = ExtensibleView.extend({

  tagName: 'div',
  className: 'content-container',
  point: 'io.ox/onboarding/clients/app',

  initialize () {
    this.listView = new ListView({ collection: util.appList, model: this.model })
  },

  render () {
    this.$el.append(
      $('<div class="description">')
        .append(
          $('<p class="prompt">').text(gt('Which application do you want to use?'))
        ),
      this.listView.render().$el
    )
    return this
  }
})

const ListView = ExtensibleView.extend({

  tagName: 'ul',
  className: 'content-list',
  point: 'io.ox/onboarding/list',

  initialize () {
    this.listenTo(this.model, 'change', this.render)
  },
  events: {
    'click .list-btn': 'selectItem'
  },

  selectItem (e) {
    try {
      const target = $(e.currentTarget)
      const appName = target.attr('data-app')
      const appModel = util.appList.find(m => m.get('platform') === this.model.get('platform') && m.get('app') === appName)

      if (appModel && !upsell.has(appModel.get('cap'))) {
        this.model.trigger('scenario:upsell', target)
        return
      }

      this.model.set('app', appName)
      this.model.set('platform', target.attr('data-platform'))
    } catch (error) {
      // do not show errors if view was disposed. Can happen if an error is encountered during a step and the wizard is closed in the middle of a step
      if (!this.disposed) console.error(error)
    }
  },

  render () {
    this.$el.empty()
    this.renderListItems()
    return this
  },

  renderListItems () {
    const list = this.collection
    const self = this

    self.$el.append(
      // filter for selected items
      // create List items from selection
      list
        .filter(function (model) {
          const platform = self.model.get('platform')
          return platform === undefined || (platform === model.get('platform') && (capabilities.has(model.get('cap')) || upsell.enabled(model.get('cap'))))
        })
        .map(function (model) {
          model.set('parent', self.model)
          const view = new ListItemView({ model })
          return view.render().$el
        })
    )
  }
})

const ListItemView = ExtensibleView.extend({
  tagName: 'li',
  className: 'list-item',
  point: 'io.ox/onboarding/listItem',

  render () {
    const cap = this.model.get('cap')
    const showUpsell = cap && upsell.enabled(cap) && !upsell.has(cap)
    this.$el
      .append(
        $('<button type="button" class="list-btn">')
          .addClass(this.model.get('data'))
          .addClass(showUpsell ? 'disabled' : '')
          .attr('data-platform', this.model.get('platform'))
          .attr('data-app', this.model.get('app'))
          .append(
            createIcon(this.model.get('icon')).addClass('icon-btn'),
            $('<div class="list-description">').text(this.model.get('title')),
            showUpsell
              ? $('<div class="premium-container icon-next">').text(gt('Premium'))
              : createIcon('bi/chevron-right.svg').addClass('icon-next')
          ))
    return this
  }
})

const ProgressionView = Backbone.View.extend({

  tagName: 'div',
  className: 'progress-container',

  events: {
    'click [data-action="reset"]': 'onReset'
  },
  onReset () {
    this.wizard.trigger('reset')
  },
  initialize (connectTour) {
    this.wizard = connectTour
    this.model = connectTour.model
    this.listenTo(this.model, 'change', this.render)
  },
  render () {
    const platform = this.model.get('platform')
    const app = this.model.get('app')
    const platformTitle = platform ? util.titles[platform].title : undefined
    const appTitle = app ? util.titles[platform][app] : undefined
    const isSmartphone = _.device('smartphone')
    const $steps = $('<ul class="progress-steps">')
    let stepOneLabel
    if (isSmartphone) {
      stepOneLabel = appTitle || gt('App')
    } else {
      stepOneLabel = platformTitle || gt('Platform')
    }

    $steps.append($('<li class="progress-step-one">')
      .append(
        $('<button type="button" class="btn progress-btn" data-action="reset">')
          .prop('disabled', true)
          .append(
            $('<span>').text('1'),
            $('<span class="sr-only">').text(stepOneLabel)
          )
      )
      .addClass((!platform || _.device('smartphone')) && !app ? 'active' : '')
      .append($('<span class="progress-description aria-hidden="true">').text(stepOneLabel))
    )
    if (!isSmartphone) {
      $steps.append($('<li class="progress-step-two">')
        .append(
          $('<button type="button" class="btn progress-btn" data-action="back">')
            .prop('disabled', true)
            .append(
              $('<span>').text('2'),
              $('<span class="sr-only">').text(appTitle || gt('App'))
            )
        )
        .addClass(platform && !app ? 'active' : '')
        .append($('<span class="progress-description" aria-hidden="true">').text(appTitle || gt('App')))
      )
    }
    $steps.append($('<li class="progress-step-three">')
      .append(
        $('<button type="button" class="btn progress-btn">')
          .prop('disabled', true)
          .append(
            $('<span>').text(isSmartphone ? '2' : '3'),
            $('<span class="sr-only">').text(gt('Setup'))
          )
      )
      .addClass(platform && app ? 'active' : '')
      .append($('<span class="progress-description" aria-hidden="true">').text(gt('Setup')))
    )
    this.$el.empty().append($steps)
    if (isSmartphone) {
      $('.progress-step-one .btn').prop(app ? { disabled: false } : '')
    } else {
      $('.progress-step-one .btn').prop(platform ? { disabled: false } : '')
      $('.progress-step-two .btn').prop(app ? { disabled: false } : '')
    }
    return this
  }
})

export default {
  DownloadQrView,
  DownloadConfigView,
  DownloadView,
  MobileDownloadView,
  SyncView,
  MailSyncView,
  PlatformView,
  AppView,
  ProgressionView
}
