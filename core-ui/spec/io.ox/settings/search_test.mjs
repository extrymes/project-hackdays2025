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

// cSpell:ignore España

import { describe, beforeEach, it, expect } from '@jest/globals'
import { reset, add } from '@/io.ox/settings/index'

describe('Settings search', function () {
  describe('Simple search', function () {
    beforeEach(function () {
      const index = this.index = reset()
      index.add('lorem ipsum', '#1')
      index.add('dolor sit', '#2')
      index.add('lorem amet', '#3')
      index.add('Bär', '#4')
      index.add('Très Bon', '#5')
      index.add('España', '#6')
      index.add('E-Mail', '#7')
      index.add('Work-week', '#8')
    })

    it('should return empty array for empty queries', function () {
      expect(this.index.searchForIds(' ')).toEqual([])
    })

    it('should search for simple words', function () {
      expect(this.index.searchForIds('lorem')).toEqual(['#1', '#3'])
    })

    it('should search for two words', function () {
      expect(this.index.searchForIds('lorem ip')).toEqual(['#1'])
    })

    it('should search case-insensitive', function () {
      expect(this.index.searchForIds('DoLOr')).toEqual(['#2'])
    })

    it('should ignore white-space', function () {
      expect(this.index.searchForIds('  amet ')).toEqual(['#3'])
    })

    it('should handle accents', function () {
      expect(this.index.searchForIds('bar')).toEqual(['#4'])
      expect(this.index.searchForIds('tres')).toEqual(['#5'])
      expect(this.index.searchForIds('espana')).toEqual(['#6'])
    })

    it('should handle words with dashes', function () {
      expect(this.index.searchForIds('email')).toEqual(['#7'])
      expect(this.index.searchForIds('e-mail')).toEqual(['#7'])
      expect(this.index.searchForIds('workweek')).toEqual(['#8'])
      expect(this.index.searchForIds('work-week')).toEqual(['#8'])
    })
  })

  describe('complex examples', function () {
    beforeEach(function () {
      this.index = reset()
      add({ id: 'TEST1', text: 'This is an example text', page: 'Page 1', section: 'Section A', selector: '.selector-a', priority: 3 })
      add({ id: 'TEST2', text: 'This is an another text', page: 'Page 2', section: 'Section B', selector: '.selector-b', priority: 2 })
    })

    it('should handle settings sections', function () {
      expect(this.index.searchForIds('text')).toEqual(['TEST1', 'TEST2'])
      expect(this.index.searchForIds('example')).toEqual(['TEST1'])
      expect(this.index.searchForIds('ANOTHER')).toEqual(['TEST2'])
    })

    it('should find result in order', function () {
      expect(this.index.search('text')).toEqual([
        { text: 'This is an another text', page: 'Page 2', section: 'Section B', selector: '.selector-b', priority: 2 },
        { text: 'This is an example text', page: 'Page 1', section: 'Section A', selector: '.selector-a', priority: 3 }
      ])
    })
  })
})
