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
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import common from '@/io.ox/backbone/mini-views'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import { AttachmentCollection, AttachmentListView, AttachmentUploadView, AttachmentDriveUploadView } from '@/io.ox/backbone/mini-views/attachments'
import * as util from '@/io.ox/contacts/util'
import api from '@/io.ox/contacts/api'
import attachmentAPI from '@/io.ox/core/api/attachment'
import userApi from '@/io.ox/core/api/user'
import * as coreUtil from '@/io.ox/core/util'
import capabilities from '@/io.ox/core/capabilities'
import PhotoUploadView from '@/io.ox/contacts/widgets/pictureUpload'
import ext from '@/io.ox/core/extensions'
import upload from '@/io.ox/core/tk/upload'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/contacts/settings'
import { createIcon } from '@/io.ox/core/components'

import { CategoryDropdown, CategoryBadgesView } from '@/io.ox/core/categories/view'
import { getCategoriesFromModel } from '@/io.ox/core/categories/api'

import '@/io.ox/contacts/style.scss'
import gt from 'gettext'

const View = ExtensibleView.extend({

  point: 'io.ox/contacts/edit/view',
  className: 'form-horizontal',

  events: {
    'click [data-remove]': 'onRemoveField'
  },

  initialize (options) {
    // set model
    this.model = new View.ContactModel(options.data)
    // hash to track fields that are currently visible
    this.visible = {}
    // hash to track fields that are disabled (not supported etc)
    this.disabled = {}
    // enable private flag when capability is there and it's not usermode or public folders
    if (!capabilities.has('read_create_shared_folders') || this.model.isUserMode() || options.isPublic) {
      this.disabled.private_flag = true
    }
  },

  extensions: {
    header () {
      this.renderHeader()
    },
    fields () {
      this.renderAllFields()
    },
    attachments () {
      // Remove attachment handling when infostore is not present or if user data is used instead of contact data
      if (!coreSettings.get('features/PIMAttachments', capabilities.has('filestore')) || this.model.isUserMode()) return
      this.renderAttachments()
      this.renderDropzone()
    },
    footer () {
      this.renderFooter()
    }
  },

  renderHeader () {
    this.$el.append(
      $('<div class="contact-header form-group">').append(
        $('<div class="col-xs-4 col-sm-4">').append(
          this.renderContactPhoto()
        ),
        $('<div class="col-xs-6 col-sm-6">').append(
          this.renderContactSummary()
        )
      )
    )
  },

  renderFooter () {
  },

  renderLeftColumn (node) {
    return (node || $('<div>')).addClass('col-xs-12 col-sm-4')
  },

  renderRightColumn (node, n) {
    return (node || $('<div>')).addClass('pr-0 col-xs-10 col-sm-' + (n || 8))
  },

  renderRightShortColumn (node) {
    return (node || $('<div>')).addClass('col-xs-10 col-sm-6')
  },

  renderRightColumnWithOffset (node, n) {
    return this.renderRightColumn(node, n).addClass('col-xs-offset-0 col-sm-offset-4')
  },

  renderRightShortColumnWithOffset (node) {
    return this.renderRightShortColumn(node).addClass('col-xs-offset-0 col-sm-offset-4')
  },

  renderContactPhoto () {
    return new PhotoUploadView({ model: this.model }).render().$el
  },

  renderContactSummary () {
    const $h1 = $('<h1>')
    const $h2 = $('<h2 class="business hidden-xs">')
    const $h3 = $('<h2 class="location hidden-xs">')

    this.listenTo(this.model, 'change:title change:first_name change:last_name change:company change:yomiFirstName change:yomiLastName change:yomiCompany', updateName)
    this.listenTo(this.model, 'change:company change:department change:position', updateBusiness)
    this.listenTo(this.model, 'change:city_home change:city_business change:country_home change:country_business', updateLocation)
    // ... and for diabolic testers
    this.listenTo(settings, 'change:fullNameFormat', updateName)

    updateName.call(this)
    updateBusiness.call(this)
    updateLocation.call(this)

    return $('<div class="contact-summary">').append($h1, $h2, $h3)

    function updateName () {
      // a11y: headings must not be empty, therefore toggle()
      const nodes = util.getFullNameWithFurigana(this.model.toJSON())
      $h1.empty().toggle(!!nodes.length).append(nodes)
    }

    function updateBusiness () {
      const value = util.getSummaryBusiness(this.model.toJSON())
      $h2.toggle(!!value).text(value)
    }

    function updateLocation () {
      const value = util.getSummaryLocation(this.model.toJSON())
      $h3.toggle(!!value).text(value)
    }
  },

  renderField (name, callback) {
    const guid = _.uniqueId('contact-field-')
    const label = $('<label class="control-label">').attr('for', guid).text(View.i18n[name] || name)
    const visible = this.shouldBeVisible(name)
    const maxLength = this.model.getMaxLength(name)
    const readonly = this.isReadonly(name)
    const length = this.fieldLength[name] || 6
    const offset = 6 - length
    const node = this.renderRightColumn(null, length)

    if (visible) this.visible[name] = true
    return $('<div class="form-group">')
      .attr('data-field', name)
      .toggleClass('hidden', !visible)
      .append(
        this.renderLeftColumn(label),
        node.append(
          callback.call(this, guid, label, node)
            .attr('maxlength', maxLength)
            .attr('readonly', readonly || null),
          new common.ErrorView({ model: this.model, name }).render().$el
        ),
        this.renderRemoveButton(name).addClass('col-sm-offset-' + offset)
      )
  },

  renderRemoveButton (name) {
    if (!this.isRemovable(name)) return $()
    return $('<div class="col-xs-2">').append(
      $('<button type="button" class="btn btn-link remove my-4">')
        .attr('title', gt('Remove field'))
        .attr('data-remove', name)
        .append(this.renderRemoveIcon())
    )
  },

  renderRemoveIcon () {
    return createIcon('bi/dash-circle.svg')
  },

  renderTextField (name) {
    return this.renderField(name, function (guid) {
      return new common.InputView({ name, model: this.model, id: guid, validate: false }).render().$el
    })
  },

  renderDate (name) {
    return this.renderField(name, function (guid, label) {
      return new common.DateSelectView({ name, model: this.model, label }).render().$el
    })
  },

  renderNote () {
    return this.renderField('note', function (guid) {
      return new common.TextView({ name: 'note', model: this.model, id: guid, validate: false }).render().$el
    })
  },

  renderCategories () {
    if (coreSettings.get('features/categories', false)) {
      return this.renderField('categories', function (guid) {
        const pimId = 'contact' + this.model.get('id')
        const pimCategories = getCategoriesFromModel(this.model.get('categories'), pimId)

        const categoryBadges = new CategoryBadgesView({ collection: pimCategories, removable: true })
        const categoriesDropdown = new CategoryDropdown({
          pimId,
          pimModel: this.model,
          pimCategories,
          caret: true,
          label: gt('Add category'),
          buttonToggle: true,
          useToggleWidth: true
        })

        return $('<fieldset>')
          .append(
            $('<div class="category-dropdown-wrapper">').append(
              categoriesDropdown.render().$el),
            categoryBadges.render().$el
          )
      })
    }
  },

  renderPrivateFlag () {
    return this.renderField('private_flag', function (guid, label, node) {
      label.removeClass('col-xs-12 col-sm-4').addClass('sr-only')
      node.addClass('col-xs-offset-0 col-sm-offset-4')
      return new common.CustomCheckboxView({ name: 'private_flag', label: gt('This contact is private and cannot be shared'), model: this.model, id: guid }).render().$el
    })
  },

  shouldBeVisible (name) {
    // either always visible or has value
    return this.alwaysVisible[name] || this.fieldHasContent(name)
  },

  fieldHasContent (name) {
    return !!this.model.get(name)
  },

  addressHasContent (name) {
    return _(this.sets[name]).any(this.fieldHasContent, this)
  },

  showDisplayName () {
    // show display_name only if display_name is set
    // but first name, last name, and company are all empty
    if (this.model.get('first_name')) return false
    if (this.model.get('last_name')) return false
    if (this.model.get('company')) return false
    if (!this.model.get('display_name')) return false
    return true
  },

  isRemovable (name) {
    if (this.alwaysVisible[name]) return false
    if (name === 'display_name') return false
    if (/^(street|postal_code|city|state|country)_/.test(name)) return false
    return true
  },

  isReadonly (name) {
    if (this.readonly[name]) return true
    const folder = String(this.model.get('folder_id'))
    if (name === 'email1' && (folder === util.getGabId(true) || folder === util.getGabId() || folder === '16')) return true
    return false
  },

  renderAllFields () {
    this.$el.append(
      _(this.allFields).map(renderSection, this)
    )

    function renderSection (section, name) {
      const $section = $('<div class="section">').attr('data-section', name).append(
        _(section.fields.map(renderField, this)).flatten()
      )
      // add dropdown to add fields
      $section.append(this.renderDropdown(name, section.add))
      return $section
    }

    function renderField (name) {
      if (this.disabled[name]) return ''
      let visible
      switch (name) {
        case 'address_home':
        case 'address_business':
        case 'address_other':
          // show address if at least one field has content
          visible = (this.visible[name] = this.addressHasContent(name))
          return this.renderAddress(name).toggleClass('hidden', !visible)
        case 'birthday':
        case 'anniversary':
          return this.renderDate(name)
        case 'note':
          return this.renderNote()
        case 'categories':
          return this.renderCategories()
        case 'display_name':
          // show display name in special case
          visible = (this.visible[name] = this.showDisplayName())
          return this.renderTextField(name).toggleClass('hidden', !visible)
        case 'private_flag':
          return this.renderPrivateFlag()
        default:
          return this.renderTextField(name)
      }
    }
  },

  renderAddress (name) {
    const title = View.i18n[name]
    return $('<fieldset class="address">').attr('data-address', name).append(
      $('<legend class="sr-only">').text(title),
      $('<div class="form-group">').append(
        this.renderRightShortColumnWithOffset()
          .addClass('section-title').attr('aria-hidden', true).text(title),
        this.renderRemoveButton(name)
      ),
      this.sets[name].map(function (name) {
        // never hide address fields individually
        return this.renderTextField(name).removeClass('hidden')
      }, this)
    )
  },

  renderDropdown (name, title) {
    const label = createIcon('bi/plus-circle.svg').add($.txt(title))
    const dropdown = new Dropdown({ label, caret: true, buttonToggle: 'btn-link' })
    this.renderDropdownOptions(dropdown, name)
    this.listenTo(dropdown, 'click', this.onAddField.bind(this, dropdown, name))
    return $('<div class="form-group">').append(
      this.renderRightColumnWithOffset().append(
        dropdown.render().$el.attr('data-add', name)
      )
    )
  },

  renderDropdownOptions (dropdown, section) {
    dropdown.$ul.empty()
    _(this.sections[section]).each(function (name) {
      if (this.visible[name] || this.disabled[name]) return
      if (name === '-') dropdown.divider(); else dropdown.link(name, View.i18n[name])
    }, this)
    // hide/show dropdown badges on number of options left in the dropdown
    dropdown.$el.toggle(!!dropdown.$ul.children().filter(':not(.divider)').length)
  },

  renderAttachments () {
    const model = this.model
    const collection = this.attachments = new AttachmentCollection()

    const listView = new AttachmentListView({ collection, model, module: 7 })
    const uploadView = new AttachmentUploadView({ collection, model })
    const driveUploadView = new AttachmentDriveUploadView({ collection, model })

    this.$el.append(
      $('<div class="section">').attr('data-section', 'attachments').append(
        this.renderField('attachments', function (guid) {
          return $('<span>').append(
            listView.render().$el.attr('id', guid),
            $('<div class="attachment-list-actions flex-row">').append(
              uploadView.render().$el,
              driveUploadView.render().$el
            )
          )
        })
      )
    )

    this.listenTo(this.model, 'save:success', listView.save.bind(listView))

    this.model.on('refresh', function (model, errors) {
      const id = this.get('id')
      const folderId = this.get('folder_id')
      // check for recently updated attachments
      const hashKey = api.getAttachmentsHashKey({ id, folder_id: folderId })
      // bypass cache for pending attachments
      const useCache = !attachmentAPI.isPending(hashKey)

      return api.get({ id, folder: folderId }, useCache).then(function (data) {
        if (useCache) return $.when()
        return $.when(
          api.caches.get.add(data),
          api.caches.all.grepRemove(folderId + api.DELIM),
          api.caches.list.remove({ id, folder: folderId }),
          api.clearFetchCache()
        )
          .done(function () {
            // to make the detailview remove the busy animation:
            api.trigger('update:' + _.ecid(data))
            api.trigger('refresh.list')
          })
      })
    })
  },

  renderDropzone () {
    const SCROLLABLE = '.window-content'
    const attachments = this.attachments
    const Dropzone = upload.dnd.FloatingDropzone.extend({
      getDimensions () {
        const node = this.$el.closest(SCROLLABLE)
        const top = node.scrollTop()
        const height = node.outerHeight()
        return {
          top,
          bottom: 0,
          height
        }
      }
    })

    ext.point('io.ox/contacts/edit/dnd/actions').extend({
      id: 'attachment',
      index: 100,
      label: gt('Drop here to upload a <b class="dndignore">new attachment</b>'),
      multiple: files => {
        [...files].forEach((fileData) => attachments.add(fileData, { parse: true }))
      }
    })

    this.$el.parent().append(
      new Dropzone({ point: 'io.ox/contacts/edit/dnd/actions', scrollable: SCROLLABLE }).render().$el
    )
  },

  onAddField (dropdown, section, data) {
    const name = data.name
    // skip on empty selection
    if (!name) return
    // treat addresses differently
    if (this.isAddress(name)) this.showAddress(name); else this.showField(name)
    this.focusField(name)
    this.renderDropdownOptions(dropdown, section)
  },

  showField (name) {
    this.$(`[data-field="${CSS.escape(name)}"]`).removeClass('hidden')
      .closest('.section').removeClass('hidden')
    this.visible[name] = true
  },

  showAddress (name) {
    this.$(`[data-address="${CSS.escape(name)}"]`).removeClass('hidden')
    this.visible[name] = true
  },

  focusField (name) {
    this.$(`[data-field="${CSS.escape(name)}"], [data-address="${CSS.escape(name)}"]`)
      .find('.form-control:first').focus()
  },

  isSet (name) {
    return !!this.sets[name]
  },

  isAddress (name) {
    return /^address_/.test(name)
  },

  resolveSet (name) {
    return this.sets[name] || [name]
  },

  onRemoveField (e) {
    const node = $(e.currentTarget)
    const name = node.attr('data-remove')
    // treat addresses differently
    if (this.isAddress(name)) this.hideAddress(name); else this.hideField(name)
    // update dropdown and save focus
    const section = reverse[name]
    const dropdown = this.$(`[data-add="${CSS.escape(section)}"]`).data('view')
    this.renderDropdownOptions(dropdown, section)
    dropdown.$toggle.focus()
  },

  hideField (name) {
    this.$(`[data-field="${CSS.escape(name)}"]`).addClass('hidden')
    // let's see whether we need empty string, null, or model.unset;
    // so far empty string seems to be the right choice
    this.model.set(name, '')
    this.visible[name] = false
  },

  hideAddress (name) {
    this.$(`[data-address="${CSS.escape(name)}"]`).addClass('hidden')
    this.resolveSet(name).forEach(function (name) {
      this.model.set(name, '')
    }, this)
    this.visible[name] = false
  },

  alwaysVisible: {
    first_name: true,
    last_name: true,
    company: true,
    yomiFirstName: true,
    yomiLastName: true,
    yomiCompany: true,
    department: true,
    email1: true,
    cellular_telephone1: true,
    categories: true,
    note: true,
    attachments: true,
    private_flag: true
  },

  readonly: {
    display_name: true
  },

  allFields: {
    personal: {
      // #. Contact edit dialog. Personal information.
      add: gt('Add personal info'),
      fields: [
        'title', 'first_name', 'last_name', 'display_name',
        'nickname', 'second_name', 'suffix',
        'birthday', 'anniversary',
        'marital_status', 'number_of_children', 'url'
      ]
    },
    business: {
      // #. Contact edit dialog. Business information.
      add: gt('Add business info'),
      fields: [
        'company', 'department', 'position', 'profession', 'manager_name',
        'room_number', 'assistant_name',
        'employee_type', 'number_of_employees', 'sales_volume', 'tax_id',
        'commercial_register', 'branches', 'business_category', 'info'
      ]
    },
    // email, messaging, and phone numbers
    communication: {
      // #. Contact edit dialog.
      // #. Short for: Add email address, phone number, fax number.
      add: gt('Add email, phone, fax'),
      fields: [
        'email1', 'email2', 'email3',
        'instant_messenger1', 'instant_messenger2',
        'cellular_telephone1', 'cellular_telephone2',
        'telephone_business1', 'telephone_business2',
        'telephone_home1', 'telephone_home2',
        'telephone_company', 'telephone_other',
        'telephone_car', 'telephone_isdn', 'telephone_pager',
        'telephone_primary', 'telephone_radio',
        'telephone_telex', 'telephone_ttytdd',
        'telephone_ip', 'telephone_assistant', 'telephone_callback',
        'fax_business', 'fax_home', 'fax_other'
      ]
    },
    addresses: {
      // #. Contact edit dialog.
      add: gt('Add postal address'),
      fields: [
        'address_home', 'address_business', 'address_other'
      ]
    },
    other: {
      // #. Contact edit dialog.
      add: gt('Add additional info'),
      fields: [
        'categories',
        'note',
        'private_flag'
      ]
    },
    userfields: {
      // #. Contact edit dialog.
      add: gt('Add user fields'),
      fields: [
        'userfield01', 'userfield02', 'userfield03',
        'userfield04', 'userfield05', 'userfield06',
        'userfield07', 'userfield08', 'userfield09',
        'userfield10', 'userfield11', 'userfield12',
        'userfield13', 'userfield14', 'userfield15',
        'userfield16', 'userfield17', 'userfield18',
        'userfield19', 'userfield20'
      ]
    }
  },

  // needed to draw dropdown options
  sections: {
    personal: [
      'title', 'first_name', 'last_name',
      'nickname', 'second_name', 'suffix',
      '-',
      'birthday', 'anniversary',
      'marital_status', 'number_of_children', 'url'
    ],
    business: [
      'company', 'department', 'position', 'profession',
      '-',
      'room_number', 'manager_name', 'assistant_name'
    ],
    communication: [
      'email1', 'email2', 'email3',
      'instant_messenger1', 'instant_messenger2',
      '-',
      'cellular_telephone1', 'cellular_telephone2',
      'telephone_business1', 'telephone_business2',
      'telephone_home1', 'telephone_home2',
      'telephone_company', 'telephone_other',
      '-',
      'fax_business', 'fax_home', 'fax_other'
    ],
    addresses: ['address_home', 'address_business', 'address_other'],
    other: [
      'note',
      'private_flag'
    ],
    userfields: [
      'userfield01', 'userfield02', 'userfield03',
      'userfield04', 'userfield05', 'userfield06',
      'userfield07', 'userfield08', 'userfield09',
      'userfield10', 'userfield11', 'userfield12',
      'userfield13', 'userfield14', 'userfield15',
      'userfield16', 'userfield17', 'userfield18',
      'userfield19', 'userfield20'
    ]
  },

  sets: {
    address_home: ['street_home', 'postal_code_home', 'city_home', 'state_home', 'country_home'],
    address_business: ['street_business', 'postal_code_business', 'city_business', 'state_business', 'country_business'],
    address_other: ['street_other', 'postal_code_other', 'city_other', 'state_other', 'country_other']
  },

  fieldLength: {
    number_of_children: 3,
    room_number: 3,
    postal_code_home: 3,
    postal_code_business: 3,
    postal_code_other: 3
  }
})

