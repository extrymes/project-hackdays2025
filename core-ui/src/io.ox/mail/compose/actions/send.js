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
import ext from '@/io.ox/core/extensions'
import extensions from '@/io.ox/mail/compose/actions/extensions'
import composeAPI from '@/io.ox/mail/compose/api'
import mailAPI from '@/io.ox/mail/api'
import accountAPI from '@/io.ox/core/api/account'
import yell from '@/io.ox/core/yell'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

ext.point('io.ox/mail/compose/actions/send').extend(
  {
    id: 'check:no-recipients',
    index: 200,
    perform (baton) {
      // ask for empty to,cc,bcc and/or empty subject
      const noRecipient = _.isEmpty(baton.model.get('to')) && _.isEmpty(baton.model.get('cc')) && _.isEmpty(baton.model.get('bcc'))
      if (!noRecipient) return
      yell('error', gt('Mail has no recipient.'))
      baton.view.$el.find('.tokenfield:first .token-input').focus()
      baton.stopPropagation()
      return $.Deferred().reject()
    }
  },
  {
    id: 'check:no-subject',
    index: 300,
    perform (baton) {
      if ($.trim(baton.model.get('subject')) !== '') return

      const def = $.Deferred()
      // show dialog
      import('@/io.ox/backbone/views/modal').then(function ({ default: ModalDialog }) {
        new ModalDialog({ title: gt('Empty subject'), description: gt('This email has no subject. Do you want to send it anyway?') })
          .addButton({ label: gt('Add subject'), className: 'btn-default', action: 'cancel' })
        // #. 'Send' as confirmation button of a modal dialog to send an email without a subject.
          .addButton({ label: gt('Send'), action: 'send' })
          .on('send', function () { def.resolve() })
          .on('cancel', function () {
            baton.stopPropagation()
            setTimeout(function () { baton.view.$el.find('input[name="subject"]').focus() }, 200)
            def.reject()
          })
          .open()
      })
      return def
    }
  },
  {
    id: 'check:attachment-empty',
    index: 350,
    perform: extensions.emptyAttachmentCheck
  },
  {
    id: 'check:attachment-missing',
    index: 400,
    perform: extensions.attachmentMissingCheck
  },
  {
    id: 'check:valid-sender',
    index: 450,
    perform (baton) {
      const from = baton.model.get('from') || []
      if (!accountAPI.isHidden({ primary_address: from[1] })) return
      yell('error', gt('This sender address is related to a disabled mail account. Please choose another sender address or visit settings to enable again.'))
      baton.stopPropagation()
      return $.Deferred().reject()
    }
  },
  {
    id: 'busy:start',
    index: 500,
    perform (baton) {
      composeAPI.queue.add(baton.model)

      // hide mail window
      if (baton.app.getWindow && baton.app.getWindow().floating) {
        baton.app.getWindow().floating.$el.hide()
      } else {
        $('.io-ox-mail-window').show()
        baton.app.getWindow().hide()
      }
    }
  },
  {
    id: 'wait-for-pending-uploads',
    index: 600,
    perform: baton => {
      return extensions.waitForPendingUploads(baton)
    }
  },
  {
    id: 'remove-unused-inline-images',
    index: 700,
    perform: extensions.removeUnusedInlineImages
  },
  {
    id: 'check-for-auto-enabled-drive-mail',
    index: 800,
    perform: extensions.checkForAutoEnabledDriveMail({ yell: true, restoreWindow: true, stopPropagation: true, removeQueue: true })
  },
  {
    id: 'send',
    index: 2000,
    perform (baton) {
      return baton.model.send()
    }
  },
  {
    id: 'errors',
    index: 3000,
    perform (baton) {
      if (baton.error && !baton.warning) {
        const win = baton.app.getWindow()
        // check if abort is triggered by the ui
        const text = baton.error === 'abort' ? gt('The sending of the message has been canceled.') : baton.error
        if (win) {
          // reenable the close button(s) in toolbar
          if (baton.close) baton.close.show()
          if (baton.launcherClose) baton.launcherClose.show()
          // param 'resume' needed on mobile
          win.idle().show(undefined, _.device('smartphone'))
        }

        // special errors. Those are handled in 'io.ox/mail/compose/main'
        if (baton.errorCode === 'MSGCS-0007' || baton.errorCode === 'MSGCS-0011') return
        // TODO: check if backend just says "A severe error occurred"
        yell('error', text)
      }
    }
  },
  {
    id: 'warnings',
    index: 3100,
    perform (baton) {
      if (!baton.errors && baton.warning) {
        // no clue if warning(s) is always object, a list or if it might also be a simple string (see bug 42714)
        const warning = [].concat(baton.warning)[0]
        const message = warning.error || warning.warning
        yell('warning', message)
        baton.view.dirty(false)
        baton.app.quit()
      }
    }
  },
  {
    id: 'success',
    index: 4000,
    perform (baton) {
      if (baton.error || baton.warning) return

      // success - some want to be notified, other's not
      if (settings.get('features/notifyOnSent', false)) {
        yell('success', gt('The email has been sent'))
      }
      baton.view.dirty(false)
      // don't ask wether the app can be closed if we have unsaved data, we just want to send
      baton.config.set('autoDismiss', true)

      baton.app.quit()
    }
  },
  {
    id: 'update-caches',
    index: 4100,
    perform (baton) {
      // update base mail
      const meta = baton.model.get('meta')
      const isReply = !!meta.replyFor
      const isForward = !!meta.forwardsFor

      if (!isReply && !isForward) return;

      [].concat(meta.replyFor, meta.forwardsFor).filter(Boolean).forEach(function (obj) {
        const model = mailAPI.pool.get('detail').get(_.cid({ id: obj.originalId, folder_id: obj.originalFolderId }))
        if (!model) return
        let flags = model.get('flags')
        if (isReply) flags |= 1
        if (isForward) flags |= 256
        model.set('flags', flags)
      })
    }

  }
)
