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
import moment from '@open-xchange/moment'

import ext from '@/io.ox/core/extensions'
import Backbone from '@/backbone'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import DisposableView from '@/io.ox/backbone/views/disposable'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import Colorpicker from '@/io.ox/backbone/mini-views/colorpicker'
import capabilities from '@/io.ox/core/capabilities'
import * as util from '@/io.ox/core/settings/util'
import * as mailUtil from '@/io.ox/mail/util'
import * as contactsUtil from '@/io.ox/contacts/util'
import yell from '@/io.ox/core/yell'
import VacationNoticeModel from '@/io.ox/mail/mailfilter/vacationnotice/model'
import AutoforwardModel from '@/io.ox/mail/mailfilter/autoforward/model'
import mailfilter from '@/io.ox/core/api/mailfilter'
import { createIcon } from '@/io.ox/core/components'
import mini from '@/io.ox/backbone/mini-views'
import api from '@/io.ox/core/api/account'
import { st, isConfigurable } from '@/io.ox/settings/index'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

// we need the existing extension for signatures
import '@/io.ox/mail/settings/signatures/settings/pane'

// not possible to set nested defaults, so do it here
if (settings.get('features/registerProtocolHandler') === undefined) {
  settings.set('features/registerProtocolHandler', true)
}

ext.point('io.ox/mail/settings/detail').extend({
  index: 100,
  id: 'view',
  draw () {
    this.append(
      util.header(
        st.MAIL,
        'ox.appsuite.user.sect.email.settings.html'
      ),
      new ExtensibleView({ point: 'io.ox/mail/settings/detail/view', model: settings })
        .build(function () {
          this.$el.addClass('settings-body io-ox-mail-settings')
          this.listenTo(settings, 'change', function () {
            settings.saveAndYell().then(
              function ok () {
                // update mail API
                import('@/io.ox/mail/api').then(function ({ default: mailAPI }) {
                  mailAPI.updateViewSettings()
                })
              },
              function fail (error) {
                console.error(error)
                yell('error', gt('Could not save settings'))
              }
            )
          })
        })
        .render().$el
    )
  }
})

let INDEX = 0
ext.point('io.ox/mail/settings/detail/view').extend(
  {
    id: 'reading',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.READING, st.READING_EXPLANATION, 'io.ox/mail/settings/reading', true, '')
  },
  {
    id: 'signatures',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.SIGNATURES, st.SIGNATURES_EXPLANATION, 'io.ox/mail/settings/signatures')
  },
  {
    id: 'compose',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.COMPOSE_REPLY, st.COMPOSE_REPLY_EXPLANATION, 'io.ox/mail/settings/compose')
  },
  {
    id: 'templates',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.TEMPLATES) return
      util.renderExpandableSection(st.TEMPLATES, st.TEMPLATES_EXPLANATION, 'io.ox/mail/settings/templates').call(this, baton)
    }
  },
  {
    id: 'Rules',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.RULES, st.RULES_EXPLANATION, 'io.ox/mail/settings/rules')
  },
  {
    id: 'advanced',
    index: 10000,
    render: util.renderExpandableSection(st.MAIL_ADVANCED, '', 'io.ox/mail/settings/advanced')
  }
)

