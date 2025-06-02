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
import { Action } from '@/io.ox/backbone/views/actions/util'
import api from '@/io.ox/mail/api'
import * as util from '@/io.ox/mail/util'
import filesAPI from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'
import print from '@/io.ox/core/print'
import account from '@/io.ox/core/api/account'
import yell from '@/io.ox/core/yell'
import viewerTypes from '@/io.ox/core/viewer/views/types/typesutil'
import apps from '@/io.ox/core/api/apps'
import flagPicker from '@/io.ox/core/tk/flag-picker'
import checks from '@/io.ox/mail/compose/checks'
import registry from '../core/main/registry'

import gt from 'gettext'
import { settings } from '@/io.ox/mail/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import saveAsPDF from '@/io.ox/mail/actions/saveAsPdf'

import Collection from '@/io.ox/core/collection'

Action('io.ox/mail/actions/compose', {
  capabilities: '!guest',
  action (baton) {
    let button
    if (_.device('smartphone')) {
      button = $(baton.e.currentTarget)
      button.addClass('disabled').prop('disabled', true)
    }
    registry.call('io.ox/mail/compose', 'open', null, { folderId: baton.folderId || baton.app.folder.get() })
      .then(() => button && button.removeClass('disabled').prop('disabled', false))
  }
})

export function matchesReply (baton) {
  // multiple selection
  if (baton.selection?.length > 1) return
  // multiple and not a thread?
  if (baton.collection.has('multiple') && !baton.isThread) return
  // get first mail
  const data = baton.first()
  // has sender? and not a draft mail
  return util.hasFrom(data) && !isDraftMail(data)
}

function isDraftMail (mail) {
  return isDraftFolder(mail.folder_id) || ((mail.flags & 4) > 0)
}

function isDraftFolder (folderId) {
  return _.contains(account.getFoldersByType('drafts'), folderId)
}

export function reply (mode) {
  return async function (baton) {
    const app = apps.get('io.ox/mail')
    const data = baton.first()
    const threadView = app.threadView
    // get the current model from threadView to get the current state (don't know, has blocked images, images shown)
    const threadViewModel = threadView ? threadView.collection.get(_.cid(data)) : undefined
    const type = await checks.replyToMailingList(_.cid(data), mode, data)
    let excludeImages

    try {
      excludeImages = await checks.composeWithoutExternalImages(data, threadViewModel)
    } catch (error) {
      // user pressed cancel
      return
    }

    return registry.call('io.ox/mail/compose', 'open', {
      type,
      original: {
        folderId: data.original_folder_id || data.folder_id,
        id: data.original_id || data.id,
        security: data.security
      },
      excludeImages
    })
  }
}

function setFocus (baton) {
  if (baton?.e?.clientX && baton?.e?.clientY) return
  $('.io-ox-mail-window .list-item[tabindex="0"]').trigger('focus')
}

Action('io.ox/mail/actions/reply', {
  shortcut: 'Reply',
  collection: 'some && toplevel',
  getCollection () {
    const app = apps.get('io.ox/mail')
    return app.listView.selection.get().map(cid => app.listView.collection.get(cid).attributes)
  },
  matches: matchesReply,
  action: reply('reply')
})

Action('io.ox/mail/actions/reply-all', {
  shortcut: 'Reply all',
  collection: 'some && toplevel',
  getCollection () {
    const app = apps.get('io.ox/mail')
    return app.listView.selection.get().map(cid => app.listView.collection.get(cid).attributes)
  },
  matches: matchesReply,
  action: reply('replyall')
})

