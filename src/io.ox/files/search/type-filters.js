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

const FILE_EXTENSION_TEXT = [
  '*.docx',
  '*.docm',
  '*.dotx',
  '*.dotm',
  '*.odt',
  '*.ott',
  '*.doc',
  '*.dot',
  '*.txt',
  '*.rtf'
]
const FILE_EXTENSION_SPREADSHEET = [
  '*.xlsx',
  '*.xlsm',
  '*.xltx',
  '*.xltm',
  '*.xlsb',
  '*.ods',
  '*.ots',
  '*.xls',
  '*.xlt',
  '*.xla'
]
const FILE_EXTENSION_PRESENTATION = [
  '*.pptx',
  '*.pptm',
  '*.potx',
  '*.potx',
  '*.ppsx',
  '*.ppsm',
  '*.ppam',
  '*.odp',
  '*.otp',
  '*.ppt',
  '*.pot',
  '*.pps',
  '*.ppa'
]
const FILE_EXTENSION_PDF = [
  '*.pdf'
]
const FILE_EXTENSION_IMAGE = [
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.tiff',
  '*.bmp'
]
const FILE_EXTENSION_VIDEO = [
  '*.m4v',
  '*.ogv',
  '*.webm',
  '*.mov',
  '*.avi',
  '*.wmv',
  '*.wma',
  '*.mpg',
  '*.mpeg',
  '*.mp4',
  '*.mpg'
]
const FILE_EXTENSION_AUDIO = [
  '*.mp3',
  '*.m4a',
  '*.m4b',
  '*.ogg',
  '*.aac',
  '*.wav',
  '*.wma',
  '*.mid',
  '*.ra',
  '*.ram',
  '*.rm',
  '*.m3u',
  '*.mp4a',
  '*.mpga'
]

const office = 'application/vnd.openxmlformats-officedocument.'

const FILE_TYPE_DEFINITION = {
  image: { mimeType: 'image/*', ext: FILE_EXTENSION_IMAGE },
  pdf: { mimeType: 'application/pdf', ext: FILE_EXTENSION_PDF },
  text: { mimeType: office + 'wordprocessingml.*', ext: FILE_EXTENSION_TEXT },
  sheet: { mimeType: office + 'spreadsheetml.*', ext: FILE_EXTENSION_SPREADSHEET },
  presentation: { mimeType: office + 'presentationml.*', ext: FILE_EXTENSION_PRESENTATION },
  audio: { mimeType: 'audio/*', ext: FILE_EXTENSION_AUDIO },
  video: { mimeType: 'video/*', ext: FILE_EXTENSION_VIDEO },
  archive: { mimeType: 'application/zip', ext: undefined }
}

function createSearchFilter (type, useExtension, useMimeType) {
  let filters = []
  const extensions = FILE_TYPE_DEFINITION[type].ext
  const mimeType = FILE_TYPE_DEFINITION[type].mimeType
  if (useExtension && !_.isEmpty(extensions)) {
    filters = extensions.map((extension) => ['=', { field: 'filename' }, extension])
  }
  if (useMimeType && !_.isEmpty(mimeType)) {
    filters.push(['=', { field: 'file_mimetype' }, mimeType])
  }
  return ['or'].concat(filters)
}

/**
* Returns an advancedSearch filter for a given file type.
* Dependend on the type, the filter contains a MIME type filter,
* an extension filter or both.
*
* @param {String} type
*
* @returns {Array}
*  The compiled advancedSearch filter for a given type.
*/
export const advancedSearchTypeFilter = function (type) {
  switch (type) {
    case 'image': return createSearchFilter('image', true)
    case 'pdf': return createSearchFilter('pdf', true)
    case 'text': return createSearchFilter('text', true)
    case 'sheet': return createSearchFilter('sheet', true)
    case 'presentation': return createSearchFilter('presentation', true)
    case 'audio': return createSearchFilter('audio', true)
    case 'video': return createSearchFilter('video', true)
    case 'archive': return createSearchFilter('archive', false, true)
    default: return []
  }
}