ext.point('io.ox/mail/settings/reading').extend(
  //
  // Layout
  //
  {
    id: 'layout',
    index: INDEX += 100,
    render ({ model }) {
      if (!isConfigurable.LAYOUT) return
      const list = [
        { id: 'vertical', title: gt('Vertical') },
        { id: 'horizontal', title: gt('Horizontal') },
        { id: 'list', title: gt('List') }
      ]
      const radioCardView = new util.RadioCardView({ name: 'layout', model, list })
      radioCardView.renderCard = (option) => {
        return $.svg({ src: `themes/default/illustrations/layout-${option.id}.svg`, width: 80, height: 60, role: 'presentation' })
          .css({ color: 'var(--accent)', width: 120, height: 'auto', padding: '4px 2px' })
          .addClass('card')
      }
      this.append(
        util.fieldset(
          st.LAYOUT,
          util.explanation(gt('Set your preferred layout')),
          radioCardView.render().$el
        )
      )
    }
  },
  //
  // Message list
  //
  {
    id: 'message-list',
    index: INDEX += 100,
    render ({ model }) {
      const list = [
        { value: 'avatars', label: gt('Contact pictures') }
      ]
      if (model.get('selectionMode') !== 'alternative') {
        list.push({ value: 'checkboxes', label: gt('Checkboxes') })
      }
      list.push({ value: 'simple', label: gt('Simple') })

      this.append(
        util.fieldset(
          st.MESSAGE_LIST,
          util.explanation(gt('Define your preferred message list layout and information')),
          $('<div class="flex-row flex-wrap">').append(
            $('<div class="flex-grow">').append(
              new mini.CustomRadioView({ name: 'listViewLayout', model, list }).render().$el.addClass('mb-24'),
              isConfigurable.SHOW_TEXT_PREVIEW
                ? util.checkbox('showTextPreview', st.SHOW_TEXT_PREVIEW, settings)
                : [],
              util.checkbox('exactDates', st.EXACT_DATES, settings),
              util.checkbox('alwaysShowSize', st.SHOW_SIZE, settings)
            ),
            $('<div style="width: 360px" aria-hidden="true">').append(
              new MessageListPreview({ model: settings }).render().$el
            )
          )
        )
      )
    }
  },
  //
  // Reading pane
  //
  {
    id: 'reading-pane',
    index: INDEX += 100,
    render ({ model }) {
      this.append(
        util.fieldset(
          st.READING_PANE,
          $('<div class="flex-row flex-wrap">').append(
            $('<div class="flex-grow">').append(
              util.checkbox('isColorQuoted', st.COLOR_QUOTES, settings),
              util.checkbox('useFixedWidthFont', st.FIXED_WIDTH_FONT, settings)
            ),
            $('<div style="width: 360px" aria-hidden="true">').append(
              new ReadingPanePreview({ model: settings }).render().$el
            )
          )
        )
      )
    }
  },
  //
  // Mark as read
  //
  {
    id: 'mark-as-read',
    index: INDEX += 100,
    render () {
      const list = [
        // #. Mark email as read
        { label: gt('Immediately'), value: 'instant' },
        // #. Mark email as read; %1$d = seconds
        { label: gt('After %1$d seconds', 5), value: 'fast' },
        // #. Mark email as read
        { label: gt('After %1$d seconds', 20), value: 'slow' },
        // #. Mark email as read
        { label: gt('Never'), value: 'never' }
      ]
      this.append(
        util.fieldset(
          st.MARK_READ,
          util.explanation(gt('Determine when and if an email is marked as read upon opening')),
          new mini.CustomRadioView({ name: 'markAsRead', model: settings, list }).render().$el
        )
      )
    }
  },
  //
  // Special folders
  //
  {
    id: 'folders',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.UNSEEN_FOLDER && !isConfigurable.FLAGGED_FOLDER) return
      this.append(
        util.fieldset(
          st.SPECIAL_FOLDERS,
          util.explanation(gt('Determine which special mail folders are shown')),
          // unseen folder
          isConfigurable.UNSEEN_FOLDER
            ? util.checkbox('unseenMessagesFolder', st.UNSEEN_FOLDER, settings)
            : [],
          // flagged folder
          isConfigurable.FLAGGED_FOLDER
            ? util.checkbox('flaggedMessagesFolder', st.FLAGGED_FOLDER, settings)
            : []
        )
      )
    }
  },
  //
  // Inbox categories aka Tabbed Inbox
  //
  {
    id: 'categories',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.INBOX_CATEGORIES) return
      this.append(
        util.fieldset(
          st.INBOX_CATEGORIES,
          util.explanation(gt('You can use inbox categories to organize your incoming emails in different tabs')),
          $('<div class="pt-16">').append(
            $('<button type="button" class="btn btn-default" data-action="edit-inbox-categories">')
              .text(st.INBOX_CATEGORIES_BUTTON)
              .click(() => {
                import('@/io.ox/mail/categories/edit').then(({ default: dialog }) => dialog.open())
              })
          )
        )
      )
    }
  }
)

