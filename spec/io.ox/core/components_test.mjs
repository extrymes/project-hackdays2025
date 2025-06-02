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

import { createIcon } from '@/io.ox/core/components'

describe('createIcon', () => {
  it('should return a jQuery object', () => {
    const icon = createIcon()
    expect(icon).toBeDefined()
    // check for well-known jQuery method
    expect(icon.one).toBeInstanceOf(Function)
  })

  it('should inject svg data into the icon', () => {
    const icon = createIcon('<svg><circle r="50" /></svg>')

    expect(icon.attr('aria-hidden')).toEqual('true')

    expect(icon.find('circle')).toHaveLength(1)
    expect(icon.find('circle').attr('r')).toEqual('50')
  })

  it('should lazily inject svg data into the icon', async () => {
    let doInject
    const svgPromise = new Promise(resolve => {
      doInject = () => resolve('<svg><circle r="50" /></svg>')
    })
    const icon = createIcon(svgPromise)

    expect(icon.attr('width')).toEqual('16')
    expect(icon.attr('height')).toEqual('16')
    expect(icon.attr('aria-hidden')).toEqual('true')

    expect(icon.find('circle')).toHaveLength(0)
    await doInject()
    expect(icon.find('circle')).toHaveLength(1)
    expect(icon.find('circle').attr('r')).toEqual('50')
  })

  describe('events', () => {
    it('should fire a load event when the icon is loaded', async () => {
      let doInject
      const svgPromise = new Promise(resolve => {
        doInject = () => resolve('<svg><circle r="50" /></svg>')
      })
      const spy = jest.fn()
      const icon = createIcon(svgPromise)
      icon.on('load', spy)

      expect(icon.attr('width')).toEqual('16')
      expect(icon.attr('height')).toEqual('16')
      expect(icon.attr('aria-hidden')).toEqual('true')

      expect(icon.find('circle')).toHaveLength(0)
      expect(spy).toHaveBeenCalledTimes(0)
      await doInject()
      expect(icon.find('circle')).toHaveLength(1)
      expect(icon.find('circle').attr('r')).toEqual('50')
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should fire for icons defined synchronously', async () => {
      const spy = jest.fn()
      const icon = createIcon('<svg><circle r="50" /></svg>')
      icon.on('load', spy)

      expect(icon.attr('aria-hidden')).toEqual('true')

      expect(icon.find('circle')).toHaveLength(1)
      expect(icon.find('circle').attr('r')).toEqual('50')
      expect(spy).toHaveBeenCalledTimes(0)
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
