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
import ext from '@/io.ox/core/extensions'
import SearchView, { appendSearchView } from '@/io.ox/backbone/views/search'
import CollectionLoader from '@/io.ox/core/api/collection-loader'
import api from '@/io.ox/files/api'
import http from '@/io.ox/core/http'
import { settings } from '@/io.ox/core/settings'
import { advancedSearchTypeFilter } from '@/io.ox/files/search/type-filters'
import gt from 'gettext'

const types = {
  all: gt('All types'),
  image: gt('Photos and images'),
  pdf: gt('PDFs'),
  text: gt('Text documents'),
  sheet: gt('Spreadsheets'),
  presentation: gt('Presentations'),
  audio: gt('Audio files'),
  video: gt('Videos'),
  archive: gt('Archives'),
  folder: gt('Folders')
}

const searchIn = {
  current: gt('Current folder'),
  all: gt('All folders')
}

const i18n = {
  // #. "Search in" like "Search in folder"; appears as label above folder selection
  searchIn: gt.pgettext('search', 'Search in'),
  // #. Type like "file type"; appear above type selection like images, videos, PDFs
  type: gt.pgettext('search', 'Type')
}

ext.point('io.ox/files/mediator').extend({
  id: 'top-search',
  index: 10000,
  setup (app) {
    const listView = app.listView
    const collectionLoader = new CollectionLoader({
      module: 'files',
      mode: 'search',
      useLimit: false,
      getQueryParams (params) {
        const criteria = params.criteria
        const filters = []
        // TODO: use folder 9 for files again after 8.1, folder request are using 9 already
        const defaultFolder = settings.get('folder/infostore')
        let folder = criteria.folder === 'all' ? defaultFolder : String(app.folder.get())
        if (/^virtual\//.test(folder)) folder = defaultFolder

        const type = criteria.type || 'all'
        if (type !== 'all' && type !== 'folder') filters.push(advancedSearchTypeFilter(type))
        if (criteria.words) {
          _(criteria.words.split(' ')).each(function (word) {
            filters.push(['=', { field: 'filename' }, '*' + word + '*'])
          })
        }

        if (criteria.after) filters.push(['>', { field: 'last_modified' }, String(criteria.after)])
        if (criteria.before) filters.push(['<', { field: 'last_modified' }, String(criteria.before)])

        return {
          action: 'advancedSearch',
          columns: api.search.columns,
          folder,
          includeSubfolders: true,
          sort: 5,
          order: 'desc',
          timezone: 'utc',
          data: { filter: ['and'].concat(filters) },
          meta: {
            type,
            name: criteria.words
          }
        }
      },
      isBad: _.constant(false),
      fetch (params) {
        return http.wait().then(function () {
          return $.when(
            params.meta.type === 'all' || params.meta.type === 'folder'
              ? http.PUT({
                module: 'folders',
                params: { action: 'search', module: 'files', id: 9, size: 1000, columns: api.allFolderColumns },
                data: { query: params.meta.name }
              })
              : $.when([[]]),
            params.meta.type !== 'folder'
              ? http.PUT({
                module: 'files',
                params: _(params).omit('data', 'meta'),
                data: params.data
              })
              : $.when([[]])
          )
            .then((folders, files) => {
              return [].concat(folders[0], files[0])
            })
        })
      },
      each (obj) {
        api.pool.add('detail', obj)
      },
      PRIMARY_PAGE_SIZE: 100,
      SECONDARY_PAGE_SIZE: 100
    })

    const view = new SearchView({
      app,
      placeholder: gt('Search files'),
      point: 'io.ox/files/search/dropdown',
      // we don't need names (since we don't yet search for the file owner, for example)
      autocomplete: false,
      defaults: {
        folder: 'all',
        type: 'all'
      },
      filters: [
        // id, label, prefix (fallback is label lowercase), type (optional), unique, visible, options
        ['folder', i18n.searchIn, '', 'list', true, true, searchIn],
        ['type', i18n.type, '', 'list', true, true, types]
      ]
    })
      .on('before:show', () => $('#io-ox-topsearch .search-container.search-view').hide())
      .on('search', async function (criteria) {
        if (_.device('smartphone')) await app.pages.changePage('main')
        if (listView.model.get('resetSearch') && collectionLoader.collection) {
          collectionLoader.collection.expire()
          listView.model.unset('resetSearch')
        }
        listView.connect(collectionLoader)
        listView.model.set({ criteria, sort: 702, order: 'desc' })
        listView.model.set({ lastCriteria: criteria })
      })
      .on('cancel', function () {
        listView.connect(api.collectionLoader)
        listView.model.unset('criteria')
      })
      .on('open', function () {
        ext.point('io.ox/files/search/dropdown').invoke('render', this)
      })

    appendSearchView({ app, view })
    app.searchView = view
  }
})

ext.point('io.ox/files/search/dropdown').extend({
  id: 'default',
  index: 100,
  render () {
    const folderId = this.app.folder.get()
    const searchCurrentFolderUnavailable = (/^virtual\//.test(folderId)) || this.app.folder.getModel().is('external')
    this.$dropdown.empty().append(
      searchCurrentFolderUnavailable
        ? this.select('folder', i18n.searchIn, SearchView.convertOptions(_.pick(searchIn, 'all')))
        : this.select('folder', i18n.searchIn, SearchView.convertOptions(searchIn)),
      this.select('type', i18n.type, SearchView.convertOptions(types)),
      this.input('words', gt('File or folder name')),
      this.dateRange(),
      this.button()
    )
  }
})
