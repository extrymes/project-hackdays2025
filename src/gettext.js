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

import ox from '@/ox'
export const dictionaries = {}
export const customizations = []
export function addDictionary (dictionary, gtFn) {
  dictionaries[dictionary.namespace] = gtFn
}

export async function changeLanguage (language) {
  await Promise.all(
    Object.values(dictionaries)
      .map(async dictionary => {
        try {
          await dictionary.changeLanguage(language)
        } catch (e) {
          if (ox.debug) console.warn(`Could not change dictionary ${dictionary.namespace} to ${language}`)
        }
      })
  )
  ox.trigger('language', language, dictionaries)
  applyCustomizations()
}

export function customize (name, replacement) {
  customizations.push({ name, replacement })
}

export function applyCustomizations () {
  customizations.forEach(({ name, replacement }) => {
    const dictionary = dictionaries[name]

    Object.keys(replacement.dict).forEach(entry => {
      dictionary.dict[entry] = replacement.dict[entry]
    })
  })
}

export default {
  addDictionary,
  changeLanguage,
  customize
}
