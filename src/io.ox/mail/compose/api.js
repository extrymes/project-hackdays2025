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

import $ from '@/jquery'
import _ from '@/underscore'
import Backbone from '@/backbone'
import ox from '@/ox'
import http from '@/io.ox/core/http'
import contactsAPI from '@/io.ox/contacts/api'
const api = {}
const TOKEN = generateToken()
// used as pseudo-"channel" to propagate claims to all browser tabs
const localStorageKey = 'mail-compose-claim'

ox.ui.spaces = ox.ui.spaces || {}

_.extend(api, Backbone.Events)

// concurrent editing
const claims = (function () {
  const hash = {};

  (function register () {
    if (!window.localStorage) return
    window.addEventListener('storage', function (event) {
      if (event.storageArea !== localStorage || event.key !== localStorageKey) return
      const id = localStorage.getItem(localStorageKey)
      if (!id) return
      // trigger event and remove from claim-hash
      api.trigger(localStorageKey + ':' + id)
      delete hash[id]
    })
  })()

  return {
    get (id) {
      return hash[id]
    },
    set (id, value) {
      if (hash[id]) return
      hash[id] = value
      // propagate to other browser tabs
      if (!window.localStorage) return
      // trigger event and reset
      window.localStorage.setItem(localStorageKey, id)
      window.localStorage.removeItem(localStorageKey)
    }
  }
})()

function generateToken () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let token = ''
  for (let i = 1; i <= 3; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token + String(Date.now())
}

api.queue = (function () {
  function pct (loaded, total) {
    if (!total) return 0
    return Math.max(0, Math.min(100, Math.round(loaded / total * 100))) / 100
  }

  return {

    collection: new Backbone.Collection().on('add remove change:pct', function () {
      let loaded = 0; let total = 0; const abortList = []
      this.each(function (model) {
        loaded += model.get('loaded')
        total += model.get('total')
        // only register abort function if upload is not yet done. Mail sending should not be canceled while the request is handled by the server
        if (model.get('loaded') < model.get('total')) abortList.push({ abort: model.get('abort') })
      })
      this.trigger('progress', { count: this.length, loaded, pct: pct(loaded, total), total, abort: _.invoke.bind(_, abortList, 'abort') })
    }),

    add (model, abort) {
      if (this.collection.get(model.get('id'))) return

      const csid = model.get('id')
      const attachments = model.get('attachments')
      const pending = attachments.filter(function (attachment) {
        return attachment.get('uploaded') < 1
      })
      const loaded = pending.reduce(function (memo, attachment) {
        return memo + attachment.get('uploaded')
      }, 0)
      const total = pending.length + 1
      const uploadModel = new Backbone.Model({ id: csid, loaded, pct: pct(loaded, total), total, abort })

      attachments.on('change:uploaded', function (model) {
        let loaded = uploadModel.get('loaded')
        loaded += (model.get('uploaded') - model.previous('uploaded'))
        uploadModel.set({ loaded, pct: pct(loaded, total) })
      })

      this.collection.add(uploadModel)
    },

    remove (csid) {
      const model = this.collection.get(csid)
      this.collection.remove(model)
    },

    update (csid, loaded, total, abort) {
      const model = this.collection.get(csid)
      if (!model) return
      const totalLoad = model.get('total') - 1 + loaded / total
      abort = abort || model.get('abort')
      model.set({ loaded: totalLoad, pct: pct(totalLoad, model.get('total')), abort })
    }
  }
}())

