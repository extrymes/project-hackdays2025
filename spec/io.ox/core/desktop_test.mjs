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

import { describe, it, expect, jest } from '@jest/globals'

import { ox } from '@/io.ox/core/desktop'

describe('Core', function () {
  describe('ox.load', function () {
    it('with single module', async function () {
      const res = await ox.load(() => Promise.resolve({ test: 1 }))
      expect(res).toEqual({ test: 1 })
    })

    it('with multiple modules', async function () {
      const res = await ox.load(() => Promise.all([Promise.resolve({ test: 1 }), Promise.resolve({ test: 2 })]))
      expect(res).toEqual([{ test: 1 }, { test: 2 }])
    })

    it('timeout', async function () {
      const spy = jest.spyOn(ox, 'busy')
      ox.load(() => new Promise(resolve => {}))

      expect(spy).toBeCalledTimes(1)
      await new Promise(resolve => setTimeout(resolve, 1200))
      expect(spy).toBeCalledTimes(2)
    })
  })

  describe('ox.launch', function () {
    it('does not launch twice while pending', async function () {
      let resolveCallback
      const callback = jest.fn(() => new Promise(resolve => (resolveCallback = resolve)))

      ox.launch(callback)
      expect(callback.mock.calls.length).toBe(1)

      ox.launch(callback)
      expect(callback.mock.calls.length).toBe(1)

      // resolve with an empty app
      resolveCallback({ default: { getApp () { return { launch () {} } } } })

      // give it 1 ms to make sure the callstack is empty
      await new Promise(resolve => setTimeout(resolve, 1))

      ox.launch(callback)
      expect(callback.mock.calls.length).toBe(2)
    })
  })
})
