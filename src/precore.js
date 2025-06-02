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

const baseUrl = window.location.pathname.replace(/\/[^/]*$/, '').replace(/^\/\//, '/')
let version

export async function getVersion () {
  if (!version) {
    const cache = await caches.open('defaultcache')
    const response = await cache.match('/version')
    if (response) version = response.headers.get('version')
  }
  return version
}

export async function cacheFile (path, body, currentVersion) {
  const fileName = '/' + path
  const match = fileName.match(/^((\/[^/]+){0,2}).*\/[^/]+$/)
  const prefix = match ? match[1] : ''
  const cache = await caches.open(currentVersion + prefix)
  let contentType = 'application/javascript; charset=utf-8'
  if (fileName.endsWith('.css')) contentType = 'text/css'
  if (fileName.endsWith('.svg')) contentType = 'image/svg+xml'
  await cache.put(`${baseUrl}${fileName}`, new Response(body, { headers: { 'Content-Type': contentType } }))
}

export async function loadBundle (name) {
  const storedVersion = await getVersion()
  const namespaceCache = await caches.open(`${storedVersion}/bundles/${name}`)

  // prevent duplicate bundle fetch
  if (storedVersion && (await namespaceCache.match(`${baseUrl}/bundles/${name}`))) return

  const response = await fetch(`./bundles/${name}`, { headers: { version: storedVersion } })
  // storedVersion might be undefined if the service worker is not yet installed, use the version from the response
  const currentVersion = response.headers.get('version')
  caches.open(`${currentVersion}/bundles/${name}`).then(cache => cache.put(`${baseUrl}/bundles/${name}`, new Response('')))

  if (!response.ok) throw new Error('Response is not ok')

  /* global TextDecoderStream: true */
  const bodyReader = response.body.pipeThrough(new TextDecoderStream('utf-8'))

  // polyfill async iterator
  if (!bodyReader[Symbol.asyncIterator]) {
    bodyReader[Symbol.asyncIterator] = () => {
      const reader = bodyReader.getReader()
      return { next: () => reader.read() }
    }
  }

  let incompleteChunk = ''

  for await (const chunk of bodyReader) {
    const fileChunks = (incompleteChunk + chunk).split('%&$1')
    incompleteChunk = fileChunks.splice(fileChunks.length - 1, 1)[0]

    const promises = fileChunks.map(async (chunk) => {
      const [path, body] = chunk.split('%&$2')
      await cacheFile(path, body, currentVersion)
    })
    await Promise.all(promises)
  }
  // incompleteChunk now is complete, for sure
  const [path, body] = incompleteChunk.split('%&$2')
  await cacheFile(path, body, currentVersion)
}

export function isJest () {
  if (typeof process === 'undefined') return false
  return process.env?.JEST_WORKER_ID !== undefined
}

(async () => {
  const serviceWorkerEnabled = window.location.hash.indexOf('useSW=false') < 0 && (window.location.hash.indexOf('useSW') > -1 || import.meta.env?.MODE !== 'development')
  if (navigator.serviceWorker && serviceWorkerEnabled) {
    try {
      navigator.serviceWorker.register('service-worker.js')
      await Promise.all([
        navigator.serviceWorker.ready,
        loadBundle('boot.js')
      ])
    } catch (error) {
      console.warn('Service worker error', error)
    }
  }
  if (!isJest()) import('@/main.js')
})()
