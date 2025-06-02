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
import yell from '@/io.ox/core/yell'
import strings from '@/io.ox/core/strings'

import capabilities from '@/io.ox/core/capabilities'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

function accumulate (attachmentCollection, type) {
  return attachmentCollection.map(function (m) {
    if (m.get('contentDisposition') !== type) return 0
    if (m.get('size') >= 0) return m.get('size')
    if (m.get('origin')) return (m.get('origin').file || {}).size || 0
    return 0
  }).reduce(function (m, n) { return m + n }, 0)
}

function checkQuota (model, file, inlineImageSize) {
  const list = file
  const properties = coreSettings.get('properties')
  const attachmentCollection = model.get('attachments')
  const accumulatedSizeOfAttached = accumulate(attachmentCollection, 'ATTACHMENT')
  const accumulatedSizeOfInline = accumulate(attachmentCollection, 'INLINE')
  let total = (accumulatedSizeOfAttached + accumulatedSizeOfInline) || 0
  const mailSize = model.get('content').replace(/src="data:image[^"]*"/g, '').length
  const autoPublish = capabilities.has('publish_mail_attachments')
  const useDrive = model.get('sharedAttachments').enabled
  const result = {}

  const maxFileSize = autoPublish ? -1 : properties.attachmentQuotaPerFile
  const quota = autoPublish ? -1 : properties.attachmentQuota
  const maxMailSize = autoPublish ? -1 : settings.get('compose/maxMailSize')
  inlineImageSize = inlineImageSize || 0

  if ((list && list.length) || inlineImageSize) {
    _.find(list, function (item) {
      const fileTitle = item.filename || item.name || item.subject
      const fileSize = item.file_size || item.size
      if (fileSize) {
        total += fileSize

        if (quota > 0 && total > quota) {
          result.error = gt('The file "%1$s" cannot be uploaded because it exceeds the total attachment size limit of %2$s', fileTitle, strings.fileSize(quota))
          result.reason = 'filesize'
          return true
        }

        if (maxFileSize > 0 && fileSize > maxFileSize) {
          result.error = gt('The file "%1$s" cannot be uploaded because it exceeds the maximum file size of %2$s', fileTitle, strings.fileSize(maxFileSize))
          result.reason = 'filesize'
          return true
        }

        if (autoPublish || useDrive) {
          if (properties.infostoreMaxUploadSize > 0 && fileSize > properties.infostoreMaxUploadSize) {
            result.error = gt('The file "%1$s" cannot be uploaded because it exceeds the attachment publication maximum file size of %2$s', fileTitle, strings.fileSize(properties.infostoreMaxUploadSize))
            result.reason = 'filesizeAutoPublish'
            return true
          }
        }
      }
    })
  }

  if ((autoPublish || useDrive) && properties.infostoreQuota > 0 && (accumulatedSizeOfAttached > (properties.infostoreQuota - (properties.infostoreUsage || 0)))) {
    result.error = gt('The attachment cannot be uploaded because it exceeds the infostore quota limit of %2$s', strings.fileSize(properties.infostoreQuota))
    result.reason = 'quotaAutoPublish'
    return true
  }

  total += inlineImageSize + mailSize - (useDrive ? accumulatedSizeOfAttached : 0)
  if (maxMailSize > 0 && total > maxMailSize) {
    if (model.changed && model.changed.sharedAttachments && model.changed.sharedAttachments.enabled === false) {
      result.error = gt('The uploaded attachment exceeds the maximum email size of %1$s', strings.fileSize(maxMailSize))
    } else {
      result.error = gt('The file cannot be uploaded because it exceeds the maximum email size of %1$s', strings.fileSize(maxMailSize))
    }
    result.reason = 'mailsize'
  }

  if (result.error) {
    yell('error', result.error)
    return false
  }
  return true
}

export default {
  checkQuota
}
