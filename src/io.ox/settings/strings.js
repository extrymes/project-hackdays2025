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
import ox from '@/ox'
import { addPages, setConfigurable, add, bulkAdd, st, addText, addExplanations } from '@/io.ox/settings/index'
import capabilities from '@/io.ox/core/capabilities'
import theming from '@/io.ox/core/theming/main'
import apps from '@/io.ox/core/api/apps'
import appcontrol from '@/io.ox/core/main/appcontrol'
import folderAPI from '@/io.ox/core/folder/api'
import { getGabId } from '@/io.ox/contacts/util'
import { hasFeature, userCanToggleFeature, getTogglePath } from '@/io.ox/core/feature'

import { settings } from '@/io.ox/core/settings'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import { settings as calendarSettings } from '@/io.ox/calendar/settings'
import { settings as contactsSettings } from '@/io.ox/contacts/settings'
import { settings as filesSettings } from '@/io.ox/files/settings'

import gt from 'gettext'

//
// Apps
//

setConfigurable({
  ACCOUNTS: capabilities.has('webmail') && !capabilities.has('guest'),
  MAIL: capabilities.has('webmail'),
  CALENDAR: capabilities.has('calendar'),
  CONTACTS: capabilities.has('contacts'),
  TASKS: capabilities.has('tasks'),
  DRIVE: capabilities.has('infostore'),
  GROUPS: capabilities.has('edit_group gab'),
  RESOURCES: capabilities.has('edit_resource'),
  GDPR: capabilities.has('dataexport')
})

addPages({
  GENERAL: [gt('General'), 'io.ox/core'],
  NOTIFICATIONS: [gt('Notifications'), 'notifications'],
  SECURITY: [gt('Security & Privacy'), 'security'],
  ACCOUNTS: [gt('Accounts'), 'io.ox/settings/accounts'],
  MAIL: [gt.pgettext('app', 'Mail'), 'io.ox/mail'],
  CALENDAR: [gt.pgettext('app', 'Calendar'), 'io.ox/calendar'],
  CONTACTS: [gt.pgettext('app', 'Address Book'), 'io.ox/contacts'],
  DRIVE: [gt.pgettext('app', 'Drive'), 'io.ox/files'],
  PORTAL: [gt.pgettext('app', 'Portal'), 'io.ox/portal'],
  RESOURCES: [gt('Resources'), 'administration/resources'],
  GROUPS: [gt('Groups'), 'administration/groups'],
  GDPR: [gt('Download your personal data'), 'personaldata']
})

// tasks have no own page but we need the app name for consistency
addText('TASKS', gt.pgettext('app', 'Tasks'))

//
// General
//

const isThemeConfigurable = !_.device('smartphone') && theming.supportsPicker()
const availableApps = apps.getAvailableApps()
const isAutoStartConfigurable = settings.isConfigurable('autoStart') && !capabilities.has('guest') && availableApps.length > 2
const isQuickLaunchConfigurable = settings.isConfigurable('apps/quickLaunch') && appcontrol.getQuickLauncherCount() !== 0 && !_.device('smartphone')
const isAppConfigurable = isAutoStartConfigurable && isQuickLaunchConfigurable
const isLanguageConfigurable = settings.isConfigurable('language')
const isTimezoneConfigurable = settings.isConfigurable('timezone')
const isShortcutsConfigurable = hasFeature('shortcuts')

setConfigurable({
  THEME: isThemeConfigurable,
  ACCENT_COLORS: isThemeConfigurable,
  BACKGROUNDS: isThemeConfigurable,
  START_APP: isAppConfigurable,
  SHORTCUTS: isShortcutsConfigurable,
  LANGUAGE_TIMEZONE: isLanguageConfigurable || isTimezoneConfigurable,
  LANGUAGE: isLanguageConfigurable,
  TIMEZONE: isTimezoneConfigurable,
  REFRESH: settings.isConfigurable('refreshInterval'),
  CHANGE_PASSWORD: capabilities.has('edit_password'),
  MANAGE_CATEGORIES: settings.get('features/categories', false),
  MANAGE_DEPUTIES: capabilities.has('deputy')
})

