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
import { gt } from 'gettext'

import mailfilterModel from '@/io.ox/mail/mailfilter/settings/model'

const emptyModel = {
  rulename: gt('New rule'),
  test: {
    id: 'true'
  },
  actioncmds: [],
  flags: [],
  active: true
}
const returnedModel = mailfilterModel.protectedMethods.provideEmptyModel()

describe('Mailfilter model', function () {
  describe('should provide empty model', function () {
    it('should return a object', function () {
      expect(returnedModel).toBeInstanceOf(Object)
    })

    it('should have a property rulename', function () {
      expect(returnedModel).toHaveProperty('rulename')
    })

    it('should be a string', function () {
      expect(typeof returnedModel.rulename).toEqual('string')
    })

    it('should be equal', function () {
      expect(returnedModel.rulename).toEqual(emptyModel.rulename)
    })

    it('should be a object', function () {
      expect(returnedModel.test).toBeInstanceOf(Object)
    })

    it('should have a property id', function () {
      expect(returnedModel.test).toHaveProperty('id', 'true')
    })

    it('should have a property actioncmds', function () {
      expect(returnedModel).toHaveProperty('actioncmds')
    })

    it('should be a array', function () {
      expect(returnedModel.actioncmds).toBeInstanceOf(Array)
    })

    it('should be empty', function () {
      expect(returnedModel.actioncmds).toHaveLength(0)
    })

    it('should have a property flags', function () {
      expect(returnedModel).toHaveProperty('flags')
    })

    it('should be a array', function () {
      expect(returnedModel.flags).toBeInstanceOf(Array)
    })

    it('should be empty', function () {
      expect(returnedModel.flags).toHaveLength(0)
    })

    it('should have a property active', function () {
      expect(returnedModel).toHaveProperty('active', true)
    })
  })
})
