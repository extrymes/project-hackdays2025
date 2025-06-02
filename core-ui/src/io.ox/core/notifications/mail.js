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

import capabilities from '@/io.ox/core/capabilities'
import $ from '@/jquery'
import ox from '@/ox'
import apps from '@/io.ox/core/api/apps'
import mailAPI from '@/io.ox/mail/api'
import folderAPI from '@/io.ox/core/folder/api'
import accountAPI from '@/io.ox/core/api/account'
import contactsAPI from '@/io.ox/contacts/api'
import Backbone from '@/backbone'
import { getDisplayName } from '@/io.ox/mail/util'
import { playAlarm } from '@/io.ox/core/notifications/audio'
import desktopNotifications from '@/io.ox/core/desktopNotifications'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import gt from 'gettext'

let lastCount = -1
const appBadge = !!navigator.setAppBadge

function onlySubscribedNonVirtual (model) {
  // ignore virtual/all (used by search, for example) and unsubscribed folders
  if (!model.get('subscribed') || (/^default0\/virtual/.test(model.id))) return false
  return /^default0\D/.test(model.id) && !accountAPI.is('spam|confirmed_spam|trash|unseen', model.id) && (folderAPI.getSection(model.get('type')) === 'private')
}

function diff (newMails, oldMails) {
  const hash = {}
  oldMails.forEach(model => { hash[_.cid(model.pick('folder_id', 'id'))] = true })
  return newMails.filter(item => !hash[_.cid(item)])
}

const unreadCount = (sum, model) => sum + (model && model.get('unread')) || 0

// sets an counter an the homescreen or tray icon (pwa)
function setAppBadge (count) {
  if (appBadge) navigator.setAppBadge(count)
}
function clearAppBadge () {
  if (appBadge) navigator.clearAppBadge()
}

export function getUnreadCount () {
  // get relevant folder models and sum up unread messages
  return _.chain(folderAPI.pool.models)
    .filter(onlySubscribedNonVirtual)
    .reduce(unreadCount, 0)
    .value()
}

export function getUnreadCountFromRampup () {
  const key = Object.keys(ox.rampup).find(key => key.startsWith('mail'))
  if (!key) return
  const result = ox.rampup[key].filter(mail => mail.flags === 0 || mail.flags === 16)
  return result.length
}

// update mailapp indicator dot and unread tooltip
const update = _.debounce(() => {
  const app = apps.get('io.ox/mail') || apps.get('io.ox/mail/placeholder')
  if (!app) return

  const inbox = folderAPI.pool.models['default0/INBOX']

  // get relevant folder models and sum up unread messages
  const count = inbox ? getUnreadCount() : getUnreadCountFromRampup()
  if (count !== lastCount) {
    mailAPI.trigger('count:unseen', count)
    lastCount = count
  }
  app.set('hasBadge', count > 0)

  if (count <= 0) clearAppBadge()
  // #. %1$d number of unread mails
  if (count > 0) {
    setAppBadge(count)
    return app.set('tooltip', gt('%1$d unread', count))
  }

  app.unset('tooltip')
}, 100)

// stores unread mail models
const unreadIds = new Backbone.Collection()

// new mail title and desktop notifications
// removes mails of a whole folder from notificationview
function removeFolder (folder) {
  unreadIds.remove(unreadIds.where({ folder_id: folder }))
}

export function registerUnreadIndicator () {
  folderAPI.on('change:unread', update)
  folderAPI.on('pool:add', update)

  // special add function to consider mails that might have been read elsewhere (didn't throw update:set-seen in appsuite)
  mailAPI.on('new-mail', (e, recent, unseen) => {
    const idsToRemove = _.difference(unreadIds.map(mail => mail.id), unseen.map(mail => mail.id))

    // remove ids that are no longer unread from the collection
    unreadIds.remove(idsToRemove)

    // trigger event for desktop notification. Done here to prevent code duplication (no need to maintain 2 collections)
    const newAdditions = diff(recent, unreadIds.models)
    if (newAdditions.length) mailAPI.trigger('new-mail-notification', newAdditions)

    unreadIds.add(recent)
    // no more unread mails
    if (unreadIds.length === 0) mailAPI.newMailTitle(false)
  })

  mailAPI.on('deleted-mails update:set-seen', (e, param) => {
    if (Array.isArray(param)) unreadIds.remove(param)
    else removeFolder(param)

    if (unreadIds.length === 0) mailAPI.newMailTitle(false)
  })
  mailAPI.checkInbox()
  update()
}

export function registerMailAudioAlarm () {
  ox.on('socket:mail:new', () => {
    // play sound
    if (mailSettings.get('playSound')) playAlarm({ type: 'newMail' })
  })
}

const iconPath = './themes/default/assets/fallback-image-contact.png' // fallback icon shown in desktop notification

// show desktopNotification (if enabled) for a new mail (totally not copied from old plugin code)
function showNotification (message) {
  // some mailservers do not send extra data like sender and subject, check this here
  let text = message.subject || gt('No subject')

  // Dovecot has extra field "teaser"
  if (message.teaser) text += '\n\n' + message.teaser
  // get email for picture halo
  let imageURL = message.email
    ? contactsAPI.pictureHalo(null, { email: message.email }, { urlOnly: true, width: 120, height: 120, scaleType: 'containforcedimension' })
    : iconPath
  // check if user has an image, otherwise use fallback image
  $(new Image()).attr('src', imageURL)
    .one('load error', function (e) {
    // use fallback image
      if (this.width === 1 || e.type === 'error') imageURL = iconPath

      desktopNotifications.show({
        title: message.displayname || message.email || gt('New mail'),
        body: text,
        icon: imageURL,
        onclick () {
          window.focus()
          ox.launch(() => import('@/io.ox/mail/main'), { folder: message.folder })
        }
      })
    })
}

async function handlePolledMails (e, newItems) {
  // if theres multiple items or no specific notification given, use the generic
  if (newItems.length > 1) {
    return desktopNotifications.show({
      title: gt('New mails'),
      body: gt('You have new mail'),
      icon: iconPath
    })
  }

  const data = await mailAPI.get({ ...newItems[0], unseen: true })
  const from = data.from || [['', '']]
  const message = {
    email: from[0][1],
    displayname: getDisplayName(from[0]),
    subject: data.subject || gt('No subject')
  }
  showNotification(message)
}
export function registerDesktopNotifications () {
  ox.on('socket:mail:new', showNotification)
  // external inboxes do not support sockets
  if (capabilities.has('websocket') && !mailSettings.get('notificationsForExternalInboxes', false)) return
  mailAPI.on('new-mail-notification', handlePolledMails)
}
