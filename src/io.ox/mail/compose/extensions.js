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

// cSpell:ignore Antw, Antworten, ariacc, ariato, pickercc, pickerto, Resizables

import $ from '@/jquery'
import _ from '@/underscore'
import Backbone from '@/backbone'
import ox from '@/ox'

import mailAPI from '@/io.ox/mail/api'
import accountApi from '@/io.ox/keychain/api'
import moment from '@open-xchange/moment'
import sender from '@/io.ox/mail/sender'
import mini from '@/io.ox/backbone/mini-views/common'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import ext from '@/io.ox/core/extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import Tokenfield from '@/io.ox/core/tk/tokenfield'
import dropzone from '@/io.ox/core/dropzone'
import capabilities from '@/io.ox/core/capabilities'
import * as util from '@/io.ox/core/util'
import AttachmentView from '@/io.ox/core/attachments/view'
import { uploadAttachment, attachmentUploadHelper } from '@/io.ox/mail/compose/util'
import * as mailUtil from '@/io.ox/mail/util'
import Attachments from '@/io.ox/core/attachments/backbone'
import strings from '@/io.ox/core/strings'
import ResizeView from '@/io.ox/mail/compose/resize-view'
import imageResize from '@/io.ox/mail/compose/resize'
import '@/lib/jquery-ui.min.js'
import { createIcon, createButton, buttonWithIcon } from '@/io.ox/core/components'
import DisposableView from '@/io.ox/backbone/views/disposable'
import UploadMenuView from '@/io.ox/mail/compose/uploadMenuView'
import WindowActionButtonsView from '@/io.ox/core/window-action-buttons-view'
import FilePicker from '@/io.ox/files/filepicker'

import { settings } from '@/io.ox/mail/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings as contactSettings } from '@/io.ox/contacts/settings'
import gt from 'gettext'

// make strings accessible to translators
const tokenfieldTranslations = {
  to: gt('To'),
  pickerto: gt('Select contacts'),
  // #. %1$s is the name of the inputfield (To, CC, BCC)
  ariato: gt('%1$s autocomplete token field. Use left and right arrow keys to navigate between the tokens', gt('To')),

  cc: gt('CC'),
  pickercc: gt('Select CC contacts'),
  // #. %1$s is the name of the inputfield (To, CC, BCC)
  ariacc: gt('%1$s autocomplete token field. Use left and right arrow keys to navigate between the tokens', gt('CC')),

  bcc: gt('BCC'),
  pickerbcc: gt('Select BCC contacts'),
  // #. %1$s is the name of the inputfield (To, CC, BCC)
  ariabcc: gt('%1$s autocomplete token field. Use left and right arrow keys to navigate between the tokens', gt('BCC')),

  // #. Must not exceed 8 characters. e.g. German would be: "Antworten an", needs to be abbreviated like "Antw. an" as space is very limited
  reply_to: gt.pgettext('compose', 'Reply To'),
  pickerreply_to: gt('Select reply-to mail addresses'),
  // #. %1$s is the name of the inputfield (To, CC, BCC)
  ariareply_to: gt('%1$s autocomplete token field. Use left and right arrow keys to navigate between the tokens', gt('Reply To'))
}

const IntermediateModel = Backbone.Model.extend({
  initialize (opt) {
    this.config = opt.config
    this.model = opt.model
    this.configFields = opt.configFields
    this.modelFields = opt.modelFields

    delete this.attributes.config
    delete this.attributes.model
    delete this.attributes.configFields
    delete this.attributes.modelFields

    this.listenTo(this.config, this.configFields.map(this.changeMapper).join(' '), this.getData)
    this.listenTo(this.model, this.modelFields.map(this.changeMapper).join(' '), this.getData)
    this.getData()
    this.on('change', this.updateModels)
  },
  changeMapper (str) {
    return 'change:' + str
  },
  getData () {
    this.configFields.forEach(function (attr) {
      this.set(attr, this.config.get(attr))
    }.bind(this))
    this.modelFields.forEach(function (attr) {
      this.set(attr, this.model.get(attr))
    }.bind(this))
  },
  updateModels () {
    for (const key in this.changed) {
      const value = this.changed[key]
      if (this.configFields.indexOf(key) >= 0) return this.config.set(key, value)
      if (this.modelFields.indexOf(key) >= 0) return this.model.set(key, value)
    }
  }
})

