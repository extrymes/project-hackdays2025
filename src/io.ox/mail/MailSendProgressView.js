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
import gt from 'gettext'
import ext from '@/io.ox/core/extensions'
import { createButton, createIcon } from '@/io.ox/core/components'
import composeAPI from '@/io.ox/mail/compose/api'
import { settings } from '@/io.ox/mail/settings'
import DisposableView from '@/io.ox/backbone/views/disposable'
import { fadeIn, fadeOut } from '@/io.ox/core/animate'
import { hasFeature } from '@/io.ox/core/feature'

import '@/io.ox/mail/MailSendProgressView.scss'

// try to prevent users from closing the browser window/tab while sending an email,
// which could result in unsent emails
// https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
function beforeUnloadListener (event) {
  event.preventDefault()
  event.returnValue = ''
  return event.returnValue
}
let eventListenerCount = 0
function preventUnload () {
  eventListenerCount++
  addEventListener('beforeunload', beforeUnloadListener, { capture: true }) // no need to guard, only adds once anyway
}
function releaseUnload () {
  // remove eventlistener only if no listener is registered anymore, eg. all mails are send or undone
  eventListenerCount--
  if (!eventListenerCount) removeEventListener('beforeunload', beforeUnloadListener, { capture: true })
}

export function isSending () {
  return !!eventListenerCount
}

// remove beforeUnload event listeners to prevent native dialog opening, even though mails might still be sending
export function clearBeforeUnloadListeners () {
  eventListenerCount = 1
  releaseUnload()
}

export function undoSend (baton) {
  baton.stopPropagation()
  composeAPI.queue.remove(baton.model.get('id'))
  if (baton.app.getWindow && baton.app.getWindow().floating) {
    baton.app.getWindow().idle().floating.$el.show()
  } else {
    baton.app.getWindow().idle().show()
  }
}

/*
 Show progress and steps of sending mail.

 Live cycle of this view:
 Events:
  - .start: start to show a ui to the users, with subject but no undo button
  - .startUpload: (optional) start uploading attachment, show undo button
  - composeAPI progress: (optional) update upload progress
  - .startUndoDelay: (optional) start to wait for undo delay, if applicable
  - .startActualSend: start the actual sending, which is not abbortable (so hide undo button)
  - .done: start undoSendDoneDelay and show send ack
*/
const MailSendProgressView = DisposableView.extend({
  className: 'mail-send-progress flex justify-center items-center z-2 rounded p-8 z-10 absolute h-60',
  events: {
    'click button': 'abortSendingMails'
  },
  pendingMails: {}, // mails that are currently being sent, key is the mail id

  initialize () {
    this.$icon = $('<div class="mail-send-progress-icon text-center shrink">')
    this.$content = $('<div class="mail-send-progress-content truncate grow">')
    this.$action = $('<div class="mail-send-progress-action ml-8">')
    this.$progressbar = $('<div class="progress-bar">')
    this.$progress = $('<div class="progress width-100 absolute top-0 abs-l h-8">').append(this.$progressbar)

    this.$text = $('<div class="state">')
    this.$subject = $('<div class="truncate mail-send-progress-subject">')
    this.$content.append(this.$text, this.$subject)
    this.$action.append(createButton({ variant: 'primary', text: gt('Undo') }))

    composeAPI.queue.collection.on('progress', ({ loaded, count }) => {
      if (!count) return
      const percent = Math.round(100 * loaded / count)
      this.setProgress(percent)
    })

    this.$el.hide()
  },

  abortSendingMails () {
    // abort all pending mails
    Object.values(this.pendingMails).forEach((baton) => {
      undoSend(baton)
      releaseUnload()
    })
    this.pendingMails = {}
    this.hide()
  },
  start (baton) {
    const model = baton.model
    this.pendingMails[model.get('id')] = baton
    this.$progress.hide()
    this.$action.hide()
    this.$text.text(gt('Sending...'))
    this.$subject.text(model.get('subject'))
    this.$icon.empty().append(createIcon('bi/send.svg').addClass('bi-18'))
    this.show()
  },
  startUpload () {
    this.$action.show()
    this.$text.text(gt('Uploading Attachment...'))
    this.setProgress(0)
    this.$progress.show()
  },
  uploadDone () {
    this.$progress.hide()
  },
  startUndoDelay () {
    this.$text.text(gt('Sending...'))
    this.$action.show()
  },
  startActualSend () {
    this.$action.hide()
  },
  completed (mailModel) {
    delete this.pendingMails[mailModel.get('id')]
    if (Object.keys(this.pendingMails).length) {
      // still mails to send so reset subject to some old mail that is still sending. Not perfect but better than nothing
      const id = Object.keys(this.pendingMails)[0]
      this.$subject.text(this.pendingMails[id].model.get('subject'))
      return
    }
    this.$text.text(gt('Sent'))
    this.$icon.empty().append(createIcon('bi/check-circle.svg').addClass('bi-18'))

    const undoSendDoneDelay = settings.get('undoSendDoneDelay', 3)
    setTimeout(() => this.hide(), undoSendDoneDelay * 1000)
  },
  async show () {
    await fadeIn(this.$el)
    this.$el.focus()
  },
  async hide () {
    await fadeOut(this.$el)
  },
  setProgress (percent) {
    this.$progressbar.css('width', percent + '%')
  },
  render () {
    this.$el
      .attr({ role: 'alert' })
      .append(
        this.$progress,
        this.$icon,
        this.$content,
        this.$action
      )
    return this
  }
})

export const mailSendProgressView = new MailSendProgressView()

// hook into send action extension point and control progress ui
ext.point('io.ox/mail/compose/actions/send').extend(
  {
    id: 'send-start',
    before: 'busy:start',
    index: 470,
    perform (baton) {
      mailSendProgressView.start(baton)
      preventUnload()
    }
  },
  {
    id: 'record-start-time',
    index: 550,
    perform (baton) {
      baton.startTime = Date.now()
    }
  },
  {
    id: 'before-wait-for-pending-uploads',
    index: 590,
    perform: baton => {
      mailSendProgressView.startUpload(baton)
    }
  },
  {
    id: 'upload-done',
    index: 650,
    perform (baton) {
      mailSendProgressView.uploadDone(baton)
    }
  },
  {
    id: 'wait-for-undo-send-delay',
    index: 900,
    async perform (baton) {
      let timeout
      // no need to hide window, already hidden
      const delaySeconds = parseInt(settings.get('undoSendDelay'))
      if (!delaySeconds || !hasFeature('undoSend')) return

      // account for time spend uploading files which already lets users abort/undo sending
      const delayMs = delaySeconds * 1000 - (Date.now() - baton.startTime)
      mailSendProgressView.startUndoDelay(baton.model)

      return new Promise((resolve, reject) => {
        mailSendProgressView.once('undoSend', () => {
          reject(new Error('Aborted'))
          clearTimeout(timeout)
          undoSend()
        })

        timeout = setTimeout(() => {
          mailSendProgressView.off('undoSend', undoSend)
          resolve()
        }, delayMs)
      })
    }
  },

  {
    id: 'before-send',
    index: 1990,
    perform (baton) {
      mailSendProgressView.startActualSend(baton.model)
    }
  },
  {
    id: 'send-completed',
    index: 5000,
    perform (baton) {
      // email send, so this tab can safely be closed again
      releaseUnload()
      mailSendProgressView.completed(baton.model)
    }
  }
)
