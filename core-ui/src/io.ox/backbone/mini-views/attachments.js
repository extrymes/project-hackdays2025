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

import Backbone from 'backbone'
import AbstractView from '@/io.ox/backbone/mini-views/abstract'
import attachmentAPI from '@/io.ox/core/api/attachment'
import FilePicker from '@/io.ox/files/filepicker'
import strings from '@/io.ox/core/strings'
import yell from '@/io.ox/core/yell'

import { hasFeature } from '@/io.ox/core/feature'
import { settings } from '@/io.ox/core/settings'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

export const AttachmentCollection = Backbone.Collection.extend({
  parse (file) {
    return {
      file,
      action: 'upload',
      filename: file.name,
      file_mimetype: file.type,
      file_size: file.size,
      cid: _.uniqueId('unique-')
    }
  }
})

export const AttachmentListView = AbstractView.extend({

  tagName: 'ul',
  className: 'attachment-list list-unstyled',

  events: {
    'click .attachment .remove-attachment': 'onDelete'
  },

  setup () {
    this.apiOptions = {
      module: this.options.module,
      id: this.model.get('id'),
      folder: this.model.get('folder') || this.model.get('folder_id')
    }

    // create and restore case
    this.key = `${this.apiOptions.module}:${_.cid({
      folder_id: this.model.get('folder') || this.model.get('folder_id'),
      id: this.model.get('id') || _.uniqueId('placeholder_')
    })}`
    this.listenTo(this.model, 'change:id', () => {
      attachmentAPI.setCompleted(this.key)
      this.key = `${this.apiOptions.module}:${_.cid(this.model.toJSON())}`
      this.apiOptions.id = this.model.get('id')
      this.updateState()
    })

    this.listenTo(this.collection, 'remove reset change:action', this.updateState)
    this.listenTo(this.collection, 'add', _.debounce(this.updateState, 100))
    this.listenTo(this.model, 'change:id', this.onRestore)

    // reuse/lazyload support
    if (!this.apiOptions.id) return

    this.getAll()
  },

  render () {
    const lastFocused = this.getFocussed()
    const lastIndex = this.$el.children('.attachment').index(lastFocused)

    this.$el.empty().append(
      this.collection.map(model => {
        if (model.get('action') === 'delete') return $()
        const size = model.get('file_size') > 0 ? strings.fileSize(model.get('file_size'), 0) : '\u00A0'
        return $(`<li class="attachment flex-row zero-min-width" data-cid="${model.cid}">`).append(
          $('<div class="file flex-row flex-grow zero-min-width rounded py-8 px-12">').append(
            // no template string here because filename is user content and could cause XSS
            $('<div class="filename ellipsis flex-grow">').attr('title', model.get('filename')).text(model.get('filename')),
            $('<div class="filesize text-gray pl-4">').text(size)
          ),
          $('<button type="button" class="btn btn-link remove-attachment">')
            // #. %1$s is attachment file name
            .attr('title', gt('Remove attachment "%1$s"', model.get('filename')))
            .attr('data-filename', model.get('filename'))
            .append(createIcon('bi/dash-circle.svg').addClass('text-xl'))
        )
      })
    )

    this.restoreFocus(lastIndex)
    return this
  },

  getFocussed () {
    if (!$.contains(this.el, document.activeElement)) return -1
    if (!document.activeElement.classList.contains('remove-attachment')) return -1
    return document.activeElement.closest('.attachment')
  },

  restoreFocus (lastFocusIndex) {
    if (lastFocusIndex < 0 || this.$el.is(':empty')) return
    const nodes = this.$('.attachment .remove-attachment')
    const next = nodes[lastFocusIndex]
    const prev = nodes[lastFocusIndex - 1]
    return (next || prev || $()).focus()
  },

  // support for reuse/lazyload
  onRestore () {
    this.apiOptions.id = this.model.get('id')
    this.getAll()
  },

  getAll () {
    // send correct folder with api request when folder got changed in appointment dialog (see OXUIB-2264)
    const apiOptions = { ...this.apiOptions }
    if (this.model.get('folder')) apiOptions.folder = this.model.get('folder')
    return attachmentAPI.getAll(apiOptions).then(attachments => {
      this.collection.reset(attachments)
      attachmentAPI.setCompleted(this.key)
    }, error => yell(error))
  },

  checkQuota () {
    const max = settings.get('properties/attachmentMaxUploadSize', 0)
    const size = this.collection.reduce((acc, model) => {
      if (!model.has('file') || !model.get('file_size')) return acc
      return acc + model.get('file_size')
    }, 0)

    if (max <= 0 || size <= max) return this.model.unset('quotaExceeded')
    this.model.set('quotaExceeded', { actualSize: size, attachmentMaxUploadSize: max })
  },

  updateState () {
    const hasPending = !!this.collection.findWhere({ action: 'upload' })
    // track pending attachments
    if (hasPending) attachmentAPI.setPending(this.key)
    else attachmentAPI.setCompleted(this.key)
    this.checkQuota()
    this.render()
  },

  onDelete (e) {
    e.preventDefault()
    const node = $(e.currentTarget).closest('.attachment')
    const model = this.collection.get(node.attr('data-cid'))
    if (model.has('file')) return this.collection.remove(model)
    model.set('action', 'delete')
  },

  async save () {
    const model = this.model
    const collection = this.collection
    const errors = []
    const deferreds = []

    const attachmentsToDelete = this.collection.where({ action: 'delete' })
    if (attachmentsToDelete.length) {
      deferreds.push(
        attachmentAPI.remove(this.apiOptions, attachmentsToDelete.map(attachment => attachment.get('id')))
          .fail(e => errors.push(e))
          .always(() => attachmentsToDelete.forEach(model => model.unset('action')))
      )
    }

    const attachmentsToAdd = this.collection.where({ action: 'upload' })
    const attachmentsToReference = this.collection.where({ action: 'reference' })
    if (attachmentsToAdd.length || attachmentsToReference.length) {
      const files = attachmentsToAdd.map(model => model.get('file'))
      const references = attachmentsToReference.map(model => { return { uri: `${model.get('origin')}://${model.get('origin_id')}` } })
      deferreds.push(
        attachmentAPI.create(this.apiOptions, files, references)
          .fail(e => errors.push(e))
          .always(() => attachmentsToAdd.forEach(model => model.unset('action')))
      )
    }

    // convert to native promises
    await Promise.allSettled(deferreds.map(deferred => { return Promise.resolve(deferred) }))

    if (errors.length) yell('error', errors.map(error => error.error).join('\n'))
    attachmentAPI.setCompleted(this.key)
    attachmentAPI.trigger(`synced:${this.key}`)
    // for contacts
    model.trigger('refresh')
    collection.reset()
  }
})

