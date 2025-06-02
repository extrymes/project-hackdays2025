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

import FolderAPI from '@/io.ox/core/folder/api'
import FilesAPI from '@/io.ox/files/api'
import { getSorter, getFilter, mapFolderModel } from '@/io.ox/files/virtual/util'
import { settings } from '@/io.ox/core/settings'

export const loadFavorites = function (params, collection, mimeTypeFilter) {
  collection.expired = true
  collection.pagination = false
  return Promise.all([fetchFolders(), fetchFiles()]).then(([folders, files]) => {
    return []
      .concat(folders.map(mapFolderModel), files)
      .filter(getFilter(mimeTypeFilter))
      .sort(getSorter(params))
      .map(model => model.toJSON())
  })
}

function fetchFolders () {
  // fetch favorites folders
  return FolderAPI.multiple(settings.get('favorites/infostore', []), { errors: true, cache: false })
}

function fetchFiles () {
  // fetch favorite files
  return FilesAPI.getList(settings.get('favoriteFiles/infostore', []), { errors: true, cache: false, fullModels: true })
    .then(responses => responses.filter(response => !response.error))
}