Action('io.ox/mail/actions/forward', {
  shortcut: 'Forward mail',
  capabilities: '!guest',
  collection: 'some && toplevel',
  getCollection () {
    const app = apps.get('io.ox/mail')
    return app.listView.selection.get().map(cid => app.listView.collection.get(cid).attributes)
  },
  action () {
    // todo: cleanup
    const app = apps.get('io.ox/mail')
    const selectionCids = app.listView.selection.get()
    const optionsdata = api.resolve(selectionCids) //, options.isThread)
    const collection = new Collection({ some: true })
    const selection = selectionCids.map(cid => app.listView.collection.get(cid).attributes)
    const baton = ext.Baton({ data: optionsdata, app, threadView: app.threadView, selection, collection })

    const multiple = baton.selection && baton.selection.length > 1
    // Only first mail of thread is selected on multiselection, as most commonly users don't want to forward whole threads
    let data = !multiple
      ? [baton.first()]
      : baton.selection.map(function (o) {
        return _.cid(_.cid(o).replace(/^thread./, ''))
      })

    // get the current model from threadView to get the current state (don't know, has blocked images, images shown)
    const threadView = baton.threadView || (baton.app ? baton.app.threadView : undefined)
    const threadViewModel = threadView ? threadView.collection.get(_.cid(data[0])) : undefined

    import('@/io.ox/mail/compose/checks').then(function ({ default: checks }) {
      checks.composeWithoutExternalImages(data[0], threadViewModel).then(function (excludeImages) {
        // reduce data for compose
        data = data.map(function (mail) {
          return { id: mail.id, folderId: mail.folder_id, security: mail.security }
        })
        registry.call('io.ox/mail/compose', 'open', { type: 'forward', original: data, excludeImages })
      })
    })
  }
})

Action('io.ox/mail/actions/delete', {
  collection: 'toplevel && some && delete',
  async action (baton) {
    const { default: deleteMail } = await import('@/io.ox/mail/actions/delete.js')
    deleteMail(baton)
  }
})

Action('io.ox/mail/actions/edit', {
  collection: 'one && toplevel',
  matches (baton) {
    // get first mail
    const data = baton.first()
    // must be draft folder
    return data && isDraftMail(data)
  },
  action (baton) {
    const data = baton.first()
    const app = _(apps.models).find(function (model) {
      return model.refId === data.id
    })

    // reuse open editor
    if (app) return app.launch()

    // edit case right after refresh
    const mailref = _.cid({ id: data.id, folder: data.folder_id })
    const space = (ox?.ui?.spaces || {})[mailref]
    const spacedata = (ox?.ui?.spacedata || {})[space]

    registry.call('io.ox/mail/compose', 'open',
      { type: 'edit', original: { folderId: data.folder_id, id: data.id, security: data.security }, space: spacedata }
    )
  }
})

Action('io.ox/mail/actions/edit-copy', {
  collection: 'one && toplevel',
  matches (baton) {
    // get first mail
    const data = baton.first()
    // must be draft folder
    return data && isDraftMail(data)
  },
  action (baton) {
    const data = baton.first()
    registry.call('io.ox/mail/compose', 'open', {
      type: 'copy', original: { folderId: data.folder_id, id: data.id, security: data.security }
    })
      .then(function (window) {
        const model = window.app.model
        // #. If the user selects 'copy of' in the drafts folder, the subject of the email is prefixed with [Copy].
        // #. Please make sure that this is a prefix in every translation since it will be removed when the mail is sent.
        // #. %1$s the original subject of the mail
        model.set('subject', gt('[Copy] %1$s', model.get('subject')))
      })
  }
})

Action('io.ox/mail/actions/source', {
  collection: 'some && toplevel',
  matches (baton) {
    // multiple selection
    if (baton.selection && baton.selection.length > 1) return
    if (baton.collection.has('multiple') && !baton.isThread) return false
    return true
  },
  async action (baton) {
    const { default: source } = await import('@/io.ox/mail/actions/source.js')
    source(baton)
  }
})

Action('io.ox/mail/actions/filter', {
  capabilities: 'mailfilter_v2',
  collection: 'some && toplevel',
  matches (baton) {
    // multiple and not a thread?
    if (baton.collection.has('multiple') && !baton.isThread) return false
    return true
  },
  action (baton) {
    import('@/io.ox/mail/mailfilter/settings/filter').then(function ({ default: filter }) {
      filter.initialize().then(function (data, config, opt) {
        const factory = opt.model.protectedMethods.buildFactory('io.ox/core/mailfilter/model', opt.api)
        const args = { data: { obj: factory.create(opt.model.protectedMethods.provideEmptyModel()) } }
        const tests = opt.filterDefaults.getTests(config)
        const preparedTest = {
          id: 'allof',
          tests: [
            _.copy(tests.subject),
            tests.address ? _.copy(tests.address) : _.copy(tests.from)
          ]
        }

        preparedTest.tests[0].values = [baton.data.subject]
        preparedTest.tests[1].values = [baton.data.from[0][1]]

        args.data.obj.set('config', config)
        args.data.obj.set('test', preparedTest)

        ext.point('io.ox/settings/mailfilter/filter/settings/detail').invoke('draw', undefined, args, config)
      })
    })
  }
})

