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
import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import gt from 'gettext'
import ListView from '@/io.ox/core/tk/list'
import DisposableView from '@/io.ox/backbone/views/disposable'
import listUtils from '@/io.ox/backbone/mini-views/listutils'

import { ErrorView, InputView } from '@/io.ox/backbone/mini-views/common'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { createIcon, createButton } from '@/io.ox/core/components'
import { categoriesCollection } from '@/io.ox/core/categories/api'
import { CategoryModel } from '@/io.ox/core/categories/model'
import { ItemColorView, ItemIconView, ItemPicker } from '@/io.ox/core/categories/item-picker'
import { deriveCategoryColors, icons, colors } from '@/io.ox/core/categories/util'

import '@/io.ox/contacts/addressbook/style.scss'

const CategoryView = DisposableView.extend({

  className: 'category-view ellipsis',

  tagName: 'span',

  initialize (options = {}) {
    this.options = options
    if (this.options.searchable) {
      this.$el.addClass('search')
      this.$el.attr('data-searchable', true)
    }
    if (this.options.removable) {
      this.$el.attr('data-removable', true)
    }

    this.listenTo(this.model, 'change', this.render)
    this.listenTo(ox, 'themeChange', this.render)
  },

  render () {
    if (this.disposed === true) return

    const icon = this.model.get('icon') !== 'none' && this.model.get('icon')
    const baseColor = this.model.get('color')
    const colors = deriveCategoryColors(baseColor)

    this.$el.empty()
      .append(
        icon ? createIcon(icon).addClass('bi-m') : $(),
        $('<span class="ellipsis">').text(this.model.get('name')),
        this.getControls()
      )
      .attr({
        'data-name': this.model.get('name'),
        'data-type': this.model.get('type')
      })
      .css({
        backgroundColor: colors.background,
        borderColor: baseColor === 'transparent' ? colors.border : colors.background,
        color: colors.foreground
      })

    return this
  },

  getControls () {
    if (!this.options.removable) return $()
    return createButton({
      variant: 'none',
      className: 'badge-remove-button',
      icon: {
        name: 'bi/x-lg.svg',
        className: 'bi-m',
        // #. Used for removing a category with name from a pim object
        title: gt('Remove category "%s"', this.model.get('name'))
      }
    })
  }
})

export const CategoryBadgesView = DisposableView.extend({
  tagName: 'ul',
  className: 'categories-badges list-unstyled',

  events: {
    'click button.badge-remove-button': 'onChildDelete',
    'click button.search': 'onChildSearch'
  },

  initialize (options = {}) {
    this.collection = options.collection

    this.childViewOptions = {}
    if (options.searchable) this.childViewOptions = { ...this.childViewOptions, tagName: 'button', searchable: true }
    if (options.removable) this.childViewOptions = { ...this.childViewOptions, removable: true }

    // reflect global category removal
    this.listenTo(categoriesCollection, 'remove', model => { this.collection.remove(model) })
    this.listenTo(this.collection, 'add remove', this.render)
  },

  onChildSearch (e) {
    const { name } = e.target.closest('.category-view').dataset
    ox.trigger('search:category', name)
  },

  onChildDelete (e) {
    const { name } = e.target.closest('.category-view').dataset
    const model = this.collection.findWhere({ name })
    this.collection.remove(model)
  },

  render () {
    this.$el.empty().append(
      this.collection
        .map(model => $('<li>').append(
          new CategoryView({ model, ...this.childViewOptions }).render().$el
        ))
    )
    return this
  }
})

const CategoryListItem = DisposableView.extend({
  className: 'category-list-item',
  tagName: 'li',

  events: {
    'click .delete': 'onClickDelete',
    'click .edit': 'onClickEdit'
  },

  initialize () {
    this.categoryBadge = new CategoryView({ model: this.model })
  },

  onClickEdit (e) {
    e.preventDefault()
    openUpdateCategoryModal({
      title: gt('Edit category'),
      label: gt('Save'),
      model: this.model
    })
  },

  onClickDelete (e) {
    e.preventDefault()
    openDeleteCategoryModal({ model: this.model })
  },

  render () {
    this.$el.append(this.categoryBadge.render().el)

    if (this.model.get('immutable')) return this

    this.$el.append(
      listUtils.makeControls().append(
        createButton({
          className: 'delete',
          variant: 'none',
          icon: {
            name: 'bi/trash.svg',
            className: 'bi-l',
            // #. Used for deleting a category with name
            title: gt('Delete %s', this.model.get('name'))
          }
        }),
        createButton({
          className: 'edit',
          variant: 'none',
          icon: {
            name: 'bi/pencil.svg',
            className: 'bi-l',
            // #. Used for editing a category with name
            title: gt('Edit %s', this.model.get('name'))
          }
        })
      )
    )

    return this
  }
})