bulkAdd(st.GENERAL, '', {
  THEME: [gt('Theme'), 'io.ox/core [data-section="io.ox/settings/general/theme"]', 1],
  LANGUAGE_TIMEZONE: [gt('Language & Time zone'), 'io.ox/core [data-section="io.ox/settings/general/language"]', 2],
  START_APP: [gt('Start app & Quick launch bar'), 'io.ox/core [data-section="io.ox/settings/general/apps"]'],
  SHORTCUTS: [gt('Keyboard shortcuts'), 'io.ox/core [data-section="io.ox/settings/general/shortcuts"]'],
  GENERAL_ADVANCED: [gt('Advanced settings'), 'io.ox/core [data-section="io.ox/settings/general/advanced"]']
})

bulkAdd(st.GENERAL, st.SHORTCUTS, {
  SHORTCUT_PROFILE: [gt('Shortcut profile'), 'io.ox/core [name="profile"]', 1]
})

bulkAdd(st.GENERAL, st.THEME, {
  ACCENT_COLORS: [gt('Accent colors'), 'io.ox/core .theming-form-accent-colors .first-header', 1],
  BACKGROUNDS: [gt('Backgrounds'), 'io.ox/core .theming-form-background-title', 1]
})

bulkAdd(st.GENERAL, st.LANGUAGE_TIMEZONE, {
  LANGUAGE: [gt('Language'), 'io.ox/core [name="language"]', 1],
  CUSTOM_LOCALE: [gt('Customize date and time formats'), 'io.ox/core #regional-settings'],
  TIMEZONE: [gt('Time zone'), 'io.ox/core #settings-timezone', 1]
})

bulkAdd(st.GENERAL, st.START_APP, {
  START_WITH: [gt('Start with'), 'io.ox/core [name="autoStart"]'],
  QUICK_LAUNCH_BAR: [gt('Configure quick launch bar'), 'io.ox/core [data-action="configure-quick-launchers"]']
})

bulkAdd(st.GENERAL, st.GENERAL_ADVANCED, {
  REFRESH: [gt('Look for new data every'), 'io.ox/core [name="refreshInterval"]'],
  CHANGE_PASSWORD: [gt('Change password'), 'io.ox/core [data-action="edit-password"]'],
  MANAGE_CATEGORIES: [gt('Manage categories'), 'io.ox/core [data-name="categories"]'],
  MANAGE_DEPUTIES: [gt('Manage deputies'), 'io.ox/core [data-action="manage-deputies"]']
})

addExplanations({
  THEME: gt('Personalize the general appearance'),
  LANGUAGE_TIMEZONE: gt('Language, date formats, and time zone'),
  SHORTCUTS: gt('Configure your keyboard shortcut profile'),
  START_APP: gt('Define your favorite apps')
})

//
// Notifications
//

const sounds = !_.device('smartphone') && (capabilities.has('websocket') || ox.debug)
const countdown = userCanToggleFeature('countdown')

setConfigurable({
  NOTIFICATIONS_BIRTHDAYS: capabilities.has('contacts'),
  NOTIFICATIONS_MAIL: sounds,
  SOUND_MAIL_INCOMING: sounds,
  SOUND_MAIL_INCOMING_NAME: sounds,
  COUNTDOWN: countdown,
  COUNTDOWN_SHOW: countdown,
  COUNTDOWN_MEETINGS_ONLY: countdown,
  COUNTDOWN_LEADTIME: countdown
})

bulkAdd(st.NOTIFICATIONS, '', {
  DESKTOP_NOTIFICATIONS: [gt('Desktop notifications'), 'notifications [data-section="io.ox/settings/notifications/desktop"]', 2],
  NOTIFICATION_AREA: [gt('Notification area'), 'notifications [data-section="io.ox/settings/notifications/area"]'],
  NOTIFICATIONS_MAIL: [st.MAIL, 'notifications [data-section="io.ox/settings/notifications/mail"]'],
  NOTIFICATIONS_CALENDAR: [st.CALENDAR, 'notifications [data-section="io.ox/settings/notifications/calendar"]'],
  NOTIFICATIONS_TASKS: [st.TASKS, 'notifications [data-section="io.ox/settings/notifications/tasks"]']
})

bulkAdd(st.NOTIFICATIONS, st.NOTIFICATION_AREA, {
  NOTIFICATIONS_AUTOOPEN: [gt('Automatically open the notification area when there are new reminders'), 'notifications [name="autoOpenNewReminders"]'],
  NOTIFICATIONS_BIRTHDAYS: [gt('Show birthdays in notification area'), 'notifications [name="showBirthdayNotifications"]']
})