const formatOptions = [
  { label: gt('HTML'), value: 'html' },
  { label: gt('Plain text'), value: 'text' },
  { label: gt('HTML and plain text'), value: 'alternative' }
]

const fontNameOptions = [{ label: gt('Use browser default'), value: 'browser-default' }].concat(
  mailUtil.getFontFormats().split(';')
    .filter(function (str) {
      return !/^(Web|Wing)dings/.test(str)
    })
    .map(function (pair) {
      pair = pair.split('=')
      return { label: pair[0], value: pair[1] }
    })
)

const fontSizeOptions = [
  { label: gt('Use browser default'), value: 'browser-default' },
  { label: '8pt', value: '8pt' },
  { label: '10pt', value: '10pt' },
  { label: '11pt', value: '11pt' },
  { label: '12pt', value: '12pt' },
  { label: '13pt', value: '13pt' },
  { label: '14pt', value: '14pt' },
  { label: '16pt', value: '16pt' },
  { label: '18pt', value: '18pt' },
  { label: '24pt', value: '24pt' },
  { label: '36pt', value: '36pt' }
]

INDEX = 0
ext.point('io.ox/mail/settings/compose').extend(
  //
  // Compose dialog
  //
  {
    id: 'compose',
    index: INDEX += 100,
    async render () {
      if (capabilities.has('guest')) return

      const $fieldset = util.fieldset(
        gt('Compose dialog')
      )

      this.append($fieldset)

      async function fetchAccounts () {
        /* TODO: only the default account (id: 0) can have multiple aliases for now
        * all other accounts can only have one address (the primary address)
        * So the option is only for the default account, for now. This should
        * be changed in the future. If more (e.g. external) addresses are shown
        * here, server _will_ respond with an error, when these are selected.
        *
        * THIS COMMENT IS IMPORTANT, DON’T REMOVE
        */
        return api.getSenderAddresses(0).then(function (addresses) {
          return _(addresses).map(function (address) {
            // use value also as label
            return { value: address[1], label: address[1] }
          })
        })
      }

      const senderOptions = await fetchAccounts()
      $fieldset.append(
        // Default sender
        util.compactSelect('defaultSendAddress', st.DEFAULT_SENDER, settings, senderOptions)
      )

      if (!isConfigurable.MESSAGE_FORMAT) return
      $fieldset.append(
        util.compactSelect('messageFormat', st.MESSAGE_FORMAT, settings, formatOptions)
      )
    }
  },
  //
  // Default style
  //
  {
    id: 'defaultStyle',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.DEFAULT_STYLE) return

      let exampleText, defaultStyleSection

      function getCSS () {
        const css = {
          'font-size': settings.get('defaultFontStyle/size', 'browser-default'),
          'font-family': settings.get('defaultFontStyle/family', 'browser-default'),
          color: settings.get('defaultFontStyle/color', 'transparent')
        }
        // using '' as a value removes the attribute and thus any previous styling
        if (css['font-size'] === 'browser-default') css['font-size'] = ''
        if (css['font-family'] === 'browser-default') css['font-family'] = ''
        if (css.color === 'transparent') css.color = ''
        return css
      }

      const model = new Backbone.Model({
        family: settings.get('defaultFontStyle/family', 'browser-default'),
        size: settings.get('defaultFontStyle/size', 'browser-default'),
        color: settings.get('defaultFontStyle/color', 'transparent')
      })
      const fontFamilySelect = new Dropdown({ caret: true, model, label: gt('Font'), tagName: 'div', className: 'dropdown fontnameSelectbox', name: 'family' })
      const fontSizeSelect = new Dropdown({ caret: true, model, label: gt('Size'), tagName: 'div', className: 'dropdown fontsizeSelectbox', name: 'size' })

      _(fontNameOptions).each(function (item, index) {
        if (index === 1) fontFamilySelect.divider()
        fontFamilySelect.option('family', item.value, item.label, { radio: true })
      })

      _(fontSizeOptions).each(function (item, index) {
        if (index === 1) fontSizeSelect.divider()
        fontSizeSelect.option('size', item.value, item.label, { radio: true })
      })

      model.on('change', function () {
        settings.set('defaultFontStyle', model.toJSON()).save()
        exampleText.css(getCSS())
      })

      _(fontFamilySelect.$ul.find('a')).each(function (item, index) {
        // index 0 is browser default
        if (index === 0) return
        $(item).css('font-family', $(item).data('value'))
      })

      _(defaultStyleSection).each(function (obj) {
        obj.toggle(settings.get('messageFormat') !== 'text')
      })

      settings.on('change:messageFormat', function (value) {
        _(defaultStyleSection).each(function (obj) {
          obj.toggle(value !== 'text')
        })
      })

      this.append(
        util.fieldset(st.DEFAULT_STYLE,
          util.explanation(
            gt('The default text style simplifies the task of automatically adding a personal touch to your messages')
          ),
          $('<div class="my-8">').append(
            fontFamilySelect.render().$el,
            fontSizeSelect.render().$el,
            $('<div class="fontcolorButton">').append(
              new Colorpicker({ name: 'color', model, className: 'dropdown', label: gt('Color'), caret: true }).render().$el
            )
          ),
          exampleText = $('<div class="example-text">')
            .text(gt('This is how your message text will look like.'))
            .css(getCSS())
        ).addClass('default-text-style')
      )
    }
  },
  //
  // Undo send
  //
  {
    id: 'undo-send',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.UNDO_SEND) return
      const list = [
        { label: gt('Without delay'), value: '0' },
        { label: gt('5 seconds'), value: '5' },
        { label: gt('10 seconds'), value: '10' }
      ]
      this.append(
        util.fieldset(
          st.UNDO_SEND,
          util.explanation(gt('Sending mail can be delayed so that you can cancel sending if it happens by mistake or you forgot something')),
          new mini.CustomRadioView({ name: 'undoSendDelay', model: settings, list }).render().$el
        ).attr('id', 'undoSendDelay').addClass('last')
      )
    }
  }
)

