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
import extensions from '@/io.ox/mail/compose/extensions'
import templates from '@/io.ox/mail/compose/templates'
import ext from '@/io.ox/core/extensions'
import composeAPI from '@/io.ox/mail/compose/api'
import mailAPI from '@/io.ox/mail/api'
import accountApi from '@/io.ox/keychain/api'
import * as mailUtil from '@/io.ox/mail/util'
import Attachments from '@/io.ox/core/attachments/backbone'
import ModalDialog from '@/io.ox/backbone/views/modal'
import signatureUtil from '@/io.ox/mail/compose/signatures'
import sanitizer from '@/io.ox/mail/sanitizer'
import * as composeUtil from '@/io.ox/mail/compose/util'
import mini from '@/io.ox/backbone/mini-views/common'
import manifests from '@/io.ox/core/manifests'
import yell from '@/io.ox/core/yell'
import '@/io.ox/mail/style.scss'
import '@/io.ox/mail/compose/style.scss'
import '@/io.ox/mail/compose/actions/send'
import '@/io.ox/mail/compose/actions/save'
import { hasFeature } from '@/io.ox/core/feature'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

import { createIcon, createButton } from '@/io.ox/core/components'

const hasMultipleAccounts = accountApi.getAccountsByType('mail').length > 1

ext.point('io.ox/mail/compose/buttons').extend(
  {
    index: 400,
    id: 'composetoolbar',
    draw (baton) {
      if (_.device('smartphone')) return
      const node = $('<ul data-extension-id="composetoolbar" class="composetoolbar list-unstyled list-inline">')
        .attr({
          'aria-label': gt('Actions. Use cursor keys to navigate.'),
          role: 'toolbar'
        })
      ext.point('io.ox/mail/compose/composetoolbar').invoke('draw', node, baton)
      this.append(node)
    },
    redraw (baton) {
      if (_.device('smartphone')) return
      const node = baton.app.getWindow().nodes.footer.find('.composetoolbar').empty()
      ext.point('io.ox/mail/compose/composetoolbar').invoke('draw', node, baton)
    }
  }
)

ext.point('io.ox/mail/compose/mailto').extend({
  id: 'mailto',
  index: 100,
  setup: _.once(extensions.mailto)
})

ext.point('io.ox/mail/compose/header').extend(
  {
    index: 100,
    id: 'buttons',
    draw (baton) {
      ext.point('io.ox/mail/compose/buttons').invoke('draw', this, baton)
    }
  },
  {
    index: 200,
    id: 'inlineYell',
    draw: !_.device('smartphone') && extensions.inlineYell
  }
)

ext.point('io.ox/mail/compose/fields').extend(
  {
    id: 'header',
    index: 100,
    draw: extensions.header
  },
  {
    id: 'composetoolbar-mobile',
    index: 160,
    draw (baton) {
      if (!_.device('smartphone')) return
      const node = $('<div data-extension-id="composetoolbar-mobile" class="composetoolbar-mobile">')
      ext.point('io.ox/mail/compose/composetoolbar-mobile').invoke('draw', node, baton)
      this.append(node)
    },
    redraw (baton) {
      if (!_.device('smartphone')) return
      const node = this.find('.row.composetoolbar')
      ext.point('io.ox/mail/compose/composetoolbar-mobile').invoke('redraw', node, baton)
    }
  },
  {
    id: 'sender',
    index: 200,
    draw: !_.device('smartphone') && extensions.sender
  },
  {
    id: 'sender-onbehalfof',
    index: 300,
    draw: !_.device('smartphone') && extensions.senderOnBehalfOf
  },
  {
    id: 'sender-realname',
    index: 400,
    draw: !_.device('smartphone') && extensions.senderRealName
  },
  {
    id: 'sender-mobile-multipleAccounts',
    index: 450,
    draw: _.device('smartphone') && hasMultipleAccounts && extensions.sender
  },
  {
    id: 'sender-onbehalfof-mobile-multipleAccounts',
    index: 460,
    draw: _.device('smartphone') && hasMultipleAccounts && extensions.senderOnBehalfOf
  },
  {
    id: 'sender-realname-mobile-multipleAccounts',
    index: 470,
    draw: _.device('smartphone') && hasMultipleAccounts && extensions.senderRealName
  },
  {
    id: 'to',
    index: 500,
    draw: extensions.tokenfield('to')
  },
  {
    id: 'cc',
    index: 600,
    draw: extensions.tokenfield('cc')
  },
  {
    id: 'bcc',
    index: 700,
    draw: extensions.tokenfield('bcc')
  },
  {
    id: 'reply-to',
    index: 750,
    draw: extensions.tokenfield('reply_to')
  },
  {
    id: 'sender-mobile',
    index: 800,
    draw: _.device('smartphone') && !hasMultipleAccounts && extensions.sender
  },
  {
    id: 'sender-onbehalfof-mobile',
    index: 900,
    draw: _.device('smartphone') && !hasMultipleAccounts && extensions.senderOnBehalfOf
  },
  {
    id: 'sender-realname-mobile',
    index: 1000,
    draw: _.device('smartphone') && !hasMultipleAccounts && extensions.senderRealName
  },
  {
    id: 'subject',
    index: 1200,
    draw: extensions.subject
  },
  {
    id: 'attachments',
    index: 1400,
    draw (baton) {
      const node = $('<div data-extension-id="attachments" class="attachments">')
      ext.point('io.ox/mail/compose/attachments').invoke('draw', node, baton)
      this.append(node)

      // toggle visibility of row
      const collection = baton.model.get('attachments')
      function toggle () {
        node.toggleClass('empty', !collection.fileAttachments().length)
      }

      collection.on('add remove reset', toggle)
      toggle()
    }
  },
  {
    id: 'arialive',
    index: 1500,
    draw () {
      const node = $('<div data-extension-id="arialive" class="sr-only" role="alert" aria-live="assertive">')
      this.append(node)
    }
  }
)

