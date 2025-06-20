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
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import mini from '@/io.ox/backbone/mini-views/common'
import ext from '@/io.ox/core/extensions'
import yell from '@/io.ox/core/yell'
import '@/lib/jquery-ui.min.js'

import { settings } from '@/io.ox/core/settings'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import gt from 'gettext'

const getTimeOption = function (seed) {
  const count = seed.slice(0, seed.length - 1)
  const unit = seed.slice(seed.length - 1, seed.length)
  // _.now will be added to the value on send to have correct timestamps
  let value
  let text = ''

  switch (unit) {
    case 'm':
      text = gt.ngettext('%1$d minute', '%1$d minutes', count, count)
      value = count * 60000
      break
    case 'h':
      text = gt.ngettext('%1$d hour', '%1$d hours', count, count)
      value = count * 3600000
      break
    case 'd':
      text = gt.ngettext('%1$d day', '%1$d days', count, count)
      value = count * 86400000
      break
    case 'w':
      text = gt.ngettext('%1$d week', '%1$d weeks', count, count)
      value = count * 604800000
      break
    case 'M':
      text = gt.ngettext('%1$d month', '%1$d months', count, count)
      // we just assume 30 days here
      value = count * 2592000000
      break
    case 'y':
      text = gt.ngettext('%1$d year', '%1$d years', count, count)
      // 365 days
      value = count * 31536000000
      break
    default:
      break
  }
  return { label: text, value }
}

ext.point('io.ox/mail/compose/sharing').extend({
  id: 'expire',
  index: 100,
  render () {
    const options = []

    // option: timespan
    _(mailSettings.get('compose/shareAttachments/expiryDates', [])).each(function (seed) {
      const option = getTimeOption(seed)
      options.push(option)

      if (!this.sharingModel.get('expiryDate') && seed === mailSettings.get('compose/shareAttachments/defaultExpiryDate', '')) this.sharingModel.set('expiryDate', option.value)
    }.bind(this))

    // option: none
    if (!mailSettings.get('compose/shareAttachments/requiredExpiration') && !mailSettings.get('compose/shareAttachments/forceAutoDelete', false)) {
      options.push({ label: gt('Never'), value: '' })
      if (!this.sharingModel.get('expiryDate') && mailSettings.get('compose/shareAttachments/defaultExpiryDate', '') === '') this.sharingModel.set('expiryDate', '')
    }

    const selectbox = new mini.SelectView({
      model: this.sharingModel,
      name: 'expiryDate',
      list: options,
      id: 'expiration-select-box'
    })

    // #. label of a selectbox to select a time (1 day 1 month etc.) or "never"
    this.dialogNode.append($('<label for="expiration-select-box">').text(gt('Expiration')), selectbox.render().$el)
  }
}, {
  index: 200,
  render () {
    const self = this

    const node = new mini.CustomCheckboxView({
      model: this.sharingModel,
      name: 'autodelete',
      // #. label of a selectbox: automatically delete files after a share/sharing-link expired?
      label: gt('Delete files after expiration')
    }).render().$el

    // disable when forced
    if (mailSettings.get('compose/shareAttachments/forceAutoDelete', false)) return node.prop('disabled', true).addClass('disabled')
    // hide option and divider when 'no expire' is used
    this.listenTo(this.sharingModel, 'change:expiryDate', updateVisibility)
    updateVisibility()

    function updateVisibility () {
      node.toggleClass('hidden', self.sharingModel.get('expiryDate') === '')
    }
    this.dialogNode.append(node)
  }
}, {
  id: 'password',
  index: 300,
  render () {
    const model = this.sharingModel
    const self = this; let passContainer; let guid

    function passwordIsEmpty () { return passContainer.find('input').val().trim() === '' }

    function applyValidationState () {
      const applyButton = self.dialogNode.closest('.modal-content').find('button[data-action="apply"]')
      if (passwordIsEmpty() && model.get('usepassword')) {
        passContainer.addClass('has-error')
        applyButton.prop('disabled', true)
      } else {
        passContainer.removeClass('has-error')
        applyButton.prop('disabled', false)
      }
    }

    function toggleState () {
      applyValidationState()
      if (model.get('usepassword')) return passContainer.find('input, button').prop('disabled', false)
      passContainer.find('input, button').prop('disabled', true)
    }

    this.dialogNode.append(
      $('<div class="password-wrapper">').append(
        // #. checkbox label to determine if a password should be used
        new mini.CustomCheckboxView({ name: 'usepassword', model, label: gt('Use password') }).render().$el.addClass('use-password'),
        $('<label class="control-label sr-only">').text(gt('Enter Password')).attr({ for: guid = _.uniqueId('share-password-label-') }),
        passContainer = new mini.PasswordViewToggle({ name: 'password', model, placeholder: gt('Password'), autocomplete: false }).render().$el
      )
    )
    passContainer.find('input').attr('id', guid)
    passContainer.find('input').on('keyup', toggleState)
    model.on('change:usepassword', toggleState)
    toggleState()
  }
}, {
  id: 'notifications',
  index: 400,
  render () {
    if (!mailSettings.get('compose/shareAttachments/enableNotifications', false)) return

    this.notificationModel = new Backbone.Model({
      download: _(this.sharingModel.get('notifications')).contains('download'),
      expired: _(this.sharingModel.get('notifications')).contains('expired'),
      visit: _(this.sharingModel.get('notifications')).contains('visit')
    })

    this.dialogNode.append(
      $('<fieldset>').append(
        $('<legend>').append($('<h2>').text(gt('Email notifications'))),
        new mini.CustomCheckboxView({
          model: this.notificationModel,
          name: 'download',
          // #. There is a label "Notification" before this text
          label: gt('Receive notification when someone finished downloading file(s)')
        }).render().$el,
        new mini.CustomCheckboxView({
          model: this.notificationModel,
          name: 'expired',
          // #. There is a label "Notification" before this text
          label: gt('Receive notification when the link expires')
        }).render().$el,
        new mini.CustomCheckboxView({
          model: this.notificationModel,
          name: 'visit',
          // #. There is a label "Notification" before this text
          label: gt('Receive notification when someone accesses the file(s)')
        }).render().$el
      )
    )

    this.listenTo(this.notificationModel, 'change', function () {
      this.sharingModel.set('notifications', _.allKeys(_(this.notificationModel.attributes).pick(function (value) {
        return value === true
      })))
    })
  }
})

