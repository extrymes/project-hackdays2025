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

// cSpell:ignore ANSWERD, fixtoccbcc

import $ from '@/jquery'
import _ from '@/underscore'
import moment from '@open-xchange/moment'
import ox from '@/ox'
import jobsAPI from '@/io.ox/core/api/jobs'
import http from '@/io.ox/core/http'
import apiFactory from '@/io.ox/core/api/factory'
import folderAPI from '@/io.ox/core/folder/api'
import accountAPI from '@/io.ox/core/api/account'
import * as util from '@/io.ox/mail/util'
import Pool from '@/io.ox/core/api/collection-pool'
import CollectionLoader from '@/io.ox/core/api/collection-loader'
import visibilityApi from '@/io.ox/core/tk/visibility-api-util'
import capabilities from '@/io.ox/core/capabilities'
import sanitizer from '@/io.ox/mail/sanitizer'
import { getMiddlewareVersion } from '@/io.ox/core/util'
import meta from '@/io.ox/core/locale/meta'

import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

// SHOULD NOT USE notifications inside API!

const DELIM = '//'

// color_label resort hash (needed if 7.10.6 MW is used)
// Color order colorNumber_NAME -> POSITION: 0_NONE->10, 1_RED->0, 2_BLUE->6, 3_GREEN->4, 4_GRAY->9, 5_PURPLE->7, 6_LIGHTGREEN->3, 7_ORANGE->1, 8_PINK->8, 9_CYAN->5, 10_YELLOW->2
const colorLabelResortHash = [10, 0, 6, 4, 9, 7, 3, 1, 8, 5, 2]
const colorLabelSort = (a, b) => colorLabelResortHash[a.color_label] - colorLabelResortHash[b.color_label]

// model pool, global for debugging
const pool = window.mailpool = Pool.create('mail')

const fixtoccbcc = settings.get('features/fixtoccbcc')
const showDeleted = !settings.get('features/ignoreDeleted', false)
const sanitize = sanitizer.isEnabled()
const sandboxedCSS = settings.get('features/sandboxedCSS', true)
const enablePdfPreconversion = coreSettings.get('pdf/enablePreconversionOnMailFetch', true)

pool.map = function (data) {
  const cid = _.cid(data); const model = this.get(cid)
  // merge specific headers
  if (model && model.get('headers')) {
    if (!data.headers) data.headers = {}
    data.headers = _.extend(data.headers, model.get('headers'))
  }

  // sanitize content types (we want lowercase 'text/plain' or 'text/html')
  // split by ; because this field might contain further unwanted data
  _([data].concat(data.attachments)).each(function (attachment) {
    if (!attachment) return
    if (/^text\/(plain|html)/i.test(attachment.content_type)) {
      // only clean-up text and html; otherwise we lose data (see bug 43727)
      attachment.content_type = String(attachment.content_type).toLowerCase().split(';')[0]
    }
  })

  // next clean up needs model
  if (!model) return data
  // client-side fix for missing to/cc/bcc fields
  if (fixtoccbcc) {
    ['to', 'cc', 'bcc'].forEach(function (field) {
      const list = model.get(field)
      if (_.isArray(list) && list.length > 0) delete data[field]
    })
  }
  return data
}

// generate basic API
const api = apiFactory({
  module: 'mail',
  keyGenerator (obj) {
    return obj ? (obj.folder_id || obj.folder) + '.' + obj.id + '.' + (obj.view || api.options.requests.get.view || '') : ''
  },
  requests: {
    all: {
      folder: 'default0/INBOX',
      // + flags & color_label
      columns: '601,600,611,102',
      extendColumns: 'io.ox/mail/api/all',
      // received_date
      sort: '661',
      order: 'desc',
      deleted: showDeleted,
      // allow DB cache
      cache: false
    },
    list: {
      action: 'list',
      columns: '102,600,601,602,603,604,605,606,607,608,610,611,614,652,661',
      extendColumns: 'io.ox/mail/api/list'
    },
    get: {
      action: 'get',
      embedded: String(!sandboxedCSS),
      sanitize: String(!sanitize)
    },
    getUnmodified: {
      action: 'get',
      unseen: 'true',
      view: 'html',
      embedded: 'true'
    },
    search: {
      action: 'search',
      folder: 'default0/INBOX',
      columns: '601,600,611',
      extendColumns: 'io.ox/mail/api/all',
      sort: '661',
      order: 'desc',
      getData (query, options) {
        const map = { from: 603, to: 604, cc: 605, subject: 607, text: -1 }; const composite = []
        _(options).each(function (value, key) {
          if (key in map && value === 'on') {
            composite.push({ col: map[key], pattern: query })
          }
        })
        return composite
      }
    }
  },
  // composite key for 'all' cache
  cid (o) {
    return (o.action || 'all') + ':' + o.folder + DELIM + [o.sort, o.order, o.max || 0, !!o.unseen, !!o.deleted].join('.')
  },

  // fail: {
  //     get (e, ids) {
  //         if (e.code === 'MSG-0032') {
  //             // mail no longer exists, so we remove it from caches
  //             // we don't trigger any event here, as it might run into cyclic event chains
  //             api.updateCaches([ids]);
  //         }
  //     }
  // },

  // filter list request (special fix for nested messages; don't have folder; inline action checks fail)
  filter (obj) {
    return obj.folder_id !== undefined || obj.folder !== undefined
  },
  pipe: {
    all (response, opt) {
      // fix sort order for "label"
      if (opt.sort === '102') {
        response.sort(colorLabelSort)
        if (opt.order === 'desc') response.reverse()
      }
      return response
    },
    get (data, options) {
      // inject view (text/html/noimg). need this to generate proper cache keys.
      // data might be plain string, e.g. for mail source
      if (_.isObject(data)) {
        data.view = options.view
      }
      return data
    }
  },
  params: {
    all (options) {
      if (options.sort === 'thread') {
        options.sort = 661
      }
      return options
    }
  },
  // special function for list requests that fall back to a get request (only one item in the array)
  simplify (options) {
    // fix mail unseen issue
    options.simplified.unseen = true
    return options.simplified
  }
})

/**
 * updates the view used for get requests, used on mail settings save to be responsive
 */
api.updateViewSettings = function () {
  api.options.requests.get.view = 'text'
  if (settings.get('allowHtmlMessages', true)) {
    api.options.requests.get.view = settings.get('allowHtmlImages', false) ? 'html' : 'noimg'
  }
  // special event to redraw current detailview
  api.trigger('viewChanged')
}

api.separator = settings.get('defaultseparator', '/')

api.FLAGS = {
  // TODO: Check if this is not a bug ANSWERD -> ANSWERED
  ANSWERD: 1,
  DELETED: 2,
  DRAFT: 4,
  FLAGGED: 8,
  RECENT: 16,
  SEEN: 32,
  USER: 64,
  SPAM: 128,
  FORWARDED: 256
}

api.COLORS = {
  NONE: 0,
  RED: 1,
  ORANGE: 7,
  YELLOW: 10,
  LIGHTGREEN: 6,
  GREEN: 3,
  LIGHTBLUE: 9,
  BLUE: 2,
  PURPLE: 5,
  PINK: 8,
  GRAY: 4
}

