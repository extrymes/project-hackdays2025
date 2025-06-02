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
import gt from 'gettext'
import Backbone from '@/backbone'
import DisposableView from '@/io.ox/backbone/views/disposable'

import Attachments from '@/io.ox/core/attachments/backbone'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import Util from '@/io.ox/core/viewer/util'
import { ellipsis } from '@/io.ox/core/util'
import Picker from '@/io.ox/files/filepicker'
import capabilities from '@/io.ox/core/capabilities'
import strings from '@/io.ox/core/strings'
import filesAPI from '@/io.ox/files/api'
import mailAPI from '@/io.ox/mail/api'
import accountAPI from '@/io.ox/core/api/account'
import { createIcon } from '@/io.ox/core/components'
import { handleExceedingLimits, uploadAttachment, attachmentUploadHelper } from '@/io.ox/mail/compose/util'

import '@/io.ox/files/style.scss'

function isValidAttachment (attachment) {
  return attachment.filename && !/\.(pgp|asc)$/.test(attachment.filename)
}

function isAttached (attachment, model) {
  return !!model.get('attachments').models
    .find(a =>
      a.get('folderId') === attachment.get('folderId') &&
      a.get('mailId') === attachment.get('mailId') &&
      a.get('attachmentId') === attachment.get('attachmentId')
    )
}

// check if mail is encrypted by guard and there is no easy access to attachments
function isEncrypted (mail) {
  return !!(mail && (mail.security_info?.encrypted || mail.security?.decrypted))
}

function fallback (attachment, $preview) {
  const fileType = new filesAPI.Model(attachment.toJSON()).getFileType()
  const icon = Util.CATEGORY_ICON_MAP[fileType] || Util.CATEGORY_ICON_MAP.file

  $preview.append(createIcon(icon).addClass(`file-type-icon file-type-${fileType} bi bi-file-earmark-${fileType}`))
  $preview.removeClass('skeleton')
}

function imageIsLoaded (url) {
  const image = new Image()
  image.src = url
  return new Promise(resolve => {
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
  })
}

