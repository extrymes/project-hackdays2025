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

import ox from '@/ox'
import gt from 'gettext'
import { settings as coreSettings } from '@/io.ox/core/settings'
import capabilities from '@/io.ox/core/capabilities'
import { hasFeature } from '@/io.ox/core/feature'

const baseShortcuts = {
  all: {
    'Show shortcut help': ['?'],
    'Focus search': ['/'],
    'Activate next floating window': ['Control+.']
    // 'Activate previous floating window': ['Control+,'] // FIXME: still buggy: does not reliably find the "previous" window
  },
  'Formatting mails': {
    Bold: ['CommandOrControl+b'],
    Italic: ['CommandOrControl+i'],
    Underline: ['CommandOrControl+u'],
    'Insert link': ['CommandOrControl+k']
  },
  navigation: {
    'Open Mail': ['Control+Alt+m'],
    'Open Calendar': ['Control+Alt+c'],
    'Open Address Book': ['Control+Alt+a'],
    'Open Tasks': ['Control+Alt+t'],
    'Open Drive': ['Control+Alt+d'],
    'Open Portal': ['Control+Alt+p'],
    'Open Settings': ['Control+Alt+s']
  },
  'io.ox/mail': {
    'New mail': ['c'],
    // 'Send mail': ['CommandOrControl+Enter'],
    'Open Inbox': ['g i'],
    'Open Sent': ['g t'],
    'Open Drafts': ['g d'],
    'Archive mail': ['a'],
    Reply: ['r'],
    'Reply all': ['Shift+r'],
    'Forward mail': ['f'],
    'Mark read': ['i'],
    // 'Mark unread': ['u'], // FIXME: still buggy: does not update mail list
    'Mark as spam': ['q'],
    'Mark as nospam': ['p']
  },
  'io.ox/calendar': {
    'New appointment': ['c'],
    'Save appointment': ['CommandOrControl+Enter'],
    'Day view': ['d'],
    'Week view': ['w'],
    'Month view': ['m'],
    'Year view': ['y'],
    'List view': ['l'],
    // 'Schedule view': ['A'],
    'Time period forward': ['n'],
    'Time period back': ['p'],
    Today: ['t']
    //    'Go To Date': ['G']
  },
  'io.ox/contacts': {
    'New contact': ['c'],
    'Save contact': ['CommandOrControl+Enter']
  },
  'io.ox/tasks': {
    'New task': ['c'],
    'Save task': ['CommandOrControl+Enter']
  // },
  // hidden: {
  //   'Toggle dark mode': ['CommandOrControl+Shift+D']
  }
}

const defaultShortcuts = {
  ...baseShortcuts
}

const gmailShortcuts = {
  ...baseShortcuts,
  all: {
    ...baseShortcuts.all
  },
  'io.ox/mail': {
    ...baseShortcuts['io.ox/mail'],
    'New mail': ['c'],
    'Archive mail': ['e'],
    // 'Mark mail as spam': ['!'], // FIXME: still buggy with international keyboard layouts
    'Reply all': ['a'],
    'Forward mail': ['f'],
    'Mark read': ['Shift+i']
    // 'Mark unread': ['Shift+u']
  },
  navigation: {
    ...baseShortcuts.navigation,
    'Open Mail': ['g m'],
    'Open Calendar': ['g a'],
    'Open Address Book': ['g c'], // FIXME: collides w/ "Compose mail"
    'Open Drive': ['g d'],
    'Open Portal': ['g p'],
    'Open Settings': ['g s'],
    'Open Tasks': ['g t']
  }
}

const outlookShortcuts = {
  ...baseShortcuts,
  navigation: {
    ...baseShortcuts.navigation
  },
  'io.ox/calendar': {
    ...baseShortcuts['io.ox/calendar'],
    'New appointment': ['n'],
    'Day view': ['Shift+Alt+1'],
    'Week view': ['Shift+Alt+3'],
    'Month view': ['Shift+Alt+4'],
    'Year view': ['Shift+Alt+5'],
    'List view': ['Shift+Alt+6'],
    'Time period forward': ['Shift+Right'],
    'Time period back': ['Shift+Left'],
    Today: ['Shift+ALT+y']
  },
  'io.ox/mail': {
    ...baseShortcuts['io.ox/mail'],
    'New mail': ['n'],
    'Archive mail': ['e'],
    'Forward mail': ['Control+f'],
    'Mark read': ['q']
    // 'Mark unread': ['u']
  },
  'io.ox/contacts': {
    ...baseShortcuts['io.ox/contacts'],
    'New contact': ['n']
  },
  'io.ox/tasks': {
    ...baseShortcuts['io.ox/tasks'],
    'New task': ['n']

  }
}