const SenderView = DisposableView.extend({

  className: 'sender',

  attributes: { 'data-extension-id': 'sender' },

  initialize (options) {
    this.config = options.config
    this.dropdown = new Dropdown({
      model: new IntermediateModel({
        model: this.model,
        config: this.config,
        configFields: ['sendDisplayName', 'editorMode'],
        modelFields: ['from']
      }),
      label: this.getItemNode.bind(this),
      aria: gt('From'),
      caret: true
    })

    this.addresses = sender.collection

    this.listenTo(this.addresses, 'reset', this.renderDropdown)
    this.listenTo(this.model, 'change:from', this.renderDropdown)
    this.listenTo(this.model, 'change:from', () => this.config.setInitialSignature(this.model))
    this.listenTo(ox, 'change:customDisplayNames', this.renderDropdown)
    if (capabilities.has('deputy')) this.listenTo(this.model, 'change:from', this.updateDeputyData)
    this.listenTo(this.config, 'change:sendDisplayName', function (model, value) {
      settings.set('sendDisplayName', value)
    })
  },

  updateDeputyData () {
    const isDeputy = !!this.addresses.findWhere({ email: this.model.get('from')[1], type: 'deputy' })
    if (!isDeputy) return this.model.unset('sender')
    const defaultSender = this.addresses.findWhere({ type: 'default' })
    this.model.set('sender', defaultSender.toArray({ name: this.config.get('sendDisplayName') }))
  },

  // DEPRECATED: `updateSenderList` of `mail/compose/extensions.js`, pending remove with 8.20. Use `renderDropdown` instead
  updateSenderList () {
    if (ox.debug) console.warn('`updateSenderList` of `mail/compose/extensions` is deprecated, pending remove with 8.20. Use `renderDropdown` instead')
    this.addresses.update({ useCache: false })
  },

  render (/* options */) {
    // label
    this.$el.empty().append(
      $('<label class="maillabel">').text(gt('From')),
      $('<div class="mail-input min-w-0">').append(
        // label gets rendered by dropdown view, dropdown.$el is empty now
        this.dropdown.render().$el.attr({ 'data-dropdown': 'from' })
      )
    )
    this.renderDropdown()
    return this
  },

  renderDropdown () {
    const from = this.model.get('from') ? this.model.get('from')[1] : undefined
    // close button must be re-appended on smartphones, as the dropdown is not fully re-rendered
    // but cleared completely (`.empty()`) and then filled again via `setDropdownOptions()`.
    // Normally the close button is rendered when the dropdown is toggled on a smartphone
    const closeButton = this.dropdown.$ul.find('[data-action="close-menu"]').parent().detach()
    // reset
    this.dropdown.$ul.empty().css('width', 'auto')
    // render
    this.setDropdownOptions()
    this.dropdown.$ul.append(closeButton)
    this.dropdown.$toggle.find('.dropdown-label').addClass('min-w-0').empty().append(this.getItemNode())
    this.dropdown.$toggle.attr('href', from ? 'mailto:' + from : '#')
      .addClass('sender-dropdown-link')
    if (this.dropdown.$el.hasClass('open') && !_.device('smartphone')) this.dropdown.adjustBounds()
    // re-focus element otherwise the bootstap a11y closes the drop-down
    this.dropdown.$ul.find('[data-name="sendDisplayName"]').focus()

    // set max width to prevent dropdown growing out of compose window with long names
    if (!_.device('smartphone')) setTimeout(() => this.dropdown.$ul.css('max-width', this.dropdown.$toggle.css('width')), 0)
  },

  setDropdownOptions () {
    const self = this
    if (this.addresses.length === 0) return

    const sender = settings.get('features/allowExternalSMTP', true) ? this.addresses.getCommon() : [this.addresses.find({ type: 'default' })]
    sender.forEach((model, index, list) => {
      if (index === 1 && list.length > 2) self.dropdown.divider()
      addOption(model)
    })

    this.addresses.getDeputies().forEach(function (model, index) {
      if (index === 0) self.dropdown.divider().group(gt('On behalf of'))
      addOption(model, { group: true })
    })

    // append options to toggle and edit names
    this.dropdown
      .divider()
      .option('sendDisplayName', true, gt('Show names'), { keepOpen: true })

    if (settings.get('editRealName', true)) {
      this.dropdown
        .divider()
        .link('edit-real-names', gt('Edit names'), this.onEditNames)
    }

    function addOption (model, options) {
      const item = mailUtil.getSender(model.toArray(), self.config.get('sendDisplayName'))
      self.dropdown.option('from', item, self.getItemNode.bind(self, item), options)
    }
  },

  getItem (item) {
    // use latest display name
    if (!item) return
    return this.addresses.getAsArray(item[1], { name: this.config.get('sendDisplayName') }) || item
  },

  getItemNode (item) {
    item = this.getItem(item || this.model.get('from'))
    if (!item) return
    const name = item[0]
    const address = item[1]
    return [
      $('<span class="name mr-4" style="white-space: normal;">').text(name ? name + ' ' : ''),
      $('<span class="address truncate">').text(name ? `<${address}>` : address)
    ]
  },

  onEditNames () {
    import('@/io.ox/mail/compose/names').then(function ({ default: names }) {
      names.open()
    })
  }
})

