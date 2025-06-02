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

import { describe, beforeEach, it, expect, jest } from '@jest/globals'

import { disableAnimation } from '@/io.ox/core/animate'
import { mailSendProgressView } from '@/io.ox/mail/MailSendProgressView'
import { settings } from '@/io.ox/mail/settings'

const mail = {
  subject: 'Subject',
  id: 1
}
const mailModel = { get: key => mail[key] }
const baton = { model: mailModel }
let $view
beforeEach(() => {
  $view = mailSendProgressView.render().$el
  settings.set('undoSendDoneDelay', 0) // make tests run faster
  disableAnimation()
})

describe('Undo sending mail', function () {
  it('listens to events and updates it\'s UI', (done) => {
    mailSendProgressView.start(baton)
    expect($view.find('.state').text()).toBe('Sending...')
    expect($view.find('.mail-send-progress-subject').text()).toBe('Subject')

    mailSendProgressView.startUpload(baton)
    expect($view.find('.state').text()).toBe('Uploading Attachment...')
    expect($view.find('.mail-send-progress-subject').text()).toBe('Subject')
    expect($view.find('.mail-send-progress-action').css('display')).not.toBe('none')

    mailSendProgressView.startUndoDelay()
    expect($view.find('.mail-send-progress-action').css('display')).not.toBe('none')

    mailSendProgressView.startActualSend()
    expect($view.find('.mail-send-progress-action').css('display')).toBe('none')

    mailSendProgressView.completed(mailModel)
    expect($view.find('.state').text()).toBe('Sent')
    expect($view.css('display')).toBe('block')

    setTimeout(() => {
      expect($view.css('display')).toBe('none')
      done()
    })
  })

  it('is not closed prematurely for a second email', function (done) {
    const spy = jest.fn()
    mailSendProgressView.on('undoSend', spy)

    const mail2 = {
      subject: 'Subject2',
      id: 2
    }
    const mailModel2 = { get: key => mail2[key] }
    const baton2 = { model: mailModel2 }
    mailSendProgressView.start(baton)
    expect($view.find('.mail-send-progress-subject').text()).toBe('Subject')

    mailSendProgressView.start(baton2)
    expect($view.find('.mail-send-progress-subject').text()).toBe('Subject2')

    mailSendProgressView.completed(mailModel2)
    expect($view.find('.mail-send-progress-subject').text()).toBe('Subject')
    setTimeout(() => {
      expect($view.css('display')).not.toBe('none')

      mailSendProgressView.completed(mailModel)
      setTimeout(() => {
        expect($view.css('display')).toBe('none')
        done()
      })
    })
  })

  it('handles uploads', function (done) {
    const spy = jest.fn()
    mailSendProgressView.on('undoSend', spy)

    mailSendProgressView.start(baton)
    expect($view.find('.mail-send-progress-subject').text()).toBe('Subject')

    mailSendProgressView.startUpload(baton)
    expect($view.find('.mail-send-progress-subject').text()).toBe('Subject')
    expect($view.find('.mail-send-progress-action').css('display')).not.toBe('none')
    expect($view.find('.state').text()).toBe('Uploading Attachment...')
    expect($view.find('.progress').css('display')).not.toBe('none')

    mailSendProgressView.completed(mailModel)
    setTimeout(() => {
      expect($view.css('display')).toBe('none')
      done()
    })
  })
})
