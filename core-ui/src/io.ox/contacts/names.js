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
import * as util from '@/io.ox/core/util'
import { settings } from '@/io.ox/contacts/settings'
import gt from 'gettext'

function getFullName (data, { isMail = false, formatAsHTML = false }) {
  const fields = {
    first_name: trim(data, 'first_name') || trim(data, 'yomiFirstName'),
    last_name: trim(data, 'last_name') || trim(data, 'yomiLastName')
  }
  const get = formatAsHTML ? html : text
  let format

  if (fields.first_name && fields.last_name) {
    fields.title = !isMail && getTitle(data)
    format = getPreferredFormat(isMail, !!fields.title)
    return _.printf(format, get(fields, 'first_name'), get(fields, 'last_name'), get(fields, 'title'))
  }

  // fallback #1: just last_name
  if (fields.last_name) return get(fields, 'last_name')

  // fallback #2: just first_name
  if (fields.first_name) return get(fields, 'first_name')

  // fallback #3: use existing company? (not for email addresses)
  fields.company = !isMail && (trim(data, 'company') || trim(data, 'yomiCompany'))
  if (fields.company) return get(fields, 'company')

  // fallback #4: use existing display name?
  const displayName = data.display_name || data.cn
  if (displayName) {
    fields.display_name = util.unescapeDisplayName(displayName)
    return get(fields, 'display_name')
  }

  return ''
}

function trim (data, field) {
  return String(data[field] || '').trim()
}

function text (data, field) {
  return data[field]
}

function html (data, field) {
  const tagName = field === 'last_name' ? 'strong' : 'span'
  const value = _.escape(data[field])
  return '<' + tagName + ' class="' + field + '">' + value + '</' + tagName + '>'
}

// academic titles only
function getTitle (data) {
  const title = trim(data, 'title')
  return (/^(<span class="title">)?(dr\.?|prof\.?)/i).test(title) ? title : ''
}

const formats = {}
let formatSetting = 'auto'
settings.ready(() => {
  formatSetting = settings.get('fullNameFormat', 'auto')
})
settings.on('change:fullNameFormat', function (model, value) {
  formatSetting = value
})

const localizedFullnameFormats = {
  // #. Name with title
  // #. %1$s is the first name
  // #. %2$s is the last name
  // #. %3$s is the title
  withTitle: gt('%3$s %2$s, %1$s'),
  // #. Name without title
  // #. %1$s is the first name
  // #. %2$s is the last name
  withoutTitle: gt('%2$s, %1$s')
}

function getPreferredFormat (isMail, hasTitle) {
  // cached?
  const key = formatSetting + '/' + isMail + '/' + hasTitle
  let format = formats[key]
  if (format) return format
  // #. Name in mail addresses
  // #. %1$s is the first name
  // #. %2$s is the last name
  if (isMail) {
    format = gt.pgettext('mail address', '%1$s %2$s')
  } else if (formatSetting === 'firstname lastname') {
    format = hasTitle ? '%3$s %1$s %2$s' : '%1$s %2$s'
  } else if (formatSetting === 'lastname, firstname') {
    format = hasTitle ? '%3$s %2$s, %1$s' : '%2$s, %1$s'
  } else {
    // auto/fallback
    format = localizedFullnameFormats[hasTitle ? 'withTitle' : 'withoutTitle']
  }
  // add to cache
  return (formats[key] = format)
}

function getSortName (data) {
  if (!data) return ''
  if (data.last_name || data.first_name) return [data.last_name, data.first_name].filter(Boolean).join('.').toLocaleLowerCase()
  return String(data.display_name ?? data.cn ?? '').toLocaleLowerCase()
}

function deriveNameParts (str = '') {
  // check usual patterns
  const result = deriveParts(str)
  result.sort_name = getSortName(result)
  result.last_name = [result.prefix, result.last_name, result.suffix].filter(Boolean).join(' ')
  return result
}

const regAcademicTitles = /^((prof\.?|dr\.-ing\.|dr\.?)(\sdr\.?)*(\sh\.c\.)?(\smult\.)?)\s*(.+)$/i
// cp. https://en.wikipedia.org/wiki/List_of_family_name_affixes#Prefixes
const regFirstPrefixLast = /^(.*?)\s(das?|de|degli|dele?|della|der|di|dos|du|el?|ter|van der|van den?|van het|van|von|zu|von und zu)\s(.+)$/i
const regFirstSpaceLast = /^(.*?)\s(\S+)$/
const regSuffix = /^(.+)\s(PhD|MD|LLM|MdB|MdL|MdEP|RA)$/i

function deriveParts (str) {
  // trim first
  str = String(str ?? '').trim()
  // extract academic title first (easy to recognize)
  const { title, name } = extractAcademicTitle(str)
  // find index to split into FIRST and LAST
  const { first, last, prefix, suffix } = splitName(name)
  return { title, first_name: first, last_name: last, prefix, suffix }
}

function extractAcademicTitle (str) {
  const m = regAcademicTitles.exec(str)
  return { title: m ? m[1] : '', name: m ? m[6] : str }
}

function splitName (str = '') {
  // LAST COMMA FIRST; split at first comma and revert
  if (str.indexOf(',') > -1) {
    const [last, first] = str.split(/,\s?/, 2)
    return { first, last, prefix: '' }
  }
  // extract suffix now
  const { rest, suffix } = extractSuffix(str)
  // look for typical prefixes
  let m = regFirstPrefixLast.exec(rest)
  if (m) return { first: m[1], last: m[3], prefix: m[2], suffix }
  // split at first space
  m = regFirstSpaceLast.exec(rest)
  if (m) return { first: m[1], last: m[2], prefix: '', suffix }
  // fallback
  return { first: '', last: rest, prefix: '', suffix }
}

function extractSuffix (str) {
  const m = regSuffix.exec(str)
  return { rest: m ? m[1] : str, suffix: m ? m[2] : '' }
}

export default {

  getFullName (data, { isMail = false, formatAsHTML = false } = {}) {
    return getFullName(data, { isMail, formatAsHTML })
  },

  getMailFullName (data, { formatAsHTML = false } = {}) {
    return getFullName(data, { isMail: true, formatAsHTML })
  },

  setFormatSetting (value) {
    formatSetting = value
  },

  getSortName,

  deriveNameParts,

  localizedFullnameFormats,

  // just for unit testing
  test: { extractAcademicTitle, extractSuffix, splitName }
}