Action('io.ox/mail/actions/print', {
  collection: 'some && (read || !toplevel)',
  action (baton) {
    if (_.device('smartphone')) return setTimeout(window.print, 0)
    print.request(() => import('@/io.ox/mail/print'), baton.array())
  }
})

Action('io.ox/mail/actions/flag', {
  toggle: settings.flagByStar,
  collection: 'some',
  matches (baton) {
    return !_(baton.array()).every(util.isFlagged)
  },
  action (baton) {
    api.flag(baton.data, true).then(() => setFocus(baton))
  }
})

Action('io.ox/mail/actions/unflag', {
  toggle: settings.flagByStar,
  collection: 'some',
  matches (baton) {
    return _(baton.array()).any(util.isFlagged)
  },
  action (baton) {
    api.flag(baton.data, false).then(() => setFocus(baton))
  }
})

Action('io.ox/mail/actions/archive', {
  shortcut: 'Archive mail',
  capabilities: 'archive_emails',
  collection: 'some && delete',
  getCollection () {
    const app = apps.get('io.ox/mail')
    return app.listView.selection.get().map(cid => app.listView.collection.get(cid).attributes)
  },
  matches (baton) {
    return baton.array().reduce(checkForArchiveAction, true)
  },
  action (baton) {
    const list = Array.isArray(baton.data) ? baton.data : [baton.data]
    api.archive(folderAPI.ignoreSentItems(list)).then(() => setFocus(baton))
  }
})

Action('io.ox/mail/actions/triggerFlags', {
  collection: 'some',
  matches: () => settings.flagByColor,
  action () {
    const dropDown = $('.dropdown.flag-picker').data()
    $(document).trigger('click.bs.dropdown.data-api')
    _.delay(function () {
      dropDown.view.open()
    }, 200)
  }
})

function checkForArchiveAction (memo, obj) {
  // already false?
  if (memo === false) return false
  // is not primary account and archive external is not disabled?
  if (!account.isPrimary(obj.folder_id) && !settings.get('features/archiveExternal', true)) return false
  // is unified folder (may be external)
  if (account.isUnifiedFolder(obj.folder_id)) return false
  // is in a subfolder of archive?
  if (account.is('archive', obj.folder_id)) return false
  // else
  return true
}

Action('io.ox/mail/actions/move', {
  collection: 'toplevel && some && delete',
  action: generate('move', gt('Move'), { single: gt('Email has been moved'), multiple: gt('Emails have been moved') })
})

Action('io.ox/mail/actions/copy', {
  collection: 'toplevel && some',
  action: generate('copy', gt('Copy'), { single: gt('Email has been copied'), multiple: gt('Emails have been copied') })
})

function generate (type, label, success) {
  return function (baton) {
    import('@/io.ox/mail/actions/copyMove').then(function ({ default: action }) {
      action.multiple({ list: baton.array(), baton, type, label, success })
    })
  }
}

Action('io.ox/mail/actions/new-mail-with-cloned-attachment', {
  capabilities: '!guest',
  matches (baton) {
    const mail = baton.data[0] || baton.data

    // check if mail is encrypted by guard and there is no easy access to attachments
    const isEncrypted = () => !!(mail && (mail.security_info?.encrypted || mail.security?.decrypted))

    if (isEncrypted()) return false
    return mail && (mail.attachment || mail.attachments?.length)
  },
  async action (baton) {
    registry.call('io.ox/mail/compose', 'open', null, { createFromSelection: true })
  }
})

