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
import moment from '@open-xchange/moment'
import ox from '@/ox'
import * as util from '@/io.ox/core/util'
import accountAPI from '@/io.ox/core/api/account'
import keyChainApi from '@/io.ox/keychain/api'
import { createIcon } from '@/io.ox/core/components'
import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

const fontDefaults = [
  { label: 'System', font: '-apple-system,BlinkMacSystemFont,helvetica,sans-serif' },
  { label: 'Andale Mono', font: 'andale mono,times' },
  { label: 'Arial', font: 'arial,helvetica,sans-serif' },
  { label: 'Arial Black', font: 'arial black,avant garde' },
  { label: 'Book Antiqua', font: 'book antiqua,palatino' },
  { label: 'Comic Sans MS', font: 'comic sans ms,sans-serif' },
  { label: 'Courier New', font: 'courier new,courier' },
  { label: 'Georgia', font: 'georgia,palatino' },
  { label: 'Helvetica', font: 'helvetica' },
  { label: 'Impact', font: 'impact,chicago' },
  { label: 'Symbol', font: 'symbol' },
  { label: 'Tahoma', font: 'tahoma,arial,helvetica,sans-serif' },
  { label: 'Terminal', font: 'terminal,monaco' },
  { label: 'Times New Roman', font: 'times new roman,times' },
  { label: 'Trebuchet MS', font: 'trebuchet ms,geneva' },
  { label: 'Verdana', font: 'verdana,geneva' },
  { label: 'Webdings', font: 'webdings' },
  { label: 'Wingdings', font: 'wingdings,zapf dingbats' }
]

const prefix = ox.serverConfig.prefix || '/ajax'
const regImageSrc = new RegExp('(<img[^>]+src=")' + prefix, 'g')

const getDateFormatted = function (timestamp, options) {
  if (!_.isNumber(timestamp)) return gt('unknown')

  const opt = $.extend({ fulldate: false, filtertoday: true }, options || {})
  const d = moment(timestamp)

  const timeStr = function () {
    return d.format('LT')
  }
  const dateStr = function () {
    return d.format('l') + (opt.fulldate ? ' ' + timeStr() : '')
  }
  const isSameDay = function () {
    return moment().isSame(d, 'day')
  }

  if (opt.filtertoday && isSameDay()) return timeStr()

  if (opt.smart) {
    const delta = moment().startOf('day').diff(moment(timestamp).startOf('day'), 'day')
    if (delta === 1) { return gt('Yesterday') } else if (delta <= 6) { return d.format('dddd') }
  }

  return dateStr()
}

const trimAddress = function (address) {
  address = $.trim(address || '')
  // apply toLowerCase only for mail addresses, don't change phone numbers
  return address.indexOf('@') > -1 ? address.toLowerCase() : address
}

