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
import { device } from '@/browser'
import Backbone from '@/backbone'
import ox from '@/ox'

import ext from '@/io.ox/core/extensions'
import capabilities from '@/io.ox/core/capabilities'
import folderAPI from '@/io.ox/core/folder/api'
import filesAPI from '@/io.ox/files/api'
import groupAPI from '@/io.ox/core/api/group'
import shareAPI from '@/io.ox/files/share/api'
import contactsAPI from '@/io.ox/contacts/api'
import yell from '@/io.ox/core/yell'

import Typeahead from '@/io.ox/core/tk/typeahead'
import DisposableView from '@/io.ox/backbone/views/disposable'
import ModalDialog from '@/io.ox/backbone/views/modal'
import DropdownView from '@/io.ox/backbone/mini-views/dropdown'
import AddressPickerView from '@/io.ox/backbone/mini-views/addresspicker'
import { TextView } from '@/io.ox/backbone/mini-views/common'
import PublicLink from '@/io.ox/files/share/public-link'
import PermissionPreSelection from '@/io.ox/files/share/permission-pre-selection'
import { ShareSettingsView, showSettingsDialog } from '@/io.ox/files/share/share-settings'
import { ParticipantModel } from '@/io.ox/participants/model'
import { ParticipantEntryView } from '@/io.ox/participants/views'

import { getFullName, getMail } from '@/io.ox/contacts/util'
import { getAddresses } from '@/io.ox/core/util'
import { isOwnIdentity } from '@/io.ox/files/permission-util'
import { displayConflicts } from '@/io.ox/core/tk/filestorageUtil'
import { createButton, createIcon } from '@/io.ox/core/components'

import '@/io.ox/files/share/style.scss'

import { settings as settingsContacts } from '@/io.ox/contacts/settings'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import gt from 'gettext'

const POINT = 'io.ox/files/share/permissions'

const roles = {
  // #. Role: view folder + read all
  viewer: { bit: 257, label: gt('Viewer') },
  // #. Role: view folder + read/write all
  reviewer: { bit: 33025, label: gt('Reviewer') },
  // #. Role: create folder + read/write/delete all
  author: { bit: 4227332, label: gt('Author') },
  // #. Role: all permissions
  administrator: { bit: 272662788, label: gt('Administrator') },
  // #. Role: Owner (same as admin)
  owner: { bit: 272662788, label: gt('Owner') }
}

const fileRoles = {
  // read only
  viewer: 1,
  // read and write
  reviewer: 2,
  // read, write, and delete
  author: 4
}

/* Models */

// Simple Permission
const Permission = Backbone.Model.extend({

  defaults: {
    group: false,
    bits: 0
  },

  initialize () {
    // if extended permissions
    if (this.has('type') && this.get('type') === 'group') {
      this.set('group', true)
    }
  },

  isMyself () {
    const isFederatedShare = this.get('entity') === undefined
    return this.get('type') === 'user' && (isFederatedShare ? isOwnIdentity(this.get('identifier')) : this.get('entity') === ox.user_id)
  },

  isGroup () {
    return this.get('type') === 'group'
  },

  isUser () {
    return this.get('type') === 'user'
  },

  isPerson () {
    return this.isUser() || this.isGuest()
  },

  isInternal () {
    const type = this.get('type')
    return type === 'user' || type === 'group'
  },

  isGuest () {
    return this.get('type') === 'guest'
  },

  isAnonymous () {
    return this.get('type') === 'anonymous'
  },

  isOwner (parentModel) {
    if (!(this.get('entity') || this.get('identifier')) || !parentModel || !_.isFunction(parentModel.getEntity) || !_.isFunction(parentModel.getIdentifier)) return

    const isFederatedShare = this.get('entity') === undefined
    return isFederatedShare ? this.get('identifier') === parentModel.getIdentifier() : this.get('entity') === parentModel.getEntity()
  },

  getDisplayName (htmlOutput) {
    switch (this.get('type')) {
      case 'user':
        return getFullName(this.get('contact'), htmlOutput)
      case 'group':
        return this.get('display_name')
      case 'guest': {
        const data = this.get('contact')
        return data[data.field] || data.email1
      }
      case 'anonymous':
        return gt('Public link')
        // no default
    }
  },

  getEmail () {
    return getMail(this.get('contact'))
  },

  getSortName () {
    let data = {}
    switch (this.get('type')) {
      case 'user':
        data = this.get('contact')
        return data.last_name || data.first_name || data.display_name
      case 'group':
        return this.get('display_name')
      case 'guest':
        data = this.get('contact')
        return data[data.field] || data.email1
      case 'anonymous':
        return ''
      // no default
    }
  },

  // bits    Number  A number as described in Permission flags.
  // entity  Number  (ignored for type “anonymous” or “guest”) User ID of the user or group to which this permission applies.
  // identifier   String  (used as entity for federated sharing)
  // group   Boolean (ignored for type “anonymous” or “guest”) true if entity refers to a group, false if it refers to a user.
  // type    String  (required if no internal “entity” defined) The recipient type, i.e. one of “guest”, “anonymous”
  // email_address   String  (for type “guest”) The e-mail address of the recipient
  // display_name    String  (for type “guest”, optional) The display name of the recipient
  // contact_id  String  (for type “guest”, optional) The object identifier of the corresponding contact entry if the recipient was chosen from the address book
  // contact_folder  String  (for type “guest”, required if “contact_id” is set) The folder identifier of the corresponding contact entry if the recipient was chosen from the address book
  toJSON () {
    const type = this.get('type')
    const data = {
      bits: this.get('bits')
    }
    if (this.has('entity') || this.has('identifier')) {
      data.entity = this.get('entity')
      data.identifier = this.get('identifier')
      data.group = type === 'group'
    } else {
      switch (type) {
        case 'guest': {
          data.type = type
          const contact = this.get('contact')
          data.email_address = contact[contact.field] || contact.email1
          if (this.has('display_name')) {
            data.display_name = this.get('display_name')
          }
          if (contact && contact.id && contact.folder_id) {
            data.contact_id = contact.id
            data.contact_folder = contact.folder_id
          }
          break
        }
        case 'anonymous':
          data.type = type
          break
          // no default
      }
    }

    return data
  }
})

