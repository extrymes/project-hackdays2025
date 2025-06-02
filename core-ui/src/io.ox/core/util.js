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

// cSpell:ignore pvalid, contexto

import $ from '@/jquery'
import _ from '@/underscore'
import ext from '@/io.ox/core/extensions'
import DOMPurify from 'dompurify'
import ox from '@/ox'

import { settings } from '@/io.ox/core/settings'
import capabilities from '@/io.ox/core/capabilities'

const LENGTH = 30
const regSeqSoft = /(\S{30,})/g
const regSeqHard = /(\S{30})/g
const regHyphenation = /([^.,;:-=()]+[.,;:-=()])/

let prefix = ox.serverConfig.prefix || '/ajax'
let regImageSrc = new RegExp('^' + prefix)
ox.on('server:up', () => {
  prefix = ox.serverConfig.prefix || prefix
  regImageSrc = new RegExp('^' + prefix)
})

ext.point('io.ox/core/person').extend({
  id: 'default',
  index: 100,
  draw (baton) {
    if (baton.html !== false) {
      this.append(baton.html)
    } else {
      this.text(baton.halo.name)
    }
  }
})
// basically regex from mail/detail/links.js tweaked to our needs
const regUrl = /(((http|https|ftp|ftps):\/\/|www\.)[^\s"]+)/gim

export function deepExtend (...args) {
  const merge = (target = {}, source) => {
    target = Object.assign({}, target)
    for (const key of Object.keys(source)) {
      if ((!target[key] || target[key] instanceof Object) && source[key] instanceof Object) {
        target[key] = merge(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
    return target
  }
  return args.filter(e => e).reduce(merge)
}

export function replacePrefix (data, replacement) {
  data = data || ''
  replacement = replacement || ''

  return data.replace(regImageSrc, replacement)
}

// render a person's name
export function renderPersonalName (options, data) {
  options = _.extend({
    $el: undefined,
    // must be properly escaped!
    html: false,
    // to support different tags
    tagName: 'span'
  }, options)

  const halo = {
    // alternative fields to get the name
    name: (options.html ? '' : options.full_name) || options.display_name || options.name || options.cn || options.email,
    // halo view looks for email1
    email: options.email,
    email1: options.email,
    // user id
    user_id: options.user_id
  }

  // add contact data if available, (extended entities for attendees for example)
  if (options.contact) halo.contact = options.contact

  if (!capabilities.has('contacts') || (data && data.nohalo)) options.$el = $('<span>')

  const baton = new ext.Baton({ data: data || {}, halo, html: options.html })

  // get node
  const node = options.$el || (
    halo.email || halo.user_id
      ? $('<a href="#" role="button" data-detail-popup="halo">').attr('title', halo.email).data(halo)
      : $('<' + options.tagName + '>')
  )

  ext.point('io.ox/core/person').invoke('draw', node.empty(), baton)

  return node
}

// remove unwanted quotes from display names
// "World, Hello" becomes World, Hello
// but "Say \"Hello\"" becomes Say "Hello"
export function unescapeDisplayName (str) {
  str = $.trim(str || '')

  // remove outer quotes
  while (str.length > 1 && /^["'\\\s]/.test(str[0]) && str[0] === str.substr(-1)) {
    str = $.trim(str.substr(1, str.length - 2))
  }

  // unescape inner quotes
  str = str.replace(/\\"/g, '"')

  // unescape escaped backslashes
  str = str.replace(/\\{2}/g, '\\')

  return str
}

export function parseStringifiedList (str = '') {
  if (str === null) return []
  if (typeof str !== 'string') return str
  return str
    // remove wrapping brackets if present
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    // replace obsolete single quotes and double quotes
    .replace(/['"]/g, '')
    // split items by comma or semicolon
    .split(/[;,]+/)
    // trim values
    .map(str => str.trim())
    // possible falsy values like '', undefined or 0
    .filter(Boolean)
}

// fix punctuation marks and brackets at end of URLs
// central helper to solve this only once
export function fixUrlSuffix (url, suffix) {
  suffix = suffix || ''
  url = url.replace(/([.,;!?<>(){}[\]|]+)$/, function (all, marks) {
    // see OXUIB-1053 , there are some links with brackets at the end, if theres a matching number of brackets inside the link, this is not a suffix, but part of the link
    if (marks === ')' && (url.match(/\)/g) || []).length === (url.match(/\(/g) || []).length) return marks
    if (marks === ']' && (url.match(/\]/g) || []).length === (url.match(/\[/g) || []).length) return marks
    suffix = marks + suffix
    return ''
  })
  return { url, suffix }
}

// remove (almost) all quotes from a string
export function removeQuotes (str) {
  // remove all outer single and double quotes; also remove all inner quotes
  return $.trim(str).replace(/^["'\\]+|["'\\]+$/g, '').replace(/\\?"/g, '')
}

// detect URLs in plain text
export function urlify (text) {
  text = (text || '').replace(regUrl, function (url) {
    const fix = fixUrlSuffix(url)
    // soft-break long words (like long URLs)
    const node = $('<a target="_blank" rel="noopener">').attr('href', fix.url).append(breakableHTML(fix.url))
    return node.prop('outerHTML') + fix.suffix
  })
  text = DOMPurify.sanitize(text, { ALLOW_DATA_ATTR: false, ALLOWED_TAGS: ['a', 'wbr'], ALLOWED_ATTR: ['target', 'rel', 'href'] })
  text = injectAttribute(text, 'a', 'rel', 'noopener')
  return text
}

// Regex to find a date tried to break it up to improve readability
const separator = '(-|\\/|\\.)' // finds -\.
const yearStart = '((\\D+|^)\\d{2}|20\\d{2})' // finds year in 2 digits (if preceded by a non number character or nothing) or in 4 digits if starting with 20
const yearEnd = '(\\d{2}|20\\d{2})' // finds year in 2 digits or in 4 digits if starting with 20
const dayOrMonth = '\\d{1,2}' // finds day or month with 1 or 2 digits
const regDate = new RegExp(
  // finds dates with year at last position
  `(${dayOrMonth}${separator}${dayOrMonth}${separator}${yearEnd}|` +
  // finds dates with year at first position
  `${yearStart}${separator}${dayOrMonth}${separator}${dayOrMonth})$`)

const regPhone = /(^|\s|[^0-9])(\+?[\d(]{1}[\d\x20/\-.()]{3,}[\d)]{1})($|\s|[^0-9])/gm
const regLink = /(<a.*?<\/a>)/
export function parsePhoneNumbers (text = '') {
  // split text up into links and none links (works fine if used after urlify function)
  return text.split(regLink)
    .map(part => {
      // if this is already a link, leave it as is
      if (regLink.test(part)) return part
      return part.replace(regPhone, (match, pre, number, post) => {
        // check if this is a date, if so return
        if (regDate.test(match)) return match
        // soft-break long words (like long URLs)
        const numberCleaned = number.replace(/[^+0-9]/g, '')
        // check if we have an empty match after cleaning. We want to avoid phone numbers like (((( etc
        if (numberCleaned.length === 0) return match
        return `${pre}<a href="callto:${numberCleaned}">${number}</a>${post}`
      })
    }).join('')
}

export function injectAttribute (text, tagName, attr, value) {
  const tmp = document.createElement('div')
  tmp.innerHTML = text
  _(tmp.getElementsByTagName(tagName)).each(function (node) {
    node.setAttribute(attr, value)
  })
  return tmp.innerHTML
}

// split long character sequences
export function breakableHTML (text) {
  // inject zero width space and replace by <wbr>
  const substrings = String(text || '').replace(regSeqSoft, function (match) {
    // soft break long sequences
    return _(match.split(regHyphenation))
      .map(function (str) {
        // hard break long sequences
        if (str.length === 0) return ''
        if (str.length < LENGTH) return str + '\u200B'
        return str.replace(regSeqHard, '$1\u200B')
      })
      .join('')
  })
  // split at \u200B, escape HTML and inject <wbr> tag
  return _(substrings.split('\u200B')).map(_.escape).join('<wbr>').replace(/\u00a0/g, '\u00a0<wbr>')
}

export function breakableText (text) {
  let result = String(text || '').replace(/(\S{20})/g, '$1\u200B')
  if (result[result.length - 1] === '\u200B') {
    result = result.slice(0, -1)
  }
  return result
}

// Calculates balanced string parts by width to insert an ellipsis in the exact middle of a given string
export const ellipsis = _.memoize(function (originalStr, options) {
  options = Object.assign({ fontSize: 14, fontFamily: 'sans-serif', maxWidth: 150 }, options)

  const getTextWidth = (text) => context.measureText(text).width
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  context.font = `${options.fontSize} ${options.fontFamily}`

  if (getTextWidth(originalStr) <= options.maxWidth) return originalStr

  const availableWidth = Math.floor((options.maxWidth - getTextWidth('\u2026')) / 2)
  let leftIndex = originalStr.length; let rightIndex = originalStr.length

  while (getTextWidth(originalStr.substr(0, leftIndex)) > availableWidth) leftIndex--
  while (getTextWidth(originalStr.substr(originalStr.length - rightIndex)) > availableWidth) rightIndex--
  // Add one more char to the right if there is space for one more char
  if (getTextWidth(originalStr.substr(0, leftIndex) + '\u2026' + originalStr.substr(originalStr.length - rightIndex + 1)) < options.maxWidth) rightIndex++

  return originalStr.substr(0, leftIndex) + '\u2026' + originalStr.substr(originalStr.length - rightIndex)
}, (...args) => args.map(arg => JSON.stringify(arg)).toString())

export const isValidMailAddress = (function () {
  const regQuotes = /^"[^"]+"$/
  const regLocal = /@/
  const regInvalid = /["\\,:; ]/
  const regDot = /^\./
  const regDoubleDots = /\.\./
  // domains with tld; subdomains; punycode
  const regPunycode = /^((xn--)?[a-z\d](-[a-z\d]|[a-z\d])*\.)+(xn--[a-z\d]{2,}|[a-z]{2,})$/
  // non-latin/utf8 aka international domain names;
  // excerpt from https://www.unicode.org/Public/idna/idna2008derived/Idna2008-15.0.0.txt
  // 0000..002C  ; DISALLOWED  # <control-0000>..COMMA
  // 002D        ; PVALID      # HYPHEN-MINUS
  // 002E..002F  ; DISALLOWED  # FULL STOP..SOLIDUS
  // 0030..0039  ; PVALID      # DIGIT ZERO..DIGIT NINE
  // 003A..0060  ; DISALLOWED  # COLON..GRAVE ACCENT
  // 0061..007A  ; PVALID      # LATIN SMALL LETTER A..LATIN SMALL LETTER Z
  // 007B..00B6  ; DISALLOWED  # LEFT CURLY BRACKET..PILCROW SIGN
  // 00B7        ; CONTEXTO    # MIDDLE DOT
  // 00B8..00DE  ; DISALLOWED  # CEDILLA..LATIN CAPITAL LETTER THORN
  // 00DF..00F6  ; PVALID      # LATIN SMALL LETTER SHARP S..LATIN SMALL LETTER O WITH DIAERESIS
  // 00F7        ; DISALLOWED  # DIVISION SIGN
  // 00F8..00FF  ; PVALID      # LATIN SMALL LETTER O WITH STROKE..LATIN SMALL LETTER Y WITH DIAERESIS
  // 0100        ; DISALLOWED  # LATIN CAPITAL LETTER A WITH MACRON
  // 0101        ; PVALID      # LATIN SMALL LETTER A WITH MACRON
  // ...
  // so far it seems as if [\p{L}\d] does a good job here (characters and numbers; no punctuation, for example)
  const regIDN = /^([\p{L}\d](-[\p{L}\d]|[\p{L}\d])*\.)+[\p{L}]{2,}$/u
  // we just check the TLD at the end
  const regFallback = /\.[a-z]{2,}$/
  // special cases
  const regDomainIPAddress = /^\[(\d{1,3}\.){3}\d{1,3}\]$/
  const regDomainIPv6 = /^\[ipv6(:\w{0,4}){0,8}\]$/
  // rather for technical cases like localhost
  const regDotless = /^[a-z]+$/

  // email address validation is not trivial
  // this in not 100% RFC but a good check (https://tools.ietf.org/html/rfc3696#page-5)
  function validate (val) {
    // empty is ok!
    if (val === '') return true
    // has no @?
    const index = val.lastIndexOf('@')
    if (index <= 0) return false
    // get local and domain part
    const local = val.substr(0, index)
    const domain = val.substr(index + 1).toLowerCase()
    // check local part length
    if (local.length > 64 && local.length > 0) return false
    // check domain part length
    if (domain.length > 255) return false
    // no quotes?
    if (!regQuotes.test(local)) {
      // ... but another @? ... start with dot? ... consective dots? ... invalid chars?
      if (regLocal.test(local) || regDot.test(local) || regDoubleDots.test(local) || regInvalid.test(local)) return false
    }
    // check domain patterns
    if (settings.get('validation/emailAddress/dotless', false) && regDotless.test(domain)) return true
    if (settings.get('validation/emailAddress/fallback', false) && regFallback.test(domain)) return true
    if (settings.get('validation/emailAddress/idn', true) && regIDN.test(domain)) return true
    if (settings.get('validation/emailAddress/puny', true) && regPunycode.test(domain)) return true
    const ip = settings.get('validation/emailAddress/ip', true)
    if (ip && regDomainIPAddress.test(domain)) return true
    if (ip && regDomainIPv6.test(domain)) return true
    // no?
    return false
  }

  return function (val) {
    return validate($.trim(val))
  }
}())

export const isValidPhoneNumber = (function () {
  const regex = /^\+?[0-9 .,;\-/()*#]+$/
  const tooShort = /^\+\d{0,2}$/

  function validate (val) {
    // empty is ok!
    if (val === '') return true
    if (tooShort.test(val)) return false
    return regex.test(val)
  }

  return function (val) {
    return validate($.trim(val))
  }
}())

// return deep link for a given file
export function getDeepLink (app, data) {
  let folder; let id = ''
  if (data.folder_id === undefined) {
    folder = '&folder=' + encodeURIComponent(data.id)
  } else {
    folder = '&folder=' + encodeURIComponent(data.folder_id)
    id = '&id=' + (/^[\d/]+$/.test(data.id) ? data.id : encodeURIComponent(data.id))
  }
  return ox.abs + ox.root + '/#!&app=' + app + folder + id
}

// recognize addresses in a string (see bug 49937)
// delimiters: comma, semi-colon, tab, newline, space; ignores delimiters in quotes
// display name can contain a-z plus \u00C0-\u024F, i.e. Latin supplement, Latin Extended-A, and Latin Extended-B (see OXUI-297)
// the local part is either a quoted string or latin (see above) plus . ! # $ % & ' * + - / = ? ^ _ ` { | } ~
// returns array of addresses
export const getAddresses = function (str) {
  // cover simple case separately; simple string without comma, semi-colon or white-space (see bug 57870)
  if (/^[^,;\s]+$/.test(str)) return [str]
  const addresses = String(str).match(/("[^"]+"|'[^']+'|\w[\w\u00C0-\u024F.!#$%&'*+-/=?^_`{|}~]*)@[^,;>\x20\t\n]+|[\w\u00C0-\u024F][\w\u00C0-\u024F\-'\x20]+\s<[^>]+>|("[^"]+"|'[^']+')\s<[^>]+>/g) || []
  return addresses.map(function (str) {
    return str.replace(/^([^"]+)\s</, '"$1" <')
  })
}

export const getShardingRoot = (function () {
  const defaultUrl = window.location.host + ox.apiRoot
  let shardingRoots = [defaultUrl]
  settings.ready(() => {
    shardingRoots = [].concat(settings.get('shardingSubdomains', defaultUrl))
  })
  function sum (s) {
    let i = s.length - 1; let sum = 0
    for (; i; i--) sum += s.charCodeAt(i)
    return sum
  }
  return function (url) {
    let index = 0
    // special case, if url already has the root and the protocol attached
    if (url.indexOf('//' + defaultUrl) === 0) url = url.substr(defaultUrl.length + 2)
    if (shardingRoots.length > 1) index = sum(url) % shardingRoots.length
    if (!/^\//.test(url)) url = '/' + url
    // do not use sharding when on development system
    if (ox.debug) return '//' + defaultUrl + url
    return '//' + shardingRoots[index] + url
  }
}())

export const getScrollBarWidth = _.memoize(function () {
  const $outer = $('<div>').css({ visibility: 'hidden', width: 100, overflow: 'scroll' }).appendTo('body')
  const widthWithScroll = $('<div>').css({ width: '100%' }).appendTo($outer).outerWidth()
  $outer.remove()
  return 100 - widthWithScroll
})

// resolve in case all local files are still accessible
export function checkFileReferences (obj) {
  const files = [].concat(obj)
  return $.when.apply($, _.map(files, readFile))

  function readFile (file) {
    const reader = new FileReader(); const def = $.Deferred()

    reader.onerror = function (e) {
      def.reject({
        name: file.name,
        error: e.target.error.message,
        message: e.target.error.message + '(' + file.name + ')'
      })
    }

    reader.onloadstart = function (e) {
      // ff triggers onerror AND onloadstart simultaneously
      setTimeout(() => {
        def.resolve()
        this.abort()
      }, _.device('firefox') ? 100 : 0)
    }

    if (/^image/.test(file.type)) {
      reader.readAsDataURL(file)
    } else {
      reader.readAsText(file)
    }

    return def.promise()
  }
}

// Helper functions to inspect middleware version
// Useful for version-based feature toggles
let version
export function getMiddlewareVersion () {
  if (version) return version
  const match = ox.serverConfig?.serverVersion?.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    console.error('Middleware version check failed', ox.serverConfig)
    return {}
  }
  version = { major: parseInt(match[1], 10) || 8, minor: parseInt(match[2], 10) || 0, patch: parseInt(match[3], 10) || 0 }
  return version
}

export function isMiddlewareMinVersion (major, minor = 0) {
  const version = getMiddlewareVersion()
  if (!version) return false
  return version.major >= major && version.minor >= minor
}

export function getVersionString () {
  if (ox.version === 'undefined') ox.version = ''
  if (ox.revision === 'undefined') ox.revision = ''
  return [ox.version || '8', ox.revision].filter(Boolean).join('-')
}

export function getVersionFromConfig () {
  if (ox.serverConfig.version === 'undefined' || !ox.serverConfig.version) ox.serverConfig.version = ''
  if (ox.serverConfig.revision === 'undefined' || !ox.serverConfig.revision) ox.serverConfig.revision = ''
  if (ox.revision === 'undefined' || !ox.revision) ox.revision = ''
  const serverRevision = ox.serverConfig.revision && `-${ox.serverConfig.revision}`
  const revision = ox.revision && `-Rev${ox.revision}`
  return `${ox.serverConfig.version}${serverRevision || revision || ''}`
}

export async function getCurrentCachedVersion () {
  if (!window.caches) return
  const cache = await caches.open('defaultcache')
  const response = await cache.match('/version')
  if (response) return response.headers.get('version')
}
