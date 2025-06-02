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

import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { customize, customizations, applyCustomizations, addDictionary, dictionaries, changeLanguage } from '../src/gettext'
import { getNewDictionary } from './mocks/gettext-mock'

describe('handling multiple dictionaries', () => {
  it('should provide function to add dictionaries', () => {
    const gtFn = jest.fn()
    const namespace = 'test'

    expect(Object.keys(dictionaries)).toHaveLength(0)
    addDictionary({ namespace }, gtFn)
    expect(gtFn).not.toHaveBeenCalled()
    dictionaries[namespace]()
    expect(gtFn).toHaveBeenCalled()

    delete dictionaries[namespace]
  })

  it('should export gt namespaces mapping to their corresponding gt functions', () => {
    const namespaces = ['test1', 'test2']
    namespaces.forEach(namespace => {
      const gtFn = jest.fn()
      addDictionary({ namespace }, gtFn)
      expect(gtFn).not.toHaveBeenCalled()
      dictionaries[namespace]()
      expect(gtFn).toHaveBeenCalled()
    })
    expect(Object.keys(dictionaries)).toHaveLength(2)

    namespaces.forEach(n => delete dictionaries[n])
  })

  it('should provide API to change the language', async () => {
    const namespaces = ['test1', 'test2']
    namespaces.forEach(namespace => {
      const changeLanguage = jest.fn()
      addDictionary({ namespace }, { changeLanguage })
    })

    await changeLanguage('de_DE')

    namespaces.forEach(namespace => {
      expect(dictionaries[namespace].changeLanguage).toHaveBeenCalledWith('de_DE')
      delete dictionaries[namespace]
    })
  })
})

describe('overwriting entries from one dictionary to another', () => {
  afterEach(() => {
    delete dictionaries['io.ox/test']
    customizations.splice(0, customizations.length)
  })
  it('should overwrite an entry', async () => {
    const dict = getNewDictionary('io.ox/test')
    const repl = getNewDictionary('io.ox/replace')

    addDictionary(dict, dict)
    dict.addTranslation({ msgid: 'New email' }, ['foo'])
    dict.addTranslation({ msgid: 'New folder' }, ['foo'])
    repl.addTranslation({ msgid: 'New email' }, ['bar'])

    expect(dict.gettext('New email')).toBe('foo')
    customize('io.ox/test', repl)
    applyCustomizations()
    expect(dict.gettext('New email')).toBe('bar')
  })

  it('should overwrite multiple entries', async () => {
    const dict = getNewDictionary('io.ox/test')
    const repl = getNewDictionary('io.ox/replace')

    addDictionary(dict, dict)
    dict.addTranslation({ msgid: 'New email' }, ['foo'])
    dict.addTranslation({ msgid: 'New folder' }, ['foo'])
    repl.addTranslation({ msgid: 'New email' }, ['bar'])
    repl.addTranslation({ msgid: 'New folder' }, ['baz'])
    repl.addTranslation({ msgctx: 'Test', msgid: 'New folder' }, ['buzz'])
    repl.addTranslation({
      msgctx: 'Test',
      msgid: 'Delete %1$s folder',
      msgid_plural: 'Delete %1$s folders'
    }, ['%1$s buzz', '%1$s fizz'])
    repl.addTranslation({
      msgid: 'Delete %1$s folder',
      msgid_plural: 'Delete %1$s folders'
    }, ['%1$s buzzer', '%1$s fizzer'])

    expect(dict.gettext('New email')).toBe('foo')
    expect(dict.gettext('New folder')).toBe('foo')

    expect(dict.pgettext('Test', 'New folder')).toBe('New folder')

    expect(
      dict.npgettext('Test', 'Delete %1$s folder', 'Delete %1$s folders', 1, 1)
    ).toBe('Delete 1 folder')
    expect(
      dict.npgettext('Test', 'Delete %1$s folder', 'Delete %1$s folders', 2, 2)
    ).toBe('Delete 2 folders')

    expect(
      dict.ngettext('Delete %1$s folder', 'Delete %1$s folders', 1, 1)
    ).toBe('Delete 1 folder')
    expect(
      dict.ngettext('Delete %1$s folder', 'Delete %1$s folders', 2, 2)
    ).toBe('Delete 2 folders')

    customize('io.ox/test', repl)
    applyCustomizations()

    expect(dict.gettext('New email')).toBe('bar')
    expect(dict.gettext('New folder')).toBe('baz')

    expect(dict.pgettext('Test', 'New folder')).toBe('buzz')

    expect(
      dict.npgettext('Test', 'Delete %1$s folder', 'Delete %1$s folders', 1, 1)
    ).toBe('1 buzz')
    expect(
      dict.npgettext('Test', 'Delete %1$s folder', 'Delete %1$s folders', 2, 2)
    ).toBe('2 fizz')

    expect(
      dict.ngettext('Delete %1$s folder', 'Delete %1$s folders', 1, 1)
    ).toBe('1 buzzer')
    expect(
      dict.ngettext('Delete %1$s folder', 'Delete %1$s folders', 2, 2)
    ).toBe('2 fizzer')
  })

  it('should overwrite no entries', async () => {
    const dict = getNewDictionary('io.ox/test')
    const repl = getNewDictionary('io.ox/replace')

    addDictionary(dict, dict)
    dict.addTranslation({ msgid: 'New email' }, ['foo'])
    dict.addTranslation({ msgid: 'New folder' }, ['foo'])
    repl.addTranslation({ msgid: 'New text' }, ['bar'])
    repl.addTranslation({ msgid: 'New test' }, ['baz'])

    expect(dict.gettext('New email')).toBe('foo')
    expect(dict.gettext('New folder')).toBe('foo')
    customize('io.ox/test', repl)
    applyCustomizations()
    expect(dict.gettext('New email')).toBe('foo')
    expect(dict.gettext('New folder')).toBe('foo')
  })

  it('should create entries', async () => {
    const dict = getNewDictionary('io.ox/test')
    const repl = getNewDictionary('io.ox/replace')

    addDictionary(dict, dict)
    repl.addTranslation({ msgid: 'New email' }, ['bar'])
    repl.addTranslation({ msgid: 'New folder' }, ['baz'])

    expect(dict.gettext('New email')).toBe('New email')
    expect(dict.gettext('New folder')).toBe('New folder')
    customize('io.ox/test', repl)
    applyCustomizations()
    expect(dict.gettext('New email')).toBe('bar')
    expect(dict.gettext('New folder')).toBe('baz')
  })
})
