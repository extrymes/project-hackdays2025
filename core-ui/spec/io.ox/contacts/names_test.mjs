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

// cSpell:words mult

import { describe, it } from '@jest/globals'
import { expect } from 'chai/index.mjs'
import names from '@/io.ox/contacts/names'

describe('Contact names', function () {
  describe('Full names as plain text', function () {
    it('should use last and first name', function () {
      const data = { first_name: 'John', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data)).to.equal('Doe, John')
    })

    it('should use academic title, last name, and first name', function () {
      const data = { title: 'Dr.', first_name: 'John', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data)).to.equal('Dr. Doe, John')
    })

    it('should use last name', function () {
      const data = { first_name: ' ', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data)).to.equal('Doe')
    })

    it('should use first name', function () {
      const data = { first_name: 'John', last_name: ' ', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data)).to.equal('John')
    })

    it('should use company', function () {
      const data = { first_name: ' ', last_name: ' ', company: 'ACME', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data)).to.equal('ACME')
    })

    it('should use display name as fallback', function () {
      const data = { first_name: ' ', last_name: ' ', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data)).to.equal('Dr. Doe, John')
    })

    it('should use cn as fallback', function () {
      const data = { first_name: ' ', last_name: ' ', cn: 'Dr. Doe, John' }
      expect(names.getFullName(data)).to.equal('Dr. Doe, John')
    })

    it('should consider yomi fields', function () {
      const data = { yomiFirstName: 'JOHN', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data)).to.equal('Doe, JOHN')
    })

    it('eventually falls back to empty string', function () {
      expect(names.getFullName({})).to.equal('')
    })
  })

  describe('Full names as HTML', function () {
    it('should return the correct full name (last and first)', function () {
      const data = { first_name: 'John', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data, { formatAsHTML: true })).to.equal('<strong class="last_name">Doe</strong>, <span class="first_name">John</span>')
    })

    it('should return the correct full name (title, last, and first)', function () {
      const data = { title: 'Dr.', first_name: 'John', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data, { formatAsHTML: true })).to.equal('<span class="title">Dr.</span> <strong class="last_name">Doe</strong>, <span class="first_name">John</span>')
    })

    it('should return the correct full name (last only)', function () {
      const data = { first_name: ' ', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data, { formatAsHTML: true })).to.equal('<strong class="last_name">Doe</strong>')
    })

    it('should return the correct full name (first only)', function () {
      const data = { first_name: 'John', last_name: ' ', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data, { formatAsHTML: true })).to.equal('<span class="first_name">John</span>')
    })

    it('should return the correct full name (display name fallback)', function () {
      const data = { first_name: ' ', last_name: ' ', display_name: 'Dr. Doe, John' }
      expect(names.getFullName(data, { formatAsHTML: true })).to.equal('<span class="display_name">Dr. Doe, John</span>')
    })
  })

  describe('Full names for mail addresses', function () {
    it('should use last and first name', function () {
      const data = { first_name: 'John', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getMailFullName(data)).to.equal('John Doe')
    })

    it('should skip academic title but use last and first name', function () {
      const data = { title: 'Dr.', first_name: 'John', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getMailFullName(data)).to.equal('John Doe')
    })

    it('should use last name', function () {
      const data = { first_name: ' ', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      expect(names.getMailFullName(data)).to.equal('Doe')
    })

    it('should use first name', function () {
      const data = { first_name: 'John', last_name: ' ', display_name: 'Dr. Doe, John' }
      expect(names.getMailFullName(data)).to.equal('John')
    })

    it('should skip the company, fallback to display name', function () {
      const data = { first_name: ' ', last_name: ' ', company: 'ACME', display_name: 'Dr. Doe, John' }
      expect(names.getMailFullName(data)).to.equal('Dr. Doe, John')
    })

    it('should use display name', function () {
      const data = { first_name: ' ', last_name: ' ', display_name: 'Dr. Doe, John' }
      expect(names.getMailFullName(data)).to.equal('Dr. Doe, John')
    })
  })

  describe('Full name format preference', function () {
    it('should consider user setting', function () {
      const data = { first_name: 'John', last_name: 'Doe', display_name: 'Dr. Doe, John' }
      names.setFormatSetting('firstname lastname')
      expect(names.getFullName(data)).to.equal('John Doe')
      expect(names.getFullName(data, { formatAsHTML: true })).to.equal('<span class="first_name">John</span> <strong class="last_name">Doe</strong>')
      expect(names.getMailFullName(data)).to.equal('John Doe')
      names.setFormatSetting('lastname, firstname')
      expect(names.getFullName(data)).to.equal('Doe, John')
      expect(names.getMailFullName(data)).to.equal('John Doe')
    })
  })

  describe('Academic titles', function () {
    it('extracts Dr.', function () {
      const result = names.test.extractAcademicTitle('Dr. Doe')
      expect(result.title).to.equal('Dr.')
      expect(result.name).to.equal('Doe')
    })
    it('extracts Prof. Dr. Dr.', function () {
      const result = names.test.extractAcademicTitle('Prof. Dr. Dr. Doe')
      expect(result.title).to.equal('Prof. Dr. Dr.')
      expect(result.name).to.equal('Doe')
    })
    it('extracts Prof. Dr. Dr.', function () {
      const result = names.test.extractAcademicTitle('Prof. Dr. Dr. Doe')
      expect(result.title).to.equal('Prof. Dr. Dr.')
      expect(result.name).to.equal('Doe')
    })
    it('extracts Dr.-Ing.', function () {
      const result = names.test.extractAcademicTitle('Dr.-Ing. Doe')
      expect(result.title).to.equal('Dr.-Ing.')
      expect(result.name).to.equal('Doe')
    })
    it('extracts Prof. Dr. Dr. h.c. mult.', function () {
      const result = names.test.extractAcademicTitle('Prof. Dr. Dr. h.c. mult. Doe')
      expect(result.title).to.equal('Prof. Dr. Dr. h.c. mult.')
      expect(result.name).to.equal('Doe')
    })
    it('extracts Prof Dr without dots', function () {
      const result = names.test.extractAcademicTitle('Prof Dr Doe')
      expect(result.title).to.equal('Prof Dr')
      expect(result.name).to.equal('Doe')
    })
  })

  describe('Derive name parts', function () {
    it('decomposes "last comma first"', function () {
      const result = names.deriveNameParts('Doe, Hans-John')
      expect(result.first_name).to.equal('Hans-John')
      expect(result.last_name).to.equal('Doe')
    })
    it('ignores leading and trailing spaces', function () {
      const result = names.deriveNameParts(' Doe, Hans-John ')
      expect(result.first_name).to.equal('Hans-John')
      expect(result.last_name).to.equal('Doe')
    })
    it('decomposes "last comma first" with spaces', function () {
      const result = names.deriveNameParts('Le Doe, John')
      expect(result.first_name).to.equal('John')
      expect(result.last_name).to.equal('Le Doe')
    })
    it('decomposes "first space last"', function () {
      const result = names.deriveNameParts('Hans-John Doe')
      expect(result.first_name).to.equal('Hans-John')
      expect(result.last_name).to.equal('Doe')
    })
    it('handles academic titles', function () {
      const result = names.deriveNameParts('Dr. Hans-John Doe')
      expect(result.title).to.equal('Dr.')
      expect(result.first_name).to.equal('Hans-John')
      expect(result.last_name).to.equal('Doe')
    })
    it('handles known suffixes', function () {
      const result = names.deriveNameParts('Dr. Hans-John Doe MdB')
      expect(result.title).to.equal('Dr.')
      expect(result.suffix).to.equal('MdB')
      expect(result.first_name).to.equal('Hans-John')
      expect(result.last_name).to.equal('Doe MdB')
      expect(result.sort_name).to.equal('doe.hans-john')
    })
    it('handles known prefixes', function () {
      const result = names.deriveNameParts('Peter ter Torstensen')
      expect(result.title).to.equal('')
      expect(result.prefix).to.equal('ter')
      expect(result.suffix).to.equal('')
      expect(result.first_name).to.equal('Peter')
      expect(result.last_name).to.equal('ter Torstensen')
      expect(result.sort_name).to.equal('torstensen.peter')
    })
    it('handles known prefixes with academic titles', function () {
      const result = names.deriveNameParts('Prof. Dr. Peter van der Speed LLM')
      expect(result.title).to.equal('Prof. Dr.')
      expect(result.prefix).to.equal('van der')
      expect(result.suffix).to.equal('LLM')
      expect(result.first_name).to.equal('Peter')
      expect(result.last_name).to.equal('van der Speed LLM')
      expect(result.sort_name).to.equal('speed.peter')
    })
  })
})