// add support for yomi fields (Japanese)
if (ox.locale === 'ja_JP' || settings.get('features/furigana', false)) {
  View.prototype.allFields.personal.fields
    .splice(1, 2, 'yomiLastName', 'last_name', 'yomiFirstName', 'first_name')
  View.prototype.allFields.business.fields.unshift('yomiCompany')
}

// add reverse lookup and flat list
const reverse = {}
const all = []
_(View.prototype.allFields).each(function (section, sectionName) {
  _(section.fields).each(function (field) {
    reverse[field] = sectionName
    all.push(field)
  })
})
_(View.prototype.sets).each(function (set) {
  _(set).each(all.push.bind(all))
})

View.i18n = {
  // personal
  title: gt.pgettext('salutation', 'Title'),
  display_name: gt('Display name'),
  first_name: gt('First name'),
  last_name: gt('Last name'),
  second_name: gt('Middle name'),
  suffix: gt('Suffix'),
  birthday: gt('Date of birth'),
  marital_status: gt('Marital status'),
  number_of_children: gt('Children'),
  nickname: gt('Nickname'),
  spouse_name: gt('Spouse\'s name'),
  anniversary: gt('Anniversary'),
  private_flag: '',
  // messaging
  email1: gt('Email 1'),
  email2: gt('Email 2'),
  email3: gt('Email 3'),
  instant_messenger1: gt('Instant Messenger 1'),
  instant_messenger2: gt('Instant Messenger 2'),
  url: gt('URL'),
  // job
  company: gt('Company'),
  profession: gt('Profession'),
  department: gt('Department'),
  position: gt('Position'),
  employee_type: gt('Employee type'),
  room_number: gt('Room number'),
  number_of_employees: gt('Employee ID'),
  sales_volume: gt('Sales Volume'),
  tax_id: gt('TAX ID'),
  commercial_register: gt('Commercial Register'),
  branches: gt('Branches'),
  business_category: gt('Business category'),
  info: gt('Info'),
  manager_name: gt('Manager'),
  assistant_name: gt('Assistant'),
  // phone
  cellular_telephone1: gt('Cell phone'),
  cellular_telephone2: gt('Cell phone (alt)'),
  telephone_business1: gt('Phone (business)'),
  telephone_business2: gt('Phone (business alt)'),
  telephone_callback: gt('Telephone callback'),
  telephone_car: gt('Phone (car)'),
  telephone_company: gt('Phone (company)'),
  telephone_home1: gt('Phone (home)'),
  telephone_home2: gt('Phone (home alt)'),
  telephone_other: gt('Phone (other)'),
  telephone_isdn: gt('Telephone (ISDN)'),
  telephone_pager: gt('Pager'),
  telephone_primary: gt('Telephone primary'),
  telephone_radio: gt('Telephone radio'),
  telephone_telex: gt('Telex'),
  telephone_ttytdd: gt('TTY/TDD'),
  telephone_ip: gt('IP phone'),
  telephone_assistant: gt('Phone (assistant)'),
  fax_home: gt('Fax (Home)'),
  fax_business: gt('Fax'),
  fax_other: gt('Fax (alt)'),
  // home
  address_home: gt('Home address'),
  street_home: gt('Street'),
  postal_code_home: gt('Postcode'),
  city_home: gt('City'),
  state_home: gt('State'),
  country_home: gt('Country'),
  // business
  address_business: gt('Business address'),
  street_business: gt('Street'),
  postal_code_business: gt('Postcode'),
  city_business: gt('City'),
  state_business: gt('State'),
  country_business: gt('Country'),
  // other
  address_other: gt('Other address'),
  street_other: gt('Street'),
  city_other: gt('City'),
  postal_code_other: gt('Postcode'),
  state_other: gt('State'),
  country_other: gt('Country'),
  categories: gt('Categories'),
  // #. Notes on a contact in the address book.
  // #. Like in "adding a note". "Notizen" in German, for example.
  note: gt.pgettext('contact', 'Note'),
  // yomi
  yomiFirstName: gt('Furigana for first name'),
  yomiLastName: gt('Furigana for last name'),
  yomiCompany: gt('Furigana for company'),
  // all other
  attachments: gt('Attachments'),
  image1: gt('Image 1'),
  userfield01: gt('Optional 01'),
  userfield02: gt('Optional 02'),
  userfield03: gt('Optional 03'),
  userfield04: gt('Optional 04'),
  userfield05: gt('Optional 05'),
  userfield06: gt('Optional 06'),
  userfield07: gt('Optional 07'),
  userfield08: gt('Optional 08'),
  userfield09: gt('Optional 09'),
  userfield10: gt('Optional 10'),
  userfield11: gt('Optional 11'),
  userfield12: gt('Optional 12'),
  userfield13: gt('Optional 13'),
  userfield14: gt('Optional 14'),
  userfield15: gt('Optional 15'),
  userfield16: gt('Optional 16'),
  userfield17: gt('Optional 17'),
  userfield18: gt('Optional 18'),
  userfield19: gt('Optional 19'),
  userfield20: gt('Optional 20')
}

