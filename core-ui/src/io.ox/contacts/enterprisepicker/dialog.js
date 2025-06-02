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
import ModalDialog from '@/io.ox/backbone/views/modal'
import DetailPopup from '@/io.ox/backbone/views/popup'
import Mini from '@/io.ox/backbone/mini-views/common'
import DisposableView from '@/io.ox/backbone/views/disposable'
import contactsAPI from '@/io.ox/contacts/api'
import folderAPI from '@/io.ox/core/folder/api'
import resourceAPI from '@/io.ox/core/api/resource'
import contactDetailView from '@/io.ox/contacts/view-detail'
import ext from '@/io.ox/core/extensions'
import * as contactsUtil from '@/io.ox/contacts/util'
import yell from '@/io.ox/core/yell'
import http from '@/io.ox/core/http'
import a11y from '@/io.ox/core/a11y'

import { createIcon } from '@/io.ox/core/components'

import { settings as contactsSettings } from '@/io.ox/contacts/settings'

import gt from 'gettext'

import '@/io.ox/contacts/enterprisepicker/style.scss'

// for convenience, so we only have to change one line
const columns = '20,1,101,500,501,502,505,519,520,521,522,524,542,543,547,548,549,551,552,553,555,556,557,569,592,602,606,607,616,617,5,2'
// max shown results
const limit = contactsSettings.get('enterprisePicker/limit', 100)
// use function to not accidentally modify this
const getDefaultParams = () => {
  return {
    right_hand_limit: limit,
    omitFolder: true,
    folderTypes: { includeUnsubscribed: true, pickerOnly: contactsSettings.get('enterprisePicker/useUsedInPickerFlag', true) },
    columns,
    names: 'on',
    phones: 'on',
    job: 'on'
  }
}

// function to filter empty contacts
const contactsFilter = contact => {
  // consider only spaces as empty
  const check = attr => contact[attr]?.trim()

  // needs a name and some kind of contact information
  return (check('first_name') || check('last_name') || check('display_name')) && (
    check('email1') ||
    check('email2') ||
    check('email3') ||
    check('mail') ||
    check('room_number') ||
    check('telephone_business1') ||
    check('telephone_company') ||
    check('cellular_telephone1') ||
    check('telephone_business2') ||
    check('cellular_telephone2') ||
    check('telephone_home1') ||
    check('telephone_home2') ||
    check('telephone_other') ||
    // allow distribution lists if not empty
    (contact.mark_as_distributionlist && contact.distribution_list && contact.distribution_list.length))
}

const sectionLabels = {
  private: gt('My address lists'),
  public: gt('Public address lists'),
  shared: gt('Shared address lists')
}

let detailViewDialog, pickerDialog

const SelectedContactsView = DisposableView.extend({

  tagName: 'div',
  className: 'selected-contacts-view',

  events: {
    'click button': 'removeContact'
  },

  initialize () {
    this.model.get('selectedContacts').on('add reset remove', this.render.bind(this))
  },

  dispose () {
    this.model.get('selectedContacts').off('add reset remove')
  },

  render () {
    const length = this.model.get('selectedContacts').length

    this.$el.empty().toggleClass('empty', length === 0)
    if (length === 0) return this
    const guid = _.uniqueId('selected-contacts-list-label-')
    const node = $('<ul class="list-unstyled" role="list">').attr('aria-describedby', guid)

    // #. %1$d is number of selected contacts
    this.$el.append($('<div>').attr('id', guid).text(gt.ngettext('%1$d contact selected', '%1$d contacts selected', length, length)), node)
    this.model.get('selectedContacts').each(contact => {
      node.append(
        $('<li role="listitem">').append(
          $('<div class="name">').append(contactsUtil.getFullName(contact.attributes, true) + (contact.get('mark_as_distributionlist') ? ' - ' + gt('Distribution list') : '')),
          $('<button class="btn">').attr({
            'data-id': contact.get('id'),
            'aria-label': gt('Remove contact from selection')
          }).append(createIcon('bi/x.svg').attr('title', gt('Remove contact from selection')))
        )
      )
    })

    return this
  },

  removeContact (e) {
    e.stopPropagation()
    const selectedContacts = this.model.get('selectedContacts')
    const model = selectedContacts.get(e.currentTarget.getAttribute('data-id'))
    if (!model) return
    // try to find the next focussable item
    let nextIndex = selectedContacts.models.indexOf(model)
    // reduce by one if it's the last
    if ((nextIndex + 1) === selectedContacts.size()) nextIndex--
    selectedContacts.remove(model)
    const nextNode = this.$el.find('button')[nextIndex]
    // we found a node. focus it
    if (nextNode) return $(nextNode).focus()
    // focus list as fallback
    a11y.getTabbable(this.$el.siblings('.modal-body')).first()?.focus()
  }
})

