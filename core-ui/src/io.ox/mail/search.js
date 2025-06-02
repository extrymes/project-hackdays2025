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
import moment from '@open-xchange/moment'
import ext from '@/io.ox/core/extensions'
import SearchView, { appendSearchView } from '@/io.ox/backbone/views/search'
import CollectionLoader from '@/io.ox/core/api/collection-loader'
import api from '@/io.ox/mail/api'
import folderAPI from '@/io.ox/core/folder/api'
import { settings } from '@/io.ox/mail/settings'
import http from '@/io.ox/core/http'
import { isMiddlewareMinVersion } from '@/io.ox/core/util'
import gt from 'gettext'
import { addReadyListener } from '@/io.ox/core/events'
import { settings as contactSettings } from '@/io.ox/contacts/settings'

const folders = {}
const contactsQueryMinLength = Math.max(1, contactSettings.get('search/minimumQueryLength', 2))

if (api.allMessagesFolder) folders.all = gt('All folders')
if (api.allUnseenMessagesFolder) folders.unseen = gt('All unseen messages')
folders.inbox = gt('Inbox')
folders.current = gt('Current folder')

const i18n = {
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  attachments: gt.pgettext('search', 'attachments'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  flagged: gt.pgettext('search', 'flagged'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  file: gt.pgettext('search', 'file'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  year: gt.pgettext('search', 'year'),
  // #. "Search in" like "Search in folder"; appears as label above folder selection
  searchIn: gt.pgettext('search', 'Search in')
}

const searchIn = {
  current: gt('Current folder'),
  all: gt('All folders'),
  inbox: gt('Inbox')
}

const filters = [
  // id, label, prefix (fallback is label lowercase), type (optional), unique, visible
  ['to', gt('To'), '', 'string', false],
  ['from', gt('From'), '', 'string', true],
  ['subject', gt('Subject'), '', 'string', true],
  ['attachment', gt('Has attachments'), i18n.attachments, 'checkbox', true],
  ['flagged', gt('Has color flag'), i18n.flagged, 'checkbox', true],
  ['year', gt('Year'), i18n.year, 'string', true],
  ['folder', i18n.searchIn, '', 'list', true, true, searchIn]
]

let supportsAttachmentSearch = false
addReadyListener('rampup', async () => {
  // use inbox to check whether mail server supports FILENAME_SEARCH aka SEARCH=X-MIMEPART
  const inbox = await folderAPI.get('default0/INBOX')
  supportsAttachmentSearch =
    inbox?.supported_capabilities?.indexOf('FILENAME_SEARCH') > -1 ||
    settings.get('search/supports/mimepart', false)
  if (supportsAttachmentSearch) filters.push(['file', gt('Attached file'), i18n.file, 'string', true])
})

ext.point('io.ox/mail/mediator').extend({
  id: 'top-search',
  index: 10000,
  setup (app) {
    const listView = app.listView
    const collectionLoader = new CollectionLoader({
      module: 'mail',
      mode: 'search',
      getQueryParams (params) {
        const filters = []
        const criteria = params.criteria
        const from = criteria.from
        const to = criteria.to
        const subject = criteria.subject
        const year = criteria.year
        if (from) filters.push(['=', { field: 'from' }, from])
        if (to) {
          const words = to
            .split(/("[^"]+"|\S+)/)
            .map(word => word.replace(/^"(.*)"$/, '$1').trim())
            .filter(Boolean)
          words.forEach(word => {
            filters.push(['or'].concat(['to', 'cc', 'bcc'].map(field => ['=', { field }, word])))
          })
        }
        if (subject) filters.push(['=', { field: 'subject' }, subject])
        if (year) {
          const start = Date.UTC(year, 0, 1)
          const end = Date.UTC(year, 11, 31)
          filters.push(['and', ['>', { field: 'received_date' }, String(start)], ['<', { field: 'received_date' }, String(end)]])
        }
        if (criteria.addresses) {
          _(criteria.addresses.split(' ')).each(function (word) {
            filters.push(['or'].concat(['from', 'to', 'cc', 'bcc'].map(field => ['=', { field }, word])))
          })
        }
        if (criteria.words) {
          const defaultFields = String(settings.get('search/default/fields', 'from,to,cc,bcc,subject,content')).split(',')
          const includeAttachments = supportsAttachmentSearch && isMiddlewareMinVersion(8, 7) && settings.get('search/default/includeAttachments', true)
          const words = criteria.words
            .split(/("[^"]+"|\S+)/)
            .map(word => word.replace(/^"(.*)"$/, '$1').trim())
            .filter(Boolean)
          words.forEach(word => {
            const fields = ['or'].concat(defaultFields.map(field => ['=', { field }, word]))
            if (includeAttachments) {
              // support for 'text' so that we can search for attachments in one go
              // has been added with v8.7 (https://jira.open-xchange.com/browse/OXUIB-2025)
              fields.push(['=', { attachment: 'name' }, word])
              filters.push(['and', ['=', { field: 'text' }, word], fields])
            } else {
              filters.push(fields)
            }
          })
        }
        if (criteria.file && supportsAttachmentSearch) filters.push(['=', { attachment: 'name' }, criteria.file])
        if (criteria.attachment === 'true') filters.push(['=', { field: 'content_type' }, 'multipart/mixed'])
        if (criteria.after) filters.push(['>', { field: 'received_date' }, String(criteria.after)])
        if (criteria.before) filters.push(['<', { field: 'received_date' }, String(criteria.before)])
        if (criteria.flagged) filters.push(getUserFlags())
        // 32 = seen, so not 32
        if (isUnseen(criteria.folder)) filters.push(['not', ['=', { field: 'flags' }, 32]])

        function isUnseen (folder) {
          if (folder === 'unseen') return true
          return folder === 'current' && app.folder.get() === 'virtual/all-unseen'
        }

        function getFolder (folder) {
          const type = isUnseen(folder) ? 'unseen' : folder
          switch (type) {
            case 'unseen':
            case 'all': return api.allMessagesFolder
            case 'inbox': return 'default0/INBOX'
            // case 'trash':
            // case 'sent': return accountAPI.getFoldersByType(folder)[0] || app.folder.get()
            default: return app.folder.get()
          }
        }

        function getUserFlags () {
          return ['or', ['=', { field: 'flags' }, 8]]
            .concat(Array(10).fill(1).map((c, i) => ['=', { field: 'user_flags' }, '$cl_' + (i + 1)]))
        }

        return {
          action: 'search',
          folder: getFolder(criteria.folder),
          columns: http.defaultColumns.mail.search,
          sort: params.sort || '661',
          order: params.order || 'desc',
          timezone: 'utc',
          data: { filter: filters.length === 1 ? filters[0] : ['and'].concat(filters) }
        }
      },
      fetch (params) {
        return http.wait().then(function () {
          return http.PUT({
            module: 'mail',
            params: _(params).omit('data'),
            data: params.data
          })
        })
      },
      each (obj) {
        api.pool.add('detail', obj)
      },
      // Reduce performance impact, see (https://jira.open-xchange.com/browse/DOP-2955)
      PRIMARY_PAGE_SIZE: 20,
      SECONDARY_PAGE_SIZE: 100
    })

    let previousCollectionLoader
    let previousAttributes = {}
    const view = new SearchView({
      app,
      placeholder: gt('Search mail'),
      point: 'io.ox/mail/search/dropdown',
      defaults: {
        folder: api.allMessagesFolder ? 'all' : 'current',
        addresses: '',
        after: '',
        attachment: false,
        before: '',
        file: '',
        flagged: false,
        from: '',
        subject: '',
        to: '',
        words: ''
      },
      filters,
      autoSuggest ({ prefix, word, unquoted }) {
        if (prefix || word.length < contactsQueryMinLength) return []
        const list = []
        // use the unquoted version if there is one (also helps to remove strange half open quotes with a missing quote at the end)
        word = unquoted || word
        if (/^((19|20)\d\d)$/.test(word)) {
          // year
          list.push({ filter: 'year', value: word })
        } else if (/^(\d{1,2}\.\d{1,2}\.\d{2,4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{1,2}-\d{1,2})$/.test(word)) {
          // dates
          const date = moment(word, ['l', 'D.M.YYYY', 'D.M.YY', 'M/D/YYYY', 'M/D/YY', 'YYYY-M-D'], true)
          if (date.isValid()) list.push({ filter: 'after', value: word }, { filter: 'before', value: word })
        } else {
          list.push({ filter: 'from', value: word }, { filter: 'to', value: word })
        }
        list.push({ filter: 'subject', value: word })
        list.push({ filter: 'file', value: word })
        // flags
        if (i18n.attachments.startsWith(word)) {
          list.push({ filter: 'attachments', value: gt.pgettext('search', 'yes') })
        }
        if (i18n.flagged.startsWith(word)) {
          list.push({ filter: 'flagged', value: gt.pgettext('search', 'yes') })
        }
        return list
      }
    })
      .on('before:show', () => $('#io-ox-topsearch .search-container.search-view').hide())
      .on('search', async function (criteria) {
        if (_.device('smartphone')) await app.pages.changePage('listView')
        if (!previousCollectionLoader) {
          previousCollectionLoader = listView.loader
          previousAttributes = listView.model.pick('thread', 'sort', 'order')
        }
        listView.connect(collectionLoader)
        listView.model.set({ criteria, thread: false, sort: 661, order: 'desc' })
      })
      .on('cancel', function () {
        listView.connect(previousCollectionLoader)
        listView.model.set(previousAttributes, { silent: true }).unset('criteria')
        previousCollectionLoader = null
      })

    appendSearchView({ app, view })
  }
})

ext.point('io.ox/mail/search/dropdown').extend({
  id: 'default',
  index: 100,
  render () {
    this.$dropdown.append(
      this.select('folder', gt('Search in'), SearchView.convertOptions(folders)),
      this.address('from', gt('From')),
      this.address('to', gt('To')),
      this.input('subject', gt('Subject')),
      // #. Context: mail search. Label for <input>.
      this.input('words', gt('Contains words')),
      supportsAttachmentSearch ? this.input('file', gt('Attachment name')) : $(),
      this.dateRange({ mandatoryAfter: false, mandatoryBefore: false }),
      // #. Context: mail search. Label for checkbox.
      this.checkbox('attachment', gt('Has attachments')),
      this.checkbox('flagged', settings.flagByColor ? gt('Has color flag') : gt('Flagged messages')),
      this.button()
    )
  }
})
