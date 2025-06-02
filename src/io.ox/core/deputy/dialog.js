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
import DisposableView from '@/io.ox/backbone/views/disposable'
import mini from '@/io.ox/backbone/mini-views'
import AddParticipantView from '@/io.ox/participants/add'
import folderApi from '@/io.ox/core/folder/api'
import * as util from '@/io.ox/contacts/util'
import api from '@/io.ox/core/deputy/api'
import userApi from '@/io.ox/core/api/user'
import yell from '@/io.ox/core/yell'
import gt from 'gettext'

import { createIcon } from '@/io.ox/core/components'

import '@/io.ox/core/deputy/style.scss'

const permissions = {
  none: 0,
  viewer: 257,
  editor: 33025,
  author: 4227332
}
// permissions given to newly added deputies
const defaultPermissions = {
  mail: {
    permission: permissions.viewer,
    folderIds: [
      folderApi.getDefaultFolder('mail')
    ]
  },
  calendar: {
    permission: permissions.viewer,
    folderIds: [
      folderApi.getDefaultFolder('calendar')
    ]
  }
}
// some translation helpers
const moduleMap = {
  mail: gt('Inbox'),
  calendar: gt('Calendar')
}
const permissionMap = {
  0: gt('None'),
  257: gt('Viewer'),
  33025: gt('Editor'),
  4227332: gt('Author')
}

function getPermissionText (model) {
  const parts = _(_(['mail', 'calendar', 'contacts', 'drive', 'tasks']).map(function (module) {
    if (!model.get('modulePermissions')[module]) return ''
    // #. String that is used to describe permissions
    // #. %1$s name of module (mail, calendar etc)
    // #. %2$s the granted role (author, editor, viewer, none)
    return gt('%1$s (%2$s)', moduleMap[module], permissionMap[model.get('modulePermissions')[module].permission])
  })).compact()

  if (model.get('sendOnBehalfOf')) parts.unshift(gt('Allowed to send emails on your behalf'))
  return parts.join(', ')
}

function openEditDialog (model) {
  const prevValues = {
    sendOnBehalfOf: model.get('sendOnBehalfOf'),
    modulePermissions: model.get('modulePermissions')
  }

  const editDialog = new ModalDialog({
    // #. %1$s name of the deputy
    title: gt('Deputy: %1$s', util.getFullName(model.get('userData').attributes, false))
  })
    .build(function () {
      // temp models for the selectboxes since the cannot work with the nested attributes directly
      function getTempModel (module) {
        const tempModel = new Backbone.Model({ permission: model.get('modulePermissions')[module].permission })
        // sync to main model
        tempModel.on('change:permission', function (obj, value) {
          const permissions = model.get('modulePermissions')
          permissions[module].permission = value
          model.set('modulePermissions', permissions)
        })
        return tempModel
      }

      this.$body.append(
        $('<div>').text(gt('The deputy has the following permissions')),
        model.get('modulePermissions').mail
          ? [$('<div class="select-container">').append(
              $('<label for="inbox-deputy-selector">').text(moduleMap.mail),
              new mini.SelectView({
                id: 'inbox-deputy-selector',
                name: 'permission',
                model: getTempModel('mail'),
                list: [
                  { value: permissions.none, label: gt('None') },
                  { value: permissions.viewer, label: gt('Viewer (read emails)') },
                  // do these roles make any sense? Is this only for drafts?
                  { value: permissions.editor, label: gt('Editor (create/edit emails)') },
                  { value: permissions.author, label: gt('Author (create/edit/delete emails)') }
                ]
              }).render().$el
            ),
            new mini.CustomCheckboxView({ id: 'send-on-behalf-checkbox', name: 'sendOnBehalfOf', label: gt('Deputy can send emails on your behalf'), model }).render().$el]
          : '',
        model.get('modulePermissions').calendar
          ? $('<div class="select-container">').append(
            $('<label for="calendar-deputy-selector">').text(moduleMap.calendar),
            new mini.SelectView({
              id: 'calendar-deputy-selector',
              name: 'permission',
              model: getTempModel('calendar'),
              list: [
                { value: permissions.none, label: gt('None') },
                { value: permissions.viewer, label: gt('Viewer (view appointments)') },
                { value: permissions.editor, label: gt('Editor (create/edit appointments)') },
                { value: permissions.author, label: gt('Author (create/edit/delete appointments)') }
              ]
            }).render().$el
          )
          : ''
      ).addClass('deputy-permissions-dialog')
    })

  // cannot remove models without deputy id (they are not saved on the server yet)
  if (model.get('deputyId')) editDialog.addButton({ className: 'btn-default pull-left', label: gt('Remove'), action: 'remove' })

  editDialog.addCancelButton()
    .addButton({ className: 'btn-primary', label: gt('Save'), action: 'save' })
    .on('cancel', function () {
      // cancel on a model that was not saved means we should remove it from the list
      if (model.get('deputyId') === undefined) {
        model.collection.remove(model)
        return
      }
      model.set(prevValues)
    })
    .on('save', function () {
      // triggers redraw of the list. Listeners on each model change would redraw too often
      model.collection.trigger('reset')
      if (model.get('deputyId') === undefined) {
        api.create(model).then(function (data) {
          // MW generated a deputyId. Add it here
          model.set('deputyId', data.deputyId)
        }).fail(function () {
          yell('error', gt('Could not create deputy.'))
          model.collection.remove(model)
        })
        return
      }
      api.update(model).fail(function () {
        yell('error', gt('Could not update deputy permissions.'))
        model.set(prevValues)
      })
    })
    .on('remove', function () {
      openConfirmRemoveDialog(model)
    })
    .open()
}