const ContactListView = DisposableView.extend({

  tagName: 'ul',
  className: 'contact-list-view list-unstyled f6-target',

  events: {
    'click li': 'updateSelection',
    'dblclick li': 'quickSelection',
    'click .show-details': 'openDetailView',
    'keydown .show-details-descendant': 'openDetailView'
  },

  initialize (options) {
    this.options = options
    this.model.get('contacts').on('add reset remove', this.render.bind(this))
    this.model.get('selectedContacts').on('add reset remove', this.updateCheckboxes.bind(this))
    this.$el.on('keydown', this.onKeydown.bind(this))
    // super special button used for active descendant magic
    this.showDetailsButton = $('<button class="sr-only show-details-descendant" role="button">')
  },

  dispose () {
    this.model.get('contacts').off('add reset remove')
    this.model.get('selectedContacts').off('add reset remove')
  },

  renderContact (contact) {
    const isResource = contact.get('type') === 'resource'

    // don'render contacts that are not allowed (can happen with last searched contacts since those may not be users)
    if ((this.options.useGABOnly && (isResource || !contact.get('internal_userid'))) || (isResource && this.options.hideResources)) return

    const name = contactsUtil.getFullName(contact.attributes, true)
    const initials = contactsUtil.getInitials(contact.attributes)
    const canSelect = this.options.selection.behavior !== 'none'
    const mail = contactsUtil.getMail(contact.attributes)
    const departmentLabel = isResource ? gt('Resource') : (contact.get('mark_as_distributionlist') ? gt('Distribution list') : contact.get('department'))
    // try to find a phone number, there are still more phone number fields. Not sure if we need all
    const phone = contact.get('telephone_business1') ||
                  contact.get('telephone_business2') ||
                  contact.get('telephone_company') ||
                  contact.get('cellular_telephone1') ||
                  contact.get('cellular_telephone2') ||
                  contact.get('telephone_home1') ||
                  contact.get('telephone_home2') ||
                  contact.get('telephone_other')
    let contactPicture
    const label = _([contactsUtil.getFullName(contact.attributes, false),
      contact.get('mark_as_distributionlist') ? gt('Distribution list') : '',
      // #. %1$s name of the department a contact is working in
      contact.get('department') ? gt('department %1$s', contact.get('department')) : '',
      // #. %1$s job position of a contact, CEO, working student etc
      contact.get('position') ? gt('position %1$s', contact.get('position')) : '',
      // #. %1$s mail address of a contact
      mail ? gt('email address %1$s', mail) : '',
      // #. %1$s phone number of a contact
      phone ? gt('phone number %1$s', phone) : '',
      // #. %1$s room number of a contact
      contact.get('room_number') ? gt('room %1$s', contact.get('room_number')) : '']).compact().join(', ')

    const node = $('<li role="option">').attr({
      'data-id': contact.get('id'),
      // used for activedescendant
      id: `${this.cid}-${isResource ? 'resource' : 'contact'}-${contact.get('id')}`,
      role: canSelect ? 'option' : 'listitem',
      'aria-label': label
    }).append(
      $('<div class="flex-container multi-item-container">').append(
        this.options.selection.behavior === 'multiple' ? $('<div class="checkmark">').append(createIcon('bi/check.svg')) : '',
        (contact.get('image1_url')
          ? contactPicture = $('<i class="contact-picture" aria-hidden="true">')
            .one('appear', { url: contact.get('image1_url') ? contactsUtil.getImage(contact.attributes) : contactsAPI.getFallbackImage() }, function (e) {
              $(this).css('background-image', `url(${e.data.url})`)
            })
          : $('<div class="contact-picture initials" aria-hidden="true">').text(initials)),
        $('<div class="data-container">').append(
          $('<div class="name" aria-hidden="true">').append(name),
          $('<div class="department" aria-hidden="true">').text(departmentLabel)
        )
      ),
      $('<div class="flex-container data-container">').append(
        $('<div class="telephone" aria-hidden="true">').text(phone),
        $('<div class="position" aria-hidden="true">').text(contact.get('position'))
      ),
      $('<div class="flex-container multi-item-container details-container">').append(
        $('<div class="data-container">').append(
          $('<div class="mail" aria-hidden="true">').text(mail),
          $('<div class="room" aria-hidden="true">').text(contact.get('room_number'))
        ),
        // hidden from a11y. a button for the activedescendant is used instead
        $('<span class="show-details btn btn-link" aria-hidden="true">').append(createIcon('bi/info-circle.svg').attr('title', gt('Show contact details')))
      )
    )

    if (canSelect) node.attr('aria-selected', !!this.model.get('selectedContacts').get(contact.get('id')))

    this.$el.append(node)
    if (!contactPicture) return
    contactPicture.lazyload({ container: this.options.modalBody })
  },

  render () {
    this.$el.empty().attr({
      role: 'listbox',
      'aria-label': gt('Contact list'),
      tabindex: 0
    })

    if (this.options.selection.behavior === 'multiple') this.$el.attr('aria-multiselectable', true)

    const query = this.model.get('searchQuery').trim()
    const isLastSearched = this.model.get('selectedList') === 'all' && query === ''
    const contacts = isLastSearched ? this.model.get('lastContacts') : this.model.get('contacts')

    contacts.each(contact => this.renderContact(contact))

    if (isLastSearched && this.$el.children().length > 0) {
      // #. This is followed by a list of contacts from the address book
      this.$el.prepend($('<div class="list-label">').text(gt('Last searched for')))
    }

    if (query !== '' && this.$el.children().length === 0) {
      this.$el.prepend($('<div class="list-label">').text(gt('No contacts found.')))
    }

    if (contacts.length && contacts.length >= limit) {
      this.$el.append($('<div class="alert alert-info list-label limit-warning">')
        // #. %1$d is the limit of displayable contacts
        .text(gt('You have reached the limit of %1$d contacts to display. Please enter a search term to narrow down your results.', limit)))
    }

    this.moveSelection(this.$el.find('li').first().attr('id'))

    return this
  },

  onKeydown (e) {
    const $list = this.$el
    const active = $('#' + $list.attr('aria-activedescendant'))

    // ENTER/SPACE
    if (/^(13|32)$/.test(e.which)) {
      e.preventDefault()
      e.stopPropagation()
      return this.updateSelection({ currentTarget: active[0] })
    }

    // ARROW KEYS
    if (/^(37|38|39|40)$/.test(e.which)) {
      e.preventDefault()
      e.stopPropagation()
      const li = $list.children('li')
      let next = (/39|40/.test(e.which)) ? active.next('li') : active.prev('li')
      const wrap = (/39|40/.test(e.which)) ? li.first() : li.last()

      if (!next.length) next = wrap
      return this.moveSelection(next.attr('id'))
    }
  },

  // moves active descendant
  moveSelection (id) {
    const li = this.$el.children('li')
    const next = this.$el.find(`#${id}`)
    if (next.length === 0) return

    li.removeClass('active-descendant')
    // using false here makes sure labels like "last searched for" are not scrolled out of view
    next.addClass('active-descendant')[0].scrollIntoView(false)
    this.$el.attr('aria-activedescendant', next.attr('id'))
    next.find('.show-details').append(this.showDetailsButton)
  },

  // updates selected contacts
  updateSelection (e) {
    if (this.options.selection.behavior === 'none') return

    const target = e.currentTarget
    const id = target.getAttribute('data-id')
    const model = (this.model.get('contacts').length === 0 ? this.model.get('lastContacts') : this.model.get('contacts')).get(id)

    // remove from selection
    if (this.model.get('selectedContacts').get(id)) {
      return this.model.get('selectedContacts').remove(model)
      // single selection
    } else if (this.options.selection.behavior === 'single') {
      return this.model.get('selectedContacts').reset([model])
    }
    // multi selection?
    this.model.get('selectedContacts').add(model)
  },

  // used on double click. Selects the contact and closes the dialog
  quickSelection (e) {
    if (this.options.selection.behavior === 'none') return

    const target = e.currentTarget
    const id = target.getAttribute('data-id')
    const model = (this.model.get('contacts').length === 0 ? this.model.get('lastContacts') : this.model.get('contacts')).get(id)

    // single selection or multi selection?
    if (this.options.selection.behavior === 'single') {
      this.model.get('selectedContacts').reset([model])
    } else {
      this.model.get('selectedContacts').add(model)
    }

    if (this.options.dialog) this.options.dialog.invokeAction('select')
  },

  openDetailView (e) {
    // space or enter? use normal onKeydown
    if (e.type === 'keydown' && !/^(13|32)$/.test(e.which)) {
      // focus footer buttons on tab
      if (this.options.selection.behavior !== 'none' && e.which === 9 && !e.shiftKey) {
        e.stopPropagation()
        e.preventDefault()
        const nextNode = this.model.get('selectedContacts').length > 0 ? this.options.dialog.$el.find('.selected-contacts-view') : this.options.dialog.$footer
        return a11y.getTabbable(nextNode).first().focus()
      }
      this.$el.focus()
      return this.onKeydown(e)
    }

    e.stopPropagation()
    e.preventDefault()
    const target = $(e.currentTarget).closest('li')
    const id = target.attr('data-id')
    const model = (this.model.get('contacts').length === 0 ? this.model.get('lastContacts') : this.model.get('contacts')).get(id)
    if (!model) return

    this.moveSelection(target.get('id'))

    if ($(e.currentTarget).hasClass('sr-only')) e.pageX = target.find('.show-details')[0].getBoundingClientRect().x

    // make sure we only have one popup open at a time
    if (detailViewDialog && detailViewDialog.close) detailViewDialog.close()
    detailViewDialog = new DetailPopup()
    detailViewDialog.snap(e)
    detailViewDialog.show().busy()
    // picker has a z index of 1050, append to body or it will always be behind the modal dialog
    detailViewDialog.$el.css('z-index', 2000).appendTo('body');
    (model.get('type') === 'resource' ? resourceAPI : contactsAPI).get({ id: model.get('id'), folder: model.get('folder_id') }).then(data => {
      detailViewDialog.idle().$body.append(contactDetailView.draw(new ext.Baton({ data })))
    }).fail(detailViewDialog.close)
  },

  updateCheckboxes () {
    // checkboxes are only dummies because of a11y (no nested inputs in a selection)
    const listEntries = this.$el.children('li')
    const ids = this.model.get('selectedContacts').map(contact => String(contact.get('id')))
    listEntries.each((index, listEntry) => {
      listEntry.ariaSelected = ids.indexOf(listEntry.getAttribute('data-id')) > -1
    })
  }
})