ext.point('io.ox/mail/compose/recipientActions').extend({
  id: 'recipientActions',
  index: 100,
  draw: extensions.recipientActions
})

ext.point('io.ox/mail/compose/recipientActionLink').extend({
  id: 'cc',
  index: 100,
  draw: extensions.recipientActionLink('cc')
}, {
  id: 'bcc',
  index: 200,
  draw: extensions.recipientActionLink('bcc')
}, {
  id: 'reply-to',
  index: 300,
  draw: extensions.recipientActionLink('reply_to')
})

ext.point('io.ox/mail/compose/recipientActionsMobile').extend({
  id: 'recipientActionsMobile',
  index: 100,
  draw: extensions.recipientActionsMobile
})

ext.point('io.ox/mail/compose/editors').extend(
  {
    id: 'plain-text',
    label: gt('Plain Text'),
    mode: 'text'
  },
  {
    id: 'tinymce',
    label: gt('HTML'),
    mode: 'html'
  }
)

ext.point('io.ox/mail/compose/menuoptions').extend(
  {
    id: 'signatures',
    index: 100,
    draw: signatureUtil.extensions.options
  },
  {
    id: 'priority',
    index: 200,
    draw () {
      if (_.device('smartphone')) return
      this.data('view')
        .divider()
        .header(gt.pgettext('E-Mail', 'Priority'))
        // #. E-Mail priority
        .option('priority', 'high', gt.pgettext('E-Mail priority', 'High'), { prefix: gt.pgettext('E-Mail', 'Priority'), radio: true })
        // #. E-Mail priority
        .option('priority', 'normal', gt.pgettext('E-Mail priority', 'Normal'), { prefix: gt.pgettext('E-Mail', 'Priority'), radio: true })
        // #. E-Mail priority
        .option('priority', 'low', gt.pgettext('E-Mail priority', 'Low'), { prefix: gt.pgettext('E-Mail', 'Priority'), radio: true })
    }
  },
  {
    id: 'options',
    index: 300,
    draw (baton) {
      if (_.device('smartphone')) {
        // create some nested dropdowns by hand. Bit hacky but works. Other ways created a11y issues (invisible dropdowns in dom etc)
        this.data('view').link('signatures', gt('Signatures'), () => {
          const dropDown = signatureUtil.extensions.menu(baton)
          dropDown.$el.one('hide.bs.dropdown', () => {
            dropDown.dispose()
            dropDown.$el.remove()
          })
          $(document).trigger('click.bs.dropdown.data-api')
          _.delay(() => {
            $('body').append(dropDown.$el)
            dropDown.open()
          }, 200)
        })
        if (hasFeature('templates')) {
          this.data('view').link('templates', gt('Templates'), () => {
            const dropDown = templates.getDropdown(baton)
            dropDown.$el.one('hide.bs.dropdown', () => {
              dropDown.dispose()
              dropDown.$el.remove()
            })
            $(document).trigger('click.bs.dropdown.data-api')
            _.delay(() => {
              $('body').append(dropDown.$el)
              dropDown.open()
            }, 200
            )
          })
        }
      } else {
        this.data('view')
          .divider()
          .header(gt('Options'))
      }
      this.data('view')
        .option('vcard', true, gt('Attach Vcard'), { prefix: gt('Options') })
        .option('requestReadReceipt', true, gt('Request read receipt'), { prefix: gt('Options') })
    }
  },
  // guard: index 400
  {
    id: 'editor',
    index: 500,
    draw () {
      if (_.device('smartphone')) return
      const menu = this.data('view')
        .divider()
        .header(gt('Editor'))

      ext.point('io.ox/mail/compose/editors').each(function (point) {
        if (!point.mode && !point.label) return
        menu.option('editorMode', point.mode, point.label, { prefix: gt('Editor'), radio: true })
      })
    }
  },
  {
    id: 'saveAndClose',
    index: 600,
    draw (baton) {
      function saveAndClose () {
        baton.view.saveDraft().then(function () {
          // to prevent "do you want to save" dialog on quit. We just saved the data so that would be pointless
          baton.config.set('autoDismiss', true)
          baton.app.quit()
        })
      }

      this.data('view').divider().link('settings', gt('Save draft and close'), function () {
        // 2 settings:
        // saveOnCloseDontShowAgain, user setting, determines if user wants to be reminded again
        // saveOnCloseShow, server setting, determines if the dialog should show up at all
        if (!settings.get('didYouKnow/saveOnCloseDontShowAgain', false) && settings.get('didYouKnow/saveOnCloseShow', true)) {
          new ModalDialog({ title: gt('Did you know?'), description: gt('Your changes are automatically saved while you compose your email until you finally send it.') })
            .build(function () {
              this.$el.find('.modal-footer').prepend(new mini.CustomCheckboxView(
                {
                  model: settings,
                  label: gt('Do not show again.'),
                  defaultVal: false,
                  name: 'didYouKnow/saveOnCloseDontShowAgain'
                }
              ).render().$el.addClass('pull-left'))

              settings.once('changed:didYouKnow/saveOnCloseDontShowAgain', function () {
                settings.save()
              })
            })
            .addButton({ label: gt('OK'), action: 'ok' })
            .on('ok', saveAndClose)
            .open()
          return
        }

        saveAndClose()
      })
    }
  }, {
    id: 'editortoolbar-mobile',
    index: 700,
    draw (baton) {
      if (!_.device('smartphone')) return
      this.data('view').divider().link('settings', gt('Show editor toolbar'), function () {
        baton.view.$el.find('.tox-editor-header').show()
        $(window).trigger('resize.tinymce')
      })
    }
  }
)

