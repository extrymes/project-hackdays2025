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

import _ from 'underscore'
import ox from '@/ox'
import $ from 'jquery'

export function deserialize (str, delimiter) {
  const pairs = (str || '').split(delimiter === undefined ? '&' : delimiter)
  let i = 0; const $l = pairs.length; let pair; const obj = {}; const d = decodeURIComponent
  for (; i < $l; i++) {
    pair = pairs[i]
    const keyValue = pair.split('='); const key = keyValue[0]; const value = keyValue[1]
    if (key !== '' || value !== undefined) {
      obj[d(key)] = value !== undefined ? d(value) : undefined
    }
  }
  return obj
}

const queryData = deserialize(document.location.search.substr(1), /&/)

/**
 * @param   {string} name [Name] of the query parameter
 * @returns {object}      Value or all values
 */
export function param (name) {
  return name === undefined ? queryData : queryData[name]
}

let hashData = {}
let obfuscationKey

/**
 * @param   {string} [name] Name of the hash parameter
 * @returns {object}        Value or all values
 */
export function locationHash (name, value) {
  if (arguments.length === 0) {
    return hashData
  } else if (arguments.length === 1) {
    if (_.isString(name)) return hashData[name]
    _(name).each((value, name) => set(name, value))
    updateLocationHash()
  } else if (arguments.length === 2) {
    set(name, value)
    updateLocationHash()
  }
}

function set (name, value) {
  if (value === null) delete hashData[name]; else hashData[name] = value
}

Object.assign(locationHash, {

  generateKey () {
    return new Array(5).join(random())
  },

  setObfuscationKey (key) {
    obfuscationKey = String(key).split('').map(i => parseInt(i, 10))
    decodeLocationHash()
  }
})

// this is not cryptography!
// it just makes certain parameters like "folder" unreadable
// for the rare case that it contains PII

function random () {
  return Math.random().toString().substr(2)
}

function obfuscateFolder (data = {}) {
  const obj = { ...data }
  // do not change 99% case
  if (/^default\d+\/inbox$/i.test(data.folder)) return obj
  // encrypt all other mail folders
  if (/^default\d+\//.test(data.folder)) {
    const index = data.folder.indexOf('/') + 1
    obj.folder = `${data.folder.substr(0, index)}/${obfuscateString(`path/${data.folder.substr(index)}`)}`
  }
  return obj
}

function deobfuscateFolder (data = {}) {
  const obj = { ...data }
  if (/^default\d+\/\//.test(data.folder)) {
    const index = obj.folder.indexOf('/') + 1
    const prefix = obj.folder.substr(0, index)
    const check = deobfuscateString(obj.folder.substr(index + 1))
    const suffix = check.substr(5)
    if (/^path\//.test(check) && suffix.length) {
      obj.folder = prefix + suffix
    } else {
      delete obj.folder
    }
  }
  return obj
}

function obfuscateString (str) {
  if (!obfuscationKey) return ''
  let result = ''
  for (let i = 0, k = obfuscationKey.length, l = str.length; i < l; i++) {
    result += String.fromCharCode(str.charCodeAt(i) + obfuscationKey[i % k])
  }
  return result
}

function deobfuscateString (str) {
  if (!obfuscationKey) return ''
  let result = ''
  for (let i = 0, k = obfuscationKey.length, l = str.length; i < l; i++) {
    result += String.fromCharCode(str.charCodeAt(i) - obfuscationKey[i % k])
  }
  return result
}

function updateLocationHash () {
  // maybe this early return is/was relevant for some type of testing
  if (!window?.location) return
  // update hash
  window.location.hash = _.serialize(obfuscateFolder(hashData), '&', (v) => {
    // need strict encoding for Japanese characters, for example
    // safari throws URIError otherwise (Bug 26411)
    // keep slashes and colons for readability
    return encodeURIComponent(v).replace(/%2F/g, '/').replace(/%3A/g, ':')
  })
}

function decodeLocationHash () {
  // since the hash might change we decode it for every request
  // firefox has a bug and already decodes the hash string, so we use href
  const hashStr = window.location.href.split('#')[1] || ''
  hashData = deobfuscateFolder(deserialize(hashStr))
}

decodeLocationHash()
$(window).on('hashchange', decodeLocationHash)

// remove mail folder in the first round since we don't have a key yet
if (/^default\d+\//.test(hashData.folder)) delete hashData.folder

/**
 * Redirect
 */
export function redirect (path) {
  // absolute or relative url
  if (!(/^#/).test(path)) {
    window.location.href = path
    return
  }
  // simple hash change
  window.location.replace(get(path))
  // enforce page reload
  setTimeout(() => window.location.reload(true))
}

function get (path) {
  const { protocol, host, pathname } = window.location
  return `${protocol}//${host}${pathname.replace(/\/[^/]*$/, `/${path}`)}`
}

// replace [variables] in a string; usually an URL. Values get escaped.
export function vars (url, customVariables) {
  const hash = getVariables(customVariables)
  // replace pattern "$word"
  return String(url).replace(/\[(\w+)\]/g, (all, key) => {
    key = String(key).toLowerCase()
    return key in hash ? encodeURIComponent(hash[key]) : all
  })
}

function getVariables (customVariables = {}) {
  const { hash, host, hostname, pathname, port, protocol, search } = window.location
  const { app, folder, id } = locationHash()
  // eslint-disable-next-line camelcase
  const { context_id, language, session, user, user_id } = ox
  // eslint-disable-next-line camelcase
  return { hash, host, hostname, pathname, port, protocol, search, app, folder, id, context_id, language, session, user, user_id, ...customVariables }
}