function createInstance (options, model) {
  const app = ox.ui.createApp({
    name: 'io.ox/contacts/enterprisepicker',
    title: gt('Global address list'),
    closable: true,
    floating: true,
    size: 'width-lg'
  })

  app.setLauncher(() => {
    const win = ox.ui.createWindow({
      name: 'io.ox/contacts/enterprisepicker',
      chromeless: true,
      floating: true,
      closable: true
    })

    app.setWindow(win)

    win.show(() => {
      win.nodes.outer.addClass('enterprise-picker')
      const headerNode = $('<div class="enterprise-picker-header">')
      const bodyNode = $('<div class="enterprise-picker-body">')
      win.nodes.main.append(headerNode, bodyNode)
      buildDialog(options, model, headerNode, win.nodes.main, bodyNode).then(() => headerNode.find('input[name="searchQuery"]').focus())
    })
  })

  app.getContextualHelp = _.constant('ox.appsuite.user.sect.contacts.useaddressdirectory.html')

  return app
}

function buildDialog (options, model, headerNode, contentNode, bodyNode) {
  bodyNode.hide()
  contentNode.busy()

  const defs = []
  const lastSearchedContacts = contactsSettings.get('enterprisePicker/lastSearchedContacts', [])

  if (!options.onlyResources) {
    defs.push(options.useGABOnly ? folderAPI.get(contactsUtil.getGabId()) : folderAPI.flat({ module: 'contacts', all: true }))

    http.pause()
    _(lastSearchedContacts).each(contact => {
      if (!contact || !contact.folder_id || !contact.id) return
      const def = $.Deferred()
      // use get request so we can sort out broken or missing contacts better, always resolve. we don't want a missing contact to break the picker
      // we have to avoid the cache or the multiple request doesn't work correctly (strange api factory async stuff)
      contactsAPI.get({ folder_id: contact.folder_id, id: contact.id }, false).always(def.resolve)
      defs.push(def)
    })
    http.resume()
  }

  return $.when.apply($, defs).then(function (folders) {
    let folderlist
    if (options.onlyResources) {
      folderlist = [{ label: false, options: [{ label: gt('Search resources'), value: 'resources' }] }]
    } else if (options.useGABOnly) {
      folderlist = [{ label: false, options: [{ label: folders.title, value: folders.id }] }]
    } else {
      folderlist = [{ label: false, options: [{ label: gt('Search all address lists'), value: 'all' }] }]
      // #. used when searching in the resource folder
      if (!options.hideResources) folderlist.push({ label: false, options: [{ label: gt('Search resources'), value: 'resources' }] })

      // flat request returns folders in sections, add them to a single array, leave out the hidden section and sharing (shared by me) section
      _(folders).each((sectionFolders, section) => {
        if (section === 'hidden' || section === 'sharing') return

        const list = _(_(sectionFolders).filter(folder => {
          // only use folders that have the "used in picker" flag if not configured otherwise
          if (!contactsSettings.get('enterprisePicker/useUsedInPickerFlag', true)) return true

          return folder['com.openexchange.contacts.extendedProperties']?.usedInPicker?.value === 'true'
        })).map(folder => {
          return { label: folder.title, value: folder.id }
        })

        if (list.length === 0) return
        folderlist.push({ label: sectionLabels[section] || section, options: list })
      })
    }
    if (!options.onlyResources) {
      let lastSearchedContacts = Array.prototype.slice.call(arguments, 1)

      // filter broken stuff and save to settings
      lastSearchedContacts = lastSearchedContacts.filter(contact =>
        !contact.error && contact.folder_id && contact.id && (!options.useGABOnly || contact.folder_id === contactsUtil.getGabId())
      )
      contactsSettings.set('enterprisePicker/lastSearchedContacts', _(lastSearchedContacts).map(contact => { return { folder_id: contact.folder_id, id: contact.id } })).save()

      model.get('lastContacts').reset(lastSearchedContacts)
    }

    model.set('addressLists', folderlist)

    // this request was so slow the query or selected list changed in the meantime -> don't overwrite newer results
    const noLongerValid = (query, selectedList) => query !== model.get('searchQuery') || selectedList !== model.get('selectedList')

    const updateContactsAfterSearch = (contacts = [], query, selectedList, resources = []) => {
      if (noLongerValid(query, selectedList)) return

      contentNode.idle()
      bodyNode.show()

      contacts = contacts.filter(contactsFilter)
      contacts.forEach(contact => { contact.type = 'contact' })

      if (!options.onlyResources) {
        // update the last searched contacts
        const lastContacts = model.get('lastContacts')
        // remove models that are already in the list, otherwise they would be ignored by the unshift function and are not put at the start of the collection
        lastContacts.remove(contacts, { silent: true })
        // put at start of collection, since this search is newer
        lastContacts.unshift(contacts)
        // limit to 30 by default
        lastContacts.reset(lastContacts.slice(0, contactsSettings.get('enterprisePicker/lastSearchedContactsLimit', 30)))
        contactsSettings.set('enterprisePicker/lastSearchedContacts', _(lastContacts.models).map(contact => { return { folder_id: contact.get('folder_id'), id: contact.get('id') } })).save()
      }

      // add resources
      contacts = contacts.concat(resources)
      model.get('contacts').reset(contacts)
    }

    // show generic error message
    const showError = (query, selectedList) => {
      if (noLongerValid(query, selectedList)) return

      // show error message
      contentNode.idle()
      bodyNode.show()

      model.get('contacts').reset([])
      yell('error', gt('Could not load contacts'))
    }

    model.on('change:selectedList', (model, selectedList) => {
      const query = model.get('searchQuery')
      const isSearch = query && query.length > 1

      if (selectedList === 'all' && !isSearch) return model.get('contacts').reset([])

      bodyNode.hide()
      contentNode.busy()

      if (selectedList === 'resources') {
        // hands up for API consistency; action=all doesn't accept columns. therefore we search for '*'.
        resourceAPI.search(isSearch ? query : '*').then(resources => {
          if (noLongerValid(query, selectedList)) return

          contentNode.idle()
          bodyNode.show()
          resources = (resources || [])
          resources.forEach(resource => { resource.type = 'resource' })
          model.get('contacts').reset(resources)
        }, () => showError(query, selectedList))
        return
      }

      if (isSearch) {
        if (selectedList === 'all') {
          return $.when(contactsAPI.advancedsearch(query, getDefaultParams()), options.hideResources ? [] : resourceAPI.search(query))
            .then(function (contacts, resources = []) {
              resources.forEach(resource => { resource.type = 'resource' })

              updateContactsAfterSearch(contacts, query, selectedList, resources)
            }, () => showError(query, selectedList))
        }
        return contactsAPI.advancedsearch(query, _.extend(getDefaultParams(), { folders: [selectedList] }))
          .then(result => updateContactsAfterSearch(result, query, selectedList), () => showError(query, selectedList))
      }

      // put the request together manually, api function has too much utility stuff
      // use advanced search without query to get all contacts. (we don't use all request here because that has no limit parameter)
      http.PUT({
        module: 'addressbooks',
        params: {
          action: 'advancedSearch',
          columns,
          right_hand_limit: limit,
          sort: 607,
          order: 'asc'
        },
        data: {
          folders: [selectedList],
          folderTypes: { includeUnsubscribed: true, pickerOnly: contactsSettings.get('enterprisePicker/useUsedInPickerFlag', true) }
        }
      }).then(contacts => {
        if (noLongerValid(query, selectedList)) return

        contentNode.idle()
        bodyNode.show()

        contacts = (contacts || []).filter(contactsFilter)
        contacts.forEach(contact => { contact.type = 'contact' })
        model.get('contacts').reset(contacts)
      }, () => showError(query, selectedList))
    })

    model.on('change:searchQuery', (model, query) => {
      const selectedList = model.get('selectedList')
      // no search query? show full selected list
      if (!query || query.length === 0) return model.trigger('change:selectedList', model, selectedList)
      // less than minimal length of characters? -> no change (MW request requires a minimum of io.ox/contacts//search/minimumQueryLength characters)
      if (query.length < contactsSettings.get('search/minimumQueryLength', 2)) return

      bodyNode.hide()
      contentNode.busy()

      if (selectedList === 'all') {
        return $.when(contactsAPI.advancedsearch(model.get('searchQuery'), getDefaultParams()), options.hideResources ? [] : resourceAPI.search(model.get('searchQuery')))
          .then(function (contacts, resources = []) {
            resources.forEach(resource => { resource.type = 'resource' })

            updateContactsAfterSearch(contacts, query, selectedList, resources)
          }, () => showError(query, selectedList))
      }

      if (selectedList === 'resources') {
        resourceAPI.search(query).then((resources = []) => {
          if (noLongerValid(query, selectedList)) return

          contentNode.idle()
          bodyNode.show()
          resources.forEach((resource) => { resource.type = 'resource' })
          model.get('contacts').reset(resources)
        }, () => showError(query, selectedList))
        return
      }
      contactsAPI.advancedsearch(model.get('searchQuery'), _.extend(getDefaultParams(), { folders: [selectedList] }))
        .then(result => updateContactsAfterSearch(result, query, selectedList), () => showError(query, selectedList))
    })

    contentNode.idle()
    bodyNode.show()

    let topbarNode
    headerNode.append(
      topbarNode = $('<div class="top-bar">').append(
        $('<label>').text(gt('Search')).append(
          $('<div class="input-group">').append(
            new Mini.InputView({ name: 'searchQuery', model, autocomplete: false }).render().$el
              .attr('placeholder', options.onlyResources ? gt('Search for resources') : gt('Search for name, department, position'))
              .on('keyup', _.debounce(function () {
                model.set('searchQuery', this.value)
              }, 300)),
            $('<span class="input-group-addon">').append(createIcon('bi/search.svg').attr('title', gt('Search for name, department, position')))
          )
        )
      )
    )
    if (!options.onlyResources) {
      const listSelectBox = new Mini.SelectView({ groups: true, name: 'selectedList', model, list: model.get('addressLists') }).render().$el

      model.on('change:filterQuery', () => {
        const query = model.get('filterQuery').trim().toLowerCase()
        const options = listSelectBox.find('option')
        const optionGroups = listSelectBox.find('optgroup')
        if (!query) {
          optionGroups.removeClass('hidden')
          options.removeClass('hidden')
          return
        }

        _(options).each(option => {
          $(option).removeClass('hidden')
          // never hide the placeholder
          if ($(option).val() === 'all') return
          $(option).toggleClass('hidden', option.text.toLowerCase().indexOf(query) === -1)
        })

        // hide empty optgroups
        _(optionGroups).each(optgroup => $(optgroup).toggleClass('hidden', $(optgroup).find('option:not(.hidden)').length === 0))
      })

      topbarNode.append(
        $('<label>').text(gt.pgettext('verb', 'Filter')).append(
          $('<div class="input-group">').append(
            new Mini.InputView({ name: 'filterQuery', model, autocomplete: false }).render().$el
              .attr('placeholder', gt('Filter address lists'))
              .on('keyup', _.debounce(function () {
                model.set('filterQuery', this.value)
              }, 300)),
            $('<span class="input-group-addon">').append(createIcon('bi/funnel-fill.svg').attr('title', gt('Filter address lists')))
          )
        ),
        $('<label>').text(gt('Address list')).append(
          listSelectBox
        )
      )
    }

    bodyNode.append(new ContactListView(_.extend({ model, modalBody: bodyNode }, options)).render().$el)
      .after(new SelectedContactsView({ model }).render().$el)

    if (options.useGABOnly) model.trigger('change:selectedList', model, contactsUtil.getGabId())
    if (options.onlyResources) model.trigger('change:selectedList', model, 'resources')
  }, error => {
    contentNode.idle()
    console.error(error)
    bodyNode.show().append($('<div class="error">').text(gt('Could not load address book.')))
  })
}