const moduleReady = mailfilter.getConfig()
const isActionInConfig = (config, action) => config.actioncmds.map(i => i.id).includes(action)

INDEX = 0
ext.point('io.ox/mail/settings/rules/buttons').extend(
  //
  // Vacation Notice
  //
  {
    id: 'vacation-notice',
    index: INDEX += 100,
    async render () {
      const config = await moduleReady
      if (!capabilities.has('mailfilter_v2') || !isActionInConfig(config, 'vacation')) return

      const toggle = createIcon('bi/toggle-on.svg').addClass('me-4 mini-toggle')
      this.append(
        $('<button type="button" class="btn btn-default me-16" data-action="edit-vacation-notice">')
          .append(
            toggle.hide(),
            $.txt(st.VACATION_NOTICE + ' ...')
          )
          .on('click', openDialog)
      )

      // check whether it's active
      const model = new VacationNoticeModel()
      model.fetch().done(updateToggle.bind(this, model))
      ox.on('mail:change:vacation-notice', updateToggle.bind(this))

      function updateToggle (model) {
        toggle.toggle(model.get('active'))
      }

      function openDialog () {
        ox.load(() => import('@/io.ox/mail/mailfilter/vacationnotice/view')).then(function ({ default: view }) {
          view.open()
        })
      }
    }
  },
  //
  // Auto Forward
  //
  {
    id: 'auto-forward',
    index: INDEX += 100,
    async render () {
      const config = await moduleReady
      if (!capabilities.has('mailfilter_v2') || !isActionInConfig(config, 'redirect')) return

      const toggle = createIcon('bi/toggle-on.svg').addClass('me-4 mini-toggle')
      this.append(
        $('<button type="button" class="btn btn-default me-16" data-action="edit-auto-forward">')
          .append(
            toggle.hide(),
            $.txt(st.AUTO_FORWARD + ' ...')
          )
          .on('click', openDialog)
      )

      // check whether it's active
      const model = new AutoforwardModel()
      model.fetch().done(updateToggle.bind(this, model))
      ox.on('mail:change:auto-forward', updateToggle.bind(this))

      function updateToggle (model) {
        toggle.toggle(model.isActive())
      }

      function openDialog () {
        ox.load(() => import('@/io.ox/mail/mailfilter/autoforward/view')).then(function ({ default: view }) {
          view.open()
        })
      }
    }
  }
)