bulkAdd(st.NOTIFICATIONS, st.NOTIFICATIONS_MAIL, {
  SOUND_MAIL_INCOMING: [gt('Play sound on incoming mail'), 'notifications [name="playSound"]'],
  SOUND_MAIL_INCOMING_NAME: [gt('Sound'), 'notifications [name="notificationSoundName"]']
})

bulkAdd(st.NOTIFICATIONS, st.NOTIFICATIONS_CALENDAR, {
  // countdown
  COUNTDOWN: [gt('Countdown'), 'notifications .countdown-settings', 2],
  COUNTDOWN_SHOW: [gt('Show countdown for upcoming appointments'), `notifications [name="${getTogglePath('countdown')}"]`, 2],
  COUNTDOWN_MEETINGS_ONLY: [gt('Restrict to appointments that have multiple participants or a link to join online meetings'), 'notifications [name="countdown/meetingsOnly"]'],
  COUNTDOWN_LEADTIME: [gt('Start countdown'), 'notifications [name="countdown/leadTime"]'],
  // email notifications
  CALENDAR_NOTIFY_MODIFY: [gt('Receive notifications when an appointment in which you participate is created, modified or deleted'), 'notifications .calendar-email-notifications [name="notifyNewModifiedDeleted"]'],
  CALENDAR_NOTIFY_DECLINED_CREATOR: [gt('Receive notification as appointment creator when participants accept or decline'), 'notifications .calendar-email-notifications [name="notifyAcceptedDeclinedAsCreator"]'],
  CALENDAR_NOTIFY_DECLINED_PARTICIPANT: [gt('Receive notification as appointment participant when other participants accept or decline'), 'notifications .calendar-email-notifications [name="notifyAcceptedDeclinedAsParticipant"]'],
  CALENDAR_DELETE_INVITATION_AFTER_ACTION: [gt('Automatically delete the invitation email after the appointment has been accepted or declined'), 'notifications .calendar-email-notifications [name="deleteInvitationMailAfterAction"]']
})

bulkAdd(st.NOTIFICATIONS, st.NOTIFICATIONS_TASKS, {
  TASKS_NOTIFY_MODIFY: [gt('Receive notifications when a task in which you participate is created, modified or deleted'), 'notifications .tasks-email-notifications [name="notifyNewModifiedDeleted"]'],
  TASKS_NOTIFY_DECLINED_CREATOR: [gt('Receive notifications when a participant accepted or declined a task created by you'), 'notifications .tasks-email-notifications [name="notifyAcceptedDeclinedAsCreator"]'],
  TASKS_NOTIFY_DECLINED_PARTICIPANT: [gt('Receive notifications when a participant accepted or declined a task in which you participate'), 'notifications .tasks-email-notifications [name="notifyAcceptedDeclinedAsParticipant"]']
})

addExplanations({
  DESKTOP_NOTIFICATIONS: gt('Use native desktop notifications'),
  NOTIFICATION_AREA: gt('Configure the notification area'),
  NOTIFICATIONS_MAIL: gt('Notifications related to email'),
  NOTIFICATIONS_CALENDAR: gt('Notifications related to appointments'),
  NOTIFICATIONS_TASKS: gt('Notifications related to tasks')
})

//
// Security
//

const externalImages = capabilities.has('webmail') && !capabilities.has('guest')
const autoLogout = settings.isConfigurable('autoLogout')

setConfigurable({
  TWO_STEP: capabilities.has('multifactor && multifactor_service && !anonymous'),
  APP_PASSWORDS: capabilities.has('app_passwords'),
  EXTERNAL_IMAGES: externalImages,
  SECURITY_ADVANCED: autoLogout,
  EXTERNAL_IMAGES_ALLOW_LIST: mailSettings.isConfigurable('features/trusted/user')
})

bulkAdd(st.SECURITY, '', {
  SESSIONS: [gt('Your devices'), 'security [data-section="io.ox/settings/security/sessions"]', 2],
  TWO_STEP: [gt('Two-step verification'), 'security [data-section="io.ox/settings/security/multifactor"]', 2],
  APP_PASSWORDS: [gt('Application Passwords'), 'security [data-section="io.ox/settings/security/passwords"]'],
  EXTERNAL_IMAGES: [gt('External images in emails'), 'security [data-section="io.ox/settings/security/images"]', 2],
  SECURITY_ADVANCED: [gt('Advanced settings'), 'security [data-section="io.ox/settings/security/advanced"]']
})

