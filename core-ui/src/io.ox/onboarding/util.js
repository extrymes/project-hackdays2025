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

import Backbone from '@/backbone'

import { settings } from '@/io.ox/onboarding/settings'
import gt from 'gettext'

export const productNames = {
  mail: settings.get('productNames/mail', gt.pgettext('native app', 'OX Mail')),
  drive: settings.get('productNames/drive', gt.pgettext('native app', 'OX Drive'))
}

export const titles = {
  windows: {
    title: gt('Windows'),
    mailsync: gt('Mail'),
    addressbook: gt('Address Book'),
    calendar: gt('Calendar'),
    drive: productNames.drive
  },
  android: {
    title: gt('Android'),
    mailsync: gt('Mail'),
    mailapp: productNames.mail,
    addressbook: gt('Address Book'),
    calendar: gt('Calendar'),
    driveapp: productNames.drive,
    syncapp: gt('OX Sync App')
  },
  macos: {
    title: gt('macOS'),
    mailCalendarAddressbook: gt('Email, Contacts & Calendar'),
    mailsync: gt('Apple Mail'),
    addressbook: gt('Contacts'),
    calendar: gt('Calendar'),
    drive: productNames.drive
  },
  ios: {
    title: gt('iOS'),
    mailCalendarAddressbook: gt('Email, Contacts & Calendar'),
    mailsync: gt('iOS Mail'),
    mailapp: productNames.mail,
    addressbook: gt('Contacts'),
    calendar: gt('Calendar'),
    driveapp: productNames.drive,
    eassync: gt('EAS')
  }
}

export const platformList = new Backbone.Collection([
  {
    title: gt('Windows PC'),
    icon: 'bi/windows.svg',
    platform: 'windows'
  },
  {
    title: gt('Android phone or tablet'),
    icon: 'bi/android2.svg',
    platform: 'android'
  },
  {
    title: gt('macOS'),
    icon: 'bi/apple.svg',
    platform: 'macos'
  },
  {
    title: gt('iPhone or iPad'),
    icon: 'bi/apple.svg',
    platform: 'ios'
  }
])

export const appList = new Backbone.Collection([
  // Windows
  {
    title: gt('Mail'),
    icon: 'bi/envelope.svg',
    app: 'mailsync',
    platform: 'windows',
    cap: 'webmail'
  },
  {
    title: gt('Address Book'),
    icon: 'bi/people.svg',
    app: 'addressbook',
    platform: 'windows',
    cap: 'carddav'
  }, {
    title: gt('Calendar'),
    icon: 'bi/calendar.svg',
    app: 'calendar',
    platform: 'windows',
    cap: 'caldav'
  },
  {
    title: productNames.drive,
    icon: 'bi/cloud.svg',
    app: 'drive',
    platform: 'windows',
    cap: 'drive'
  },
  // Android
  {
    title: gt('Email with Android Mail'),
    icon: 'bi/envelope.svg',
    app: 'mailsync',
    platform: 'android',
    cap: 'webmail'
  },
  {
    // #. 1$s product name of mail application, e.g. OX Mail
    title: gt('Email with %1$s', productNames.mail),
    icon: 'bi/envelope.svg',
    app: 'mailapp',
    platform: 'android',
    cap: 'mobile_mail_app'
  },
  {
    title: gt('Address Book'),
    icon: 'bi/people.svg',
    app: 'addressbook',
    platform: 'android',
    cap: 'carddav'
  },
  {
    title: gt('Calendar'),
    icon: 'bi/calendar.svg',
    app: 'calendar',
    platform: 'android',
    cap: 'caldav'
  },
  {
    title: productNames.drive,
    icon: 'bi/cloud.svg',
    app: 'driveapp',
    platform: 'android',
    cap: 'drive'
  },
  {
    title: gt('Exchange Active Sync'),
    icon: 'bi/people.svg',
    app: 'eassync',
    platform: 'android',
    cap: 'active_sync'
  },
  {
    title: gt('OX Sync App'),
    icon: 'bi/people.svg',
    app: 'syncapp',
    platform: 'android',
    cap: 'carddav caldav'
  },
  // macOS
  {
    title: gt('Email, Contacts & Calendar'),
    icon: 'bi/star.svg',
    app: 'mailCalendarAddressbook',
    platform: 'macos',
    cap: 'webmail caldav carddav'
  },
  {
    title: gt('Email'),
    icon: 'bi/envelope.svg',
    app: 'mailsync',
    platform: 'macos',
    cap: 'webmail'
  },
  {
    title: gt('Contacts'),
    icon: 'bi/people.svg',
    app: 'addressbook',
    platform: 'macos',
    cap: 'carddav'
  },
  {
    title: gt('Calendar'),
    icon: 'bi/calendar.svg',
    app: 'calendar',
    platform: 'macos',
    cap: 'caldav'
  },
  {
    title: productNames.drive,
    icon: 'bi/cloud.svg',
    app: 'drive',
    platform: 'macos',
    cap: 'drive'
  },
  // iOS
  {
    title: gt('Email, Contacts & Calendar'),
    icon: 'bi/star.svg',
    app: 'mailCalendarAddressbook',
    platform: 'ios',
    cap: 'webmail caldav carddav'
  },
  {
    title: gt('Email'),
    icon: 'bi/envelope.svg',
    app: 'mailsync',
    platform: 'ios',
    cap: 'webmail'
  },
  {
    // #. 1$s product name of mail application, e.g. OX Mail
    title: gt('Email with %1$s', productNames.mail),
    icon: 'bi/envelope.svg',
    app: 'mailapp',
    platform: 'ios',
    cap: 'mobile_mail_app'
  },
  {
    title: gt('Contacts'),
    icon: 'bi/people.svg',
    app: 'addressbook',
    platform: 'ios',
    cap: 'carddav'
  },
  {
    title: gt('Calendar'),
    icon: 'bi/calendar.svg',
    app: 'calendar',
    platform: 'ios',
    cap: 'caldav'
  },
  {
    title: productNames.drive,
    icon: 'bi/cloud.svg',
    app: 'driveapp',
    platform: 'ios',
    cap: 'drive'
  },
  {
    title: gt('Exchange Active Sync'),
    icon: 'bi/people.svg',
    app: 'eassync',
    platform: 'ios',
    cap: 'active_sync'
  }
])

// hide specific apps by jslob setting
const appListHidden = settings.get('hidden/apps', ['syncapp'])
appList.remove(
  appList.filter(function (model) {
    return appListHidden.indexOf(model.get('app')) > -1
  })
)
