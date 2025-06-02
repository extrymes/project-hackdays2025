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
import ox from '@/ox'

import FilesAPI from '@/io.ox/files/api'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import ext from '@/io.ox/core/extensions'
import apps from '@/io.ox/core/api/apps'

export default function (options) {
  const parameters = options || {}
  FilesAPI.get(_.pick(parameters, 'folder_id', 'id')).done(function (fileDesc) {
    const app = apps.get('io.ox/files')
    const fileModel = new FilesAPI.Model(fileDesc)
    ox.launch(() => import('@/io.ox/files/main'), { folder: fileModel.get('folder_id') }).then(function () {
      actionsUtil.invoke('io.ox/files/actions/show-in-folder', ext.Baton({
        models: [fileModel],
        app,
        alwaysChange: true,
        portal: true
      }))
    })
  })
};