// Permission Collection
const Permissions = Backbone.Collection.extend({

  model: Permission,

  modelId (attrs) {
    return attrs.entity ? String(attrs.entity) : attrs.identifier
  },

  initialize () {
    this.on('revert', this.revert)
  },

  // method to check if a guest is already in the collection (they receive entity ids that differ from the emails, so this check is needed)
  isAlreadyGuest (newGuest) {
    const guests = this.where({ type: 'guest' })
    let isGuest = false
    // use try catch not to run into a js error if the field attribute isn't there or sth
    try {
      for (let i = 0; i < guests.length; i++) {
        if (guests[i].attributes.contact.email1 === newGuest.contact[newGuest.field]) {
          isGuest = true
        }
      }
    } catch (e) {
      if (ox.debug) console.error(e)
    }

    return isGuest
  },

  comparator (a, b) {
    if (a.isMyself()) return -1
    if (b.isMyself()) return +1
    const snA = a.getSortName()
    const snB = b.getSortName()

    const lexical = snA === snB ? 0 : (snA > snB ? +1 : -1)

    if (a.isGroup() && b.isGroup()) return lexical
    if (a.isGroup()) return -1
    if (b.isGroup()) return +1
    if (a.isUser() && b.isUser()) return lexical
    if (a.isUser()) return -1
    if (b.isUser()) return +1
    if (a.isGuest() && b.isGuest()) return lexical
    if (a.isGuest()) return -1
    if (b.isGuest()) return +1
    return +1
  },

  revert () {
    // Remove all entries which were not saved yet.
    const newEntities = this.where({ new: true })
    this.remove(newEntities)
  }
})

// Simple permission view
const PermissionEntityView = DisposableView.extend({

  className: 'permission row',

  initialize (options) {
    if (this.model.get('type') === 'anonymous') {
      let key
      const remove = () => {
        this.model.collection.remove(this.model)
        this.remove()
      }

      if (options.parentModel.isFile()) {
        key = `remove:link:infostore:${options.parentModel.get('folder_id')}:${options.parentModel.get('id')}`
      } else {
        key = `remove:link:${options.parentModel.get('module')}:${options.parentModel.get('id')}`
      }

      shareAPI.on(key, remove)
      this.on('dispose', () => shareAPI.off(key, remove))
    }
    this.parentModel = options.parentModel
    this.user = null
    this.display_name = ''
    this.description = ''
    this.ariaLabel = ''

    this.parseBitmask()

    this.listenTo(this.model, 'change:bits', this.onChangeBitmask)
    this.listenTo(this.model, 'change:folder change:read change:write change:delete change:admin', this.updateBitmask)
  },

  onChangeBitmask () {
    this.parseBitmask()
  },

  parseBitmask () {
    const bitmask = folderAPI.Bitmask(this.model.get('bits'))
    this.model.set({
      folder: bitmask.get('folder'),
      read: bitmask.get('read'),
      write: bitmask.get('write'),
      delete: bitmask.get('delete'),
      admin: bitmask.get('admin')
    })
  },

  updateBitmask () {
    const bitmask = folderAPI.Bitmask(this.model.get('bits'))
    bitmask.set('folder', this.model.get('folder'))
    bitmask.set('read', this.model.get('read'))
    bitmask.set('write', this.model.get('write'))
    bitmask.set('delete', this.model.get('delete'))
    bitmask.set('admin', this.model.get('admin'))
    this.model.set('bits', bitmask.get())
  },

  render () {
    this.getEntityDetails()
    if (this.model.get('type') === 'anonymous') return false
    this.$el.attr({ 'aria-label': this.ariaLabel + '.', role: 'group' })
    const baton = ext.Baton({ model: this.model, view: this, parentModel: this.parentModel })
    ext.point(POINT + '/entity').invoke('draw', this.$el.empty(), baton)

    // The menu node is moved outside the PermissionEntityView root node. That's why Backbone event delegate seems to have problems on mobile phones.
    this.$el.find('a[data-name="resend"]').on('click', this.onResend.bind(this))
    this.$el.find('a[data-name="revoke"]').on('click', this.onRemove.bind(this))

    return this
  },

  onRemove (e) {
    e.preventDefault()
    this.model.collection.remove(this.model)
    this.remove()
  },

  onResend (e) {
    e.preventDefault()

    const type = this.parentModel.isFile() ? 'file' : 'folder'
    const id = this.parentModel.get('id')
    const entity = this.model.get('entity')

    shareAPI.resend(type, id, entity).then(
      function success () {
        yell('success', gt('The notification has been resent'))
      },
      function fail (error) {
        yell(error)
      }
    )
  },

  getEntityDetails () {
    switch (this.model.get('type')) {
      case 'user':
        this.user = this.model.get('contact')
        this.display_name = getFullName(this.user)
        this.description = gt('Internal user')
        break
      case 'group':
        this.display_name = this.model.get('display_name')
        this.description = gt('Group')
        break
      case 'guest':
        this.user = this.model.get('contact')
        this.display_name = this.user[this.user.field] || this.user.email1
        this.description = gt('Guest')
        break
      case 'anonymous':
        // TODO: public vs. password-protected link
        this.display_name = this.ariaLabel = gt('Public link')
        this.description = this.model.get('share_url')
        break
        // no default
    }

    // #. description in the permission dialog to indicate that this user can act on your behalf (send mails, check calendar for you, etc)
    if (this.model.get('deputyPermission')) this.description = gt('Deputy')

    // a11y: just say "Public link"; other types use their description
    this.ariaLabel = this.ariaLabel || (this.display_name + ', ' + this.description)
  },

  getRole () {
    const bits = this.model.get('bits'); let bitmask
    if (this.model.isOwner(this.parentModel)) {
      return 'owner'
    } else if (this.parentModel.isFile()) {
      if (bits === 2 || bits === 4) return 'reviewer'
    } else {
      bitmask = folderAPI.Bitmask(this.model.get('bits'))
      if (bitmask.get('admin')) return 'administrator'
      if (bitmask.get('read') && bitmask.get('write')) {
        // Author: read, write, delete
        // Reviewer: read, write
        return bitmask.get('delete') ? 'author' : 'reviewer'
      }
    }
    // assumption is that everyone is at least a "Viewer"
    return 'viewer'
  },

  getRoleDescription (role) {
    role = role || this.getRole()
    return roles[role] ? roles[role].label : 'N/A'
  },

  // check if it's possible to assign the admin role at all
  supportsAdminRole () {
    if (this.parentModel.isFile()) return false

    const type = this.parentModel.get('type')
    const module = this.parentModel.get('module')

    // no admin choice for default folders (see Bug 27704)
    if (String(folderAPI.getDefaultFolder(module)) === this.parentModel.get('id')) return false
    // not for system folders
    if (type === 5) return false
    // public folder and permission entity 0, i.e. "All users"
    if (type === 2 && this.model.id === 0) return false
    // private contacts and calendar folders can't have other users with admin permissions
    if (type === 1 && (module === 'contacts' || module === 'calendar')) return false
    // otherwise
    return true
  }
})

