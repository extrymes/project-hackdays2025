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

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

import SearchView, { unitTesting } from '@/io.ox/backbone/views/search'

const filters = [
  // id, label, prefix (fallback is label lowercase), type (optional), unique, visible
  ['to', 'To', '', 'string', false],
  ['from', 'From', '', 'string', true],
  ['subject', 'Subject', '', 'string', true]
]
const defaults = {
  addresses: '',
  after: '',
  attachment: false,
  before: '',
  file: '',
  flagged: false,
  from: '',
  subject: '',
  to: '',
  words: ''
}

describe('Search view: getLastWord function', () => {
  it('should detect the last word', () => {
    expect(unitTesting.getLastWord('Test')).toEqual({ prefix: '', typed: 'Test', unquoted: 'Test', word: 'Test' })
    expect(unitTesting.getLastWord('Test Test2')).toEqual({ prefix: '', typed: 'Test2', unquoted: 'Test2', word: 'Test2' })
    expect(unitTesting.getLastWord('Test Test2  Test3')).toEqual({ prefix: '', typed: 'Test3', unquoted: 'Test3', word: 'Test3' })
  })

  it('should detect filter prefixes with non quoted words', () => {
    expect(unitTesting.getLastWord('To:Test')).toEqual({ prefix: 'To', typed: 'Test', unquoted: 'Test', word: 'To:Test' })
    expect(unitTesting.getLastWord('hello To:Test')).toEqual({ prefix: 'To', typed: 'Test', unquoted: 'Test', word: 'To:Test' })
  })

  it('should detect filter prefixes with quoted words', () => {
    expect(unitTesting.getLastWord('To:"Test"')).toEqual({ prefix: 'To', typed: '"Test"', unquoted: 'Test', word: 'To:"Test"' })
    expect(unitTesting.getLastWord('hello To:"Test"')).toEqual({ prefix: 'To', typed: '"Test"', unquoted: 'Test', word: 'To:"Test"' })
  })

  it('should detect quoted words correctly', () => {
    expect(unitTesting.getLastWord('"Test"')).toEqual({ prefix: '', typed: '"Test"', unquoted: 'Test', word: '"Test"' })
    expect(unitTesting.getLastWord('"Test Test2"')).toEqual({ prefix: '', typed: '"Test Test2"', unquoted: 'Test Test2', word: '"Test Test2"' })
    expect(unitTesting.getLastWord('"Test Test2" "Test3"')).toEqual({ prefix: '', typed: '"Test3"', unquoted: 'Test3', word: '"Test3"' })
    expect(unitTesting.getLastWord('"Test" "Test2 Test3"')).toEqual({ prefix: '', typed: '"Test2 Test3"', unquoted: 'Test2 Test3', word: '"Test2 Test3"' })
  })

  it('should detect quoted words correctly if closing quotation mark is missing', () => {
    expect(unitTesting.getLastWord('"Test')).toEqual({ prefix: '', typed: '"Test"', unquoted: 'Test', word: '"Test"' })
    expect(unitTesting.getLastWord('To:"Test')).toEqual({ prefix: 'To', typed: '"Test"', unquoted: 'Test', word: 'To:"Test"' })
    expect(unitTesting.getLastWord('"Test Test2')).toEqual({ prefix: '', typed: '"Test Test2"', unquoted: 'Test Test2', word: '"Test Test2"' })
    expect(unitTesting.getLastWord('"Test Test2" "Test3')).toEqual({ prefix: '', typed: '"Test3"', unquoted: 'Test3', word: '"Test3"' })
    expect(unitTesting.getLastWord('"Test" "Test2 Test3')).toEqual({ prefix: '', typed: '"Test2 Test3"', unquoted: 'Test2 Test3', word: '"Test2 Test3"' })
  })

  it('should work with mixed quoted and unquoted words', () => {
    expect(unitTesting.getLastWord('"Test" Test2')).toEqual({ prefix: '', typed: 'Test2', unquoted: 'Test2', word: 'Test2' })
    expect(unitTesting.getLastWord('"Test" To:Test2')).toEqual({ prefix: 'To', typed: 'Test2', unquoted: 'Test2', word: 'To:Test2' })
    expect(unitTesting.getLastWord('"Test" To:"Test2"')).toEqual({ prefix: 'To', typed: '"Test2"', unquoted: 'Test2', word: 'To:"Test2"' })
    expect(unitTesting.getLastWord('Test "Test2"')).toEqual({ prefix: '', typed: '"Test2"', unquoted: 'Test2', word: '"Test2"' })
    expect(unitTesting.getLastWord('"Test Test2" Test3')).toEqual({ prefix: '', typed: 'Test3', unquoted: 'Test3', word: 'Test3' })
    expect(unitTesting.getLastWord('"Test" Test2 Test3')).toEqual({ prefix: '', typed: 'Test3', unquoted: 'Test3', word: 'Test3' })
    expect(unitTesting.getLastWord('"Test" Test2 Test3"')).toEqual({ prefix: '', typed: 'Test3', unquoted: 'Test3', word: 'Test3' })
  })

  it('should ignore empty input endings', () => {
    expect(unitTesting.getLastWord('a ')).toEqual({ prefix: '', typed: 'a', unquoted: 'a', word: 'a' })
    expect(unitTesting.getLastWord('a"')).toEqual({ prefix: '', typed: 'a', unquoted: 'a', word: 'a' })
    expect(unitTesting.getLastWord('a""')).toEqual({ prefix: '', typed: 'a', unquoted: 'a', word: 'a' })
    expect(unitTesting.getLastWord('a" ')).toEqual({ prefix: '', typed: 'a', unquoted: 'a', word: 'a' })
    expect(unitTesting.getLastWord('a" "')).toEqual({ prefix: '', typed: 'a', unquoted: 'a', word: 'a' })
    expect(unitTesting.getLastWord('a"" ""')).toEqual({ prefix: '', typed: 'a', unquoted: 'a', word: 'a' })
    expect(unitTesting.getLastWord('a"" "" ')).toEqual({ prefix: '', typed: 'a', unquoted: 'a', word: 'a' })
    expect(unitTesting.getLastWord('a"" ""  """"   "')).toEqual({ prefix: '', typed: 'a', unquoted: 'a', word: 'a' })
  })

  it('should ignore empty inputs', () => {
    expect(unitTesting.getLastWord()).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
    expect(unitTesting.getLastWord('')).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
    expect(unitTesting.getLastWord(' ')).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
    expect(unitTesting.getLastWord('"')).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
    expect(unitTesting.getLastWord('""')).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
    expect(unitTesting.getLastWord('" ')).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
    expect(unitTesting.getLastWord('" "')).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
    expect(unitTesting.getLastWord('"" ""')).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
    expect(unitTesting.getLastWord('"" "" ')).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
    expect(unitTesting.getLastWord('"" ""  """"   "')).toEqual({ prefix: '', typed: '', unquoted: '', word: '' })
  })
})

