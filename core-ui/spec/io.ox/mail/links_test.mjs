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

// cSpell:ignore domän, ické, icke

import { describe, it, expect } from '@jest/globals'
import $ from '@/jquery'

import links from '@/io.ox/mail/detail/links'

// helper for short code
function process (str) {
  return $('<div>').append(links.processTextNode(document.createTextNode(str))).html()
}

describe('Mail Content detail Link recognition', function () {
  it('does not change plain text', function () {
    const html = process('Hello World!')
    expect(html).toEqual('Hello World!')
  })

  it('keeps white-space', function () {
    const html = process('Hello \r\nWorld\n')
    expect(html).toEqual('Hello \r\nWorld\n')
  })

  it('recognizes a simple URL (http)', function () {
    const html = process('Hi http://yeah.html!')
    expect(html).toEqual('Hi <a href="http://yeah.html" target="_blank" rel="noopener">http://yeah.html</a>!')
  })

  it('recognizes a simple URL (https)', function () {
    const html = process('Hi https://yeah.html!')
    expect(html).toEqual('Hi <a href="https://yeah.html" target="_blank" rel="noopener">https://yeah.html</a>!')
  })

  it('recognizes a simple URL (www)', function () {
    const html = process('Hi www.google.de!')
    expect(html).toEqual('Hi <a href="http://www.google.de" target="_blank" rel="noopener">www.google.de</a>!')
  })

  it('recognizes a complex URL', function () {
    const html = process('Hi https://yeah.html/path/file#hash!')
    expect(html).toEqual('Hi <a href="https://yeah.html/path/file#hash" target="_blank" rel="noopener">https://yeah.html/path/file#hash</a>!')
  })

  it('recognizes a simple mail address', function () {
    const html = process('Lorem ipsum icke@domain.tld set ante')
    expect(html).toEqual('Lorem ipsum <a href="mailto:icke@domain.tld" class="mailto-link" target="_blank">icke@domain.tld</a> set ante')
  })

  it('recognizes a mail address with umlauts and accents correctly', function () {
    const html = process('Lorem ipsum ické@domän.tld set ante')
    expect(html).toEqual('Lorem ipsum <a href="mailto:ické@domän.tld" class="mailto-link" target="_blank">ické@domän.tld</a> set ante')
  })

  it('separates mail addresses inside Kanji correctly', function () {
    const html = process('我给你的icke@domain.tld发了一封邮件')
    expect(html).toEqual('我给你的<a href="mailto:icke@domain.tld" class="mailto-link" target="_blank">icke@domain.tld</a>发了一封邮件')
  })

  it('recognizes a mail address with display name', function () {
    const html = process('Lorem ipsum "Jon Doe" <icke@domain.tld> set ante')
    expect(html).toEqual('Lorem ipsum <a href="mailto:icke@domain.tld" class="mailto-link" target="_blank">Jon Doe</a> set ante')
  })

  it('recognizes deep links', function () {
    const html = process('Lorem ipsum http://test/foo#m=infostore&f=43876&i=154571')
    expect(html).toEqual('Lorem ipsum <a href="http://test/foo#m=infostore&amp;f=43876&amp;i=154571" target="_blank" class="deep-link deep-link-files" role="button">File</a>')
  })

  it('recognizes multiple links', function () {
    const html = process('Hi http://yeah.html! test http://test/foo#m=calendar&f=1&i=1337 foo "Jon doe" <icke@domain.foo> END.')
    expect(html).toEqual('Hi <a href="http://yeah.html" target="_blank" rel="noopener">http://yeah.html</a>! test <a href="http://test/foo#m=calendar&amp;f=1&amp;i=1337" target="_blank" class="deep-link deep-link-calendar" role="button">Appointment</a> foo <a href="mailto:icke@domain.foo" class="mailto-link" target="_blank">Jon doe</a> END.')
  })

  it('recognizes multiple links (not greedy)', function () {
    const html = process('This is an example where there is no prefix on the end www.google.de. And this link is www.google.de in between words. And here an example with a prefix http://www.google.de.')
    expect(html).toEqual('This is an example where there is no prefix on the end <a href="http://www.google.de" target="_blank" rel="noopener">www.google.de</a>. And this link is <a href="http://www.google.de" target="_blank" rel="noopener">www.google.de</a> in between words. And here an example with a prefix <a href="http://www.google.de" target="_blank" rel="noopener">http://www.google.de</a>.')
  })

  it('recognizes multiple links across multiple lines', function () {
    const html = process('Hi\r\nhttp://yeah.html! test\r\nfoo "Jon doe" <icke@domain.foo>\r\nEND.\r\n')
    expect(html).toEqual('Hi\r\n<a href="http://yeah.html" target="_blank" rel="noopener">http://yeah.html</a>! test\r\nfoo <a href="mailto:icke@domain.foo" class="mailto-link" target="_blank">Jon doe</a>\r\nEND.\r\n')
  })
})
