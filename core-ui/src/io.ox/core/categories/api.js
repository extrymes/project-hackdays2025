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

import Backbone from '@/backbone'
import _ from '@/underscore'
import { settings as coreSettings } from '@/io.ox/core/settings'
import ext from '@/io.ox/core/extensions'
import { parseStringifiedList } from '@/io.ox/core/util'
import { CategoryModel } from '@/io.ox/core/categories/model'

ext.point('io.ox/core/categories/default-list').extend({
  add () {
    this.push({
      name: 'Important',
      color: '#ff2968',
      icon: 'bi/exclamation-circle.svg',
      type: 'default'
    }, {
      name: 'Business',
      color: '#16adf8',
      icon: 'bi/briefcase.svg',
      type: 'default'
    }, {
      name: 'Private',
      color: '#707070',
      icon: 'bi/house-door.svg',
      type: 'default'
    }, {
      name: 'Meeting',
      color: '#63da38',
      icon: '',
      type: 'default'
    })
  }
})

const BaseCollection = Backbone.Collection.extend({
  model: CategoryModel
})

const CategoriesCollection = BaseCollection.extend({
  initialize () {
    const groups = { default: [], predefined: [], user: [] }

    ext.point('io.ox/core/categories/default-list').invoke('add', groups.default)
    groups.default = groups.default.map(category => ({ ...category, type: 'default' }))

    groups.user = Array(coreSettings.get('categories/userCategories', [])).flat()
      .map(category => ({ ...category, type: 'user' }))

    // admin categories are not user-changable
    groups.predefined = Array(coreSettings.get('categories/predefined', [])).flat()
      .map(category => ({ ...category, type: 'predefined', immutable: true }))

    // if user deleted all categories, ensure at least default categories are available
    this.reset([...groups.predefined, ...groups.user.length ? groups.user : groups.default])

    // store user categories after any change
    this.on('add remove', _.debounce(this.saveUserCategories, 300))
  },

  findByName (name, pimId) {
    // search in user categories first, then in shared categories
    return this.findWhere({ name, pimId: undefined }) || this.findWhere({ name, pimId })
  },

  filterByPIM (pimId) {
    // get categories that are either user categories or specific to this pim object (identified by pimId)
    return this.filter(category => category.get('pimId') === undefined || category.get('pimId') === pimId)
  },

  addObjectCategories (list, pimId) {
    // PIM objects can be shared, thus they might not be known in userCategories
    // these categories are added to categories with the pimId to identify them later, as they should only be configurable on the appropriate pim object
    // users can import shared categories (implicitely) by editing them, which removes the pim object relation by resetting pimId
    list
      .filter(name => !this.findByName(name, pimId))
      .map(name => this.add({ name, pimId, immutable: true, type: 'pim' }))
  },

  saveUserCategories () {
    const list = this.filter(model => {
      if (model.get('pimId')) return false
      if (model.get('type') === 'predefined') return false
      return true
    }).map(model => {
      const { name, color, icon } = model.toJSON()
      return { name, color, icon }
    })
    coreSettings.set('categories/userCategories', list).save()
  }
})

export const categoriesCollection = new CategoriesCollection()

// map category names (that serve as IDs) to known categories, or to new blank categories if not yet known
export function getCategoriesFromModel (categories = [], pimId) {
  if (!pimId) console.error('pim not set')
  categories = parseStringifiedList(categories)
  // side effect: import shared categories into the user categories to make them editable
  categoriesCollection.addObjectCategories(categories, pimId)

  return new BaseCollection(
    categories.map(name => categoriesCollection.findByName(name, pimId))
  )
}

export function getCategories () {
  // DEPRECATED: `getCategories`, pending remove with 8.19. Use `categoriesCollection` instead.
  console.warn('`getCategories` is deprecated, pending remove with 8.19. Use `categoriesCollection` instead.')
  return categoriesCollection
}
export function getCategoriesForPIM (pimId) {
  // DEPRECATED: `getCategoriesForPIM`, pending remove with 8.19. Use `categoriesCollection.filterByPIM(pimId)` instead.
  console.warn('`getCategoriesForPIM` is deprecated, pending remove with 8.19. Use `categoriesCollection.filterByPIM(pimId)` instead.')
  return categoriesCollection.filterByPIM(pimId)
}
export function addCategory (model) {
  // DEPRECATED: `addCategory`, pending remove with 8.19. Use `categoriesCollection.add` instead.
  console.warn('`addCategory` is deprecated, pending remove with 8.19. Use `categoriesCollection.add` instead.')
  categoriesCollection.add(model)
}
export function removeCategory (model) {
  // DEPRECATED: `removeCategory`, pending remove with 8.19. Use `categoriesCollection.remove` instead.
  console.warn('`removeCategory` is deprecated, pending remove with 8.19. Use `categoriesCollection.remove` instead.')
  categoriesCollection.remove(model)
}
export function saveCategorySettings () {
  // DEPRECATED: `saveCategorySettings`, pending remove with 8.19. Use `categoriesCollection.saveUserCategories` instead.
  console.warn('`saveCategorySettings` is deprecated, pending remove with 8.19. Use `categoriesCollection.saveUserCategories` instead.')
  categoriesCollection.saveUserCategories()
}