ext.point('io.ox/mail/compose/composetoolbar-mobile').extend(
  {
    index: 50,
    id: 'title',
    draw: _.device('smartphone') && extensions.title
  },
  {
    id: 'add_attachments',
    index: 100,
    draw: extensions.attachmentmobile
  },
  // Guard
  {
    id: 'security',
    index: 150,
    draw: extensions.security
  },
  {
    id: 'menus',
    index: 200,
    draw: extensions.optionsmenumobile
  }
)

ext.point('io.ox/mail/compose/composetoolbar').extend(
  {
    id: 'toggle-toolbar',
    index: 50,
    draw (baton) {
      const node = $('<li role="presentation" data-extension-id="toggle-toolbar" class="toggle">')
      extensions.toggleToolbar.call(node, baton)
      this.append(node)
    }
  },
  {
    id: 'add_attachments',
    index: 100,
    draw: extensions.attachments
  },
  {
    id: 'templates',
    index: 400,
    draw: templates.drawMenu
  },
  {
    id: 'security',
    index: 100,
    draw: extensions.security
  },
  {
    id: 'menus',
    index: 1000,
    draw: extensions.optionsmenu
  }
)

ext.point('io.ox/mail/compose/attachments').extend({
  id: 'attachmentPreview',
  index: 100,
  draw (baton) {
    const node = $('<div data-extension-id="attachmentPreview">')

    extensions.attachmentPreviewList.call(node, baton)
    extensions.attachmentSharing.call(node, baton)
    extensions.mailSize.call(node, baton)
    extensions.imageResizeOption.call(node, baton)

    node.appendTo(this)
  }
})

// disable attachmentList by default
ext.point('io.ox/mail/compose/attachments').disable('attachmentList')

// via ext.cascade
ext.point('io.ox/mail/compose/editor/load').extend({
  id: 'options',
  index: 100,
  perform (baton) {
    // stop cascade flow on app quit
    this.on('quit', baton.stopPropagation.bind(baton))

    baton.options = {
      useFixedWithFont: settings.get('useFixedWithFont'),
      app: this,
      config: baton.config,
      view: baton.view,
      model: baton.model,
      oxContext: { view: baton.view }
    }
  }
}, {
  id: 'image-loader',
  index: 200,
  perform (baton) {
    const self = this
    const space = baton.model.get('id')

    if (this.config.get('editorMode') !== 'html') return
    baton.options.imageLoader = {
      upload (file) {
        const attachment = new Attachments.Model({ filename: file.name, size: file.size, uploaded: 0, contentDisposition: 'INLINE' })
        const def = new $.Deferred()

        import('@/io.ox/mail/actions/attachmentQuota').then(function ({ default: attachmentQuota }) {
          if (!attachmentQuota.checkQuota(self.model, [], attachment.get('size'))) {
            const $editor = self.view.$el.find('iframe').contents().find('#tinymce')
            $editor.children().remove()
            $editor.append(self.model._previousAttributes.content)
            composeAPI.space.attachments.remove(space, attachment.get('id'))
            return def.reject()
          }

          composeUtil.uploadAttachment({
            model: self.model,
            filename: file.name,
            origin: { file },
            attachment,
            contentDisposition: 'inline'
          })
          attachment.once('upload:failed', def.reject)
          attachment.once('upload:complete', def.resolve)
          self.model.attachFiles([attachment])
        })

        return def
      },
      getUrl (response) {
        return mailAPI.getUrl(_.extend({ space: self.model.get('id') }, response), 'view', { session: false })
      }
    }
  }
}, {
  id: 'editor',
  index: 300,
  async perform (baton) {
    try {
      const view = this.view
      const [{ default: Editor }] = await manifests.manager.loadPluginsFor('io.ox/mail/compose/editor/' + baton.config.get('editorMode'))
      const editor = new Editor(baton.view.editorContainer, baton.options)
      return new Promise(resolve => {
        editor.done(editor => resolve(baton.editor = editor)).then(() => {
          if (_.device('smartphone')) view.$el.find('iframe').contents().find('#tinymce').addClass('smartphone')
        })
      })
    } catch (error) {
      return Promise.reject(new Error({ error: gt("Couldn't load editor") }))
    }
  }
}, {
  id: 'pick',
  index: 400,
  perform (baton) {
    return baton.editor
  }
})