const UploadMenuView = DisposableView.extend({

  initialize (options) {
    this.listView = options.listView
    this.createFromSelection = options.createFromSelection
    this.collection = new Backbone.Collection()
    this.currentSelection = []
    this.recentMails = []
    this.dropdownAttachments = $()
  },

  render () {
    const $toggle = $('<a href="#" role="button" class="dropdown-toggle btn-unstyled" data-toggle="dropdown" tabindex="-1">')
      .attr('aria-label', gt('Add attachments'))
      .append(createIcon('bi/paperclip.svg'))
      .addActionTooltip(gt('Attachments'))

    this.dropdown = new Dropdown({
      tagName: 'li',
      attributes: {
        role: 'presentation',
        'data-extension-id': 'composetoolbar-menu'
      },
      dropup: true,
      $toggle
    })

    this.renderDropdownDefaults()
    this.listenTo(this.dropdown, 'open', () => this.updateDropdownAttachments(false))
    this.listenTo(this.model.get('attachments'), 'add remove', attachment => this.updateDropdownAttachments(true))

    if (this.createFromSelection) {
      this.currentSelection = this.listView.selection.get()
      this.getAttachmentsFromMail().then(() => this.addMailAttachment())
    }

    return this.dropdown.render().$el.addClass('attachments-dropdown')
  },

  renderDropdownDefaults () {
    // render standard attachment option: local
    let localInput
    this.dropdown
      .divider()
      .header(gt('Attachments'))
      .link(
        'local',
        gt('Add local file'),
        () => { this.addLocalAttachment() },
        {
          $el: localInput = $('<a href="#" draggable="false" role="menuitem" tabindex="-1">')
        }
      )
    localInput.parent().prepend(
      $('<input type="file" name="file">').css('display', 'none')
        .on('change', attachmentUploadHelper.bind(this, this.model))
        // multiple is off on smartphones in favor of camera roll/capture selection
        .prop('multiple', !_.device('smartphone'))
    )

    // render standard attachment option: drive
    if (capabilities.has('infostore')) {
      this.dropdown
        .link('drive', gt('Add from %1$s', gt.pgettext('app', 'Drive')), () => { this.addDriveAttachment() })
    }
  },

  updateDropdownAttachments (onAddOrRemove) {
    if (!this.listView) { return } // DOCS-5021

    const selection = this.listView.selection.get()

    const selected = selection.length > 0
    const selectedChanged = this.currentSelection.toString() !== selection.toString()
    const recent = selection.length === 0
    const recentChanges = this.listView.recentMails.filter(mail => this.recentMails.filter(recent => recent.id === mail.id && recent.folder_id === mail.folder_id).length === 0)
    const recentChanged = recentChanges.length > 0

    this.currentSelection = [].concat(selection)
    this.recentMails = [...this.listView.recentMails]

    if ((selected && selectedChanged) || (recent && (recentChanged || selectedChanged))) {
      this.resetDropdownAttachments()
      this.getAttachmentsFromMail().then(hasAttachments => {
        if (!hasAttachments) return
        this.renderDropdownAttachments()
        this.dropdown.resetDimensions().adjustBounds()
      })
    } else if (onAddOrRemove) {
      this.resetDropdownAttachments()
      this.renderDropdownAttachments()
    }
  },

  resetDropdownAttachments () {
    const $group = this.dropdown.$ul.find('.attachment-group')
    $group.prev().remove()
    $group.remove()
  },

  renderDropdownAttachments () {
    const mailSelected = this.currentSelection.length

    const attachments = this.collection.filter(attachment => !isAttached(attachment, this.model))
    if (attachments.length) {
      const text = mailSelected
        // #. Section title for a list of attachments of a selected mail
        ? gt('Files from selected email')
        // #. Section title for a list of attachments of most recently selected mails
        : gt('Most recent attachments')

      this.dropdown.$ul.prepend(
        $('<li class="dropdown-header" role="separator">').append(
          $('<span aria-hidden="true">').text(text)
        ),
        $('<ul role="group" class="list-unstyled attachment-group">').attr('aria-label', text)
      )

      if (mailSelected && attachments.length > 1) {
        this.dropdown.link(
          'mail',
          // #. Name of dropdown menu item to add all attachments to the mail in the current compose window
          gt('Add all attachments'),
          () => this.addMailAttachment(),
          { group: true }
        )
      }
    }

    // render attachment entries
    const maxAttachmentsCount = mailSelected ? this.collection.length : 15
    this.collection.slice(0, maxAttachmentsCount)
      .sort((a, b) => a.get('filename').localeCompare(b.get('filename')))
      .forEach((attachment) => {
        if (isAttached(attachment, this.model)) return

        attachment.set({
          mail: { folder_id: attachment.get('folderId'), id: attachment.get('mailId') },
          group: 'mail',
          id: attachment.get('attachmentId')
        })

        const $preview = $('<div class="preview">')
        this.renderPreview(attachment, $preview)
        let $title

        this.dropdown.link(
          `${attachment.get('folderId')}-${attachment.get('mailId')}-${attachment.get('id')}`,
          '',
          () => this.addMailAttachment(attachment),
          {
            $el: $('<a href="#" class="attachment" role="menuitem" tabindex="-1">').append(
              $preview,
              $('<div>').append(
                $('<div class="title">').attr('title', attachment.get('filename')).append(
                  $title = $('<div class="filename">')
                ),
                $('<div class="description">').text(`${strings.fileSize(attachment.get('size'))}`)
              )
            ),
            group: true
          }
        )

        $title.text(
          ellipsis(attachment.get('filename'), {
            fontSize: $title.css('font-size'),
            fontFamily: $title.css('font-family')
          })
        )
      })
  },

  async getAttachmentsFromMail () {
    let mailIds = []

    // get attachments from selected mail/thread or recent selected mails
    if (this.currentSelection && this.currentSelection.length) {
      let [folder, id] = this.currentSelection[0].split('.')
      let mailId

      // if threaded, search for last mail from thread
      if (this.listView.model.get('thread')) {
        async function getThread (useCache) {
          const { data } = await mailAPI.getAllThreads({}, useCache)
          const entry = data.find(entry => entry.thread.find(mail => mail.id === id))
          return entry?.id
        }

        mailId = await getThread(true)
        if (!mailId) mailId = await getThread(false)

        // overwrite "base" id of the thread with last received mail id of the thread
        id = mailId
      }

      mailIds.push({ folder, id })
    } else {
      mailIds = this.recentMails.reverse()
    }

    const mails = await Promise.all(mailIds.map(({ id, folder }) => mailAPI.get({ id, folder }).catch(() => { })))

    this.collection.reset(
      mails.filter(Boolean)
        .filter(mail => !isEncrypted(mail))
        .filter(mail => `draft.${mail.headers['X-OX-Composition-Space-Id']}` !== this.model.get('id'))
        .map(mail => {
          return mail.attachments
            .filter(isValidAttachment)
            .map(attachment => {
              return new Attachments.Model({
                ..._.pick(attachment, 'filename', 'size'),
                attachmentId: attachment.id,
                folderId: mail.folder_id,
                mailId: mail.id
              })
            })
        })
        .flat()
    )

    return true
  },

  addLocalAttachment () {
    $('<input type="file" name="file">').css('display', 'none')
      .on('change', attachmentUploadHelper.bind(this, this.model))
      // multiple is off on smartphones in favor of camera roll/capture selection
      .prop('multiple', !_.device('smartphone'))
      .trigger('click')
  },

  addDriveAttachment () {
    return new Picker({
      primaryButtonText: gt('Add'),
      cancelButtonText: gt('Cancel'),
      header: gt('Add attachments'),
      multiselect: true,
      createFolderButton: false,
      extension: 'io.ox/mail/mobile/navbar',
      uploadButton: true,
      filter: file =>
        !file.folder_id.match(/^maildrive:\/\/0/) || !accountAPI.is('drafts', file['com.openexchange.file.storage.mail.mailMetadata']?.folder)
    })
      .done(files => {
        this.trigger('aria-live-update', gt('Added %s to attachments.', files.map(file => file.filename).join(', ')))
        handleExceedingLimits(this.model, this.model.get('attachments'), files)
        const models = files.map(file => {
          const attachment = new Attachments.Model({ filename: file.filename })
          uploadAttachment({
            model: this.model,
            filename: file.filename,
            origin: { origin: 'drive', id: file.id, folderId: file.folder_id },
            attachment
          })
          return attachment
        })
        this.model.attachFiles(models)
      })
  },

  addMailAttachment (attachment) {
    const attachments = attachment ? [attachment] : this.collection

    const models = attachments.filter(attachment => !isAttached(attachment, this.model)).map(attachment => {
      const newAttachment = new Attachments.Model({ filename: attachment.get('filename') })
      uploadAttachment({
        model: this.model,
        filename: attachment.get('filename'),
        origin: { origin: 'mail', attachmentId: attachment.get('attachmentId'), id: attachment.get('mailId'), folderId: attachment.get('folderId') },
        attachment: newAttachment
      })

      // need to be set for duplicate check
      newAttachment.set({
        folderId: attachment.get('folderId'),
        mailId: attachment.get('mailId'),
        attachmentId: attachment.get('attachmentId')
      })

      return newAttachment
    })
    this.model.attachFiles(models)
  },

  renderPreview (attachment, $preview) {
    const url = attachment.previewUrl({ delayExecution: true })
    $preview.addClass('skeleton')

    function loadImage (url) {
      imageIsLoaded(url).then(isLoaded => {
        if (isLoaded) $preview.css('background-image', `url(${url})`).removeClass('skeleton').addClass('generated')
        else fallback(attachment, $preview)
      })
    }

    if (typeof url === 'string') loadImage(url)
    else if (url !== null) url().then(resolvedUrl => { loadImage(resolvedUrl) })
    else fallback(attachment, $preview)
  }
})

export default UploadMenuView