// fill mapping cache (mailref to space) and cid construction
const process = (function () {
  function apply (space) {
    const editFor = space.meta && space.meta.editFor
    const mailPath = space.mailPath; let mailref
    if (editFor && !mailPath) {
      // db drafts (backward compatibility)
      mailref = _.cid({ id: editFor.originalId, folder: editFor.originalFolderId })
      space.cid = 'io.ox/mail/compose:' + mailref + ':edit'
    }
    if (mailPath) {
      // real drafts
      mailref = _.cid({ id: mailPath.id, folder: mailPath.folderId })
      api.trigger('mailref:' + space.id, mailPath)
      space.cid = 'io.ox/mail/compose:' + space.id + ':edit'
    }
    // fallback for db draft from scratch
    space.cid = space.cid || ('io.ox/mail/compose:' + space.id + ':edit')
    // add to mailref mapping;
    ox.ui.spaces[mailref] = space.id
    return space
  }

  return function (data) {
    return _.isArray(data) ? _.map(data, apply) : apply(data)
  }
})()

// composition space
// claim/clientToken:
// - as part of body/url (claim): binds edit rights for this client token
// - as part of url (clientToken): enables middleware check that denies writing calls when clientToken does not match
// - to force edit rights use a patch request WITH claim as body property and WITHOUT clientToken within url (app.space.claim)

api.space = {

  hash: ox.ui.spaces,

  process,

  all () {
    // columns that can be requested are limited to: meta, subject & security
    return http.GET({ url: 'api/mail/compose', params: { action: 'all', columns: 'subject,meta,security' } }).then(process)
  },

  add (obj, opt) {
    // reply or forwarding of single/multiple mails
    const references = JSON.stringify([].concat(obj.original || []))
    return http.POST({
      module: 'mail/compose',
      data: references,
      params: {
        type: obj.type,
        vcard: !!opt.vcard,
        sharedAttachmentsEnabled: opt.sharedAttachmentsEnabled,
        originalAttachments: opt.attachments,
        claim: TOKEN
      },
      contentType: 'application/json'
    }).then(process).done(function (result) {
      claims.set(result.id, 'add')
      api.trigger('add', obj, result)
    })
  },

  get (id) {
    // only claim on GET when not claimed before
    return (claims.get(id) ? $.when() : api.space.claim(id)).then(function () {
      return http.GET({ url: 'api/mail/compose/' + id }).then(process)
    })
  },

  list () {
    return http.GET({ url: 'api/mail/compose' })
  },

  remove (id, data, params = {}) {
    params = { clientToken: TOKEN, harddelete: true, ...params }
    return http.DELETE({ url: 'api/mail/compose/' + id, params }).then(function (data) {
      if (data && data.success) return data
      return $.Deferred().reject({ action: 'remove', error: 'unknown', id })
    }).done(function (result) {
      api.trigger('after:remove', data, result)
    })
  },

  reset () {
    return api.space.list().then(function (list) {
      // process all updates
      _(list).map(function (id) {
        return api.space.remove(id)
      })
      return $.when.apply($, list)
    })
  },

  send (id, data, attachments) {
    data = _(data).clone()

    api.trigger('before:send', id, data)
    ox.trigger('mail:send:start', data)

    if (data.sharedAttachments && data.sharedAttachments.expiryDate) {
      // explicitly clone share attachments before doing some computations
      data.sharedAttachments = _(data.sharedAttachments).clone()
      // expiry date should count from mail send
      data.sharedAttachments.expiryDate = _.now() + parseInt(data.sharedAttachments.expiryDate, 10)
    }

    const formData = new FormData()
    formData.append('JSON', JSON.stringify(data));

    (attachments || []).forEach(function (attachment, index) {
      if (attachment.name) formData.append('file_' + index, attachment, attachment.name)
      else formData.append('file_' + index, attachment)
    })

    const def = http.UPLOAD({
      url: 'api/mail/compose/' + id + '/send',
      data: formData,
      // this call always expects a json response. avoid errors in html format (user only sees json parsing error in this case)
      params: { force_json_response: true, clientToken: TOKEN }
    })

    def.progress(function (e) {
      api.queue.update(id, e.loaded, e.total, def.abort)
    }).fail(function () {
      ox.trigger('mail:send:fail')
    }).always(function () {
      api.queue.remove(id)
    }).done(function (result) {
      contactsAPI.trigger('maybeNewContact')
      api.trigger('after:send', data, result)
      ox.trigger('mail:send:stop', data)
      if (data.sharedAttachments && data.sharedAttachments.enabled) ox.trigger('please:refresh refresh^')
    })

    return def
  },

  save (id, data, attachments) {
    api.trigger('before:save', id, data)

    const formData = new FormData()
    formData.append('JSON', JSON.stringify(data));

    (attachments || []).forEach(function (attachment, index) {
      if (attachment.name) formData.append('file_' + index, attachment, attachment.name)
      else formData.append('file_' + index, attachment)
    })

    return http.UPLOAD({
      url: 'api/mail/compose/' + id + '/save',
      params: { clientToken: TOKEN },
      data: formData
    }).done(function (result) {
      api.trigger('after:save', data, result)
    })
  },

  update (id, data, options) {
    // to bypass server check we force by omitting clientToken queryparam
    const opt = _.extend({ force: !claims.get(id) }, options)
    return http.PATCH({
      url: 'api/mail/compose/' + id,
      params: opt.force ? {} : { clientToken: TOKEN },
      data: $.extend({ claim: TOKEN }, data)
    }).then(process).done(function (result) {
      claims.set(result.id, 'update')
      api.trigger('after:update', data, result)
    })
  },

  claim (id) {
    // to bypass server check we force by omitting clientToken queryparam
    return http.PATCH({
      url: 'api/mail/compose/' + id,
      data: { claim: TOKEN }
    }).then(process).done(function (result) {
      claims.set(result.id, 'claim')
    })
  }
}

