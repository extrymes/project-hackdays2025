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

import MailModel from '@/io.ox/mail/compose/model'

describe('Mail Compose Model', function () {
  describe('deep diffs', function () {
    it('should omit same values', function () {
      const diff = MailModel.prototype.deepDiff(
        { test: 'test', num: 123, bool: false },
        { test: 'test', num: 123, bool: false }
      )
      expect(diff).toStrictEqual({})
    })
    it('should contain simple changes', function () {
      const diff = MailModel.prototype.deepDiff(
        { test: 'test', s2: 'test', num: 123, bool: false },
        { test: 'testNew', s2: 'test', num: 1234, bool: true }
      )
      expect(diff).toStrictEqual({ test: 'testNew', num: 1234, bool: true })
    })
    it('should contain changes to undefined', function () {
      const diff = MailModel.prototype.deepDiff(
        { test: 'test' },
        { test: undefined }
      )
      expect(diff).toStrictEqual({ test: null })
    })
    it('should omit nested changes', function () {
      const diff = MailModel.prototype.deepDiff(
        { test: ['test', 'test1'], object: { test: { str: 'test' } } },
        { test: ['test', 'test1'], object: { test: { str: 'test' } } }
      )
      expect(diff).toStrictEqual({})
    })
    it('should contain nested changes for objects which did not exist before', function () {
      const diff = MailModel.prototype.deepDiff(
        {},
        { test: { test: 'test' } }
      )
      expect(diff).toStrictEqual({ test: { test: 'test' } })
    })
    it('should contain complex nested changes', function () {
      const diff = MailModel.prototype.deepDiff(
        { test: ['test', 'test1'], object: { test: { str: 'test', str2: 'change' } } },
        { test: ['testNew', 'test1'], object: { test: { str: 'test', str2: 'changed!' } } }
      )
      expect(diff).toStrictEqual({ test: ['testNew', 'test1'], object: { test: { str: 'test', str2: 'changed!' } } })
    })
  })
})