function openConfirmRemoveDialog (model) {
  new ModalDialog({
    // #. %1$s name of the deputy
    title: gt('Remove deputy %1$s', util.getFullName(model.get('userData').attributes, false))
  })
    .build(function () {
      this.$body.append(
        // #. %1$s name of the deputy
        $('<div>').text(gt('Do you want to remove %1$s from your deputy list?', util.getFullName(model.get('userData').attributes, false)))
      )
    })
    .addCancelButton()
    .addButton({ className: 'btn-primary', label: gt('Remove'), action: 'remove' })
    .on('remove', function () {
      api.remove(model).then(function () {
        model.collection.remove(model)
      }).fail(function () {
        yell('error', gt('Could not remove deputy.'))
      })
    })
    .open()
}

const DeputyListView = DisposableView.extend({

  events: {
    'click .remove': 'removeDeputy',
    'click .edit': 'showPermissions'
  },

  tagName: 'ul',
  className: 'deputy-list-view list-unstyled',

  initialize (options) {
    options = options || {}
    this.collection = new Backbone.Collection(options.deputies)
    this.collection.on('add reset remove', this.render.bind(this))
  },
  render () {
    this.$el.attr('role', 'list').empty()

    if (this.collection.length === 0) this.$el.append($('<li class="empty-message" role="listitem">').append(gt('You have currently no deputies assigned.') + '<br/>' + gt('Deputies can get access to your Inbox and Calendar.')))

    this.collection.each(this.renderDeputy.bind(this))
    return this
  },
  renderDeputy (deputy) {
    const user = deputy.get('userData')
    const name = util.getFullName(user.attributes, true)
    const initials = util.getInitials(user.attributes)
    const userPicture = user.get('image1_url')
      ? $('<i class="user-picture" aria-hidden="true">').css('background-image', 'url(' + util.getImage(user.attributes) + ')')
      : $('<div class="user-picture initials" aria-hidden="true">').text(initials)

    this.$el.append(
      $('<li role="listitem">').attr('data-id', user.get('id')).append(
        $('<div class="flex-item">').append(
          userPicture,
          $('<div class="data-container">').append(
            $('<div class="name">').append(name),
            $('<div class="permissions">').text(getPermissionText(deputy))
          )
        ),
        $('<div class="flex-item">').append(
          $('<button class="btn btn-link edit">').attr('data-cid', deputy.cid).text(gt('Edit')),
          $('<button class="btn btn-link remove">').attr({ 'aria-label': gt('Remove'), 'data-cid': deputy.cid }).append(createIcon('bi/trash.svg').attr('title', gt('Remove')))
        )
      )
    )
  },
  removeDeputy (e) {
    e.stopPropagation()
    const model = this.collection.get(e.currentTarget.getAttribute('data-cid'))
    if (!model) return
    openConfirmRemoveDialog(model)
  },
  showPermissions (e) {
    const model = this.collection.get(e.currentTarget.getAttribute('data-cid'))
    if (!model) return

    openEditDialog(model)
  }
})

