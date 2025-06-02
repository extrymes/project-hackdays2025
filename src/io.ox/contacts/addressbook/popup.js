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
import Backbone from '@/backbone'

import ox from '@/ox'
import http from '@/io.ox/core/http'
import folderAPI from '@/io.ox/core/folder/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import ListView from '@/io.ox/core/tk/list'
import * as util from '@/io.ox/contacts/util'
import api from '@/io.ox/contacts/api'
import names from '@/io.ox/contacts/names'
import collation from '@/l10n/ja_JP/io.ox/collation'
import Index from '@/io.ox/contacts/addressbook/index'
import items from '@/io.ox/contacts/addressbook/items'
import { createIcon } from '@/io.ox/core/components'
import DisposableView from '@/io.ox/backbone/views/disposable'
import resourceAPI from '@/io.ox/core/api/resource'

import yell from '@/io.ox/core/yell'
import '@/io.ox/contacts/addressbook/style.scss'

import gt from 'gettext'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import { settings } from '@/io.ox/contacts/settings'

const fields = ['yomiLastName', 'yomiFirstName', 'last_name', 'first_name', 'nickname', 'display_name']
const addressFieldNames = ['email1', 'email2', 'email3', 'mailaddress']

// limits
const LIMITS = {
  departments: settings.get('picker/limits/departments', 100),
  fetch: settings.get('picker/limits/fetch', 10000),
  labels: settings.get('picker/limits/labels', 1000),
  more: settings.get('picker/limits/more', 100),
  render: settings.get('picker/limits/list', 100),
  search: settings.get('picker/limits/search', 50)
}

// special folder id
const collectedId = mailSettings.get('contactCollectFolder', 0)

