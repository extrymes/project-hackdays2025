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

import ext from '@/io.ox/core/extensions'
import BasicModel from '@/io.ox/backbone/basicModel'
import { categoriesCollection } from '@/io.ox/core/categories/api'
import gt from 'gettext'

ext.point('io.ox/core/categories/model/validation/save').extend([{
  id: 'name-uniqueness',
  validate ({ name, oldcid }, err, model) {
    // only search in user categories
    const isTaken = categoriesCollection.where({ name, pimId: undefined }).some(c => c.cid !== oldcid)
    if (!isTaken) return
    // #. Used for validation when creating categories
    this.add('name', gt('Name is already taken.'))
  }
}, {
  id: 'name-empty',
  validate (attr, err, model) {
    if (attr.name) return
    // #. Used for validation when creating categories
    this.add('name', gt('Please enter a name.'))
  }
}, {
  id: 'name-contains-separator',
  validate (attr, err, model) {
    if (!attr.name.includes(',')) return
    // #. Used for validation when creating categories
    this.add('name', gt('Comma is not allowed.'))
  }
}])

export const CategoryModel = BasicModel.extend({
  ref: 'io.ox/core/categories/model/',
  defaults: {
    name: '',
    color: 'transparent',
    icon: 'none',
    immutable: false,
    type: 'user',
    // pimId identify a category as shared and associates this category to a specific pim object
    pimId: undefined
  }
})