INDEX = 0
ext.point('io.ox/mail/settings/advanced').extend({
  id: 'advanced',
  index: 10000,
  render () {
    if (capabilities.has('guest')) return

    const contactCollect = !!capabilities.has('collect_email_addresses')

    const forwardOptions = [
      { label: gt('Inline'), value: 'Inline' },
      { label: gt('Attachment'), value: 'Attachment' }
    ]

    this.append(
      // behavior
      $('<div class="form-group mb-24">').append(
        util.checkbox('allowHtmlMessages', st.DISPLAY_HTML, settings),
        util.checkbox('sendDispositionNotification', st.READ_RECEIPTS, settings),
        util.checkbox('removeDeletedPermanently', st.REMOVE_PERMANENTLY, settings),
        util.checkbox('autoSelectNewestSeenMessage', st.AUTO_SELECT_NEWEST, settings),
        contactCollect ? util.checkbox('contactCollectOnMailTransport', st.COLLECT_ON_SEND, settings) : [],
        contactCollect ? util.checkbox('contactCollectOnMailAccess', st.COLLECT_ON_READ, settings) : [],
        // mailto handler registration
        util.checkbox('features/registerProtocolHandler', st.MAILTO_HANDLER, settings)
          .find('label').css('margin-right', '8px').end()
          .append(
            // if supported add register now link
            navigator.registerProtocolHandler
              ? $('<a href="#" role="button">').text(gt('Register now')).on('click', function (e) {
                e.preventDefault()
                const l = location; const $l = l.href.indexOf('#'); const url = l.href.substr(0, $l)
                navigator.registerProtocolHandler(
                  'mailto', url + '#app=io.ox/mail&mailto=%s', ox.serverConfig.productNameMail
                )
              })
              : []
          )
      ),
      // Sending
      $('<div class="form-group mb-24">').append(
        util.checkbox('appendMailTextOnReply', st.APPEND_TEXT_ON_REPLY, settings),
        util.checkbox('confirmReplyToMailingLists', st.ASK_BEFORE_MAILING_LIST, settings),
        util.checkbox('appendVcard', st.ATTACH_VCARD, settings)
      ),
      $('<div role="group" class="form-group mb-24" aria-labelledby="forwardMessageAsDescription">').append(
        $('<div id="forwardMessageAsDescription" class="font-semibold">').text(st.FORWARD_AS),
        new mini.CustomRadioView({ list: forwardOptions, name: 'forwardMessageAs', model: settings }).render().$el
      ),
      // auto BCC
      $('<div class="form-group row mb-24">').append(
        $('<div class="col-md-9 col-xs-12">').append(
          $('<label for="autobcc">').text(st.AUTO_BCC),
          new mini.InputView({ name: 'autobcc', model: settings, className: 'form-control', id: 'autobcc' }).render().$el,
          util.explanation(gt('The given address is always added to BCC when replying or composing new emails'))
        )
      )
    )

    //
    // IMAP Subscriptions
    //
    // disabled in guest mode
    // also don't show it if disabled via server property
    if (settings.get('ignoreSubscription', false) || capabilities.has('guest')) return

    this.append(
      $('<div>').append(
        $('<button type="button" class="btn btn-default" data-action="change-image-supscriptions">')
          .text(st.IMAP_SUBSCRIPTIONS + ' ...')
          .on('click', openDialog)
      )
    )

    function openDialog () {
      ox.load(() => import('@/io.ox/core/folder/actions/imap-subscription')).then(function ({ default: subscribe }) {
        subscribe()
      })
    }
  }
})