// regex: split list at non-quoted ',' or ';'
const rRecipientList = /([^,;"]+|"(\\.|[^"])+")+/
// regex: remove delimiters/spaces
const rRecipientCleanup = /^[,;\s]+/
// regex: process single recipient
const rRecipient = /^("(\\.|[^"])+"\s|[^<]+)(<[^>]+>)$/
// regex: remove < > from mail address
const rMailCleanup = /(^<|>$)/g
// mail addresses hash
const addresses = {}

accountAPI.getAllSenderAddresses().done(function (sendAddresses) {
  _(sendAddresses).chain().pluck(1).each(function (address) {
    addresses[address.toLowerCase()] = true
  })
})

export const replaceImagePrefix = function (data, replacement) {
  data = data || ''
  replacement = replacement || '$1' + ox.apiRoot

  return data.replace(regImageSrc, replacement)
}

export const parseRecipient = function (s, o) {
  const recipient = $.trim(s); let match; let name; let target
  const options = _.extend({ localpart: true }, o)
  if ((match = recipient.match(rRecipient)) !== null) {
    // case 1: display name plus email address / telephone number
    target = match[3].replace(rMailCleanup, '').toLowerCase()
    name = util.unescapeDisplayName(match[1])
  } else {
    // case 2: assume plain email address / telephone number
    target = recipient.replace(rMailCleanup, '').toLowerCase()
    name = target.split(/@/)[0]
    // If this is set to false, localpart will be set to null
    // This is the expected behaviour for tokenfields
    if (!options.localpart) name = null
  }
  return [name, target]
}

/**
 * Parse comma or semicolon separated list of recipients
 * Example: '"Doe, Jon" <jon@doe.foo>, "\'World, Hello\'" <hi@dom.tld>, urbi@orbi.tld'
 */
export const parseRecipients = function (s, o) {
  const list = []; let match; let recipient; const options = o
  if (!s) return list
  while ((match = s.match(rRecipientList)) !== null) {
    // look ahead for next round
    s = s.substr(match[0].length).replace(rRecipientCleanup, '')
    // get recipient
    recipient = parseRecipient(match[0], options)
    // simple workaround so exchange draft emails without proper mail addresses get displayed correctly (Bug 23983)
    const msExchange = recipient[0] === recipient[1]
    // add to list? (simple check but avoids trash)
    if (msExchange || recipient[1].indexOf('@') > -1) {
      list.push(recipient)
    }
  }
  return list
}

export function serializeList (maildata, field = 'from') {
  const list = maildata[field] || [['', '']]

  return list.flatMap((item, index) => {
    const obj = { display_name: getDisplayName(item) }
    const email = String(item[1] || '').toLowerCase()
    if (email !== 'undisclosed-recipients:;') obj.email = email
    return [
      util.renderPersonalName(obj)
        .toggleClass('person-link', obj.email)
        .toggleClass(`person-${field}`, obj.email),
      index < list.length - 1 ? $('<span class="delimiter">').text(',\u00A0\u00A0 ') : ''
    ]
  }).filter(Boolean)
}

export const serializeAttachments = function (data, list) {
  let i = 0; const $i = list.length; let tmp = $(); let filename = ''; let href = ''
  for (; i < $i; i++) {
    filename = list[i].filename || ''
    href = ox.apiRoot + '/mail?' + $.param({
      action: 'attachment',
      folder: data.folder_id,
      id: data.id,
      attachment: list[i].id,
      delivery: 'download'
    })
    tmp = tmp.add(
      $('<a class="attachment-link" target="_blank">').attr('href', href).text(filename)
    )
    if (i < $i - 1) {
      tmp = tmp.add(
        $('<span class="delimiter">').append($.txt('\u00A0\u2022 '))
      )
    }
  }
  return tmp
}

export const getFontFormats = function () {
  return settings.get('tinyMCE/font_formats', fontDefaults.map(function (o) {
    return o.label + '=' + o.font
  }).join(';'))
}

export const getDefaultStyle = function () {
  const styles = _.device('smartphone') ? {} : settings.get('defaultFontStyle', {})
  const obj = { css: {}, string: '', node: $() }
  // styles
  if (styles.size && styles.size !== 'browser-default') obj.css['font-size'] = styles.size
  if (styles.family) obj.css['font-family'] = (styles.family !== 'browser-default') ? styles.family : fontDefaults[0].font
  if (styles.color && styles.color !== 'transparent') obj.css.color = styles.color
  // styles as string
  obj.string = _.reduce(_.pairs(obj.css), function (memo, list) { return memo + list[0] + ':' + list[1] + ';' }, '')
  // node
  obj.node = $('<div>').css(obj.css).attr('data-mce-style', obj.string).append('<br>')
  return obj
}

export const getDeputy = function (data) {
  if (!data || !data.headers || !data.headers.Sender) return
  const sender = parseRecipients(data.headers.Sender)
  if (data.from[0] && data.from[0][1] === sender[0][1]) return
  // is mailing list?
  for (const id in data.headers) {
    if (/^list-(id|archive|owner)$/i.test(id)) return
  }
  return sender
}

// pair: Array of display name and email address
// options:
// - showDisplayName: Show display name if available
// - showMailAddress: Always show mail address
// - reorderDisplayName: "last name, first name" becomes "first name last name"
export const getDisplayName = function (pair, options = {}) {
  if (!_.isArray(pair)) return ''

  options = {
    reorderDisplayName: true,
    showDisplayName: true,
    showMailAddress: false,
    unescapeDisplayName: true,
    ...options
  }

  const name = pair[0]
  const email = String(pair[1] || '').toLowerCase()
  let displayName = name

  if (options.unescapeDisplayName) {
    displayName = util.unescapeDisplayName(name)
  }

  if (!options.showDisplayName) return email

  if (options.reorderDisplayName) {
    displayName = displayName.replace(/^([^,.()]+),\s([^,.()]+)$/, '$2 $1')
  }

  if (options.showMailAddress && displayName && email && displayName !== email) {
    displayName += ' <' + email + '>'
  }

  return displayName || email
}

// DEPRECATED: `getSender` of `mail/util.js`, pending remove with 8.20. Use `sender.js` instead
export const getSender = function (item, enabled) {
  if (ox.debug) console.warn('`getSender` of `mail/util.js` is deprecated, pending remove with 8.20. Use `sender.js` instead')
  const address = item[1]
  // disabled
  if (!enabled) return [null, address]
  // default or custom
  const custom = settings.get(['customDisplayNames', address], {})
  const name = (custom.overwrite ? custom.name : item[0] || custom.defaultName) || ''
  return [name, address]
}

// takes care of special edge-case: no from address
export const hasFrom = function (data) {
  return !!(data && _.isArray(data.from) && data.from.length > 0 && !!data.from[0][1])
}

// options.field: Which field to use, e.g. 'from' or 'to'
// options are also handed over to getDisplayName()
// returns jquery set
export const getFrom = function (data, options) {
  data = data || {}
  options = _.extend({ field: 'from' }, options)

  // get list
  let list = _(data[options.field])
    .chain()
    .map(function (item) {
      // reduce to display name
      return getDisplayName(item, options)
    })
    .filter(function (name) {
      // skip empty names
      return name !== ''
    })
    .value()

  // empty?
  if (list.length === 0) {
    return $().add(
      $.txt(options.field === 'from' ? gt('Unknown sender') : gt('No recipients'))
    )
  }

  list = _(list).reduce(function (set, name) {
    return set
      .add(util.renderPersonalName({ name }).addClass('person'))
      .add($.txt(', '))
  }, $())

  // drop last item
  return list.slice(0, -1)
}

/**
 * Format the Sender field using display name and email
 *
 * @return  the email address or a string like "Display Name" <email@address.example>
 */
export const formatSender = function (name, address, quote) {
  const args = _(arguments).toArray()

  if (_.isArray(args[0])) {
    quote = address
    name = args[0][0]
    address = args[0][1]
  }

  name = util.unescapeDisplayName(name)
  address = trimAddress(address)

  // short version; just mail address
  if (name === '') return address
  // long version; display_name plus address
  return (quote === false ? name : '"' + name + '"') + ' <' + address + '>'
}

// remove typical "Re: Re: Fwd: Re sequences".
// keepPrefix <bool> allows to keep them
export const getSubject = function (data, keepPrefix) {
  let subject = $.trim(_.isString(data) ? data : data.subject)

  if (subject === '') return gt('No subject')

  // remove mailing list stuff (optional)
  if (settings.get('features/cleanSubjects', false)) {
    subject = subject.replace(/\[[^[]*\]\s*/g, '')
  }

  return keepPrefix ? subject : subject.replace(/^((re|ref|aw|fwd|wg|rv|tr)(\[\d+\])?:\s?)+/i, '')
}

export const getPriority = function (data) {
  // normal?
  if (data && data.priority === 3) return $()
  if (data && data.priority < 3) return $('<span class="high">').append(createIcon('bi/exclamation-lg.svg').addClass('larger')).attr('title', gt.pgettext('E-Mail', 'High priority'))
  return $('<span class="low">').append(createIcon('bi/dash.svg').addClass('sm')).attr('title', gt.pgettext('E-Mail', 'Low priority'))
}

export const getAccountName = function (data) {
  // primary account?
  const id = window.unescape(data ? data.id : '')
  if ((/^default0/).test(id)) return gt('Primary account')
  return (data && data.account_name) || 'N/A'
}

export const getTime = function (timestamp, options) {
  return getDateFormatted(timestamp, options)
}

export const getDateTime = function (timestamp, options) {
  options = _.extend({ fulldate: true }, options)
  return getDateFormatted(timestamp, options)
}

export const getFullDate = function (timestamp) {
  if (!_.isNumber(timestamp)) return gt('unknown')
  return moment(timestamp).format('l LT')
}

export const threadFileSize = function (data) {
  return data.reduce(function (acc, obj) {
    return acc + (obj.size || 0)
  }, 0)
}

export const count = function (data) {
  return _(data).reduce(function (memo, obj) {
    return memo + (obj.thread ? obj.thread.length : 1)
  }, 0)
}

export const getColor = function (data) {
  let color = parseInt(data.color_label, 10) || 0
  // show flagged flag as red
  if (!color && isFlagged(data)) color = 1
  // fix buggy negative numbers
  if (color < 0) color = 0
  return color
}

// return unique colors in array
export const getColors = function (list) {
  return [...new Set(list.map(getColor).filter(Boolean))].sort()
}

export const isToplevel = function (data) {
  return _.isObject(data) && 'folder_id' in data && !('filename' in data)
}

export const isUnseen = function (data) {
  data = _.isObject(data) ? data.flags : data
  return _.isNumber(data) ? (data & 32) !== 32 : undefined
}

export const isFlagged = function (data) {
  data = _.isObject(data) ? data.flags : data
  return _.isNumber(data) ? (data & 8) === 8 : undefined
}

export const isDeleted = function (data) {
  return data && _.isNumber(data.flags) ? (data.flags & 2) === 2 : undefined
}

export const isSpam = function (data) {
  return data && _.isNumber(data.flags) ? (data.flags & 128) === 128 : undefined
}

export const isAnswered = function () {
  return _.chain(arguments || []).flatten().compact().reduce(function (memo, data) {
    return memo || (data.flags & 1) === 1
  }, false).value()
}

export const isDecrypted = function (data) {
  return data && data.security && data.security.decrypted
}

export const isForwarded = function () {
  return _.chain(arguments || []).flatten().compact().reduce(function (memo, data) {
    return memo || (data.flags & 256) === 256
  }, false).value()
}

// is obj only an attachment of another email
export const isAttachment = function (data) {
  return typeof (data || {}).parent !== 'undefined'
}

export const isEmbedded = function (data) {
  if (!_.isObject(data)) return false
  return data.folder_id === undefined && data.filename !== undefined
}

export const asList = _.memoize(function (str) {
  // comma-separated, string-based list
  return (str || '')
    // line break, whitespace
    .replace(/[\s\n]+/g, ',')
    // duplicate commas
    .replace(/(,+),/g, ',')
    // trailing commas
    .replace(/^,|,$/g, '')
    .toLowerCase()
    .split(',')
})

export function isAllowlisted (data, list) {
  let allowlist = [].concat(
    asList(settings.get('features/trusted/user', list || '')),
    asList(settings.get('features/trusted/admin', ''))
  )
  let address = _.isObject(data)
    ? data.from && data.from.length && String(data.from[0][1] || '')
    : data || ''
  // normalize
  allowlist = _.compact(allowlist)
  address = (address || '').trim().toLowerCase()
  return _.some(allowlist, function (allowlisted) {
    // do not use endsWith because of IE11
    const escaped = allowlisted.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return address.match(new RegExp(escaped + '$'))
  })
}

export const authenticity = (function () {
  function getAuthenticityLevel () {
    if (!settings.get('features/authenticity', false)) return 'none'
    return settings.get('authenticity/level', 'none')
  }

  function getAuthenticityStatus (data) {
    if (!_.isObject(data)) return
    return _.isObject(data.authenticity) ? data.authenticity.status : data.status
  }

  function matches (regex, status, level) {
    // status must match the regex AND the status must be a subset of the level
    return regex.test(status) && level.indexOf(status) > -1
  }

  function isRelevant (aspect, level, status) {
    switch (aspect) {
      // contact image
      case 'image':
        return matches(/(fail|suspicious)/, status, level)
      // append icon with info hover next to the from field
      // prepend in sender block (detail), 'via' hint for different mail server
      case 'icon':
        // always show if status matches level
        return matches(/(fail|suspicious|trusted)/, status, level)
      case 'via':
        // always display "Via <real-domain>" if there is an authenticated domain
        // that differs from the "From" header domain
        return true
      // info box within mail detail
      case 'box':
        return matches(/(fail|suspicious|trusted)/, status, level)
      // disable links, replace external images (use can decide to enable again)
      case 'block':
        return matches(/(fail|suspicious)/, status, level)
      default:
        return false
    }
  }

  return function (aspect, data) {
    // support incomplete data (only 'status'), provided by all request
    if (data.authenticity_preview) data = _.extend({}, { authenticity: data.authenticity_preview }, data)

    const status = getAuthenticityStatus(data)
    const level = getAuthenticityLevel()

    // always show trusted
    if (level === 'none' && status !== 'trusted') return
    if (!/^(fail|suspicious|neutral|none|pass|trusted)$/.test(status)) return

    return isRelevant(aspect, level, status) ? status : undefined
  }
})()

export const getAuthenticityMessage = function (status, email) {
  switch (status) {
    case 'suspicious': return gt('Be careful with this message. It might be spam or a phishing mail.')
    case 'fail': return gt('This is a dangerous email containing spam or malware.')
    case 'neutral': return gt('We could not verify that this email is from %1$s.', email)
    case 'pass':
    case 'trusted': return gt('We could verify that this email is from %1$s.', email)
    default: return ''
  }
}

export const isMalicious = (function () {
  if (!settings.get('maliciousCheck')) return _.constant(false)
  const blocklist = settings.get('maliciousFolders')
  if (!_.isArray(blocklist)) return _.constant(false)
  return function (data) {
    if (!_.isObject(data)) return false
    // nested mails don't have their own folder id. So use the parent mails folder id
    return accountAPI.isMalicious(data.folder_id || (data.parent && data.parent.folder_id), blocklist)
  }
})()

export const byMyself = function (data) {
  data = data || {}
  return data.from && data.from.length && String(data.from[0][1] || '').toLowerCase() in addresses
}

export const hasUnsentReadReceipt = function (data) {
  const send = _.isNumber(data.flags) ? (data.flags & 512) === 512 : undefined
  return !send && !!data.disp_notification_to
}

export const hasOtherRecipients = function (data) {
  data = data || {}
  const list = [].concat(data.to || [], data.cc || [], data.bcc || [])
  const others = _(list).reduce(function (memo, arr) {
    const email = String(arr[1] || '').toLowerCase()
    return memo + (email && !(email in addresses) ? 1 : 0)
  }, 0)
  return others > 0
}

export function getDefaultSignatures (type) {
  const signatures = settings.get(type === 'new' ? 'defaultSignature' : 'defaultReplyForwardSignature')

  if (!signatures) return false

  if (typeof signatures === 'object' && Object.keys(signatures)[0]?.includes('@')) return signatures

  let updatedSignature = {}
  // Note: Legacy feature, this updates default signature from account.id to account.address mapping
  if (typeof signatures === 'object') {
    function getAccountAddressById (id) {
      return keyChainApi.getAll().find(a => a.id === parseInt(id))?.primary_address
    }
    Object.keys(signatures).forEach(id => {
      const address = getAccountAddressById(id)
      if (!address) return
      updatedSignature[address] = signatures[id]
    })
  // Note: Legacy feature, this updates default signature from single entry to account.address mapping
  } else {
    function getAccountAddress () {
      return keyChainApi.getAll().find(a => a.primary_address === settings.get('defaultaddress'))?.primary_address
    }
    updatedSignature = { [getAccountAddress()]: signatures }
  }
  settings.set(type, updatedSignature, { silent: true })
  return updatedSignature
}

export const fixInlineImages = function (data) {
  // look if /ajax needs do be replaced
  return data
    .replace(new RegExp('(<img[^>]+src=")' + ox.abs + ox.apiRoot), '$1' + prefix)
    .replace(new RegExp('(<img[^>]+src=")' + ox.apiRoot, 'g'), '$1' + prefix)
    .replace(/on(mousedown|contextmenu)="return false;"\s?/g, '')
    .replace(/data-mce-src="[^"]+"\s?/, '')
}

export const parseMsgref = function (separator, msgref) {
  const base = _(msgref.toString().split(separator))
  const id = base.last()
  const folder = base.without(id).join(separator)
  return { folder_id: folder, id }
}

export const getAttachments = (function () {
  const isWinmailDATPart = function (obj) {
    return !('filename' in obj) && obj.attachments &&
      obj.attachments.length === 1 && obj.attachments[0].content === null
  }

  // remove last element from id (previewing during compose)
  const fixIds = function (data, obj) {
    if (data.parent && data.parent.needsfix) {
      const tmp = obj.id.split('.')
      obj.id = obj.id.split('.').length > 1 ? tmp.splice(1, tmp.length).join('.') : obj.id
    }
  }

  return function (data) {
    data = data || {}
    let i; let $i; let obj; let dat; const attachments = []
    const mail = { id: data.id, folder_id: data.folder_id }

    // get nested messages
    for (i = 0, $i = (data.nested_msgs || []).length; i < $i; i++) {
      obj = data.nested_msgs[i]
      // is wrapped attachment? (winmail.dat stuff)
      if (isWinmailDATPart(obj)) {
        dat = obj.attachments[0]
        attachments.push(
          _.extend({}, dat, { mail, title: obj.filename || '', parent: data.parent || mail })
        )
      } else {
        fixIds(data, obj)
        attachments.push({
          id: obj.id,
          content_type: 'message/rfc822',
          filename: obj.filename ||
            // remove consecutive white-space
            (obj.subject || gt('message')).replace(/\s+/g, ' ') + '.eml',
          title: obj.filename || obj.subject || '',
          mail,
          parent: data.parent || mail,
          nested_message: _.extend({}, obj, { parent: mail })
        })
      }
    }

    // fix referenced mail
    if (data.parent && mail && mail.folder_id === undefined) {
      mail.id = data.parent.id
      mail.folder_id = data.parent.folder_id
    }

    // get non-inline attachments
    for (i = 0, $i = (data.attachments || []).length; i < $i; i++) {
      obj = data.attachments[i]
      if (obj.disp === 'attachment' || /^image/.test(obj.content_type.toLowerCase())) {
        fixIds(data, obj)
        attachments.push(
          _.extend({}, obj, { cid: null, mail, title: obj.filename || '', parent: data.parent || mail })
        )
      }
    }

    return attachments
  }
}())

const types = {
  inbox: 'bi/inbox.svg',
  flagged: settings.flagByColor ? 'bi/flag.svg' : 'bi/star.svg',
  unseen: 'bi/envelope.svg',
  drafts: 'bi/file-earmark-text.svg',
  sent: 'bi/cursor.svg',
  spam: 'bi/bag-x.svg',
  trash: 'bi/trash.svg',
  archive: 'bi/archive.svg'
}

export const getMailFolderIcon = function (id, model) {
  // shared?
  if (model && model.get('type') === 3 && model.get('folder_id') === 'default0') return 'bi/share.svg'
  return types[accountAPI.getType(id)] || 'bi/folder.svg'
}

export const isSimpleMail = function (node) {
  const content = node instanceof $ ? node.prop('innerHTML') : node
  if (/<table/.test(content)) return false
  if (/<[^>]*style="/.test(content)) return false
  return true
}

// CSS handling for malformatted mails
export const fixMalformattedMails = function (content, senders) {
  // see Bug OXUIB-1827 (2022-08-29)
  if (senders.find(sender => /@(\w+\.)?paypal\.[a-z]+$/i.test(sender))) {
    [...content.querySelectorAll('p')].forEach(el => { el.style.height = 'auto' })
  }
}

// pure'ish function for better unit testing
export function getViewOptions ({ folderId, settings, isSentOrDrafts = false, supportsAttachmentMarker = false } = {}) {
  const options = getRecursiveViewOptions(folderId, settings)
  // no thread support in drafts/sent folders. This breaks caching (Sent folders get incomplete threads). See OXUIB-853
  const threadSupport = settings.get('threadSupport', true)
  if (!threadSupport || isSentOrDrafts) options.thread = false

  // ignore unavailable sort options
  const isUnavailable =
    (options.sort === 102 && !settings.flagByColor) ||
    (options.sort === 660 && !settings.flagByStar) ||
    (options.sort === 610) ||
    (options.sort === 602 && !supportsAttachmentMarker)
  if (isUnavailable) delete options.sort

  return { sort: 661, order: 'desc', thread: false, ...options }
}

function getRecursiveViewOptions (folderId = '', settings) {
  const options = settings.get(['viewOptions', folderId])
  if (options) return options
  const parentFolderId = String(folderId).split('/').slice(0, -1).join('/')
  if (!parentFolderId || parentFolderId === 'default0') return {}
  return getRecursiveViewOptions(parentFolderId, settings)
}

// just for testing purposes
export const unitTesting = {
  getRecursiveViewOptions
}