// All Permissions view
const PermissionsView = DisposableView.extend({

  tagName: 'div',
  permissionPreSelection: null,
  initialPermissions: 0,

  className: 'permissions-view container-fluid',

  initialize (options) {
    this.options = options || {}
    this.offset = this.options.offset || 0
    this.limit = this.options.limit || 100

    this.collection = new Permissions()
    this.listenTo(this.collection, 'reset', () => this.renderEntitiesChunk(this.limit))
    this.listenTo(this.collection, 'add', this.renderEntity)
    this.listenTo(this.collection, 'revert', this.onReset)
    this.listenTo(this.collection, 'remove', this.onRemove)

    this.$el.on('scroll', this.onScroll.bind(this))
    this.initialPermissions = this.model.getPermissions().length
  },

  hasChanges () {
    return this.collection.length !== this.initialPermissions
  },

  // can be triggered by container or view (depends which one is scrollable)
  // hint: debounce and arrow functions do not harmonize (undefined context)
  onScroll: _.debounce(function (e) {
    e.stopPropagation()
    // all drawn already
    if (this.limit >= this.collection.length) return
    const $list = $(e.target)
    const height = $list.outerHeight()
    const scrollTop = $list[0].scrollTop
    const scrollHeight = $list[0].scrollHeight
    const bottom = scrollTop + height
    if (bottom / scrollHeight < 0.80) return
    const requestAnimationFrame = window.requestAnimationFrame || window.setTimeout
    requestAnimationFrame(() => this.renderEntitiesChunk(this.limit))
  }, 50),

  onRemove () {
    // fill gap
    const chunksize = 1
    this.offset--
    this.renderEntitiesChunk(chunksize)
  },

  onReset () {
    this.offset = 0
    this.$el.empty()
    this.renderEntitiesChunk(this.limit)
  },

  render () {
    // extended permissions are mandatory now
    if (this.model.isExtendedPermission()) {
      this.collection.reset(this.model.getPermissions())
    } else {
      console.error('Extended permissions are mandatory', this)
    }
    return this
  },

  setPermissionPreSelectionView (view) {
    this.permissionPreSelection = view
  },

  renderEntitiesChunk (chunksize = this.limit) {
    if (this.offset >= this.collection.length) return this.$el.idle()
    this.$el.busy({ immediate: true })
    this.$el.append(
      this.collection.slice(this.offset, this.offset + chunksize).map((model) => {
        return new PermissionEntityView({ model, parentModel: this.model }).render().$el
      })
    )
    this.offset = this.offset + chunksize
    this.$el.idle()
    return this
  },

  renderEntity (model) {
    let bits = 0
    if (this.model.isFile()) {
      bits = fileRoles[this.permissionPreSelection.getSelectedPermission()]
    } else if (model.get('type') === 'guest' && /^(contacts|tasks)$/.test(this.model.get('module'))) {
      bits = roles.viewer.bit
      // only viewer role allowed, give a message if user preselected another role
      if (roles[this.permissionPreSelection.getSelectedPermission()].bit !== roles.viewer.bit) {
        yell('info', gt('Guests are only allowed to have viewer rights.'))
      }
    } else {
      bits = roles[this.permissionPreSelection.getSelectedPermission()].bit
    }

    model.set('bits', bits)

    const newEntity = new PermissionEntityView({ model, parentModel: this.model }).render().$el
    newEntity.find('.display_name').append($('<div class="added">').text(gt('ADDED')))
    return this.$el.prepend(newEntity)
  },

  revokeAll () {
    this.$el.find('a[data-name="revoke"]').trigger('click')
  }
})

function supportsPersonalShares (objModel) {
  const folderModel = objModel.getFolderModel()
  if (objModel.isAdmin() && folderModel.supportsInternalSharing()) return true
  if (folderModel.supportsInviteGuests()) return true
}

