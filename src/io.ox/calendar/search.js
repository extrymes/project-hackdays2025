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

import _ from '@/underscore'
import $ from '@/jquery'
import ext from '@/io.ox/core/extensions'
import SearchView, { appendSearchView } from '@/io.ox/backbone/views/search'
import CollectionLoader from '@/io.ox/core/api/collection-loader'
import { settings as coreSettings } from '@/io.ox/core/settings'
import api from '@/io.ox/calendar/api'
import * as util from '@/io.ox/calendar/util'
import model from '@/io.ox/calendar/model'
import http from '@/io.ox/core/http'
import moment from '@open-xchange/moment'
import gt from 'gettext'

// +/- in months
const DEFAULT_RANGE = 3

ext.point('io.ox/calendar/mediator').extend({
  id: 'top-search',
  index: 10000,
  setup (app) {
    const after = moment().subtract(DEFAULT_RANGE, 'months').startOf('month').add(1, 'seconds').valueOf()
    const before = moment().add(DEFAULT_RANGE, 'months').endOf('month').valueOf()

    const defaultFields = {
      summary: gt('Title'),
      location: gt('Location')
    }
    const defaultTimeRange = {
      // the 'x' is the format token for Unix ms timestamp
      after: moment(after, 'x').format('l'),
      before: moment(before, 'x').format('l')
    }
    const collectionLoader = new CollectionLoader({
      module: 'calendar',
      mode: 'search',
      Collection: model.Collection,
      Model: model.Model,
      useLimit: false,
      getQueryParams (params) {
        const filters = []
        const criteria = params.criteria
        // special support for main languages (en, de, fr, es)
        const summary = criteria.summary
        const location = criteria.location
        const description = criteria.description
        const attendees = criteria.attendees
        const categories = criteria.categories
        if (summary) filters.push(['=', { field: 'summary' }, '*' + summary + '*'])
        if (location) filters.push(['=', { field: 'location' }, '*' + location + '*'])
        if (description) filters.push(['=', { field: 'description' }, '*' + description + '*'])
        if (categories) {
          categories.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g).forEach(category => filters.push(['=', { field: 'categories' }, '*' + decodeURIComponent(category.replaceAll(/^['"]|['"]$/g, '')) + '*']))
        }
        if (attendees) {
          _(attendees.split(' ')).each(function (word) {
            filters.push(['=', { field: 'attendees' }, '*' + word + '*'])
          })
        }
        if (criteria.words) {
          _(criteria.words.split(' ')).each(function (word) {
            filters.push(['or'].concat(Object.keys(defaultFields).map(field => ['=', { field }, '*' + word + '*'])))
          })
        }
        const rangeStart = criteria.after
          ? moment(criteria.after).format(util.ZULU_FORMAT)
          : moment().subtract(DEFAULT_RANGE, 'months').startOf('month').format(util.ZULU_FORMAT)
        const rangeEnd = criteria.before
          ? moment(criteria.before).format(util.ZULU_FORMAT)
          : moment().add(DEFAULT_RANGE, 'months').endOf('month').format(util.ZULU_FORMAT)
        return {
          action: 'advancedSearch',
          expand: true,
          fields: 'lastModified,color,categories,createdBy,endDate,flags,folder,id,location,recurrenceId,rrule,seriesId,startDate,summary,timestamp,transp',
          rangeStart,
          rangeEnd,
          // we might just use date ranges to search
          data: { folders: app.folders.list(), filter: filters.length ? ['and'].concat(filters) : ['=', { field: 'summary' }, '*'] }
        }
      },
      isBad () {
        // we don't need a folder
        return false
      },
      fetch (params) {
        return http.wait().then(function () {
          return http.PUT({
            module: 'chronos',
            params: _(params).omit('data'),
            data: params.data
          })
            .then(response => {
              return _(response).chain().pluck('events').flatten().compact().value().slice(0, 190)
            })
        })
      },
      each (obj) {
        api.pool.add('detail', obj)
      },
      PRIMARY_PAGE_SIZE: 200,
      SECONDARY_PAGE_SIZE: 200
    })

    const view = new SearchView({
      app,
      defaultFields,
      defaultTimeRange,
      placeholder: gt('Search appointments'),
      point: 'io.ox/calendar/search/dropdown',
      defaults: {
        summary: '',
        location: '',
        description: '',
        attendees: '',
        after,
        before
      },
      filters: [
        // id, label, prefix (fallback is label lowercase), type (optional), unique, visible
        ['summary', gt('Title'), '', 'string', true, true],
        ['location', gt('Location'), '', 'string', true, true],
        ['description', gt('Description'), '', 'string', true, true],
        ['attendees', gt('Participant'), '', 'string', false, true],
        ['categories', gt('Categories'), '', 'string', false, true]
      ],
      addressDefaultFilter: 'attendees',
      autoSuggest ({ prefix, word }) {
        if (prefix || word.length <= 1) return []
        const list = []
        list.push({ filter: 'summary', value: word })
        list.push({ filter: 'location', value: word })
        list.push({ filter: 'attendees', value: word })
        if (coreSettings.get('features/categories', false)) list.push({ filter: 'categories', value: word })
        return list
      }
    })
      .on('before:show', () => $('#io-ox-topsearch .search-container.search-view').hide())
      .on('search', function (criteria) {
        // fluent option: do not write to user settings
        const layout = app.props.get('layout')
        if (layout !== 'list') {
          this.previousLayout = layout
          app.props.set('layout', 'list', { fluent: true })
        }
        // deriveFilter(criteria)
        app.listView.connect(collectionLoader)
        app.listView.model.set({ criteria })
      })
      .on('cancel', function () {
        if (this.previousLayout !== 'list') app.props.set('layout', this.previousLayout, { fluent: true })
        app.listView.connect(api.collectionLoader)
        app.listView.model.unset('criteria')
      })

    appendSearchView({ app, view })
  }
})

ext.point('io.ox/calendar/search/dropdown').extend({
  id: 'default',
  index: 100,
  render () {
    this.$dropdown.append(
      this.input('summary', gt('Title')),
      this.input('location', gt('Location')),
      this.input('description', gt('Description')),
      this.address('attendees', gt('Participants')),
      coreSettings.get('features/categories', false) && this.categoryInput('categories', gt('Categories')),
      this.dateRange({ mandatoryAfter: true, mandatoryBefore: true }),
      this.button()
    )
  }
})