function transformValidation (errors) {
  return {
    error: _.map(errors, function (value, key) {
      return (View.i18n[key] || key) + ': ' + value
    }).join('\n')
  }
}

View.ContactModel = Backbone.Model.extend({

  initialize (options) {
    this.isUser = options.isUser
    this.initialValues = _.omit(options, 'isUser')
    this.on('change:title change:first_name change:last_name change:company', _.debounce(this.deriveDisplayName))
    this.addDirtyCheck()
    this.on('change', _.debounce(this.validate))
  },

  toJSON () {
    // allowlist approach
    const names = _(View.i18n).keys().concat('id', 'folder_id', 'image1_url')
    return _(this.attributes).pick(names)
  },

  addDirtyCheck () {
    // supports case: add to addressbook
    let dirty = !_.isEmpty(_.omit(this.initialValues, 'id', 'folder_id', 'categories'))

    this.isDirty = function () {
      return dirty
    }

    this.resetDirty = function () {
      dirty = false
    }

    this.on('change', function () {
      if (this.changed.display_name) return
      dirty = Object.entries(this.changed).some(([key, value]) => value !== (this.initialValues[key] || ''))
    })

    this.on('save:success', function () {
      // to avoid race conditions
      // we define that the model never gets dirty anymore
      this.isDirty = _.constant(false)
    })
  },

  deriveDisplayName () {
    this.set('display_name', util.getFullName(this.toJSON()))
  },

  // add missing promise support
  save () {
    const promise = Backbone.Model.prototype.save.apply(this, arguments)
    return !promise ? $.Deferred().reject(transformValidation(this.validationError)) : promise
  },

  sync (method, module, options) {
    switch (method) {
      case 'create':
        return create.call(this)
          .done(this.set.bind(this))
          .done(() => { this.trigger('save:success') })
          .fail(() => { this.trigger('save:fail') })
          .done(options.success)
          .fail(options.error)
      case 'read':
        return this.getApi().get(this.pick('id', 'folder_id'))
          .done((data) => { this.initialValues = data })
          .done(options.success)
          .fail(options.error)
      case 'update':
        return update.call(this)
          .then(() => { this.trigger('save:success') })
          .then(options.success)
          .catch(e => {
            this.trigger('save:fail')
            options.error(e)
            throw e
          })
      // no default
    }

    function create () {
      const file = this.getFile()
      return this.getApi().create(this.toJSON(), file)
    }

    function update () {
      const changes = this.getChanges()
      const file = this.getFile()
      if (file) return this.getApi().editNewImage(this.pick('id', 'folder_id'), changes, file)
      // we need both values to remove the image
      if (changes.image1_url === '') changes.image1 = ''
      // happy debugging: here it's folder, not folder_id, yay.
      const options = _.extend(this.pick('id', 'last_modified'), { folder: this.get('folder_id'), data: changes })
      return this.getApi().update(_.extend(options, { data: changes }))
    }
  },

  isUserMode () {
    // 6 is gab 16 is guest user
    return (String(this.get('folder_id')) === util.getGabId(true) || String(this.get('folder_id')) === '16') && String(this.get('id')) === String(ox.user_id)
  },

  getApi () {
    return this.isUserMode() ? userApi : api
  },

  getChanges () {
    const changes = {}; const attr = this.attributes; const initial = this.initialValues; let count = 0
    all.concat('image1_url').forEach(function (name) {
      if (_.isEqual(attr[name], initial[name])) return
      changes[name] = attr[name]
      count++
    })
    return count === 1 && 'display_name' in changes ? {} : changes
  },

  getFile () {
    return this.get('pictureFileEdited') || this.get('pictureFile') || undefined
  },

  validate () {
    const errors = this.validateFunctions(['validateLength', 'validateAddresses'])
    _(this.toJSON()).each(function (value, name) {
      const error = errors[name]
      this.trigger((error ? 'invalid' : 'valid') + ':' + name, error)
    }, this)
    return errors
  },

  validateFunctions (array) {
    const errors = {}
    const attrs = this.toJSON()

    array.forEach(fn => {
      const result = this[fn](attrs)
      if (result) _.extend(errors, result)
    })

    // false means "good"
    return _.isEmpty(errors) ? false : errors
  },

  validateArray (array, data, callback) {
    let invalid = false; const attr = {}
    array.forEach(function (name) {
      const value = data[name]
      if (value === undefined || value === null) return
      const result = callback.call(this, name, value)
      // false means "good"
      if (!result) return
      invalid = true
      attr[name] = result
    }, this)
    return invalid && attr
  },

  validateLength (data) {
    return this.validateArray(_.flatten(all), data, function (name, value) {
      if (String(value).length <= this.getMaxLength(name)) return
      return gt('This value is too long. The allowed length is %1$d characters.', this.getMaxLength(name))
    })
  },

  validateAddresses (data) {
    return this.validateArray(['email1', 'email2', 'email3'], data, function (name, value) {
      if (coreUtil.isValidMailAddress(value) || coreSettings.get('features/validateMailAddresses', true) === false) return
      return gt('This is an invalid email address.', View.i18n[name])
    })
  },

  // limits are defined by db
  maxLength: {
    // most fields have a maxlength of 64
    first_name: 128,
    last_name: 128,
    position: 128,
    tax_id: 128,
    url: 256,
    profession: 256,
    street_home: 256,
    street_other: 256,
    street_business: 256,
    display_name: 320,
    email1: 512,
    email2: 512,
    email3: 512,
    company: 512,
    categories: 512,
    note: 5680
  },

  getMaxLength (name) {
    return this.maxLength[name] || 64
  }
})

export default View
