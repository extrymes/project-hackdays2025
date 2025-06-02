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

const baseUrl = self.location.pathname.replace('/service-worker.js', '')
const apiUrl = `${baseUrl}/api`
let version

const debug = {
  async disable () { console.log('Service worker:', 'disable debug'); caches.open('debug').then(cache => cache.delete('enabled')) },
  async enable () {
    console.log('Service worker:', 'enable debug')
    const cache = await caches.open('debug')
    cache.put('enabled', new Response())
  },
  trace (...args) {
    caches.open('debug').then(async cache => {
      const version = await cache.match('enabled')
      if (version) console.log('Service worker:', ...args)
    })
  },
  log (...args) {
    caches.open('log').then(async cache => {
      const timestamp = +new Date()
      cache.put(timestamp, new Response(JSON.stringify({
        timestamp,
        args
      }), {
        headers: {
          'content-type': 'application/json'
        }
      }))
    })

    debug.trace(...args)
  },
  async printLogs () {
    const cache = await caches.open('log')
    const keys = await cache.keys()
    for (const key of keys) {
      const response = await cache.match(key)
      const { timestamp, args } = await response.json()
      console.log(`[${new Date(timestamp).toISOString()}]`, ...args)
    }
  }
}

self.addEventListener('fetch', function (event) {
  // no need to intercept non get requests.
  if (event.request.method !== 'GET') return
  // Do not intercept requests out of scope (some chrome extensions etc do that)
  if (!event.request.url.startsWith(self.registration.scope)) return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith(apiUrl)) return
  // specified cache strategy via request header
  const strategy = event.request.headers?.get('service-worker-strategy')
  if (strategy === 'network-only') return
  event.respondWith(fetchFile(event.request, event.clientId))
})

