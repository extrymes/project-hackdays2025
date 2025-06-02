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
import { settings as coreSettings } from '@/io.ox/core/settings'
import http from '@/io.ox/core/http'
import gt from 'gettext'

const i18n = {
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  name: gt.pgettext('search', 'name'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  email: gt.pgettext('search', 'email'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  phone: gt.pgettext('search', 'phone'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  business: gt.pgettext('search', 'business'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  address: gt.pgettext('search', 'address'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  note: gt.pgettext('search', 'note'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  categories: gt.pgettext('search', 'categories')
}

ext.point('io.ox/contacts/mediator').extend({
  id: 'top-search',
  index: 10000,
  setup (app) {
    const view = new SearchView({
      app,
      placeholder: gt('Search contacts'),
      point: 'io.ox/contacts/search/dropdown',
      filters: [
        // id, label, prefix (fallback is label lowercase), type (optional), unique, visible
        // #. ctx(search): search terms must be one word (without spaces), lowercase, and must be unique per app
        ['name', gt('Name'), i18n.first, 'string', true, true],
        ['email', gt('Email'), i18n.email, 'string', true, true],
        ['phone', gt('Phone'), i18n.phone, 'string', true, true],
        ['business', gt('Business'), i18n.business, 'string', true, true],
        ['address', gt('Address'), i18n.address, 'string', true, true],
        ['note', gt.pgettext('contact', 'Note'), i18n.note, 'string', true, true],
        ['categories', gt('Categories'), i18n.categories, 'string', false, true]
      ],
      autoSuggest ({ prefix, word }) {
        if (prefix || word.length <= 1) return []
        const list = []
        list.push({ filter: 'name', value: word })
        list.push({ filter: 'phone', value: word })
        list.push({ filter: 'business', value: word })
        list.push({ filter: 'address', value: word })
        list.push({ filter: 'note', value: word })
        if (coreSettings.get('features/categories', false)) list.push({ filter: 'categories', value: word })
        return list
      }
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

    let filters = []

    // search: all request
    app.grid.setAllRequest('search', function () {
      // result: contains a amount of data somewhere between the usual all and list responses
      return http.wait().then(function () {
        return http
          .PUT({
            module: 'addressbooks',
            params: {
              action: 'advancedSearch',
              columns: '20,1,100,101,500,501,502,505,508,510,519,520,524,526,528,555,556,557,569,592,597,602,606,607,616,617,5,2',
              sort: '607',
              timezone: 'utc'
            },
            data: { filter: ['and'].concat(filters) }
          })
          // search gets into bad shape when errors occur so catch any exception here
          .catch(e => {
            console.error('addressbooks?action=advancedSearch', e)
            return []
          })
      })
    })

    // forward ids (no explicit all/list request in find/search api)
    app.grid.setListRequest('search', function (ids) {
      const args = [ids]
      return $.Deferred().resolveWith(app, args)
    })

    const fields = {
      name: 'first_name,last_name,yomiFirstName,yomiLastName,nickname,second_name,suffix,display_name'.split(','),
      email: 'email1,email2,email3'.split(','),
      business: 'company,department,position'.split(','),
      phone: 'cellular_telephone1,cellular_telephone2,telephone_business1,telephone_business2,telephone_home1,telephone_home2,telephone_other,telephone_company,telephone_assistant'.split(','),
      address: 'street_business,street_home,street_other,postal_code_business,postal_code_home,postal_code_other,city_business,city_home,city_other,state_business,state_home,state_other,country_business,country_home,country_other'.split(','),
      note: ['note']
    }

    function or (fields, value) {
      return ['or'].concat(fields.map(field => ['=', { field }, value]))
    }

    function deriveFilter (criteria) {
      filters = []

      const sections = ['name', 'email', 'phone', 'business', 'address', 'note']
      sections.forEach(field => {
        if (!criteria[field]) return
        // facet-based search in 7.10.x also used substring search so this should be fine
        // performance-wise -- most fields are empty or very short anyhow)
        filters.push(or(fields[field], '*' + criteria[field] + '*'))
      })

      if (criteria.categories) {
        const reWrappingQuotes = /(^"|"$)/g
        const categories = (criteria.cat || criteria.categories || criteria.kategorien) // cSpell:disable-line
        categories.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g)
          .map(category => category.replace(reWrappingQuotes, ''))
          .forEach(category => filters.push(['=', { field: 'categories' }, '*' + category + '*']))
      }

      if (criteria.words) {
        // replace once MW adds propper escaping: criteria.words.replace(/\*/g, '\\*')
        const words = criteria.words
        const allFields = [].concat(
          fields.name, fields.email, fields.business, fields.address, fields.note,
          // we look for phone numbers only if we see at least one number in the query
          /\d/.test(words) ? fields.phone : []
        )
        _(words.split(' ')).each(word => {
          filters.push(or(allFields, '*' + word + '*'))
        })
      }
    }
  }
})

ext.point('io.ox/contacts/search/dropdown').extend({
  id: 'default',
  index: 100,
  render () {
    this.$dropdown.append(
      this.input('name', gt('Name')),
      this.address('email', gt('Email')),
      this.input('phone', gt('Phone number')),
      coreSettings.get('features/categories', false) && this.categoryInput('categories', gt('Categories')),
      this.input('business', gt('Business (Company, Department, Position)')),
      this.input('note', gt.pgettext('contact', 'Note')),
      this.input('address', gt('Address')),
      this.button()
    )
  }
})