bulkAdd(st.SECURITY, st.EXTERNAL_IMAGES, {
  EXTERNAL_IMAGES_ALLOW_LIST: [gt('Always show external images for the following senders'), 'security [name="features/trusted/user"]', 2]
})

bulkAdd(st.SECURITY, st.SECURITY_ADVANCED, {
  AUTO_LOGOUT: [gt('Automatic sign out'), 'security [name="autoLogout"]']
})

addExplanations({
  SESSIONS: gt('See which devices are currently signed in'),
  TWO_STEP: gt('Add an extra layer of security to your account'),
  APP_PASSWORDS: gt('Create additional passwords with limited access'),
  EXTERNAL_IMAGES: gt('Restrict showing external images to reduce tracking')
})

//
// Accounts
//

setConfigurable({
  SUBSCRIPTIONS: capabilities.has('subscription'),
  EXTERNAL_APPS: capabilities.has('oauth-grants')
})

bulkAdd(st.ACCOUNTS, '', {
  SUBSCRIPTIONS: [gt('Subscriptions'), 'io.ox/settings/accounts [data-section="io.ox/settings/accounts/subscriptions"]'],
  EXTERNAL_APPS: [gt('External Apps'), 'io.ox/settings/accounts [data-section="io.ox/settings/accounts/external"]']
})

add({
  id: 'YOUR_ACCOUNTS',
  page: st.ACCOUNTS,
  text: gt('Your Accounts'),
  section: gt('Your Accounts'),
  selector: 'io.ox/settings/accounts [data-section="io.ox/settings/accounts/list"]'
})

addExplanations({
  YOUR_ACCOUNTS: gt('Manage your accounts'),
  SUBSCRIPTIONS: gt('Manage subscriptions of external data'),
  EXTERNAL_APPS: gt('Manage applications that can access your data')
})

//
// Mail
//

setConfigurable({
  LAYOUT: !_.device('smartphone'),
  SHOW_TEXT_PREVIEW: settings.get('features/textPreview', true),
  UNSEEN_FOLDER: (mailSettings.get('features/unseenFolder') && mailSettings.isConfigurable('unseenMessagesFolder')) || ox.debug,
  FLAGGED_FOLDER: (mailSettings.get('features/flagging/virtualFolder') && mailSettings.isConfigurable('flaggedMessagesFolder')) || ox.debug,
  MESSAGE_FORMAT: !_.device('smartphone') && !capabilities.has('guest') && mailSettings.isConfigurable('messageFormat'),
  DEFAULT_STYLE: !_.device('smartphone'),
  UNDO_SEND: hasFeature('undoSend'),
  COLLECT_ON_SEND: capabilities.has('collect_email_addresses'),
  COLLECT_ON_READ: capabilities.has('collect_email_addresses'),
  INBOX_CATEGORIES: !_.device('smartphone') && capabilities.has('mail_categories'),
  TEMPLATES: hasFeature('templates')
})

bulkAdd(st.MAIL, '', {
  READING: [gt('Reading'), 'io.ox/mail [data-section="io.ox/mail/settings/reading"]'],
  SIGNATURES: [gt('Signatures'), 'io.ox/mail [data-section="io.ox/mail/settings/signatures"]'],
  COMPOSE_REPLY: [gt('Compose & Reply'), 'io.ox/mail [data-section="io.ox/mail/settings/compose"]'],
  RULES: [gt('Rules'), 'io.ox/mail [data-section="io.ox/mail/settings/rules"]'],
  MAIL_ADVANCED: [gt('Advanced settings'), 'io.ox/mail [data-section="io.ox/mail/settings/advanced"]']
})

add({
  id: 'TEMPLATES',
  page: st.MAIL,
  text: gt('Templates'),
  section: gt('Templates'),
  selector: 'io.ox/mail [data-section="io.ox/mail/settings/templates"]'
})

