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

import ext from '@/io.ox/core/extensions'
import $ from '@/jquery'

describe('Core extensions', function () {
  describe('baton clone()', () => {
    it('keeps state of isDefaultPrevented', function () {
      // prevent before clone
      const baton = ext.Baton()
      baton.preventDefault()
      const clone = baton.clone()

      expect(typeof baton.isDefaultPrevented).toBe('function')
      expect(typeof clone.isDefaultPrevented).toBe('function')
      expect(baton.isDefaultPrevented()).toBe(true)
      expect(clone.isDefaultPrevented()).toBe(true)

      // prevent after clone
      const anotherBaton = ext.Baton()
      const anotherClone = anotherBaton.clone()
      anotherBaton.preventDefault()

      expect(typeof anotherBaton.isDefaultPrevented).toBe('function')
      expect(typeof anotherClone.isDefaultPrevented).toBe('function')
      expect(anotherBaton.isDefaultPrevented()).toBe(true)
      expect(anotherClone.isDefaultPrevented()).toBe(false)
    })

    it('keeps state of stopPropagation', function () {
      // stop before clone
      const baton = ext.Baton()
      baton.stopPropagation()
      const clone = baton.clone()

      expect(typeof baton.isPropagationStopped).toBe('function')
      expect(typeof clone.isPropagationStopped).toBe('function')
      expect(baton.isPropagationStopped()).toBe(true)
      expect(clone.isPropagationStopped()).toBe(true)

      // stop after clone
      const anotherBaton = ext.Baton()
      const anotherClone = anotherBaton.clone()
      anotherBaton.stopPropagation()

      expect(typeof anotherBaton.isPropagationStopped).toBe('function')
      expect(typeof anotherClone.isPropagationStopped).toBe('function')
      expect(anotherBaton.isPropagationStopped()).toBe(true)
      expect(anotherClone.isPropagationStopped()).toBe(false)
    })

    it('supports different data types', function () {
      // prevent before clone
      const baton = ext.Baton()
      baton.$el = $('<div>')
      baton.array = ['value', {}]
      baton.object = { key: 'value', obj: {} }
      baton.string = 'value'
      baton.number = 1
      baton.boolean = true
      baton.null = null
      baton.unset = undefined
      baton.fn = () => { return 'value' }

      const clone = baton.clone({ string: 'overwritten-value' })

      baton.$el.append('<anotherdiv>')
      baton.array.push('anothervalue')
      baton.array[1].someKey = 'value'
      baton.object.anotherKey = 'anothervalue'
      baton.object.obj.someKey = 'value'
      baton.string = 'anothervalue'
      baton.number = 2
      baton.boolean = false
      baton.null = 'wasnull'
      baton.unset = 'wasundefined'
      baton.fn = () => { return 'anothervalue' }

      // shallow
      expect(clone.$el.get(0).outerHTML).toBe('<div><anotherdiv></anotherdiv></div>')
      // shallow for complex datatype properties/items
      expect(clone.array).not.toContain('anothervalue')
      expect(clone.array[1]).not.toContain('anothervalue')
      expect(Object.keys(clone.object)).not.toContain('anotherKey')
      expect(Object.keys(clone.object.obj)).toContain('someKey')

      // primitives
      expect(clone.string).toBe('overwritten-value')
      expect(clone.number).toBe(1)
      expect(clone.boolean).toBe(true)
      expect(clone.null).toBeNull()
      expect(clone.unset).toBeUndefined()
      expect(clone.fn()).toBe('value')
    })
  })
})
