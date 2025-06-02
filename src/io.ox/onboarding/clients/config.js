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

// cSpell:ignore davmanual, davs, davsync

import _ from '@/underscore'
import Backbone from '@/backbone'
import ox from '@/ox'
import api from '@/io.ox/onboarding/clients/api'
import userAPI from '@/io.ox/core/api/user'
import codes from '@/io.ox/onboarding/clients/codes'

import gt from 'gettext'

const COMPLEMENT = {

  stores: (function () {
    const prefix = ox.language.slice(0, 2).toUpperCase()
    const country = _.contains(['EN', 'DE', 'ES', 'FR'], prefix) ? prefix : 'EN'
    return {
      // stores
      macappstore: {
        name: gt('Mac App Store'),
        // #. %1$s: app store name
        description: gt('Get the App from %1$s.', gt('Mac App Store')),
        image: '@/themes/icons/default/appstore/Mac_App_Store_Badge_' + country + '_165x40.svg'
      },
      appstore: {
        name: gt('App Store'),
        // #. %1$s: app store name
        description: gt('Get the App from %1$s.', gt('App Store')),
        image: '@/themes/icons/default/appstore/App_Store_Badge_' + country + '_135x40.svg'
      },
      playstore: {
        name: gt('Google Play'),
        // #. %1$s: app store name
        description: gt('Get the App from %1$s', gt('Google Play')),
        image: '@/themes/icons/default/googleplay/google-play-badge_' + country + '.svg'
      },
      common: {
        description: gt('Download the application.')
      }
    }
  })(),

  actiontypes: {
    email: {
      description: gt('Get your device configured by email.')
    },
    download: {
      description: gt('iOS devices can be automatically configured by installing the configuration profile.')
    }
  },

  actions: {
    'link/mailappinstall': {
      // transparent placeholder; less variable defines url that is used for background image: '@onboarding-mailapp'
      imageplaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    },

    'link/driveappinstall': {
      // transparent placeholder; less variable defines url that is used for background image: '@onboarding-driveapp'
      imageplaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    }
  },

  order: {
    // os
    windows: 101,
    android: 102,
    apple: 103,
    // devices
    'windows.desktop': 101,
    'android.phone': 201,
    'android.tablet': 202,
    'apple.iphone': 301,
    'apple.ipad': 302,
    'apple.mac': 303,
    // data
    caldav_url: 401,
    caldav_login: 402,
    carddav_url: 403,
    carddav_login: 404,
    // imap
    imapServer: 411,
    imapPort: 412,
    imapLogin: 413,
    imapSecure: 414,
    // smtp
    smtpServer: 421,
    smtpPort: 422,
    smtpLogin: 423,
    smtpSecure: 424,
    // eas
    eas_url: 431,
    eas_login: 432
  },

  labels: {
    // card
    caldav: gt('CalDAV'),
    caldav_url: gt('URL'),
    caldav_login: gt('Login'),
    carddav: gt('CardDAV'),
    carddav_url: gt('URL'),
    carddav_login: gt('Login'),
    // imap
    imap: gt('IMAP'),
    imapServer: gt('Server Name'),
    imapPort: gt('Port'),
    imapLogin: gt('User Name'),
    imapSecure: gt('Connection'),
    // smtp
    smtp: gt('SMTP'),
    smtpServer: gt('Server Name'),
    smtpPort: gt('Port'),
    smtpLogin: gt('User Name'),
    smtpSecure: gt('Connection'),
    // eas
    eas: gt('EAS'),
    eas_url: gt('URL'),
    eas_login: gt('Login')
  },

  defaults: {
    platforms: {
      // bootstrap icons don't have brand icons (yet)
      android: { icon: 'fa-android' },
      apple: { icon: 'fa-apple' },
      windows: { icon: 'fa-windows' }
    },
    devices: {
      'android.phone': { icon: 'phone' },
      'android.tablet': { icon: 'tablet' },
      'apple.iphone': { icon: 'phone' },
      'apple.ipad': { icon: 'tablet' },
      'apple.mac': { icon: 'laptop' },
      'windows.phone': { icon: 'phone' },
      'windows.desktop': { icon: 'laptop' }
    },
    scenarios: {
      // combinations
      eassync: { icon: ['envelope', 'calendar', 'people'] },
      emclientinstall: { icon: ['envelope', 'calendar', 'people'] },
      // mail
      mailappinstall: { icon: 'envelope' },
      mailsync: { icon: 'envelope' },
      mailmanual: { icon: 'envelope' },
      // davs
      davsync: { icon: ['calendar', 'people'] },
      syncappinstall: { icon: ['calendar', 'people'] },
      davmanual: { icon: 'wrench' },
      // drive
      drivewindowsclientinstall: { icon: 'cloud' },
      driveappinstall: { icon: 'cloud' },
      drivemacinstall: { icon: 'cloud' }
    }
  }
}

function _cid (/* id,id,... */) {
  const SEP = '/'
  return Array.prototype.join.call(arguments, SEP)
}

function compactObject (o) {
  const clone = _.clone(o)
  _.each(clone, function (value, key) {
    if (!_.isSet(value)) delete clone[key]
  })
  return clone
}

