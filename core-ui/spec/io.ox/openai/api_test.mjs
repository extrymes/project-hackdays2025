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
// import _ from '@/underscore'
// import ox from '@/ox'

import { getSupportedLanguages, setSupportedLanguages } from '@/pe/openai/api'

describe('OpenAI', function () {
  describe('API', function () {
    it('should list all languages', function () {
      const languages = getSupportedLanguages()
      expect(languages.length).toBe(8)
    })
    it('should list English first', function () {
      const languages = getSupportedLanguages()
      expect(languages[0].id).toBe('en')
    })
    it('should list English first', function () {
      const languages = getSupportedLanguages()
      expect(languages[0].id).toBe('en')
    })
    it('should support allow-listing languages', function () {
      setSupportedLanguages('it de')
      const languages = getSupportedLanguages()
      expect(languages.length).toBe(3)
      // current first, rest sorted by name (German, Italian)
      expect(languages[0].id).toBe('en')
      expect(languages[1].id).toBe('de')
      expect(languages[2].id).toBe('it')
    })
  })
})