ext.point(POINT + '/entity').extend(
  //
  // Image
  //
  {
    index: 100,
    id: 'image',
    draw (baton) {
      const column = $('<div class="col-sm-1 col-xs-2 image">')
      const node = $('<span class="avatar">')

      if (baton.view.user) {
        // internal users and guests
        column.append(
          contactsAPI.pictureHalo(node, baton.view.user, { width: 40, height: 40 }, { lazyload: true })
        )
      } else {
        // groups and links
        column.append(
          node.addClass('group').append(
            createIcon(baton.model.get('type') === 'group' ? 'bi/people.svg' : 'bi/link.svg')
          )
        )
      }

      this.append(column)
    }
  },
  //
  // Display name and type
  //
  {
    index: 200,
    id: 'who',
    draw (baton) {
      const url = baton.model.get('share_url')

      this.append(
        $('<div class="col-sm-5 col-xs-10">').append(
          $('<div class="display_name">').append($('<div class="name">').append(
            baton.model.isUser() ? baton.model.getDisplayName(true) : $.txt(baton.model.getDisplayName()))
          ),
          $('<div class="description">').append(
            url ? $('<a href="" target="_blank">').attr('href', url).text(url) : $.txt(baton.view.description)
          )
        )
      )
    }
  },
  //
  // User identifier (not userid)
  //
  {
    index: 210,
    id: 'userid',
    draw (baton) {
      if (!baton.model.isUser()) return
      const node = this.find('.description:first')
      const mail = baton.model.getEmail()
      if (!mail) return
      const id = mail.split('@')[0]
      if (!id) return
      node.append(
        $('<span class="post-description">').text(' (' + id + ')')
      )
    }
  },

  //
  // Role dropdown
  //
  {
    index: 300,
    id: 'role',
    draw (baton) {
      let dropdown
      let role = baton.view.getRole()
      const description = baton.view.getRoleDescription(role)
      const isFile = baton.parentModel.isFile()
      const isOwner = baton.model.isOwner(baton.parentModel)
      const module = baton.parentModel.get('module')
      const supportsWritePrivileges = baton.model.isInternal() || !/^(contacts|tasks)$/.test(module)

      // apply role for the first time
      baton.model.set('role', role, { silent: true })

      const $el = $('<div class="col-sm-3 col-sm-offset-0 col-xs-4 col-xs-offset-2 role">')

      if (!baton.parentModel.isAdmin() || isOwner || !supportsWritePrivileges || baton.model.isAnonymous() || baton.model.get('deputyPermission')) {
        $el.text(description)
      } else {
        dropdown = new DropdownView({ el: $el.addClass('dropdown')[0], caret: true, label: description, title: gt('Current role'), model: baton.model, smart: true, buttonToggle: 'btn-link' })
          .option('role', 'viewer', () => {
            return [$.txt(gt('Viewer')), $.txt(' '), $('<small>').text('(' + gt('Read only') + ')')]
          })
          .option('role', 'reviewer', () => {
            return [$.txt(gt('Reviewer')), $.txt(' '), $('<small>').text('(' + gt('Read and write') + ')')]
          })
        if (!isFile) {
          // files cannot be deleted in file-based shares
          dropdown.option('role', 'author', () => {
            return [$.txt(gt('Author')), $.txt(' '), $('<small>').text('(' + gt('Read, write and delete') + ')')]
          })
        }
        if (baton.view.supportsAdminRole()) {
          dropdown.divider().option('role', 'administrator', gt('Administrator'))
        }
        // respond to changes
        baton.view.listenTo(baton.model, {
          change: _.debounce(model => {
            // just update the role - not the bits
            role = baton.view.getRole()
            model.set('role', role, { silent: true })
            // always update the drop-down label
            dropdown.$('.dropdown-label').text(baton.view.getRoleDescription(role))
          }, 10),
          'change:role': (model, value) => model.set('bits', isFile ? fileRoles[value] : roles[value].bit)
        })
        dropdown.render()
      }

      this.append($el)
    }
  },
  //
  // Detailed dropdown
  //
  {
    index: 400,
    id: 'detail-dropdown',
    draw (baton) {
      const model = baton.model
      const isAnonymous = model.isAnonymous()
      const module = baton.parentModel.get('module')
      const supportsWritePrivileges = model.isInternal() || !/^(contacts|tasks)$/.test(module)

      // not available for anonymous links or deputies(read-only)
      if (isAnonymous || baton.model.get('deputyPermission')) {
        this.append('<div class="col-sm-2 col-xs-4">')
        return
      }

      // simple variant for files
      if (baton.parentModel.isFile()) {
        // only fix invalid values
        const bits = model.get('bits')
        if (bits < 1 || bits > 4) model.set('bits', 1)
        this.append($('<div class="col-sm-2 col-xs-4 detail-dropdown">'))
        return
      }

      // take care of highest bit (64 vs 4 vs 2)
      const maxFolder = model.get('folder') === 64 ? 64 : 4
      const maxRead = model.get('read') === 64 ? 64 : 2
      const maxWrite = model.get('write') === 64 ? 64 : 2
      const maxDelete = model.get('delete') === 64 ? 64 : 2

      const dropdown = new DropdownView({ caret: true, keep: true, label: gt('Details'), title: gt('Detailed access rights'), model, smart: true, buttonToggle: 'btn-link' })
      //
      // FOLDER access
      //
        .group(gt('Folder'))
      // #. folder permissions
        .option('folder', 1, gt('View the folder'), { radio: true, group: true })
      // #. folder permissions
        .option('folder', 2, gt('Create objects'), { radio: true, group: true })
      // #. folder permissions
        .option('folder', maxFolder, gt('Create objects and subfolders'), { radio: true, group: true })
      //
      // READ access
      //
        .divider()
        .group(gt('Read permissions'))
      // #. object permissions - read
        .option('read', 0, gt('None'), { radio: true, group: true })
      // #. object permissions - read
        .option('read', 1, gt('Read own objects'), { radio: true, group: true })
      // #. object permissions - read
        .option('read', maxRead, gt('Read all objects'), { radio: true, group: true })
      //
      // WRITE access
      //
        .divider()
        .group(gt('Write permissions'))
      // #. object permissions - edit/modify
        .option('write', 0, gt('None'), { radio: true, group: true })
      // #. object permissions - edit/modify
        .option('write', 1, gt('Edit own objects'), { radio: true, group: true })
      // #. object permissions - edit/modify
        .option('write', maxWrite, gt('Edit all objects'), { radio: true, group: true })
      //
      // DELETE access
      //
        .divider()
        .group(gt('Delete permissions'))
      // #. object permissions - delete
        .option('delete', 0, gt('None'), { radio: true, group: true })
      // #. object permissions - delete
        .option('delete', 1, gt('Delete own objects'), { radio: true, group: true })
      // #. object permissions - delete
        .option('delete', maxDelete, gt('Delete all objects'), { radio: true, group: true })

      // add admin role?
      if (baton.view.supportsAdminRole()) {
        //
        // ADMIN role
        //
        dropdown
          .divider()
          .group(gt('Administrative role'))
        // #. object permissions - user role
          .option('admin', 0, gt('User'), { radio: true, group: true })
        // #. object permissions - admin role
          .option('admin', 1, gt('Administrator'), { radio: true, group: true })
      }

      dropdown.render()

      // disable all items if not admin or if not any write privileges
      if (!baton.parentModel.isAdmin() || !supportsWritePrivileges) {
        dropdown.$('li > a').addClass('disabled').prop('disabled', true)
      }

      this.append(
        $('<div class="col-sm-2 col-xs-4 detail-dropdown">').append(dropdown.$el)
      )
    }
  },
  //
  // Remove button
  //
  {
    index: 500,
    id: 'actions',
    draw (baton) {
      const isFolderAdmin = folderAPI.Bitmask(baton.parentModel.get('own_rights')).get('admin') >= 1
      if (!baton.parentModel.isAdmin()) return
      if (isFolderAdmin && baton.model.isOwner(baton.parentModel)) return

      if (baton.model.get('deputyPermission')) return

      const dropdown = new DropdownView({ label: createIcon('bi/three-dots.svg'), smart: true, title: gt('Actions'), buttonToggle: 'btn-link' })
      const type = baton.model.get('type')
      const myself = baton.model.isMyself()
      const isNew = baton.model.has('new')
      const isMail = baton.parentModel.get('module') === 'mail'

      switch (type) {
        case 'group':
          dropdown.link('revoke', isNew ? gt('Remove') : gt('Revoke access'))
          break
        case 'user':
        case 'guest':
          if (!myself && !isNew && !isMail) {
            dropdown.link('resend', gt('Resend invitation')).divider()
          }
          dropdown.link('revoke', isNew ? gt('Remove') : gt('Revoke access'))
          break
        case 'anonymous':
          dropdown.link('revoke', isNew ? gt('Remove') : gt('Revoke access'))
          break
                    // no default
      }

      this.append(
        $('<div class="col-sm-1 col-xs-2 entity-actions">').append(
          dropdown.render().$el
        )
      )
    }
  }
)