const disabledShortcuts = {
  'Formatting mails': baseShortcuts['Formatting mails']
}

export const shortcutsProfiles = {
  disabled: disabledShortcuts,
  default: defaultShortcuts,
  gmail: gmailShortcuts,
  outlook: outlookShortcuts
}

export const profileTranslations = {
  default: ox.serverConfig.productName,
  gmail: gt('Gmail'),
  outlook: gt('Outlook.com'),
  disabled: gt('Disable keyboard shortcuts')
}

export function getProfile (currentProfile = coreSettings.get('shortcutsProfile', 'default')) {
  const profile = shortcutsProfiles[currentProfile]

  if (!capabilities.has('calendar')) delete profile.navigation['Open Calendar']
  if (!capabilities.has('tasks')) delete profile.navigation['Open Tasks']
  if (!capabilities.has('webmail')) delete profile.navigation['Open Mail']
  if (!capabilities.has('contacts')) delete profile.navigation['Open Address Book']
  if (!capabilities.has('drive')) delete profile.navigation['Open Drive']
  if (!hasFeature('pe')) delete profile.navigation['Open Portal']

  if (currentProfile === 'gmail') delete profile.navigation['Open Address Book'] // FIXME: collides w/ "Compose mail"

  return profile
}

export function getScopes (currentProfile) {
  return Object.keys(getProfile(currentProfile))
}

export function getActionsByScope (currentProfile, scope) {
  return getProfile(currentProfile)[scope]
}

export const sectionTranslations = {
  all: gt('General shortcuts'),
  'Formatting mails': gt('Formatting mails'),
  navigation: gt('Navigation'),
  'io.ox/mail': gt.pgettext('app', 'Mail'),
  'io.ox/calendar': gt.pgettext('app', 'Calendar'),
  'io.ox/tasks': gt.pgettext('app', 'Tasks'),
  'io.ox/contacts': gt.pgettext('app', 'Address Book')
}

export const actionTranslations = {
  'Show shortcut help': gt('Show shortcut help'),
  'Focus search': gt('Focus search'),
  'Activate next floating window': gt('Activate next floating window'),
  'Activate previous floating window': gt('Activate previous floating window'),
  Bold: gt('Bold'),
  Italic: gt('Italic'),
  Underline: gt('Underline'),
  'Insert link': gt('Insert link'),
  'New mail': gt('New mail'),
  'Send mail': gt('Send mail'),
  'Open Inbox': gt('Open Inbox'),
  'Open Sent': gt('Open Sent'),
  'Open Drafts': gt('Open Drafts'),
  'Archive mail': gt('Archive mail'),
  'New appointment': gt('New appointment'),
  'Save appointment': gt('Save appointment'),
  'Day view': gt('Day view'),
  'Week view': gt('Week view'),
  'Month view': gt('Month view'),
  'Year view': gt('Year view'),
  'List view': gt('List view'),
  // 'Schedule view': gt('Schedule view'),
  'Time period forward': gt('Time period forward'),
  'Time period back': gt('Time period back'),
  Today: gt('Today'),
  // 'Go To Date': gt('Go To Date'),
  'New contact': gt('New contact'),
  'Save contact': gt('Save contact'),
  'New task': gt('New task'),
  'Save task': gt('Save task'),
  'Open Mail': gt('Open %1$s', gt.pgettext('app', 'Mail')),
  'Open Calendar': gt('Open %1$s', gt.pgettext('app', 'Calendar')),
  'Open Address Book': gt('Open %1$s', gt.pgettext('app', 'Address Book')),
  'Open Tasks': gt('Open %1$s', gt.pgettext('app', 'Tasks')),
  'Open Portal': gt('Open %1$s', gt.pgettext('app', 'Portal')),
  'Open Drive': gt('Open %1$s', gt.pgettext('app', 'Drive')),
  'Open Settings': gt('Open %1$s', gt('Settings')),
  'Mark as spam': gt('Mark mail as spam'),
  'Mark as nospam': gt('Mark mail as not spam'),
  Reply: gt('Reply to mail'),
  'Reply all': gt('Reply all'),
  'Mark read': gt('Mark read'),
  'Mark unread': gt('Mark unread'),
  'Forward mail': gt('Forward mail'),
  'Command center': gt('Command center')
}
