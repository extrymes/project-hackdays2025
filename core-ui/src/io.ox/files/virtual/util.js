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

export const mapFolderModel = function (folder) {
  const model = FolderAPI.pool.addModel(folder)
  return mapFileModel(model.toJSON())
}

export const mapFileModel = function (file) {
  return new FilesAPI.Model(file)
}

export const getSorter = function (params) {
  const sort = params.sort
  const ascending = params.order === 'asc'
  const factor = ascending ? +1 : -1
  return function (a, b) {
    const af = a.isFolder()
    const bf = b.isFolder()
    if (af && !bf) return -1
    if (bf && !af) return +1
    // sort by name
    if (sort === 702) return factor * a.getDisplayName().localeCompare(b.getDisplayName(), undefined, { sensitivity: 'base' })
    // sort by date
    if (sort === 5) return factor * (a.get('last_modified') - b.get('last_modified'))
    // sort by size
    return factor * (a.get('file_size') - b.get('file_size'))
  }
}

export const getFilter = function (filter) {
  // filter comes as array
  filter = [].concat(filter)[0]
  switch (filter) {
    case 'pdf': return model => model.isPDF()
    case 'text': return model => model.isWordprocessing()
    case 'sheet': return model => model.isSpreadsheet()
    case 'presentation': return model => model.isPresentation()
    case 'image': return model => model.isImage()
    case 'audio': return model => model.isAudio()
    case 'video': return model => model.isVideo()
    default: return Boolean
  }
}