function upload (url, data, type) {
  const formData = new FormData()
  formData.append('contentDisposition', (type || 'attachment').toUpperCase())

  if (data.file) {
    if (data.file.name) formData.append('file', data.file, data.file.name)
    else formData.append('file', data.file)
  } else {
    formData.append('JSON', JSON.stringify(data))
  }

  const upload = http.UPLOAD({
    url,
    params: { clientToken: TOKEN },
    data: formData
  })
  const process = upload.then(function (res) {
    return processAttachment(res.data)
  })

  // keep abort function as attribute of the returning promise
  process.abort = upload.abort
  return process
}

const processAttachment = function (data) {
  // result: attachment data with mailPath prop
  const mailPath = data.compositionSpace.mailPath || {}
  const mailref = _.cid({ id: mailPath.id, folder: mailPath.folderId })
  api.trigger('mailref:changed', { mailPath })
  api.trigger('mailref:' + data.compositionSpace.id, mailPath)
  // add to mailref mapping;
  ox.ui.spaces[mailref] = data.compositionSpace.id
  return _.extend({}, data.attachments[0], { mailPath })
}

// composition space
api.space.attachments = {

  original (space) {
    return http.POST({
      url: ox.apiRoot + '/mail/compose/' + space + '/attachments/original',
      params: { clientToken: TOKEN }
    })
  },

  vcard (space) {
    return http.POST({
      url: ox.apiRoot + '/mail/compose/' + space + '/attachments/vcard',
      params: { clientToken: TOKEN }
    }).then(processAttachment)
  },

  add (space, data, type) {
    const url = ox.apiRoot + '/mail/compose/' + space + '/attachments'
    return upload(url, data, type)
  },

  update (space, data, type, attachmentId) {
    const url = ox.apiRoot + '/mail/compose/' + space + '/attachments/' + attachmentId
    return upload(url, data, type)
  },

  get (space, attachment) {
    return http.GET({
      url: ox.apiRoot + '/mail/compose/' + space + '/attachments/' + attachment
    })
  },

  remove (space, attachment) {
    return http.DELETE({
      url: ox.apiRoot + '/mail/compose/' + space + '/attachments/' + attachment,
      params: { clientToken: TOKEN }
    }).then(processAttachment)
  }
}

export default api