// respond to change:flags
pool.get('detail').on('change:flags', function (model) {
  // get previous and current flags to determine if unseen bit has changed
  const previous = util.isUnseen(model.previous('flags'))
  const current = util.isUnseen(model.get('flags'))
  if (previous === current) return
  // update folder
  folderAPI.changeUnseenCounter(model.get('folder_id'), current ? +1 : -1)
})

// respond to removing unseen messages
pool.get('detail').on('remove', function (model) {
  // check if removed message was unseen
  const unseen = util.isUnseen(model.get('flags'))
  if (!unseen) return
  // update folder
  folderAPI.changeUnseenCounter(model.get('folder_id'), -1)
})

const get = api.get
const getAll = api.getAll
const search = api.search

// update thread model
function propagate (model) {
  api.threads.touch(model.toJSON())
}

function getPreferredView () {
  return settings.get('allowHtmlMessages', true) ? 'html' : 'text'
}

function getView (data) {
  const preferred = getPreferredView()

  // 'text' will always be 'text'
  if (preferred === 'text') return 'text'
  // never show images for failed messages
  if (util.authenticity('block', data)) return 'noimg'

  // block images for specific folders
  // even allowlisted senders will not be able to show images
  if (accountAPI.is('spam|confirmed_spam|trash', data.folder_id || data.folder)) return 'noimg'

  // check authenticity && allowlist
  const isTrusted = util.authenticity('box', data) === 'trusted'
  const isAllowlisted = util.isAllowlisted(data)
  if (isTrusted || isAllowlisted) return preferred

  // check for general setting
  if (!settings.get('allowHtmlImages', false)) return 'noimg'

  // finally
  return preferred
}

function sanitizeAttachments (attachments, options, mail) {
  if (!_.isArray(attachments)) {
    // make sure we always have data.attachments (see bug 58631)
    return [{ content: '', content_type: 'text/plain', disp: 'inline', id: '1', sanitized: true, size: 0, truncated: false }]
  }
  // sanitize content Types (we want lowercase 'text/plain' or 'text/html')
  // split by ; because this field might contain further unwanted data
  return attachments.map(function (data) {
    if (!/^text\/(plain|html)/i.test(data.content_type)) return data
    // only clean-up text and html; otherwise we lose data (see bug 43727)
    data.content_type = String(data.content_type).toLowerCase().split(';')[0]
    return sanitizer.sanitize(data, options, mail)
  })
}
function sanitizeMailData (data, options) {
  data.attachments = sanitizeAttachments(data.attachments, options, data)

  if (_.isArray(data.nested_msgs)) {
    data.nested_msgs = data.nested_msgs.map(function (nestedMsg) {
      nestedMsg.attachments = sanitizeAttachments(nestedMsg.attachments, options, nestedMsg)
      return nestedMsg
    })
  }
  return data
}

api.get = function (obj, options = {}) {
  const cid = _.isObject(obj) ? _.cid(obj) : obj
  const model = pool.get('detail').get(cid)
  const useCache = options && (options.cache !== undefined) ? options.cache : true
  const isDefaultView = obj.view === 'noimg' || !obj.view
  let isComplete
  const t0 = _.now()

  if (model) {
    isComplete = !!model.get('attachments')
    // check for cache hit
    if (useCache && !obj.src && isComplete && isDefaultView && !obj.decrypt) return $.when(model.toJSON())
  }

  // set view if needed
  if (!obj.view) obj.view = getView(_.extend({}, obj, model && model.toJSON()))

  // limit default size
  obj.max_size = settings.get('maxSize/view', 1024 * 100)

  // do not process plain text if we prettify text client-side
  obj.process_plain_text = false

  // PDF pre-conversion for mail attachments
  obj.pregenerate_previews = String(enablePdfPreconversion)

  // keep unseen
  obj.unseen = obj.unseen ?? settings.get('markAsRead') !== 'instant'

  // never use factory's internal cache, therefore always 'false' at this point
  return get.call(api, obj, false).done(function (data) {
    // trigger loading time event
    ox.trigger('timing:mail:load', _.now() - t0)
    // don't save raw data in our models. We only want preformated content there
    if (obj.src || obj.view === 'raw') return
    // delete potential 'cid' attribute (see bug 40136); otherwise the mail gets lost
    delete data.cid

    const t1 = window.performance ? window.performance.now() : _.now()
    data = sanitizeMailData(data, { noImages: obj.view === 'noimg' })
    // trigger timing event for sanitize duration
    ox.trigger('timing:mail:sanitize', (window.performance ? window.performance.now() : _.now()) - t1)

    // either update or add model
    if (model) {
      // if we already have a model we promote changes for threads
      model.set(data)
      propagate(model)
    } else {
      // add new model
      pool.add('detail', data)
    }
  })
}

api.getAll = function (options, useCache) {
  options = options || {}

  // special handling for top-level mail account folders
  if (/^default\d+$/.test(options.folder)) return $.when([])

  // support for from-to
  if (options.sort === 'from-to') {
    options.sort = accountAPI.is('sent|drafts', options.folder) ? 604 : 603
  }

  return getAll.call(this, options, useCache)
}

api.search = function (query, options) {
  if (options.sort === 'from-to') {
    options.sort = accountAPI.is('sent|drafts', options.folder) ? 604 : 603
  }
  return search.call(this, query, options)
}

//
// Utility functions
//

function prepareRemove (ids, all) {
  const collection = pool.get('detail')

  // fallback
  all = all || ids

  if (all.length === 1) {
    api.threads.remove(all[0])
    api.threads.touch(all[0])
  }

  // we need the original list of ids "all" to also catch threads
  // that start with an email from the sent folder
  api.trigger('beforedelete', all)

  _(all).each(function (item) {
    const cid = _.cid(item); const model = collection.get(cid)
    if (model) {
      model.preserve = false
      collection.remove(model)
    }
  })
}

function resetFolderByType (type) {
  return pool.resetFolder(accountAPI.getFoldersByType(type))
}

function unsetSorted (list, sort) {
  _(list)
    .chain()
    .pluck('folder_id')
    .uniq()
    .map(pool.getBySorting.bind(pool, sort))
    .flatten()
    .each(function (collection) {
      collection.sorted = false
    })
}

/**
 * wrapper for factories remove to update counters
 * @param  {object[]}        ids
 * @param  {object}          options [see api factory]
 * @return {jQuery.Deferred}         resolves as array
 */
