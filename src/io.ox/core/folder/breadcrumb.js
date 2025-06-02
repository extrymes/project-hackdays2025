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
import api from '@/io.ox/core/folder/api'
import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'
import DisposableView from '@/io.ox/backbone/views/disposable'

const BreadcrumbView = DisposableView.extend({

  className: 'breadcrumb-view',

  events: {
    'click .breadcrumb-link': 'onClickLink'
  },

  initialize (options) {
    this.folder = options.folder
    this.label = options.label
    this.exclude = options.exclude
    this.display = options.display || 'inline'
    this.rootAlwaysVisible = options.rootAlwaysVisible
    // render folder as link although the user has only a read right
    this.linkReadOnly = options.linkReadOnly
    // this is always the first path element of the breadcrumb
    this.defaultRootPath = options.defaultRootPath

    // last item is a normal item (not a unclickable tail node)
    this.notail = options.notail

    // when container is used as single block element
    if (this.display === 'block') this.computeWidth = $.noop

    this.showSearchItem = false

    if (options.app) {
      this.app = options.app
      this.handler = function (id) { this.app.folder.set(id) }
      this.folder = this.app.folder.get()
      this.find = this.app.get('find')
      this.listenTo(this.app, 'folder:change', this.onChangeFolder)

      if (this.find && this.find.isActive()) {
        // use item's folder id
        this.folder = options.folder
        this.notail = true
        this.handler = function (id) {
          const folder = this.app.folder
          folder.unset()
          folder.set(id)
        }
      }

      if (options.backToSearchButton === true) {
        const lastCriteria = options.app.listView.model.get('lastCriteria')
        if (lastCriteria) {
          this.showSearchItem = true
        }
        this.app.folderView.tree.$el.on('click', '.folder', this.clearLastSearch.bind(this))
        this.app.props.on('change:searching', this.onSearch.bind(this))
      }

      if (this.display !== 'block') this.listenToDOM(window, 'resize', this.computeWidth)
    }
  },

  onSearch (model, value) {
    if (this.app.listView.model.get('lastCriteria') && value === false) {
      this.showSearchItem = true
      this.render()
      return
    }
    this.clearLastSearch()
  },

  clearLastSearch () {
    this.showSearchItem = false
    this.app.listView.model.unset('lastCriteria')
    this.render()
  },

  onChangeFolder (id) {
    this.folder = id
    this.render()
  },

  render () {
    if (this.disposed || this.folder === undefined) return this
    this.$el.text('\xa0')
    api.path(this.folder).done(this.renderPath.bind(this))
    return this
  },

  renderPath (path) {
    if (this.disposed) return

    // apply exclude option
    if (this.exclude) {
      const exclude = _(this.exclude)
      path = _(path).filter(function (data) { return !exclude.contains(data.id) })
    }

    if (this.defaultRootPath && this.defaultRootPath.id !== _.first(path).id) {
      path.unshift(this.defaultRootPath)
    }

    // listen to any changes on the path
    this.stopListening(api)
    this.stopListeningModels()
    _(path).each(this.listener, this)

    if (this.showSearchItem) {
      this.$el.empty().append(
        this.renderBackToSearch(),
        // ellipsis
        $('<span class="breadcrumb-ellipsis" aria-hidden="true">&hellip;</span>').hide(),
        // label
        this.label ? $('<span class="breadcrumb-label">').text(this.label) : [],
        // path
        _(_.rest(path)).map(this.renderLink, this)
      )
    } else if (this.rootAlwaysVisible) {
      this.$el.empty().append(
        this.renderLink(_.first(path), 0, path),
        // ellipsis
        $('<span class="breadcrumb-ellipsis" aria-hidden="true">&hellip;</span>').hide(),
        // label
        this.label ? $('<span class="breadcrumb-label">').text(this.label) : [],
        // path
        _(_.rest(path)).map(this.renderLink, this)
      )
    } else {
      this.$el.empty().append(
        // ellipsis
        $('<span class="breadcrumb-ellipsis" aria-hidden="true">&hellip;</span>').hide(),
        // label
        this.label ? $('<span class="breadcrumb-label">').text(this.label) : [],
        // path
        _(path).map(this.renderLink, this)
      )
    }

    if (this.app) this.computeWidth()
  },

  computeWidth: _.throttle(function () {
    if (this.disposed || !this.$el.is(':visible')) return

    const childNodes = [...this.$el.children()]
    const visibleSiblingNodes = [...this.$el.siblings(':visible')]
    const [breadcrumbNode] = this.$el.children('.breadcrumb-ellipsis')

    const containerWidth = this.$el.parent().width()
    const ellipsisWidth = $(breadcrumbNode).outerWidth(true)
    const siblingsWidth = visibleSiblingNodes.reduce((sum, node) => { return sum + $(node).outerWidth(true) }, 0)
    const maxWidth = Math.max(0, containerWidth - ellipsisWidth - siblingsWidth - 96)

    this.$el.toggleClass('invisible', true).children().show()

    let reservedWidth = 0

    if (this.rootAlwaysVisible) {
      const [rootNode] = childNodes.slice(0, 1)
      reservedWidth += $(rootNode).outerWidth(true)
    }

    childNodes.slice(this.rootAlwaysVisible ? 2 : 1).reverse().forEach(function (node, index) {
      reservedWidth += $(node).outerWidth(true)
      $(node).toggle(index === 0 || reservedWidth < maxWidth)
    })

    $(breadcrumbNode).toggle(reservedWidth > maxWidth)

    this.$el.toggleClass('invisible', false)
  }, 100),

  renderLink (data, index, all) {
    const length = all.length
    const isLast = index === length - 1
    const missingPrivileges = !api.can('read', data) && (!this.linkReadOnly || data.own_rights !== 1)
    let isDisabled = missingPrivileges
    let node

    // special case DOCS-2252: public files has own_rights === 4, but the breadcrumb should be clickable anyhow
    if (data && data.id === '15') { isDisabled = false }

    if (index === 0 && this.defaultRootPath && this.defaultRootPath.id !== data.id) {
      this.renderLink(this.defaultRootPath, 0, all)
    }

    // add plain text tail or clickable link
    if (isLast && !this.notail) node = $('<span class="breadcrumb-tail ellipsis">')
    else if (!this.handler || isDisabled) node = $('<span class="breadcrumb-item">')
    else node = $('<a href="#" role="button" class="breadcrumb-link">').attr('href', api.getDeepLink(data))

    node.attr({ 'data-id': data.id, 'data-module': data.module }).text(
      isLast ? data.title : _.ellipsis(data.title, { max: 20 })
    )

    if (!isLast) node = node.add(createIcon('bi/chevron-right.svg').addClass('breadcrumb-divider'))

    return node
  },

  onClickLink (e) {
    e.preventDefault()
    const id = $(e.target).attr('data-id')
    const module = $(e.target).attr('data-module')
    if (this.handler) this.handler(id, module)
    if (this.showSearchItem) {
      this.showSearchItem = false
      this.app.listView.model.unset('lastCriteria')
    }
    this.render()
  },

  renderBackToSearch () {
    const app = this.app
    const criteria = app.listView.model.get('lastCriteria')
    return $('<a href="#" role="button" class="breadcrumb-link">').append(
      // #. %1$s is the search term
      gt('Search: %1$s', criteria.words || '')
    ).on('click', () => {
      const lastCriteria = app.listView.model.get('lastCriteria')
      app.searchView.model.set({ ...lastCriteria })
      app.searchView.applyFilters()
      app.searchView.$input.val(lastCriteria.words)
      app.searchView.submit()
    }).add(createIcon('bi/chevron-right.svg').addClass('breadcrumb-divider'))
  },

  onFolderModelChange (model) {
    // when the shown folder is moved to external storage the folder id is changed, so we must update the
    // current folder id to the new one before rendering the path
    if (model.changed && model.previous('id') === this.folder) {
      this.onChangeFolder(model.get('id'))
    } else {
      this.render()
    }
  },

  onFolderPathModified (oldId, newId) {
    if (oldId === newId) return
    // when the shown folder is moved to external storage the folder id is changed, so we must update the
    // current folder id to the new one before rendering the path
    if (this.folder === oldId) {
      this.onChangeFolder(newId)
    } else {
      this.render()
    }
  },

  listener (data) {
    this.listenToFolderChange(data)
    this.listenToFolderModelChange(data)
  },

  stopListeningModels () {
    const breadcrumb = this
    _.each(breadcrumb.models, function (model) {
      breadcrumb.stopListening(model, 'change')
    })
    breadcrumb.models = []
  },

  listenToFolderModelChange (data) {
    const model = api.pool.getModel(data.id)
    this.models.push(model)
    this.listenTo(model, 'change', this.onFolderModelChange.bind(this))
  },

  listenToFolderChange (data) {
    this.listenTo(api, 'update:' + data.id, this.onFolderPathModified.bind(this))
  }
})

export default BreadcrumbView
