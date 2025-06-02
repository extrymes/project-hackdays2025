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
import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import mailAPI from '@/io.ox/mail/api'
import accountAPI from '@/io.ox/core/api/account'
import deputyAPI from '@/io.ox/core/deputy/api'
import snippetAPI from '@/io.ox/core/api/snippets'
import * as mailUtil from '@/io.ox/mail/util'
import yell from '@/io.ox/core/yell'
import sender from '@/io.ox/mail/sender'
import quotaAPI from '@/io.ox/core/api/quota'
import manifests from '@/io.ox/core/manifests'
import capabilities from '@/io.ox/core/capabilities'
import { parseRecipients } from '@/io.ox/mail/util'
import '@/io.ox/mail/actions'
import '@/io.ox/mail/compose/actions'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'
import { device } from '@/browser'

const POINT = ext.point('io.ox/mail/compose/boot')
let INDEX = 0
let skipYell

POINT.extend({
  id: 'bundle',
  index: INDEX += 100,
  perform (baton) {
    // stop cascade flow on app quit
    this.on('quit', baton.stopPropagation.bind(baton))
  }
}, {
  id: 'compose-model',
  index: INDEX += 100,
  async perform (baton) {
    const self = this
    if (!_.device('smartphone')) quotaAPI.reload()
    const { default: MailComposeModel } = await import('@/io.ox/mail/compose/model')
    self.model = baton.model = new MailComposeModel(baton.data)
    baton.model.restored = !!(baton.data && baton.data.id)
    await self.model.initialized
  }
}, {
  id: 'compose-view',
  index: INDEX += 100,
  perform (baton) {
    const self = this
    return Promise.all([import('@/io.ox/mail/compose/config'), import('@/io.ox/mail/compose/view')])
      .then(([{ default: MailComposeConfig }, { default: MailComposeView }]) => {
        const attachments = baton.model.get('attachments')
        const vcard = !!(attachments && attachments.findWhere({ origin: 'VCARD' }))
        const type = self.model.type
        self.config = new MailComposeConfig(_.extend({}, baton.config, { type, vcard }))
        self.view = baton.view = new MailComposeView({ app: self, model: self.model, config: self.config })
        if (_.device('smartphone')) return
        baton.win.nodes.body.append(self.view.toolbarContainer)
      })
  }
}, {
  id: 'fix-custom-displayname',
  index: INDEX += 100,
  perform () {
    // sender collections stores latest sender data and updates defaultNames
    return sender.collection.fetched
  }
}, {
  id: 'fix-from',
  index: INDEX += 100,
  perform () {
    const model = this.model
    const config = this.config

    function setDefaultAddress () {
      return accountAPI.getPrimaryAddressFromFolder(mailAPI.getDefaultFolder())
        .then(address => model.set('from', address))
    }
    if (!settings.get('features/allowExternalSMTP', true)) return setDefaultAddress()
    if (model.get('from')) return

    return getGranteeAddress().then(granteeAddress => {
      const isGranteeAddress = !_.isEmpty(granteeAddress)
      const folder = isGranteeAddress || !settings.get('features/allowExternalSMTP', true)
        ? mailAPI.getDefaultFolder()
        : config.get('folderId')
      return accountAPI.getPrimaryAddressFromFolder(folder).then(address => {
        return isGranteeAddress
          ? model.set({ from: granteeAddress, sender: address })
          : model.set({ from: address })
      }).catch(setDefaultAddress)
    })

    function getGranteeAddress () {
      return capabilities.has('deputy')
        ? deputyAPI.getGranteeAddressFromFolder(config.get('folderId'))
        : $.when([])
    }
  }

}, {
  id: 'fix-displayname',
  index: INDEX += 100,
  perform () {
    const model = this.model
    const config = this.config
    const keys = capabilities.has('deputy') ? ['from', 'sender'] : ['from']

    updateDisplayName()
    this.view.listenTo(config, 'change:sendDisplayName', updateDisplayName)
    this.view.listenTo(ox, 'change:customDisplayNames', updateDisplayName)
    this.view.listenTo(sender.collection, 'reset', updateDisplayName)

    // fix current value
    function updateDisplayName () {
      keys.forEach(key => {
        let address = model.get(key)
        if (!address) return
        address = sender.collection.getAsArray(address[1], { name: config.get('sendDisplayName') }) || address
        model.set(key, address)
      })
    }
  }
}, {
  id: 'reply-to',
  index: INDEX += 100,
  perform () {
    const { model, view } = this
    const replyTo = model.get('reply_to')

    // disable auto-fill for custom pre filled reply_to
    if (Array.isArray(replyTo) && replyTo.length) return

    let isDefaultValue = true

    function setDefaultReplyTo (options = { silent: false, _setDefaultReplyTo: true }) {
      const from = model.get('from')
      if (!from) return
      const replyTo = accountAPI.getReplyToAddress(from[1])
      model.set('reply_to', replyTo ? parseRecipients(replyTo) : [], options)
      isDefaultValue = true
    }

    function ensureVisibleTokenfield (model, replyTo, options = {}) {
      // distinguish between user input and auto-fill by 'setDefaultReplyTo'
      if (!options._setDefaultReplyTo) return
      if (!replyTo?.length) return
      view.$('div[data-extension-id="reply_to"]').removeClass('hidden')
    }

    // update according to account data in case user did not change default value
    this.listenTo(model, 'change:from', () => { if (isDefaultValue) setDefaultReplyTo() })
    // ensure tokenfield visibility according to field value
    this.listenTo(model, 'change:reply_to', ensureVisibleTokenfield)
    // special case: change:reply_to may also be triggered to force tokenfield redraw
    this.listenTo(model, 'change:reply_to', () => { isDefaultValue = !('reply_to' in model.changed) })

    // fetch account data
    return accountAPI.all().then(() => { setDefaultReplyTo({ silent: true }) })
  }
}, {
  id: 'preserve-mobile-signature',
  index: INDEX += 100,
  perform () {
    // DEPRECATED: Extension point io.ox/mail/compose/boot/preserve-mobile-signature will be removed with 8.24
    if (ox.debug) console.warn('extension point io.ox/mail/compose/boot/preserve-mobile-signature will be removed with 8.24')

    // #. %s is the product name
    const defaultSignature = gt('Sent from %s via mobile', ox.serverConfig.productName)
    const mobileSignature = settings.get('mobileSignature', defaultSignature)

    if (typeof mobileSignature !== 'string' || mobileSignature.trim() === '' || mobileSignature === defaultSignature) return

    snippetAPI.create({
      type: 'signature',
      module: 'io.ox/mail',
      displayname: gt('Mobile Signature'),
      misc: {
        'content-type': 'text/html',
        insertion: 'below'
      },
      content: `<div class="default-style">${mobileSignature}</div>`
    })
    settings.remove('mobileSignatureType')
    settings.remove('mobileSignature')
    settings.save()
  }
}, {
  id: 'load-signature',
  index: INDEX += 100,
  perform () {
    const self = this
    const def = this.view.signaturesLoading = $.Deferred()
    const collection = snippetAPI.getCollection('signature')

    self.config.set('signatures', collection)
    snippetAPI.getAll().always(function () {
      def.resolve(collection)
    })

    return def.then(function (collection) {
      const refresh = _.debounce(this.view.onChangeSignatures.bind(this.view))
      this.view.listenTo(collection, 'add remove reset', refresh, 200)
      return collection
    }.bind(this))
  }
}, {
  id: 'render-view',
  index: INDEX += 100,
  perform (baton) {
    const win = baton.win
    win.nodes.main.removeClass('abs').addClass('scrollable').append(this.view.render().$el)

    // trigger resize of typeahead fields see OXUIB-1317
    const observer = new ResizeObserver(_.throttle(() => $(window).trigger('resize'), 10))
    observer.observe(win.nodes.main.get(0))
    win.on('quit', () => observer.disconnect())
  }
}, {
  id: 'editor-mode',
  index: INDEX += 100,
  perform () {
    // if draft, force editor in the same mode as the draft
    if (this.model.get('meta').editFor) {
      this.config.set('editorMode', this.model.get('contentType') === 'text/plain' ? 'text' : 'html')
    }

    // map 'alternative'
    const isAlternative = this.config.get('preferredEditorMode') === 'alternative' || this.config.get('editorMode') === 'alternative'
    if (!isAlternative) return
    this.config.set('editorMode', this.model.get('contentType') === 'text/plain' ? 'text' : 'html')
  }
}, {
  id: 'auto-bcc',
  index: INDEX += 100,
  perform () {
    if (!settings.get('autobcc') || this.config.is('edit')) return
    this.model.set('bcc', mailUtil.parseRecipients(settings.get('autobcc'), { localpart: false }))
  }
}, {
  id: 'set-mail',
  index: INDEX += 100,
  perform () {
    return this.view.setMail()
  }
}, {
  id: 'initial-signature',
  index: INDEX += 100,
  perform () {
    return this.view.signaturesLoading.then(function () {
      this.config.setInitialSignature(this.model)
    }.bind(this))
  }
}, {
  id: 'initial-patch',
  index: INDEX += 100,
  perform () {
    this.view.dirty(!!this.model.restored)
    this.model.initialPatch()
  }
}, {
  id: 'update-cid',
  index: INDEX += 100,
  perform () {
    // fallback case: clone of actually deleted space
    this.listenTo(this.model, 'change:id', function () {
      this.cid = getAppCID(this.model.toJSON()) || this.cid
    }.bind(this))
  }
}, {
  id: 'deputy-hint',
  index: INDEX += 100,
  perform () {
    if (!capabilities.has('deputy')) return
    if (!settings.get('compose/deputy/hint', true)) return

    const text = gt('This mail was sent on behalf of another person.')

    // use 'hint' to allow manipulation without affecting 'sender' (see toggleEditorMode)
    this.listenTo(this.model, 'change:sender', function (model, value) { this.config.set('hint', !!value) })

    // add hint to mail body
    this.listenTo(this.config, 'change:hint', function onChangeSender (model, value) {
      const isHTML = !!this.view.editor.find
      const isRemove = !value
      const type = (isHTML ? 'html' : 'text') + ':' + (isRemove ? 'remove' : 'append')

      switch (type) {
        case 'html:append':
        case 'text:append': {
          const node = $('<div>').append($('<div class="io-ox-hint">').text(text))
          return this.view.editor.insertPostCite(isHTML ? node.html() : text)
        }
        case 'html:remove':
          return this.view.editor.find('div[class$="io-ox-hint"]').each(function () {
            const node = $(this)
            if (text === node.text().trim()) return node.remove()
            node.removeAttr('class')
          })
        case 'text:remove':
          return this.view.editor.replaceParagraph('\n\n' + text, '')
        default:
      }
    })
  }
}, {
  id: 'update-tooltip',
  index: INDEX += 100,
  perform () {
    if (!this.model.isEmpty() && this.view.isDirty()) return this.updateTooltip(gt('Save and close'))
    this.updateTooltip(gt('Close'))
    this.listenToOnce(this.model, 'before:save', function () {
      this.updateTooltip(gt('Save and close'))
    })
  }
}, {
  id: 'finally',
  index: INDEX += 100,
  perform (baton) {
    const recipientActions = this.view.$el.find('.recipient-actions')
    const typeahead = this.view.$el.find('.mail-input .twitter-typeahead')
    const mailInput = this.view.$el.find('.mail-input')
    const tokenfield = this.view.$el.find('.tokenfield')
    const tokenfields = this.view.$el.find('.mail-input>.tokenfield>input.tokenfield')

    function calculateTokenfieldWidth () {
      // calculate right padding for to field (some languages like chinese need extra space for cc bcc fields)
      let actionsWidth
      let inputWidth
      if (device('smartphone')) {
        actionsWidth = recipientActions.width()
        inputWidth = typeahead.width()
      } else {
        actionsWidth = 50
        inputWidth = mailInput.width()
        tokenfield.css('padding-right', actionsWidth)
      }

      // clear max width for tokenfields to accommodate new max width
      tokenfields.each(function () {
        const tokenfield = $(this).data('bs.tokenfield')
        const attr = $(this).closest('[data-extension-id]').data('extension-id')
        const maxTokenWidth = inputWidth - actionsWidth
        tokenfield.maxTokenWidth = maxTokenWidth < 20 ? 20 : maxTokenWidth
        // trigger redraw
        baton.model.trigger('change:' + attr, baton.model, baton.model.get(attr))
      })
    }
    calculateTokenfieldWidth()

    if (!device('smartphone')) {
      const floating = baton.win.app.attributes.window.floating
      floating.listenTo(floating.model, 'change:mode', calculateTokenfieldWidth)
    }

    const win = baton.win
    // Set window and toolbars visible again
    win.nodes.header.removeClass('sr-only')
    win.nodes.body.removeClass('sr-only').find('.scrollable').scrollTop(0).trigger('scroll')
    win.idle()
    $(window).trigger('resize') // Needed for proper initial resizing in editors
    win.setTitle(this.model.get('subject') || gt('New email'))
    // update app cid for proper matching of draft/space
    this.cid = this.model.get('cid')
    this.trigger('ready')
  }
})

