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

import OAuth from '@/io.ox/oauth/backbone'

describe('OAuth', function () {
  describe('Account Model', function () {
    const Model = OAuth.Account.Model

    it('should be a Backbone Model', function () {
      const m = new Model()
      expect(m).toBeDefined()
    })

    it('should have a way to query enabled scopes', function () {
      const m = new Model({
        enabledScopes: ['drive', 'mail']
      })
      expect(m.hasScopes).toBeInstanceOf(Function)
      expect(m.hasScopes('drive')).toEqual(true)
      expect(m.hasScopes('mail')).toEqual(true)
      expect(m.hasScopes('not existing')).toEqual(false)
    })

    it('should have a way to query multiple enabled scopes', function () {
      const m = new Model({
        enabledScopes: ['contacts', 'contacts_ro', 'drive', 'mail']
      })
      expect(m.hasScopes).toBeInstanceOf(Function)
      expect(m.hasScopes(['contacts'])).toEqual(true)
      expect(m.hasScopes(['contacts_ro'])).toEqual(true)
      expect(m.hasScopes(['contacts', 'contacts_ro'])).toEqual(true)
    })

    it('should have a way to query multiple enabled scopes which are partially enabled', function () {
      const m = new Model({
        enabledScopes: ['contacts', 'drive', 'mail']
      })
      expect(m.hasScopes).toBeInstanceOf(Function)
      expect(m.hasScopes(['contacts', 'contacts_ro'])).toEqual(true)
    })
  })
})
