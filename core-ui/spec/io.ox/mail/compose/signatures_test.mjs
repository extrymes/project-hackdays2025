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

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import $ from '@/jquery'
import Backbone from '@/backbone'

import ext from '@/io.ox/core/extensions'
import ConfigModel from '@/io.ox/mail/compose/config'
import '@/io.ox/mail/compose/main'
import { settings } from '@/io.ox/mail/settings'

describe('Mail Compose', function () {
  describe('signatures', function () {
    const signatureController = ext.point('io.ox/mail/compose/boot').get('initial-signature').perform

    beforeEach(function () {
      settings.set('defaultSignature', { 'user@domain.com': '1' })
      settings.set('defaultReplyForwardSignature', { 'user@domain.com': '2' })
    })
    afterEach(function () {
      // restore default values
      settings.set('defaultSignature', false)
      settings.set('defaultReplyForwardSignature', false)
    })
    it('should use default signature on compose', function () {
      const model = new ConfigModel({
        mode: 'compose'
      })
      return signatureController.call({ view: { signaturesLoading: $.when() }, config: model, model: new Backbone.Model() }).then(function () {
        expect(model.get('signatureId')).toStrictEqual(settings.get('defaultSignature'))
      })
    })
    it('should use reply/forward on reply', function () {
      const model = new ConfigModel({
        type: 'reply'
      })
      return signatureController.call({ view: { signaturesLoading: $.when() }, config: model, model: new Backbone.Model() }).then(function () {
        expect(model.get('signatureId')).toStrictEqual(settings.get('defaultReplyForwardSignature'))
      })
    })
    it('should use reply/forward on forward', function () {
      const model = new ConfigModel({
        type: 'forward'
      })
      return signatureController.call({ view: { signaturesLoading: $.when() }, config: model, model: new Backbone.Model() }).then(function () {
        expect(model.get('signatureId')).toStrictEqual(settings.get('defaultReplyForwardSignature'))
      })
    })
    it('should use no signature on edit', function () {
      const model = new ConfigModel({
        type: 'edit',
        signatures: new Backbone.Collection()
      })
      return signatureController.call({ view: { signaturesLoading: $.when() }, config: model, model: new Backbone.Model() }).then(function () {
        expect(model.get('signatureId')).toStrictEqual('')
      })
    })
  })
})