api.remove = (function () {
  let pending = false; let queue = []; let wait = $.Deferred(); const recentlyDeleted = {}

  const dequeue = _.debounce(function () {
    if (queue.length) {
      removeOnServer(queue)
        .done(wait.resolve)
        .fail(wait.reject)
        .fail(fail.bind(null, queue))
      queue = []
      wait = $.Deferred()
    } else {
      pending = false
    }
  }, 5000)

  function fail (ids, e) {
    // handle special case: quota exceeded
    if (e.code === 'MSG-0039') api.trigger('delete:fail:quota', e, ids)
  }

  function enqueue (ids) {
    queue = queue.concat(ids)
    return wait.promise()
  }

  // remember deleted messages for 15 seconds
  function remember (ids) {
    let list = [].concat(ids)
    list.forEach(function (item) {
      recentlyDeleted[_.cid(item)] = true
    })
    setTimeout(function () {
      list.forEach(function (item) {
        delete recentlyDeleted[_.cid(item)]
      })
      list = null
    }, 15000)
  }

  function removeOnServer (ids, force) {
    pending = true
    return http.wait(
      // wait a short moment, so that the UI reacts first, i.e. triggers
      // the next message; apparently a "delete" blocks that otherwise
      _.wait(100).then(function () {
        return http.PUT({
          module: 'mail',
          params: {
            action: 'delete',
            harddelete: !!force,
            returnAffectedFolders: true,
            timestamp: _.then()
          },
          data: http.simplify(ids),
          appendColumns: false
        })
          .done(function (data) {
            // update affected folders
            _(data.folders).each(function (changes, id) {
              folderAPI.pool.getModel(id).set(changes)
            })
            // trigger delete to update notification area
            api.trigger('delete')
            api.trigger('deleted-mails', ids)
            // trigger dedicated event per message
            _(ids).each(function (item) {
              api.trigger('remove:' + _.ecid(item), item)
            })
            // if this is a trash folder trigger special event (quota updates)
            // checking the first id is enough, all id's must be from the same folder anyway when using our UI
            if (accountAPI.is('trash', ids[0].folder_id)) {
              api.trigger('deleted-mails-from-trash')
            } else if (!force) {
              // mails were moved to trash folder if this is was no hard delete
              // invalidate trash folder pool, they have new mails now
              resetFolderByType('trash')
            }
          })
          .fail(function () {
            // something went wrong; let's kind of rollback
            api.trigger('refresh.all')
          })
          .always(dequeue)
      })
    )
  }

  function remove (ids, all, force) {
    try {
      // add to recently deleted hash
      remember(ids)
      // avoid parallel delete requests
      return pending && !force ? enqueue(ids) : removeOnServer(ids, force)
    } finally {
      // try/finally is used to set up http.wait() first
      // otherwise we run into race-conditions (see bug 37707)
      prepareRemove(ids, all)
    }
  }

  remove.getRecentlyDeleted = function () {
    return recentlyDeleted
  }

  remove.isRecentlyDeleted = function (id) {
    return !!recentlyDeleted[id]
  }

  return remove
}())

/**
 * archives a list of files
 * @param  {object[]}        ids
 * @return {jQuery.Deferred}
 */
api.archive = function (ids) {
  if (!_.isArray(ids) || ids.length === 0) return

  prepareRemove(ids)

  return http.wait(
    http.PUT({
      module: 'mail',
      params: { action: 'archive', timestamp: _.then() },
      data: http.simplify(ids)
    })
      .done(function (data) {
        // backend tells us the if the archive folder is new and its id
        if (_(_(data).pluck('created')).contains(true)) {
          // update account data
          accountAPI.reload()
            .then(function () {
              // reload  settings for virtual folder 'virtual/standard' first (bug 52608)
              return settings.reload()
            })
            .done(function () {
              // refresh all folders because the archive folder might be new
              folderAPI.refresh()
              // reload mail views
              api.trigger('refresh.all')
            })
        } else {
          folderAPI.reload(_(data).pluck('id'))
        }
        api.trigger('archive', ids)
      })
  )
}

//
// Archive all messages inside a folder which are older than 90 days
//
api.archiveFolder = function (id, options) {
  options = _.extend({ action: 'archive_folder', folder: id, days: 90 }, options)

  return http.PUT({
    module: 'mail',
    params: options,
    appendColumns: false
  })
    .done(function () {
      // refresh all folders because the archive folder might be new
      folderAPI.refresh()
      // reload mail views
      api.trigger('refresh.all')
      api.trigger('archive-folder', id)
    })
}

/**
 * requests data for all ids
 * @param  {object}          options
 * @param  {boolean}         useCache (default is true)
 * @return {jQuery.Deferred}          returns array of threads
 */
api.getAllThreads = function (options, useCache) {
  // request for brand new thread support
  options = options || {}

  options = $.extend(options, {
    action: 'threadedAll',
    // +flags +color_label
    columns: options.columns || '601,600,611,102',
    sort: options.sort || '661',
    sortKey: 'threaded-' + (options.sort || '661'),
    // TODO: What is this?
    // cSpell:disable-next-line
    konfetti: true,
    order: options.order || 'desc',
    includeSent: !accountAPI.is('sent|drafts', options.folder),
    // never use server cache
    cache: false,
    deleted: showDeleted,
    // apply internal limit to build threads fast enough
    max: options.max || 500
  })

  return getAll.call(this, options, useCache, null, false)
}

const update = function (list, data, apiAction) {
  let move = false
  const modfolder = data.folder_id || data.folder

  // allow single object and arrays
  list = _.isArray(list) ? list : [list]

  // pause http layer
  http.pause()

  // now talk to server
  _(list).map(function (obj) {
    const folder = obj.folder || obj.folder_id
    if (modfolder && modfolder !== folder) move = true
    return http.PUT({
      module: 'mail',
      params: {
        action: apiAction || 'update',
        id: obj.id,
        folder,
        // to be safe
        timestamp: _.then()
      },
      data,
      appendColumns: false
    })
  })
  // resume & trigger refresh
  return http.resume().then(function (response) {
    // trigger update events
    _(list).each(function (obj) {
      api.trigger('update:' + _.ecid(obj), obj)
    })
    if (move) api.trigger('move')
    if (apiAction === 'copy' || move) {
      // give response if its a copy action (to look if there was an error)
      // not doing this as a standardaction to prevent errors with functions looking only for the list parameter
      return { list, response }
    }
    api.trigger('update:after')
    // return list
    return list
  })
}

api.update = function () {
  console.error('Do not call this directly because mail is so special')
}

api.on('not-found', function () {
  api.trigger('refresh.list')
})

/**
 * cleaning up
 * @param  {string]}         folderId
 * @fires  api#refresh.all
 * @return {jQuery.Deferred}
 */
api.expunge = function (folderId) {
  const ids = _(pool.getByFolder(folderId))
    .chain()
    .map(function (collection) {
      return collection.filter(function (model) {
        return util.isDeleted(model.attributes)
      })
    })
    .flatten()
    .pluck('cid')
    .compact()
    .value()

  api.trigger('beforeexpunge', ids)

  // remove deleted messages immediately
  _(pool.getByFolder(folderId)).each(function (collection) {
    collection.set(
      collection.filter(function (model) {
        return !util.isDeleted(model.toJSON())
      })
    )
  })

  return http.PUT({
    module: 'mail',
    appendColumns: false,
    params: { action: 'expunge' },
    data: [folderId]
  })
    .done(function () {
      folderAPI.reload(folderId)
    })
}

//
// Respond to folder API events
//

folderAPI.on({
  'before:clear' (id) {
    // clear target folder
    _(pool.getByFolder(id)).each(function (collection) {
      collection.reset([])
    })
  },
  'clear remove:mail' (data) {
    // reset trash folder
    const [trashId] = accountAPI.getFoldersByType('trash', data.account_id)

    folderAPI.list(trashId, { cache: false })
    _(pool.getByFolder(trashId)).invoke('expire')
  },
  'changesAfterReloading:mail' (model) {
    // if total or unread changed during a folder reload, we need to update the collection (reload happens independent from refresh)
    if (_(model.changed).has('unread') || _(model.changed).has('total')) {
      _(pool.getByFolder(model.id)).invoke('expire')
      api.trigger('changesAfterReloading')
    }
  }
})

