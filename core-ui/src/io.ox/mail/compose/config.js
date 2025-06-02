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
import Backbone from '@/backbone'
import signatureUtil from '@/io.ox/mail/compose/signatures'
import { settings } from '@/io.ox/mail/settings'

export default Backbone.Model.extend({

  defaults () {
    const mode = _.device('smartphone') ? 'html' : settings.get('messageFormat', 'html')
    return {
      // based on model.type
      type: 'new',
      // Automatically dismiss confirmation dialog
      autoDismiss: false,
      preferredEditorMode: mode,
      editorMode: mode,
      toolbar: true,
      sendDisplayName: !!settings.get('sendDisplayName', true),
      // store tiny device detection (TinyMCE hides toolbar on non-desktop devices)
      desktop: true,
      // signatures
      defaultSignatureId: '',
      // identifier for empty signature (dropdown)
      signatureId: '',
      signature: '',
      signatureIsRendered: undefined,
      imageResizeOption: ''
    }
  },

  initialize () {
    _.extend(this, signatureUtil.model, this)
  },

  is (type) {
    const reType = new RegExp('^(' + type + ')$')
    return reType.test(this.get('type'))
  }

})
