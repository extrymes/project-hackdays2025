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

import { categoriesCollection } from '@/io.ox/core/categories/api'

export const CategoryIndex = {
  async search (query) {
    if (typeof query !== 'string') return []
    query = this.normalize(query)

    const cids = categoriesCollection
      .filter(category => { return category.get('name').toLowerCase().startsWith(query) })
      .map(category => this.processCategory(category))

    return this.resolve(cids)
  },

  normalize (str) {
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
  },

  resolve (ids) {
    return [].concat(ids)
      .map(cid => this.processCategory(categoriesCollection.get(cid)))
      .filter(Boolean)
  },

  processCategory (item) {
    return {
      cid: item.cid,
      name: item.get('name')
    }
  }
}