const open = (callback, options) => {
  options = options || {}
  if (!options.selection) options.selection = { behavior: 'multiple' }

  let model = new Backbone.Model({
    searchQuery: '',
    filterQuery: '',
    selectedList: options.onlyResources ? 'resources' : (options.useGABOnly ? contactsUtil.getGabId() : 'all'),
    selectedContacts: new Backbone.Collection(),
    contacts: new Backbone.Collection(),
    lastContacts: new Backbone.Collection(),
    addressLists: []
  })
  if (options.selection.behavior !== 'none') {
    const dialog = new ModalDialog({
      point: 'io.ox/contacts/enterprisepicker-dialog',
      help: 'ox.appsuite.user.sect.contacts.useaddressdirectory.html',
      title: options.title || gt('Global address list'),
      focus: 'input[name="searchQuery"]'
    })
      .build(function () {
        const self = this
        this.$el.addClass('enterprise-picker')
        options.dialog = this
        buildDialog(options, model, this.$('.modal-header'), this.$('.modal-content'), this.$('.modal-body'))
          // triggers focus and fixes "compact" class
          .then(self.idle)
          .fail(() => self.$('.modal-footer [data-action="select"]').attr('disabled', 'disabled'))
      })
      .addCancelButton()
      // cSpell:disable-next-line
      // #. Context: Add selected contacts; German "Auswählen", for example
      .addButton({ label: gt('Select'), action: 'select' })
      .on({
        // this function is called recursively if a distribution list is processed
        select: function processContacts (distributionListMembers) {
          if (!model) return []

          const list = _(distributionListMembers || model.get('selectedContacts').toJSON()).chain()
            .filter(item => {
              item.mail_full_name = contactsUtil.getMailFullName(item)
              item.email = $.trim(item.email1 || item.email2 || item.email3 || item.mail || item.mailaddress).toLowerCase()
              item.mail_field = item.mail_field || ('email' + (contactsUtil.calcMailField(item, item.email) || 1))
              return item.email || item.mark_as_distributionlist
            })
            .map(item => {
              if (item.mark_as_distributionlist) return processContacts(item.distribution_list)
              const name = item.mail_full_name; const mail = item.mail || item.email
              const result = {
                array: [name || null, mail || null],
                display_name: name,
                id: item.id,
                folder_id: item.folder_id,
                email: mail,
                // mail_field is used in distribution lists
                field: item.mail_field || item.field || 'email1',
                user_id: item.user_id || item.internal_userid
              }
              if (item.type === 'resource') {
                Object.assign(result, {
                  folder_id: 'cal://0/resource',
                  type: 3,
                  description: item.description,
                  mailaddress: item.mailaddress,
                  own_privilege: item.own_privilege,
                  permissions: item.permissions
                })
              }
              // make sure result.field has the correct format
              if (_.isNumber(result.field) || String(result.field).length === 1) result.field = 'email' + result.field
              return result
            })
            .flatten()
            .uniq(item => item.email)
            .value()

          if (distributionListMembers) return list
          if (_.isFunction(callback)) callback(list)
        },
        close: () => { model = null }
      })
    pickerDialog = dialog
    return dialog.open()
  }

  return createInstance(options, model).launch()
}

// close picker and possible detailviewDialog on
ox.on('app:start app:resume', () => {
  if (detailViewDialog && detailViewDialog.close) detailViewDialog.close()
  if (pickerDialog && pickerDialog.close) pickerDialog.close()
  pickerDialog = detailViewDialog = null
})

// use same names as default addressbook picker, to make it easier to switch between the two
export default {
  open
}
