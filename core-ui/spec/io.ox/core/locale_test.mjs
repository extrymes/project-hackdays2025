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

// cSpell:ignore Großbritannien, Niederlande, Dorne

import { describe, it, expect } from '@jest/globals'
import ox from '@/ox'
import _ from '@/underscore'

import postal from '@/io.ox/core/locale/postal-address'

describe('Postal address', function () {
  const data = {
    street_home: '  street  ',
    postal_code_home: '  code  ',
    city_home: '  city  ',
    state_home: '  state  ',
    country_home: '  country  '
  }

  describe('identifies country code', function () {
    it('based on country-part of address', function () {
      expect(postal.getCountryCode('Deutschland')).toEqual('DE')
      expect(postal.getCountryCode('USA')).toEqual('US')
      expect(postal.getCountryCode('Großbritannien')).toEqual('GB')
      expect(postal.getCountryCode('Niederlande')).toEqual('NL')
      // fallback
      expect(postal.getCountryCode('Dorne')).toEqual('')
    })
  })

  describe('returns', function () {
    it('formated address', function () {
      let countrycode = 'BO'
      expect(postal.format(data, 'home', countrycode)).toEqual('street\ncode city state\ncountry')
      countrycode = 'US'
      expect(postal.format(data, 'home', countrycode)).toEqual('street\ncity state code\ncountry')
      countrycode = 'GB'
      expect(postal.format(data, 'home', countrycode)).toEqual('street\ncity\nstate code\ncountry')
    })

    it('formated address without needless whitespace', function () {
      const countrycode = 'BO'
      expect(postal.format(_.omit(data, 'city_home'), 'home', countrycode)).toEqual('street\ncode state\ncountry')
      expect(postal.format(_.pick(data, 'street_home', 'country_home'), 'home', countrycode)).toEqual('street\ncountry')
    })

    it('formated address with omitted STATE for specific countries', function () {
      const countrycode = 'DE'
      expect(postal.format(data, 'home', countrycode)).toEqual('street\ncode city\ncountry')
    })

    it('formated address with a valid fallback countrycode (US)', function () {
      const loc = ox.locale
      expect(postal.format(data, 'home')).toEqual('street\ncode city\nstate\ncountry')
      ox.locale = loc
    })
  })
})
