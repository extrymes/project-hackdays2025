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

/**
 * This API defines the 2014 way of accessing XING. There used to be
 * another way, using the OAuth proxy. This is a dedicated interface
 * to provide more functions.
 */

import _ from '@/underscore'
import $ from '@/jquery'

import http from '@/io.ox/core/http'

/*
     * Helpers
     */
const xingGet = function (action, params) {
  return http.GET({
    module: 'xing',
    params: _.extend(params, { action })
  })
}

const xingPost = function (action, params, data) {
  return http.POST({
    module: 'xing',
    params: _.extend(params, { action }),
    data
  })
}

const xingPut = function (action, params, data) {
  return http.PUT({
    module: 'xing',
    params: _.extend(params, { action }),
    data
  })
}

const xingDelete = function (action, params) {
  return http.DELETE({
    module: 'xing',
    params: _.extend(params, { action })
  })
}

/*
     * API methods
     */

const cache = {}

const findByMail = function (emails) {
  if (!emails || emails.length === 0) return $.when({})
  const key = emails.join(',')
  if (cache[key]) return $.when(cache[key])
  return xingPut('find_by_mails', {}, { emails }).done(function (result) {
    cache[key] = result
  })
}

const getUserfeed = function (params) {
  return xingPost('newsfeed', params)
}

const getComments = function (params) {
  return xingGet('get_comments', params)
}

const addComment = function (params) {
  return xingPost('comment', params)
}

const deleteComment = function (params) {
  return xingPost('delete_comment', params)
}

const likeActivity = function (params) {
  return xingPost('like', params)
}

const unlikeActivity = function (params) {
  return xingPost('unlike', params)
}

const getLikes = function (params) {
  return xingGet('get_likes', params)
}

const showActivity = function (params) {
  return xingGet('show_activity', params)
}

const shareActivity = function (params) {
  return xingPost('share_activity', params)
}

const deleteActivity = function (params) {
  return xingDelete('delete_activity', params)
}

const changeStatus = function (params) {
  return xingPost('change_status', params)
}

const createProfile = function (params) {
  return xingPost('create', params)
}

const initiateContactRequest = function (params) {
  return xingPost('contact_request', params)
}

const revokeContactRequest = function (params) {
  return xingDelete('revoke_contact_request', params)
}

const invite = function (params) {
  return xingPost('invite', params)
}

/*
     * Create a folder in contacts with name 'XING' and corresponding subscription
     */
const createSubscription = function () {
  Promise.all([
    import('@/io.ox/core/api/sub'),
    import('@/io.ox/core/sub/model'),
    import('@/io.ox/core/folder/api'),
    import('@/io.ox/keychain/api'),
    import('@/io.ox/core/yell')
  ]).then(function ([{ api: subscriptionsAPI }, { default: subModel }, { default: folderAPI }, { default: keychainAPI }, { default: yell }, settings]) {
    subscriptionsAPI.getSources().done(function (subscriptions) {
      const subs = _(subscriptions).filter(function (s) { return s.id.match('.*xing.*') && s.module === 'contacts' })

      if (subs.length > 0) {
        const sub = subs[0]
        const folder = settings.get(`folder/${sub.module}`)

        folderAPI.create(folder, {
          title: sub.displayName || 'XING'
        }).done(function (folder) {
          const account = keychainAPI.getStandardAccount('xing')
          const model = new subModel.Subscription({
            folder: folder.id,
            entity: { folder: folder.id },
            entityModule: sub.module
          })

          model.setSource(sub, { account: parseInt(account.id, 10) })

          model.save().then(function saveSuccess (id) {
            subscriptionsAPI.refresh({ id, folder: folder.id }).fail(yell)
          }, yell)
        })
      }
    })
  })
}

export default {
  getUserfeed,
  getComments,
  addComment,
  deleteComment,
  likeActivity,
  unlikeActivity,
  getLikes,
  showActivity,
  shareActivity,
  deleteActivity,
  changeStatus,
  createProfile,
  initiateContactRequest,
  revokeContactRequest,
  invite,
  findByMail,
  createSubscription
}