// via ext.cascade
ext.point('io.ox/mail/compose/editor/use').extend({
  id: 'register',
  index: 100,
  perform (baton) {
    const view = baton.view
    if (view.editor) view.stopListening(view.editor)
    view.listenTo(baton.editor, 'change', view.syncMail)
    view.listenTo(baton.config, 'change:signature', view.syncMail)
    // stop cascade flow on app quit
    this.on('quit', baton.stopPropagation.bind(baton))
    // store tinyMCE’s device detection
    baton.editor.once('device:non-desktop', () => {
      baton.config.set('desktop', false)
      baton.config.set('toolbar', false)
    })
    // prevent sync of final `setContent('')` in `clean`
    view.on('clean:before', () => { view.stopListening(baton.editor, 'change', view.syncMail) })
  }
}, {
  id: 'content',
  index: 200,
  perform (baton) {
    const model = baton.model
    const editor = baton.editor
    const htmlToText = model.get('contentType') === 'text/html' && editor.getMode() === 'text'
    const textToHTML = model.get('contentType') === 'text/plain' && editor.getMode() === 'html'
    const setMethod = htmlToText || textToHTML ? 'setPlainText' : 'setContent'
    return $.when(editor[setMethod](baton.content))
  }
}, {
  id: 'model',
  index: 300,
  perform (baton) {
    let contentType = baton.editor.content_type
    if (contentType.toLowerCase() === 'alternative') contentType = 'multipart/alternative'
    baton.model.set({
      content: baton.editor.getContent(),
      contentType
    })
  }
}, {
  id: 'show',
  index: 400,
  perform (baton) {
    const editor = baton.editor
    editor.show()
    baton.view.editor = editor
  }
}, {
  id: 'pick',
  index: 500,
  perform (baton) {
    return baton.editor
  }
})

