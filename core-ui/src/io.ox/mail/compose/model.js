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
import moment from '@open-xchange/moment'
import ox from '@/ox'
import composeAPI from '@/io.ox/mail/compose/api'
import mailAPI from '@/io.ox/mail/api'
import Attachments from '@/io.ox/core/attachments/backbone'
import sanitizer from '@/io.ox/mail/sanitizer'
import * as mailUtil from '@/io.ox/mail/util'
import ext from '@/io.ox/core/extensions'
import { handleExceedingLimits, exceedsThreshold, exceedsMailQuota } from '@/io.ox/mail/compose/util'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

// some notes about composition spaces
// ---
// since 7.10.5 middleware supports two types
// a) database drafts (identifiable by 'rdb.' id-prefix )
// - available since 7.10.2
// - changes are written into the database
// - once space gets closed (save as draft/send) a mail is written
// b) real drafts (identifiable by 'draft.' id-prefix)
// - available since 7.10.5
// - every change immediately gets written as draft mail
// - every change creates a new mail (see 'mailPath' prop) and removes the old one

const attachmentsAPI = composeAPI.space.attachments

export default Backbone.Model.extend({

  defaults () {
    return {
      // from: '',
      to: [],
      cc: [],
      bcc: [],
      reply_to: [],
      subject: '',
      content: '',
      contentType: '',
      attachments: [],
      meta: {
        // new/reply/reply_all/forward_inline/forward_attachment/resend
        type: 'new',
        date: '',
        originalId: '',
        originalFolderId: ''
      },
      security: {
        encrypt: false,
        pgpInline: false,
        sign: false
      },
      requestReadReceipt: false,
      priority: 'normal',
      sharedAttachments: {
        language: '',
        enabled: false,
        autodelete: false,
        expiryDate: '',
        password: ''
      }
    }
  },

  initialize () {
    this.initialized = this.create().then(data => {
      const serverData = _.extend({}, data)
      const fields = ['to', 'cc', 'bcc', 'reply_to']

      // merge to, cc, bcc, reply_to with server response
      fields.forEach(str => {
        data[str] = _.chain()
          .union(this.get(str), data[str])
          .uniq(function (address) {
            return address.length > 1 ? address[1] : address[0]
          })
          .each(function (address) {
            // allow proper diff management (mw returns null, tokenfield uses empty string)
            address[0] = _.isNull(address[0]) ? '' : address[0]
          })
          .value()
      })
      // check for prefilled subject
      if (this.get('subject') && !data.subject) data.subject = this.get('subject')
      const collection = new Attachments.Collection()
      collection.space = data.id
      collection.reset(_(data.attachments).map(function (attachment) {
        return new Attachments.Model(_.extend({}, attachment, { group: 'mail', space: collection.space }))
      }))
      data.attachments = collection

      // update model
      this.set(data)
      if (!this.prevAttributes) this.prevAttributes = serverData
      // add listeners
      this.listenTo(data.attachments, 'remove', this.onRemoveAttachment)
      this.listenTo(data.attachments, 'upload:failed', this.onError)
      this.listenTo(this, 'fail:save', this.onError)
      this.listenTo(composeAPI, 'mailref:' + data.id, this.onChangeMailPath)
      this.listenTo(composeAPI, 'mail-compose-claim:' + data.id, this.onExternalClaim)
    })
    this.pendingDeletedAttachments = $.when()
    this.pendingUploadingAttachments = $.when()
  },

  initialPatch () {
    this.requestSave = _.throttle(this.save.bind(this, false, undefined), settings.get('autoSaveAfter', 15000), { leading: false })
    this.on('change', this.requestSave)

    // explicitly call save here to push the initial changes of the ui (quoting/from/bcc) to the composition space
    const silent = _.device('smartphone')
    return this.save(silent)
  },

  getMailRef () {
    const mailPath = this.get('mailPath')
    if (!mailPath) return
    return _.cid({ id: mailPath.id, folder: mailPath.folderId })
  },

  isEmpty () {
    const hasRecipients = [].concat(this.get('to'), this.get('cc'), this.get('bcc')).length > 0
    const hasContent = !!(this.get('content') + this.get('subject'))
    const hasAttachments = this.get('attachments').length > 0
    return !hasRecipients && !hasAttachments && !hasContent
  },

  onChangeMailPath (mailPath) {
    // ever writing operation creates a new draft
    if (this.get('mailPath')) this.set('mailPath', mailPath)
  },

  onExternalClaim () {
    // when some other browser tab claims write access
    this.onError({ code: 'MSGCS-0010' })
  },

  onError (e) {
    // handled in view
    this.trigger('error', e)
  },

  sendOrSave (method) {
    if (this.paused) return $.when()
    const data = this.toJSON()
    const getFiles = (this.get('attachments') || []).filter(function (model) {
      return model.get('group') === 'localFile'
    }).map(function (model) {
      if (model.resized) return model.resized
      return model.get('originalFile')
    })
    // remove attachments meta as it contains a lot of overhead like base64 encoded preview urls
    data.attachments.forEach(function (attachment) {
      delete attachment.meta
    })
    this.destroyed = true
    return $.when.apply($, getFiles).then(function () {
      const files = _(arguments).toArray()
      return composeAPI.space[method](this.get('id'), data, files)
    }.bind(this)).fail(function () {
      this.destroyed = false
    }.bind(this))
  },

  send () {
    return this.sendOrSave('send')
  },

  saveDraft () {
    return this.sendOrSave('save')
  },

  attachFiles (files) {
    this.get('attachments').add(files)
  },

  attachVCard () {
    attachmentsAPI.vcard(this.get('id')).then(function (vcard) {
      this.get('attachments').add(vcard)
    }.bind(this))
  },

  onRemoveAttachment (model) {
    if (this.destroyed || this.paused) return

    model.trigger('destroy')

    if (model.get('id')) {
      const def = attachmentsAPI.remove(this.get('id'), model.get('id'))
      this.pendingDeletedAttachments = this.pendingDeletedAttachments
        .catch(_.constant()).then(function () {
          return def
        })
    }
  },

  exceedsMailQuota (files) {
    files = files || this.get('attachments')
    return exceedsMailQuota(files)
  },

  exceedsThreshold () {
    return exceedsThreshold(this.get('attachments'))
  },

  quoteMessage: (function () {
    function mailAddress (item) {
      if (item.length < 2) return item[0] || ''
      if (!item[0]) return item[1]
      return item[0] + ' <' + item[1] + '>'
    }
    return function (data) {
      const meta = data.meta
      let original = meta.replyFor || meta.forwardsFor

      // get the content inside the body of the mail
      // yes do this also for multipart alternative., to get rid of excess html like doctype etc (you will get strange artifacts otherwise)
      // in case this is really plain text (couldn't create a situation where it is, also mw says it should always be html), the sanitizer will simply return it as is, no harm done.
      if (data.contentType === 'text/html' || (data.contentType === 'multipart/alternative')) {
        // remove external images when not loaded in the source mail
        data.content = sanitizer.simpleSanitize(data.content, { noImages: !!this.get('excludeImages') })
      }

      original = [].concat(original)[0]
      if (!original || meta.editFor) return data

      return mailAPI.get({ id: original.originalId, folder: original.originalFolderId }, { cache: !settings.get('features/fixContentType', false) }).then(function (mail) {
        const header = []
        if (/^(reply|replyall)$/.test(data.meta.type)) {
          // #. %1$s A date
          // #. %2$s An email address
          // #. Example: On 05/21/2022 2:37 PM CEST richard@open-xchange.com wrote:
          header.push(gt('On %1$s %2$s wrote:', moment(data.meta.date).format('LLL z'), mail.from.map(function (sender) {
            return mailUtil.formatSender(sender, false)
          }).join(', ')))
        } else if (/^forward-inline$/.test(data.meta.type)) {
          header.push(
            gt('---------- Original Message ----------'),
            // #. %1$s An email address
            // #. Example: From: richard@open-xchange.com
            gt('From: %1$s', mail.from.map(mailAddress).join(', ')),
            // #. %1$s An email address or a comma separated list of mail addresses
            gt('To: %1$s', mail.to.map(mailAddress).join(', '))
          )
          if (mail.cc && mail.cc.length > 0) {
            header.push(
              // #. Used to quote the addresses of an address in carbon copy
              // #. %1$s An email address or a comma separated list of mail addresses
              gt('Cc: %1$s', mail.cc.map(mailAddress).join(', '))
            )
          }
          header.push(
            gt('Date: %1$s', moment(data.meta.date).format('LLL z')),
            // #. %1$s The subject of an email
            gt('Subject: %1$s', mail.subject)
          )
        }

        // append two empty lines
        header.push('', '')

        const unquoted = /^forward-inline$/.test(data.meta.type) && settings.get('forwardunquoted', false)
        if (data.contentType === 'text/html') {
          const blockquote = $('<blockquote type="cite">').append(
            header.map(function (line) {
              if (!line) return '<div><br></div>'
              return $('<div>').text(line)
            }),
            data.content
          )
          const sender = mailAddress(mail.from)[1]
          mailUtil.fixMalformattedMails(blockquote.get(0), [sender])
          data.content = mailUtil.getDefaultStyle().node.get(0).outerHTML +
            blockquote.prop(unquoted ? 'innerHTML' : 'outerHTML')
        } else if (data.contentType === 'text/plain') {
          const indent = unquoted ? '' : '> '
          data.content = '\n' +
            header.map(function (line) { return indent + line }).join('\n') +
            ' \n' +
            data.content.trim().split('\n').map(function (l) { return indent + l }).join('\n')
        }

        return data
      })
    }
  }()),

  create () {
    const self = this

    this.type = this.get('type') || 'new'
    this.original = this.get('original')
    // unset type and original since both are only used on creation of a model
    this.unset('type')
    this.unset('original')

    // restore existing
    if (self.has('id')) {
      return composeAPI.space.get(self.get('id')).then(function success (data) {
        self.type = data.meta.type || self.type
        return self.sanitizeContent(data)
      }, function fail (data) {
        const baton = new ext.Baton({ model: self, result: data })
        ext.point('io.ox/mail/compose/actions/get/error').invoke('handler', baton, baton)

        if (baton.handled) {
          return baton.handled.then(function success (data) {
            return self.sanitizeContent(data)
          })
        }

        console.log('Failed to handle GET composition space error', data)
        return $.Deferred().reject(data)
      })
    }

    // new/reply/replyall/forward/resend/edit/copy
    handleExceedingLimits(self, self.get('attachments'))
    const opt = {
      vcard: !/(edit|copy)/.test(this.type) && settings.get('appendVcard', false),
      sharedAttachmentsEnabled: self.get('sharedAttachments').enabled
    }

    return composeAPI.space.add({ type: this.type, original: this.original }, opt).then(function (data) {
      // prevent that empty values overwrite predefined values (see OXUIB-587 )
      if (!this.original) {
        data = _.omit(data, function (value) { return !_.isBoolean(value) && !value })
        data.contentType = this.get('contentType') || data.contentType
      }

      return data.content ? this.quoteMessage(data) : data
    }.bind(this)).then(function (data) {
      if (!this.get('attachments') || !this.get('attachments').length) return data

      return $.when.apply($, this.get('attachments').map(function (attachment) {
        return attachmentsAPI.add(data.id, attachment)
      })).then(function () {
        data.attachments = (data.attachments || []).concat(_.toArray(arguments))
        return data
      }).catch(function (err) {
        if (ox.debug) console.warn('Could not load initial attachments', err)
        return data
      })
    }.bind(this))
  },

  sanitizeContent (data) {
    // get the content inside the body of the mail
    // yes do this also for multipart alternative., to get rid of excess html like doctype etc (you will get strange artefacts otherwise)
    // in case this is really plain text (couldn't create a situation where it is, also mw says it should always be html), the sanitizer will simply return it as is, no harm done.
    if (data && data.content && (data.contentType === 'text/html' || (data.contentType === 'multipart/alternative'))) {
      data.content = sanitizer.simpleSanitize(data.content)
    }
    return data
  },

  /**
   * Traverses the two given objects and only return attributes (and sub attributes) which has been changed.
   * Used to only update necessary parts of the mail model
   */
  deepDiff (old, current) {
    if (_.isUndefined(old)) return current

    current = current || this.attributes
    current = _.omit(current, 'cid', 'mailPath')
    old = _.omit(old, 'cid', 'mailPath')

    return _(current)
      .chain()
      .mapObject(function (value, key) {
        if (value instanceof Backbone.Model || value instanceof Backbone.Collection) value = value.toJSON()
        if (_.isEqual(old[key], value)) return
        return _.isUndefined(value) ? null : value
      })
      .omit(function (value) {
        return _.isUndefined(value)
      })
      .value()
  },

  // claims edit rights for this tab/browser
  claim () {
    return composeAPI.space.claim(this.get('id'))
  },

  save (silent, force) {
    // yes use a proper check for true here, force might be a reference to the model, when called by backbone
    if (force !== true && (this.destroyed || this.paused)) return $.when()
    const prevAttributes = this.prevAttributes
    const attributes = this.toJSON()
    // remove pending inline images from content
    attributes.content = attributes.content.replace(/<img[^>]*data-pending="true"[^>]*>/g, '')

    const diff = this.deepDiff(prevAttributes, attributes)
    // do not upload attachments on save
    delete diff.attachments

    if (_.isEmpty(diff)) return $.when()

    // in case autosave collides with save
    if (this.saving) return this.requestSave()
    this.saving = true

    this.prevAttributes = this.toJSON()

    if (!silent) this.trigger('before:save')
    return composeAPI.space.update(this.get('id'), diff).then(function success () {
      if (!silent) this.trigger('success:save')
    }.bind(this), function fail (e) {
      this.prevAttributes = prevAttributes
      if (ox.debug) console.warn('Update composition space failed', this.get('id'))
      if (!silent) this.trigger('fail:save', e)
    }.bind(this)).always(function () {
      this.saving = false
    }.bind(this))
  },

  destroy () {
    if (this.destroyed || this.paused) return
    if (!this.get('id')) return
    this.destroyed = true
    this.get('attachments').forEach(function (model) { model.trigger('destroy') })

    // collect all uploading attachments and wait for them to be settled before removing the composition space
    // that prevents any edge cases of "composition space not found"
    return $.when(_(this.get('attachments')).pluck('done').map(function (def) {
      return $.when(def).catch()
    }))
      .then(() => { return this.pendingDeletedAttachments })
      // update space one final time so the draft that is moved to the trash has the current data
      .then(() => {
        const silent = true
        const force = true
        return this.save(silent, force)
      })
      // using clone here to include mailPath prop for folder refresh
      .then(() => { return composeAPI.space.remove(this.get('id'), _.clone(this.attributes)) })
  },

  toJSON () {
    const data = Backbone.Model.prototype.toJSON.call(this)
    const attachments = this.get('attachments')
    if (attachments && attachments.toJSON) data.attachments = attachments.toJSON()
    delete data.mailPath
    delete data.cid
    return data
  }

})
