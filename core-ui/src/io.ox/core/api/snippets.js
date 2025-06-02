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

/*
    {
        id: 12, // Set by the backend
        type: 'signature',   // The type of snippet, for easy lookup
        module: 'io.ox/mail', // The module that created the snippet
        displayname: 'My Signature', // A display name
        content: 'This email contains the absolute unchangeable truth, questioning its content is discouraged. \n The Mgt.', // The content of the snippet
        misc: { insertion: above } // Object with misc options
    }
*/
import $ from '@/jquery'
import _ from '@/underscore'
import Backbone from '@/backbone'
import http from '@/io.ox/core/http'
import Events from '@/io.ox/core/event'
import { settings } from '@/io.ox/mail/settings'
import sanitizer from '@/io.ox/mail/sanitizer'

const snippets = {
  signature: new Backbone.Collection(),
  template: new Backbone.Collection()
}

const api = {}
let cache = null

Events.extend(api)

// ensure snippet.misc.insertion (migration)
// only used for signatures
function fixOutdated (snippet) {
  if (snippet.type !== 'signature') return snippet
  if (_.isString(snippet.misc)) snippet.misc = JSON.parse(snippet.misc)
  snippet.misc = $.extend({ insertion: settings.get('defaultSignaturePosition', 'below') }, snippet.misc || {})
  return snippet
}

api.getCollection = function (type = 'signature') {
  return snippets[type]
}

/**
 * get all snippets
 * @return {jQuery.Deferred} array of snippet objects
 */
api.getAll = function ({ timeout = 15000, type } = {}) {
  if (!type && cache) return $.Deferred().resolve(cache)

  const params = {
    action: 'all'
  }

  if (type) params.type = type

  return http.GET({
    module: 'snippet',
    params,
    // See: bug 62222, OXUIB-823
    timeout
  })
    .then(
      function success (rawSnippets) {
        const processedSnippets = rawSnippets.map(snippet => fixOutdated({ ...snippet, content: sanitizer.simpleSanitize(snippet.content) }))
        const snippetGroups = _(processedSnippets).groupBy('type')
        if (type) {
          snippets[type].reset(snippetGroups[type])
        } else {
          cache = processedSnippets
          snippets.signature.reset(snippetGroups.signature)
          snippets.template.reset(snippetGroups.template)
        }

        return processedSnippets
      },
      function fail () {
        cache = null
        return []
      }
    )
}

/**
 * create snippet
 * @param  {object}          snippet
 * @fires  api#refresh.all
 * @return {jQuery.Deferred}         returns snippet id
 */
api.create = function (snippet) {
  return http.PUT({
    module: 'snippet',
    params: {
      action: 'new'
    },
    data: snippet
  })
    .done(function (id) {
      snippet.content = sanitizer.simpleSanitize(snippet.content)
      cache = null
      snippets[snippet.type].add(_({}, snippet, { id }))
      api.trigger('refresh.all')
    })
}

/**
 * update snippet
 * @param  {object}          snippet
 * @fires  api#refresh.all
 * @return {jQuery.Deferred}         returns snippet object
 */
api.update = function (snippet) {
  return http.PUT({
    module: 'snippet',
    params: {
      action: 'update',
      id: snippet.id
    },
    data: snippet
  })
    .done(function () {
      snippet.content = sanitizer.simpleSanitize(snippet.content)
      cache = null
      snippets[snippet.type].add(snippet, { merge: true })
      api.trigger('refresh.all')
    })
}

/**
 * get snippet
 * @param  {string}          id
 * @return {jQuery.Deferred}
 */
api.get = function (id) {
  return http.GET({
    module: 'snippet',
    params: {
      action: 'get',
      id
    }
  }).then(function (snippet) {
    snippet.content = sanitizer.simpleSanitize(snippet.content)
    return snippet
  })
}

/**
 * get snippets
 * @param  {object[]}        ids
 * @return {jQuery.Deferred}
 */
api.list = function (ids) {
  return http.PUT({
    module: 'snippet',
    params: {
      action: 'list'
    },
    data: ids
  }).then(function success (data) {
    _(data).each(function (snippet) { snippet.content = sanitizer.simpleSanitize(snippet.content) })
    return data
  })
}

/**
 * remove snippets
 * @param  {string}          id
 * @fires  api#refresh.all
 * @return {jQuery.Deferred}    returns empty object
 */
api.destroy = function (id) {
  return http.GET({
    module: 'snippet',
    params: {
      action: 'delete',
      id
    }
  })
    .done(function () {
      cache = null
      snippets.signature.remove(id)
      snippets.template.remove(id)
      api.trigger('refresh.all')
    })
}

export default api