ext.point('io.ox/mail/settings/signatures').extend({
  id: 'view',
  index: 100,
  render () {
    this.append(
      new ExtensibleView({ point: 'io.ox/mail/settings/signatures/detail/view', model: settings })
        .render().$el.addClass('io-ox-signature-settings')

    )
  }
})

ext.point('io.ox/mail/settings/templates').extend({
  id: 'view',
  index: 100,
  render (baton) {
    this.parent().one('open', () => {
      import('@/io.ox/mail/settings/templates/settings/pane.js').then(() => {
        ext.point('io.ox/mail/settings/templates/view').invoke('draw', this, baton)
      })
    })
  }
})

const MessageListPreview = DisposableView.extend({
  className: 'flex-row border border-bright rounded p-16 text-xs',
  initialize () {
    this.listenTo(this.model, 'change:showTextPreview change:exactDates change:alwaysShowSize change:listViewLayout', this.render)
  },
  render () {
    const now = moment()
    const layout = this.model.get('listViewLayout')
    const senderName = gt('Sender')
    this.$el.empty().append(
      // avatar or checkbox
      $('<div class="flex-col">').append(
        layout === 'avatars'
          ? $('<div class="avatar initials me-8" style="width: 32px; height: 32px">').text(contactsUtil.getInitials({ display_name: senderName }))
          : $(),
        layout === 'checkboxes'
          ? $('<div class="text-gray me-8 pt-8">').append(createIcon('bi/square.svg').addClass('bi-14'))
          : $()
      ),
      // content
      $('<div class="flex-col flex-grow">').append(
        // row 1
        $('<div class="flex-row">').append(
          // sender
          $('<div class="flex-grow text-bold truncate">').text(senderName),
          // date
          $('<div class="text-gray ms-8">').text(
            this.model.get('exactDates')
              ? now.format('l') + ' ' + now.format('LT')
              : now.format('LT')
          )
        ),
        // row 2
        $('<div class="flex-row">').append(
          // subject
          $('<div class="flex-grow truncate">').text(gt('Message subject')),
          // size
          this.model.get('alwaysShowSize')
            ? $('<div class="text-gray ms-8">').text('1.2 MB')
            : $()
        ),
        // row 3
        isConfigurable.SHOW_TEXT_PREVIEW && this.model.get('showTextPreview')
          ? $('<div class="flex-row">').append(
            // text preview (no translation here!)
            $('<div class="text-gray truncate multiline">').text('Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. ') // cSpell:disable-line
          )
          : $()
      )
    )
    return this
  }
})

const ReadingPanePreview = DisposableView.extend({
  className: 'border border-bright rounded p-16 text-xs',
  initialize () {
    this.listenTo(this.model, 'change:isColorQuoted change:useFixedWidthFont', this.render)
  },
  render () {
    const useColor = this.model.get('isColorQuoted')
    this.$el.empty().toggleClass('font-mono', this.model.get('useFixedWidthFont')).append(
      // cSpell:disable
      $('<p class="m-0">').text('Lorem ipsum dolor sit amet').append(
        $('<blockquote class="text-xs text-gray m-0 p-0 pl-8 border-left">').toggleClass('text-gray', useColor).text('sed diam nonumy eirmod tempor').append(
          $('<blockquote class="text-xs m-0 p-0 pl-8 border-left">').css(useColor ? { borderColor: '#283f73', color: '#283f73' } : {}).text('sed diam voluptua. At vero eos et').append(
            $('<blockquote class="text-xs m-0 p-0 pl-8 border-left">').css(useColor ? { borderColor: '#DD0880', color: '#DD0880' } : {}).text('accusam et justo duo dolores')
          )
        )
      )
      // cSpell:enable
    )
    return this
  }
})

export default moduleReady
