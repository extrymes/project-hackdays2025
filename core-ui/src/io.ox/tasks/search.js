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
import http from '@/io.ox/core/http'
import gt from 'gettext'

const i18n = {
  // #. "Search in" like "Search in folder"; appears as label above folder selection
  searchIn: gt.pgettext('search', 'Search in')
}

const searchIn = {
  current: gt('Current list'),
  all: gt('All lists')
}

ext.point('io.ox/tasks/mediator').extend({
  id: 'top-search',
  index: 10000,
  setup (app) {
    const view = new SearchView({
      app,
      placeholder: gt('Search tasks'),
      point: 'io.ox/tasks/search/dropdown',
      autocomplete: false,
      defaults: {
        folder: 'current'
      },
      filters: [
        // id, label, prefix (fallback is label lowercase), type (optional), unique, visible, options
        ['folder', i18n.searchIn, '', 'list', true, true, searchIn]
      ]
    })
      .on('before:show', () => $('#io-ox-topsearch .search-container.search-view').hide())
      .on('search', async function (criteria) {
        if (_.device('smartphone')) await app.pages.changePage('listView')
        deriveFilter(criteria)
        app.grid.setMode('search')
      })
      .on('cancel', function () {
        app.grid.setMode('all')
      })

    appendSearchView({ app, view })

    let filters = {}

    // search: all request
    app.grid.setAllRequest('search', function () {
      // important: pick ignores undefined
      const params = _.pick(filters, 'start', 'end')
      const data = _.pick(filters, 'folder', 'pattern')
      // result: contains a amount of data somewhere between the usual all and list responses
      return http.wait().then(function () {
        return http.PUT({
          module: 'tasks',
          params: _.extend({
            action: 'search',
            columns: '1,2,5,20,101,200,203,220,221,300,301,309,316,317,401',
            sort: '317',
            order: 'asc',
            timezone: 'utc'
          }, params),
          data
        })
      })
    })

    // forward ids (no explicit all/list request in find/search api)
    app.grid.setListRequest('search', function (ids) {
      const args = [ids]
      return $.Deferred().resolveWith(app, args)
    })

    function deriveFilter (criteria) {
      filters = {}
      if (criteria.words) filters.pattern = criteria.words
      if (criteria.folder === 'current') filters.folder = app.folder.get()
      if (criteria.after) filters.start = criteria.after
      if (criteria.before) filters.end = criteria.before
    }
  }
})

ext.point('io.ox/tasks/search/dropdown').extend({
  id: 'default',
  index: 100,
  render () {
    this.$dropdown.append(
      this.select('folder', gt('Search in'), [{ value: 'current', label: gt('Current list') }, { value: 'all', label: gt('All lists') }]),
      this.input('words', gt('Contains words')),
      this.dateRange({ mandatoryAfter: false, mandatoryBefore: false }),
      this.button()
    )
  }
})
