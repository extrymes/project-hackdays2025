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

import * as util from '@/io.ox/contacts/util'

const testPerson = {
  image1_url: '/ajax/image/contact/picture?folder=11179&id=510778&timestamp=1379590562489',
  first_name: 'John',
  last_name: 'Doe',
  display_name: 'Dr. Doe, John',
  email1: 'john1@oxoe.io',
  email2: 'john2@oxoe.io',
  email3: 'john3@oxoe.io',
  company: 'company',
  department: 'department',
  position: 'position',
  city_business: 'city_business',
  city_home: 'city_home'
}
const testPersonWOPic = {
  first_name: 'John',
  last_name: 'Doe'
}

describe('Contact util', function () {
  it('should return a prepared full contact name for sorting purpose', function () {
    expect(util.getSortName(testPerson)).toEqual('doe.john')
    expect(util.getSortName({})).toHaveLength(0)
  })

  it('should return the prepared full name', function () {
    const a = { first_name: ' ', last_name: 'Doe', display_name: 'Dr. Doe, John' }
    const b = { first_name: 'John', last_name: ' ', display_name: 'Dr. Doe, John' }
    const c = { first_name: ' ', last_name: ' ', display_name: 'Dr. Doe, John' }
    expect(util.getFullName(a)).toEqual('Doe')
    expect(util.getFullName(b)).toEqual('John')
    expect(util.getFullName(c)).toEqual('Dr. Doe, John')
  })

  it('should ignore first and last name if it just contains blanks', function () {
    expect(util.getFullName(testPerson)).toEqual('Doe, John')
  })

  it('should return the display name if available otherwise combine first and last name ', function () {
    expect(util.getDisplayName(testPerson)).toEqual('Dr. Doe, John')
    expect(util.getDisplayName(testPersonWOPic)).toEqual('Doe, John')
  })

  it('should return the display name if available otherwise combine first and last name ', function () {
    expect(util.getMailFullName(testPerson)).toEqual('John Doe')
  })

  it('should return the first available mail address ', function () {
    expect(util.getMail(testPerson)).toEqual('john1@oxoe.io')
  })

  it('should return a combined string of position and company', function () {
    expect(util.getJob(testPerson)).toEqual('company, position')
  })

  it('should return the mailfield ID of a selected E-Mail', function () {
    expect(util.calcMailField(testPerson, testPerson.email2)).toEqual(2)
    expect(util.calcMailField(testPerson, testPerson.email1)).toEqual(1)
    expect(util.calcMailField(testPerson, testPerson.email3)).toEqual(3)
  })

  it('should correctly convert birthdays to Gregorian calendar', function () {
    expect(util.julianToGregorian(-62122809600000))// May 29 Year 1
      .toEqual(-62122636800000)// May 31 Year 1
  })

  it('should correctly convert birthdays to Julian calendar', function () {
    expect(util.gregorianToJulian(-62122636800000))// May 31 Year 1
      .toEqual(-62122809600000)// May 29 Year 1
  })
})
