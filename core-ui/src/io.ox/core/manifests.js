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

/* global __vitePreload */

import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import capabilities from '@/io.ox/core/capabilities'
import { loadFeature, hasFeature } from '@/io.ox/core/feature'
import { getVersionString, getCurrentCachedVersion } from '@/io.ox/core/util'
export const manifestManager = {

  async load (cache = true) {
    if (cache === false) delete manifestManager._cache
    manifestManager._cache = manifestManager._cache || await $.get('manifests')
    return manifestManager._cache
  },

  // convenience function
  // returns 'requires' of a given app or plugin id
  // useful for upsell stuff
  getRequirements (id) {
    validate()
    return (this.plugins[id] || {}).requires || ''
  },

  async loadPluginsFor (namespace, cb) {
    if (typeof cb !== 'function') cb = () => {}
    validate()

    const plugins = this.pluginPoints[namespace] || []
    if (!plugins.length) {
      cb()
      return $.when([])
    }

    // collect all dependencies
    const dependencies = _(plugins)
      .chain()
      .pluck('dependencies')
      .flatten()
      .compact()
      .unique()
      .value()

    const preload = typeof __vitePreload === 'undefined'
      ? () => {}
      : async function preload (deps) {
        try {
          const base = `${ox.abs}${ox.root}/`.replace(/\/\//g, '/')
          await __vitePreload(() => {}, deps, base)
        } catch (error) {
          console.error(`Code loading error. Could not load css dependency "${error.message.replace('Unable to preload CSS for /', '')}"`)
        }
      }

    await preload(dependencies)

    const promises = plugins
      .filter(manifest => {
        // check feature toggle
        if (manifest.feature) {
          // special case: explicitly no delay and feature is enabled
          if (manifest.delay === 0 && hasFeature(manifest.feature)) return true
          // otherwise ...
          // we do not wait for features since they might use a user toggle
          // that can also be changed on the fly
          loadFeature(manifest)
          return false
        }
        return true
      })
      .map(async ({ path, raw, defer }) => {
        try {
          if (raw) return import(/* @vite-ignore */`${raw}`)
          return await import(/* @vite-ignore */`../../${path}.js`)
        } catch (error) {
          // send extended error for debugging purposes to UI middleware
          $.post(`${ox.root}/log`, {
            type: 'codeLoading ',
            error: error.message,
            cid: ox.context_id,
            uid: ox.user_id,
            namespace,
            path,
            hostname: window.location.hostname,
            version: getVersionString(),
            currentCachedVersion: await getCurrentCachedVersion(),
            raw
          })
          console.error(`Code loading error. Could not load module "${path}.js" in "${namespace}" namespace.`, error.message)

          const fileNames = [`${path}.js`, ...dependencies].map(fileName => `${ox.root}/${fileName}`)
          navigator.serviceWorker?.controller?.postMessage({ type: 'INVALIDATE_CACHE', fileNames })
        }
      })

    const result = (await Promise.all(promises)).filter(Boolean)
    cb(result)
    return result
  },

  withPluginsFor (name, deps) {
    return (deps || []).concat(this.pluginsFor(name))
  },

  hasPluginsFor (name) {
    validate()
    const plugins = this.pluginPoints[name]
    return plugins && plugins.length > 0
  },

  pluginsFor (name) {
    validate()
    const plugins = this.pluginPoints[name]
    if (!plugins || plugins.length === 0) return []
    return [].concat(_(plugins).chain().pluck('path').uniq().value())
  },

  plugins: null,
  pluginPoints: null
}

function isDisabled (manifest) {
  // check device first.
  if (manifest.device && !_.device(manifest.device)) return true
  // check capabilities. this check can be bypassed by upsell=true
  if (manifest.requires && manifest.upsell !== true && !capabilities.has(manifest.requires)) return true
  return false
}

function process (manifest) {
  if (!manifest.namespace) {
    if (ox.debug) console.warn('Looks like an app is defined "the old way". Apps can not be defined in manifest files any longer, but should be defined explicitly in code.', manifest)
    return
  }

  // take care of plugins:

  // lacks path or namespace?
  if (!manifest.path) {
    console.warn('Cannot process plugin manifest without a path', manifest)
    return
  }

  // check capabilities. skip this if upsell=true.
  // Such plugins take care of missing capabilities own their own
  if (isDisabled(manifest)) return

  // loop over namespaces (might be multiple)
  // supports: 'one', ['array'] or 'one two three'
  _([].concat(manifest.namespace)).each(function (namespace) {
    _(namespace.split(/\s+,?/)).each(function (namespace) {
      // Looks like a plugin
      const p = manifestManager.pluginPoints;
      // add to queue
      (p[namespace] = p[namespace] || []).push(manifest)
      manifestManager.plugins[manifest.path] = manifest
    })
  })
}

// const ts = _.now();
const custom = []

const self = {
  manager: manifestManager,
  async reload () {
    await manifestManager.load()
    return self.reprocess()
  },
  reprocess () {
    manifestManager.plugins = {}
    manifestManager.pluginPoints = {}
    const cache = manifestManager._cache || []
    cache.map(process)
  }
}

function validate () {
  if (manifestManager.plugins) return

  manifestManager.pluginPoints = {}
  manifestManager.plugins = {}

  _(ox.serverConfig.manifests).each(process)

  if (_.url.hash('customManifests')) {
    _(custom).each(process)
  }

  if (!_.isEmpty(manifestManager.pluginPoints)) ox.trigger('manifests')
}

// support for refreshed manifest
ox.on('serviceworker:NEW_VERSION', _.throttle(async () => {
  await manifestManager.load(false)
  self.reprocess()
}, 60000))

export default self