/**
 * sets color
 * @param  {object[]}       list  of mail objects
 * @param  {string}         label (numeric color id mapped in api.COLORS)
 * @fires  api#refresh.list
 * @return {jQuery.Promise}       done returns list of mails in current folder
 */
api.changeColor = function (list, label) {
  list = [].concat(list)

  // see Bug 24730 - Folder "INBOX" does not support user-defined flags. Update of color flag ignored.
  label = String(label)

  _(list).each(function (obj) {
    obj.color_label = label
    pool.propagate('change', {
      id: obj.id,
      folder_id: obj.folder_id,
      color_label: parseInt(label, 10) || 0
    })
    // update thread model
    api.threads.touch(obj)
    api.trigger('update:' + _.ecid(obj), obj)
  })

  return http.wait(
    update(list, { color_label: label })
  ).done(function () {
    unsetSorted(list, 102)
  })
}
/**
 * marks list of mails as flagged / unflagged
 * @param  {object[]}        list
 * @fires api#refresh.list
 * @return {jQuery.Deferred}
 */
api.flag = function (list, state) {
  list = [].concat(list)
  const setColorLabel = !_.isBoolean(state)
  const colorLabel = setColorLabel && parseInt(state, 10)
  state = setColorLabel ? colorLabel > 0 : state
  http.pause()
  list.forEach(obj => {
    obj.flags = state ? obj.flags | 8 : obj.flags & ~8
    const change = { id: obj.id, folder_id: obj.folder_id, flags: obj.flags }
    if (setColorLabel) change.color_label = colorLabel
    pool.propagate('change', change)
    // update thread model
    api.threads.touch(obj)
    api.trigger('update:' + _.ecid(obj), obj)
    api.trigger('refresh.flag', list)
    // seems like color_label must no longer be string (see Bug 24730)
    const data = { [state ? 'set_flags' : 'clear_flags']: api.FLAGS.FLAGGED }
    if (setColorLabel) data.color_label = colorLabel
    http.PUT({
      module: 'mail',
      params: { action: 'update', id: obj.id, folder: obj.folder_id, timestamp: _.then() },
      data,
      appendColumns: false
    })
  })
  return http.wait(
    http.resume().done(() => {
      unsetSorted(list, 651)
      unsetSorted(list, 102)
      if (api.allFlaggedMessagesFolder) list.push(api.allFlaggedMessagesFolder)
      folderAPI.reload(list)
    })
  )
}

/**
 * marks list of mails unread
 * @param  {object[]}        list
 * @fires api#refresh.list
 * @return {jQuery.Deferred}
 */
api.markUnread = function (list) {
  list = [].concat(list)

  _(list).each(function (obj) {
    obj.flags = obj.flags & ~32
    pool.propagate('change', {
      id: obj.id,
      folder_id: obj.folder_id,
      flags: obj.flags
    })
    // update thread model
    api.threads.touch(obj)
    api.trigger('update:' + _.ecid(obj), obj)
    api.trigger('refresh.unseen', list)
  })

  return update(list, { flags: api.FLAGS.SEEN, value: false }).done(function () {
    unsetSorted(list, 651)
    folderAPI.reload(list)
    api.trigger('after:refresh.unseen', list)
  })
}

/**
 * marks list of mails read
 * @param  {object[]}        list
 * @fires api#refresh.list
 * @fires api#update:set-seen (list)
 * @return {jQuery.Deferred}
 */
api.markRead = function (list) {
  list = [].concat(list)

  // Address collector must be triggered manually in some cases
  //
  // All elements should be from one folder, it's not possbile in App Suite UI
  // to select mails from different folders and mark them as read. So it should
  // be ok to use the first element only
  const collectAddresses = !accountAPI.is('spam|confirmed_spam|trash', list[0].folder_id)

  _(list).each(function (obj) {
    obj.flags = obj.flags | 32
    pool.propagate('change', {
      id: obj.id,
      folder_id: obj.folder_id,
      flags: obj.flags,
      unseen: false
    })
    // update thread model
    api.threads.touch(obj)
    api.trigger('update:' + _.ecid(obj), obj)
    api.trigger('refresh.seen', list)
    api.trigger('update:set-seen', list) // used by notification area
  })

  return update(list, { flags: api.FLAGS.SEEN, value: true, collect_addresses: collectAddresses }).done(function () {
    unsetSorted(list, 651)
    folderAPI.reload(list)
    api.trigger('after:refresh.seen', list)
  })
}

api.allSeen = function (folder) {
  // loop over detail collection
  pool.get('detail').each(function (model) {
    const data = model.toJSON()
    if (data.folder_id === folder && util.isUnseen(data)) {
      pool.propagate('change', {
        id: data.id,
        folder_id: data.folder_id,
        flags: data.flags | 32
      })
      // update affected threads
      api.threads.touch(data)
    }
  })

  // remove notifications in notification area
  api.trigger('update:set-seen', folder)

  return http.PUT({
    module: 'mail',
    params: {
      action: 'all_seen',
      folder
    },
    appendColumns: false
  })
    .done(function () {
      api.trigger('after:all-seen', folder)
      folderAPI.reload(folder)
    })
}

function handleSpam (list, state) {
  prepareRemove(list)
  // reset spam or inbox folder; we assume that the spam handler will move the message to the spam or inbox folder
  if (state) resetFolderByType('spam')
  else resetFolderByType('inbox')

  http.pause()
  _(list).map(function (item) {
    return http.PUT({
      module: 'mail',
      params: {
        action: 'update',
        id: item.id,
        folder: item.folder_id,
        timestamp: _.then()
      },
      data: { flags: api.FLAGS.SPAM, value: state },
      appendColumns: false
    })
  })
  folderAPI.reload(list[0].folder_id, accountAPI.getFoldersByType(state ? 'spam' : 'inbox'))
  return http.resume()
}

/**
 * marks list of mails as spam
 * @param  {object[]}        list
 * @return {jQuery.Deferred}
 */
api.markSpam = function (list) {
  return handleSpam(list, true)
}

api.noSpam = function (list) {
  return handleSpam(list, false)
}

// combines move & copy
function transfer (type, list, targetFolderId) {
  // mark target folder as expired
  pool.resetFolder(targetFolderId)

  return http.wait(
    update(list, { folder_id: targetFolderId }, type).then(function (data) {
      // assume success
      api.trigger(type, list, targetFolderId)
      folderAPI.reload(targetFolderId, list)
      // any errors? (debugging code below)
      const e = _(data.response).find(function (item) { return !!item.error })
      if (e) {
        // something went wrong; let's kind of rollback
        api.trigger('refresh.all')
        return $.Deferred().reject(e.error)
      }
      // return new IDs on copy
      return type === 'copy' ? _(data.response).pluck('data') : list
    })
  )
}