const CategoryListView = ListView.extend({
  className: 'category-list-view list-unstyled',
  tagName: 'ul',

  initialize ({ pimId }) {
    this.pimId = pimId
    this.listenTo(categoriesCollection, 'update', this.render)
  },

  render () {
    this.$el.empty()
    const userCategories = categoriesCollection.filterByPIM(this.pimId).filter(model => model.get('pimId') === undefined)
    userCategories.forEach((model) => {
      this.$el.append(
        new CategoryListItem({ model }).render().el
      )
    })
    return this
  }
})

export const CategoryDropdown = Dropdown.extend({
  className: 'category-dropdown',

  initialize (options) {
    Dropdown.prototype.initialize.apply(this, arguments)
    this.pimId = options.pimId
    this.pimModel = options.pimModel
    this.pimCategories = options.pimCategories
    this.model = new Backbone.Model()

    // initial value for dropdown models
    this.pimCategories.forEach(categoryModel => this.model.set(categoryModel.get('name'), true))
    this.render()

    // ensure (dropdown) model AND pimCategories AND pimModel value are in sync
    this.listenTo(this.model, 'change', this.onChange)
    this.listenTo(this.pimCategories, 'remove', this.removeCategory)
    this.listenTo(categoriesCollection, 'remove', this.removeCategory)
    this.listenTo(categoriesCollection, 'update', this.render)
  },

  removeCategory (categoryModel) {
    this.model.unset(categoryModel.get('name'), { _origin: 'badge' })
  },

  updatePIMCategories () {
    Object.entries(this.model.attributes).forEach(([name, isChecked]) => {
      const categoryModel = categoriesCollection.findWhere({ name })
      return isChecked
        ? this.pimCategories.add(categoryModel)
        : this.pimCategories.remove(categoryModel)
    })
  },

  onChange (model, options = { _origin: 'dropdown' }) {
    const source = options._origin || 'dropdown'
    // model is lastest => update pimModel categories
    if (source === 'dropdown') this.updatePIMCategories()

    // update pim Model value
    this.pimModel.set('categories', Object.entries(this.model.attributes)
      .filter(([name, isChecked]) => isChecked)
      .map(([name]) => {
        const categoryModel = categoriesCollection.findWhere({ name })
        if (!categoryModel) return undefined
        return categoryModel.get('name')
      })
      .filter(Boolean)
      .join(',')
    )
    this.render()
  },

  render () {
    this.$ul.empty()
    const userCategories = categoriesCollection.filterByPIM(this.pimId).filter(model => model.get('pimId') === undefined)
    const sharedCategories = categoriesCollection.filterByPIM(this.pimId).filter(model => model.get('pimId') !== undefined)

    // #. Categories available to the user
    if (sharedCategories.length !== 0) this.header(gt('User Categories'))
    userCategories.forEach(model => {
      this.option(
        model.get('name'), true, () => new CategoryView({ model, tagName: 'div' }).render().el
      )
      this.listenTo(model, 'change', this.render)
    })

    if (sharedCategories.length !== 0) {
      // #. Categories available to the user through sharing
      this.header(gt('Shared Categories'))
      sharedCategories.forEach((model) => {
        this.option(
          model.get('name'), true, () => new CategoryView({ model, tagName: 'div' }).render().el
        )
        this.listenTo(model, 'change', this.render)
      })
    }

    this.divider()
    this.link(
      'dropdown-min-width',
      // #. Opens the Manage categories dialog
      `${gt('Manage categories')} ...`,
      () => openManageCategoryModal({ previousFocus: this.$toggle, pimId: this.pimId }),
      { data: 'dropdown-min-width' }
    )

    Dropdown.prototype.render.apply(this)
    return this
  }
})

