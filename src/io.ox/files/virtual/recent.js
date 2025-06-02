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

import filesAPI from '@/io.ox/files/api'
import { settings } from '@/io.ox/files/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { getSorter, getFilter, mapFileModel } from '@/io.ox/files/virtual/util'

const searchOptions = {
  folder: coreSettings.get('folder/infostore'),
  includeSubfolders: true,
  // to keep things simple we use a hard limit,
  // i.e. it's the "last 100" (which we can have)
  // not a complex tool to time travel (which we just discuss forever)
  limit: 100,
  order: 'desc',
  sort: 5
}

export const loadRecentFiles = function (params, collection, mimeTypeFilter) {
  collection.expired = true
  collection.pagination = false
  return fetchFiles().then(files => {
    return []
      .concat(files)
      .filter(getFilter(mimeTypeFilter))
      .sort(getSorter(params))
      .map(model => model.toJSON())
  })
}

function fetchFiles () {
  // simple solution for the sake of having something useful
  // just searches under "My files"
  // - next reasonable step is taking "Public files" into account
  // but it should still be limited to the user's files
  // - instead of modification date it could be explicit actions (like opening)
  return filesAPI.search('', searchOptions).then(function (files) {
    // don't show hidden files if disabled in settings
    if (settings.get('showHidden') === false) {
      files = files.filter(file => {
        const title = (file ? file['com.openexchange.file.sanitizedFilename'] : '')
        return title.indexOf('.') !== 0
      })
    }
    return files.map(mapFileModel)
  })
}
