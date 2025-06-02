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

import _ from '@/underscore'
import http from '@/io.ox/core/http'
import names from '@/io.ox/contacts/names'
import * as util from '@/io.ox/contacts/util'
import { settings } from '@/io.ox/contacts/settings'

const regSplitWords = /[\s,.\-:;<>()_@/'"]/g
const regReplyAddress = /^(noreply|no-reply|do-not-reply)@/
const regBrokenDisplayName = /^=\?iso-8859-1\?q\?=22/i
const defaultFields = 'last_name first_name nickname display_name email categories'.split(' ')
const defaultAddresses = 'email1 email2 email3'.split(' ')

function Index (fields = defaultFields) {
  this.fields = fields
  this.addresses = defaultAddresses
  this.tree = {}
  this.hash = {}
  this.fetched = {}
  this.minimumQueryLength = Math.max(1, settings.get('search/minimumQueryLength', 2))
}

Index.prototype.add = (function () {
  return function (item) {
    this.fields.forEach(name => {
      const value = item[name]
      if (typeof value !== 'string' || !value.length) return
      const normalized = normalize(value)
      const words = new Set([].concat(normalized.split(/\s/), normalized.split(regSplitWords)))
      firstLevel(this.tree, words, item.cid)
    })
  }

  function firstLevel (tree, words, id) {
    // first char
    words.forEach(function (word) {
      const key = word.substr(0, 1)
      if (!key) return
      const node = (tree[key] = tree[key] || {})
      secondLevel(node, word, id)
    })
  }

  function secondLevel (tree, word, id) {
    const key = word.substr(0, 2)
    const node = (tree[key] = tree[key] || {})
    thirdLevel(node, word, id)
  }

  function thirdLevel (tree, word, id) {
    const node = (tree[word] = tree[word] || {})
    node[id] = true
  }
}())

Index.prototype.resolve = function (ids, sortByRank = false) {
  return _([].concat(ids)).chain().map(cid => this.hash[cid]).compact().value()
    .sort(sortByRank ? sorter.byRank : sorter.byName)
}

Index.prototype.search = (function () {
  return async function (query, sortByRank = false) {
    // not string or too short?
    if (typeof query !== 'string') return []
    if (query.length < this.minimumQueryLength) return []
    query = normalize(query)
    // already fetched?
    const substr = query.substr(0, this.minimumQueryLength || 1)
    if (!this.fetched[substr]) await this.fetch(substr)
    else if (this.fetched[substr] !== true) await this.fetched[substr]
    // traverse for each word
    const set = query.split(/\s+/).filter(Boolean).reduce((matches, word, i) => {
      return new Set(traverse(this.tree, word, 1).filter(cid => {
        return i === 0 || matches.has(cid)
      }))
    }, new Set())
    return this.resolve(Array.from(set), sortByRank)
  }

  function traverse (tree, query, level) {
    const part = query.substr(0, level)
    return _(tree).reduce(function (array, node, word) {
      if (level <= 2) {
        // recursion until third level; check partial query
        return word.indexOf(part) === 0
          ? array.concat(traverse(node, query, level + 1))
          : array
      }
      // leaf node; return IDs
      return word.indexOf(query) === 0
        ? array.concat(_(node).keys())
        : array
    }, [])
  }
}())

Index.prototype.fetch = async function (query) {
  return (
    this.fetched[query] = http.GET({
      module: 'addressbooks',
      params: {
        action: 'autocomplete',
        query,
        admin: false,
        email: true,
        sort: '609',
        columns: '1,2,5,20,100,101,500,501,502,505,519,520,524,555,556,557,569,592,602,606,607',
        right_hand_limit: 0
      }
    })
      .then((result) => {
        this.fetched[query] = true
        result.forEach(item => this.processContact(item))
      })
      .catch(() => {
        this.fetched[query] = false
      })
  )
}

Index.prototype.processContact = function (item, index) {
  const displayName = item.display_name
  if (regBrokenDisplayName.test(displayName)) return
  const fullName = names.getFullName(item)
  const fullNameHtml = names.getFullName(item, { formatAsHTML: true })
  const initials = util.getInitials(item)
  const initialsColor = util.getInitialsColor(initials)
  const folderId = String(item.folder_id)
  const department = folderId === '6' ? String(item.department || '').trim() : ''
  const company = String(item.company || '').trim()
  const image = util.getImage(item)
  const categories = item.categories

  // add for each address
  this.addresses.forEach((field, fieldIndex) => {
    // we create an index-internal cid for each address; this one differs from common object cids
    const cid = (item.folderId || item.folder_id) + '.' + item.id + '.' + fieldIndex
    // avoid duplicates
    if (this.hash[cid]) return
    const address = String(item[field] || '').trim().toLowerCase()
    // drop no-reply addresses and broken imports
    if (!address || regReplyAddress.test(address)) return
    const keywords = normalize(fullName + ' ' + address + ' ' + department)
    // all lower-case to be case-insensitive; replace spaces to better match server-side collation
    const sortName = [item.last_name, item.first_name, address].filter(Boolean).join('_').toLowerCase().replace(/\s/g, '_')
    const rank = 1000 + ((folderId === '6' ? 10 : 0) + index) * 10 + fieldIndex
    const data = {
      caption: address,
      categories,
      cid,
      company,
      department,
      display_name: displayName,
      email: address,
      first_name: item.first_name,
      field,
      folder_id: folderId,
      full_name: fullName,
      full_name_html: fullNameHtml,
      id: String(item.id),
      image,
      initials,
      initials_color: initialsColor,
      keywords,
      last_name: item.last_name,
      sort_name: sortName,
      rank,
      user_id: item.internal_userid
    }
    this.hash[cid] = data
    this.add(data)
  })
}

const sorter = {
  byName (a, b) {
    // asc with locale compare
    return a.sort_name.localeCompare(b.sort_name)
  },
  byRank (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank
    return sorter.byName(a, b)
  }
}

function normalize (str) {
  return str.toLowerCase().replace(/[áàâäãéèëêíìïîóòöôõúùüûñçăşţß]/g, match => {
    switch (match) {
      case 'ä': return 'ae'
      case 'ö': return 'oe'
      case 'ü': return 'ue'
      case 'ß': return 'ss'
      case 'á': case 'à': case 'â': case 'ã': case 'ă': return 'a'
      case 'é': case 'è': case 'ë': case 'ê': return 'e'
      case 'í': case 'ì': case 'ï': case 'î': return 'i'
      case 'ó': case 'ò': case 'ô': case 'õ': return 'o'
      case 'ç': return 'c'
      case 'ş': return 's'
      case 'ţ': return 't'
      default: return match
    }
  })
}
Index.sorter = sorter.byName
Index.normalize = normalize

export default Index
