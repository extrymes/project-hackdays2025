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
import composeAPI from '@/io.ox/mail/compose/api'
import resize from '@/io.ox/mail/compose/resize'
import capabilities from '@/io.ox/core/capabilities'
import quotaAPI from '@/io.ox/core/api/quota'
import Attachments from '@/io.ox/core/attachments/backbone'
import attachmentQuota from '@/io.ox/mail/actions/attachmentQuota'
import yell from '@/io.ox/core/yell'
import gt from 'gettext'

import { createIcon } from '@/io.ox/core/components'
import { settings } from '@/io.ox/mail/settings'
import { settings as fileSettings } from '@/io.ox/files/settings'

export function uploadAttachment (opt) {
  const model = opt.model
  const space = model.get('id')
  const contentDisposition = (opt.contentDisposition || 'attachment').toLowerCase()
  const attachment = opt.attachment
  let data = opt.origin
  let def
  const instantAttachmentUpload = settings.get('features/instantAttachmentUpload', true) || contentDisposition === 'inline'

  function initPendingUploadingAttachments () {
    model.pendingUploadingAttachments = model.pendingUploadingAttachments.catch(_.constant()).then((function () {
      const def = new $.Deferred()

      attachment.once('upload:complete', def.resolve)
      attachment.once('upload:aborted', def.resolve)
      attachment.once('upload:failed', def.reject)

      return _.constant(def)
    })())
  }

  function process () {
    if (!data) return
    if (instantAttachmentUpload === false) return

    initPendingUploadingAttachments()

    def = composeAPI.space.attachments[attachment.has('id') ? 'update' : 'add'](space, data, contentDisposition, attachment.get('id'))
    data = undefined

    attachment.set('uploaded', 0)

    return def.progress(function (e) {
      attachment.set('uploaded', Math.min(e.loaded / e.total, 0.999))
    }).then(function success (data) {
      if (attachment.destroyed) {
        const attachmentDef = composeAPI.space.attachments.remove(model.id, data.id)
        model.pendingDeletedAttachments = model.pendingDeletedAttachments.catch(_.constant()).then(function () {
          return attachmentDef
        })
      }
      data = _({ group: 'mail', space, uploaded: 1 }).extend(data)
      attachment.set(data)
      // trigger is important, extension point cascade on save needs it to resolve or fail correctly.
      attachment.trigger('upload:complete', data)
    }, function fail (error) {
      if (error.error === 'abort') return attachment.trigger('upload:aborted')
      attachment.destroy()
      // trigger is important, extension point cascade on save needs it to resolve or fail correctly.
      attachment.trigger('upload:failed', error)
      // yell error, magically disappearing attachments are bad ux (some quota errors can even be solved by users)
      yell(error)
    }).always(function () {
      delete attachment.done
      process()
    })
  }

  // is handled either when user removes the attachment or composition space is discarded
  attachment.on('destroy', function () {
    data = undefined
    this.destroyed = true
    if (def && def.state() === 'pending' && !fileSettings.get('uploadSpooling')) def.abort()
    else if (!def) attachment.trigger('upload:aborted')
  })
  attachment.done = def

  if (data.file && contentDisposition === 'attachment') {
    attachment.set({
      group: 'localFile',
      originalFile: data.file
    })
    const isResizableImage = resize.matches('type', data.file) &&
                  resize.matches('size', data.file) &&
                  instantAttachmentUpload !== false

    if (isResizableImage) {
      attachment.set('uploaded', 0)

      attachment.on('image:resized', function (image) {
        // only abort when uploaded is less than 1. Otherwise, the MW might not receive the abort signal in time
        if (def && def.state() === 'pending' && attachment.get('uploaded') < 1 && attachment.id) def.abort()

        data = { file: image }
        if (!def) return

        def.always(function () {
          _.defer(process)
        })
      })

      attachment.on('force:upload', process)

      initPendingUploadingAttachments()
      return _.delay(process, 5000)
    }
  }

  return _.defer(process)
}

// helper function used by upload local file and drag and drop
// manages a11y messages and makes a quota check before the file is uploaded
export function attachmentUploadHelper (model, files) {
  // also support events
  files = files.target ? files.target.files : files

  if (attachmentQuota.checkQuota(model, files)) {
    // #. %s is a list of filenames separated by commas
    // #. it is used by screen readers to indicate which files are currently added to the list of attachments
    this.trigger('aria-live-update', gt('Added %s to attachments.', _(files).map(file => file.name).join(', ')))
    const models = _(files).map(file => {
      const attachment = new Attachments.Model({ filename: file.name, origin: { file } })
      uploadAttachment({
        model,
        filename: file.filename,
        origin: { file },
        attachment
      })
      return attachment
    })
    model.attachFiles(models)
  }
}

export function handleExceedingLimits (model, attachments, files) {
  const result = {}
  const sharedAttachments = model.get('sharedAttachments') || {}
  const isSharingEnabled = !_.device('smartphone') && settings.get('compose/shareAttachments/enabled', false) && capabilities.has('infostore')
  const needsAction = isSharingEnabled && (exceedsMailQuota(attachments, files) || exceedsThreshold(attachments))

  if (!needsAction || sharedAttachments.enabled) return

  // #. %1$s is usually "Drive Mail" (product name; might be customized)
  result.error = gt('Mail quota limit reached. You have to use %1$s or reduce the mail size in some other way.', settings.get('compose/shareAttachments/name'))

  if (isSharingEnabled && needsAction && !sharedAttachments.enabled) {
    model.set('sharedAttachments', _.extend({}, sharedAttachments, { enabled: true }))
  }
  yell('info', result.error)
}

export function accumulate (list) {
  return list.reduce((memo, item) => {
    if (!item) return memo
    // duck check
    const model = typeof item.get === 'function' ? item : undefined
    if (!model) return memo + (item.file_size >= 0 ? item.file_size : 0)
    if (model.get('contentDisposition') === 'INLINE') return memo
    if (model.get('origin') === 'VCARD') return memo
    return memo + model.getSize()
  }, 0)
}

export function exceedsMailQuota (attachments, files) {
  const actualAttachmentSize = (accumulate([].concat(attachments, files))) * 2
  const mailQuota = quotaAPI.mailQuota.get('quota')
  const use = quotaAPI.mailQuota.get('use')
  if (mailQuota === -1 || mailQuota === -1024) return false
  return actualAttachmentSize > mailQuota - use
}

export function exceedsThreshold (attachments) {
  const threshold = settings.get('compose/shareAttachments/threshold', 0)
  return threshold > 0 && accumulate([...attachments]) > threshold
}

export function infoLine (opt) {
  return $('<div class="info-line">').append(
    opt.icon ? createIcon(opt.icon) : $(),
    $('<span class="text">').text(opt.text)
  )
}