// cSpell:disable
// debugging error
// e = {
//     error: 'Die zulässige Quota auf dem Mailserver \"dovecot.qa.open-xchange.com\" wurde überschritten.',
//     error_params: ['dovecot.qa.open-xchange.com ', 'applause40', 42, 26, 'NO [OVERQUOTA] Quota exceeded (mailbox for user is full) (0.000 secs).'],
//     code: 'MSG-1024'
// };
// cSpell:enable

/**
 * move mails to another folder
 * @param  {object[]}        list
 * @param  {string}          targetFolderId
 * @fires  api#refresh.all
 * @fires  api#move (list, targetFolderId)
 * @return {jQuery.Deferred}
 */
api.move = function (list, targetFolderId, all) {
  try {
    return transfer('update', list, targetFolderId)
  } finally {
    // try/finally is used so that transfer() set up http.wait()
    // otherwise we run into race-conditions (see bug 37707)
    prepareRemove(list, all)
  }
}

api.moveAll = function (source, target) {
  // clear affected collections
  _(pool.getByFolder(source)).each(function (collection) {
    collection.reset([])
    collection.setComplete(true)
  })

  // be responsive (updates folder counters instantly. Waiting for the request may be slow)
  if (folderAPI.pool.models[source]) {
    folderAPI.pool.models[source].set({
      total: 0,
      unread: 0
    })
  }

  return http.wait(
    http.PUT({
      module: 'mail',
      appendColumns: false,
      params: { action: 'move_all' },
      data: { source, target }
    })
  )
    .done(function () {
      folderAPI.reload([source, target])
    })
}

/**
 * copies a number of mails to another folder
 * @param  {object[]}        list
 * @param  {string}          targetFolderId
 * @return {jQuery.Deferred}
 */
api.copy = function (list, targetFolderId) {
  return transfer('copy', list, targetFolderId)
}

api.autosave = function (obj) {
  api.trigger('before:autosave', { data: obj })
  try {
    const params = {
      action: 'autosave',
      lineWrapAfter: 0
    }
    if (obj.security && obj.security.decrypted) {
      params.decrypt = true // Guard flag, send decrypt if orig E-mail decrypted
      if (obj.security.authentication) params.authToken = obj.security.authentication
    }
    return http.wait(
      http.PUT({
        module: 'mail',
        params,
        data: obj,
        appendColumns: false
      })
        .then(function (result) {
          // reset draft folder
          const draftsFolder = accountAPI.getFoldersByType('drafts')
          pool.resetFolder(draftsFolder)
          folderAPI.reload(draftsFolder)
          api.trigger('autosave')
          return result
        })
    )
  } finally {
    // try/finally is used to set up http.wait() first
    if (obj.msgref) prepareRemove(util.parseMsgref(api.separator, obj.msgref))
  }
}

/**
 * By updating the last access timestamp the referenced file is prevented from being deleted from both session and disk storage.
 * Needed for inline images
 */
api.keepalive = function (id) {
  return http.GET({
    module: 'file',
    params: { action: 'keepalive', id }
  })
}

/**
 * get mail object with unmodified content (in case externalresources warning message was ignored)
 * @param  {object]}         obj (mail object)
 * @return {jQuery.Deferred}     obj (mail object)
 */
api.getUnmodified = function (obj) {
  // has folder?
  if ('folder_id' in obj || 'folder' in obj) {
    return this.get({
      action: 'get',
      id: obj.id,
      folder: obj.folder || obj.folder_id,
      view: 'html',
      decrypt: obj.security && obj.security.decrypted
    }, false).then(sanitizeMailData)
  } else if ('parent' in obj) {
    // nested message!?
    const id = obj.id; const parent = obj.parent
    return this.get({
      action: 'get',
      id: obj.parent.id,
      folder: obj.parent.folder || obj.parent.folder_id,
      view: 'html',
      decrypt: obj.security && obj.security.decrypted
    }, false)
      .then(function (data) {
        return _.chain(data.nested_msgs)
          .filter(function (obj) {
            if (obj.id === id) {
              obj.parent = parent
              return true
            }
            return false
          })
          .first().value()
      }).then(sanitizeMailData)
  }
  console.error('api.getUnmodified(). Invalid case.', obj)
  return $.Deferred().resolve(obj)
}

/**
 * get source code of specified mail
 * @param  {object}          obj (mail)
 * @return {jQuery.Deferred}     returns source string
 */
api.getSource = function (obj) {
  return this.get({
    action: 'get',
    id: obj.id,
    src: true,
    folder: obj.folder || obj.folder_id,
    view: 'html',
    embedded: false
  }, false)
}

api.fetchTextPreview = function (ids) {
  return http.fixList(ids, http.PUT({
    module: 'mail',
    params: { action: 'list', columns: '600,601,663', timezone: 'utc', deleted: showDeleted },
    data: http.simplify(ids)
  }))
    .then(function (response) {
      const hash = {}
      _(response).each(function (item) {
        // please don't change the empty string fallback. if setting this to something else this causes model change events and reloading stuff.
        hash[_.cid(item)] = item.text_preview || ''
      })
      return hash
    })
}

/**
 * save mail attachments in files app
 * @param  {object[]}        list
 * @param  {string}          target (folder id) [optional]
 * @fires  api#refresh.all
 * @return {jQuery.Deferred}
 */
api.saveAttachments = function (list, target) {
  // be robust
  target = target || coreSettings.get('folder/infostore')
  // support for multiple attachments
  list = _.isArray(list) ? list : [list]

  http.pause()
  // loop
  _(list).each(function (data) {
    const params = {
      action: 'attachment',
      id: data.mail.id,
      folder: data.mail.folder_id,
      dest_folder: target,
      attachment: data.id,
      decrypt: (data.security && data.security.decrypted)
    }
    // Guard actions.  If it was from decrypted email pass auth info
    if (data.security && data.security.authentication) params.cryptoAuth = data.security.authentication
    // If saving encrypted copy, but be re-encrypted from original email
    if (data.reEncrypt) params.encrypt = true
    http.PUT({
      module: 'mail',
      params,
      data: { folder_id: target, description: gt('Saved mail attachment') },
      appendColumns: false
    })
  })
  return http.resume().done(function () {
    import('@/io.ox/files/api').then(function ({ default: fileAPI }) {
      fileAPI.pool.resetFolder(target)
      fileAPI.trigger('add:file')
    })
  })
}

/**
 * get url for attachment in requested mode
 * @param  {object} data (attachment)
 * @param  {string} mode ('download', 'zip', 'email, 'view', 'open')
 * @return {string}      url
 */