Action('io.ox/mail/actions/mark-unread', {
  shortcut: 'Mark unread',
  collection: 'toplevel && change:seen',
  getCollection () {
    const app = apps.get('io.ox/mail')
    return app.listView.selection.get().map(cid => app.listView.collection.get(cid).attributes)
  },
  matches (baton) {
    return baton.array().reduce(function (memo, obj) {
      return memo || !util.isUnseen(obj)
    }, false)
  },
  action (baton) {
    // we don't process sent items
    const list = folderAPI.ignoreSentItems(baton.array())
    console.log('## mark unread', list, 'baton', baton, 'array', baton.array(), 'list', list)
    api.markUnread(list).then(() => setFocus(baton))
  }
})

Action('io.ox/mail/actions/mark-read', {
  shortcut: 'Mark read',
  collection: 'toplevel && change:seen',
  getCollection () {
    const app = apps.get('io.ox/mail')
    return app.listView.selection.get().map(cid => app.listView.collection.get(cid).attributes)
  },
  matches (baton) {
    return baton.array().reduce(function (memo, obj) {
      return memo || util.isUnseen(obj)
    }, false)
  },
  action (baton) {
    // we don't process sent items
    const list = folderAPI.ignoreSentItems(baton.array())
    api.markRead(list).then(() => setFocus(baton))
  }
})

Action('io.ox/mail/actions/spam', {
  shortcut: 'Mark as spam',
  capabilities: 'spam',
  collection: 'some && delete && toplevel',
  getCollection () {
    const app = apps.get('io.ox/mail')
    return app.listView.selection.get().map(cid => app.listView.collection.get(cid).attributes)
  },
  matches (baton) {
    return baton.array().reduce(checkForSpamAction, true)
  },
  action (baton) {
    api.markSpam(baton.array())
      .done(function (result) {
        const error = _(result).chain().pluck('error').compact().first().value()
        if (error) yell(error)
        setFocus(baton)
      })
      .fail(function (error) {
        yell(error)
        api.trigger('refresh.all')
      })
  }
})

function checkForSpamAction (memo, obj) {
  // already false?
  if (memo === false) return false
  // is not primary account?
  if (!account.isPrimary(obj.folder_id)) return false
  // is spam/confirmed_spam/sent/drafts folder?
  if (account.is('spam|confirmed_spam|sent|drafts', obj.folder_id)) return false
  // is marked as spam already?
  if (util.isSpam(obj)) return false
  // else
  return true
}

Action('io.ox/mail/actions/nospam', {
  shortcut: 'Mark as nospam',
  capabilities: 'spam',
  collection: 'some && delete && toplevel',
  getCollection () {
    const app = apps.get('io.ox/mail')
    return app.listView.selection.get().map(cid => app.listView.collection.get(cid).attributes)
  },
  matches (baton) {
    return baton.array().reduce(checkForNoSpamAction, true)
  },
  action (baton) {
    api.noSpam(baton.array()).done(function (result) {
      const error = _(result).chain().pluck('error').compact().first().value()
      if (error) yell(error)
      setFocus(baton)
    })
  }
})

function checkForNoSpamAction (memo, obj) {
  // already false?
  if (memo === false) return false
  // is not primary account?
  if (!account.isPrimary(obj.folder_id)) return false
  // do not show in subfolders of spam folder
  const spamfolders = account.getFoldersByType('spam').concat(account.getFoldersByType('confirmed_spam'))
  if (spamfolders.indexOf(obj.folder_id) < 0) return false
  // else
  return account.is('spam|confirmed_spam', obj.folder_id) || util.isSpam(obj)
}

// Tested: Yas
Action('io.ox/mail/actions/save', {
  // ios cannot handle EML download
  device: '!ios',
  collection: 'some && read',
  action (baton) {
    import('@/io.ox/mail/actions/save').then(function ({ default: action }) {
      action.multiple(baton.array())
    })
  }
})

Action('io.ox/mail/actions/save-as-pdf', {
  capabilities: 'mail_export_pdf && infostore',
  collection: 'one',
  action: saveAsPDF
})

