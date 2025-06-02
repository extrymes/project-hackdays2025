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

import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import * as util from '@/io.ox/core/util'
import ext from '@/io.ox/core/extensions'
import moment from '@open-xchange/moment'
import gt from 'gettext'

import { settings } from '@/io.ox/mail/settings'

// fix hosts (still need a configurable list on the backend)
// ox.serverConfig.hosts = (ox.serverConfig.hosts || []).concat('localhost', 'appsuite-dev.open-xchange.com', 'ui-dev.open-xchange.com', 'ox6-dev.open-xchange.com', 'ox6.open-xchange.com');

function isValidHost (url) {
  const match = url.match(/^https?:\/\/([^/#]+)/i)
  if (match === null || match.length === 0) return false
  if (match[1] === 'test') return true
  return _(ox.serverConfig.hosts).indexOf(match[1]) > -1
}

//
// Handle replacement
//

function replace (result) {
  // get replacement
  let set = []
  if (result.prefix) set = set.concat(processTextNode(result.prefix))
  set = set.concat(result.replacement)
  if (result.suffix) set = set.concat(processTextNode(result.suffix))
  // now replace
  $(result.node).replaceWith(set)
  return set
}

// Note on regex: [\s\S]* is intended because the dot "." does not include newlines.
// unfortunately, javascript doesn't support the //s modifier (dotall). [\s\S] is the proper workaround
// the //m modifier doesn't work in call cases, because it would drop prefixes before a match in next line
// see bug 36975

//
// Deep links
//

let isDeepLink, isInternalDeepLink, parseDeepLink, processDeepLink

// supported apps
// all office apps plus contacts, calendar, and tasks
// mail doesn't work due to URL obfuscation; file pop-out view doesn't work
const deepLinkWhitelist = /^(io.ox\/office\/|io.ox\/(contacts|calendar|tasks)\/detail$)/;

(function () {
  const deepLinkKeys = 'all prefix link app params param name suffix'.split(' ')
  const linkKeys = 'all prefix link suffix'.split(' ')
  const app = {
    'io.ox/contacts': 'contacts',
    'io.ox/calendar': 'calendar',
    'io.ox/tasks': 'tasks',
    'io.ox/infostore': 'files',
    'io.ox/files': 'files',
    infostore: 'files'
  }
  const items = {
    contacts: gt('Contact'),
    calendar: gt('Appointment'),
    tasks: gt('Task'),
    files: gt('File'),
    infostore: gt('File'),
    'io.ox/office/text': gt('Document'),
    'io.ox/office/spreadsheet': gt('Spreadsheet')
  }
  const folders = {
    contacts: gt('Address Book'),
    calendar: gt('Calendar'),
    tasks: gt('Tasks'),
    files: gt('Folder'),
    'io.ox/settings': gt('Download')
  }
  const regDeepLink = /^([\s\S]*)(http[^#]+#!{0,2}&?app=([^&]+)((&(folder|id|item|perspective)=[^&\s]+)+))([\s\S]*)$/i
  const regDeepLinkAlt = /^([\s\S]*)(http[^#]+#m=(contacts|calendar|tasks|infostore)((&(f|i)=[^&\s]+)+))([\s\S]*)$/i
  const regLink = /^([\s\S]*)(https?:\/\/.*?)([!?.,>()]\s[\s\S]*|\s[\s\S]*|[!?.,>()]$|$)/i

  isDeepLink = function (str) {
    return regDeepLink.test(str) || regDeepLinkAlt.test(str)
  }

  isInternalDeepLink = function (str) {
    return isDeepLink(str) && isValidHost(str)
  }

  parseDeepLink = function (str) {
    const deepLinkMatches = String(str).match(regDeepLink.test(str) ? regDeepLink : regDeepLinkAlt)
    const data = _.object(deepLinkKeys, deepLinkMatches)
    const params = _.deserialize(data.params, '&')
    // fix app
    data.app = app[data.app] || data.app
    // class name
    if (/^(files|infostore)$/.test(data.app)) {
      data.className = 'deep-link-files'
    } else if (/^(contacts|calendar|tasks)$/.test(data.app)) {
      data.className = 'deep-link-' + data.app
    } else if (/^io.ox\/settings$/.test(data.app) && params.folder === 'virtual/settings/personaldata') {
      data.className = 'deep-link-gdpr'
    } else if (deepLinkWhitelist.test(data.app)) {
      data.className = 'deep-link-app'
    }
    // compute prefix, link and suffix from link regex
    const linkMatches = String(str).match(regLink)
    const linkData = _.object(linkKeys, linkMatches)
    // add folder, id, perspective (jQuery's extend to skip undefined)
    // share links use "item" instead of "id" (for whatever reason)
    const cid = params.folder && params.id && _.cid({ folder: params.folder, id: params.id })
    return $.extend(data, { folder: params.f, id: params.i }, { cid, folder: params.folder, id: params.id || params.item, perspective: params.perspective }, linkData)
  }

  // node must be a plain text node or a string
  processDeepLink = function (node) {
    const data = parseDeepLink(node.nodeValue)
    const text = ('id' in data ? items[data.app] : folders[data.app]) || gt('Link')
    const link = $('<a href="#" target="_blank" class="deep-link" role="button">')
      .attr('href', data.link)
      .text(text)
    // no allow-listed app?
    if (!data.className) return null

    // internal document?
    if (isValidHost(data.link)) {
      // add either specific css class or generic "app" deep-link
      link.addClass(data.className).data(data)
    }

    // move up?
    if ($(node).parent().attr('href') === data.link) node = $(node).parent().get(0)

    return { node, prefix: data.prefix, replacement: link, suffix: data.suffix }
  }
}())

//
// URL
//

const regUrl = /^([\s\S]*?)(((http|https|ftp|ftps):\/\/|www\.)\S+)([\s\S]*)$/i
const regUrlMatch = /^([\s\S]*?)(((http|https|ftp|ftps):\/\/|www\.)\S+)([\s\S]*)$/i /* dedicated one to avoid strange side effects */

function processUrl (node) {
  const matches = node.nodeValue.match(regUrlMatch)
  if (matches === null || matches.length === 0) return node
  const prefix = matches[1]; const url = matches[2]; const suffix = matches[5]

  // fix punctuation marks and brackets
  const fix = util.fixUrlSuffix(url, suffix); let href = fix.url
  if (!/^http/i.test(href)) href = 'http://' + href
  const link = $('<a href="#" target="_blank" rel="noopener">').attr('href', href).text(fix.url)

  return { node, prefix, replacement: link, suffix: fix.suffix }
}

//
// Email address (RFC 6531 allows unicode beyond 0x7F)
// Until we discover real use-cases we stick to [\u0000-\u00FF] to support extended ASCII, e.g. umlauts
// This excludes Kanji in local part, for example (see bug 37051)

const regMail = /^([\s\S]*?)([^"\s<,:;()[\]\u0100-\uFFFF]+@([a-z0-9äöüß-]+\.)+[a-z]{2,})([\s\S]*)$/i
const regMailMatch = /^([\s\S]*?)([^"\s<,:;()[\]\u0100-\uFFFF]+@([a-z0-9äöüß-]+\.)+[a-z]{2,})([\s\S]*)$/i /* dedicated one to avoid strange side effects */

function processMailAddress (node) {
  const matches = node.nodeValue.match(regMailMatch)
  if (matches === null || matches.length === 0) return node
  const prefix = matches[1]; const address = matches[2]; const suffix = matches[4]
  // see bug 58266: ignore urls with email address parameter; returns false to continue processing
  if (/(http:|https:)$/i.test(prefix) || /^www\./i.test(address)) return false

  const link = $('<a href="#" class="mailto-link" target="_blank">').attr('href', 'mailto:' + address)
    .data({ address })
    .text(address)

  return { node, prefix, replacement: link, suffix }
}

//
// Complex Mail Address: "name" <address>
//

const regMailComplexMatch = /^([\s\S]*?)(?:&quot;([^&]+)&quot;|"([^"]+)"|'([^']+)')(?:\s|<br>)+(?:<|&#60;)([^@]+@[^&].*?)(?:>|&#62;)([\s\S]*)$/

function processComplexMailAddress (node) {
  const matches = node.nodeValue.match(regMailComplexMatch)
  if (matches === null || matches.length === 0) return node
  const prefix = matches[1]; const name = matches[2] || matches[3] || matches[4]; const address = matches[5]; const suffix = matches[6]

  const link = $('<a href="#" class="mailto-link" target="_blank">').attr('href', 'mailto:' + address)
    .data({ address, name })
    .text(name)

  return { node, prefix, replacement: link, suffix }
}

//
// Handlers
//

// A handler must implement test() and process().
// test() gets the current text node and returns true/false.
// process() gets current text node and returns an object
// that contains node, prefix, replacement, suffix.
// prefix and suffix are the text parts before and after the
// replacement that might be need further processing

const handlers = {

  deeplink: {
    test (node) {
      // quick check
      if (node.nodeValue.indexOf('http') === -1) return false
      // precise check
      return isDeepLink(node.nodeValue)
    },
    process: processDeepLink
  },

  'mail-address-complex': {
    test (node) {
      // quick check
      if (node.nodeValue.indexOf('@') === -1) return false
      // precise check
      return regMailComplexMatch.test(node.nodeValue) && $(node).closest('a').length === 0
    },
    process: processComplexMailAddress
  },

  'mail-address': {
    test (node) {
      // quick check
      if (node.nodeValue.indexOf('@') === -1) return false
      // precise check
      return regMail.test(node.nodeValue) && $(node).closest('a').length === 0
    },
    process: processMailAddress
  },

  url: {
    test (node) {
      // quick check
      if (!/(http|www\.)/.test(node.nodeValue)) return false
      // precise check
      return regUrl.test(node.nodeValue) && $(node).closest('a').length === 0
    },
    process: processUrl
  },

  'long-character-sequences': {
    test (node) {
      const text = node.nodeValue
      return text.length >= 30 && /[\S\u00A0]{30}/.test(text) && $(node).closest('a').length === 0
    },
    process (node) {
      return { node, replacement: $.parseHTML(util.breakableHTML(node.nodeValue)) }
    }
  }
}

if (settings.get('features/recognizeDates', false)) {
  (function () {
    const regTest = {}; const regReplace = {}

    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    // cSpell:disable-next-line
    const weekdaysI18n = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag']
    const year = moment().year()

    const patterns = {
      // cSpell:disable-next-line
      names: '(((this|next|last|diesen|nächsten|letzten)\\s)?(' + weekdays.join('|') + '|' + weekdaysI18n.join('|') + '))',
      // cSpell:disable-next-line
      relative: '(yesterday|today|tomorrow|day\\safter\\stomorrow|gestern|heute|morgen|übermorgen)',
      date: '(\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}|\\d{1,2}\\.\\d{1,2}\\.|(cw|kw|week)\\s?\\d{1,2})',
      time: '(\\d{1,2}\\:\\d\\d)(\\s?(h|a|am|p|pm))?',
      range: '((from|von)s)?(\\d{1,2}\\:\\d\\d)s?(-|to|bis)s?(\\d{1,2}\\:\\d\\d)'
    }

    patterns.day = '(' + patterns.names + '|' + patterns.relative + '|' + patterns.date + ')';

    ['day', 'name', 'date', 'time'].forEach(function (id) {
      regTest[id] = new RegExp(patterns[id], 'i')
      regReplace[id] = new RegExp(patterns[id], 'ig')
    })

    const today = moment().hour(12).minute(0); const noon = ' 12:00'; const dot = 'DD.MM.YYYY HH:mm'; const slash = 'MM/DD/YYYY HH:mm'

    const parsers = [
      [/\d{1,2}\.\d{1,2}\.\d{2,4}/, function (s) { return moment(s + noon, dot) }],
      [/\d{1,2}\.\d{1,2}\./, function (s) { return moment(s + year + noon, dot) }],
      [/\d{1,2}\/\d{1,2}\/\d{2,4}/, function (s) { return moment(s + noon, slash) }],
      [/\d{1,2}\/\d{1,2}/, function (s) { return moment(s + year + noon, slash) }],
      [/(cw|kw|week)\s?(\d{1,2})/i, function (s, match) { return m().week(match[2]) }]
    ]

    const timeParsers = [
      [/(\d{1,2}):(\d\d)h?/, function (s, match) { return moment(0).hour(match[1]).minute(match[2]) }],
      [/(\d{1,2}):(\d\d)\s?(am|pm|a|p)/, function (s, match) { return moment(0).hour(match[1]).minute(match[2]).add(m[3][0] === 'p' ? 12 : 0, 'h') }]
    ]

    const replacements = {
      yesterday () { return m().subtract(1, 'd') },
      today () { return m() },
      tomorrow () { return m().add(1, 'd') },
      'day after tomorrow' () { return m().add(2, 'd') }
    }

    // cSpell:disable
    const i18n = {
      gestern: 'yesterday',
      heute: 'today',
      morgen: 'tomorrow',
      übermorgen: 'day after tomorrow'
    }
    // cSpell:enable

    _.range(0, 7).forEach(function (i) {
      const day = weekdays[i]; const dayI18n = weekdaysI18n[i]
      replacements['this ' + day] = function () { return m().day(i) }
      replacements['last ' + day] = function () { return m().day(i - 7) }
      replacements['next ' + day] = replacements[day] = function () { return m().day(i + 7) }
      i18n['diesen ' + dayI18n] = 'this ' + day
      // cSpell:disable-next-line
      i18n['letzten ' + dayI18n] = 'last ' + day
      // cSpell:disable-next-line
      i18n['nächsten ' + dayI18n] = i18n[dayI18n] = 'next ' + day
    })

    function m () {
      return moment(today)
    }

    function replace (base, part) {
      const date = base === null ? part : base
      const timestamp = getDateTimestamp(date); let time
      // ignore invalid dates
      if (!timestamp.isValid()) return part
      // consider part as time?
      if (base !== null) {
        time = getTime(part)
        if (time && time.isValid()) timestamp.hour(time.hour()).minute(time.minute())
      }
      // return link
      return '<a href="#" class="calendar-link" data-start-time="' + timestamp + '" role="button">' + part + '</a>'
    }

    function getRecentDate (str) {
      const date = str.match(regTest.day)
      return date ? date[0] : null
    }

    function getSentences (str) {
      // escape text to be reinserted as HTML
      // eslint-disable-next-line no-control-regex
      return _.escape(str).replace(/(\w\w[.?!]\s|$)/g, '$1\x1D').replace(/\x1D$/, '').split(/\x1D/)
    }

    function getTime (str) {
      for (const i in timeParsers) {
        const match = timeParsers[i][0].exec(str)
        if (match) return timeParsers[i][1](str, match)
      }
      return 0
    }

    function getDateTimestamp (str) {
      // formatted?
      for (const i in parsers) {
        const match = parsers[i][0].exec(str)
        if (match) return parsers[i][1](str, match)
      }
      // check names
      str = str.toLowerCase()
      if (i18n[str]) str = i18n[str]
      if (replacements[str]) return replacements[str]()
      console.error('Unsupported date "' + str + '"')
      return moment()
    }

    // debug
    $(document).on('click', '.calendar-link', function (e) {
      e.preventDefault()
      const startDate = $(this).data('startTime')
      const endDate = $(this).data('endTime') || (startDate + 3600000)
      ox.load(() => import('@/io.ox/calendar/edit/main')).then(async function ({ default: edit }) {
        const app = edit.getApp()
        await app.launch()
        app.create({ start_date: startDate, end_date: endDate })
      })
    })

    handlers.dates = {
      test (node) {
        const text = node.nodeValue
        return (regTest.day.test(text) || regTest.time.test(text)) && (!node.parentNode || node.parentNode.tagName !== 'A')
      },
      process (node) {
        // break into sentences first
        const sentences = getSentences(node.nodeValue)
        let recentDate
        const html = _(sentences).reduce(function (html, sentence) {
          recentDate = getRecentDate(sentence) || recentDate || 'today'
          return html + sentence
            .replace(regReplace.day, replace.bind(null, null))
            .replace(regReplace.range, replace.bind(null, recentDate))
            .replace(regReplace.time, replace.bind(null, recentDate))
        }, '')
        return { node, replacement: $.parseHTML(html) }
      }
    }
  }())
}

//
// Text nodes
//

function processTextNode (node) {
  if (_.isString(node)) node = $.txt(node)
  if (node.nodeType !== 3) return

  let id, handler, replacement

  for (id in handlers) {
    handler = handlers[id]
    if (!handler.test(node)) continue
    replacement = handler.process(node)
    if (replacement) return replace(replacement)
  }

  return node
}

ext.point('io.ox/mail/detail/content').extend({
  id: 'links',
  index: 100,
  process (baton) {
    // process all text nodes unless mail is too large (> 512 KB)
    if (baton.isLarge) return
    // don't combine these two lines via add() - very slow!
    $(this).contents().each(function () {
      processTextNode(this)
    })
    $(this).find('*:not(style)').contents().each(function () {
      processTextNode(this)
    })
  }
})

export default {
  handlers,
  isValidHost,
  isDeepLink,
  isInternalDeepLink,
  parseDeepLink,
  processDeepLink,
  processTextNode
}
