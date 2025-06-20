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
import ext from '@/io.ox/core/extensions'
import extensions from '@/io.ox/mail/compose/actions/extensions'
import mailAPI from '@/io.ox/mail/api'
import yell from '@/io.ox/core/yell'

ext.point('io.ox/mail/compose/actions/save').extend(
  {
    id: 'check:attachment-empty',
    index: 100,
    perform: extensions.emptyAttachmentCheck
  },
  // Placeholder for Guard.  Guard actions for signature check at index 300
  {
    id: 'wait-for-pending-uploads',
    index: 200,
    // important: does changes in 'content' in case of pending uploads
    perform: extensions.waitForPendingUploads
  },
  {
    id: 'wait-for-pending-delete-requests',
    index: 250,
    perform: extensions.waitForPendingDeleteRequests
  },
  {
    id: 'remove-unused-inline-images',
    index: 300,
    perform: extensions.removeUnusedInlineImages
  },
  {
    id: 'check-for-auto-enabled-drive-mail',
    index: 400,
    perform: extensions.checkForAutoEnabledDriveMail({ yell: true, restoreWindow: true, stopPropagation: true, removeQueue: true })
  },
  {
    id: 'send',
    index: 1000,
    perform (baton) {
      return baton.model.saveDraft().then(function (res) {
        baton.data = {
          id: res.data.id,
          folder_id: res.data.folderId
        }
      })
    }
  },
  {
    id: 'error',
    index: 1100,
    perform (baton) {
      if (baton.error) {
        yell('error', baton.error)
        baton.stopPropagation()
        return new $.Deferred().reject(baton.error)
      }
    }
  },
  {
    id: 'reload',
    index: 1200,
    perform (baton) {
      const opt = baton.data
      switch (baton.model.get('contentType')) {
        case 'text/plain':
          opt.view = 'raw'
          break
        case 'text/html':
        case 'ALTERNATIVE':
          opt.view = 'html'
          break
        default:
          break
      }

      return mailAPI.get(opt).then(function (data) {
        baton.mail = data
      })
    }
  },
  {
    id: 'reloadError',
    index: 1300,
    perform (baton) {
      if (baton.error) {
        yell('error', baton.error)
        baton.stopPropagation()
        return new $.Deferred().reject(baton.error)
      }
    }
  }
)