Action('io.ox/mail/actions/sendmail', {
  collection: 'some',
  action (baton) {
    import('@/io.ox/core/api/user').then(function ({ default: userAPI }) {
      account.getAllSenderAddresses().done(function (senderAddresses) {
        userAPI.getCurrentUser().then(function (user) {
          const data = Array.isArray(baton.data) ? baton.data[0] : baton.data
          const toAddresses = data.to.concat(data.cc).concat(data.bcc).concat(data.from)
          let ownAddresses = _.compact([user.get('email1'), user.get('email2'), user.get('email3')])
          ownAddresses = ownAddresses.concat(_(senderAddresses).pluck(1))
          let filtered = _(toAddresses).filter(function (addr) {
            return ownAddresses.indexOf(addr[1]) < 0
          })
          if (filtered.length === 0) filtered = toAddresses
          filtered = _(filtered).uniq(false, function (addr) {
            return addr[1]
          })
          registry.call('io.ox/mail/compose', 'open', { to: filtered })
        })
      })
    })
  }
})

Action('io.ox/mail/actions/createdistlist', {
  capabilities: 'contacts',
  collection: 'some',
  action (baton) {
    import('@/io.ox/mail/actions/create').then(function ({ default: action }) {
      action.createDistributionList(baton)
    })
  }
})

Action('io.ox/mail/actions/invite', {
  capabilities: 'calendar',
  collection: 'some',
  action (baton) {
    import('@/io.ox/mail/actions/create').then(function ({ default: action }) {
      action.createAppointment(baton)
    })
  }
})

Action('io.ox/mail/actions/reminder', {
  capabilities: 'tasks',
  collection: 'one && toplevel',
  action (baton) {
    import('@/io.ox/mail/actions/reminder').then(function ({ default: action }) {
      action(baton)
    })
  }
})

// Attachments

Action('io.ox/mail/attachment/actions/view', {
  collection: 'some',
  matches (baton) {
    return baton.array().some(function (data) {
      const model = new filesAPI.Model(data)
      return viewerTypes.canView(model)
    })
  },
  action (baton) {
    // mappings for different invocation sources
    const files = baton.list || baton.array()
    const selection = baton.array()[0]
    ox.load(() => import('@/io.ox/mail/actions/viewer')).then(function ({ default: action }) {
      action({
        files,
        selection,
        restoreFocus: baton.restoreFocus,
        openedBy: baton.openedBy
      })
    })
  }
})

Action('io.ox/mail/attachment/actions/download', {
  // ios 11 supports file downloads
  device: '!ios || ios >= 11',
  collection: 'some',
  action (baton) {
    // download single attachment or zip file
    const list = baton.array()
    const url = list.length === 1
      ? api.getUrl(_(list).first(), 'download')
      : api.getUrl(list, 'zip')
    // download via iframe or window open
    import('@/io.ox/core/download').then(function ({ default: download }) {
      download[_.device('ios') ? 'window' : 'url'](url)
    })
  }
})

Action('io.ox/mail/attachment/actions/save', {
  capabilities: 'infostore',
  collection: 'some',
  action (baton) {
    import('@/io.ox/mail/actions/attachmentSave').then(function ({ default: action }) {
      action.multiple(baton.array())
    })
  }
})

Action('io.ox/mail/attachment/actions/vcard', {
  capabilities: 'contacts',
  collection: 'one',
  matches (baton) {
    const context = baton.first()
    const hasRightSuffix = (/\.vcf$/i).test(context.filename)
    const isVCardType = (/^text\/(x-)?vcard/i).test(context.content_type)
    const isDirectoryType = (/^text\/directory/i).test(context.content_type)
    return (hasRightSuffix && isDirectoryType) || isVCardType
  },
  action (baton) {
    import('@/io.ox/mail/actions/vcard').then(function ({ default: action }) {
      action(baton)
    })
  }
})

Action('io.ox/mail/attachment/actions/ical', {
  capabilities: 'calendar',
  collection: 'some',
  matches (baton) {
    const context = baton.first()
    const hasRightSuffix = context.filename && !!context.filename.match(/\.ics$/i)
    const isCalendarType = context.content_type && !!context.content_type.match(/^text\/calendar/i)
    const isAppType = context.content_type && !!context.content_type.match(/^application\/ics/i)
    const mail = api.pool.get('detail').get(_.cid(context.mail))
    if (mail.get('imipMail')) return false
    return hasRightSuffix || isCalendarType || isAppType
  },
  action (baton) {
    import('@/io.ox/mail/actions/ical').then(function ({ default: action }) {
      action(baton)
    })
  }
})

