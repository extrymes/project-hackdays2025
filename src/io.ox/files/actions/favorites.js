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

import api from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'

function getModel (element) {
  let module = 'infostore'
  let model

  if (element.folder_id === 'folder') {
    model = folderAPI.pool.getModel(element.id)
    module = model.get('module')
    if (!module) {
      model = null
    }
  } else {
    model = api.pool.get('detail').get(element.cid)
  }

  return model
}

/**
 * Add specified elements to favorites list.
 * @param {Descriptor} element Descriptor for File/Folder
 */
function add (elements) {
  const models = []

  elements.forEach(function (element) {
    const model = getModel(element)

    if (model) {
      models.push(model)
      api.propagate('favorite:add', model.toJSON())
    }
  })

  api.trigger('favorites:add', models)
}

/**
 * Remove specified elements from favorites list.
 *
 * @param {Descriptor} element Descriptor for File/Folder
 */
function remove (elements) {
  const models = []

  elements.forEach(function (element) {
    const model = getModel(element)

    if (model) {
      models.push(model)
      api.propagate('favorite:remove', model.toJSON())
    }
  })

  api.trigger('favorites:remove', models)
}

export default {
  add (list) {
    add(list)
  },
  remove (list) {
    remove(list)
  }
}
