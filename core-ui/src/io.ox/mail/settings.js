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

import { Settings } from '@/io.ox/core/settings'

export const defaults = {
  removeDeletedPermanently: false,
  contactCollectOnMailTransport: false,
  contactCollectOnMailAccess: false,
  useFixedWidthFont: false,
  appendVcard: false,
  sendDispositionNotification: false,
  appendMailTextOnReply: true,
  forwardMessageAs: 'Inline',
  messageFormat: 'html',
  lineWrapAfter: '0',
  defaultSendAddress: '',
  allowHtmlMessages: true,
  allowHtmlImages: false,
  isColorQuoted: false,
  defaultSignature: false,
  defaultReplyForwardSignature: false,
  mobileSignature: undefined,
  // one of 'none', 'custom'
  mobileSignatureType: 'none',
  threadSupport: true,
  // for persistent sort
  sort: 'thread',
  order: 'desc',
  unread: false,
  notificationSoundName: 'bell',
  undoSendDelay: 5,
  undoSendDoneDelay: 2,
  playSound: true,
  confirmReplyToMailingLists: true,
  unseenMessagesFolder: true,
  flaggedMessagesFolder: true,
  showTextPreview: true,
  authenticity: {
    // none, fail, fail_trusted, fail_trusted_pass, all, silly
    level: 'fail_trusted',
    domains: ''
  },
  features: {
    flagging: {
      mode: 'color'
    },
    allowExternalSMTP: true
  },
  markAsRead: 'instant',
  autoSelectNewestSeenMessage: false,
  editRealName: true
}

export const settings = new Settings('io.ox/mail', () => defaults)

// shortcuts
settings.once('load', () => {
  settings.flagByColor = settings.get('features/flagging/mode', 'color') === 'color'
  settings.flagByStar = settings.get('features/flagging/mode') === 'star'
})