const MailComposeView = Backbone.View.extend({

  // className: 'io-ox-mail-compose container f6-target',
  className: 'io-ox-mail-compose f6-target',

  events: {
    'click [data-action="add"]': 'toggleTokenfield',
    'keydown [data-extension-id="subject"]': 'flagSubjectField',
    'keyup [data-extension-id="subject"] input': 'setSubject',
    keydown: 'focusSendButton',
    'aria-live-update': 'ariaLiveUpdate'
  },

  initialize (options) {
    _.extend(this, signatureUtil.view, this)
    this.app = options.app
    this.config = options.config
    this.editorHash = {}
    this.messageFormat = options.messageFormat || settings.get('messageFormat', 'html')

    this.editor = null
    this.composeMode = 'compose'
    this.editorId = _.uniqueId('editor-')
    this.editorContainer = $('<div class="editor">').attr({
      'data-editor-id': this.editorId
    })

    this.baton = ext.Baton({
      model: this.model,
      config: this.config,
      view: this,
      app: this.app
    })

    // register for 'dispose' event (using inline function to make this testable via spyOn)
    this.$el.on('dispose', function (event) { this.dispose(event) }.bind(this))

    // see Bug 67872
    // fixes ios iframe focus bug
    if (_.device('tablet && ios < 13')) {
      $(document.body).on('touchstart', this.onTouchStart)
    }
    this.listenTo(this.model, 'keyup:subject change:subject', this.setTitle)
    this.listenTo(this.model, 'change', _.throttle(this.onChangeSaved.bind(this, 'dirty'), 100))
    this.listenTo(this.model, 'before:save', this.onChangeSaved.bind(this, 'saving'))
    this.listenTo(this.model, 'success:save', this.onChangeSaved.bind(this, 'saved'))
    this.listenTo(this.model, 'change:content', this.onChangeContent)
    this.listenTo(this.model, 'error', this.onError)

    this.listenTo(this.config, 'change:editorMode', this.toggleEditorMode)
    this.listenTo(this.config, 'change:vcard', this.onAttachVcard)

    // handler can be found in signatures.js
    this.listenTo(this.config, 'change:signatureId', this.setSignature)
    this.listenTo(this.config, 'change:signatures', this.updateSignatures)
    this.listenTo(this.config, 'change:signature', this.redrawSignature)

    this.model.initialized.then(function () {
      const attachments = this.model.get('attachments')
      this.listenTo(attachments, 'remove', this.onRemoveAttachment)
    }.bind(this))

    let params
    const self = this

    // triggered by mailto?
    const mailto = _.url.hash('mailto')
    if (mailto) {
      const parseRecipients = function (recipients) {
        return recipients.split(/,|;/).filter(recipient => recipient.length > 0).map(recipient => {
          const parts = recipient.replace(/^("([^"]*)"|([^<>]*))?\s*(<(\s*(.*?)\s*)>)?/, '$2//$3//$5')
            .split('//')
            .filter(Boolean)
            .map(str => str.trim())
          return (parts.length === 1) ? [parts[0], parts[0]] : parts
        })
      }
      // remove 'mailto:'' prefix and split at '?''
      const tmp = mailto.replace(/^mailto:/, '').split(/\?/, 2)
      const to = decodeURIComponent(tmp[0])
      params = _.deserialize(tmp[1])
      // see Bug 31345 - [L3] Case sensitivity issue with rich mail while rendering Mailto: link parameters
      for (const key in params) params[key.toLowerCase()] = params[key]
      // save data
      if (to) { this.model.set('to', parseRecipients(to), { silent: true }) }
      if (params.cc) { this.model.set('cc', parseRecipients(params.cc), { silent: true }) }
      if (params.bcc) { this.model.set('bcc', parseRecipients(params.bcc), { silent: true }) }

      // fix line breaks in mailto body (OXUIB-776)
      if (params.body && settings.get('messageFormat') !== 'text') params.body = params.body.replace(/\n/g, '<br>')
      params.body = sanitizer.sanitize({ content: params.body, content_type: 'text/html' }, { WHOLE_DOCUMENT: false }).content
      this.model.set('subject', params.subject || '')
      this.model.set('content', params.body || '')
      // clear hash
      _.url.hash('mailto', null)
    }

    this.listenTo(composeAPI.queue.collection, 'change:pct', this.onSendProgress)

    ext.point('io.ox/mail/compose/mailto').invoke('setup')

    // add dynamic extension point to trigger saveAsDraft on logout
    this.logoutPointId = 'saveMailOnDraft_' + this.app.id

    ext.point('io.ox/core/logout').extend({
      id: this.logoutPointId,
      index: 1000 + this.app.guid,
      logout () {
        if (self.model.paused) return $.when()
        return self.model.save()
      }
    })
  },

  onSendProgress (model, value) {
    const id = this.model.get('id')
    if (id !== model.get('id')) return
    if (value >= 0) this.app.getWindow().busy(value)
  },

  onChangeContent (model, value) {
    // easy one: when content get's removed completely set signature to 'no signature'
    if (value && value !== '<div style="" class="default-style"><br></div>') return
    this.config.set('signatureId', '')
  },

  onError (event) {
    this.app.onError(event)
  },

  ariaLiveUpdate (event, msg) {
    this.$('[data-extension-id="arialive"]').text(msg)
  },

  setSubject (event) {
    const node = $(event.target)
    // A11y: focus mailbody on enter in subject field
    // 'data-enter-keydown' indicates that enter was pressed when subject had focus
    if (event.which === 13 && node?.attr('data-enter-keydown')) {
      event.preventDefault()
      this.editor.focus()
      node.removeAttr('data-enter-keydown')
    }
    const value = node?.val()
    // silent: true is needed only for safari - see bugs 35053 and 65438
    this.model.set('subject', value, { silent: _.device('safari') }).trigger('keyup:subject', value)
  },

  setTitle () {
    this.app.setTitle(this.model.get('subject') || gt('New email'))
  },

  saveDraft () {
    const win = this.app.getWindow()
    // make sure the tokenfields have created all tokens and updated the to cc, bcc attributes
    this.trigger('updateTokens')
    if (win) win.busy()

    const view = this
    const baton = new ext.Baton({
      model: this.model,
      config: this.config,
      app: this.app,
      view,
      catchErrors: true
    })

    const def = $.Deferred()
    ext.point('io.ox/mail/compose/actions/save').cascade(this, baton).then(function (res) {
      // reject if something went wrong
      if (baton.rejected) {
        def.reject(baton.error)
        return res
      }
      def.resolve(res)
    }, def.reject).always(function () {
      if (win) win.idle()
    })
    return def
  },

  // has three states, dirty, saving, saved
  onChangeSaved (state) {
    // just return when dirty and keep showing last saved date
    if (this.autoSaveState === state || state === 'dirty') return

    if (state === 'saving') this.inlineYell(gt('Saving...'))
    // #. %s is a relative date from now, examples: 5 seconds ago, 5 minutes ago etc
    else if (state === 'saved' && this.autoSaveState === 'saving') {
      const lastSave = moment()
      if (_.device('smartphone')) {
        this.inlineYell(() => [createIcon('bi/cloud-upload.svg').addClass('mr-4'), `<span> ${lastSave.fromNow()}</span>`])
      } else {
        this.inlineYell(() => gt('Saved %s', lastSave.fromNow()))
      }
    }
    this.autoSaveState = state
  },

  inlineYell (text) {
    // clear timer if it's there
    clearInterval(this.inlineYellTimer)
    if (!this.$el.is(':visible')) return
    const node = this.$el.closest('.io-ox-mail-compose-window').find('.inline-yell')
    node.empty()

    if (typeof text === 'function') {
      node.append(text())
      this.inlineYellTimer = setInterval(function () {
        const txt = text()
        if (node.text() !== txt) {
          node.empty()
          node.append(txt)
        }
      }, 10000)
    } else {
      node.append(text)
    }
    // only fade in once, then leave it there
    if (node.is(':visible')) return
    node.fadeIn()
  },

  isDirty () {
    return !_.isEmpty(this.model.deepDiff(this.initialModel))
  },

  dirty (state) {
    if (state === false) {
      // update content here as the update events from the editor might be throttled
      if (this.editor) this.model.set('content', this.editor.getContent())
      this.initialModel = this.model.toJSON()
    } else if (state === true) {
      this.initialModel = {}
    }
  },

  clean () {
    // mark as not dirty
    this.dirty(false)
    clearInterval(this.inlineYellTimer)
    // clean up editors
    for (const id in this.editorHash) {
      this.editorHash[id].then(editor => {
        this.trigger('clean:before')
        editor.setContent('')
        editor.destroy()
      })
      delete this.editorHash[id]
    }
  },

  removeLogoutPoint () {
    ext.point('io.ox/core/logout').disable(this.logoutPointId)
  },

  dispose () {
    // remove from queue, to prevent zombies when mail is currently sent
    composeAPI.queue.remove(this.model.get('id'))
    // disable dynamic extension point to trigger saveAsDraft on logout
    this.removeLogoutPoint()
    this.stopListening()
    this.model = null
    $(document.body).off('touchstart', this.onTouchStart)
    delete this.editor

    // remove upload menu view and its listeners
    if (this.baton.uploadMenuView) this.baton.uploadMenuView.dispose()
  },

  // called on app.quit
  discard () {
    if (this.model.paused) return $.when()

    // failRestored spaces are set to dirty at load
    const hasChanged = this.isDirty()
    const isEdit = !!(this.model.get('meta') || {}).editFor
    const isEmpty = this.model.isEmpty()

    // already saved/send?
    if (this.model.destroyed) return this.clean()

    // autosave latest draft
    if (isEdit && !hasChanged) return this.saveDraft().then(this.clean.bind(this))

    // delete
    if (isEmpty || !hasChanged || this.config.get('autoDismiss')) return this.clean()

    // fallback: dialog (this dialog may gets automatically dismissed)
    const self = this
    const def = $.Deferred()
    if (this.app.getWindow && this.app.getWindow().floating) {
      this.app.getWindow().floating.toggle(true)
    } else if (_.device('smartphone')) {
      this.app.getWindow().resume()
    }

    new ModalDialog({
      title: gt('Save draft'),
      description: gt('This email has not been sent. You can save the draft to work on later.'),
      // up to 35rem (560px) because of 3 buttons, french needs this for example
      width: _.device('smartphone') ? undefined : '35rem'
    })
      .addCancelButton()
      .addButton({ label: gt('Save draft'), action: 'savedraft' })
      .addAlternativeButton({ label: gt('Delete draft'), action: 'delete' })
      .on('savedraft', function () {
        self.saveDraft().then(def.resolve, def.reject)
      })
      .on('delete', () => {
        // draft mail gets automatically deleted once the space gets removed (real drafts)
        // MWB-783 covers edit-case for 'rdb'
        return def.resolve()
      })
      .on('cancel', () => def.reject())
      .open()

    return def.then(function () { self.clean() })
  },

  send () {
    // #. This is a prefix of a copied draft and will be removed
    // #. This string must equal the prefix, which is prepended before the subject on copy
    // #. It is important, that the space is also translated, as the space will also be removed
    const str = gt('[Copy] ')
    if ((this.model.get('subject') || '').indexOf(str) === 0) {
      let subject = this.model.get('subject')
      subject = subject.replace(str, '')
      this.model.set('subject', subject)
    }
    // make sure the tokenfields have created all tokens and updated the to cc, bcc attributes
    this.trigger('updateTokens')
    const view = this
    const baton = new ext.Baton({
      model: this.model,
      config: this.config,
      app: this.app,
      view,
      catchErrors: true
    })
    const point = ext.point('io.ox/mail/compose/actions/send')

    this.model.saving = true

    return point.cascade(this, baton).then(function () {
    }).always(function () {
      // a check/user interaction aborted the flow or app is re-opened after a request error;
      // we want to be asked before any unsaved data is discarded again
      if (baton.rejected || baton.error) baton.config.set('autoDismiss', false)
      if (this.model) this.model.saving = false
    }.bind(this))
  },

  onTouchStart () {
    if ($(document.activeElement).is('iframe')) $(document.activeElement).blur()
  },

  toggleTokenfield (event) {
    const isString = typeof event === 'string'
    const type = isString ? event : $(event.target).attr('data-type')
    if (_.device('smartphone')) {
      if (!isString) event.preventDefault()
      const inputFields = this.$el.find(`[data-extension-id="cc"], [data-extension-id="bcc"], [data-extension-id="reply_to"] ${hasMultipleAccounts ? '' : ', [data-extension-id="sender"]'}`)
      if (inputFields.hasClass('hidden')) {
        // show
        inputFields.removeClass('hidden')
        $(event.currentTarget).replaceWith(createButton({ type: 'button', variant: 'toolbar', icon: { name: 'bi/chevron-up.svg', title: gt('Show all'), className: 'bi-12' } })
          .attr({
            'data-action': 'add',
            'aria-expanded': true
          }))
      } else {
        // hide empty (cc, bcc, reply_to) respectively unchanged (sender) fields
        const [ccValue, bccValue, replyToValue] = ['cc', 'bcc', 'reply_to'].map(key => this.model.get(key))
        const [ccNode, bccNode, replyToNode, senderNode] = inputFields
        if (_.isEmpty(ccValue)) {
          this.model.set('cc', [])
          ccNode.classList.add('hidden')
        }
        if (_.isEmpty(bccValue)) {
          this.model.set('bcc', [])
          bccNode.classList.add('hidden')
        }
        if (_.isEmpty(replyToValue)) {
          this.model.set('reply_to', [])
          replyToNode.classList.add('hidden')
        }
        if (senderNode && this.model.get('from').join('|') === this.initialModel.from.join('|')) {
          senderNode.classList.add('hidden')
        }
        $(event.currentTarget).replaceWith(createButton({ type: 'button', variant: 'toolbar', icon: { name: 'bi/chevron-down.svg', title: gt('Show all') } })
          .attr({
            'data-action': 'add',
            'aria-expanded': false
          }))
      }
      return inputFields
    }

    const button = this.$el.find(`[data-type="${CSS.escape(type)}"]`)
    const inputField = this.$el.find(`[data-extension-id="${CSS.escape(type)}"]`)
    if (!isString) event.preventDefault()
    if (inputField.hasClass('hidden') || isString) {
      inputField.removeClass('hidden')
      button.addClass('active')
      if (type === 'cc') button.attr('title', gt('Hide carbon copy input field'))
      if (type === 'bcc') button.attr('title', gt('Hide blind carbon copy input field'))
      if (type === 'reply_to') button.attr('title', gt('Hide reply-to input field'))
    } else if (!this.model.has(type) || _.isEmpty(this.model.get(type))) {
      // We don't want to close it automatically! Bug: 35730
      this.model.set(type, [])
      inputField.addClass('hidden')
      button.removeClass('active')
      if (type === 'cc') button.attr('title', gt('Show carbon copy input field'))
      if (type === 'bcc') button.attr('title', gt('Show blind carbon copy input field'))
      if (type === 'reply_to') button.attr('title', gt('Show reply-to input field'))
    }
    $(window).trigger('resize')
    return inputField
  },

  loadEditor (content) {
    const mode = this.config.get('editorMode')
    const baton = new ext.Baton({ view: this, model: this.model, config: this.config, content })
    const def = this.editorHash[mode] = this.editorHash[mode] || ext.point('io.ox/mail/compose/editor/load').cascade(this.app, baton)
    // load or reuse editor
    return def.then(function (editor) {
      baton.editor = editor
      // returns editor
      return ext.point('io.ox/mail/compose/editor/use').cascade(this.app, baton)
    }.bind(this), function (err) {
      yell('error', gt('An error occurred. Please refresh the page and try again.'))
      return $.Deferred().reject(err)
    })
  },

  getEditor () {
    const def = $.Deferred()
    if (this.editor) {
      def.resolve(this.editor)
    } else {
      return this.loadEditor()
    }
    return def
  },

  toggleEditorMode () {
    const self = this
    let content
    const signature = this.config.get('signature')
    const hint = this.config.get('hint')

    if (signature) this.config.set('signatureId', '')
    if (hint) this.config.set('hint', false)

    if (this.editor) {
      content = this.editor.getPlainText()
      this.editor.hide()
    } else if (this.model.get('contentType') === 'text/html' && this.config.get('editorMode') === 'text') {
      // initial set, transform html to text
      content = import('@/io.ox/core/tk/textproc').then(function ({ default: textproc }) {
        return textproc.htmltotext(self.model.get('content'))
      })
    } else {
      content = this.model.get('content')
    }

    this.editorContainer.busy()
    return $.when(content).then(function (content) {
      return self.loadEditor(content)
    }).then(function () {
      // TODO: streamline
      if (this.app.get('window') && this.app.get('window').floating) {
        this.app.get('window').floating.$el.toggleClass('text-editor', this.config.get('editorMode') === 'text')
        this.app.get('window').floating.$el.toggleClass('html-editor', this.config.get('editorMode') !== 'text')
        this.app.getWindowNode().trigger('scroll')
      }
      if (signature) this.config.set('signatureId', signature.id)
      if (hint) this.config.set('hint', true)
      this.editorContainer.idle()
      // reset tinyMCE’s undo stack
      if (typeof this.editor.tinymce !== 'function') return
      this.editor.tinymce().undoManager.clear()
    }.bind(this))
  },

  onRemoveAttachment (model) {
    if (model.get('origin') === 'VCARD') {
      this.config.set('vcard', false)
    }
  },

  onAttachVcard () {
    if (this.config.get('vcard')) {
      this.model.attachVCard()
    } else {
      const attachments = this.model.get('attachments')
      const model = attachments.findWhere({ origin: 'VCARD' })
      if (model) attachments.remove(model)
    }
  },

  syncMail () {
    if (!this.editor) return
    this.model.set('content', this.editor.getContent())
  },

  setBody (content) {
    if (this.model.get('initial')) {
      // remove white-space at beginning except in first-line
      content = String(content || '').replace(/^[\s\xA0]*\n([\s\xA0]*\S)/, '$1')
      // remove white-space at end
      content = content.replace(/[\s\uFEFF\xA0]+$/, '')
    }

    if (this.model.get('meta').type !== 'new') {
      // Remove extraneous <br>
      content = content.replace(/\n<br>&nbsp;$/, '\n')
    }

    this.setSimpleMail(content)

    this.editor.setContent(content)

    if (this.model.get('initial')) {
      this.prependNewLine()
    }
  },

  getParagraph (text, isHTML) {
    const node = $('<div class="io-ox-signature">').append(isHTML ? text : this.editor.ln2br(text))
    return $('<div>').append(node).html()
  },

  prependNewLine () {
    // Prepend newline in all modes except when editing draft
    if (this.config.get('type') === 'edit') return
    const content = this.editor.getContent().replace(/^\n+/, '').replace(/^(<div[^>]*class="default-style"[^>]*><br><\/div>)+/, '')
    const nl = this.config.get('editorMode') === 'html' ? mailUtil.getDefaultStyle().node.get(0).outerHTML : '\n'
    this.editor.setContent(nl + content)
  },

  setMail () {
    const self = this
    const model = this.model
    const config = this.config

    return this.toggleEditorMode().then(function () {
      return self.signaturesLoading
    })
      .done(function () {
        const modalOpen = $(document.body).hasClass('modal-open')

        // set focus in compose and forward mode to recipient tokenfield
        const target = config.is('new|forward') ? self.$('.tokenfield:first .token-input') : self.editor

        if (config.is('replyall|edit')) {
          if (!_.isEmpty(model.get('cc'))) self.toggleTokenfield('cc')
        }
        if (!_.isEmpty(model.get('bcc'))) self.toggleTokenfield('bcc')
        if (!_.isEmpty(model.get('reply_to'))) self.toggleTokenfield('reply_to')

        self.setBody(model.get('content'))

        if (_.device('!ios') && self.editor.tinymce) {
          const defaultFontStyle = settings.get('defaultFontStyle', {})
          const family = (defaultFontStyle.family || '').split(',')[0]
          if (!_.isEmpty(defaultFontStyle)) {
            if (family && family !== 'browser-default') self.editor.tinymce().execCommand('fontName', false, family, { skip_focus: modalOpen })
            if (defaultFontStyle.size && defaultFontStyle.size !== 'browser-default') self.editor.tinymce().execCommand('fontSize', false, defaultFontStyle.size, { skip_focus: modalOpen })
          }
        }

        if (target && !modalOpen) {
          if (!_.device('smartphone')) return target.focus()

          // on mobile: opening animation of compose window and keyboard at the same time leads to inconsistent behaviour and wrong window positioning
          // therefore we wait for the animation to finish before setting focus to input field
          const $window = self.$el.closest('.io-ox-mail-compose-window')
          $window.one('transitionend', () => {
            target.focus()
          })
        }
      })
  },

  setSimpleMail (content) {
    if (this.config.get('editorMode') === 'text') return
    if (mailUtil.isSimpleMail(content)) this.editorContainer.find('.editable.mce-content-body').addClass('simple-mail')
  },

  focusEditor () {
    this.editor.focus()
  },

  flagSubjectField (event) {
    const node = $(event.target)
    // required for custom focus handling within inputs on enter
    if (event.which === 13) return node.attr('data-enter-keydown', true)
  },

  focusSendButton (event) {
    // Focus send button on ctrl || meta + Enter (a11y + keyboard support)
    if ((event.metaKey || event.ctrlKey) && event.which === 13) {
      event.preventDefault()
      this.$el.parents().find('button[data-action="send"]').focus()
    }
  },

  onChangeSignatures () {
    // redraw composetoolbar
    ext.point('io.ox/mail/compose/buttons').invoke('redraw', undefined, this.baton)
  },

  render () {
    const self = this

    const node = $('<div class="mail-compose-fields">')

    // draw all extension points
    ext.point('io.ox/mail/compose/fields').invoke('draw', node, this.baton)

    this.$el.append(node)

    // add subject to app title
    this.setTitle()
    this.$el.find('input.token-input').first().focus(() => performance.mark('app:focus:io.ox/mail/compose'))
    // add view specific event handling to tokenfields
    this.$el.find('input.tokenfield').each(function () {
      // get original input field from token plugin
      const input = $(this).data('bs.tokenfield').$input
      input.on({
        // IME support (e.g. for Japanese)
        compositionstart () {
          $(this).attr('data-ime', 'active')
        },
        compositionend () {
          $(this).attr('data-ime', 'inactive')
        },
        keydown (event) {
          // clear tokenfield input
          if (event.which === 13 && $(this).attr('data-ime') !== 'active') $(this).val('')
        },
        // shortcuts (to/cc/bcc)
        keyup (event) {
          if (event.which === 13) return
          if (_.device('smartphone')) return
          // look for special prefixes
          const val = $(this).val()
          if ((/^to:?\s/i).test(val)) {
            $(this).typeahead('val', '')
          } else if ((/^cc:?\s/i).test(val)) {
            $(this).typeahead('val', '')
            self.toggleTokenfield('cc').find('.token-input').focus()
          } else if ((/^bcc:?\s/i).test(val)) {
            $(this).typeahead('val', '')
            self.toggleTokenfield('bcc').find('.token-input').focus()
          }
        }
      })
    })

    this.$el.append(this.editorContainer)
    return this
  }

})
export default MailComposeView
