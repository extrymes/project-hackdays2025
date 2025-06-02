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

import TypesUtil from '@/io.ox/core/viewer/views/types/typesutil'

// preload types, please have a look at function 'getModelType'
import imageview from '@/io.ox/core/viewer/views/types/imageview'
import documentview from '@/io.ox/core/viewer/views/types/documentview'
import spreadsheetview from '@/io.ox/core/viewer/views/types/spreadsheetview'
import contactview from '@/io.ox/core/viewer/views/types/contactview'
import videoview from '@/io.ox/core/viewer/views/types/videoview'
import audioview from '@/io.ox/core/viewer/views/types/audioview'
import textview from '@/io.ox/core/viewer/views/types/textview'
import defaultview from '@/io.ox/core/viewer/views/types/defaultview'
import mailview from '@/io.ox/core/viewer/views/types/mailview'
import descriptionview from '@/io.ox/core/viewer/views/types/descriptionview'
import mediaview from '@/io.ox/core/viewer/views/types/mediaview'

const types = {
  imageview,
  documentview,
  spreadsheetview,
  contactview,
  videoview,
  audioview,
  textview,
  defaultview,
  mailview,
  descriptionview,
  mediaview
}

/**
 * A central registry of file types which are supported by OX Viewer.
 * This registry Also offers file type related methods.
 */

const typesRegistry = {

  /**
   * Gets the corresponding file type object for the given model object.
   *
   * @param {object} model an OX Viewer model object.
   */
  async getModelType (model) {
    return types[TypesUtil.getTypeString(model)]
  }

}

export default typesRegistry
