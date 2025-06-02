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

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

import ui from '@/io.ox/core/desktop'
import apps from '@/io.ox/core/api/apps'
import appcontrol from '@/io.ox/core/main/appcontrol'
import { settings as coreSettings } from '@/io.ox/core/settings'

describe('Apps', function () {
  let oldApps
  beforeEach(function () {
    oldApps = apps.models
    apps.reset()
  })
  afterEach(function () {
    apps.reset(oldApps)
  })
  describe('defining App for launcher', function () {
    let app
    beforeEach(function () {
      app = new ui.App({
        id: 'io.ox/test',
        name: 'io.ox/test',
        title: 'Testapplication'
      })
      apps.add(app)
    })
    afterEach(function () {
      apps.remove(app)
      app = null
    })

    it('should not contain apps not specified in jslob', function () {
      coreSettings.set('apps/list')
      apps.initialize()
      const launcherApps = apps.forLauncher()
      expect(launcherApps).toHaveLength(0)
    })
    it('should contain apps specified in jslob', function () {
      coreSettings.set('apps/list', 'io.ox/test,io.ox/mail')
      apps.initialize()
      const launcherApps = apps.forLauncher()
      expect(launcherApps).toHaveLength(1)
      expect(launcherApps[0]).toEqual(app)
    })
    it('should respect order defined in jslob', function () {
      coreSettings.set('apps/list', 'io.ox/test,io.ox/test3,io.ox/test2')
      apps.initialize()
      const app2 = new ui.App({
        id: 'io.ox/test2',
        name: 'io.ox/test2',
        title: 'Testapplication 2'
      })
      const app3 = new ui.App({
        id: 'io.ox/test3',
        name: 'io.ox/test3',
        title: 'Testapplication 3'
      })
      apps.add([app2, app3])
      const launcherApps = apps.forLauncher()
      expect(launcherApps).toHaveLength(3)
      expect(launcherApps[0]).toEqual(app)
      expect(launcherApps[1]).toEqual(app3)
      expect(launcherApps[2]).toEqual(app2)
      apps.remove(app2)
      apps.remove(app3)
    })
    it('should create sort order independent of apps not in jslob list', function () {
      coreSettings.set('apps/list', 'io.ox/test3,io.ox/test')
      apps.initialize()
      const app2 = new ui.App({
        id: 'io.ox/test2',
        name: 'io.ox/test2',
        title: 'Testapplication 2'
      })
      const app3 = new ui.App({
        id: 'io.ox/test3',
        name: 'io.ox/test3',
        title: 'Testapplication 3'
      })
      apps.add([app2, app3])
      const launcherApps = apps.forLauncher()
      expect(launcherApps).toHaveLength(2)
      expect(launcherApps[0].id).toEqual(app3.id)
      expect(launcherApps[1].id).toEqual(app.id)
      apps.remove(app2)
      apps.remove(app3)
    })

    it('should be possible to maintain a blocklist for the launcher', function () {
      coreSettings.set('apps/list', 'io.ox/test')
      coreSettings.set('apps/blacklist', 'io.ox/test')
      apps.initialize()
      const launcherApps = apps.forLauncher()
      expect(launcherApps).toHaveLength(0)
    })

    it('should list app which added itself', function () {
      coreSettings.set('apps/list')
      coreSettings.set('apps/blacklist')
      apps.initialize()
      apps.launcher.add('io.ox/test')
      const launcherApps = apps.forLauncher()
      expect(launcherApps).toHaveLength(1)
      expect(launcherApps[0].get('title')).toEqual('Testapplication')
    })
  })

  describe('launchers view', function () {
    it('should redraw launcher on collection change', function () {
      const stub = jest.spyOn(apps, 'forLauncher')
      const oldApps = apps.models
      let app
      apps.add([
        app = new ui.App({ id: 'io.ox/test', name: 'test', title: 'Testapplication' }),
        new ui.App({ id: 'io.ox/test2', name: 'test2', title: 'Testapplication 2' }),
        new ui.App({ id: 'io.ox/test3', name: 'test3', title: 'Testapplication 3' })
      ], { silent: true })
      stub.mockReturnValue(apps.models)
      const view = new appcontrol.LaunchersView({
        collection: apps
      })
      view.render()
      expect(view.$el.find('.apps button')).toHaveLength(3)
      expect(view.$el.find('.apps button .title').text())
        .toEqual(['Testapplication', 'Testapplication 2', 'Testapplication 3'].join(''))

      apps.remove(app)
      expect(view.$el.find('.apps button')).toHaveLength(2)
      expect(view.$el.find('.apps button .title').text())
        .toEqual(['Testapplication 2', 'Testapplication 3'].join(''))

      apps.add(app)
      expect(view.$el.find('.apps button')).toHaveLength(3)
      expect(view.$el.find('.apps button .title').text())
        .toEqual(['Testapplication 2', 'Testapplication 3', 'Testapplication'].join(''))

      apps.reset(oldApps, { silent: true })
      jest.clearAllMocks()
    })
  })

  describe('Models', function () {
    it('should be Backbone models', function () {
      const app = new ui.App({
        name: 'io.ox/test'
      })
      expect(app.get).toBeInstanceOf(Function)
      expect(app.set).toBeInstanceOf(Function)
    })
    it('should automatically generate an id', function () {
      const app = new ui.App({
        name: 'io.ox/test'
      })
      expect(app.id).toMatch(/^app-\d+/)
    })
    it('should automatically generate the path to the main module', function () {
      const app = new ui.App({
        name: 'io.ox/test'
      })
      expect(app.get('path')).toEqual('io.ox/test/main')
    })
    it('should not override specified path to the main module', function () {
      const app = new ui.App({
        name: 'io.ox/test',
        path: 'custom/path'
      })
      expect(app.get('path')).toEqual('custom/path')
    })

    describe('state management', function () {
      it('should start in "ready" state', function () {
        const app = new ui.App({
          name: 'io.ox/test'
        })
        expect(app.get('state')).toEqual('ready')
      })
    })
  })
})