function getAppCID (data) {
  data = data || {}
  // use space id (restore case)
  let id = data.id
  let mailref
  // edit case: prefer "space" instead of "id/folder"
  if (data.type === 'edit' && data.original) {
    mailref = _.cid({ id: data.original.id, folder: data.original.folderId })
    id = ox.ui.spaces[mailref] || mailref
  }
  // fallback: backbone default
  if (!id) return
  return 'io.ox/mail/compose:' + id + ':edit'
}

// multi instance pattern
function createInstance () {
  // application object
  const app = ox.ui.createApp({
    name: 'io.ox/mail/compose',
    title: gt('New email'),
    userContent: true,
    closable: true,
    floating: !_.device('smartphone'),
    size: 'width-xs height-xs',
    load: () => manifests.manager.loadPluginsFor('io.ox/mail/compose')
  })
  let win

  app.setLauncher(() => {
    // get window
    app.setWindow(win = ox.ui.createWindow({
      name: 'io.ox/mail/compose',
      chromeless: true,
      // attributes for the floating window
      floating: !_.device('smartphone'),
      closable: true,
      title: gt('New email')
    }))
  })

  app.failRestore = point => {
    if (!_.isObject(point)) {
      return app.open()
    }

    // duck check: real draft
    if (point.meta) {
      const { id, meta, security } = point
      return app.open({ id, meta, security })
    }
    // common case: mail is already a draft. So we can just edit it
    if (point.restoreById) {
      return app.open({ type: 'edit', original: { folderId: point.folder_id, id: point.id, security: point.security } })
    }
    // backward compatibility: create composition space from old restore point
    const { to, cc, bcc, subject } = point
    const data = { to, cc, bcc, subject }
    if (point.from && point.from[0]) data.from = point.from[0]
    if (point.attachments && point.attachments[0]) {
      data.content = point.attachments[0].content
      data.contentType = point.attachments[0].content_type
    }
    data.meta = {}
    data.meta.security = point.security
    data.requestRqe = point.disp_notification_to
    data.priority = ['high', 'medium', 'low'][(data.priority || 1) - 1]
    return app.open(data)
  }

  app.getContextualHelp = () => 'ox.appsuite.user.sect.email.gui.create.html'

  app.onError = error => {
    if (error) {
      if (/^UPL-0017$/.test(error.code)) {
        const maxResolution = error.error.match(/\d+/)[0]
        error.message = gt('Image upload denied. Its resolution exceeds maximum allowed value of %1$s megapixels.', Math.floor(maxResolution / 1000000))
        return
      }

      if (/^UPL-0016$/.test(error.code)) return

      const isMissing = /^(UI-SPACEMISSING|MSGCS-0007)$/.test(error.code)
      const isConcurrentEditing = /^(MSGCS-0010)$/.test(error.code)
      // consider flags set by plugins (guard for example)
      const isCritical = error.critical
      // critical errors: pause app
      if (isMissing || isConcurrentEditing || isCritical) return app.pause(error)
      yell(error)
    }
    return app.quit()
  }
  app.pause = function (error) {
    const customError = _.extend({ code: 'unknown', error: gt('An error occurred. Please try again.') }, error)
    // custom mappings
    switch (customError.code) {
      case 'UI-SPACEMISSING':
      case 'MSGCS-0007':
        skipYell = true
        customError.message = gt('The mail draft could not be found on the server. It was sent or deleted in the meantime.')
        break
      case 'MSGCS-0010':
        customError.message = gt('This draft has been changed in another tab or browser. Please continue editing the most recent version. If you have closed that tab in the meantime, you can restore the most recent draft here.')
        break
      default:
        break
    }
    // app is in error state now
    app.error = customError
    if (this.model) this.model.paused = true
    // reset potential 'Saving...' message
    if (this.view) this.view.inlineYell('')
    // disable floating window and show error message
    const win = this.get('window')
    const model = this.model
    if (!win) return

    // show window-blocker dialog
    win.busy(undefined, undefined, function () {
      const container = $('<div class="block-message">').append(
        $('<div class="message">').text(customError.message || customError.error),
        $('<div class="actions">')
      )

      // prevents busy spinner
      this.find('.footer').empty().append(container)
      this.idle()

      // add extra close button
      container.find('.actions').append(
        $('<button type="button" class="btn btn-primary">')
          .text(gt('Close'))
          .on('click', function () { app.quit() })
      )

      // restore action for concurrent editing
      if (customError.code === 'MSGCS-0010') {
        container.find('.actions').prepend(
          $('<button type="button" class="btn btn-default">')
            .text(gt('Restore draft'))
            .on('click', restore)
        )
      }
    })

    function restore () {
      app.quit()
      const newapp = createInstance()
      const { id, meta, security } = model.toJSON()
      newapp.launch()
      newapp.open({ id, meta, security }).done(function () {
        newapp.model.claim()
      })
    }
  }

  app.resume = function (data, force) {
    if (!app.error) return
    // does not recover when concurrent editing was identified
    if (!force && app.error && app.error.code === 'MSGCS-0010') return
    // reset error state
    const failRestore = app.error.failRestore
    delete app.error
    if (this.model) delete this.model.paused
    // window handling
    const win = this.get('window')
    if (!win) return
    win.idle()
    // failed on app start
    if (!failRestore || !data) return
    app.failRestore(data.point)
  }

  app.updateTooltip = (text = gt('Save and close')) => {
    if (!win.floating) return
    win.floating.$('.floating-header [data-action="close"]')
      .attr('aria-label', text)
      .find('.fa').attr('title', text)
  }

  app.open = function (obj, config) {
    const def = $.Deferred()
    obj = _.extend({}, obj)

    // edit case for a still openend composition space
    if (obj.space) obj = obj.space

    // update app cid
    const customCID = getAppCID(obj)
    app.cid = customCID || app.cid

    // Set window and toolbars invisible initially
    win.nodes.header.addClass('sr-only')
    win.nodes.body.addClass('sr-only')

    // improve title in compose context
    if (!_.device('smartphone')) win.busy()
    win.show(function () {
      POINT.cascade(app, { data: obj || {}, config, win }).then(function success () {
        def.resolve({ app })
        ox.trigger('mail:' + app.model.get('meta').type + ':ready', obj, app)
      }, async function fail (error) {
        console.error('Startup of mail compose failed', error)

        // to many open spaces
        if (error.code === 'MSGCS-0011') {
          const num = error.error_params[0] || 20
          error.message = gt('You cannot work on more than %1$s drafts at the same time.', num)
        }

        // custom handlers
        await app.onError(_.extend({ failRestore: true }, error))

        def.reject(error)
      })
    })
    return def
  }

  // destroy
  app.setQuit(function () {
    if (app.view && !app.error) return app.view.discard()
  })

  // after view is destroyed
  app.on('quit', function () {
    if (app.model) app.model.destroy()
  })

  // for debugging purposes
  window.compose = app

  return app
}

ox.on('http:error:MSGCS-0007 http:error:MSGCS-0011', error => {
  const customError = _.extend({}, error)
  switch (error.code) {
    // Found no such composition space for identifier: %s
    case 'MSGCS-0007':
      customError.message = gt('The mail draft could not be found on the server. It was sent or deleted in the meantime.')
      break
      // Maximum number of composition spaces is reached. Please terminate existing open spaces in order to open new ones.
    case 'MSGCS-0011':
      customError.message = gt('You cannot work on more than %1$s drafts at the same time.', customError.error_params[0] || 20)
      break
    default:
      break
  }
  // skip the error if it was already displayed
  setTimeout(() => {
    if (!skipYell) yell(customError)
    skipYell = false
  }, 200)
})

export default {

  getApp: createInstance,

  reuse (method, data) {
    const customCID = getAppCID(data)
    return customCID ? ox.ui.App.reuse(customCID) : false
  }
}