describe('Search view: parse Query function', () => {
  let searchView

  beforeEach(function () {
    searchView = new SearchView({
      defaults,
      filters
    })
  })
  afterEach(function () {
    searchView.remove()
    searchView = null
  })

  it('parses basic input correctly', () => {
    expect(searchView.parseQuery('Test')).toEqual({ words: 'Test' })
    expect(searchView.parseQuery('Test Test2')).toEqual({ words: 'Test Test2' })
    expect(searchView.parseQuery('"Test Test"')).toEqual({ words: '"Test Test"' })
    expect(searchView.parseQuery('my ❤️ will go on')).toEqual({ words: 'my ❤️ will go on' })
  })

  it('parses complex search queries with filters correctly', () => {
    expect(searchView.parseQuery('to:test@acme.com')).toEqual({ to: 'test@acme.com' })
    expect(searchView.parseQuery('from:test@acme.com')).toEqual({ from: 'test@acme.com' })
    expect(searchView.parseQuery('to:road@runner.com ACME')).toEqual({ to: 'road@runner.com', words: 'ACME' })
    expect(searchView.parseQuery('to:roadrunner ACME Foobar')).toEqual({ to: 'roadrunner', words: 'ACME Foobar' })
    expect(searchView.parseQuery('to:a@b to:b@c lorem ipsum')).toEqual({ to: 'a@b b@c', words: 'lorem ipsum' })
    expect(searchView.parseQuery('to:"coyote acme"')).toEqual({ to: '"coyote acme"' })
    expect(searchView.parseQuery('to:coyote@acme.com from:support@acme.com subject:"Anvil delivery"'))
      .toEqual({ to: 'coyote@acme.com', from: 'support@acme.com', subject: '"Anvil delivery"' })
    expect(searchView.parseQuery('Where is my anvil? to:sales@acme.com')).toEqual({ to: 'sales@acme.com', words: 'Where is my anvil?' })
  })

  it('parses queries with date filters correctly', () => {
    searchView.dateRange({ mandatoryAfter: false, mandatoryBefore: false })
    const d = new Date('1.1.2020').valueOf()
    expect(searchView.parseQuery('after:1.1.2020')).toEqual({ after: d })
    expect(searchView.parseQuery('before:1/1/2020')).toEqual({ before: d })
    expect(searchView.parseQuery('before:1/1/2020 after:1/1/2020')).toEqual({ before: d, after: d })
  })
})

describe('Search: queryHasWords function', () => {
  it('returns a string containing only words, not filters', () => {
    expect(unitTesting.queryHasWords('bla foobar')).toEqual('bla foobar')
    expect(unitTesting.queryHasWords('from:bob@acme.com foobar')).toEqual('foobar')
    expect(unitTesting.queryHasWords('from:bob@acme.com')).toEqual('')
    expect(unitTesting.queryHasWords('from:bob@acme.com foobar super duper')).toEqual('foobar super duper')
  })
})

describe('Search: isEmptyWord function', () => {
  it('checks if a given string is empty in terms of searchable content', () => {
    expect(unitTesting.isEmptyWord('foo')).toEqual(false)
    expect(unitTesting.isEmptyWord('"foo" "some" thing')).toEqual(false)
    expect(unitTesting.isEmptyWord(' ')).toEqual(true)
    expect(unitTesting.isEmptyWord('""')).toEqual(true)
    expect(unitTesting.isEmptyWord('"" "" "    "')).toEqual(true)
  })
})