bulkAdd(st.MAIL, st.READING, {
  LAYOUT: [gt('Layout'), 'io.ox/mail [name="layout"]', 2],
  MESSAGE_LIST: [gt('Message list'), 'io.ox/mail [name="listViewLayout"]', 2],
  SHOW_TEXT_PREVIEW: [gt('Show text preview'), 'io.ox/mail [name="showTextPreview"]', 2],
  COLOR_QUOTES: [gt('Show quoted text in different color'), 'io.ox/mail [name="isColorQuoted"]', 2],
  EXACT_DATES: [gt('Always show full date and time'), 'io.ox/mail [name="exactDates"]'],
  SHOW_SIZE: [gt('Show message size'), 'io.ox/mail [name="alwaysShowSize"]'],
  UNSEEN_FOLDER: [gt('Show folder "Unseen" that lists all unread messages'), 'io.ox/mail [name="unseenMessagesFolder"]'],
  FLAGGED_FOLDER: [gt('Show folder "Flagged" that lists all flagged messages'), 'io.ox/mail [name="flaggedMessagesFolder"]'],
  INBOX_CATEGORIES: [gt('Inbox categories'), 'io.ox/mail [data-action="edit-inbox-categories"]'],
  MARK_READ: [gt('Mark as read'), 'io.ox/mail [name="markAsRead"]', 2]
})

addText('READING_PANE', gt('Reading pane'))
addText('SPECIAL_FOLDERS', gt('Special folders'))
addText('INBOX_CATEGORIES_BUTTON', gt('Configure inbox categories ...'))

bulkAdd(st.MAIL, st.COMPOSE_REPLY, {
  DEFAULT_SENDER: [gt('Default sender address'), 'io.ox/mail [name="defaultSendAddress"]', 2],
  MESSAGE_FORMAT: [gt('Message format'), 'io.ox/mail [name="messageFormat"]', 2],
  DEFAULT_STYLE: [gt('Default text style'), 'io.ox/mail .default-text-style', 2],
  UNDO_SEND: [gt('Undo send'), 'io.ox/mail [name="undoSendDelay"]', 2]
})

bulkAdd(st.MAIL, st.RULES, {
  VACATION_NOTICE: [gt('Vacation notice'), 'io.ox/mail [data-section="io.ox/mail/settings/rules"]', 2],
  AUTO_FORWARD: [gt('Auto forward'), 'io.ox/mail [data-section="io.ox/mail/settings/rules"]', 2]
})

bulkAdd(st.MAIL, st.MAIL_ADVANCED, {
  DISPLAY_HTML: [gt('Allow displaying HTML formatted emails'), 'io.ox/mail [name="allowHtmlMessages"]'],
  FIXED_WIDTH_FONT: [gt('Use fixed-width font for plain text mails'), 'io.ox/mail [name="useFixedWidthFont"]'],
  READ_RECEIPTS: [gt('Show requests for read receipts'), 'io.ox/mail [name="sendDispositionNotification"]'],
  REMOVE_PERMANENTLY: [gt('Permanently remove deleted emails'), 'io.ox/mail [name="removeDeletedPermanently"]'],
  AUTO_SELECT_NEWEST: [gt('Select newest read message automatically at start'), 'io.ox/mail [name="autoSelectNewestSeenMessage"]'],
  COLLECT_ON_SEND: [gt('Automatically collect contacts in the folder "Collected addresses" while sending'), 'io.ox/mail [name="contactCollectOnMailTransport"]'],
  COLLECT_ON_READ: [gt('Automatically collect contacts in the folder "Collected addresses" while reading'), 'io.ox/mail [name="contactCollectOnMailAccess"]'],
  MAILTO_HANDLER: [gt('Ask for mailto link registration'), 'io.ox/mail [name="features/registerProtocolHandler"]'],
  APPEND_TEXT_ON_REPLY: [gt('Insert the original email text to a reply'), 'io.ox/mail [name="appendMailTextOnReply"]'],
  ASK_BEFORE_MAILING_LIST: [gt('Ask before replying to a mailing list'), 'io.ox/mail [name="confirmReplyToMailingLists"]'],
  FORWARD_AS: [gt('Forward emails as'), 'io.ox/mail [name="forwardMessageAs"]'],
  ATTACH_VCARD: [gt('Always attach my detailed contact data as vCard'), 'io.ox/mail [name="appendVcard"]'],
  AUTO_BCC: [gt('Always add the following recipient to blind carbon copy (BCC)'), 'io.ox/mail [name="autobcc"]'],
  IMAP_SUBSCRIPTIONS: [gt('Change IMAP subscriptions'), 'io.ox/mail [data-action="change-image-supscriptions"]']
})

