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

import { describe, it, jest } from '@jest/globals'

import View from '@/io.ox/mail/compose/view'
import ComposeModel from '@/io.ox/mail/compose/model'
import ConfigModel from '@/io.ox/mail/compose/config'

describe('Mail Compose', function () {
  const fakeApp = {
    id: 'test'
  }
  describe('discard action', function () {
    it('should discard clean mails', function () {
      const view = new View({
        model: new ComposeModel(),
        config: new ConfigModel(),
        app: fakeApp
      })
      return view.discard()
    })

    describe('should *not* show confirm dialog', function () {
      it('for empty new mails', function () {
        const view = new View({
          model: new ComposeModel(),
          config: new ConfigModel(),
          app: fakeApp
        })
        jest.spyOn(view.model, 'isEmpty').mockReturnValue(true)

        return view.discard()
      })

      it('for unchanged new mails', function () {
        const view = new View({
          model: new ComposeModel(),
          config: new ConfigModel(),
          app: fakeApp
        })
        jest.spyOn(view, 'isDirty').mockReturnValue(false)

        return view.discard()
      })

      it('in case autoDismiss mode is set', function () {
        const view = new View({
          model: new ComposeModel(),
          config: new ConfigModel(),
          app: fakeApp
        })
        // set model to be dirty and not empty, so normally discard confirm dialog would kick in
        jest.spyOn(view, 'isDirty').mockReturnValue(true)
        jest.spyOn(view.model, 'isEmpty').mockReturnValue(false)
        view.config.set('autoDismiss', true)

        return view.discard()
      })
    })
  })
})
