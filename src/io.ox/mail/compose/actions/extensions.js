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
import attachmentEmpty from '@/io.ox/mail/actions/attachmentEmpty'
import mailAPI from '@/io.ox/mail/api'
import composeAPI from '@/io.ox/mail/compose/api'
import yell from '@/io.ox/core/yell'
import capabilities from '@/io.ox/core/capabilities'
import { undoSend } from '@/io.ox/mail/MailSendProgressView'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

const api = {}

api.emptyAttachmentCheck = function (baton) {
  const files = baton.model.get('attachments').chain().pluck('originalFile').compact().value()
  return attachmentEmpty.emptinessCheck(files).then(_.identity, function () {
    baton.stopPropagation()
    throw arguments
  })
}

// needs some refactoring - see bug OXUIB-1095
function wait (model) {
  if (model.pendingUploadingAttachments.state() !== 'pending') return
  return model.pendingUploadingAttachments.then(function () {
    return wait(model)
  })
}

api.waitForPendingUploads = function (baton) {
  if (baton.model.pendingUploadingAttachments.state() !== 'pending') return
  return wait(baton.model).then(function () {
    baton.view.syncMail()
  }, function () {
    baton.view.syncMail()
    undoSend(baton)
  })
}

api.waitForPendingDeleteRequests = function (baton) {
  if (baton.model.pendingDeletedAttachments.state() !== 'pending') return
  return baton.model.pendingDeletedAttachments.then(function () {
    baton.view.syncMail()
  })
}

api.removeUnusedInlineImages = function (baton) {
  const inlineAttachments = baton.model.get('attachments').where({ contentDisposition: 'INLINE' })
  const deferreds = _(inlineAttachments)
    .chain()
    .map(function (attachment) {
      const space = baton.model.get('id')
      const url = mailAPI.getUrl(_.extend({ space }, attachment), 'view').replace('?', '\\?')
      if (new RegExp('<img[^>]*src="' + url + '"[^>]*>').test(baton.model.get('content'))) return undefined
      if (new RegExp('<img[^>]*src="[^"]*' + attachment.get('id') + '"[^>]*>').test(baton.model.get('content'))) return undefined

      return composeAPI.space.attachments.remove(space, attachment.get('id'))
    })
    .compact()
    .value()

  return $.when.apply($, deferreds)
}

api.checkForAutoEnabledDriveMail = function (opt) {
  opt = _.extend({
    yell: false,
    restoreWindow: false,
    stopPropagation: false,
    removeQueue: false
  }, opt)

  return function (baton) {
    const model = baton.model
    const sharedAttachments = model.get('sharedAttachments') || {}

    const isSharingEnabled = !_.device('smartphone') && settings.get('compose/shareAttachments/enabled', false) && capabilities.has('infostore')
    const needsAction = isSharingEnabled && (model.exceedsMailQuota() || model.exceedsThreshold())

    // #. %1$s is usually "Drive Mail" (product name; might be customized)
    if (opt.yell && model.exceedsThreshold() && !sharedAttachments.enabled) yell('info', gt('Attachment file size too large. You have to use %1$s or reduce the attachment file size.', settings.get('compose/shareAttachments/name')))

    if (opt.yell && model.exceedsMailQuota() && !sharedAttachments.enabled) yell('info', gt('Mail quota limit reached. You have to use %1$s or reduce the mail size in some other way.', settings.get('compose/shareAttachments/name')))

    if (!needsAction || sharedAttachments.enabled) return

    model.set('sharedAttachments', _.extend({}, sharedAttachments, { enabled: true }))

    if (opt.stopPropagation) baton.stopPropagation()

    if (opt.restoreWindow) {
      const win = baton.app.getWindow()
      win.idle().show()
    }

    if (opt.removeQueue) composeAPI.queue.remove(baton.model.get('id'))

    throw arguments
  }
}

api.attachmentMissingCheck = function (baton) {
  /* eslint camelcase: ["error", {allow: ["en_US", "de_DE"]}] */

  if (baton.model.get('attachments').length >= 1) return
  // Native language via gt
  // #. Detection phrases: These are phrases with a "|" as delimiter to detect if someone had the intent to attach a file to a mail, but forgot to do so.
  // #. Please use this as a template for english. There could be more or less phrases in other languages, there is no maximum or minimum length, as
  // #. long as you use the "|" delimiter to separate each phrase. Also: Detection is case-insensitive so we don't need case variants.
  const translated = gt('see attached|see attachment|see included|is attached|attached is|are attached|attached are|attached to this email|attached to this message|I\'m attaching|I am attaching|I\'ve attached|I have attached|I attach|I attached|find attached|find the attached|find included|find the included|attached file|see the attached|see attachments|attached files|see the attachment')
  // English
  const en_US = '|see attached|see attachment|see included|is attached|attached is|are attached|attached are|attached to this email|attached to this message|I\'m attaching|I am attaching|I\'ve attached|I have attached|I attach|I attached|find attached|find the attached|find included|find the included|attached file|see the attached|see attachments|attached files|see the attachment'
  // German
  // cSpell:disable
  const de_DE = '|siehe Anhang|angehängt|anbei|hinzugefügt|ist angehängt|angehängt ist|sind angehängt|angehängt sind|an diese E-Mail angehängt|an diese Nachricht angehängt|Anhang hinzufügen|Anhang anbei|Anhang hinzugefügt|anbei finden|anbei|im Anhang|mit dieser E-Mail sende ich|angehängte Datei|siehe angehängte Datei|siehe Anhänge|angehängte Dateien|siehe Anlage|siehe Anlagen'
  // cSpell:enable

  const words = _((translated + en_US + de_DE).split('|')).chain().compact().uniq().value().join('|')

  let mailContent = (baton.model.get('subject') || '') + '|'
  if (baton.view.editor.getMode() === 'html') {
    mailContent += $(baton.view.editor.getContent()).not('blockquote,.io-ox-signature,.io-ox-hint').text()
  } else {
    mailContent += baton.view.editor.getContent().replace(/^>.*(\n|$)/gm, '')
  }
  const detectedString = new RegExp('(' + words + ')', 'i').exec(mailContent)
  if (!detectedString) return

  const def = $.Deferred()
  import('@/io.ox/backbone/views/modal').then(function ({ default: ModalDialogView }) {
    new ModalDialogView({ title: gt('Forgot attachment?'), focus: '.btn-primary' })
      .on('add', function () {
        this.previousFocus = $('[data-extension-id="add_attachments"] > div > a[role="button"]')
        baton.stopPropagation()
        def.reject()
      })
      .on('send', function () { def.resolve() })
      .addButton({ action: 'add', label: gt('Cancel'), className: 'btn-default' })
      .addButton({ action: 'send', label: gt('Send without attachment') })
      .build(function () {
        this.$body.append(
          $('<div>').append(
            $('<p>').text(gt('It appears as if you forgot to attach a file.')),
            $('<p>').text(gt('You mentioned "%s" in your email, but there are no files attached.', detectedString[1]))
          )
        )
      })
      .open()
  })
  return def
}

export default api
