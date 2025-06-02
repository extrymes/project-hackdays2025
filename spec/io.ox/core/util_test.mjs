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

// cSpell:ignore bäre, domäin, näme, wörd, نطاق.موقع

import { describe, it, beforeEach, expect } from '@jest/globals'
import * as util from '@/io.ox/core/util'
import { settings } from '@/io.ox/core/settings'
import ox from '@/ox'

describe('Core utils', function () {
  describe('unified display name', function () {
    it('returns empty string when called with null object', function () {
      expect(util.unescapeDisplayName().length).toEqual(0)
    })

    it('should remove trailing white-space', function () {
      expect(util.unescapeDisplayName(' Hello World  ')).toEqual('Hello World')
    })

    it('should remove surrounding brackets', function () {
      expect(util.unescapeDisplayName('""Hello World""')).toEqual('Hello World')
    })

    it('should remove escaped brackets', function () {
      expect(util.unescapeDisplayName('"Hello World"')).toEqual('Hello World')
    })

    it('should not remove brackets that are not surrounding', function () {
      expect(util.unescapeDisplayName('Hello "World"')).toEqual('Hello "World"')
    })

    it('should remove escaping backslashes before brackets', function () {
      expect(util.unescapeDisplayName('"Say "Hello""')).toEqual('Say "Hello"')
    })
  })

  describe('isValidMailAddress()', function () {
    beforeEach(function () {
      settings.set('validation/emailAddress', { dotless: false, fallback: false, idn: true, puny: true })
    })

    it('handles dotless domains properly', function () {
      settings.set('validation/emailAddress/dotless', true)
      expect(util.isValidMailAddress('name@localhost')).toEqual(true)
      expect(util.isValidMailAddress('name@1337')).toEqual(false)
      settings.set('validation/emailAddress/dotless', false)
      expect(util.isValidMailAddress('name@localhost')).toEqual(false)
    })

    it('handles punycode properly', function () {
      expect(util.isValidMailAddress('name@sub.xn--9p9h.com')).toEqual(true)
      expect(util.isValidMailAddress('name@xn--9p9h.xn--9p9h-domain.com')).toEqual(true)
      // even in TLD (.香港 = .xn--j6w193g = .hongkong)
      expect(util.isValidMailAddress('name@xn--9p9h.xn--9p9h-domain.xn--j6w193g')).toEqual(true)
    })

    it('handles IDN (umlaut) properly', function () {
      expect(util.isValidMailAddress('name@süb.domäin.com')).toEqual(true)
      expect(util.isValidMailAddress('name@süb.domäin09.com')).toEqual(true)
      expect(util.isValidMailAddress('name@süb_domäin.com')).toEqual(false)
      expect(util.isValidMailAddress('name@süb*domäin.com')).toEqual(false)
    })

    it('handles IDN (Japanese) properly', function () {
      expect(util.isValidMailAddress('name@ドメイン.jp')).toEqual(true)
    })

    it('handles IDN (Arabic) properly', function () {
      expect(util.isValidMailAddress('name@نطاق.موقع')).toEqual(true)
    })

    it('handles IDN (emoji) properly', function () {
      expect(util.isValidMailAddress('name@🤓.org')).toEqual(false)
    })

    it('handles latin domains properly', function () {
      settings.set('validation/emailAddress/idn', false)
      expect(util.isValidMailAddress('name@domain.com')).toEqual(true)
      expect(util.isValidMailAddress('name@domain09.com')).toEqual(true)
      expect(util.isValidMailAddress('name@sub.domain.com')).toEqual(true)
      expect(util.isValidMailAddress('name@a.sub.domain.com')).toEqual(true)
      expect(util.isValidMailAddress('name@sub.dom-ain.com')).toEqual(true)
    })

    it('handles invalid latin domains properly', function () {
      settings.set('validation/emailAddress/idn', false)
      expect(util.isValidMailAddress('name@sub.dom_ain.com')).toEqual(false)
      expect(util.isValidMailAddress('name@sub.domain.c')).toEqual(false)
      expect(util.isValidMailAddress('name@süb.domäin.com')).toEqual(false)
      expect(util.isValidMailAddress('name@sub.dom-ain.co-m')).toEqual(false)
      expect(util.isValidMailAddress('name@sub.-domain.com')).toEqual(false)
      expect(util.isValidMailAddress('name@sub.domain-.com')).toEqual(false)
      expect(util.isValidMailAddress('name@sub.--domain.com')).toEqual(false)
    })

    it('handles non-international domains properly', function () {
      settings.set('validation/emailAddress/fallback', true)
      expect(util.isValidMailAddress('name@dom_ain.com')).toEqual(true)
      expect(util.isValidMailAddress('name@dom_ain')).toEqual(false)
    })

    it('handles IP addresses as domain part properly', function () {
      expect(util.isValidMailAddress('name@[1.2.3.4]')).toEqual(true)
      expect(util.isValidMailAddress('name@[1.2.3.4.5]')).toEqual(false)
      expect(util.isValidMailAddress('name@[1.2.3.A]')).toEqual(false)
      expect(util.isValidMailAddress('name@[1.2.3.4444]')).toEqual(false)
      expect(util.isValidMailAddress('name@[IPv6:2001:db8:1ff::a0b:dbd0]')).toEqual(true)
      expect(util.isValidMailAddress('name@[2001:db8:1ff::a0b:dbd0]')).toEqual(false)
    })

    it('handles partial addresses properly', function () {
      expect(util.isValidMailAddress('@domain.com')).toEqual(false)
      expect(util.isValidMailAddress('name@')).toEqual(false)
      expect(util.isValidMailAddress('@')).toEqual(false)
    })

    it('handles local part properly', function () {
      expect(util.isValidMailAddress('name@abc@domain.com')).toEqual(false)
      expect(util.isValidMailAddress('first.last@domain.com')).toEqual(true)
      expect(util.isValidMailAddress('first,last@domain.com')).toEqual(false)
      expect(util.isValidMailAddress('first last@domain.com')).toEqual(false)
      expect(util.isValidMailAddress('first\\last@domain.com')).toEqual(false)
      expect(util.isValidMailAddress('first"last@domain.com')).toEqual(false)
      expect(util.isValidMailAddress('first..last@domain.com')).toEqual(false)
      expect(util.isValidMailAddress('.first.last@domain.com')).toEqual(false)
      expect(util.isValidMailAddress('"quoted"@domain.com')).toEqual(true)
      expect(util.isValidMailAddress('"another@"@domain.com')).toEqual(true)
      expect(util.isValidMailAddress('"but"not"@domain.com')).toEqual(false)
    })
  })

  describe('isValidPhoneNumber()', function () {
    it('handles empty strings properly', function () {
      expect(util.isValidPhoneNumber('')).toEqual(true)
      expect(util.isValidPhoneNumber(' ')).toEqual(true)
    })

    it('handles too short numbers properly', function () {
      expect(util.isValidPhoneNumber('+1')).toEqual(false)
      expect(util.isValidPhoneNumber('+49')).toEqual(false)
    })

    it('handles numbers properly', function () {
      expect(util.isValidPhoneNumber('01234567')).toEqual(true)
      expect(util.isValidPhoneNumber('0123 4567')).toEqual(true)
      expect(util.isValidPhoneNumber('+491234567')).toEqual(true)
      expect(util.isValidPhoneNumber('0123+4567')).toEqual(false)
      expect(util.isValidPhoneNumber('+49 (0) 1234567')).toEqual(true)
      expect(util.isValidPhoneNumber('+49 0 1234567')).toEqual(true)
      expect(util.isValidPhoneNumber('+49-0-1234567')).toEqual(true)
      expect(util.isValidPhoneNumber('+49-0-1234567#1')).toEqual(true)
      expect(util.isValidPhoneNumber('+49-0-1234567,1,2')).toEqual(true)
      expect(util.isValidPhoneNumber('+49.0.1234567')).toEqual(true)
      expect(util.isValidPhoneNumber('+49 0 / 1234567')).toEqual(true)
      expect(util.isValidPhoneNumber('+49 0 / 123456 - 7')).toEqual(true)
      expect(util.isValidPhoneNumber('+49 0 / 123456 - ABC')).toEqual(false)
      expect(util.isValidPhoneNumber('+49 0::1234567')).toEqual(false)
      expect(util.isValidPhoneNumber('+49 0 1234 [567]')).toEqual(false)
      expect(util.isValidPhoneNumber('++49 0 1234567')).toEqual(false)
      expect(util.isValidPhoneNumber('+49_0_1234567')).toEqual(false)
      expect(util.isValidPhoneNumber('+49 0 1234567 \\ 23')).toEqual(false)
    })
  })

  describe('breakableHTML()', function () {
    it('doesn\'t change white space', function () {
      expect(util.breakableHTML('').length).toEqual(0)
      expect(util.breakableHTML(' ')).toEqual(' ')
    })

    it('doesn\'t change short strings', function () {
      expect(util.breakableHTML('Hello World')).toEqual('Hello World')
    })

    it('escapes HTML', function () {
      expect(util.breakableHTML('Hello<br>World')).toEqual('Hello&lt;br&gt;World')
    })

    it('breaks longs strings properly', function () {
      expect(util.breakableHTML('com.openexchange.session.contextId=1337')).toEqual('com.<wbr>openexchange.<wbr>session.<wbr>contextId=<wbr>1337<wbr>')
      expect(util.breakableHTML('com.openexchange 01234567890123456789 01234567890123456789')).toEqual('com.openexchange 01234567890123456789 01234567890123456789')
      expect(util.breakableHTML('com.openexchange.0123456789012345678901234567890123456789')).toEqual('com.<wbr>openexchange.<wbr>012345678901234567890123456789<wbr>0123456789')
      expect(util.breakableHTML('0123456789\u00a00123456789\u00a00123456789\u00a01')).toEqual('0123456789\u00a0<wbr>0123456789\u00a0<wbr>0123456789\u00a0<wbr>1')
    })
  })

  describe('breakableText()', function () {
    it('doesn\'t change white space', function () {
      expect(util.breakableText('').length).toEqual(0)
      expect(util.breakableText(' ')).toEqual(' ')
    })

    it('doesn\'t change short strings', function () {
      expect(util.breakableText('Hello World')).toEqual('Hello World')
    })

    it('does not insert breaks on text boundaries', function () {
      expect(util.breakableText('01234567890123456789')).toEqual('01234567890123456789')
      expect(util.breakableText('0123456789012345678901234567890123456789')).toEqual('01234567890123456789\u200B01234567890123456789')
      expect(util.breakableText('012345678901234567890123456789012345678901')).toEqual('01234567890123456789\u200B01234567890123456789\u200B01')
    })

    it('breaks longs strings properly', function () {
      expect(util.breakableText('com.openexchange.session.contextId=1337')).toEqual('com.openexchange.ses\u200Bsion.contextId=1337')
    })
  })

  describe('ellipsis()', function () {
    it('should return the original string if its width is less than or equal to the maximum width', () => {
      const originalStr = 'hello world'
      const expectedOutput = 'hello world'
      const actualOutput = util.ellipsis(originalStr, { maxWidth: 20 })
      expect(actualOutput).toEqual(expectedOutput)
    })

    it('should return the a truncated string if its width is bigger than the maximum width', () => {
      const originalStr = 'hello world'
      const expectedOutput = 'hell\u2026world'
      const actualOutput = util.ellipsis(originalStr, { maxWidth: 10 })
      expect(actualOutput).toEqual(expectedOutput)
    })
  })

  describe('urlify()', function () {
    it('doesn\'t change normal text', function () {
      expect(util.urlify('Hello World!')).toEqual('Hello World!')
    })

    it('recognizes a simple URL', function () {
      expect(util.urlify('http://www.foo.com/path')).toEqual('<a href="http://www.foo.com/path" rel="noopener" target="_blank">http://www.foo.com/path</a>')
    })

    it('recognizes a simple URL (uppercase)', function () {
      expect(util.urlify('HTTP://www.foo.com/path')).toEqual('<a href="HTTP://www.foo.com/path" rel="noopener" target="_blank">HTTP://www.foo.com/path</a>')
    })

    it('recognizes a secure URL', function () {
      expect(util.urlify('https://www.foo.com/path')).toEqual('<a href="https://www.foo.com/path" rel="noopener" target="_blank">https://www.foo.com/path</a>')
    })

    it('recognizes a simple URL within text', function () {
      expect(util.urlify('Lorem ipsum http://www.foo.com/path Lorem ipsum')).toEqual('Lorem ipsum <a href="http://www.foo.com/path" rel="noopener" target="_blank">http://www.foo.com/path</a> Lorem ipsum')
    })

    it('recognizes multiple simple URL', function () {
      expect(util.urlify('Lorem ipsum http://www.foo.com/path Lorem ipsum http://www.foo.com/path Lorem ipsum')).toEqual('Lorem ipsum <a href="http://www.foo.com/path" rel="noopener" target="_blank">http://www.foo.com/path</a> Lorem ipsum <a href="http://www.foo.com/path" rel="noopener" target="_blank">http://www.foo.com/path</a> Lorem ipsum')
    })

    it('recognizes a URLs across newlines', function () {
      expect(util.urlify('Lorem ipsum\nhttp://www.foo.com/path\nLorem ipsum')).toEqual('Lorem ipsum\n<a href="http://www.foo.com/path" rel="noopener" target="_blank">http://www.foo.com/path</a>\nLorem ipsum')
    })

    it('handles punctuation marks properly', function () {
      expect(util.urlify('http://www.foo.com/path.')).toEqual('<a href="http://www.foo.com/path" rel="noopener" target="_blank">http://www.foo.com/path</a>.')
      expect(util.urlify('http://www.foo.com/path!')).toEqual('<a href="http://www.foo.com/path" rel="noopener" target="_blank">http://www.foo.com/path</a>!')
      expect(util.urlify('http://www.foo.com/path?')).toEqual('<a href="http://www.foo.com/path" rel="noopener" target="_blank">http://www.foo.com/path</a>?')
      expect(util.urlify('<http://www.foo.com/path>')).toEqual('&lt;<a href="http://www.foo.com/path" rel="noopener" target="_blank">http://www.foo.com/path</a>&gt;')
    })

    it('removes malicious code', function () {
      expect(util.urlify('abc <script> alert(1337); </script> 123')).toEqual('abc  123')
    })

    it('removes data attributes', function () {
      expect(util.urlify('<a href="#z" data-toggle="dropdown" data-target="<img src=x onerror=alert(1337)>">XSS?</a>')).toEqual('<a href="#z" rel="noopener">XSS?</a>')
    })

    it('includes brackets when they are part of the url', function () {
      expect(util.urlify('http://www.foo.com/path?objects=(12345,6789)')).toEqual('<a href="http://www.foo.com/path?objects=(12345,6789)" rel="noopener" target="_blank">http:<wbr>//www.<wbr>foo.<wbr>com/path?objects=<wbr>(<wbr>12345,<wbr>6789)<wbr></a>')
    })
  })

  describe('parsePhoneNumbers()', function () {
    it('doesn\'t change normal text', function () {
      expect(util.parsePhoneNumbers('Hello World!')).toEqual('Hello World!')
    })

    it('recognizes a single phone number', function () {
      expect(util.parsePhoneNumbers('01234567890')).toEqual('<a href="callto:01234567890">01234567890</a>')
      expect(util.parsePhoneNumbers('+1234567890')).toEqual('<a href="callto:+1234567890">+1234567890</a>')
    })

    it('recognizes phone numbers within text', function () {
      expect(util.parsePhoneNumbers('Lorem ipsum 01234567890 Lorem ipsum')).toEqual('Lorem ipsum <a href="callto:01234567890">01234567890</a> Lorem ipsum')
      expect(util.parsePhoneNumbers('Lorem ipsum 01234567890 Lorem ipsum 01234567891 Lorem ipsum')).toEqual('Lorem ipsum <a href="callto:01234567890">01234567890</a> Lorem ipsum <a href="callto:01234567891">01234567891</a> Lorem ipsum')
    })

    it('recognizes a phone number across newlines', function () {
      expect(util.parsePhoneNumbers('Lorem ipsum\n01234567890\nLorem ipsum')).toEqual('Lorem ipsum\n<a href="callto:01234567890">01234567890</a>\nLorem ipsum')
    })

    it('handles trailing non-whitespace properly', function () {
      expect(util.parsePhoneNumbers('01234567890.')).toEqual('<a href="callto:01234567890">01234567890</a>.')
      expect(util.parsePhoneNumbers('01234567890!')).toEqual('<a href="callto:01234567890">01234567890</a>!')
      expect(util.parsePhoneNumbers('01234567890?')).toEqual('<a href="callto:01234567890">01234567890</a>?')
      expect(util.parsePhoneNumbers('<01234567890>')).toEqual('<<a href="callto:01234567890">01234567890</a>>')
    })

    it('handles different phone number formats properly', function () {
      expect(util.parsePhoneNumbers('(123) 456-7890')).toEqual('<a href="callto:1234567890">(123) 456-7890</a>')
      expect(util.parsePhoneNumbers('123-456-7890')).toEqual('<a href="callto:1234567890">123-456-7890</a>')
      expect(util.parsePhoneNumbers('123.456.7890')).toEqual('<a href="callto:1234567890">123.456.7890</a>')
      expect(util.parsePhoneNumbers('1234567890')).toEqual('<a href="callto:1234567890">1234567890</a>')
      expect(util.parsePhoneNumbers('+1 123-456-7890')).toEqual('<a href="callto:+11234567890">+1 123-456-7890</a>')
      expect(util.parsePhoneNumbers('+1 (123) 456-7890')).toEqual('<a href="callto:+11234567890">+1 (123) 456-7890</a>')
      expect(util.parsePhoneNumbers('+44 1234 567890')).toEqual('<a href="callto:+441234567890">+44 1234 567890</a>')
      expect(util.parsePhoneNumbers('+44-1234-567890')).toEqual('<a href="callto:+441234567890">+44-1234-567890</a>')
      expect(util.parsePhoneNumbers('+44 (0) 1234 567890')).toEqual('<a href="callto:+4401234567890">+44 (0) 1234 567890</a>')
      expect(util.parsePhoneNumbers('011 44 1234 567890')).toEqual('<a href="callto:011441234567890">011 44 1234 567890</a>')
    })

    it('ignores links', function () {
      expect(util.parsePhoneNumbers('<a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a>')).toEqual('<a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a>')
    })

    it('ignores links inside longer texts', function () {
      expect(util.parsePhoneNumbers('blubber <a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a> awesome text'))
        .toEqual('blubber <a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a> awesome text')
      expect(util.parsePhoneNumbers('<a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a> awesome text'))
        .toEqual('<a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a> awesome text')
      expect(util.parsePhoneNumbers('blubber <a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a>'))
        .toEqual('blubber <a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a>')
      expect(util.parsePhoneNumbers('blubber <a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a> awesome text <a href="https://awesome.page/item-123-456-7891">item-123-456-7891</a>'))
        .toEqual('blubber <a href="https://awesome.page/item-123-456-7890">item-123-456-7890</a> awesome text <a href="https://awesome.page/item-123-456-7891">item-123-456-7891</a>')
    })

    it('ignores dates', function () {
      expect(util.parsePhoneNumbers('1.1.23')).toEqual('1.1.23')
      expect(util.parsePhoneNumbers('23.1.1')).toEqual('23.1.1')
      expect(util.parsePhoneNumbers('2023.01.01')).toEqual('2023.01.01')
      expect(util.parsePhoneNumbers('01.01.2023')).toEqual('01.01.2023')

      expect(util.parsePhoneNumbers('1/1/23')).toEqual('1/1/23')
      expect(util.parsePhoneNumbers('23/1/1')).toEqual('23/1/1')
      expect(util.parsePhoneNumbers('2023/01/01')).toEqual('2023/01/01')
      expect(util.parsePhoneNumbers('01/01/2023')).toEqual('01/01/2023')

      expect(util.parsePhoneNumbers('1-1-23')).toEqual('1-1-23')
      expect(util.parsePhoneNumbers('23-1-1')).toEqual('23-1-1')
      expect(util.parsePhoneNumbers('2023-01-01')).toEqual('2023-01-01')
      expect(util.parsePhoneNumbers('01-01-2023')).toEqual('01-01-2023')
    })
  })

  describe('getAddresses', function () {
    it('recognizes a simple address', function () {
      expect(util.getAddresses('email1@domain.tld')).toStrictEqual(['email1@domain.tld'])
    })

    it('recognizes a simple address without domain part', function () {
      expect(util.getAddresses('email1')).toStrictEqual(['email1'])
    })

    it('recognizes comma-separated addresses', function () {
      expect(util.getAddresses('email1@domain.tld,email2@domain.tld,email3@domain.tld'))
        .toStrictEqual(['email1@domain.tld', 'email2@domain.tld', 'email3@domain.tld'])
    })

    it('recognizes semi-colon-separated addresses', function () {
      expect(util.getAddresses('email1@domain.tld;email2@domain.tld;email3@domain.tld'))
        .toStrictEqual(['email1@domain.tld', 'email2@domain.tld', 'email3@domain.tld'])
    })

    it('recognizes tab-separated addresses', function () {
      expect(util.getAddresses('email1@domain.tld\temail2@domain.tld\temail3@domain.tld'))
        .toStrictEqual(['email1@domain.tld', 'email2@domain.tld', 'email3@domain.tld'])
    })

    it('recognizes newline-separated addresses', function () {
      expect(util.getAddresses('email1@domain.tld\nemail2@domain.tld\nemail3@domain.tld'))
        .toStrictEqual(['email1@domain.tld', 'email2@domain.tld', 'email3@domain.tld'])
    })

    it('recognizes space-separated addresses', function () {
      expect(util.getAddresses('email1@domain.tld email2@domain.tld email3@domain.tld'))
        .toStrictEqual(['email1@domain.tld', 'email2@domain.tld', 'email3@domain.tld'])
    })

    it('recognizes addresses with display name without quotes', function () {
      expect(util.getAddresses('email1@domain.tld display name <email2@domain.tld> email3@domain.tld'))
        .toStrictEqual(['email1@domain.tld', '"display name" <email2@domain.tld>', 'email3@domain.tld'])
    })

    it('recognizes addresses with display name with quotes', function () {
      expect(util.getAddresses('email1@domain.tld "display name" <email2@domain.tld> email3@domain.tld'))
        .toStrictEqual(['email1@domain.tld', '"display name" <email2@domain.tld>', 'email3@domain.tld'])
    })

    it('recognizes addresses with display name with quotes that contain delimiters', function () {
      expect(util.getAddresses('email1@domain.tld "name, display" <email2@domain.tld> email3@domain.tld'))
        .toStrictEqual(['email1@domain.tld', '"name, display" <email2@domain.tld>', 'email3@domain.tld'])
    })

    it('recognizes addresses with bareword display names', function () {
      expect(util.getAddresses('name <email1@domain.tld>, another-name <email2@domain.tld>, AND another-näme <email3@domain.tld>'))
        .toStrictEqual(['"name" <email1@domain.tld>', '"another-name" <email2@domain.tld>', '"AND another-näme" <email3@domain.tld>'])
    })

    it('recognizes addresses with special characters in local part', function () {
      // full list: . ! # $ % & ' * + - / = ? ^ _ ` { | } ~
      expect(util.getAddresses('email.1@x, email!2@x, email#3@x, email$4@x, email\'5@x, email/6@x, email{7}@x, email|8@x, email~9@x'))
        .toStrictEqual(['email.1@x', 'email!2@x', 'email#3@x', 'email$4@x', 'email\'5@x', 'email/6@x', 'email{7}@x', 'email|8@x', 'email~9@x'])
    })

    it('recognizes addresses with escaped local part', function () {
      expect(util.getAddresses('email1@domain.tld "email2"@domain.tld email3@domain.tld'))
        .toStrictEqual(['email1@domain.tld', '"email2"@domain.tld', 'email3@domain.tld'])
    })

    it('recognizes addresses with only one character in local part', function () {
      expect(util.getAddresses('a@domain.tld'))
        .toStrictEqual(['a@domain.tld'])
    })

    it('recognizes addresses with IP address as domain part', function () {
      expect(util.getAddresses('email1@domain.tld email2@domain.tld email3@8.8.8.8'))
        .toStrictEqual(['email1@domain.tld', 'email2@domain.tld', 'email3@8.8.8.8'])
    })

    it('recognizes complex addresses', function () {
      expect(util.getAddresses('email1@domain.tld "quoted" <email2@domain.tld>, display name <email3@domain.tld>\t"email4"@domain.tld email5@[8.8.8.8],email6@domain.tld; bäre wörd <email7@domain.tld>'))
        .toStrictEqual(['email1@domain.tld', '"quoted" <email2@domain.tld>', '"display name" <email3@domain.tld>', '"email4"@domain.tld', 'email5@[8.8.8.8]', 'email6@domain.tld', '"bäre wörd" <email7@domain.tld>'])
    })

    it('recognizes special quoted addresses', function () {
      expect(util.getAddresses("single' quote <single.quote@mailbox.org>"))
        .toStrictEqual(['"single\' quote" <single.quote@mailbox.org>'])
    })

    it('should merge objects without changing the original ones', function () {
      const objA = undefined
      const objB = {
        firstLayer: {
          color: 'green',
          shape: 'triangle',
          secondLayer: {
            width: 5,
            weight: 200
          }
        }
      }
      const objC = {
        firstLayer: {
          shape: 'circle',
          secondLayer: {
            width: 8,
            height: 9
          }
        }
      }

      expect(util.deepExtend(objA, objB, objC)).toStrictEqual({
        firstLayer: {
          color: 'green',
          shape: 'circle',
          secondLayer: {
            width: 8,
            weight: 200,
            height: 9
          }
        }
      })

      expect(objA).toEqual(undefined)
      expect(objB).toStrictEqual({
        firstLayer: {
          color: 'green',
          shape: 'triangle',
          secondLayer: {
            width: 5,
            weight: 200
          }
        }
      })
      expect(objC).toStrictEqual({
        firstLayer: {
          shape: 'circle',
          secondLayer: {
            width: 8,
            height: 9
          }
        }
      })
    })

    it('should merge the right ui version string', function () {
      ox.version = '7'
      ox.revision = '123'
      expect(util.getVersionString()).toEqual('7-123')

      ox.version = undefined
      expect(util.getVersionString()).toEqual('8-123')
      ox.version = 'undefined'
      expect(util.getVersionString()).toEqual('8-123')

      ox.revision = undefined
      expect(util.getVersionString()).toEqual('8')
      ox.revision = 'undefined'
      expect(util.getVersionString()).toEqual('8')
    })

    it('should merge the right config version string', function () {
      ox.serverConfig.version = '8'
      ox.serverConfig.revision = '123'
      ox.revision = '456'
      expect(util.getVersionFromConfig()).toEqual('8-123')

      ox.serverConfig.version = undefined
      expect(util.getVersionFromConfig()).toEqual('-123')
      ox.serverConfig.version = 'undefined'
      expect(util.getVersionFromConfig()).toEqual('-123')

      ox.serverConfig.revision = undefined
      expect(util.getVersionFromConfig()).toEqual('-Rev456')
      ox.serverConfig.revision = 'undefined'
      expect(util.getVersionFromConfig()).toEqual('-Rev456')

      ox.revision = undefined
      expect(util.getVersionFromConfig()).toEqual('')
      ox.revision = 'undefined'
      expect(util.getVersionFromConfig()).toEqual('')

      ox.serverConfig.version = '8'
      expect(util.getVersionFromConfig()).toEqual('8')
    })
  })

  describe('parseStringifiedList', () => {
    it('filters actually empty data', () => {
      expect(util.parseStringifiedList(undefined)).toEqual([])
      expect(util.parseStringifiedList(null)).toEqual([])
      expect(util.parseStringifiedList('')).toEqual([])
      expect(util.parseStringifiedList('   ')).toEqual([])
      expect(util.parseStringifiedList(',,')).toEqual([])
      expect(util.parseStringifiedList(';;')).toEqual([])
      expect(util.parseStringifiedList('[]')).toEqual([])
      expect(util.parseStringifiedList('[,]')).toEqual([])
      expect(util.parseStringifiedList('[;]')).toEqual([])
      expect(util.parseStringifiedList('[""]')).toEqual([])
      expect(util.parseStringifiedList("['']")).toEqual([])
    })

    it('supports different type of list elements', () => {
      expect(util.parseStringifiedList('foo/bar')).toEqual(['foo/bar'])
      expect(util.parseStringifiedList('foo - bar')).toEqual(['foo - bar'])
      expect(util.parseStringifiedList('https://foo.com/bar?test=yes#myhash')).toEqual(['https://foo.com/bar?test=yes#myhash'])
    })

    it('identifies dividers', () => {
      expect(util.parseStringifiedList('a,b,c')).toEqual(['a', 'b', 'c'])
      expect(util.parseStringifiedList('a;b;c')).toEqual(['a', 'b', 'c'])
    })

    it('identifies dividers in stringified lists', () => {
      expect(util.parseStringifiedList('[a,b,c]')).toEqual(['a', 'b', 'c'])
      expect(util.parseStringifiedList('[a,b,c]')).toEqual(['a', 'b', 'c'])
    })

    it('filters empty list elements', () => {
      expect(util.parseStringifiedList('a,')).toEqual(['a'])
      expect(util.parseStringifiedList(',a,b,,,c,')).toEqual(['a', 'b', 'c'])
    })

    it('trims list elements and removes obsolete strings', () => {
      expect(util.parseStringifiedList('   a  ,   b  ,,,   c   ,   ')).toEqual(['a', 'b', 'c'])
      expect(util.parseStringifiedList('["Important","Meeting","Private","Mit space"]')).toEqual(['Important', 'Meeting', 'Private', 'Mit space'])
    })
  })
})
