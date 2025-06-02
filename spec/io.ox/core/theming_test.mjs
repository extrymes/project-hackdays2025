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

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'

import ox from '@/ox'
import util from '@/io.ox/core/theming/dynamic/main'
import capabilities from '@/io.ox/core/capabilities'
import { settings } from '@/io.ox/core/settings'
import { settings as dynamicSettings } from '@/io.ox/core/theming/dynamic/settings'

describe('Theming', function () {
  describe('logo functions', function () {
    beforeEach(function () {
      settings.set('theme', 'default')
      settings.set('theming/logo', {})
      Object.assign(ox.serverConfig, { useOXLogo: false })
    })
    it('uses OX logo from /themes/default', function () {
      ox.serverConfig.useOXLogo = true
      const { path, height } = util.getLogoData()
      expect(path).toEqual('./themes/default/ox_logo.svg')
      expect(height).toEqual('24px')
    })
    it('uses OX logo if ox.theme is different', function () {
      ox.serverConfig.useOXLogo = true
      settings.set('theme', 'different-folder')
      const { path, height } = util.getLogoData()
      expect(path).toEqual('./themes/default/ox_logo.svg')
      expect(height).toEqual('24px')
    })
    it('uses default logo', function () {
      const { path, height } = util.getLogoData()
      expect(path).toEqual('./themes/default/logo-dynamic.svg')
      expect(height).toBeUndefined()
    })
    it('uses default logo with proper height', function () {
      settings.set('theming/logo/height', '32px')
      const { path, height } = util.getLogoData()
      expect(path).toEqual('./themes/default/logo-dynamic.svg')
      expect(height).toEqual('32px')
    })
    it('uses custom logo with proper height', function () {
      settings.set('theming/logo', { name: 'foo.png', height: '28px' })
      const { path, height } = util.getLogoData()
      expect(path).toEqual('./themes/default/foo.png')
      expect(height).toEqual('28px')
    })
    it('uses custom logo from different theme', function () {
      settings.set('theme', 'different')
      settings.set('theming/logo', { name: 'yay.svg', height: '20px' })
      const { path, height } = util.getLogoData()
      expect(path).toEqual('./themes/different/yay.svg')
      expect(height).toEqual('20px')
    })
    it('uses custom logo with custom base path', function () {
      settings.set('theme', 'different')
      settings.set('theming/logo', { base: './elsewhere', name: 'foo.svg', height: '16px' })
      const { path, height } = util.getLogoData()
      expect(path).toEqual('./elsewhere/foo.svg')
      expect(height).toEqual('16px')
    })
  })
})

describe('Dynamic theming', function () {
  describe('logo url functions', function () {
    afterEach(function () {
      dynamicSettings.set('logoURL', undefined)
      dynamicSettings.set('logoURLDark', undefined)
    })
    it('uses urls specified by outdated setting logoURL (string)', function () {
      dynamicSettings.set('logoURL', 'dynamic_logo.svg')
      dynamicSettings.set('logoURLDark', 'dynamic_dark_logo.svg')
      const { logoURL, logoURLDark } = util.getLogoURLs()
      expect(logoURL).toEqual('dynamic_logo.svg')
      expect(logoURLDark).toEqual('dynamic_dark_logo.svg')
    })
    it('uses urls specified by outdated setting logoURLDark (string)', function () {
      dynamicSettings.set('logoURL', { light: 'dynamic_logo.svg' })
      dynamicSettings.set('logoURLDark', 'dynamic_dark_logo.svg')
      const { logoURL, logoURLDark } = util.getLogoURLs()
      expect(logoURL).toEqual('dynamic_logo.svg')
      expect(logoURLDark).toEqual('dynamic_dark_logo.svg')
    })
    it('uses urls specified by setting logoURL (object)', function () {
      dynamicSettings.set('logoURL', { light: 'dynamic_logo.svg', dark: 'dynamic_dark_logo.svg' })
      dynamicSettings.set('logoURLDark', 'old_dynamic_dark_logo.svg')
      const { logoURL, logoURLDark } = util.getLogoURLs()
      expect(logoURL).toEqual('dynamic_logo.svg')
      expect(logoURLDark).toEqual('dynamic_dark_logo.svg')
    })
  })

  describe('logo HTML node functions', function () {
    beforeEach(function () {
      const hasOriginal = capabilities.has
      global.hasStub = jest.spyOn(capabilities, 'has').mockImplementation(args => {
        return args === 'dynamic-theme' ? true : hasOriginal(args)
      })
      global.fetch = jest.fn(url => Promise.resolve({
        ok: url === '//valid-path/domain.svg',
        text: () => Promise.resolve('<svg><circle cx="50" cy="50" r="50" fill="blue"/></svg>')
      }))
    })
    afterEach(function () {
      dynamicSettings.set('logoURL', undefined)
      global.hasStub.mockClear()
      global.fetch.mockClear()
    })
    it('use inline svg for relative URLs that end with ".svg"', async () => {
      // inline fallback
      dynamicSettings.set('logoURL', '//invalid-path/domain.svg')
      const fallbackResult = await util.getLogo()
      expect(fallbackResult[0]?.outerHTML).toMatch(/^<svg width="1px"/)
      // inline
      dynamicSettings.set('logoURL', '//valid-path/domain.svg')
      const inlineResult = await util.getLogo()
      expect(inlineResult[0]?.outerHTML).toMatch(/^<svg><circle/)
    })
    it('use img nodes for absolute URLs that end with ".svg"', async () => {
      // reference
      dynamicSettings.set('logoURL', 'http://example/logos/domain.svg')
      const httpResult = await util.getLogo()
      expect(httpResult[0]?.outerHTML).toMatch(/^<img/)
      // reference
      dynamicSettings.set('logoURL', 'https://example/logos/domain.svg')
      const httpsResult = await util.getLogo()
      expect(httpsResult[0]?.outerHTML).toMatch(/^<img/)
    })
  })
})
