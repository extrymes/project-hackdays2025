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

import locale from '@/io.ox/core/locale'
import _ from '@/underscore'
import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

let nSize
function initNSize () {
  nSize = [
    /* #. Bytes */
    gt('B'),
    /* #. Kilobytes */
    gt('kB'),
    /* #. Megabytes */
    gt('MB'),
    /* #. Gigabytes */
    gt('GB'),
    /* #. Terabytes */
    gt('TB'),
    /* #. Petabytes */
    gt('PB'),
    /* #. Exabytes */
    gt('EB'),
    /* #. Zettabytes */
    gt('ZB'),
    /* #. Yottabytes */
    gt('YB')
  ]
}

// String size in bytes
export function size (string, kBMode) {
  const size = (encodeURI(string).split(/%(?:u[0-9A-F]{2})?[0-9A-F]{2}|./).length - 1)
  return kBMode ? (size / 1024).toFixed() : size
}

// decimalPlaces can also be the string 'smart'
// this causes MB, KB and B to never include decimalPlaces and From GB onward to have a maximum of 3 decimal spaces and trim '0's at the end
// we don't want a quota of 2.5GB to read 3GB and have people wondering
export function getHumanReadableSize (size, decimalPlaces) {
  if (!nSize) initNSize()
  let i = 0; const $i = nSize.length; let smartMode = false

  // for security so math.pow doesn't get really high values
  if (decimalPlaces > 10) decimalPlaces = 10

  // use max 3 decimalPlaces for smart mode
  if (decimalPlaces === 'smart') {
    decimalPlaces = 3
    smartMode = true
  }

  const dp = Math.pow(10, decimalPlaces || 0)
  while (size >= 1024 && i < $i) {
    size = size / 1024
    i++
  }
  // get rounded size
  size = Math.round(size * dp) / dp
  // edge case: rounded size is 1024 (see bug 50095)
  if (size === 1024) {
    size = size / 1024
    i++
  }

  if (smartMode) {
    // no decimalPlaces below GB in smart mode
    if (i < 3) {
      decimalPlaces = 0
    }
  }

  // no decimal places for byte sized values
  if (i === 0) decimalPlaces = 0

  return (
  // #. File size
  // #. %1$d is the number
  // #. %2$s is the unit (B, KB, MB etc.)
    gt('%1$d %2$s', smartMode ? locale.number(size, 0, decimalPlaces) : locale.number(size, decimalPlaces), nSize[i])
  )
}

export function shortenUri (uriString, maxlen) {
  uriString = uriString !== undefined && uriString !== null ? uriString : ''
  const string = uriString.replace(/^https?:\/\//, '')
  const difference = string.length - maxlen
  if (difference <= 0) {
    return string
  }
  const middle = string.length / 2
  const left = middle - (difference / 2) - 1
  const right = middle + (difference / 2) + 1

  return string.substring(0, left) + '...' + string.substring(right, string.length)
}

export function getCustomString (id, fallback = '') {
  if (!id) return ''
  const language = locale.current().slice(0, 2).toLowerCase()
  return settings.get(`customStrings/${id}/${language}`) || settings.get(`customStrings/${id}/en`) || fallback
}

export function injectLink (str, { href = '#', text = '', target = '_blank' } = {}) {
  return _.printf(_.escape(str), `<a href="${_.escape(href)}" target="${target}" rel="noopener">${_.escape(text)}</a>`)
}

export default {
  size,
  fileSize: getHumanReadableSize,
  shortenUri
}