api.getUrl = function (data, mode, options) {
  const opt = _.extend({ scaleType: 'contain', session: true }, options)
  let url = ox.apiRoot + '/mail'; let first
  if (mode === 'zip') {
    first = _(data).first()
    return url + '?' + $.param({
      action: 'zip_attachments',
      folder: (first.parent || first.mail).folder_id,
      id: (first.parent || first.mail).id,
      attachment: _(data).pluck('id').join(','),
      decrypt: (first.security && first.security.decrypted), // All attachments must be decrypted if Guard emails
      // required here!
      session: ox.session
    })
  } else if (mode === 'eml:reference') {
    // if eml stored as reference use parent object
    return this.getUrl(_([].concat(data)).first().parent, 'eml')
  } else if (mode === 'eml') {
    data = [].concat(data)
    first = _(data).first()
    // multiple?
    if (data.length > 1) {
      // zipped
      return url + '?' + $.param({
        action: 'zip_messages',
        folder: first.folder_id,
        id: _(data).pluck('id').join(','),
        session: ox.session
      })
    }
    // single EML
    url += (first.subject ? '/' + encodeURIComponent(first.subject.replace(/[\\:/]/g, '_') + '.eml') : '') + '?' +
      $.param($.extend(api.reduce(first), {
        action: 'get',
        src: 1,
        save: 1,
        session: ox.session
      }))

    return url
  }

  if (data.space) {
    url = ox.apiRoot + '/mail/compose/' + data.space + '/attachments/' + data.id
    if (opt.session) url += '?session=' + ox.session
    return url
  }
  // inject filename for more convenient file downloads
  const filename = data.filename ? data.filename.replace(/[\\:/]/g, '_').replace(/\(/g, '%28').replace(/\)/, '%29') : undefined
  // scaling options
  const scaling = opt.width && opt.height ? '&scaleType=' + opt.scaleType + '&width=' + opt.width + '&height=' + opt.height : ''
  url += (data.filename ? '/' + encodeURIComponent(filename) : '') + '?' +
    $.param({
      action: 'attachment',
      folder: (data.parent || data.mail).folder_id,
      id: (data.parent || data.mail).id,
      attachment: data.id,
      user: ox.user_id,
      context: ox.context_id,
      // mails don't have a last modified attribute, just use 1
      sequence: 1,
      session: ox.session
    })
  if (data.security && data.security.decrypted) {
    url += '&decrypt=true'
    if (data.security.authentication) {
      url += '&cryptoAuth=' + encodeURIComponent(data.security.authentication)
    }
  }
  switch (mode) {
    case 'view':
    case 'open':
      url += '&delivery=view' + scaling
      break
    case 'download':
      url += '&delivery=download'
      break
    default:
      break
  }
  return url
}

/**
 * some nested mails do not have the full data. Use this request to get the mail (see Bug 46443)
 */
api.getNestedMail = function (data) {
  return http.GET({
    module: 'mail',
    params: {
      action: 'attachment',
      folder: (data.parent || data.mail).folder_id,
      id: (data.parent || data.mail).id,
      attachment: data.id,
      // special parameter to get the json data from a nested mail
      as_json: true
    }
  })
}

let lastUnseenMail = 0

/**
 * checks inbox for new mails
 * @fires api#new-mail (recent, unseen)
 * @return {jQuery.Deferred} done returns { unseen: [], recent: [] }
 */
api.checkInbox = function () {
  // ox.openedInBrowserTab is only true, when ox.tabHandlingEnabled is true and the window is no a core tab
  if (ox.openedInBrowserTab) return $.Deferred().reject()
  // look for new unseen mails in INBOX
  // check all inboxes if setting is set. primary account and external inboxes
  let inboxes = settings.get('notificationsForExternalInboxes', false) ? accountAPI.getFoldersByType('inbox') : ['default0/INBOX']

  // if websockets are enabled, the primary inbox is handled by them, so no need to request it here
  if (capabilities.has('websocket')) inboxes = _(inboxes).without('default0/INBOX')

  // no inboxes to check? we are done here
  if (!inboxes.length) return $.Deferred().reject()

  // look for new unseen mails in INBOX
  const defs = _(inboxes).map(function (inbox) {
    return http.GET({
      module: 'mail',
      params: {
        action: 'all',
        folder: inbox,
        // received_date, id, folder_id, flags, from
        columns: '610,600,601,611,661,603',
        // only unseen mails are interesting here!
        unseen: 'true',
        // any reason to see them?
        deleted: 'false',
        sort: '661',
        order: 'desc',
        // not really sure if limit works as expected
        // if I only fetch 10 mails and my inbox has some unread mails but the first 10 are seen
        // I still get the unread mails
        limit: 100,
        timezone: 'utc'
      }
    })
  })

  return $.when.apply($, defs).then(function (unseen) {
    // put all mails from different accounts in one list
    unseen = (inboxes.length === 1 ? unseen : _(_(arguments).map(function (result) { return result[0] })).flatten())
    // check most recent mail
    const recent = _(unseen).filter(function (obj) {
      // ignore mails 'mark as deleted'
      return obj.date > lastUnseenMail && (obj.flags & 2) !== 2
    })

    // Trigger even if no new mails are added to ensure read mails are removed
    api.trigger('new-mail', recent, unseen)

    if (recent.length > 0) {
      lastUnseenMail = recent[0].date
      api.newMailTitle(true)
    } else {
      // if no new mail set lastUnseenMail to now, to prevent mark as unread to trigger new mail
      // received date is measured in UI timezone
      lastUnseenMail = moment().valueOf()
    }

    return {
      unseen,
      recent: recent || []
    }
  })
}

/**
 * bind to global refresh; clears caches and trigger refresh.all
 * @fires  api#refresh.all
 * @return {jQuery.Promise}
 */
api.refresh = function () {
  // do not react on events when user has no mail (e.g. drive only)
  // ox.openedInBrowserTab is only true, when ox.tabHandlingEnabled is true and the window is no a core tab
  if (!ox.online || !capabilities.has('webmail') || ox.openedInBrowserTab) return
  return api.checkInbox().always(function () {
    api.trigger('refresh.all')
  })
}

/**
 * @return {string} default folder for mail
 */
api.getDefaultFolder = function () {
  return folderAPI.getDefaultFolder('mail')
}

/**
 * get account id
 * @param  {[type]} initialFolder (folder id)
 * @return {string}               account id
 */
api.getAccountIDFromFolder = function (initialFolder) {
  const accountId = /^default(\d*)\b/.exec(initialFolder)
  return accountId[1]
}

/**
 * beautifies mail text
 * @param  {string}  str
 * @param  {integer} lengthLimit
 * @return {string}
 */