// Extension point who can access share
const POINT_DIALOG = 'io.ox/files/share/dialog'
ext.point(POINT_DIALOG + '/share-settings').extend({
  id: 'who-can-share',
  index: 100,
  draw (linkModel, baton) {
    let guid
    const dialog = baton.view
    const objModel = dialog.views.permissions.model
    const supportsPersonal = supportsPersonalShares(objModel)

    linkModel.set('access', linkModel.hasUrl() ? 1 : 0)

    let typeTranslations = {
      0: gt('Invited people only'),
      1: gt('Anyone with the link and invited people')
    }

    // link-only case
    if (!supportsPersonal) {
      typeTranslations = {
        0: gt('Listed people only'),
        1: gt('Anyone with the link and listed people')
      }
    }

    const select = $('<select class="form-control">')
    _(typeTranslations).each(function (val, key) {
      key = parseInt(key, 10)
      const option = $('<option>').val(key).text(val)
      if (key === linkModel.get('access')) {
        option.attr('selected', 'selected')
      }
      select.append(option)
    })
    // File linkModel.get('files')[0].get('filename')
    // Calendar linkModel.get('files')[0].get('module') === calendar
    let accessLabel
    const model = linkModel.get('files')[0]
    if (model.isFile()) {
      accessLabel = gt('Who can access this file?')
    } else if (model.get('module') === 'calendar') {
      accessLabel = gt('Who can access this calendar?')
    } else {
      accessLabel = gt('Who can access this folder?')
    }
    this.append(
      $('<div class="access-select">').append(
        $('<label>').attr({ for: guid = _.uniqueId('form-control-label-') }).text(accessLabel),
        $('<div class="row vertical-align-center">').append(
          $('<div class="form-group col-sm-6">').append(select.attr('id', guid))
        )
      )
    )

    select.on('change', e => { linkModel.set('access', parseInt(e.target.value, 10)) })
  }
})

// helper
function getBitsExternal (model) {
  return model.isFolder() ? 257 : 1
}