function getIndexFor (obj) {
  return COMPLEMENT.order[obj.id] || 1000
}

const mobiledevice = (function () {
  if (_.device('android')) return _.device('smartphone') ? 'android.phone' : 'android.tablet'
  if (_.device('ios')) return _.device('smartphone') ? 'apple.iphone' : 'apple.ipad'
})()

const config = {

  hash: {},

  load () {
    return api.config(mobiledevice).then(function (data) {
      // reorder devices and scenarios
      data.platforms = _.sortBy(data.platforms, getIndexFor)
      data.devices = _.sortBy(data.devices, getIndexFor)
      // extend
      _.extend(this, data)
      // user inputs and step progress
      this.model = new Backbone.Model()
      // hash maps and defaults
      _('platforms,devices,scenarios,actions,matching'.split(',')).each(function (type) {
        // create hash maps
        const hash = this.hash[type] = _.toHash(data[type], 'id')
        // apply defaults (keep hash and list up-to-date)
        _.each(COMPLEMENT.defaults[type], function (value, key) {
          _.extend(hash[key], value, compactObject(hash[key]))
        })
      }, this)
      // lazy: get user data
      userAPI.getCurrentUser().then(function (data) {
        config.user = data.attributes
      })
      // return config
      return this
    }.bind(this))
  },

  getState () {
    return _.extend({}, this.model.attributes)
  },

  getScenarioCID () {
    return _cid(config.getDevice().id, this.model.get('scenario'))
  },

  // user states

  getPlatform () {
    if (this.platforms.length === 1) return this.platforms[0]
    return this.hash.platforms[this.model.get('platform')]
  },

  getDevice () {
    if (this.devices.length === 1) return this.devices[0]
    return this.hash.devices[this.model.get('device')]
  },

  getScenario () {
    return this.hash.scenarios[this.model.get('scenario')]
  },

  getAction () {
    return this.hash.actions[this.model.get('action')]
  },

  // all

  getPlatforms () {
    return this.platforms
  },

  getDevices () {
    const devices = this.devices
    const platform = this.getPlatform()
    if (platform) {
      // agreement: first part of device id matches platform id
      return _.filter(devices, function (obj) {
        return obj.id.split('.')[0] === platform.id
      })
    }
    return devices
  },

  getScenarios () {
    const device = this.getDevice()
    if (!device) return this.scenarios
    // respect order for device
    return _.map(device.scenarios, function (id) {
      const base = id.split('/')[1]
      return config.hash.scenarios[base]
    })
  },

  getActions (scenario) {
    const cid = _cid(config.getDevice().id, scenario || this.model.get('scenario'))
    const matching = this.hash.matching[cid]; let lasttype

    // TODO: remove after backend added check
    if (!matching) {
      if (ox.debug) console.error('undefined onboarding scenario: ' + cid)
      return
    }
    return _.chain(this.actions)
      .filter(function (obj) { return matching.actions.indexOf(obj.id) >= 0 })
      .sortBy(function (obj) { return matching.actions.indexOf(obj.id) })
      .map(function (obj) {
        // join and normalize
        const action = _.extend(_.pick(obj, 'id', 'default', 'data'), { scenario: cid }, obj[config.getDevice().id] || {})
        if (action.type) action.store = { type: action.type }
        action.type = obj.id.split('/')[0]
        return action
      })
      .each(function (action) {
        // add store information
        if (action.type === 'link') { _.extend(action.store, COMPLEMENT.stores[action.store.type] || {}) }
        _.extend(action, COMPLEMENT.actiontypes[action.type], COMPLEMENT.actions[action.id])
        // prepare properties
        if (action.type !== 'display') return
        action.data = _(Object.keys(action.data))
          .chain()
          .sortBy(function (key) { return COMPLEMENT.order[key] || 1000 })
          .map(function (key) {
            const type = key.indexOf('_') >= 0 ? key.split('_')[0] : key.substr(0, 4)
            const injectHeadline = lasttype !== type
            lasttype = type
            return [
              injectHeadline ? { name: COMPLEMENT.labels[type] || type } : undefined,
              {
                name: COMPLEMENT.labels[key] || key,
                value: /imapSecure|smtpSecure/.test(key) ? (action.data[key] ? 'SSL/TLS' : 'STARTTLS') : action.data[key],
                type
              }
            ]
          })
          .flatten()
          .compact()
          .value()
      })
      .value()
  },

  // user data helpers

  getUserMail () {
    const user = this.user
    if (!user) return
    return user.email1 || user.email2 || user.email3
  },

  getUserMobile () {
    const user = this.user
    if (!user) return
    return user.cellular_telephone1 || user.cellular_telephone2
  },

  getUserCountryCode () {
    const user = this.user
    if (!user) return
    // iso country code
    return user.locale.slice(3, 5).toUpperCase()
  },

  isIncomplete () {
    let complete = true
    _.each(this.hash, function (data) {
      complete = complete && !_.isEmpty(data)
    })
    return !complete
  },

  getCodes: codes.get,

  find: codes.find
}

export default config