export const AttachmentUploadView = Backbone.View.extend({

  events: {
    'click button': 'onClick',
    'change input[type="file"]': 'onChange',
    'focus input': 'onFocusChange',
    'blur input': 'onFocusChange'
  },

  initialize (opt) {
    this.$el.attr('data-add', 'attachment').addClass('fileupload add-local-file mr-8')
    this.options = Object.assign({
      buttontext: gt('Add attachment'),
      multi: true,
      icon: ''
    }, opt)
  },

  onChange (e) {
    const input = $(e.target)
    const list = [...input[0].files]
    const collection = this.collection
    list.forEach(file => collection.add(file, { parse: true }))
    // WORKAROUND "bug" in Chromium (no change event triggered when selecting the same file again)
    input[0].value = ''
    input.trigger('reset.fileupload')
  },

  onFocusChange (e) {
    // redirect focus style of input to wrapping button
    this.$('button').toggleClass('active', e.type === 'focusin')
  },

  onClick (e) {
    if (!$(e.target).is('button')) return
    e.preventDefault()
    this.$('input').trigger('click')
    this.$('button').focus()
  },

  render () {
    const id = _.uniqueId('form-control-label-')
    this.$el.append(
      $(`<button type="button" id="${id}" class="btn btn-default btn-file">`).text(this.options.buttontext),
      $(`<input name="file" type="file" class="file-input hidden" aria-hidden="true" aria-labelledby="${id}" ${this.options.multi ? 'multiple="true"' : ''} tabindex="-1">`)
    )
    return this
  }
})

export const AttachmentDriveUploadView = Backbone.View.extend({

  className: 'add-from-storage mr-8',

  events: {
    'click button': 'onClick'
  },

  onClick (e) {
    e.preventDefault()
    new FilePicker({
      primaryButtonText: gt('Add'),
      cancelButtonText: gt('Cancel'),
      header: gt('Add file'),
      multiselect: true,
      createFolderButton: false,
      extension: 'io.ox/mail/mobile/navbar',
      uploadButton: true
    })
      .then((references) => {
        this.collection.add(references.map(ref => {
          return {
            action: 'reference',
            filename: ref.filename,
            file_mimetype: ref.file_mimetype,
            file_size: ref.file_size,
            origin: ref.source,
            origin_id: ref.id,
            origin_folder_id: ref.folder_id
          }
        }))
      })
  },

  render () {
    if (!hasFeature('attachFromDrive')) return this
    this.$el.append(
      $('<button type="button" class="btn btn-default btn-file" data-action="add-internal">').text(
        // #. Used as button label when adding an attachment from the 'drive' app
        // #. %1$s: name of 'drive' app
        gt('Add from %1$s', gt.pgettext('app', 'Drive'))
      )
    )
    return this
  }
})

export const getAttachmentWidget = (model, options) => {
  const collection = new AttachmentCollection()
  return {
    collection,
    list: new AttachmentListView(Object.assign({ collection, model }, options)),
    upload: new AttachmentUploadView({ collection, model }),
    drive: new AttachmentDriveUploadView({ collection, model })
  }
}