Action('io.ox/mail/navigation/open-inbox', {
  shortcut: 'Open Inbox',
  action () {
    const folder = account.getFoldersByType('inbox', 0)
    apps.get('io.ox/mail').folder.set(folder)
  }
})

Action('io.ox/mail/navigation/open-send', {
  shortcut: 'Open Sent',
  action () {
    const folder = account.getFoldersByType('sent', 0)
    apps.get('io.ox/mail').folder.set(folder)
  }
})

Action('io.ox/mail/navigation/open-drafts', {
  shortcut: 'Open Drafts',
  action () {
    const folder = account.getFoldersByType('drafts', 0)
    apps.get('io.ox/mail').folder.set(folder)
  }
})

// inline links
const inlineLinks = [
  {
    id: 'delete',
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/trash.svg',
    title: gt('Delete'),
    ref: 'io.ox/mail/actions/delete',
    section: 'process'
  },
  {
    id: 'archive',
    prio: 'lo',
    // #. Verb: (to) archive messages
    title: gt.pgettext('verb', 'Archive'),
    ref: 'io.ox/mail/actions/archive',
    section: 'process'
  },
  {
    id: 'spam',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Mark as spam'),
    ref: 'io.ox/mail/actions/spam',
    section: 'process'
  },
  {
    id: 'nospam',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Not spam'),
    ref: 'io.ox/mail/actions/nospam',
    section: 'process'
  },
  {
    id: 'reply',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Reply'),
    ref: 'io.ox/mail/actions/reply',
    section: 'standard'
  },
  {
    id: 'reply-all',
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/reply-all.svg',
    title: gt('Reply all'),
    ref: 'io.ox/mail/actions/reply-all',
    section: 'standard'
  },
  {
    id: 'forward',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Forward'),
    ref: 'io.ox/mail/actions/forward',
    section: 'standard'
  },
  {
    id: 'new-mail-with-cloned-attachment',
    prio: 'lo',
    mobile: 'none',
    title: gt('New email with attachment'),
    ref: 'io.ox/mail/actions/new-mail-with-cloned-attachment',
    section: 'standard'
  },
  {
    prio: 'hi',
    mobile: 'none',
    icon: 'bi/flag.svg',
    title: gt('Set color'),
    ref: 'io.ox/mail/actions/color',
    customize (baton) {
      flagPicker.attach(this, { data: baton.data, view: baton.view })
    }
  },
  {
    id: 'edit',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Edit'),
    ref: 'io.ox/mail/actions/edit',
    section: 'standard'
  },

  {
    id: 'sendmail',
    prio: 'lo',
    title: gt('Send email'),
    ref: 'io.ox/mail/actions/sendmail',
    section: 'workflow'
  },
  {
    id: 'invite-to-appointment',
    prio: 'lo',
    title: gt('Invite to appointment'),
    ref: 'io.ox/mail/actions/invite',
    section: 'workflow'
  },
  {
    id: 'save-as-distlist',
    prio: 'lo',
    title: gt('Save as distribution list'),
    ref: 'io.ox/mail/actions/createdistlist',
    section: 'workflow'
  },
  {
    id: 'filter',
    prio: 'lo',
    mobile: 'none',
    title: gt('Create filter rule'),
    ref: 'io.ox/mail/actions/filter',
    section: 'workflow'
  },
  {
    id: 'move',
    prio: 'lo',
    title: gt('Move'),
    ref: 'io.ox/mail/actions/move',
    section: 'file-op'
  },
  {
    id: 'copy',
    prio: 'lo',
    title: gt('Copy'),
    ref: 'io.ox/mail/actions/copy',
    section: 'file-op'
  },
  {
    id: 'print',
    prio: 'lo',
    mobile: 'none',
    title: gt('Print'),
    ref: 'io.ox/mail/actions/print',
    section: 'file-op'
  },
  {
    id: 'save-as-eml',
    prio: 'lo',
    mobile: 'none',
    title: gt('Save as file'),
    ref: 'io.ox/mail/actions/save',
    section: 'file-op'
  },
  {
    id: 'save-as-pdf',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Save as PDF'),
    ref: 'io.ox/mail/actions/save-as-pdf',
    section: 'file-op'
  },
  {
    id: 'source',
    prio: 'lo',
    mobile: 'lo',
    // #. source in terms of source code
    title: gt('View source'),
    ref: 'io.ox/mail/actions/source',
    section: 'file-op'
  },
  {
    id: 'reminder',
    prio: 'lo',
    mobile: 'none',
    title: gt('Reminder'),
    ref: 'io.ox/mail/actions/reminder',
    section: 'keep'
  },
  {
    id: 'add-to-portal',
    prio: 'lo',
    mobile: 'none',
    title: gt('Add to portal'),
    ref: 'io.ox/mail/actions/add-to-portal',
    section: 'keep'
  }
]

