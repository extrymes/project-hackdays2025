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

/* eslint-disable promise/param-names */
/* eslint-disable array-callback-return */

import { describe, it, expect, afterEach, jest } from '@jest/globals'
import manifests from '@/io.ox/core/manifests.js'

// copied from vite. we need to mock the preload helper for this test to work
const scriptRel = 'modulepreload'
const seen = {}
const base = '/'
window.__vitePreload = function preload (baseModule, deps) {
  return Promise.all(deps.map((dep) => {
    // @ts-ignore
    dep = `${base}${dep}`
    // @ts-ignore
    if (dep in seen) { return }
    // @ts-ignore
    seen[dep] = true
    const isCss = dep.endsWith('.css')
    const cssSelector = isCss ? '[rel="stylesheet"]' : ''
    // @ts-ignore check if the file is already preloaded by SSR markup
    if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
      return
    }
    // @ts-ignore
    const link = document.createElement('link')
    // @ts-ignore
    link.rel = isCss ? 'stylesheet' : scriptRel
    if (!isCss) {
      link.as = 'script'
      link.crossOrigin = ''
    }
    link.href = dep
    // @ts-ignore
    document.head.appendChild(link)
    setTimeout(() => {
      const e = document.createEvent('HTMLEvents')
      e.initEvent('error', true, false)
      link.dispatchEvent(e)
    }, 100)
    return new Promise((res, rej) => {
      link.addEventListener('load', res)
      link.addEventListener('error', () => rej(new Error(`Unable to preload CSS for ${dep}`)))
    })
  })).then(() => baseModule())
}

describe('Manifests', function () {
  afterEach(() => {
    jest.restoreAllMocks()
  })
  it('should load code from manifests', async function () {
    // fill cache with manifests
    manifests.manager._cache = [{
      namespace: 'test',
      path: 'io.ox/core/yell'
    }]
    manifests.reprocess()
    const ConsoleError = jest.spyOn(console, 'error')
    // load manifest
    expect((await manifests.manager.loadPluginsFor('test')).length).toEqual(1)
    // there should be no error
    expect(ConsoleError).toHaveBeenCalledTimes(0)
  })

  it('should handle missing imports', async function () {
    // fill cache with broken manifests
    manifests.manager._cache = [{
      namespace: 'test',
      path: 'io.ox/core/doesNotExist'
    }]
    manifests.reprocess()
    const ConsoleError = jest.spyOn(console, 'error')

    // load broken manifest
    expect((await manifests.manager.loadPluginsFor('test')).length).toEqual(0)
    // expect error message
    expect(ConsoleError).toHaveBeenCalledTimes(1)
    expect(ConsoleError).toBeCalledWith('Code loading error. Could not load module "io.ox/core/doesNotExist.js" in "test" namespace.', "Cannot find module '../../io.ox/core/doesNotExist.js' from 'src/io.ox/core/manifests.js'")
  })
  it('should handle broken imports', async function () {
    // fill cache with broken manifests
    manifests.manager._cache = [{
      namespace: 'test',
      path: '../spec/mocks/brokenPlugin'
    }]
    manifests.reprocess()
    const ConsoleError = jest.spyOn(console, 'error')

    // load broken manifest
    expect((await manifests.manager.loadPluginsFor('test')).length).toEqual(0)
    // expect error message
    expect(ConsoleError).toHaveBeenCalledTimes(1)
    expect(ConsoleError).toBeCalledWith('Code loading error. Could not load module "../spec/mocks/brokenPlugin.js" in "test" namespace.', "Cannot find module 'io.ox/core/reallyDoesNotExist' from 'spec/mocks/brokenPlugin.js'")
  })
  it('should handle missing css dependencies', async function () {
    // fill cache with manifests
    manifests.manager._cache = [{
      namespace: 'test',
      path: 'io.ox/core/yell',
      dependencies: ['io.ox/stillDoesNotExist.css']
    }]
    manifests.reprocess()
    const ConsoleError = jest.spyOn(console, 'error')
    // load manifest
    expect((await manifests.manager.loadPluginsFor('test')).length).toEqual(1)
    // expect error message
    expect(ConsoleError).toBeCalledWith('Code loading error. Could not load css dependency "io.ox/stillDoesNotExist.css"')
  })
})
