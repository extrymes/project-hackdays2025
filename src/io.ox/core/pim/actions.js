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
import ox from '@/ox'
import attachmentAPI from '@/io.ox/core/api/attachment'
import downloadAPI from '@/io.ox/core/download'
import filesAPI from '@/io.ox/files/api'
import yell from '@/io.ox/core/yell'
import ext from '@/io.ox/core/extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import viewerTypes from '@/io.ox/core/viewer/views/types/typesutil'
import folderAPI from '@/io.ox/core/folder/api'

import gt from 'gettext'

const extensions = {

  // view attachment
  view: {
    collection: 'some',
    matches (baton) {
      return baton.array().some(function (data) {
        const model = new filesAPI.Model(data)
        // no view support for encrypted pim attachments
        return !model.isEncrypted() && viewerTypes.canView(model)
      })
    },
    action (baton) {
      import('@/io.ox/core/viewer/main').then(function ({ default: Viewer }) {
        const viewer = new Viewer()
        // no view support for encrypted pim attachments
        const files = baton.array().filter(function (file) { return !new filesAPI.Model(file).isEncrypted() })

        viewer.launch({ files, opt: { disableFolderInfo: true, disableFileDetail: true } })
      })
    }
  },

  // download attachment
  download: {
    // browser support for downloading more than one file at once is pretty bad (see Bug #36212)
    collection: 'one',
    action (baton) {
      // chronos has a special download function (bonus point, it works with federated sharing)
      const item = baton.first()
      const url = item.model && item.model.get('folder').indexOf('cal://') === 0
        ? ox.apiRoot + '/chronos?' + $.param({
          session: ox.session,
          action: 'getAttachment',
          folder: item.model.get('folder'),
          id: item.model.get('id'),
          managedId: baton.first().managedId
        })
        : attachmentAPI.getUrl(item, 'download')
      if (_.device('ios >= 11')) {
        downloadAPI.window(url, { antivirus: true })
      } else {
        downloadAPI.url(url)
      }
    }
  },

  // download all PIM attachments as zip
  downloadZip: {
    collection: 'multiple',
    multiple (list) {
      // chronos has it's own multiple download
      if (list[0].model && list[0].model.get('folder').indexOf('cal://') === 0) return downloadAPI.chronosMultiple(list[0].model)

      const param = {
        folder: list[0].folder,
        module: list[0].module,
        attached: list[0].attached
      }
      downloadAPI.pimAttachments(list, param)
    }
  },

  // save attachment
  save: {
    capabilities: 'infostore',
    collection: 'some',
    matches (baton) {
      if (!baton.first().model) return true
      const folder = folderAPI.pool.getModel(baton.first().model.get('folder'))
      return !folder.is('federated-sharing')
    },
    action (baton) {
      // cannot be converted to multiple request because of backend bug (module overides params.module)
      baton.array().forEach(function (data) {
        attachmentAPI.save(data)
      })
      setTimeout(function () {
        yell('success', gt('Attachments have been saved'))
      }, 300)
    }
  }
}

const titles = {
  // #. used as a verb here. label of a button to view attachments
  view: gt('View'),
  download: gt('Download'),
  downloadZip: gt('Download'),
  // #. %1$s is usually "Drive" (product name; might be customized)
  save: gt('Save to %1$s', gt.pgettext('app', 'Drive'))
}

// and let's define all points right now
let index = 0; const Action = actionsUtil.Action
_(extensions).each(function (extension, id) {
  // define action
  const ref = 'io.ox/core/tk/actions/' + id + '-attachment'
  Action(ref, extension)
  // define default link
  ext.point('io.ox/core/tk/attachment/links').extend({
    id,
    index: index += 100,
    title: titles[id],
    mobile: 'hi',
    ref
  })
})

export default extensions
