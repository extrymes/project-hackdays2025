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

import api from '@/io.ox/core/api/user'
import contactModel from '@/io.ox/contacts/model'
import PhotoUploadView from '@/io.ox/contacts/widgets/pictureUpload'
import registry from '../main/registry'

// Model Factory for use with the edit dialog
const factory = contactModel.protectedMethods.buildFactory('io.ox/core/user/model', api)

function getCurrentUser () {
  return factory.realm('default').get({})
}

export default {

  getCurrentUser,

  openModalDialog () {
    getCurrentUser().done(function (model) {
      registry.call('io.ox/contacts/edit', 'edit', model.attributes)
    })
  },

  openEditPicture () {
    return getCurrentUser().then(function (model) {
      const view = new PhotoUploadView({ model })
      view.openDialog()
    })
  }
}