const extensions = {

  header (baton) {
    if (!baton.view.app.getWindow()) return

    baton.view.app.getWindow().setHeader(
      baton.$header = new WindowActionButtonsView({
        app: baton.view.app,
        saveTitle: gt('Send'),
        onSave () { baton.view.send() },
        $save: $('<button type="button" class="btn btn-primary save" data-action="send">')
      }).render().$el
    )

    if (!_.device('smartphone')) ext.point('io.ox/mail/compose/header').invoke('draw', baton.$header, baton)
    else baton.view.app.getWindow().nodes.header.show()
  },

  inlineYell () {
    // role log is a special kind of live region for status messages, errors etc.
    this.append($('<div role="log" aria-live="polite" class="inline-yell">'))
  },

  title (baton) {
    const title = baton.model.get('subject')
    this.append($('<div class="title grow mr-8 font-bold">').text(title || gt('New email')))

    baton.model.on('keyup:subject change:subject', function (data) {
      baton.view.$el.find('.title').text(
        data.attributes ? data.get('subject') : data || gt('New email')
      )
    })
  },

  sender (baton) {
    const view = new SenderView({ model: baton.model, config: baton.config })
    const isHidden = _.device('smartphone') && accountApi.getAccountsByType('mail').length === 1 ? 'hidden' : ''
    this.append(view.render().$el.addClass(isHidden))
    ext.point('io.ox/mail/compose/recipientActions').invoke('draw', view.$el)
  },

  senderOnBehalfOf (baton) {
    if (!capabilities.has('deputy')) return

    const fields = this
    const model = baton.model

    function toggleVisibility () {
      const sender = baton.model.get('sender')
      const from = baton.model.get('from')
      const displayname = baton.config.get('sendDisplayName')
      if (sender) {
        fields.find('.sender-onbehalfof .mail-input').text(
          // #. Used to display hint in mail compose that user sends a mail "on behalf of" someone else
          // #. %1$s: name of mail address of current user (technical: sender)
          // #. %2$s: name of mail address of "on behalf of"-user (technical: from)
          gt('This email will be sent by %1$s on behalf of %2$s.', sender[displayname ? 0 : 1] || sender[displayname ? 1 : 0], from[displayname ? 0 : 1] || from[displayname ? 1 : 0]))
      }
      fields.toggleClass('onbehalfof', !!sender)
    }

    this.append(
      $('<div class="sender-onbehalfof" data-extension-id="sender-onbehalfof">').append(
        $('<div class="mail-input">')
      )
    )

    model.on('change:sender', toggleVisibility)
    toggleVisibility()
  },

  senderRealName (baton) {
    const fields = this
    const config = baton.config

    function toggleVisibility () {
      fields.toggleClass('no-realname', !config.get('sendDisplayName'))
    }

    config.on('change:sendDisplayName', toggleVisibility)
    toggleVisibility()

    this.append(
      $('<div class="sender-realname" data-extension-id="sender-realname">').append(
        $('<div class="mail-input">').text(
          gt('This email just contains your email address as sender. Your real name is not used.')
        )
      )
    )
  },

  recipientActionLink (type) {
    return function appendRecipientAction () {
      const node = $(`<button type="button" class="btn btn-link" data-action="add" data-type=${type}>`)
      if (type === 'cc') node.attr({ title: gt('Show carbon copy input field') }).text(gt('CC'))
      if (type === 'bcc') node.attr({ title: gt('Show blind carbon copy input field') }).text(gt('BCC'))
      // #. Abbreviated of "reply to". Toggle button label displayed next to CC and BCC. Must not exceed 3 characters as space is very limited.
      if (type === 'reply_to') node.attr({ title: gt('Show reply-to input field') }).text(gt.pgettext('compose', 'RE'))
      this.append(node)
    }
  },

  recipientActions () {
    if (_.device('smartphone')) return
    const node = $('<div class="recipient-actions">')
    ext.point('io.ox/mail/compose/recipientActionLink').invoke('draw', node)
    this.append(node)
  },

  recipientActionsMobile () {
    const node = createButton({ type: 'button', variant: 'toolbar', icon: { name: 'bi/chevron-down.svg', title: gt('Show all'), className: 'bi-12' } })
      .attr({
        'data-action': 'add',
        'aria-expanded': false
      })
    this.append(node)
  },

  recipientActionLinkMobile () {
    console.error('Support for `recipientActionLinkMobile` in `io.ox/mail/compose/extensions` was removed.')
  },

  tokenfield (attr) {
    function openAddressBookPicker (event) {
      event.preventDefault()
      const attr = event.data.attr
      const model = event.data.model
      const picker = !_.device('smartphone') && coreSettings.get('features/enterprisePicker/enabled', false)
        ? import('@/io.ox/contacts/enterprisepicker/dialog')
        : import('@/io.ox/contacts/addressbook/popup')
      picker.then(function ({ default: popup }) {
        popup.open(function (results) {
          const list = model.get(attr) || []
          model.set(attr, list.concat(results.map(result => result.array)))
        }, { hideResources: true })
      })
    }

    return function (baton) {
      let extNode
      const guid = _.uniqueId('form-control-label-')
      const value = baton.model.get(attr) || []
      // hide tokeninputfields if necessary (empty cc/bcc/reply-to)
      const isHidden = /(cc|bcc|reply_to)$/.test(attr) && !value.length
      let redrawLock = false

      const tokenfieldView = new Tokenfield({
        id: guid,
        className: attr,
        extPoint: 'io.ox/mail/compose/' + attr,
        isMail: true,
        apiOptions: {
          users: true,
          limit: settings.get('compose/autocompleteApiLimit', 50),
          contacts: true,
          groups: settings.get('features/resolveGroups', true),
          distributionlists: true,
          emailAutoComplete: true
        },
        keepInComposeWindow: true,
        maxResults: settings.get('compose/autocompleteDrawLimit', 30),
        // for a11y and easy access for custom dev when they want to display placeholders (these are made transparent via less)
        placeholder: tokenfieldTranslations[attr],
        ariaLabel: tokenfieldTranslations[`aria${attr}`]
      })

      const node = $('<div class="mail-input">').append(tokenfieldView.$el)
      const actions = $('<div class="recipient-actions">')

      if (attr === 'to' && _.device('smartphone')) {
        ext.point('io.ox/mail/compose/recipientActionsMobile').invoke('draw', actions)
      }

      const usePicker = capabilities.has('contacts') && contactSettings.get('picker/enabled', true)

      const title = gt('Select contacts')

      this.append(
        extNode = $(`<div data-extension-id="${attr}" class="recipient line-focus">`).toggleClass('hidden', isHidden)
          .append(
            usePicker
              // with picker
              ? $('<div class="maillabel">').append(
                // add aria label since tooltip takes away the title attribute
                $(`<a href="#" role="button" title="${title}" aria-label="${title}">`)
                  .text(tokenfieldTranslations[attr])
                  .tooltip({ animation: false, delay: 0, placement: 'right', trigger: 'hover' })
                  .on('click', { attr, model: baton.model }, openAddressBookPicker)
              )
              // without picker
              : $(`<label class="maillabel" for="${guid}">`).text(tokenfieldTranslations[attr])
          )
      )

      if (_.device('smartphone')) extNode.append(node.append(actions))
      else extNode.append(node, actions)

      if (usePicker) {
        actions.prepend(
          buttonWithIcon({
            className: 'btn btn-unstyled open-addressbook-popup',
            icon: createIcon('bi/ox-address-book.svg').addClass(_.device('smartphone') ? 'bi-16' : 'sm'),
            title: tokenfieldTranslations['picker' + attr],
            ariaLabel: tokenfieldTranslations['picker' + attr]
          })
            .on('click', { attr, model: baton.model }, e => { openAddressBookPicker(e) })
        )
      }

      tokenfieldView.render().$el
        .on('tokenfield:createdtoken', function (event) {
          // extension point for validation etc.
          baton.event = event
          ext.point('io.ox/mail/compose/createtoken').invoke('action', this, baton)
          tokenfieldView.$el.data('bs.tokenfield').update()
        })
        .on('tokenfield:next', function () {
          extNode.nextAll().find('input.tt-input,input[name="subject"]').filter(':visible').first().focus()
        })
        .on('tokenfield:removetoken', function (event) {
          baton.event = event
          ext.point('io.ox/mail/compose/removetoken').invoke('action', this, baton)
        })

      // bind mail-model to collection
      tokenfieldView.listenTo(baton.model, 'change:' + attr, function (mailModel, recipients = []) {
        if (redrawLock) return
        const recArray = recipients.map(function (recipient) {
          const displayName = util.removeQuotes(recipient[0])
          const email = recipient[1]
          const image = recipient[2]
          return {
            type: 5,
            display_name: displayName,
            email1: email,
            image1_url: image,
            token: { label: displayName, value: email }
          }
        })
        this.collection.reset(recArray)
      })

      tokenfieldView.collection.on('change reset add remove sort', _.debounce(function () {
        const recipients = this.map(function (model) {
          const token = model.get('token')
          const displayName = util.removeQuotes(token.label)
          const email = token.value
          return [displayName, email]
        })
        redrawLock = true
        baton.model.set(attr, recipients)
        redrawLock = false
      }.bind(tokenfieldView.collection)), 20)

      baton.view.on('updateTokens', function () {
        const recipients = this.map(function (model) {
          const token = model.get('token')
          const displayName = util.removeQuotes(token.label)
          const email = token.value
          return [displayName, email]
        })
        redrawLock = true
        baton.model.set(attr, recipients)
        redrawLock = false
      }.bind(tokenfieldView.collection))

      baton.view.app.getWindow().one('idle', function () {
        // idle event is triggered, after the view is visible
        // call update when visible to correctly calculate tokefield dimensions (see Bug 52137)
        tokenfieldView.$el.data('bs.tokenfield').update()
      })
    }
  },

  subject (baton) {
    const guid = _.uniqueId('form-control-label-')
    this.append(
      $('<div data-extension-id="subject" class="subject line-focus">').append(
        // don't use col-xs and col-sm here, breaks style in landscape mode
        $('<label class="maillabel" >').addClass(_.device('smartphone') ? 'hidden-md hidden-sm hidden-xs' : '').text(gt('Subject')).attr('for', guid),
        $('<div class="mail-input" >').append(
          new mini.InputView({ model: baton.model, id: guid, name: 'subject', autocomplete: false }).render().$el.attr('placeholder', gt('Subject'))
        )
      )
    )
  },

  optionsmenumobile: (function () {
    return function (baton) {
      const $toggle = buttonWithIcon({
        className: 'btn btn-link dropdown-toggle',
        icon: createIcon('bi/three-dots.svg').addClass('bi-22'),
        title: gt('Mail compose actions'),
        ariaLabel: gt('Mail compose actions')
      })
        .attr('data-toggle', 'dropdown')

      const dropdown = new Dropdown({
        model: new IntermediateModel({
          model: baton.model,
          config: baton.config,
          configFields: ['editorMode', 'vcard'],
          modelFields: ['priority', 'requestReadReceipt']
        }),
        $toggle
      })
      ext.point('io.ox/mail/compose/menuoptions').invoke('draw', dropdown.$el, baton)
      this.append(dropdown.render().$el)
    }
  }()),

  optionsmenu: (function () {
    return function (baton) {
      const a = $('<a href="#" role="button" class="dropdown-toggle" data-toggle="dropdown" tabindex="-1">').append(
        createIcon('bi/three-dots.svg')
      ).addActionTooltip(gt('Mail compose actions'))
      const dropdown = new Dropdown({
        tagName: 'li',
        attributes: {
          role: 'presentation',
          'data-extension-id': 'composetoolbar-menu'
        },
        dropup: true,
        model: new IntermediateModel({
          model: baton.model,
          config: baton.config,
          configFields: ['editorMode', 'vcard', 'signatureId'],
          modelFields: ['priority', 'requestReadReceipt']
        }),
        label: gt('Mail compose actions'),
        caret: true,
        $toggle: a
      })

      ext.point('io.ox/mail/compose/menuoptions').invoke('draw', dropdown.$el, baton)
      this.append(dropdown.render().$el)
    }
  }()),

  attachmentPreviewList (baton) {
    const $el = this

    const view = baton.attachmentsView = new AttachmentView.List({
      point: 'io.ox/mail/compose/attachment/header',
      collection: baton.model.get('attachments'),
      editable: true,
      model: baton.model,
      mode: settings.get('attachments/layout/compose/' + _.display(), 'preview')
    })

    // dropzone
    const zone = new dropzone.Inplace({
      caption: gt('Drop attachments here')
    })

    zone.on({
      show () {
        $el.css('minHeight', '132px')
        $(window).trigger('resize')
      },
      hide () {
        $el.css('minHeight', 0)
        $(window).trigger('resize')
      },
      drop (files) {
        attachmentUploadHelper.call(baton.view.$el.find('[data-extension-id="add_attachments"]'), baton.model, files)
        $(window).trigger('resize')
      }
    })

    view.listenTo(baton.model, 'change:attachments', function () {
      view.$list.empty()
      view.$preview.empty()
      view.renderList()
      view.updateScrollControls()
    })

    view.listenTo(view.collection, 'add remove reset', _.debounce(function () {
      if (this.getValidModels().length > 0) {
        this.$el.addClass('open')
        if (!this.isListRendered) {
          this.renderList()
          view.updateScrollControls()
        }
      }
    }))

    // tinymce resize
    view.listenTo(view.collection, 'add remove reset', _.debounce(function () {
      if (baton.resizeView) baton.resizeView.update()
      if (this.getValidModels().length <= 1) $(window).trigger('resize')
    }))
    view.on('change:expanded', function () { $(window).trigger('resize') })

    view.render()
    if (view.getValidModels().length > 0) {
      view.renderList()
      view.$el.addClass('open')
    }
    $el.append(
      zone.render().$el.addClass('abs'),
      view.$el
    )

    view.$el.on('click', 'li.attachment', function (event) {
      const node = $(event.currentTarget)

      // skip attachments without preview
      if (!node.attr('data-original')) return

      const id = node.attr('data-id')
      const data = view.collection.get(id).toJSON()

      if (data.group === 'localFile') {
        data.fileObj = view.collection.get(id).fileObj
        // generate pseudo id so multiple localFile attachments do not overwrite themselves in the Viewer collection
        data.id = 'localFileAttachment-' + id
      }
      const list = view.collection.filter(function (attachment) {
        return attachment.get('disp') === 'attachment'
      }).filter(function (attachment) {
        if (attachment.get('contentDisposition') === 'INLINE') {
          const space = baton.model.get('id')
          const url = mailAPI.getUrl(_.extend({ space }, attachment), 'view').replace('?', '\\?')
          const containsServerReplacedURL = new RegExp('<img[^>]*src="' + url + '"[^>]*>').test(baton.model.get('content'))
          const containsClientReplacedURL = new RegExp('<img[^>]*src="[^"]*' + attachment.get('id') + '"[^>]*>').test(baton.model.get('content'))
          return containsServerReplacedURL || containsClientReplacedURL
        }

        return true
      })

        .map(function (model) {
          const obj = model.toJSON()
          // map name attribute for composition space attachments
          obj.filename = obj.filename || obj.name
          if (obj.group === 'localFile') {
            obj.fileObj = model.fileObj
            // generate pseudo id so multiple localFile attachments do not overwrite themselves in the Viewer collection
            obj.id = 'localFileAttachment-' + model.cid
          }
          return obj
        })

      const baton = ext.Baton({ simple: true, data, list, restoreFocus: $(event.target), openedBy: 'io.ox/mail/compose' })
      actionsUtil.invoke('io.ox/mail/attachment/actions/view', baton)
    })

    baton.app.once('ready', view.updateScrollControls.bind(view, undefined))

    view.on('change:layout', function (mode) {
      settings.set('attachments/layout/compose/' + _.display(), mode).save()
    })
  },

  attachmentSharing (baton) {
    if (!settings.get('compose/shareAttachments/enabled', false)) return
    if (!capabilities.has('infostore')) return
    if (_.device('smartphone')) return

    this.addClass('sharing')

    import('@/io.ox/mail/compose/sharing').then(function ({ default: SharingView }) {
      const view = baton.sharingView = new SharingView({
        model: baton.model
      })
      baton.attachmentsView.$footer.prepend(view.render().$el)
    })
  },

  mailSize (baton) {
    const attachmentView = baton.attachmentsView
    const node = $('<span class="mail-size">')

    attachmentView.$footer.append(node)

    const update = _.debounce(function () {
      if (attachmentView.disposed) return
      const hasUploadedAttachments = baton.model.get('attachments').some(function (model) {
        return model.get('group') === 'mail'
      })
      const isDriveMail = !!(baton.model.get('sharedAttachments') || {}).enabled
      const visible = hasUploadedAttachments && !isDriveMail
      node.text(gt('Mail size: %1$s', getMailSize())).toggleClass('invisible', !visible)
    }, 10)
    const lazyUpdate = _.throttle(update, 5000)
    update()

    attachmentView.listenTo(attachmentView.collection, 'add remove reset change:size', update)
    attachmentView.listenTo(baton.model, 'change:sharedAttachments', update)
    attachmentView.listenTo(baton.model, 'change:content', lazyUpdate)

    function getMailSize () {
      const content = baton.model.get('content').replace(/src="data:image[^"]*"/g, '')
      const mailSize = content.length
      const attachmentSize = baton.model.get('attachments').reduce(function (memo, attachment) {
        // check if inline attachment is really in DOM. Otherwise, it will be removed on send/save
        if (attachment.get('contentDisposition') === 'INLINE') {
          const space = baton.model.get('id')
          const url = mailAPI.getUrl(_.extend({ space }, attachment), 'view').replace('?', '\\?')
          const containsServerReplacedURL = new RegExp('<img[^>]*src="' + url + '"[^>]*>').test(baton.model.get('content'))
          const containsClientReplacedURL = new RegExp('<img[^>]*src="[^"]*' + attachment.get('id') + '"[^>]*>').test(baton.model.get('content'))

          if (!containsServerReplacedURL && !containsClientReplacedURL) return memo
        }

        return memo + (attachment.getSize() || 0)
      }, 0)

      return strings.fileSize(mailSize + attachmentSize, 1)
    }
  },

  imageResizeOption (baton) {
    const attachmentView = baton.attachmentsView
    const resizeView = new ResizeView({ model: baton.config, collection: attachmentView.collection })

    attachmentView.$footer.append(
      resizeView.render().$el
    )

    attachmentView.listenTo(attachmentView.collection, 'add remove reset', _.debounce(update, 0))
    update()

    function update () {
      const models = baton.model.get('attachments').models
      imageResize.containsResizables(models).then(function (show) {
        resizeView.$el.toggle(show)
      })
    }

    attachmentView.$header.find('.toggle-mode').appendTo(attachmentView.$footer)
  },

  attachmentmobile (baton) {
    function openFilePicker (model) {
      const self = this
      new FilePicker({
        primaryButtonText: gt('Add'),
        cancelButtonText: gt('Cancel'),
        header: gt('Add attachments'),
        multiselect: true,
        createFolderButton: false,
        extension: 'io.ox/mail/mobile/navbar',
        uploadButton: true
      })
        .done(function (files) {
          self.trigger('aria-live-update', gt('Added %s to attachments.', files.map(file => file.filename).join(', ')))
          const models = files.map(function (file) {
            const attachment = new Attachments.Model({ filename: file.filename })
            uploadAttachment({
              model,
              filename: file.filename,
              origin: { origin: 'drive', id: file.id, folderId: file.folder_id },
              attachment
            })
            return attachment
          })
          model.attachFiles(models)
        })
    }

    const fileInput = $('<input type="file" name="file">').css('display', 'none')
      .on('change', attachmentUploadHelper.bind(this, baton.model))
      // multiple is off on smartphones in favor of camera roll/capture selection
      .prop('multiple', !_.device('smartphone'))

    if (capabilities.has('infostore')) {
      const $toggle = buttonWithIcon({
        className: 'btn btn-link dropdown-toggle mr-6',
        icon: createIcon('bi/paperclip.svg').addClass('bi-22'),
        title: gt('Add attachments'),
        ariaLabel: gt('Add attachments')
      })
        .attr('data-toggle', 'dropdown')
      const dropdown = new Dropdown({ $toggle })

      this.append(
        fileInput,
        dropdown.append(
          $('<a href="#">').text(gt('Add local file')).on('click', function () {
            // WORKAROUND "bug" in Chromium (no change event triggered when selecting the same file again,
            // in file picker dialog - other browsers still seem to work)
            fileInput[0].value = ''
            fileInput.trigger('click')
          })
        )
        // #. Used as button label when adding an attachment from the 'drive' app
        // #. %1$s: name of 'drive' app
          .link('add-file', gt('Add from %1$s', gt.pgettext('app', 'Drive')), openFilePicker.bind(this, baton.model))
          .render().$el
      )
    } else {
      this.append(
        // file input
        fileInput,
        $('<button type="button" class="btn btn-link">')
          .text(gt('Attachments'))
          .on('click', function () {
            // WORKAROUND "bug" in Chromium (no change event triggered when selecting the same file again,
            // in file picker dialog - other browsers still seem to work)
            fileInput[0].value = ''
            fileInput.trigger('click')
          })
      )
    }
  },

  attachments (baton) {
    const { listView } = baton.app.collection.models.find(model => model.get('name') === 'io.ox/mail')
    const createFromSelection = baton.config.get('createFromSelection')

    baton.uploadMenuView = new UploadMenuView({
      model: baton.model,
      listView,
      createFromSelection
    })

    this.append(baton.uploadMenuView.render())
  },

  toggleToolbar (baton) {
    if (_.device('smartphone')) return

    const parent = this
    const floatingView = baton.app.get('window').floating
    const node = $('<a href="#" role="button" tabindex="0">')
      .append(createIcon('bi/fonts.svg'))
      .on('click', function () {
        if (parent.hasClass('disabled')) return
        baton.config.set('toolbar', !baton.config.get('toolbar'))
      })

    // toggle toolbar
    baton.config.on('change:toolbar', update)
    function update () {
      // toolbar may be enabled for html mode but we still need to check if html mode is active atm
      const value = baton.config.get('toolbar') && baton.config.get('editorMode') !== 'text'
      const mode = baton.config.get('editorMode') === 'text'
      const text = value ? gt('Hide toolbar') : gt('Show toolbar')
      floatingView.$el.toggleClass('no-toolbar', !value)
      node.attr('aria-label', value ? gt('Hide toolbar') : gt('Show toolbar')).addActionTooltip(mode ? '' : text)

      parent.toggleClass('checked', value)
      $('.window-container.active .window-body').css('padding-bottom', value ? '37px' : 0)
    }

    // toggle state
    status()
    baton.config.on('change:editorMode change:desktop', status)
    function status () {
      const isTiny = baton.config.get('editorMode') !== 'text'
      const isDesktop = baton.config.get('desktop') === true
      parent.toggleClass('disabled', !isTiny || !isDesktop)
      update()
    }

    parent.append(node)
  },

  body () {
    const self = this
    const editorId = _.uniqueId('tmce-')
    const editorToolbarId = _.uniqueId('tmcetoolbar-')

    self.append($('<div class="row">').append($('<div class="col-sm-12">').append(
      $('<div class="editable-toolbar">').attr('id', editorToolbarId),
      $('<div class="editable">').attr('id', editorId).css('min-height', '400px')
    )))
  },

  mailto () {
    // supported and enabled?
    if (!navigator.registerProtocolHandler) return
    if (!settings.get('features/registerProtocolHandler', true)) return
    // at most once in a week
    const today = new Date().toISOString().slice(0, 10)
    const last = localStorage.getItem('asked-for-mail-to-registration') || '1970-01-01'
    if (moment(today).diff(moment(last), 'days') <= 7) return
    // register mailto
    const href = document.location.href
    const url = href.substring(0, href.indexOf('#'))
    const productName = settings.get('productNames/mail', gt.pgettext('native app', ox.serverConfig.productNameMail || 'OX Mail'))
    localStorage.setItem('asked-for-mail-to-registration', today)
    navigator.registerProtocolHandler('mailto', `${url}#app=io.ox/mail&mailto=%s`, productName)
  }
}

// see bug 53327
ext.point('io.ox/mail/compose/createtoken').extend({
  id: 'scrolltop',
  index: 10,
  action (baton) {
    if (!_.device('smartphone')) return
    if (baton && baton.view) {
      setTimeout(function () {
        if (baton.view.$el[0].scrollIntoView) baton.view.$el[0].scrollIntoView()
      }, 10)
    }
  }
})

export default extensions
