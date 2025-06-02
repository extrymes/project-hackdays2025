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

import { describe, it, expect } from '@jest/globals'
import $ from '@/jquery'

import ext from '@/io.ox/core/extensions'
import '@/pe/portal/plugins/mail/register'

describe('Portal plugins Stickymail', function () {
  const fakeMail = {
    id: '1337',
    folder: 'default0/INBOX',
    from: [['Thorsten Tester', 'test@example.com']],
    subject: 'Test subject <img src="x" onerror="alert(666);">',
    attachments: [{
      id: '1',
      disp: 'inline',
      content_type: 'text/plain',
      size: 46,
      content: '<img src="x" onerror="alert(1337);">test1337\r\n',
      truncated: false,
      sanitized: true
    }]
  }

  function invokeXSS (method) {
    const el = $('<div>')
    const baton = ext.Baton.ensure(fakeMail)
    ext.point('io.ox/portal/widget/stickymail').invoke(method, el, baton)
    return el
  }

  describe('preview', function () {
    it('should not inject plain text as html', function () {
      const el = invokeXSS('preview')
      expect(el.find('img').length).toEqual(0)
      expect(el.text()).toContain('<img src="x" onerror="alert(1337);">test1337')
    })
  })
})