// split words
const regSplitWords = /[\s,.\-:;<>()_@/'"]/
// '

// feature toggles
const useInitials = settings.get('picker/useInitials', true)
const useInitialsColor = useInitials && settings.get('picker/useInitialsColor', true)
const useLabels = settings.get('picker/useLabels', false)
const closeOnDoubleClick = settings.get('picker/closeOnDoubleClick', true)
const useDepartments = settings.get('picker/departments', true)
if (useDepartments) fields.push('department', 'company')

//
// Build a search index
//

const buildIndex = (function () {
  const fieldsWithEmail = fields.concat('email')

  return function (list) {
    const index = {}
    list.forEach(function (item) {
      const words = getWords(item)
      firstLevel(index, words, item.cid)
    })
    return index
  }

  function getWords (item) {
    const words = []
    fieldsWithEmail.forEach(function (name) {
      const value = item[name]
      if (typeof value === 'string' && value.length) words.push(value)
    })
    return Index.normalize(words.join(' ')).split(regSplitWords)
  }

  function firstLevel (index, words, id) {
    // first char
    words.forEach(function (word) {
      const key = word.substr(0, 1)
      if (!key) return
      const node = (index[key] = index[key] || {})
      secondLevel(node, word, id)
    })
  }

  function secondLevel (index, word, id) {
    const key = word.substr(0, 2)
    const node = (index[key] = index[key] || {})
    thirdLevel(node, word, id)
  }

  function thirdLevel (index, word, id) {
    const node = (index[word] = index[word] || {})
    node[id] = true
  }
}())

//
// Search index
//

const searchIndex = (function () {
  function traverse (index, query, level) {
    const part = query.substr(0, level)

    return _(index).reduce(function (array, node, word) {
      if (level <= 2) {
        // recursion until third level; check partial query
        return word.indexOf(part) === 0
          ? array.concat(traverse(node, query, level + 1))
          : array
      }
      // leaf node; return IDs
      return word.indexOf(query) === 0
        ? array.concat(_(node).keys())
        : array
    }, [])
  }

  return function (index, query) {
    // query must be string
    if (typeof query !== 'string' || !query.length) return []
    query = Index.normalize(query)
    // traverse over index
    return _(traverse(index, query, 1).sort()).uniq(true)
  }
}())

//
// Get all mail addresses (except collected addresses)
//

function fetchResources ({ useGABOnly = false, hideResources = false }) {
  if (useGABOnly || hideResources) return Promise.resolve([])
  if (cachedResponse?.resources.length) return Promise.resolve(cachedResponse.resources)

  return resourceAPI.search('*')
}

const informUserOnce = _.once(function (limit) {
  yell('warning', gt('This dialog is limited to %1$d entries and your address book exceeds this limitation. Therefore, some entries are not listed.', limit))
})

function fetchContacts (options) {
  if (options.onlyResources) return Promise.resolve([])
  if (cachedResponse?.contacts.length) return Promise.resolve(cachedResponse.contacts)
  options = {
    // keep this list really small for good performance!
    columns: '1,20,500,501,502,505,515,519,524,555,556,557,569,592,602,606,616,617',
    limit: LIMITS.fetch,
    fetchDistributionLists: true,
    ...options
  }

  const data = {}

  if (options.folder === 'all') delete options.folder
  if (options.useGABOnly) data.folders = [util.getGabId()]
  return http.PUT({
    module: 'addressbooks',
    params: {
      action: 'advancedSearch',
      columns: options.columns,
      right_hand_limit: options.limit,
      sort: 608,
      order: 'desc'
    },
    // emailAutoComplete doesn't work; need to clean up client-side anyway
    data
  }).then(function (contacts) {
    if (contacts && contacts.length === options.limit) informUserOnce(options.limit)
    if (options.fetchDistributionLists) return contacts
    return contacts.filter(item => !item.distribution_list)
  })
}

function fetchLabels () {
  if (cachedResponse?.labels.length) return Promise.resolve(cachedResponse.labels)
  if (!useLabels) return Promise.resolve([])
  return http.GET({
    module: 'labels',
    params: {
      action: 'all',
      module: 'contacts',
      members: true,
      start: 0,
      limit: LIMITS.labels
    }
  })
}

function processContacts (contacts, opt) {
  return contacts.map(function (contact, contactsIndex) {
    // remove quotes from display name (common in collected addresses)
    contact.display_name = getDisplayName(contact.display_name)
    // distribution list?
    if (contact.mark_as_distributionlist) {
      if (!contact.distribution_list) return undefined
      // get a match for the entire list
      const address = contact.distribution_list.filter(distributionListContact => distributionListContact.mail)
        .map(distributionListContact => $.trim(distributionListContact.mail).toLowerCase())
        .join(', ')
      // overwrite last name to get a nicer full name
      contact.last_name = contact.display_name
      const processedDistributionList = processContact(contact, [contact.display_name], address, 0, contactsIndex)
      processedDistributionList.full_name_html += ` <span class="gray">${gt('Distribution list')}</span>`
      if (processedDistributionList) return processedDistributionList
    } else {
      const sortNames = []
      // get sort name
      fields.forEach(function (name) {
        // use diplay name as fallback only, to avoid inconsistencies
        // example if we would not do this: yomiLastname: a => sort_name: a, lastname: a => sortname: a_a, reason behind this is that for yomi no display name is created
        if (name === 'display_name' && sortNames.length) return
        if (contact[name]) sortNames.push(contact[name])
      })
      const fieldNames = opt.useGABOnly ? ['email1'] : addressFieldNames
      // get a match for each address
      return fieldNames.map(function (field, addressIndex) {
        const processedContact = processContact(contact, sortNames, (contact[field] || '').toLowerCase(), contactsIndex, addressIndex, field)
        if (processedContact) return processedContact
        return undefined
      })
    }
    return undefined
  }).flat().filter(contact => !!contact)
}

function processLists (contact) {
  // avoid needless model display name lookups/redraws after 'select' (bug 51755)
  if (!contact.mark_as_distributionlist) return false
  return contact.distribution_list.map(listitem => {
    return { ...listitem, mail_full_name: util.getMailFullName(listitem) }
  })
}

function processContact (contact, sortNames, address, rank, index, field) {
  // skip if empty
  address = $.trim(address)
  if (!address) return
  // drop no-reply addresses
  if (/^(noreply|no-reply|do-not-reply)@/.test(address)) return
  // drop broken imports
  if (/^=\?iso-8859-1\?q\?=22/i.test(contact.display_name)) return
  // add to results
  // do all calculations now; during rendering is more expensive
  const folderId = String(contact.folder_id)
  const department = (useDepartments && folderId === util.getGabId() && $.trim(contact.department)) || ''
  const company = (useDepartments && $.trim(contact.company)) || ''
  const fullName = names.getFullName(contact)
  const initials = util.getInitials(contact)
  return {
    caption: address,
    cid: `${contact.folder_id}.${contact.id}.${index}`,
    company,
    department,
    display_name: contact.display_name,
    email: address,
    field,
    first_name: contact.first_name,
    folder_id: folderId,
    full_name: fullName,
    full_name_html: names.getFullName(contact, { formatAsHTML: true }),
    // util.getFullName(item, true),
    image: util.getImage(contact) || (!useInitials && api.getFallbackImage()),
    id: String(contact.id),
    initials: useInitials && initials,
    initials_color: util.getInitialsColor(useInitialsColor && initials),
    keywords: Index.normalize(`${fullName} ${address} ${department}`),
    last_name: contact.last_name,
    list: processLists(contact),
    mail_full_name: names.getMailFullName(contact),
    // all lower-case to be case-insensitive; replace spaces to better match server-side collation
    sort_name: sortNames.concat(address).join('_').toLowerCase().replace(/\s/g, '_'),
    // allow sorters to have special handling for sortnames and addresses
    sort_name_without_mail: sortNames.join('_').toLowerCase().replace(/\s/g, '_'),
    title: contact.title,
    rank: 1000 + ((folderId === util.getGabId() ? 10 : 0) + rank) * 10 + index,
    user_id: contact.internal_userid
  }
}

function getDisplayName (str) {
  return $.trim(str).replace(/^["']+|["']+$/g, '')
}

function processResources (resources, { hideResources = false, resourceFolderIds = [] }) {
  if (hideResources) return []
  return resources.map((resource, index) => {
    return {
      ...resource,
      folder_id: 'cal://0/resource',
      type: 3,
      caption: resource.mailaddress.toLowerCase(),
      cid: `cal://0/resource${resource.id}`,
      sort_name: resource.display_name.toLowerCase().replace(/\s/g, '_'),
      initials: useInitials && util.getInitials(resource),
      keywords: Index.normalize(`${util.getFullName(resource)}, ${resource.mailaddress}`),
      image: api.getFallbackImage('resource'),
      full_name: util.getFullName(resource),
      full_name_html: names.getFullName(resource, { formatAsHTML: true }),
      email: resource.mailaddress,
      sort_name_without_mail: resource.display_name.toLowerCase().replace(/\s/g, '_'),
      mail_full_name: names.getMailFullName(resource)
    }
  }).filter(resource => !resourceFolderIds.find(item => item === resource.id))
}

function processLabels (labels) {
  return labels.map(function (label, index) {
    // translate into array of object
    label.members = label.members
      .map(function (member) {
        return {
          display_name: util.getMailFullName(member),
          id: member.id,
          folder_id: member.folder_id,
          email: $.trim(member.email1 || member.email2 || member.email3).toLowerCase()
        }
      })
      .filter(member => !!member.email)

    // drop empty groups
    if (!label.members.length) return undefined

    label.display_name = String(label.title)

    const fullName = util.getFullName(label).toLowerCase()
    const addresses = label.members.map(member => member.email).join(', ')

    label = {
      caption: label.members.map(member => member.display_name).join(', '),
      cid: `virtual/label.${label.id}.${index}`,
      display_name: label.display_name,
      email: addresses,
      first_name: '',
      folder_id: 'virtual/label',
      full_name: fullName,
      full_name_html: util.getFullName(label, true),
      image: '',
      id: String(label.id),
      initials: '',
      initials_color: '',
      keywords: Index.normalize(fullName + ' ' + addresses),
      label: label.members,
      last_name: '',
      mail_full_name: util.getMailFullName(label),
      // all lower-case to be case-insensitive; replace spaces to better match server-side collation
      sort_name: label.display_name.toLowerCase().replace(/\s/g, '_'),
      title: label.title,
      rank: index
    }
    return label
  }).filter(label => !!label)
}

async function getAllMailAddresses (options = {}) {
  const [contacts, labels, resources] = await Promise.all([
    fetchContacts(options),
    fetchLabels(),
    fetchResources(options)
  ])
  const processedResults = []
  if (contacts.length) processedResults.push(processContacts(contacts, options))
  if (resources.length) processedResults.push(processResources(resources, options))
  if (useLabels) processedResults.push(processLabels(labels[0]))
  cachedResponse = { contacts, labels, resources }
  const hash = {}
  const items = processedResults.flat()
  items.forEach(contact => { hash[contact.cid] = contact })
  if (ox.debug) console.log('processAddresses: ', { items, hash, index: buildIndex(items) })
  return { items, hash, index: buildIndex(items) }
}

//
// Sorter for use_count and sort_name
//
const sorter = (function () {
  if (_.device('ja_JP')) return collation.sorterWithMail

  return function sorter (a, b) {
    // asc with locale compare
    return a.sort_name.localeCompare(b.sort_name)
  }
}())

function rankSorter (a, b) {
  return a.rank - b.rank
}

//
// Match all words
//
function matchAllWords (list, words) {
  if (_.isEmpty(words)) return list
  return _(list).filter(function (item) {
    return _(words).every(function (word) {
      word = Index.normalize(word)
      return item.keywords.indexOf(word) > -1
    })
  })
}

//
// Open dialog
//

let isOpen = false; let cachedResponse = null; let folder = 'all'

// clear cache on address book changes
api.on('create update delete import', function () {
  cachedResponse = null
})

const sections = {
  private: gt('My address books'),
  public: gt('Public address books'),
  shared: gt('Shared address books'),
  resources: gt('Resources')
}

function open (callback, options) {
  options = _.extend({
    build: _.noop,
    // cSpell:disable-next-line
    // #. Context: Add selected contacts; German "Auswählen", for example
    button: gt.pgettext('select-contacts', 'Select'),
    enter: false,
    focus: '.search-field',
    point: 'io.ox/contacts/addressbook-popup',
    help: 'ox.appsuite.user.sect.contacts.useaddressbook.html',
    title: gt('Select contacts'),
    useGABOnly: false,
    useCache: true
  }, options)

  if (options.useGABOnly) folder = 'folder/' + util.getGabId()

  // avoid parallel popups
  if (isOpen) return
  isOpen = true

  return new ModalDialog(options)
    .inject({
      renderFolders (folders) {
        if (this.options.onlyResources) return
        const $dropdown = this.$('.folder-dropdown')
        const useGABOnly = this.options.useGABOnly
        let count = 0

        if (this.options.useGABOnly) {
          folders = _.pick(folders, 'public')
        }
        const optgroups = Object.entries(folders)
          .filter(([sectionId, section]) => {
            // remove unsubscribed folders
            section = _(section).where({ subscribed: true })
            // skip empty and (strange) almost empty folders
            return sections[sectionId] && section.length && section[0].id && section[0].title
          })
          .map(([sectionId, section]) => {
            count += section.length
            const options = section
              .filter(folder => !useGABOnly || folder.id === util.getGabId())
              .map(folder => $('<option>').val('folder/' + folder.id).text(folder.title))

            return $('<optgroup>').attr('label', sections[sectionId]).append(options)
          })
        $dropdown.append(optgroups)

        if (count > 1) $dropdown.removeClass('invisible')
      },
      renderDepartments (result) {
        const departments = this.getDepartments(result.items)
        if (!departments.length) return
        this.$('.folder-dropdown')
          .append(
            $('<optgroup>').attr('label', gt('Departments')).append(
              departments.map(function (item) {
                return $('<option>').val('department/' + item.name).text(item.name)
              })
            )
          )
        // finally set current folder
          .val(folder)
      },
      getDepartments (items) {
        const departments = {}
        _(items).each(function (item) {
          if (!item.department || item.department.length <= 1) return
          departments[item.department] = (departments[item.department] || 0) + 1
        })
        return _(departments)
          .chain()
          .map(function (count, name) {
            return { name, count }
          })
        // limit to largest departments; then sort by name
          .sortBy('count').reverse().first(LIMITS.departments).sortBy('name').value()
      },
      onChangeFolder () {
        this.folder = folder = this.$('.folder-dropdown').val() || 'all'
        this.lastJSON = null
        this.search(this.$('.search-field').val())
      }
    })
    .extend({
      addClass () {
        this.$el.addClass('addressbook-popup')
      },
      header () {
        this.$('.modal-header').append(
          $('<div class="row">').append(
            $('<div class="col-xs-6">').append(
              $('<input type="text" class="form-control search-field">')
                .attr('placeholder', gt('Search'))
                .attr('aria-label', gt('Search'))
            ),
            $('<div class="col-xs-6">').append(
              $('<select class="form-control folder-dropdown invisible">').append(
                this.options.useGABOnly ? $() : $('<option value="all">').text(gt('All address books')),
                this.options.useGABOnly || useLabels ? $() : $('<option value="all_lists">').text(gt('All distribution lists')),
                useLabels ? $('<option value="all_labels">').text(gt('All groups')) : $(),
                this.options.hideResources ? $() : $('<option value="folder/cal://0/resource">').text(gt('All resources'))
              ).attr('aria-label', gt('Apply filter')).val(folder)
            )
          )
        )

        this.defFolder = folderAPI.flat({ module: 'contacts' }).done(folders => {
          // inject resources section with "virtual" folder for all resources
          this.renderFolders(folders)
        })
        this.defAddresses = $.Deferred()
        $.when(this.defAddresses, this.defFolder).done((addresses, folders) => {
          this.renderDepartments(addresses, folders)
        })

        this.folder = folder
        this.$('.folder-dropdown').on('change', $.proxy(this.onChangeFolder, this))
      },
      list () {
        // we just use a ListView to get its selection support
        // the collection is just a dummy; rendering is done
        // via templates to have maximum performance for
        // the find-as-you-type feature
        this.listView = new ListView({
          collection: new Backbone.Collection(),
          pagination: false,
          ref: 'io.ox/contacts/addressbook-popup/list',
          selection: this.options.selection || { behavior: 'simple' }
        })
        this.$body.append(this.listView.render().$el.addClass('address-picker'))
      },
      onOpen () {
        // hide body initially / add busy animation
        this.busy(true)

        function success (response) {
          if (this.disposed) return
          this.items = response.items.sort(sorter)
          this.store.setHash(response.hash)
          this.index = response.index
          this.search('')
          this.idle()
          this.defAddresses.resolve(response)
        }

        function fail (e) {
          // remove animation but block form
          if (this.disposed) return
          this.idle().disableFormElements()
          console.error(e)
        }

        this.on('open', () => {
          _.defer(() => {
            if (this.options.useGABOnly) cachedResponse = null
            getAllMailAddresses({
              useGABOnly: this.options.useGABOnly,
              onlyResources: this.options.onlyResources,
              hideResources: this.options.hideResources,
              resourceFolderIds: this.options.resourceFolderIds
            }).then(success.bind(this), fail.bind(this))
          })
        })
      },
      search () {
        this.search = function (query) {
          query = $.trim(query)
          let result; const isSearch = query.length && query !== '@'
          if (isSearch) {
            result = search(query, this.index, this.store.getHash())
            // render
            const json = JSON.stringify(result)
            if (json === this.lastJSON) return
            this.lastJSON = json
          } else {
            result = this.items
            this.lastJSON = null
          }
          // apply folder-based filter
          const folder = this.folder
          result = _(result).filter(function (item) {
            if (folder === 'all') return item.folder_id !== collectedId
            if (folder === 'all_lists') return item.list
            if (folder === 'all_labels') return item.label
            if (/^folder\//.test(folder)) return item.folder_id === folder.substr(7)
            if (/^department\//.test(folder)) return item.department === folder.substr(11)
            return false
          })
          // render
          this.renderItems(result, { isSearch })
        }
      },
      tokenview () {
        this.tokenview = new TokenView({ useLabels })
        // handle remove
        this.tokenview.on('remove', function (cid) {
          // remove selected (non-visible)
          // TODO: use custom global events
          this.store.remove(cid)
          // remove selected (visible)
          const selection = this.listView.selection
          selection.uncheck(selection.getNode(cid))
          selection.triggerChange()
        }.bind(this))
        // handle clear
        this.tokenview.on('clear', function () {
          this.store.clear()
          this.listView.selection.clear()
          this.listView.selection.triggerChange()
        }.bind(this))
      },
      store () {
        this.store = createStore()
        this.listenTo(this.listView, 'selection:clear', this.store.clear)
        this.listenTo(this.listView, 'selection:add', this.store.add)
        this.listenTo(this.listView, 'selection:remove', this.store.remove)

        function createStore () {
          let hash = {}; let selection = {}
          return {
            setHash (data) {
              // full data
              hash = data
            },
            getHash () {
              return hash
            },
            add (list) {
              _(list).each(function (id) { selection[id] = true })
            },
            remove (list) {
              list = [].concat(list)
              _(list).each(function (id) {
                delete selection[id]
              })
            },
            clear () {
              selection = {}
            },
            getIds () {
              return _(selection).keys()
            },
            get () {
              return _(selection)
                .chain()
                .keys()
                .map(function (cid) { return hash[cid] }, this)
                .compact()
                .value()
            },
            resolve (cid) {
              return hash[cid]
            }
          }
        }
      },
      footer () {
        this.$('.modal-footer').prepend(
          this.tokenview.$el
        )
      },
      onInput () {
        const view = this
        const onInput = _.debounce(function () {
          view.search($(this).val())
        }, 100)
        this.$('.search-field').on('input', onInput)
      },
      onCursorDown () {
        this.$('.search-field').on('keydown', function (e) {
          if (!(e.which === 40 || e.which === 13)) return
          this.listView.selection.focus(0)
          e.preventDefault()
        }.bind(this))
      },
      onDoubleClick () {
        if (!closeOnDoubleClick) return
        this.$('.list-view').on('dblclick', '.list-item', function (e) {
          // emulate a third click
          // as users expect this one to be part of the selection (dialog also closes)
          if (!$(e.currentTarget).hasClass('selected')) this.listView.selection.onClick(e)
          this.trigger('select')
          this.close()
        }.bind(this))
      },
      onEscape () {
        this.$('.list-view').on('keydown', function (e) {
          if (e.which !== 27) return
          e.preventDefault()
          this.$('.search-field').focus()
        }.bind(this))
      },
      onSelectionChange () {
        if (!this.tokenview) return

        this.listenTo(this.listView, 'selection:change', function () {
          const list = this.store.get()
          // pick relevant values
          this.tokenview.render(_.map(list, function (obj) {
            return {
              title: obj.list ? obj.display_name + ' - ' + gt('Distribution list') : obj.email,
              cid: obj.cid,
              dist_list_length: obj.list ? obj.list.length : undefined
            }
          }))

          if (!list.length) return

          // adjust scrollTop to avoid overlapping of last item (bug 49035)
          const focus = this.listView.$('.list-item:focus')
          if (!focus.hasClass('selected')) return

          const itemHeight = focus.outerHeight()
          const bottom = focus.position().top + itemHeight
          const height = this.listView.$el.outerHeight()

          if (bottom > height) this.listView.el.scrollTop += bottom - height
        }.bind(this))
      }
    })
    .build(function () {
      const self = this

      this.$el.on('appear', items.onAppear)

      this.renderItems = (list, options) => {
        options.renderEmpty = this.renderEmpty.bind(this, options)
        renderItems.call(this.$('.list-view'), list, options)
        // restore selection
        const ids = this.store.getIds()
        this.listView.selection.set(ids)
      }

      this.renderEmpty = function (options) {
        const $el = this.$('.list-view')
        $el[0].innerHTML = ''
        $el.append(
          $('<div class="notification">').text(
            options.isSearch ? gt('No matching items found.') : gt('Empty')
          )
        )
      }

      this.renderMoreItems = function () {
        const data = $list.data(); const options = data.options
        if (options.limit >= data.list.length) return
        options.offset = options.limit
        options.limit = options.limit + LIMITS.more
        this.renderItems(data.list, options)
      }

      let $list = $()

      const onScroll = _.debounce(function () {
        const height = $list.outerHeight()
        const scrollTop = $list[0].scrollTop
        const scrollHeight = $list[0].scrollHeight
        const bottom = scrollTop + height

        if (bottom / scrollHeight < 0.80) return

        const defer = window.requestAnimationFrame || window.setTimeout
        defer(this.renderMoreItems.bind(this))
      }, 50)

      this.on('open', function () {
        $list = this.$('.list-view')
        $list.on('scroll', $.proxy(onScroll, this))
      })

      this.resolveItems = function (ids) {
        return resolveItems(this.store.getHash(), ids)
      }

      this.flattenItems = function (ids, options) {
        options = options || {}
        if (options.yellOmitted) {
          self.omittedContacts = []
          const items = flatten(this.resolveItems(ids))
          util.validateDistributionList(self.omittedContacts)
          delete self.omittedContacts
          return items
        }
        return flatten(this.resolveItems(ids))
      }

      function flatten (list) {
        return _(list)
          .chain()
          .filter(function (item) {
            if (self.omittedContacts !== undefined && !item.list && !(item.mail || item.email)) self.omittedContacts.push(item)
            // only distribution lists and items with a mail address
            return (item.list || item.label) || (item.mail || item.email || item.mailaddress)
          })
          .map(function (item) {
            if (item.list || item.label) return flatten(item.list || item.label)
            const name = item.mail_full_name; const mail = item.mail || item.email
            return {
              array: [name || null, mail || null],
              display_name: name,
              id: item.id,
              folder_id: item.folder_id,
              email: mail,
              mailaddress: mail,
              // mail_field is used in distribution lists
              field: item.mail_field ? 'email' + item.mail_field : item.field,
              user_id: item.user_id,
              type: item.type || undefined,
              description: item.description || undefined,
              // resource permissions
              own_privilege: item.own_privilege || undefined,
              permissions: item.permissions || undefined
            }
          })
          .flatten()
          .uniq(function (item) { return item.email })
          .value()
      }
    })
    .build(options.build)
    .on({
      close () {
        // reset folder to default
        folder = 'all'
        isOpen = false
      },
      error (e) {
        this.$body.empty().addClass('error').text(e.error || e)
      },
      select () {
        const ids = this.store.getIds()
        if (ox.debug) console.log('select', ids, this.flattenItems(ids))
        if (_.isFunction(callback)) callback(this.flattenItems(ids, { yellOmitted: true }))
      }
    })
    .addCancelButton()
    // cSpell:disable-next-line
    // #. Context: Add selected contacts; German "Auswählen", for example
    .addButton({ label: options.button, action: 'select' })
    .open()
}

function search (query, index, hash, ranked) {
  // split query into single words (without leading @; covers edge-case)
  const words = query.replace(/^@/, '').split(regSplitWords)
  const firstWord = words[0]
  // use first word for the index-based lookup
  const searchIndexResult = searchIndex(index, firstWord)
  const result = resolveItems(hash, searchIndexResult).sort(ranked ? rankSorter : sorter)
  // final filter to match all words
  return matchAllWords(result, words.slice(1))
}

// keeps order
function groupBy (list, iteratee) {
  const result = []
  _(list).each(function (item, index) {
    const cid = iteratee(item, index)
    const group = this[cid] = this[cid] || []
    // when empty it was not added to result list yet
    if (!group.length) result.push(group)
    group.push(item)
  }, {})
  return result
}

function flattenBy (list, iteratee) {
  return _(list).map(function (group) {
    return _.chain(group)
      .sortBy(iteratee)
      .first()
      .value()
  })
}

function renderItems (list, options) {
  // avoid duplicates (name + email address; see bug 56040)
  list = groupBy(list, function (item) {
    // returns cid as grouping criteria
    return item.label ? _.uniqueId(item.keywords) : item.full_name + ' ' + item.email
  })
  list = flattenBy(list, function (item) {
    // returns sort order to prefer users to contacts
    return item.user_id ? -1 : 1
  })

  // get defaults
  options = _.extend({
    limit: options.isSearch ? LIMITS.search : LIMITS.render,
    offset: 0
  }, options)
  // empty?
  if (!list.length) {
    if (options.renderEmpty) options.renderEmpty(options)
  }
  this.data({ list, options })
  items.render(this, list, options.offset, options.limit)
}

function resolveItems (hash, ids) {
  return _(ids)
    .chain()
    .map(function (cid) { return hash[cid] })
    .compact()
    .value()
}

/* Debug lines

    import('@/io.ox/contacts/addressbook/popup').then(function ({ default: popup }) { popup.getAllMailAddresses().always(_.inspect); });
    import('@/io.ox/contacts/addressbook/popup').then(function ({ default: popup }) { popup.searchIndex(window.index, 'b'); })

    void import('@/io.ox/contacts/addressbook/popup').then(function ({ default: popup }) { popup.open(_.inspect); });
    */

function addToken (item, index) {
  return $('<li class="list-item selectable removable token" role="option">').attr({
    id: _.uniqueId('token'),
    'data-cid': item.cid,
    'data-index': index
  }).append(
    $('<span class="token-label">').text(item.title),
    $('<a href="#" class="token-action remove" tabindex="-1" aria-hidden="true">')
      .attr('title', gt('Remove'))
      .append(createIcon('bi/x.svg')
      )
  )
}

// TODO: core a11y
function Iterator (context) {
  function get (index) {
    return context.$list.get(index)
  }
  return {
    first () {
      return get(0)
    },
    last () {
      return get(context.$list.length - 1)
    },
    next () {
      if (context.$selected.is(':last-child')) return this.first()
      const index = this.current()
      return index < 0 ? this.first() : get(index + 1)
    },
    prev () {
      if (context.$selected.is(':first-child')) return this.last()
      const index = this.current()
      return index < 0 ? this.last() : get(index - 1)
    },
    current () {
      return context.$list.index(context.$selected)
    }
  }
}

/**
 * - summary of an externally managed selection
 * - minimal set of actions (remove single item, clear whole selection)
 * - external logic has to trigger render() on selection change
 * - external logic has to process triggered events: 'remove' and 'clear'
 */

const TokenView = DisposableView.extend({

  className: 'selection-summary',

  attributes: { role: 'region' },

  initialize (opt) {
    this.opt = _.extend({
      selector: '.addresses',
      useLabels: false
    }, opt)
    // references
    this.$list = $()
    this.$selected = $()
    // listen
    this.$el
    // a11y.js
      .on('remove', this.opt.selector, this.onRemove.bind(this))
      .on('click', '.token', this.onClick.bind(this))
      .on('click', '.remove', this.onRemove.bind(this))
      .on('click', '.clear', this.onClear.bind(this))
    // iterator
    this.iterator = Iterator(this)
  },

  getContainer () {
    return this.$(this.opt.selector)
  },

  // param: index or node
  select (node) {
    // reset old
    this.$selected
      .attr('aria-checked', false)
      .removeClass('selected')
    // set new
    this.$selected = $(node)
      .attr('aria-checked', true)
      .addClass('selected')
    // update container
    this.getContainer().attr('aria-activedescendant', this.$selected.attr('id'))
  },

  render (list) {
    const length = _(list).reduce(function (agg, item) {
      return agg + (item.dist_list_length ? item.dist_list_length : 1)
    }, 0)
    let selectionLabel; let description

    this.$el.empty()

    if (!length) {
      this.$el.hide()
      return this
    }

    // TODO: gt comment
    if (this.opt.useLabels) {
      // #. %1$d is number of selected items (addresses/groups) in the list
      selectionLabel = gt.ngettext('%1$d item selected', '%1$d items selected', length, length)
      description = gt('The selected items. Press Backspace or Delete to remove.')
    } else {
      // #. %1$d is number of selected addresses
      selectionLabel = gt.ngettext('%1$d address selected', '%1$d addresses selected', length, length)
      description = gt('The selected addresses. Press Backspace or Delete to remove.')
    }

    this.$el.append(
      // toolbar
      $('<div class="toolbar">').append(
        $('<span role="heading" aria-level="2" aria-live="polite" class="count pull-left">').text(selectionLabel),
        $('<a href="#" class="pull-right clear" role="button">').text(gt('Clear selection'))
      ),
      // list
      $('<div aria-live="polite" aria-relevant="removals">').attr('aria-label', description).append(
        $('<ul class="addresses unstyled listbox" tabindex="0" role="listbox">')
          .append(_(list).map(addToken))
      )
    )

    // update references
    this.$list = this.getContainer().children()
    // restore selection
    this.restore()
    this.$el.show()

    return this
  },

  restore () {
    let node
    if (!this.$list.length || this.$list.index(this.$selected) > -1) return
    // redraw of previously selected
    if (this.$selected.attr('data-cid')) {
      node = this.$list.filter(`[data-cid="${CSS.escape(this.$selected.attr('data-cid'))}"]`)
      if (node.length) return this.select(node)
    }
    // TODO: use memory instead of dom
    // restore index of removed token
    if (this.$selected.attr('data-index')) {
      node = this.$list.get(parseInt(this.$selected.attr('data-index'), 10))
      if (node) return this.select(node)
      return this.select(this.iterator.last())
    }
    this.select(this.iterator.first())
  },

  onClick (e) {
    e.preventDefault()
    this.select($(e.target).closest('.token'))
  },

  onRemove (e) {
    e.preventDefault()
    let node = $(e.target).closest('.token')
    if (!node || !node.length) node = this.$selected
    // propagate
    this.trigger('remove', node.attr('data-cid'))
    // restore focus after remove/render was triggered
    if (this.$list.length) this.getContainer().focus()
  },

  onClear (e) {
    e.preventDefault()
    this.trigger('clear')
  }
})

export default {
  buildIndex,
  searchIndex,
  getAllMailAddresses,
  sorter,
  onAppear: items.onAppear,
  renderItems,
  search,
  TokenView,
  open
}