self.addEventListener('activate', function (event) {
  debug.log('activate event')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('install', event => {
  debug.log('install event')
  self.skipWaiting()
  event.waitUntil(pollVersionAndUpdate(`${baseUrl}/`))
})

async function pollVersionAndNotify (request, response) {
  const versionRes = await pollVersion(request, response)
  if (versionRes) {
    const version = versionRes.headers.get('version')
    notifyAllClients({ type: 'NEW_VERSION', origin: 'pollVersion', version })
    storeVersionUpdate({ response, url: request.url || request, version })
  }
}

self.addEventListener('message', event => {
  if (event?.data === 'POLL') pollVersionAndNotify(`${baseUrl}/`)
  if (event?.data === 'ENABLE_DEBUG') debug.enable()
  if (event?.data === 'DISABLE_DEBUG') debug.disable()
  if (event?.data === 'PRINT_LOGS') debug.printLogs()
  if (event?.data?.type === 'INVALIDATE_CACHE') deleteCacheEntries(event.data.fileNames)
})

self.addEventListener('periodicsync', event => {
  if (event.tag === 'POLL') pollVersionAndNotify(`${baseUrl}/`)
})

async function notifyAllClients (data) {
  const clients = await self.clients.matchAll()
  clients.forEach(client => client.postMessage(data))
}

async function pollVersionAndUpdate (request, response) {
  const versionRes = await pollVersion(request, response)
  if (versionRes) {
    await deleteCaches()
    const cache = await caches.open('defaultcache')
    version = versionRes.headers.get('version')
    await Promise.all([
      cache.put('/version', versionRes.clone()),
      storeVersionUpdate({ response, url: request.url || request, version })
    ])
  }
}

/*
 * If a new version is available, poll version returns the request with that new version, undefined otherwise.
 * You can also use an existing response if you already have one.
 */
async function pollVersion (request, response) {
  debug.trace('poll version')
  const cache = await caches.open('defaultcache')
  const [cacheRes, serverRes] = await Promise.all([
    cache.match('/version'),
    // TODO: we might want to use the /version endpoint in the future
    response || fetch(request)
  ])

  if (!serverRes.ok) return
  if (!cacheRes) {
    cache.put('/version', serverRes.clone())
    return
  }

  // shouldn't be the case very often, but might occur e.g. with help or bad ingress config
  if (!serverRes.headers.get('version')) return
  if (cacheRes.headers.get('version') === serverRes.headers.get('version')) return
  debug.log('new version', serverRes.headers.get('version'), 'is navigational', request.mode === 'navigate')
  return serverRes
}

async function deleteCacheEntries (fileNames) {
  const version = await getVersion()
  await Promise.all(fileNames.map(async fileName => {
    const cache = await caches.open(version + prefixForPath(fileName))
    return cache.delete(fileName)
  }))
}

async function deleteCaches () {
  debug.log('delete caches')
  const keys = await this.caches.keys()
  await Promise.all(keys.map(key => {
    // keep only the newest 150 entries in the cache for log and versionLog
    if (key === 'log' || key === 'versionLog') {
      return caches.open(key).then(async cache => {
        const keys = await cache.keys()
        const deletableKeys = keys.slice(0, keys.length - 150)
        return Promise.all(deletableKeys.map(key => cache.delete(key)))
      })
    }
    return caches.delete(key)
  }))
}

async function fetchAndCatch (request, headers) {
  return fetch(request, { headers }).catch(err => {
    debug.log(`Caught error while fetching ${request.url || request}`, err)
    // return a 503 here to enable retry
    return new Response('', { status: 503 })
  })
}

async function fetchAndRetry (request, headers, { waitIntervals = [1000, 5000, 10000] } = {}) {
  let response = await fetchAndCatch(request, headers)
  for (let i = 0; i < waitIntervals.length && response.status === 503; i++) {
    debug.log(`Received 503 for ${request.url || request}. Will retry`)
    await new Promise(resolve => setTimeout(resolve, waitIntervals[i]))
    response = await fetchAndCatch(request, headers)
  }
  return response
}

function prefixForPath (pathname) {
  // get proper number of caches independent of appRoot (i.e. / vs /appsuite)
  const match = pathname.substring(baseUrl.length).match(/^((\/[^/]+){0,2}).*\/[^/]+$/)
  return match ? match[1] : ''
}

async function fetchFile (request, clientId) {
  const url = request.url
  const pathname = new URL(url).pathname
  if (request.mode === 'navigate') {
    debug.trace('navigational request', pathname)
    const response = await fetchAndRetry(request)
    await pollVersionAndUpdate(request, response)
    return response
  }

  const version = await getVersion()
  const cache = await caches.open(version + prefixForPath(pathname))
  const cacheHit = await cache.match(request)
  if (cacheHit) return cacheHit
  const response = await fetchAndRetry(request, { version })

  // status not ok. Don't cache or announce a new version, even if the headers would contain a new version
  if (response.status !== 200) {
    debug.log('cannot fetch', url, 'code', response.status)
    return response
  }
  const responseVersion = response.headers.get('latest-version') || response.headers.get('version')
  if (version && responseVersion && version !== responseVersion) {
    notifyAllClients({ type: 'NEW_VERSION', origin: 'fetchFile', status: response.status, version: responseVersion, url })
    storeVersionUpdate({ response, url })
  }

  cache.put(url, response.clone())
  return response
}

async function storeVersionUpdate ({ response, url, version = response?.headers?.get('latest-version') || response.headers.get('version') }) {
  if (!version) return
  // only log version once
  const cache = await caches.open('versionLog')
  const cachedResponse = await cache.match(version)
  if (cachedResponse) return
  cache.put(version, new Response(url, { headers: response?.headers }))
  debug.log(`New Version event triggered by ${url}`)
}

async function getVersion () {
  if (!version) {
    version = (async () => {
      const cache = await caches.open('defaultcache')
      let response = await cache.match('/version')

      // in rare cases, there might not be a version
      // this might happen, while the service worker is updated
      if (!response) {
        debug.log('defaultcache has no /version')

        // this might also use the /version endpoint in the future
        // use this getterCache here, such that multiple requests at the same time do not request multiple version
        response = await fetch(`${baseUrl}/`).then(response => {
          if (!response.headers.get('version')) return
          cache.put('/version', response)
          return response
        })

        debug.log('server version is', response.headers.get('version'))
      }

      return response.headers.get('version')
    })()
  }

  return version
}
