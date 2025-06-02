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

import http from '@/io.ox/core/http'
import api from '@/io.ox/files/api'
import { getSorter, getFilter, mapFolderModel, mapFileModel } from '@/io.ox/files/virtual/util'

export const loadShares = function (params, collection, mimeTypeFilter) {
  collection.expired = true
  collection.pagination = false
  return Promise.all([fetchFolders(), fetchFiles()]).then(([folders, files]) => {
    // don't show inherited permissions - i.e. child folders of 'anon' shared folders
    // that are shared with subfolder option enabled
    folders = folders
      .filter((model) => Object.values(model.getShareStates())
        .some((entry) => entry === true))

    return []
      .concat(folders, files)
      .filter(getFilter(mimeTypeFilter))
      .sort(getSorter(params))
      .map(model => model.toJSON())
  })
}

const params = {
  action: 'shares',
  content_type: 'infostore',
  tree: 0,
  all: 0,
  altNames: true,
  timezone: 'UTC'
}

const folderColumns = '1,2,3,4,5,6,20,23,51,52,300,301,302,304,305,306,307,308,309,313,314,315,316,317,318,319,321,3060'

function fetchFolders () {
  return http.GET({
    module: 'folders',
    params: Object.assign({ columns: folderColumns }, params)
  })
    .then(result => result.map(mapFolderModel))
}

function fetchFiles () {
  return http.GET({
    module: 'files',
    params: Object.assign({ columns: api.defaultColumns }, params)
  })
    .then(result => result.map(mapFileModel))
}