const SharingView = ExtensibleView.extend({

  tagName: 'div',

  className: 'share-attachments',

  point: 'io.ox/mail/compose/sharing',

  initialize () {
    const forceAutoDelete = mailSettings.get('compose/shareAttachments/forceAutoDelete', false)
    const data = _.extend({
      language: settings.get('language'),
      enabled: false,
      autodelete: forceAutoDelete,
      usepassword: !_.isEmpty(this.model.get('sharedAttachments').password)

    }, this.model.get('sharedAttachments'))
    if (forceAutoDelete) data.autodelete = true

    // make sure default expiry date is set if it is mandatory
    if (mailSettings.get('compose/shareAttachments/requiredExpiration')) data.expiryDate = getTimeOption(mailSettings.get('compose/shareAttachments/defaultExpiryDate', '1w')).value

    this.sharingModel = new Backbone.Model(data)
    this.listenTo(this.model.get('attachments'), 'add remove reset change:size', this.updateVisibility)
    this.listenTo(this.model, 'change:sharedAttachments', this.syncToSharingModel)
    this.listenTo(this.sharingModel, 'change:enabled', this.updateVisibility)
    this.listenTo(this.sharingModel, 'change:enabled', _.partial(this.syncToMailModel, { instant: true }))
  },

  updateVisibility () {
    if (!this.optionsButton) return

    const alreadyActive = this.enabledCheckbox.find('input').is(':checked')
    const overThreshold = this.model.exceedsThreshold()
    const overMailQuota = this.model.exceedsMailQuota()

    if (!alreadyActive && !this.model.saving && overMailQuota && !this.sharingModel.get('enabled')) {
      // #. %1$s is usually "Drive Mail" (product name; might be customized)
      yell('info', gt('Mail quota limit reached. You have to use %1$s or reduce the mail size in some other way.', mailSettings.get('compose/shareAttachments/name')))
      this.sharingModel.set('enabled', true)
    } else if (!alreadyActive && !this.model.saving && overThreshold && !this.sharingModel.get('enabled')) {
      // #. %1$s is usually "Drive Mail" (product name; might be customized)
      yell('info', gt('Attachment file size too large. You have to use %1$s or reduce the attachment file size.', mailSettings.get('compose/shareAttachments/name')))
      this.sharingModel.set('enabled', true)
    }

    if (alreadyActive && !this.sharingModel.get('enabled')) this.sharingModel.set('enabled', true)

    // offer option to activate when attachments are present
    this.$el.toggle(!!this.model.get('attachments').getValidModels().length)
    // is active
    this.optionsButton.toggleClass('hidden', !this.sharingModel.get('enabled'))
    // if we are over the threshold or Mail Quota users should not be able to untoggle drive mail
    this.enabledCheckbox.toggleClass('disabled', overThreshold).find('input').attr('disabled', overThreshold || overMailQuota)
  },

  syncToSharingModel () {
    const sharedAttachments = this.model.get('sharedAttachments')
    if (mailSettings.get('compose/shareAttachments/forceAutoDelete', false)) sharedAttachments.autodelete = true
    this.sharingModel.set(sharedAttachments)

    import('@/io.ox/mail/actions/attachmentQuota').then(function ({ default: attachmentQuota }) {
      if (!attachmentQuota.checkQuota(this.model)) this.model.set('sharedAttachments', { enabled: false })
    }.bind(this))
  },

  syncToMailModel (options) {
    const opt = _.extend({ instant: false }, options)

    if (!this.sharingModel.get('enabled')) {
      this.model.set('sharedAttachments', { enabled: false })
      return opt.instant ? this.model.save() : undefined
    }

    const obj = this.sharingModel.toJSON()
    const blocklist = ['usepassword']
    // don't save password if the field is empty or disabled.
    if (!this.sharingModel.get('usepassword') || _.isEmpty(this.sharingModel.get('password'))) blocklist.push('password')
    this.model.set('sharedAttachments', _.omit(obj, blocklist))
    return opt.instant ? this.model.save() : undefined
  },

  render () {
    if (this.isRendered) return this

    this.$el.append(
      this.enabledCheckbox = new mini.CustomCheckboxView({
        model: this.sharingModel,
        name: 'enabled',
        // #. %1$s is usually "Drive Mail" (product name; might be customized)
        label: gt('Use %1$s', mailSettings.get('compose/shareAttachments/name'))
      }).render().$el,
      this.optionsButton = $('<button type="button" class="btn btn-link hidden">').text(gt('Options')).on('click', _(this.openDialog).bind(this))
    )
    this.updateVisibility()
    this.isRendered = true
    return this
  },

  openDialog () {
    const self = this
    const previousAttr = this.sharingModel.toJSON()

    import('@/io.ox/backbone/views/modal').then(function ({ default: ModalDialog }) {
      new ModalDialog({
        // #. %1$s is usually "Drive Mail" (product name; might be customized)
        title: gt('%1$s options', mailSettings.get('compose/shareAttachments/name')),
        width: 400
      })
        .build(function () {
          self.dialogNode = this.$body
          this.$el.addClass('share-attachments-view-dialog')
          self.invoke('render')
        })
        .addCancelButton()
        .addButton({ action: 'apply', label: gt('Apply') })
        .on('apply', function () {
          self.syncToMailModel()
        })
        .on('cancel', function () {
          // revert to previous attributes
          self.sharingModel.clear().set(previousAttr)
        })
        .open()
    })
  }
})

export default SharingView
