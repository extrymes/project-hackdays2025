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

let leaves = {}

/**
 * Convenience function to add pages
 * @param {object} texts   - key = id, value = [text, selector]
 */
export function addPages (texts) {
  Object.entries(texts).forEach(([id, [text, selector]]) => {
    add({ id, text, page: text, section: '', selector })
  })
}

/**
 * Convenience function to bulk add texts
 * @param {string}  page      - page name
 * @param {string}  section   - section name (can be empty string)
 * @param {object}  texts     - key = id, value = array of text and selector
 */
export function bulkAdd (page, section, texts) {
  Object.entries(texts).forEach(([id, [text, selector, priority = 3]]) => {
    add({ id, text, page, section, selector, priority })
  })
}

/**
 * Add string to index that points at a settings page and section
 * @param {string} id       - settings ID (can be freely chosen)
 * @param {string} text     - text that gets added to the index
 * @param {string} page     - top-level page (e.g. Mail or Calendar)
 * @param {string} section  - section, can be empty string (e.g. Signatures)
 * @param {string} selector - CSS selector to spot the element
 * @param {number} priority - priority for sorting
 */
export function add ({ id, text = '', page = '', section = '', selector = '', priority = 3 } = {}) {
  if (!isConfigurable[id]) return
  // warn for conflicts for easier debugging
  if (leaves[id]) return console.warn('settings/index: id already defined', id)
  leaves[id] = { text, page, section, selector, priority }
  // make text accessible by id
  st[id] = text
  index.add(text, id)
}

/**
 * Get information on a settings item
 * @param {string} id     - existing setting id
 */
export function getSetting (id) {
  return leaves[id]
}

/**
 * Just add string to index for consistent usage of st()
 * @param {string} id       - settings ID (can be freely chosen)
 * @param {string} text     - text that gets added to the index
 */
export function addText (id, text) {
  // warn for conflicts for easier debugging
  if (st[id]) return console.warn('settings/index: id already defined', id)
  st[id] = text
}

/**
 * Bulk add synonymous strings to index
 * @param {object} synonyms   - key = id, value = array of synonymId and new text
 */
export function addSynonyms (synonyms = {}) {
  Object.entries(synonyms).forEach(([id, [synonymId, text]]) => addSynonym(id, synonymId, text))
}

/**
 * Add synonymous text to index
 * @param {string} id         - existing id
 * @param {string} synonymId  - new synonym id
 * @param {string} text       - synonymous text
 */
export function addSynonym (id, synonymId, text) {
  const leaf = leaves[id]
  if (!leaf) return console.warn('settings/index: addSynonym() id is unknown', id)
  st[synonymId] = text
  index.add(text, id)
}

/**
 * Convenience functions for addSynonyms that automatically creates new index
 * by adding _EXPLANATION to the id
 * @param {object} explanations   - key = existing id, value = alternative text
 */
export function addExplanations (explanations = {}) {
  Object.entries(explanations).forEach(([id, text]) => addSynonym(id, `${id}_EXPLANATION`, text))
}

/**
 * Centrally track whether items are configurable
 * @param {object} items  - key = id, value = true/false
 */
export function setConfigurable (items) {
  Object.entries(items).forEach(([id, state]) => {
    // keep the two "!!"! state might be undefined, but we need a clear "false" alter on
    configurable[id] = !!state
  })
}

const configurable = {}

const handler = {
  get (hash, prop) {
    return hash[prop] !== false
  }
}
/**
 * Check whether a settings is defined as configurable
 */
export const isConfigurable = new Proxy(configurable, handler)

//
// Very simple index for fast lookups
//

function Index (leaves = {}) {
  this.tree = Node()
  this.st = {}
  const queryCache = {}

  Object.assign(this, {

    add (text = '', id) {
      normalize(text).split(/\s+/g).forEach(word => addWord(this.tree, word, id || text))
    },

    search (query = '') {
      return queryCache[query] || (queryCache[query] = this.searchForIds(query)
        .map(id => leaves[id]).sort((a, b) => a.priority - b.priority))
    },

    // separate function for testing purposes
    searchForIds (query = '') {
      query = normalize(query)
      if (!query) return []
      return [...new Set(query.split(' ').reduce((array, word) => {
        const matches = traverse(this.tree, word)
        return array ? matches.filter(i => array.includes(i)) : matches
      }, false))]
    }
  })

  function Node () {
    return { children: {}, ids: new Set() }
  }

  // remove white space, diacritics, dashes, punctuation marks etc.
  function normalize (str = '') {
    return String(str).trim().toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[.,;:!?/"'-]/g, '')
  }

  function addWord (node, word, id) {
    if (!word.length) return node.ids.add(id)
    const char = word[0]
    node.children[char] = node.children[char] || Node()
    addWord(node.children[char], word.substr(1), id)
  }

  function traverse (node, word = '') {
    if (!node) return []
    if (word.length > 0) return traverse(node.children[word[0]], word.substr(1))
    return [...node.ids].concat(
      Object.values(node.children).reduce((array, node) => array.concat(traverse(node, word.substr(1))), [])
    )
  }
}

//
// ------------------------------------------------------------
//

export let index = new Index(leaves)
export let st = index.st

// for testing purposes
export function reset () {
  leaves = {}
  index = new Index(leaves)
  st = index.st
  return index
}
