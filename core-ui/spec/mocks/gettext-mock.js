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

import { Dictionary } from '@open-xchange/rollup-plugin-po2json/lib/dictionary'

class TestDictionary extends Dictionary {
  // eslint-disable-next-line camelcase
  addTranslation ({ msgid, msgid_plural = '', msgctx = '' }, translations) {
    // eslint-disable-next-line camelcase
    this.dict[`${msgctx}\x00${msgid}\x01${msgid_plural}`] = translations
  }

  // eslint-disable-next-line camelcase
  removeTranslation ({ msgid, msgid_plural = '', msgctx = '' }) {
    // eslint-disable-next-line camelcase
    delete this.dict[`${msgctx}\x00${msgid}\x01${msgid_plural}`]
  }
}

export const dictionary = new TestDictionary('io.ox/tests', {
  headers: {
    'Plural-Forms': 'plural=(n!=1);'
  },
  dict: {}
})

export const getNewDictionary = (namespace) => {
  return new TestDictionary(namespace, {
    headers: {
      'Plural-Forms': 'plural=(n!=1);'
    },
    dict: {}
  })
}

export const gt = new Proxy(
  function simpleGt (str, ...args) { return dictionary.npgettext('', str, '', 1, ...args) },
  {
    get (target, prop) {
      if (typeof dictionary[prop] === 'function') return dictionary[prop].bind(dictionary)
      return target[prop]
    }
  }
)

export default gt