addExplanations({
  READING: gt('Adjust how you read your emails'),
  SIGNATURES: gt('Add your contact details and important information automatically'),
  COMPOSE_REPLY: gt('Define message format, default text style, undo send'),
  TEMPLATES: gt('Add frequent parts as templates to save time'),
  RULES: gt('Define rules for handling incoming emails')
})

//
// Calendar
//

setConfigurable({
  ADDITIONAL_TIMEZONES: !_.device('smartphone'),
  BIRTHDAY_CALENDAR: capabilities.has('calendar_birthdays'),
  CATEGORY_COLOR_FOR_APPOINTMENTS: settings.get('features/categories', false),
  SHOW_PAST_REMINDERS: calendarSettings.isConfigurable('showPastReminders'),
  SHARE_FREE_BUSY: hasFeature('freeBusyVisibility')
})

bulkAdd(st.CALENDAR, '', {
  CALENDAR_VIEW: [gt('Your week'), 'io.ox/calendar [data-section="io.ox/calendar/settings/view"]'],
  APPOINTMENT_REMINDERS: [gt('Appointment reminders'), 'io.ox/calendar [data-section="io.ox/calendar/settings/reminders"]'],
  ADDITIONAL_TIMEZONES: [gt('Additional time zones'), 'io.ox/calendar [data-section="io.ox/calendar/settings/timezones"]'],
  CALENDAR_ADVANCED: [gt('Advanced settings'), 'io.ox/calendar [data-section="io.ox/calendar/settings/advanced"]']
})

bulkAdd(st.CALENDAR, st.CALENDAR_VIEW, {
  WORKWEEK_START: [gt('First day'), 'io.ox/calendar [name="workweekStart"]', 2],
  WORKWEEK_LENGTH: [gt('Length'), 'io.ox/calendar [name="numDaysWorkweek"]', 2],
  WORKING_TIME_START: [gt('Start'), 'io.ox/calendar [name="startTime"]', 2],
  WORKING_TIME_END: [gt('End'), 'io.ox/calendar [name="endTime"]', 2],
  TIME_SCALE: [gt('Time scale'), 'io.ox/calendar [name="interval"]']
})

bulkAdd(st.CALENDAR, st.APPOINTMENT_REMINDERS, {
  REMINDER_DEFAULT: [gt('Default reminder'), 'io.ox/calendar [data-action="chronos/defaultAlarmDateTime"]'],
  REMINDER_ALLDAY: [gt('Default reminder for all day appointments'), 'io.ox/calendar [data-action="chronos/defaultAlarmDate"]'],
  REMINDER_BIRTHDAY: [gt('Default reminder for birthdays'), 'io.ox/calendar [data-action="birthdays/defaultAlarmDate"]']
})

bulkAdd(st.CALENDAR, st.CALENDAR_ADVANCED, {
  BIRTHDAY_CALENDAR: [gt('Show birthday calendar'), 'io.ox/calendar [name="birthday"]'],
  CATEGORY_COLOR_FOR_APPOINTMENTS: [gt('Use first category color for appointments'), 'io.ox/calendar [name="categoryColorAppointments"]'],
  SHOW_PAST_REMINDERS: [gt('Show reminders for past appointments'), 'io.ox/calendar [name="showPastReminders"]'],
  AUTO_APPLY_APPOINTMENT_CHANGES: [gt('Automatically apply appointment changes received via email to your calendar'), 'io.ox/calendar [name="chronos/autoProcessIMip"]'],
  SHARE_FREE_BUSY: [gt('Show free/busy information to others'), 'io.ox/calendar [name="chronos/freeBusyVisibility"]']
})

addExplanations({
  CALENDAR_VIEW: gt('Working time & workweek'),
  APPOINTMENT_REMINDERS: gt('Let reminders help you not to miss appointments'),
  ADDITIONAL_TIMEZONES: gt('A time saver if you live or work in more than one time zone')
})

//
// Contacts
//

setConfigurable({
  MAP_SERVICE: contactsSettings.isConfigurable('mapService'),
  START_IN_GAB: capabilities.has('gab !alone') && settings.isConfigurable('startInGlobalAddressbook'),
  // dialog serves multiple purposes, manage sync via carddav (all folder types) or subscribe/unsubscribe shared or public folders
  SUBSCRIBE_ADDRESSBOOK: capabilities.has('edit_public_folders || read_create_shared_folders || carddav')
})

