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
import folderAPI from '@/io.ox/core/folder/api'
import contactsAPI from '@/io.ox/contacts/api'
import accountAPI from '@/io.ox/core/api/account'
import { settings } from '@/io.ox/mail/settings'

// Important: do not require this directly. Use 'io.ox/mail/api' instead.
// Some external code uses direct endpoints for sending emails and they should
// be able to do this with one request. So we keep the old ui - code with the common endpoints for them

// Important: Please be aware of the difference of 'api' and 'legacyapi'. The later one only contains functions and properties
// declared in this file

const legacyapi = {}

legacyapi.SENDTYPE = {
  NORMAL: 0,
  REPLY: 1,
  FORWARD: 2,
  EDIT_DRAFT: 3,
  DRAFT: 4
}

// composition space id
legacyapi.csid = function () {
  return _.uniqueId() + '.' + _.now()
}

const react = function (action, obj, view) {
  const api = this
  const isDraft = (action === 'edit')
  const isAlternative = (view === 'alternative')

  if (isAlternative) view = obj.content_type === 'text/plain' ? 'text' : 'html'

  // get proper view first
  view = $.trim(view || 'text').toLowerCase()
  view = view === 'text/plain' ? 'text' : view
  view = view === 'text/html' ? 'html' : view

  if (view === 'html' && obj.content_type === 'text/plain' && !isDraft) view = 'text'
  if (view === 'text' && obj.content_type === 'text/plain' && isDraft) view = 'raw'

  // attach original message on touch devices?
  const attachOriginalMessage = obj.attachOriginalMessage || (view === 'text' && _.device('touch') && settings.get('attachOriginalMessage', false) === true)
  const csid = legacyapi.csid()

  return http.PUT({
    module: 'mail',
    // using jQuery's params because it ignores undefined values

    params: $.extend({}, {
      action: isDraft ? 'get' : action || '',
      attachOriginalMessage,
      view,
      setFrom: (/reply|replyall|forward/.test(action)),
      csid,
      embedded: obj.embedded,
      max_size: obj.max_size,
      decrypt: (obj.security && obj.security.decrypted),
      process_plain_text: false
    }),
    data: _([].concat(obj)).map(function (obj) {
      return api.reduce(obj)
    }),
    appendColumns: false
  })
    .then(function (data) {
      let text = ''
      let tmp = ''
      // inject csid
      data.csid = csid
      // transform pseudo-plain text to real text
      if (data.attachments && data.attachments.length) {
        if (data.attachments[0].content === '') {
          // nothing to do - nothing to break
        } else if (data.attachments[0].content_type === 'text/html') {
          // content-type specific
          // robust approach for large mails
          tmp = document.createElement('DIV')
          tmp.innerHTML = data.attachments[0].content
          _(tmp.getElementsByTagName('BLOCKQUOTE')).each(function (node) {
            node.removeAttribute('style')
          })
          text = tmp.innerHTML
          tmp = null
        } else {
          text = $.trim(data.attachments[0].content)
        }
      } else {
        data.attachments = data.attachments || [{}]
      }
      // replace
      data.attachments[0].content = text
      return data
    })
}

/**
 * prepares object content for 'replayall' action
 * @param  {object}          obj  (mail object)
 * @param  {string}          view (html or text)
 * @return {jQuery.Deferred}      done returns prepared object
 */
legacyapi.replyall = function (obj, view) {
  return react.call(this, 'replyall', obj, view)
}

/**
 * prepares object content for 'reply' action
 * @param  {object}          obj  (mail object)
 * @param  {string}          view (html or text)
 * @return {jQuery.Deferred}      done returns prepared object
 */
legacyapi.reply = function (obj, view) {
  return react.call(this, 'reply', obj, view)
}

/**
 * prepares object content for 'forward' action
 * @param  {object}          obj  (mail object)
 * @param  {string}          view (html or text)
 * @return {jQuery.Deferred}      done returns prepared object
 */
legacyapi.forward = function (obj, view) {
  return react.call(this, 'forward', obj, view)
}

/**
 * prepares object content for 'edit' action
 * @param  {object}          obj  (mail object)
 * @param  {string}          view (html or text)
 * @return {jQuery.Deferred}      done returns prepared object
 */
legacyapi.edit = function (obj, view) {
  return react.call(this, 'edit', obj, view)
}

/**
 * sends a mail
 * @param  {object}          data  (mail object)
 * @param  {object[]}        files
 * @param  {jquery}          form  (for 'oldschool')
 * @fires  api#refresh.all
 * @fires  api#refresh.list
 * @return {jQuery.Deferred}
 */
