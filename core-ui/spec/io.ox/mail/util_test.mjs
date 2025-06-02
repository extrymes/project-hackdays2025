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

import { describe, beforeEach, it, expect } from '@jest/globals'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import { settings } from '@/io.ox/mail/settings'

import * as util from '@/io.ox/mail/util'

describe('Mail Utilities:', function () {
  describe('parse recipient', function () {
    it('should work with plain mail address strings', function () {
      const result = util.parseRecipient('john.doe@open-xchange.com')
      expect(result).toStrictEqual(['john.doe', 'john.doe@open-xchange.com'])
    })

    it('should work with display name and mail address strings', function () {
      const result = util.parseRecipient('"John Doe" <john.doe@open-xchange.com>')
      expect(result).toStrictEqual(['John Doe', 'john.doe@open-xchange.com'])
    })
  })

  describe('display name', function () {
    const name = 'pierce hawthorne'
    const email = 'pierce.hawthorne@greendalecommunitycollege.com'

    it('should return empty string if data is invalid or empty', function () {
      // not array
      expect(util.getDisplayName(email)).toHaveLength(0)
      expect(util.getDisplayName('')).toHaveLength(0)
      expect(util.getDisplayName({})).toHaveLength(0)
      expect(util.getDisplayName(undefined)).toHaveLength(0)
      expect(util.getDisplayName(null)).toHaveLength(0)
      // invalid
      expect(util.getDisplayName([])).toHaveLength(0)
    })

    it('should return email if name is not set', function () {
      // fallback
      expect(util.getDisplayName(['', email])).toEqual(email)
      expect(util.getDisplayName([undefined, email])).toEqual(email)
      expect(util.getDisplayName([null, email])).toEqual(email)
    })

    it('should return the unescaped name', function () {
      expect(util.getDisplayName([name, email])).toEqual(name)
      expect(util.getDisplayName([name, ''])).toEqual(name)
      expect(util.getDisplayName([name, undefined])).toEqual(name)
      expect(util.getDisplayName([name, null])).toEqual(name)
    })
  })

  describe('from check', function () {
    it('should return false on invalid date', function () {
      // invalid
      expect(util.hasFrom('')).toEqual(false)
      expect(util.hasFrom(null)).toEqual(false)
      expect(util.hasFrom(undefined)).toEqual(false)
      expect(util.hasFrom({})).toEqual(false)
      expect(util.hasFrom([])).toEqual(false)
      expect(util.hasFrom({ from: [[undefined, '']] })).toEqual(false)
      // valid
      expect(util.hasFrom({ from: [[undefined, 'some email']] })).toEqual(true)
    })
  })

  describe('getFrom()', function () {
    const data = { from: [['Foo', 'foo@domain.tld']] }

    it('should return jQuery instance', function () {
      const result = util.getFrom(data)
      expect(result).toBeInstanceOf($)
    })

    it('should be a span node', function () {
      const result = util.getFrom(data)
      expect($(result).first().is('span')).toEqual(true)
    })

    it('should have proper class', function () {
      const result = util.getFrom(data)
      expect($(result).first().hasClass('person')).toEqual(true)
    })

    it('should have proper text', function () {
      const result = util.getFrom(data)
      expect($(result).text()).toEqual('Foo')
    })

    it('should respond to missing data (from)', function () {
      const result = util.getFrom()
      expect($(result).text()).toEqual('Unknown sender')
    })

    it('should respond to missing data (others)', function () {
      const result = util.getFrom({}, { field: 'to' })
      expect($(result).text()).toEqual('No recipients')
    })

    it('should list multiple persons comma-separated', function () {
      const result = util.getFrom({ from: [['Foo', 'foo@domain.tld'], ['Anna', 'a@domain.tld'], [null, 'address@only.tld']] })
      expect($(result).text()).toEqual('Foo, Anna, address@only.tld')
    })
  })

  describe('format sender', function () {
    it('should return a nicely formated string', function () {
      expect(util.formatSender('""""name""""', 'address', false)).toEqual('name <address>')
      expect(util.formatSender('""""name""""', 'address')).toEqual('"name" <address>')
      expect(util.formatSender(undefined, 'address')).toEqual('address')
      expect(util.formatSender('', 'address')).toEqual('address')
    })
  })

  describe('getPriority', function () {
    it('should return a jquery node', function () {
      let result
      result = util.getPriority(undefined)
      expect(result.is('span')).toEqual(true)

      result = util.getPriority({ priority: 3 })
      expect(result).toHaveLength(0)
    })
  })

  describe('getAccountName', function () {
    const accountName = 'Pierce Hawthorne'

    it('should return a fallback string for invalid date', function () {
      expect(util.getAccountName(undefined)).toEqual('N/A')
    })

    it('should return the account name for all ids others than primary', function () {
      expect(util.getAccountName({ id: '553', account_name: accountName })).toEqual(accountName)
    })

    it('should return not the account name for the id of the primary account', function () {
      const result = util.getAccountName({ id: 'default0', account_name: accountName })
      expect(typeof result).toEqual('string')
      expect(result).not.toEqual(accountName)
    })
  })

  describe('timestamp functions', function () {
    it('should return "unknown" for invalid date', function () {
      expect(util.getTime(undefined)).toEqual('unknown')
      expect(util.getDateTime(undefined)).toEqual('unknown')
      expect(util.getFullDate(undefined)).toEqual('unknown')
    })

    it('should return a date string for valid date', function () {
      moment.tz.setDefault('Europe/Berlin')
      expect(util.getTime(1379508350)).toEqual('1/17/1970')
      expect(util.getDateTime(1379508350)).toEqual('1/17/1970 12:11 AM')
      expect(util.getFullDate(1379508350)).toEqual('1/17/1970 12:11 AM')
    })
  })

  describe('some of the check functions', function () {
    it('should return "undefined" for invalid date', function () {
      // invalid: returns undefined
      expect(util.isUnseen(undefined)).toBeUndefined()
      expect(util.isDeleted(undefined)).toBeUndefined()
      expect(util.isSpam(undefined)).toBeUndefined()
      expect(util.byMyself(undefined)).toBeUndefined()
    })

    it('should return "false" for invalid date', function () {
      expect(util.isAnswered(undefined)).toEqual(false)
      expect(util.isForwarded(undefined)).toEqual(false)
      expect(util.isAttachment(undefined)).toEqual(false)
      expect(util.isAttachment([])).toEqual(false)
      expect(util.hasOtherRecipients(undefined)).toEqual(false)
    })

    it('should normalize a string-based list of domains and mail addresses', function () {
      const list = ' alice@example.com,  ,      \nexample.de\nbob@example.org '
      expect(util.asList(list)).toContain('alice@example.com')
      expect(util.asList(list)).toContain('example.de')
      expect(util.asList(list)).toContain('bob@example.org')
      expect(util.asList(list)).toBeInstanceOf(Array)
      expect(util.asList(list)).toHaveLength(3)
    })

    it('should identify allowlisted mail addresses', function () {
      const allowlist = 'alice@example.com, example.de, bob@example.org'
      // empty
      expect(util.isAllowlisted('bob@example.com')).toEqual(false)
      expect(util.isAllowlisted('bob@example.com', '')).toEqual(false)
      // strings
      expect(util.isAllowlisted('alice@example.com', allowlist)).toEqual(true)
      expect(util.isAllowlisted('bob@example.de', allowlist)).toEqual(true)
      expect(util.isAllowlisted('alice@example.org', allowlist)).toEqual(false)
      expect(util.isAllowlisted('bob@example.com', allowlist)).toEqual(false)
      // mail object
      expect(util.isAllowlisted({ from: [['', 'alice@example.com']] }, allowlist)).toEqual(true)
      expect(util.isAllowlisted({ from: [['', 'bob@example.com']] }, allowlist)).toEqual(false)
    })

    it('should return "0" for invalid date', function () {
      const result = util.count(undefined)
      expect(typeof result).toEqual('number')
      expect(result).toEqual(0)
    })

    it('should return an empty array for invalid date', function () {
      const result = util.getAttachments(undefined)
      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(0)
    })

    it('should return a boolean for valid data', function () {
      // valid: returns true
      expect(util.isUnseen({ flags: 16 })).toEqual(true)
      expect(util.isDeleted({ flags: 2 })).toEqual(true)
      expect(util.isSpam({ flags: 128 })).toEqual(true)
      expect(util.isAnswered({ flags: 1 })).toEqual(true)
      expect(util.isForwarded({ flags: 256 })).toEqual(true)
      expect(util.isAttachment({ id: 4711, parent: {} })).toEqual(true)
      expect(util.hasOtherRecipients({ to: [['', 'some address']], cc: '', bcc: '' })).toEqual(true)
      // valid: returns false
      expect(util.isUnseen({ flags: 32 })).toEqual(false)
      expect(util.isDeleted({ flags: 1 })).toEqual(false)
      expect(util.isSpam({ flags: 64 })).toEqual(false)
      expect(util.isAnswered({ flags: 2 })).toEqual(false)
      expect(util.isAttachment({ id: 4711 })).toEqual(false)
      expect(util.isForwarded({ flags: 128 })).toEqual(false)
    })

    it('should return a number for valid data', function () {
      const result = util.count([{}, {}, { thread: [1, 2] }])
      expect(typeof result).toEqual('number')
      expect(result).toEqual(4)
    })
  })

  describe('handling folder-based view options', function () {
    beforeEach(function () {
      settings.flagByColor = true
      settings.flagByStar = false
      settings.set('viewOptions', {
        'default/INBOX': { sort: 661, order: 'desc', thread: false },
        'default/INBOX/A': { sort: 102, order: 'asc', thread: true },
        'default/INBOX/C': { sort: 602, order: 'desc', thread: false }
      })
    })

    it('return options for INBOX', function () {
      const options = util.getViewOptions({ folderId: 'default/INBOX', settings })
      expect(options).toEqual({ sort: 661, order: 'desc', thread: false })
    })

    it('return options for subfolders', function () {
      const options = util.getViewOptions({ folderId: 'default/INBOX/A', settings })
      expect(options).toEqual({ sort: 102, order: 'asc', thread: true })
    })

    it('inherits options for subfolders', function () {
      const options = util.getViewOptions({ folderId: 'default/INBOX/B', settings })
      expect(options).toEqual({ sort: 661, order: 'desc', thread: false })
    })

    it('defaults to 661 if sort by color is not supported', function () {
      settings.flagByColor = false
      const options = util.getViewOptions({ folderId: 'default/INBOX/A', settings })
      expect(options.sort).toEqual(661)
    })

    it('defaults to 661 if attachment maker is not supported', function () {
      let options = util.getViewOptions({ folderId: 'default/INBOX/C', settings, supportsAttachmentMarker: true })
      expect(options.sort).toEqual(602)
      options = util.getViewOptions({ folderId: 'default/INBOX/C', settings, supportsAttachmentMarker: false })
      expect(options.sort).toEqual(661)
    })

    it('sets thread to false if threading is not supported', function () {
      settings.flagByColor = true
      settings.set('threadSupport', false)
      const options = util.getViewOptions({ folderId: 'default/INBOX/A', settings })
      expect(options).toEqual({ sort: 102, order: 'asc', thread: false })
    })
  })
})