bulkAdd(st.CONTACTS, '', {
  CONTACTS_VIEW: [gt('Names & Addresses'), 'io.ox/contacts [data-section="io.ox/contacts/settings/view'],
  CONTACTS_ADVANCED: [gt('Advanced settings'), 'io.ox/contacts [data-section="io.ox/contacts/settings/advanced']
})

bulkAdd(st.CONTACTS, st.CONTACTS_VIEW, {
  NAME_FORMAT: [gt('Names'), 'io.ox/contacts [name="fullNameFormat"]', 2],
  MAP_SERVICE: [gt('Link postal addresses with map service'), 'io.ox/contacts [name="mapService"]', 2]
})

bulkAdd(st.CONTACTS, st.CONTACTS_ADVANCED, {
  SUBSCRIBE_ADDRESSBOOK: [gt('Subscribe to shared address books'), 'io.ox/contacts [data-action="subscribe-shared-address-books"]']
})

folderAPI.get(getGabId()).then(result => {
  const text = result.title === 'Global address book'
    ? gt('Start in global address book')
    // #. %1$s is the name of the global address book, default: All Users
    : gt('Start in "%1$s" address book', result.title)
  bulkAdd(st.CONTACTS, st.CONTACTS_ADVANCED, {
    START_IN_GAB: [text, 'io.ox/contacts [name="startInGlobalAddressbook"]']
  })
})

addExplanations({
  CONTACTS_VIEW: gt('Define name format and map service')
})

//
// Drive
//

const autoDeleteVersions = capabilities.has('autodelete_file_versions')

setConfigurable({
  HIDDEN_FILES: filesSettings.isConfigurable('showHidden'),
  FILE_VERSION_HISTORY: autoDeleteVersions,
  VERSION_RETENTION: autoDeleteVersions,
  VERSION_LIMIT: autoDeleteVersions
})

bulkAdd(st.DRIVE, '', {
  ADDING_FILES: [gt('Adding files'), 'io.ox/files [data-section="io.ox/files/settings/add'],
  DRIVE_ADVANCED: [gt('Advanced settings'), 'io.ox/files [data-section="io.ox/files/settings/advanced']
})

bulkAdd(st.DRIVE, st.ADDING_FILES, {
  IDENTICAL_NAMES: [gt('What should happen when adding files with identical names?'), 'io.ox/files [name="uploadHandling"]']
})

bulkAdd(st.DRIVE, st.DRIVE_ADVANCED, {
  HIDDEN_FILES: [gt('Show hidden files and folders'), 'io.ox/files [name="showHidden"]'],
  AUTOPLAY_MODE: [gt('Slideshow for images'), 'io.ox/files [name="autoplayLoopMode"]'],
  AUTOPLAY_PAUSE: [gt('Duration per image'), 'io.ox/files [name="autoplayPause"]'],
  FILE_VERSION_HISTORY: [gt('File version history'), 'io.ox/files .file-version-history'],
  VERSION_RETENTION: [gt('Version retention period'), 'io.ox/files [name="features/autodelete/retentionDays"]'],
  VERSION_LIMIT: [gt('Maximum version count'), 'io.ox/files [name="features/autodelete/maxVersions"]']
})

addExplanations({
  ADDING_FILES: gt('How to resolve name conflicts')
})

//
// Portal
//

bulkAdd(st.PORTAL, '', {
  PORTAL_WIDGETS: [gt('Portal Widgets'), 'io.ox/portal [data-section="io.ox/portal/settings/widgets'],
  PORTAL_ADVANCED: [gt('Advanced settings'), 'io.ox/portal [data-section="io.ox/files/portal/advanced']
})

bulkAdd(st.PORTAL, st.PORTAL_WIDGETS, {
  ADD_WIDGET: [gt('Add widget'), 'io.ox/portal .add-widget']
})

bulkAdd(st.PORTAL, st.PORTAL_ADVANCED, {
  REDUCE_TO_SUMMARY: [gt('Reduce to widget summary on smartphones'), 'io.ox/portal [name="mobile/summaryView"]']
})

addExplanations({
  PORTAL_WIDGETS: gt('Add, remove, and reorder your portal widgets')
})

//
// GDPR
//

bulkAdd(st.GDPR, '', {
  REQUEST_DOWNLOAD: [gt('Request download'), 'personaldata .personal-data-view']
})

// forward the two utility functions so that other modules import strings instead of index
export { st, isConfigurable } from '@/io.ox/settings/index'