legacyapi.send = function (data, files, form) {
  const api = this
  const flatten = function (recipient) {
    let name = $.trim(recipient[0] || '').replace(/^["']+|["']+$/g, '')
    let address = String(recipient[1] || '')
    const typesuffix = recipient[2] || ''
    const isMSISDN = typesuffix === '/TYPE=PLMN'

    // don't send display name for MSISDN numbers
    if (isMSISDN && !/\/TYPE=PLMN$/.test(address)) {
      name = null
      address = address + typesuffix
    }
    // otherise ... check if name is empty or name and address are identical
    if (name === '' || name === address) name = null
    return [name, address]
  }

  // clone data (to avoid side-effects)
  data = _.clone(data)

  // flatten from, to, cc, bcc
  data.from = _(data.from).map(flatten)
  data.to = _(data.to).map(flatten)
  data.cc = _(data.cc).map(flatten)
  data.bcc = _(data.bcc).map(flatten)
  if (data.share_attachments && data.share_attachments.expiry_date) {
    // explicitly clone share attachments before doing some computations
    data.share_attachments = _.clone(data.share_attachments)
    // expiry date should count from mail send
    data.share_attachments.expiry_date = _.now() + parseInt(data.share_attachments.expiry_date, 10)
  }
  function mapArgs (obj) {
    return {
      args: [{ 'com.openexchange.groupware.contact.pairs': [{ folder: obj.folder_id, id: obj.id }] }],
      identifier: 'com.openexchange.contact'
    }
  }

  if (data.contacts_ids) {
    data.datasources = _.chain(data.contacts_ids).map(mapArgs).value()
  }

  api.trigger('beforesend', { data, files, form })
  ox.trigger('mail:send:start', data, files)

  const deferred = handleSendXHR2(data, files)

  const DELAY = legacyapi.SEND_REFRESH_DELAY
  const isSaveDraft = data.flags === legacyapi.FLAGS.DRAFT
  const csid = data.csid

  legacyapi.queue.add(csid, deferred.abort)

  return deferred
    .done(function () {
      contactsAPI.trigger('maybeNewContact')
      api.trigger('send', { data, files, form })
      ox.trigger('mail:send:stop', data, files)
      if (data.share_attachments) ox.trigger('please:refresh refresh^')
    })
    .fail(function () {
      ox.trigger('mail:send:fail')
    })
    .progress(function (e) {
      // no progress for saving a draft
      if (isSaveDraft) return
      legacyapi.queue.update(csid, e.loaded, e.total)
    })
    .always(function () {
      legacyapi.queue.remove(csid)
    })
    .then(function (text) {
      // wait a moment, then update mail index
      setTimeout(function () {
        // reset collections and folder (to update total count)
        const affectedFolders = _(['inbox', 'sent', 'drafts'])
          .chain()
          .map(function (type) {
            const folders = accountAPI.getFoldersByType(type)
            api.pool.resetFolder(folders)
            return folders
          })
          .flatten()
          .value()
        folderAPI.multiple(affectedFolders, { cache: false })
        api.trigger('refresh.all')
      }, DELAY)
      // IE9
      if (_.isObject(text)) return text
      // process HTML-ish non-JSONP response
      const a = text.indexOf('{')
      const b = text.lastIndexOf('}')
      if (a > -1 && b > -1) {
        return JSON.parse(text.substr(a, b - a + 1))
      }
      return {}
    })
    .then(function (result) {
      if (result.error) {
        return $.Deferred().reject(result).promise()
      } else if (result.data) {
        const base = _(result.data.toString().split(api.separator))
        const id = base.last()
        const folder = base.without(id).join(api.separator)
        $.when(accountAPI.getUnifiedMailboxName(), accountAPI.getPrimaryAddress())
          .done(function (isUnified, senderAddress) {
            // check if mail was sent to self to update inbox counters correctly
            let sendToSelf = false
            _.chain(_.union(data.to, data.cc, data.bcc)).each(function (item) {
              if (item[1] === senderAddress[1]) {
                sendToSelf = true
              }
            })
            // wait a moment, then update folders as well
            setTimeout(function () {
              if (isUnified !== null) {
                folderAPI.refresh()
              } else if (sendToSelf) {
                folderAPI.reload(folder, accountAPI.getInbox())
              } else {
                folderAPI.reload(folder)
              }
            }, DELAY)
          })
      }
      return result
    })
}

// delay to refresh mail list and folders after sending a message
legacyapi.SEND_REFRESH_DELAY = 5000

function handleSendXHR2 (data, files) {
  const form = new FormData()

  // add mail data
  form.append('json_0', JSON.stringify(data))
  // add files
  _(files).each(function (file, index) {
    if (file.name) {
      form.append('file_' + index, file, file.name)
    } else {
      form.append('file_' + index, file)
    }
  })

  return http.UPLOAD({
    module: 'mail',
    params: {
      action: 'new',
      lineWrapAfter: 0,
      // force the response to be json(ish) instead of plain html (fixes some error messages)
      force_json_response: true
    },
    data: form,
    dataType: 'json',
    fixPost: true
  })
}

legacyapi.queue = (function () {
  function pct (loaded, total) {
    if (!total) return 0
    return Math.max(0, Math.min(100, Math.round(loaded / total * 100))) / 100
  }

  return {

    collection: new Backbone.Collection().on('add remove change:pct', function () {
      let loaded = 0; let total = 0; let abort
      this.each(function (model) {
        loaded += model.get('loaded')
        total += model.get('total')
        abort = model.get('abort')
      })
      this.trigger('progress', { count: this.length, loaded, pct: pct(loaded, total), total, abort })
    }),

    add (csid, abort) {
      this.collection.add(new Backbone.Model({ id: csid, loaded: 0, pct: 0, total: 0, abort }))
    },

    remove (csid) {
      const model = this.collection.get(csid)
      this.collection.remove(model)
    },

    update (csid, loaded, total) {
      const model = this.collection.get(csid)
      if (!model) return
      model.set({ loaded, pct: pct(loaded, total), total })
    }
  }
}())

export default legacyapi