api.beautifyMailText = function (str, lengthLimit) {
  lengthLimit = lengthLimit || 500
  str = String(str)
    // remove line breaks
    .replace(/(\r\n|\n|\r)/gm, '')
    // limit overall length
    .substr(0, lengthLimit)
    // reduce dashes
    .replace(/-{3,}/g, '---')
    // remove quotes after line breaks
    .replace(/<br\s?\/?>(&gt;)+/ig, ' ')
    // remove line breaks
    .replace(/<br\s?\/?>/ig, ' ')
    // strip tags
    .replace(/<[^>]+(>|$)/g, '')
    // links
    .replace(/(http(s?):\/\/\S+)/i, '<a href="$1" target="_blank" rel="noopener">http$2://...</a>')
    // convert to simple white space
    .replace(/&#160;/g, ' ')
    // reduce consecutive white space
    .replace(/\s{2,}/g, ' ')
  // trim
  return $.trim(str)
}

/**
 * imports mail as EML
 * @param  {object}          options (file: {}, folder: string )
 * @fires  api#refresh.all
 * @return {jQuery.Deferred}         returns array with objects (id, folder_id)
 */
api.importEML = function (options) {
  const folder = options.folder || api.getDefaultFolder()
  const form = new FormData()
  form.append('file', options.file)

  return http.UPLOAD({
    module: 'mail',
    params: {
      action: 'import',
      folder,
      // don't check from address!
      force: true
    },
    data: form,
    fixPost: true
  })
    .done(function () {
      pool.resetFolder(folder)
      folderAPI.reload(folder)
      api.trigger('refresh.all')
    })
}

// send read receipt
// data must include "folder" and "id"
api.ack = function (data) {
  const to = _.first(data.to) || []
  delete data.to
  return accountAPI.getAddressesFromFolder(data.folder).then(function (addresses) {
    // prefer alias for ack in case mail was addressed to it
    const alias = _.find(addresses.aliases, function (alias) { return alias[1].toLowerCase() === (to[1] || '').toLowerCase() })
    const addressArray = alias || addresses.primary
    const address = addressArray[1]
    let name = addressArray[0]

    // default or custom display name
    const custom = settings.get(['customDisplayNames', address], {})
    name = (custom.overwrite ? custom.name : name || custom.defaultName) || ''
    const from = !name ? address : '"' + name + '" <' + address + '>'

    return http.PUT({
      module: 'mail',
      params: { action: 'receipt_ack' },
      data: _.extend({ from }, data)
    })
  })
}

// some settings need a reset of the mail content cache
settings.on('change:allowHtmlMessages change:allowHtmlImages change:isColorQuoted', function () {
  pool.get('detail').each(function (model) {
    model.unset('attachments', { silent: true })
    model.unset('security', { silent: true })
  })
})

// change API's default options if allowHtmlMessages changes
settings.on('change:allowHtmlMessages', function (value) {
  api.options.requests.get.view = value ? 'noimg' : 'text'
})

accountAPI.on('refresh.all create:account', function () {
  folderAPI.list('1', { cache: false }).done(function () {
    folderAPI.pool.unfetch()
  })
})

// If the folder api creates a new folder in mail, the mail api needs to be refreshed
folderAPI.on('create', function (data) {
  if (data.module === 'mail') api.refresh()
})

/**
 * sets title to 'New Mail' or default
 * @param  {boolean}   state
 * @return {undefined}
 */
api.newMailTitle = (function () {
  let interval = null; let alt = false

  $(visibilityApi).on('visibility-changed', function (e, data) {
    // remove new mail title if page becomes visible again
    if (data.currentHiddenState === false) {
      original()
    }
  })

  function tick () {
    alt = !alt
    document.title = alt ? gt('New mail') : document.customTitle
  }

  function blink () {
    if (interval) return
    // 1s is fast, 2s feels slow, 1.5 is compromise
    interval = setInterval(tick, 1500)
  }

  function original () {
    if (document.customTitle) document.title = document.customTitle
    if (interval) { clearInterval(interval); interval = null }
  }

  return function (state) {
    if (_.device('smartphone') || !visibilityApi.isHidden) return
    if (state === true) blink(); else original()
  }
}())

// publish pool
api.pool = pool

// resolve a list of composite keys
api.resolve = (function () {
  function map (cid) {
    // yep, also in non-threaded mails
    cid = String(cid).replace(/^thread\./, '')
    return pool.get('detail').get(cid)
  }

  return function (list, threaded) {
    // threaded
    if (threaded) return api.threads.resolve(list)
    // non-threaded
    return _(list).chain().map(map).compact().invoke('toJSON').value()
  }
}())

// simple thread support
api.threads = {

  // keys are cid, values are array of flat cids
  hash: {},
  reverse: {},
  collection: {},

  contains (cid) {
    return !!this.hash[cid]
  },

  getModels (cid) {
    if (!_.isString(cid)) return []

    const thread = this.hash[cid] || [cid]
    if (_.isEmpty(this.collection)) {
      this.collection = pool.get('detail')
    }
    return _(thread)
      .chain()
      .map(this.collection.get, this.collection)
      .compact()
      .value()
  },

  get (cid) {
    return _(this.getModels(cid))
      .chain()
      .invoke('toJSON')
      .map(function injectIndex (obj, index) {
        obj.index = index
        return obj
      })
      .value()
  },

  // get 'head' data, for example, to show details of most recent message in list view
  head (data) {
    return data.head || data
  },

  // propagate changed within a thread to root model
  touch (cid) {
    cid = _.isString(cid) ? cid : _.cid(cid)
    const top = this.reverse[cid]
    if (!top || top === cid) return
    pool.propagate('change', _.extend({ timestamp: _.now() }, _.cid(top)))
  },

  // resolve a list of cids
  resolve (list) {
    return _(list).chain()
      .map(function (cid) {
        // strip 'thread.' prefix
        cid = String(cid).replace(/^thread\.(.+)$/, '$1')
        // get thread
        const thread = api.threads.get(cid)
        return thread.length > 0 && thread
      })
      .flatten().compact().value()
  },

  clear () {
    this.hash = {}
    this.reverse = {}
  },

  add (obj) {
    const cid = _.cid(obj)
    this.hash[cid] = obj.thread || [cid]
    _(this.hash[cid]).each(function (threadCid) {
      this.reverse[threadCid] = cid
    }, this)
  },

  remove (cid) {
    cid = _.isString(cid) ? cid : _.cid(cid)
    const top = this.reverse[cid]
    if (!top || !this.hash[top]) return
    this.hash[top] = _(this.hash[top]).without(cid)
  },

  size (cid) {
    cid = _.isString(cid) ? cid : _.cid(cid)
    const top = this.reverse[cid]
    if (!top) return 1
    return (this.hash[top] || [cid]).length
  },

  subject (cid) {
    if (!this.collection.get) return ''
    cid = _.isString(cid) ? cid : _.cid(cid)
    let model
    // get newest message
    const base = this.reverse[cid]
    const newest = _(this.hash[base]).first()
    model = this.collection.get(newest)
    if (model && model.get('subject')) return model.get('subject')
    // get base message
    model = this.collection.get(base)
    return model ? model.get('subject') : ''
  },

  append (existingCID, newCID) {
    const root = this.reverse[existingCID]
    if (!root) return;
    (this.hash[root] = (this.hash[root] || [])).unshift(newCID)
    this.touch(root)
  }
}

// help garbage collector to find dependent models
api.pool.getDependentModels = function (cid) {
  return api.threads.getModels(cid)
}

function filterAllSeen (data) {
  // rewrite folder_id and id
  data.id = data.original_id
  data.folder_id = data.original_folder_id
  // drop seen messages (faster check first)
  if ((data.flags & 32) === 32) return false
  // drop messages from spam and trash
  return !accountAPI.is('spam|confirmed_spam|trash', data.folder_id)
}

// usually default0/virtual/all
api.allMessagesFolder = settings.get('allMessagesFolder')
api.allUnseenMessagesFolder = settings.get('allUnseenMessagesFolder')
// yep, hard-coded; needs virtual folder in Dovecot
api.allFlaggedMessagesFolder = settings.get('features/flagging/virtualFolder') ? 'default0/virtual/flagged' : ''

api.getAllUnseenMessages = function () {
  return http.GET({
    module: 'mail',
    params: {
      action: 'all',
      folder: api.allUnseenMessagesFolder || api.allMessagesFolder,
      // need original_id and original_folder_id
      columns: '600,654,655',
      sort: '661',
      order: 'desc',
      unseen: !api.allUnseenMessagesFolder,
      deleted: !!api.allUnseenMessagesFolder,
      timezone: 'utc'
    }
  })
}

api.getAllFlaggedMessages = function () {
  const folder = api.allFlaggedMessagesFolder
  if (!folder) return $.when([])
  return http.GET({
    module: 'mail',
    params: {
      action: 'all',
      folder,
      columns: '600,654,655',
      sort: '661',
      order: 'desc',
      timezone: 'utc'
    }
  })
}

/*
saves a mail and attachments as pdf to drive. Might be a long running job
mailId: the mail id
folderId: the mail folder containing the source mail
driveFolderId: the drive folder where the pdf should be stored
callback to call if this action is a long running job (usually a yelled message)
*/
api.saveAsPDF = function ({
  mailId,
  mailFolderId,
  driveFolderId,
  callback,
  pageFormat = settings.get('paperFormat', meta.getPaperformat()),
  includeExternalImages = settings.get('allowHtmlImages', true)
}) {
  return jobsAPI.enqueue(http.PUT({
    module: 'mail',
    params: {
      action: 'export_PDF',
      folder: mailFolderId,
      id: mailId,
      allow_enqueue: true
    },
    data: {
      folder_id: driveFolderId,
      appendAttachmentPreviews: true,
      embedAttachmentPreviews: false,
      embedRawAttachments: true,
      embedNonConvertibleAttachments: true,
      includeExternalImages,
      preferRichText: true,
      pageFormat
    }
  }), callback)
}

// collection loader
api.collectionLoader = new CollectionLoader({
  module: 'mail',
  getQueryParams (params) {
    // is all unseen?
    if (params.folder === 'virtual/all-unseen') {
      return {
        virtual: 'unseen',
        action: 'all',
        folder: api.allUnseenMessagesFolder || api.allMessagesFolder,
        // need original_id and original_folder_id
        columns: http.defaultColumns.mail.unseen,
        sort: '661',
        order: 'desc',
        unseen: !api.allUnseenMessagesFolder,
        deleted: !!api.allUnseenMessagesFolder,
        timezone: 'utc',
        limit: '0,250'
      }
    }
    // all flagged
    if (params.folder === api.allFlaggedMessagesFolder) {
      return {
        action: 'all',
        folder: api.allFlaggedMessagesFolder,
        // need original_id and original_folder_id
        columns: http.defaultColumns.mail.unseen,
        sort: '661',
        order: 'desc',
        timezone: 'utc',
        limit: '0,250'
      }
    }
    // use threads?
    // no thread support in drafts/sent folders. This breaks caching (Sent folders get incomplete threads). See OXUIB-853
    if (params.thread === true && !accountAPI.is('sent|drafts', params.folder)) {
      return {
        action: 'threadedAll',
        folder: params.folder,
        categoryid: params.category_id || params.categoryid,
        columns: http.defaultColumns.mail.all,
        sort: params.sort || '661',
        order: params.order || 'desc',
        includeSent: !accountAPI.is('sent|drafts', params.folder),
        max: (params.offset || 0) + 300,
        deleted: showDeleted,
        timezone: 'utc'
      }
    }
    return {
      action: 'all',
      folder: params.folder,
      categoryid: params.category_id || params.categoryid,
      columns: http.defaultColumns.mail.all,
      sort: params.sort || '661',
      order: params.order || 'desc',
      deleted: showDeleted,
      timezone: 'utc'
    }
  },
  filter (item) {
    return !api.remove.isRecentlyDeleted(_.cid(item))
  },
  fail (error) {
    api.trigger('error error:' + error.code, error)
    return error
  },
  httpGet (module, params) {
    // apply static limit for all-unseen
    const { virtual } = params
    params = _(params).omit('virtual', 'data')
    return http.GET({ module, params }).then(function (data) {
      // if we have an old MW we need to resort the mails if sorted by color label. 7.10.6 and 8.x MWs return a different sort order. See OXUIB-1892
      if (getMiddlewareVersion().major === 7 && String(params.sort) === '102') {
        data.sort(colorLabelSort)
        if (params.order === 'asc') data.reverse()
      }
      return virtual === 'unseen' ? _(data).filter(filterAllSeen) : data
    })
  },
  PRIMARY_PAGE_SIZE: settings.get('listview/primaryPageSize', 50),
  SECONDARY_PAGE_SIZE: settings.get('listview/secondaryPageSize', 200)
})

function filterDeleted (item) {
  return !util.isDeleted(item)
}

function getThreadList (obj) {
  // thread references returned within object
  if (obj.thread) return obj.thread
  // may thread references already available in pool
  const current = api.threads.get(_.cid(obj)) || {}
  if (current && current.length > 1) return current
  // no thread references at all
  return [obj]
}

api.processThreadMessage = function (obj) {
  // get thread
  let thread = getThreadList(obj); let list

  // remove deleted mails
  thread = _(list = thread).filter(filterDeleted)
  // don't remove all if all marked as deleted
  if (thread.length === 0) thread = list.slice(0, 1)

  // we use the last item to generate the cid. More robust because unlikely to change.
  const last = _(thread).last()

  // get thread size - deleted messages are ignored; minimum is 1
  const size = thread.length

  // store data of most recent message as head
  // omit index here, because this will trigger render updates of list items when new messages arrive
  obj.head = _({ threadSize: size }).chain().extend(obj).omit('index').value()

  // Use last item's id and folder_id.
  // As we got obj by reference, such changes affect the CID
  // in the collection which is wanted behavior.
  _.extend(obj, last)

  // only store plain composite keys instead of full objects
  obj.thread = _(thread).map(_.cid)
  obj.threadSize = size

  // also copy thread property to 'last' item to detect model changes
  last.thread = _(thread).map(_.cid)

  // add to thread hash - this must be done before the pool so that this
  // hash is up to date if the pool starts propagating changes.
  api.threads.add(obj)

  // add full models to pool
  api.pool.add('detail', thread)
}

api.collectionLoader.noSelect = function (options) {
  // special handling for top-level mail account folders (e.g. bug 34818)
  if (/^default\d+$/.test(options.folder)) return true
  // allow virtual/all
  if (api.allMessagesFolder && options.folder === api.allMessagesFolder) return false
  if (api.allUnseenMessagesFolder && options.folder === api.allUnseenMessagesFolder) return false
  if (api.allFlaggedMessagesFolder && options.folder === api.allFlaggedMessagesFolder) return false
  // check read access
  const model = folderAPI.pool.getModel(options.folder)
  return !model.can('read')
}

api.collectionLoader.each = function (obj, index, offset, params) {
  // copy special header
  if (obj['X-Open-Xchange-Share-URL'] && !obj.headers) {
    obj.headers = { 'X-Open-Xchange-Share-URL': obj['X-Open-Xchange-Share-URL'] }
    delete obj['X-Open-Xchange-Share-URL']
  }

  if (params.action === 'threadedAll') api.processThreadMessage(obj); else api.pool.add('detail', obj)
}

// need this message at several places
api.mailServerDownMessage = gt('Unable to connect to mail server. Possible reasons: The mail server is (temporarily) down or there are network connection problems. Please try again in a few minutes.')

export default api