// Create/Edit Modal
function openUpdateCategoryModal (options) {
  const { model, title, label } = options
  const isCreate = !model.get('name')
  const isSmallDevice = _.device('smartphone') && window.innerWidth <= 450
  const modifiedModel = new CategoryModel({ ...model.toJSON(), oldcid: model.cid })

  const modal = new ModalDialog({
    title,
    backdrop: true,
    width: 426,
    autoClose: false
  })
    .build(function () {
      const $nameGroup = $('<div class="category-form-group name-group">').append(
        $('<label class="control-label" for=name>').text(gt('Name')),
        new InputView({
          model: modifiedModel,
          id: 'name',
          attributes: {
            disabled: modifiedModel.get('immutable')
          }
        }).render().$el,
        new ErrorView({
          name: 'name',
          model: modifiedModel,
          selector: '.category-form-group'
        }).render().$el
      )

      const $colorGroup = $('<fieldset class="category-form-group color-group">').append(
        $('<legend id="categories-colorselection">').text(gt('Color')),
        new ItemPicker({
          model: modifiedModel,
          attribute: 'color',
          items: colors(),
          ItemView: ItemColorView
        }).render().$el
      ).toggleClass('scrollable', isSmallDevice)

      const $iconGroup = $('<fieldset class="category-form-group icon-group" role="radiogroup" aria-labelledby="categories-iconselection" >').append(
        $('<legend id="categories-iconselection">').text(gt('Icon')),
        new ItemPicker({
          model: modifiedModel,
          attribute: 'icon',
          items: icons,
          ItemView: ItemIconView
        }).render().$el
      ).toggleClass('scrollable', isSmallDevice)

      this.$body.append(
        $('<form class="edit_category">').append(
          $('<fieldset class="form-horizontal">').append(
            $nameGroup, $colorGroup, $iconGroup
          )
        ).on('submit', e => { e.preventDefault() })
      )
    })
    .addCancelButton()
    .addButton({ label, action: 'save' })
    .on('save', function () {
      if (!modifiedModel.isValid({ isSave: true })) return

      // if this is a shared category, unset pimId to mark this as user category which can be saved
      modifiedModel.set('pimId', undefined)
      model.set(modifiedModel.toJSON())

      if (isCreate) {
        categoriesCollection.add(model)
      } else {
        categoriesCollection.saveUserCategories()
      }
      this.close()
    })

  modifiedModel.on('invalid', () => {
    modal.$el.find('button[data-action=save]')[0].disabled = true
  })
  modifiedModel.on('valid', () => {
    modal.$el.find('button[data-action=save]')[0].disabled = false
  })

  modal.$el.addClass('category-modal category-modal-update')

  return modal.open()
}

// Delete confirmation
function openDeleteCategoryModal (options) {
  const modal = new ModalDialog(
    {
      // #. Dialog for deleting a category
      title: gt('Delete category'),
      backdrop: true,
      // #. Dialog prompt for deleting a category with name
      description: gt('Do you really want to delete the category "%s"?', options.model.get('name'))
    }
  )
    .inject(
      {
        getModel () {
          return options.model
        }
      }
    )
    .addCancelButton()
    .addButton({ label: gt('Delete'), action: 'delete' })
    .on('delete', function () {
      categoriesCollection.remove(this.getModel())
    })

  return modal.open()
}

export function openManageCategoryModal ({ previousFocus, pimId }) {
  const modal = new ModalDialog({
    // #. Dialog header for managing categories
    title: gt('Manage categories'),
    backdrop: true,
    width: 420,
    autoClose: false,
    help: 'ox.appsuite.user.sect.dataorganisation.categories.html',
    previousFocus
  })
    .build(function () {
      this.$el.addClass('category-modal')
      this.$body.append(
        new CategoryListView({ pimId }).render().$el
      )
    })
    .addButton({
      placement: 'left',
      className: 'btn-default',
      // #. Button to create a new category
      label: gt('New category'),
      action: 'open-new-category'
    })
    .addCloseButton()
    .on('open-new-category', () =>
      openUpdateCategoryModal({
        title: gt('Create category'),
        label: gt('Create'),
        model: new CategoryModel({})
      })
    )
    .on('save', () => {
      categoriesCollection.saveUserCategories()
      modal.close()
    })

  modal.$el.addClass('category-modal')
  return modal.open()
}

export const AutoCompleteCategoriesItems = {
  render ($el, list, offset = 0, limit = 20) {
    const el = $el[0]
    const subset = list.slice(offset, limit).map(item => categoriesCollection.get(item.cid))
    if (offset === 0) el.innerHTML = ''
    const template = subset.map(model => {
      return $(`<li class="list-item selectable" aria-selected="false" role="option" tabindex="-1" data-cid="${model.cid}">`).append(
        $('<div class="list-item-checkmark">'),
        $('<div class="list-item-content">').append(
          new CategoryView({ model, tagName: 'div' }).render().el
        )
      )
    })
    $el.append(template)
    if (offset === 0) el.scrollTop = 0
  }
}