ext.point('io.ox/mail/links/inline').extend(
  inlineLinks.map(function (extension, index) {
    extension.index = 100 + index * 100
    extension.mobile = extension.mobile || extension.prio || 'none'
    return extension
  })
)

Action('io.ox/mail/actions/label', {
  id: 'label',
  collection: 'toplevel some',
  action: $.noop
})

Action('io.ox/mail/actions/add-mail-account', {
  async action (e) {
    const { default: m } = await import('@/io.ox/mail/accounts/settings')
    m.mailAutoconfigDialog(e)
  }
})

Action('io.ox/mail/actions/view-all-attachments', {
  action () {
    const attachmentView = coreSettings.get('folder/mailattachments', {})
    ox.launch(() => import('@/io.ox/files/main'), { folder: attachmentView.all }).then(function (app) {
      app.folder.set(attachmentView.all)
    })
  }
})

ext.point('io.ox/secondary').extend(
  {
    id: 'add-mail-account',
    index: 100,
    render (baton) {
      if (baton.appId !== 'io.ox/mail') return
      this.action('io.ox/mail/actions/add-mail-account', gt('Add mail account'), baton)
    }
  }, {
    id: 'all-attachments',
    index: 200,
    render (baton) {
      if (baton.appId !== 'io.ox/mail') return
      if (!coreSettings.get('folder/mailattachments', {}).all) return
      this.action('io.ox/mail/actions/view-all-attachments', gt('All attachments'), baton)
    }
  }, {
    id: 'mail-folder-actions-divider',
    index: 300,
    render (baton) {
      if (baton.appId !== 'io.ox/mail') return
      this.divider()
    }
  }
)

// Attachments

ext.point('io.ox/mail/attachment/links').extend(
  {
    id: 'vcard',
    mobile: 'hi',
    index: 50,
    title: gt('Add to address book'),
    ref: 'io.ox/mail/attachment/actions/vcard'
  },
  {
    id: 'ical',
    mobile: 'hi',
    index: 50,
    title: gt('Add to calendar'),
    ref: 'io.ox/mail/attachment/actions/ical'
  },
  {
    id: 'view_new',
    index: 100,
    mobile: 'hi',
    // #. used as a verb here. label of a button to view attachments
    title: gt('View'),
    ref: 'io.ox/mail/attachment/actions/view'
  },
  {
    id: 'download',
    index: 400,
    mobile: 'hi',
    title: gt('Download'),
    ref: 'io.ox/mail/attachment/actions/download'
  },
  {
    id: 'save',
    index: 500,
    mobile: 'hi',
    // #. %1$s is usually "Drive" (product name; might be customized)
    title: gt('Save to %1$s', gt.pgettext('app', 'Drive')),
    ref: 'io.ox/mail/attachment/actions/save'
  },
  {
    // uses internal viewer, not "view in browser"
    id: 'viewer',
    index: 600,
    mobile: 'hi',
    // #. used as a verb here. label of a button to view attachments
    label: gt('View'),
    ref: 'io.ox/mail/actions/viewer'
  }
)

// DND actions

ext.point('io.ox/mail/dnd/actions').extend({
  id: 'importEML',
  index: 10,
  label: gt('Drop here to import this email'),
  action (file, app) {
    app.queues.importEML.offer(file, { folder: app.folder.get() })
  }
})