const that = {

  Permission,

  Permissions,

  // async / id is folder id
  showFolderPermissions (id, options) {
    const model = folderAPI.pool.getModel(id)
    const opt = Object.assign({
      hasLinkSupport: capabilities.has('share_links') && !model.is('mail') && model.isShareable()
    }, options)
    that.showByModel(new Backbone.Model({ id }), opt)
  },

  // async / obj must provide folder_id and id
  share (models, options) {
    if (!models) return

    if (options) {
      options = Object.assign({ share: true }, options)
    }
    that.showByModel(models[0], options)
  },

  showByModel (model, options) {
    const isFile = model.isFile ? model.isFile() : model.has('folder_id')
    model = new shareAPI.Model(isFile ? model.pick('id', 'folder_id') : model.pick('id'))
    setTimeout(() => ox.busy(true), 0)
    ox.load(() => new Promise(resolve => {
      model.loadExtendedPermissions({ cache: false })
        .done(() => that.show(model, options))
        // workaround: when we don't have permissions anymore for a folder a 'http:error:FLD-0003' is returned.
        // usually we have a handler in files/main.js for this case, but due to the current following conditions no yell is called
        // -> check if this handling should be changed later so that the FLD-0003' is handled globally
        .fail(error => yell(error))
        .always(() => resolve())
    }))
  },

  // to be more self explaining
  showShareDialog (model) {
    that.show(model, { share: true })
  },

  // traverse folders upwards and check if root folder is Public Files
  isPublic (model) {
    const id = model.isFolder() ? model.get('id') : model.get('folder_id')

    function checkFolder (id) {
      if (id === '15') { return true }
      if (id === '9' || id === '1' || id === '0' || id === undefined) { return false }

      const model = folderAPI.pool.getModel(id)
      const parentId = model && model.get('folder_id')

      return checkFolder(parentId)
    }

    return checkFolder(id)
  },

  show (objModel, options) {
    // folder tree: nested (allowlist) vs. flat
    const nested = folderAPI.isNested(objModel.get('module'))
    const notificationDefault = !this.isPublic(objModel)
    let title
    let guid

    // options must be given to modal dialog. Custom dev uses them.
    options = Object.assign({
      async: true,
      focus: '.form-control.tt-input',
      help: objModel.isAdmin() ? 'ox.appsuite.user.sect.dataorganisation.sharing.share.html' : undefined,
      title,
      smartphoneInputFocus: true,
      hasLinkSupport: false,
      nested,
      share: false
    }, options)

    let objectType
    if (objModel.get('module') === 'calendar') {
      objectType = gt('calendar')
    } else if (objModel.isFile()) {
      objectType = gt('file')
    } else {
      objectType = gt('folder')
    }

    options.title = options.title || (options.share
    // #. %1$s determines whether setting permissions for a file or folder
    // #. %2$s is the file or folder name
      ? gt('Share %1$s "%2$s"', (objModel.isFile() ? gt('file') : gt('folder')), objModel.getDisplayName())
      : gt('Permissions for %1$s "%2$s"', objectType, objModel.getDisplayName()))

    options.point = 'io.ox/files/share/permissions/dialog'

    const dialog = new ModalDialog(options)
    dialog.waiting = $.when()

    const DialogConfigModel = Backbone.Model.extend({
      defaults: {
        // default is true for nested and false for flat folder tree, #53439
        // do not share inbox subfolders, users will accidentally share all mail folders, see OXUIB-1001 and OXUIB-1093
        cascadePermissions: objModel.get('id') !== mailSettings.get('folder/inbox'),
        message: '',
        sendNotifications: notificationDefault,
        disabled: false
      },
      toJSON () {
        const data = {
          cascadePermissions: this.get('cascadePermissions'),
          notification: { transport: 'mail' }
        }
        if (dialogConfig.get('sendNotifications')) {
          // add personal message only if not empty
          // but always send notification!
          if (this.get('message') && $.trim(this.get('message')) !== '') {
            data.notification.message = this.get('message')
          }
        } else {
          delete data.notification
        }
        return data
      }
    })

    const dialogConfig = new DialogConfigModel()
    const permissionsView = new PermissionsView({ model: objModel })
    const publicLink = new PublicLink({ files: [objModel] })
    const permissionPreSelection = new PermissionPreSelection({ model: objModel })

    dialog.model = dialogConfig
    dialog.views = {
      permissions: permissionsView,
      preselection: permissionPreSelection,
      link: publicLink
    }

    dialog.$('.modal-content').addClass(supportsPersonalShares(objModel) ? 'supports-personal-shares' : '')

    permissionsView.setPermissionPreSelectionView(permissionPreSelection)
    if (options.hasLinkSupport && (capabilities.has('invite_guests') || capabilities.has('share_links'))) {
      const baton = new ext.Baton({ view: dialog, model: dialogConfig })
      ext.point(POINT_DIALOG + '/share-settings').invoke('draw', dialog.$body, publicLink.model, baton)
    }

    publicLink.model.on('change:access', model => {
      const accessMode = model.get('access')
      if (accessMode === 0) {
        publicLink.hide()
        publicLink.removeLink()
        dialog.waiting = publicLink.removeLink()
      } else {
        publicLink.show()
        publicLink.fetchLink()
      }
    })

    function hasNewGuests () {
      const oldGuests = dialogConfig.get('oldGuests') || []
      const knownGuests = oldGuests.filter(model => !!permissionsView.collection.get(model))
      return permissionsView.collection.where({ type: 'guest' }).length > knownGuests.length
    }

    permissionsView.listenTo(permissionsView.collection, 'reset', () => {
      dialogConfig.set('oldGuests', _.copy(permissionsView.collection.where({ type: 'guest' })))
    })

    permissionsView.listenTo(permissionsView.collection, 'add', () => dialog.showFooter())

    permissionsView.listenTo(permissionsView.collection, 'add remove', () => {
      updateSendNotificationSettings()
      dialog.$body.find('.file-share-options').toggle(!!permissionsView.collection.findWhere({ new: true }))
    })

    dialogConfig.on('change:message', () => updateSendNotificationSettings())

    function updateSendNotificationSettings () {
      // Allways send a notification message if a guest is added or some text is in the message box
      if (hasNewGuests() || (!_.isEmpty(dialogConfig.get('message')) && permissionsView.collection.length > 0)) {
        dialogConfig.set('sendNotifications', true)
        dialogConfig.set('disabled', true)
      } else if (dialogConfig.get('byHand') !== undefined) {
        dialogConfig.set('sendNotifications', dialogConfig.get('byHand'))
        dialogConfig.set('disabled', false)
      } else {
        dialogConfig.set('sendNotifications', notificationDefault)
        dialogConfig.set('disabled', false)
      }
    }

    function unshareRequested () {
      const confirmDialog = new ModalDialog({
        async: true,
        title: gt('Remove all shares')
      })
      confirmDialog
        .addCancelButton()
        .addButton({ label: gt('Remove shares'), action: 'ok' })
      confirmDialog.on('ok', () => {
        if (publicLink.hasPublicLink()) {
          // Remove all permissions and public link then trigger save.
          publicLink.removeLink().then(() => {
            revokeAllPermissions()
          }).fail(err => console.log(err))
        } else {
          revokeAllPermissions()
        }
        confirmDialog.close()
        dialog.pause()
      })
      confirmDialog.on('cancel', () => dialog.idle())
      confirmDialog.$body.append($('<h5>')).text(gt('Do you really want to remove all shares?'))
      confirmDialog.open()
    }

    function revokeAllPermissions () {
      permissionsView.revokeAll()
      dialog.trigger('save')
    }

    function isShared () {
      return (objModel.has('com.openexchange.share.extendedObjectPermissions') &&
                    objModel.get('com.openexchange.share.extendedObjectPermissions').length > 0) ||
                    (objModel.has('com.openexchange.share.extendedPermissions') &&
                    objModel.get('com.openexchange.share.extendedPermissions').length > 0) ||
                    publicLink.hasPublicLink()
    }

    // check if only deputy permissions are set (beside owner)
    function deputyShareOnly () {
      if (publicLink.hasPublicLink()) return false

      let shares = objModel.get('com.openexchange.share.extendedObjectPermissions') || objModel.get('com.openexchange.share.extendedPermissions') || []
      // filter shares that are deputy shares or myself
      shares = shares.filter(share => {
        const myself = share.entity === undefined ? isOwnIdentity(share.identifier) : share.entity === ox.user_id
        return !myself && !share.deputyPermission
      })
      // no shares left? -> all shares are either deputy shares or myself
      return shares.length === 0
    }

    if (objModel.isAdmin()) {
      dialog.$footer.prepend(
        $('<div class="form-group">').addClass(device('smartphone') ? '' : 'cascade').append(
          $('<button class="btn btn-default" aria-label="Unshare">').text(gt('Unshare'))
            .prop('disabled', !isShared() || deputyShareOnly())
            .on('click', unshareRequested)
        )
      )
    }

    dialog.$el.addClass('share-permissions-dialog')

    // to change privileges you have to be folder admin
    const supportsChanges = objModel.isAdmin()
    const folderModel = objModel.getFolderModel()

    // whether you can invite further people is a different question:
    // A. you have to be the admin AND (
    //   B. you can invite guests (external contacts) OR
    //   C. you are in a groupware context (internal users and/or groups)
    // )
    const supportsInvites = supportsChanges && folderModel.supportsInternalSharing()
    const supportsGuests = folderModel.supportsInviteGuests()

    if (options.hasLinkSupport || supportsInvites) {
      dialog.$header.append(
        createButton({ variant: 'unstyled', icon: { name: 'bi/gear.svg', title: gt('Sharing options'), className: 'bi-20' } })
          .addClass('settings-button')
          .on('click', () => {
            showSettingsDialog(
              new ShareSettingsView({
                model: publicLink,
                hasLinkSupport: options.hasLinkSupport,
                supportsPersonalShares: supportsPersonalShares(objModel),
                dialogConfig
              })
            )
          })
      )
    }

    if (options.hasLinkSupport) {
      dialog.$body.append(
        publicLink.render().$el
      )
    }

    if (supportsInvites) {
      /*
       * extension point for autocomplete item
       */
      ext.point(POINT + '/autoCompleteItem').extend({
        id: 'view',
        index: 100,
        draw (participant) {
          this.append(new ParticipantEntryView({
            model: participant,
            closeButton: false,
            halo: false,
            field: true
          }).render().$el)
        }
      })

      const module = objModel.get('module')
      const usePicker = !device('smartphone') && capabilities.has('contacts') && settingsContacts.get('picker/enabled', true)
      const click = (e, member) => {
        // build extended permission object
        const isInternal = /^(1|2)$/.test(member.get('type')) || member.has('user_id')
        const isGuest = !isInternal && member.get('type') === 5
        const obj = {
          bits: isInternal ? 4227332 : getBitsExternal(objModel), // Author : (Viewer for folders: Viewer for files)
          group: member.get('type') === 2,
          type: member.get('type') === 2 ? 'group' : 'user',
          new: true
        }
        if (isInternal) {
          obj.entity = member.has('user_id') ? member.get('user_id') : member.get('id')
        }
        obj.contact = member.toJSON()
        obj.display_name = member.getDisplayName()
        if (isGuest) {
          obj.type = 'guest'
          obj.contact_id = member.get('id')
          obj.folder_id = member.get('folder_id')
          obj.field = member.get('field')
          // guests don't have a proper entity id yet, so we have to check by email
          if (permissionsView.collection.isAlreadyGuest(obj)) return
        }
        permissionsView.collection.add(obj)
      }

      const typeaheadView = new Typeahead({
        apiOptions: {
          // mail does not support sharing folders to guests
          contacts: supportsGuests,
          users: true,
          groups: true
        },
        placeholder: gt('Name or email address'),
        harmonize (list) {
          if (!permissionsView.collection) return $.when([])
          const participants = list.map(data => new ParticipantModel(data))
            .filter(model => {
              // don't offer secondary addresses as guest accounts
              if (!supportsGuests && model.get('field') !== 'email1') return false
              // mail does not support sharing folders to guests
              if (module === 'mail' && model.get('field') !== 'email1') return false
              return !permissionsView.collection.get(model.id)
            })
          // wait for participant models to be fully loaded (autocomplete suggestions might have missing values otherwise)
          const defs = participants.map(model => model.get('loading'))
          return $.when.apply($, defs).then(() => participants)
        },
        click,
        extPoint: POINT
      })
      // do not share inbox subfolders, users will accidentally share all mail folders, see OXUIB-1001 and OXUIB-1093
      if (objModel.isFolder() && options.nested && objModel.get('id') !== mailSettings.get('folder/inbox')) {
        dialogConfig.set('cascadePermissions', true)
      }

      dialog.$body.append(
        // Invite people pane
        $('<div id="invite-people-pane" class="share-pane invite-people"></div>').append(
          // Invite people header
          $('<h5></h5>').text(gt('Invite people')),
          // Add address picker
          $('<div class="row vertical-align-center">').append(
            $('<div class="form-group col-sm-6">').append(
              $('<div class="input-group">').toggleClass('has-picker', usePicker).append(
                $('<label class="sr-only">', { for: guid = _.uniqueId('form-control-label-') }).text(gt('Start typing to search for user names')),
                typeaheadView.$el.attr({ id: guid }),
                usePicker
                  ? new AddressPickerView({
                    isPermission: true,
                    hideResources: true,
                    process: click,
                    useGABOnly: !supportsGuests
                  }).render().$el
                  : []
              )
            )
            // use delegate because typeahead's uses stopPropagation(); apparently not stopImmediatePropagation()
              .on('keydown blur', 'input', function addManualInput (e) {
                // mail does not support sharing folders to guests
                // so we skip any manual edits
                if (module === 'mail') return

                // skip manual edit if invite_guests isn't set
                if (!supportsGuests) return

                // enter or blur?
                if (e.type === 'keydown' && e.which !== 13) return

                // use shown input
                const value = $.trim($(this).typeahead('val'))
                const list = getAddresses(value)

                list.forEach(value => {
                  if (!value) return
                  const obj = {
                    bits: getBitsExternal(objModel),
                    contact: { email1: value },
                    type: 'guest',
                    new: true,
                    field: 'email1'
                  }
                  if (permissionsView.collection.isAlreadyGuest(obj)) return
                  // add to collection
                  permissionsView.collection.add(obj)
                })

                // clear input field
                $(this).typeahead('val', '')
              }),
            $('<div>').text(gt('Invite as: ')),
            permissionPreSelection.render().$el
          )
        ),

        $('<div class="file-share-options form-group">')
          .toggle(false)
          .append(
            $('<label>')
              .text(gt('Invitation message (optional)'))
              .attr({ for: guid = _.uniqueId('form-control-label-') }),
            // message text
            new TextView({
              name: 'message',
              model: dialogConfig
            })
              .render().$el.addClass('message-text')
              .attr({
                id: guid,
                rows: 3,
                // #. placeholder text in share dialog
                placeholder: gt('Message will be sent to all newly invited people')
              })
          )
      )

      typeaheadView.render()
    }

    if (supportsChanges) {
      // add action buttons
      dialog
        .addButton({ action: 'abort', label: gt('Cancel'), className: 'btn-default' })
        .addButton({ action: 'save', label: options.share ? gt('Share') : gt('Save') })
    } else {
      dialog
        .addButton({ action: 'cancel', label: gt('Close') })
    }

    function mergePermissionsAndPublicLink (permissions, entity, bits) {
      const existingEntity = _.findWhere(permissions, { entity })
      if (!existingEntity) {
        permissions.push({ bits, entity, group: false })
      }
      return permissions
    }

    function save (ignoreFolderWarnings) {
      $.when(dialog.waiting).always(function () {
        let changes
        let def
        const options = dialogConfig.toJSON()
        const entity = publicLink.model.get('entity')
        let permissions = permissionsView.collection.toJSON()
        // Order matters. Share must be called before the update call is invoked. Otherwise a file conflict is created.
        // publicLink.share().then(this.close, function () {
        publicLink.share().then(() => {
          if (entity && publicLink.hasChanges()) {
            permissions = mergePermissionsAndPublicLink(permissions, entity, objModel.isFolder() ? 257 : 1)
          }

          if (objModel.isFolder()) {
            if (ignoreFolderWarnings) {
              dialog.busy()
              options.ignoreWarnings = true
            }

            changes = { permissions }
            def = folderAPI.update(objModel.get('id'), changes, options)
          } else {
            changes = { object_permissions: permissions }
            def = filesAPI.update(objModel.pick('folder_id', 'id'), changes, options)
          }

          def.then(
            function success () {
            // refresh the guest group (id = int max value)
              groupAPI.refreshGroup(2147483647)
              objModel.reload().then(
                function reloadSuccess () {
                  dialog.close()
                  // we might have new addresses
                  contactsAPI.trigger('maybeNewContact')
                },
                function reloadError (error) {
                  dialog.idle()
                  yell(error)
                }
              )
            },
            function fail (error) {
              // Error if the user want share a folder with subfolders without permission
              if (objModel.isFolder() && onlyFolderPermissionWarnings(error)) {
                showShareFolderConflictsDialog()
              } else {
                dialog.idle()
                yell(error)
              }
            }
          )
        },
        (error) => {
          dialog.idle()
          yell(error)
        })
      })
    }

    function onlyFolderPermissionWarnings (error) {
      return error?.code === 'FLD-1038' && !_.find(error?.code?.warnings, warning =>
        warning?.code !== 'FLD-0099' && warning?.code !== 'FLD-0100'
      )
    }

    /**
     * Show conflicts dialog if the user want to share a folder with subfolders for which the user has no permissions.
     */
    function showShareFolderConflictsDialog () {
      const conflicts = {
        title: gt('Sharing folders without permissions'),
        warnings: [gt('Your are sharing one or more folders for which you do not have permissions. These folders will not be shared.')]
      }
      displayConflicts(conflicts, {
        callbackIgnoreConflicts: () => save(true),
        callbackCancel: () => dialog.close()
      })
    }

    dialog.on('save', save)

    // scroll happens on dialog body so call onScroll handler manually
    dialog.$body.on('scroll', e => permissionsView.onScroll(e))

    dialog.on('abort', () => {
      if (permissionsView.hasChanges() || publicLink.hasChanges()) {
        const confirmDialog = new ModalDialog({
          async: true,
          title: gt('Discard changes')
        })
        confirmDialog
          .addCancelButton()
          .addButton({ label: gt('Discard'), action: 'ok' })
        confirmDialog.on('ok', () => {
          publicLink.cancel()
          confirmDialog.close()
          dialog.close()
        })
        confirmDialog.on('cancel', () => {
          confirmDialog.close()
          dialog.idle()
        })
        dialog.pause()
        confirmDialog.$body.text(gt('Do you really want to discard all changes?'))
        confirmDialog.open()
      } else {
        dialog.close()
      }
    })

    // add permissions view
    const container = supportsInvites ? dialog.$body.find('#invite-people-pane') : dialog.$body
    container.append(
      permissionsView.$el.busy({
        empty: false,
        immediate: true
      })
    )

    dialog.on('open', function () {
      // wait for dialog to render and busy spinner to appear
      _.delay(function () {
        permissionsView.render()
        dialog.idle()
      }, 50)
    })
      .busy()
      .open()
  }
}

export default that