// special collection that can handle contact and user data and find duplicated users
const UserContactCollection = Backbone.Collection.extend({
  modelId (attrs) {
    // return user id if this is a contact model, return id if this is a user model
    return attrs.user_id || attrs.id
  }
})

function openDialog () {
  new ModalDialog({
    point: 'io.ox/core/deputy/dialog',
    title: gt('Manage deputies'),
    help: 'ox.appsuite.user.sect.dataorganisation.deputy.add.html',
    width: 640
  })
    .build(function () {
      const self = this
      // collection to store userdata
      const userCollection = new UserContactCollection()

      this.$body.addClass('deputy-dialog-body').busy()
      $.when(api.getAll(), api.getAvailableModules()).then(function (deputies, availableModules) {
        const availablePermissions = { modulePermissions: _(defaultPermissions).pick(availableModules) }
        if (_(availableModules).contains('mail')) availablePermissions.sendOnBehalfOf = false

        // index 0 is data, index 1 is timestamp
        deputies = deputies[0]
        const defs = _(deputies).map(function (deputy) {
          // fill in incomplete data
          if (!deputy.modulePermissions) deputy.modulePermissions = {}
          _(_(defaultPermissions).keys()).each(function (module) {
            if (!deputy.modulePermissions[module] && _(availableModules).contains(module)) deputy.modulePermissions[module] = { permission: permissions.none, folderIds: [folderApi.getDefaultFolder(module)] }
          })

          return userApi.get({ id: deputy.userId }).then(function (data) {
            userCollection.add(data)
            deputy.userData = userCollection.get(data)
          }).fail(function (error) {
            console.warn('Error while getting deputy user data!', deputy, error)
            // invalid user etc. Remove from the list so we can still show the rest
            deputies = _(deputies).reject(function (item) { return item.deputyId === deputy.deputyId })
          })
        })

        $.when.apply($, defs).always(function () {
          self.$body.idle()
          // since this is async modal dialog may think the body is empty and adds this class
          self.$el.removeClass('compact')
          self.deputyListView = new DeputyListView({ deputies })
          self.$body.append(
            new AddParticipantView({
              apiOptions: {
                users: true
              },
              placeholder: gt('Add people'),
              collection: userCollection,
              scrollIntoView: true,
              useGABOnly: true,
              selection: { behavior: 'single' }
            }).render().$el,
            self.deputyListView.render().$el
          )

          self.$body.find('input.add-participant').focus()

          userCollection.on('add', function (user) {
            // you cannot be your own deputy
            // external contacts are not allowed (no id)
            // addresspicker sends contact data, autocomplete sends user data
            const id = user.get('user_id') || user.get('id')
            if (!id || id === ox.user_id) {
              // remove from collection. no need to redraw
              userCollection.remove(user, { silent: true })
              return
            }
            const deputy = _.extend({}, availablePermissions, { userId: id, userData: user })
            const model = self.deputyListView.collection.add(deputy)

            openEditDialog(model)
          })

          // deputy removed? remove from user collection as well
          self.deputyListView.collection.on('remove', function (deputy) {
            userCollection.remove(deputy.get('userId'))
          })
        })
      }).fail(function (error) {
        console.error(error)
        // #. Generic error message when something when wrong on the server while fetching data about your deputies
        yell('error', gt('Could not load deputy data.'))
        self.close()
      })
    })
    .addButton({ className: 'btn-primary', label: gt('Close'), action: 'cancel' })
    .open()
}

export default {
  open: openDialog
}
