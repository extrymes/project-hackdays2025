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
import Backbone from '@/backbone'
import ext from '@/io.ox/core/extensions'
import ModalDialog from '@/io.ox/backbone/views/modal'
import snippets from '@/io.ox/core/api/snippets'
import mini from '@/io.ox/backbone/mini-views'
import * as mailUtil from '@/io.ox/mail/util'
import accountApi from '@/io.ox/keychain/api'
import ListView from '@/io.ox/backbone/mini-views/settings-list-view'
import listUtils from '@/io.ox/backbone/mini-views/listutils'
import '@/io.ox/mail/settings/signatures/style.scss'
import snippetsUtil from '@/io.ox/core/tk/snippetsUtil'
import { createIcon } from '@/io.ox/core/components'
import * as util from '@/io.ox/core/settings/util'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

const dialogOptions = {
  updateData (isNew) {
    const signatures = snippets.getCollection('signature').toJSON()
    // set very first signature as default if no other signatures exist
    if (signatures.length === 1 && isNew) {
      const address = accountApi.getStandardAccount('mail').primary_address
      settings.set('defaultSignature', { [address]: signatures[0].id })
      settings.set('defaultReplyForwardSignature', { [address]: signatures[0].id })
      settings.save()
    }
  }
}

export function getAccounts () {
  return accountApi.getAccountsByType('mail')
}

export function getAddresses () {
  // show main account and it's aliases first
  const mainAccount = getAccounts().find(a => a.id === 0)
  const mainAccountAddresses = mainAccount.addresses ? mainAccount.addresses.split(', ') : [mainAccount.primary_address]

  // show other addresses sorted by display name
  const externalAddresses = getAccounts().filter(a => a.id !== 0)
    .map(external => external.addresses ? external.addresses.split(', ') : [external.primary_address || external.email]).flat()
    .sort((a, b) => getDisplayName(a) > getDisplayName(b) ? 1 : -1)

  return [].concat(mainAccountAddresses, externalAddresses)
}

export function getDisplayName (address) {
  const account = getAccounts().find(account => address === account.primary_address || account.email || account.addresses?.includes(address))
  if (!account) return
  return account.addresses && account.addresses.split(', ').length > 1
    ? account.addresses.split(', ').find(a => a === address)
    : account.displayName
}

export function slugify (str) {
  return str.replace(/[@.]/g, '-')
}

ext.point('io.ox/mail/settings/signature-dialog/edit').extend({
  id: 'position',
  index: 100,
  render () {
    const signature = this.getSnippet()

    const select = $('<select id="signature-position" class="form-control">')
      .append(
        $('<option value="above">').text(gt('Add signature above quoted text')),
        $('<option value="below">').text(gt('Add signature below quoted text'))
      )

    this.$body.append(
      $('<div class="form-group">').append(
        select.val(signature.misc.insertion)
      )
    )
    select.on('change', () => { signature.misc.insertion = select.val() })
  }
})

function assignSignatures (collection, defaultSignature, defaultReplyForwardSignature) {
  collection.models.forEach(model => {
    model.set('defaultSignature', [])
    model.set('defaultReplyForwardSignature', [])
  })

  for (const key in defaultSignature) {
    if (defaultSignature[key]) {
      const model = collection.models.find(m => m.get('id') === defaultSignature[key])
      if (model) model.attributes.defaultSignature.push(key)
    }
  }

  for (const key in defaultReplyForwardSignature) {
    if (defaultReplyForwardSignature[key]) {
      const model = collection.models.find(m => m.get('id') === defaultReplyForwardSignature[key])
      if (model) model.attributes.defaultReplyForwardSignature.push(key)
    }
  }

  collection.trigger('change')
}

function fnAssignDefaults (event, collection) {
  return new ModalDialog({
    width: 640,
    async: true,
    title: gt('Set default signatures'),
    point: 'io.ox/mail/settings/signature-dialog/assign',
    focus: $(event.currentTarget).attr('initialFocus')
  })
    .build(function () {
      this.$el.addClass('io-ox-signature-assign-dialog')

      this.defaultSignatureModel = new Backbone.Model(mailUtil.getDefaultSignatures('new'))
      this.defaultReplyForwardSignatureModel = new Backbone.Model(mailUtil.getDefaultSignatures('replyForward'))

      const addresses = getAddresses()
      addresses.forEach(address => {
        const defaultId = `defaultSignature-${slugify(address)}`
        const defaultReplyForwardId = `defaultReplyForwardSignature-${slugify(address)}`

        const defaultSelectView = new mini.SelectView({
          list: [{ value: '', label: gt('No signature') }, ...collection.map(signature => {
            return { value: signature.get('id'), label: signature.get('displayname') }
          })],
          name: address,
          model: this.defaultSignatureModel,
          id: defaultId
        })

        const defaultReplyForwardSelectView = new mini.SelectView({
          list: [{ value: '', label: gt('No signature') }, ...collection.map(signature => {
            return { value: signature.get('id'), label: signature.get('displayname') }
          })],
          name: address,
          model: this.defaultReplyForwardSignatureModel,
          id: defaultReplyForwardId
        })

        this.listenTo(defaultSelectView.model, 'change', (model) => {
          const account = Object.keys(model.changed)[0]
          if (!defaultReplyForwardSelectView.model.get(account)?.length) defaultReplyForwardSelectView.model.set(account, model.changed[account])
        })

        this.$body.append(
          $('<div class="form-group row">').append(
            $('<h2 class="col-sm-12 account-name mt-8 text-bold">').text(getDisplayName(address))
          ),
          $('<div class="form-group row">').append(
            $('<div class="col-xs-6 mb-32">').append(
              $(`<label for="${defaultId}">`).text(gt('Default signature for new mails')),
              defaultSelectView.render().$el
            ),
            $('<div class="col-xs-6 mb-32">').append(
              $(`<label for="${defaultReplyForwardId}">`).text(gt('Default signature on reply or forward')),
              defaultReplyForwardSelectView.render().$el
            )
          )
        )
      })
    })
    .addCancelButton()
    .addButton({ action: 'save', label: gt('Save') })
    .on('save', function () {
      const updatedDefaultSignatures = {}
      const updatedDefaultReplyForwardSignatures = {}
      const addresses = getAddresses()

      addresses.forEach(address => {
        if (this.defaultSignatureModel.attributes[address]) updatedDefaultSignatures[address] = this.defaultSignatureModel.attributes[address]
        if (this.defaultReplyForwardSignatureModel.attributes[address]) updatedDefaultReplyForwardSignatures[address] = this.defaultReplyForwardSignatureModel.attributes[address]
      })

      settings.set('defaultSignature', updatedDefaultSignatures, { silent: true })
      settings.set('defaultReplyForwardSignature', updatedDefaultReplyForwardSignatures, { silent: true })
      settings.save()

      assignSignatures(collection, this.defaultSignatureModel.attributes, this.defaultReplyForwardSignatureModel.attributes)

      this.close()
    })
    .open()
}

ext.point('io.ox/mail/settings/signatures/detail/view').extend(
  //
  // Buttons
  //
  {
    id: 'buttons',
    index: 200,
    render () {
      const $el = $('<div class="form-group flex flex-wrap">').append(
        $('<button type="button" class="btn btn-primary me-16">')
          .text(gt('Add new signature'))
          .on('click', () => snippetsUtil.editSnippet(dialogOptions, {
            type: 'signature',
            misc: { insertion: settings.get('defaultSignaturePosition', 'below'), 'content-type': 'text/html' }
          })),
        $('<button id="assign-signatures"  type="button" class="btn btn-default" style="display: none">')
          .text(gt('Set default signatures'))
          .on('click', event => fnAssignDefaults(event, this.collection)),
        $('<span class="settings-explanation ml-auto">').append(util.helpButton('ox.appsuite.user.sect.email.send.signatures.html'))
      )

      this.$el.append($el)
    }
  },
  //
  // Collection
  //
  {
    id: 'collection',
    index: 300,
    render () {
      const collection = this.collection = new Backbone.Collection()

      load()
      snippets.on('refresh.all', load)

      this.on('dispose', () => snippets.off('refresh.all', load))

      function load () {
        snippets.getAll({ timeout: 0 }).then(function processSignatures () {
          const signatures = snippets.getCollection('signature').toJSON()
          if (signatures.length) $('#assign-signatures').removeAttr('style')
          else $('#assign-signatures').css('display', 'none')

          // clean up settings from removed accounts
          const [defaultSignature, defaultReplyForwardSignature] = [mailUtil.getDefaultSignatures('new'), mailUtil.getDefaultSignatures('replyForward')].map(signatures => {
            if (!signatures) return {}
            Object.keys(signatures).filter(address => {
              return !getAccounts().find(account => address === account.primary_address || account.email || account.addresses?.includes(address))
            }).forEach(address => delete signatures[address])
            return signatures
          })
          settings.set('defaultSignature', defaultSignature, { silent: true })
          settings.set('defaultReplyForwardSignature', defaultReplyForwardSignature, { silent: true })
          settings.save()

          signatures.forEach(signature => {
            signature.defaultSignature = []
            signature.defaultReplyForwardSignature = []
          })

          collection.reset(signatures)
          assignSignatures(collection, defaultSignature, defaultReplyForwardSignature)
        })
      }
    }
  },
  //
  // List view
  //
  {
    id: 'list-view',
    index: 400,
    render () {
      const self = this

      const buttonLabels = {
        defaultSignature: gt('For new messages'),
        defaultReplyForwardSignature: gt('On replies or forwardings'),
        both: gt('Default signature')
      }

      const buttonIcons = {
        defaultSignature: 'bi/send.svg',
        defaultReplyForwardSignature: 'bi/reply-all.svg'
      }

      function getSignatureData (event) {
        const id = $(event.currentTarget).closest('li').attr('data-id')
        return self.collection.get(id).toJSON()
      }

      function clickEdit (event) {
        if ((event.type !== 'click' && event.which !== 13)) return

        snippetsUtil.editSnippet(dialogOptions, getSignatureData(event))
        event.preventDefault()
      }

      function renderDefaultSignatureButtons (model) {
        const buttons = [
          ...model.get('defaultSignature').map(address => renderDefaultSignatureButton(address, model, 'defaultSignature')),
          ...model.get('defaultReplyForwardSignature').map(address => renderDefaultSignatureButton(address, model, 'defaultReplyForwardSignature'))
        ]
        if (!buttons.length) return
        return $('<div class="flex-inline-wrap gap-8 width-100 pt-16">').append(buttons)
      }

      function renderDefaultSignatureButton (address, model, type) {
        function hasBoth () {
          return model.get('defaultSignature').includes(address) && model.get('defaultReplyForwardSignature').includes(address)
        }

        function renderIcon () {
          return hasBoth() ? '' : createIcon(buttonIcons[type])
        }

        if (hasBoth() && type === 'defaultReplyForwardSignature') return

        const signatureLabel = $(`<button type="button" class="btn btn-sm btn-secondary account" initialFocus="#${type}-${slugify(address)}">${getDisplayName(address)}</div>`)
          .prepend(renderIcon())
          .on('click', event => fnAssignDefaults(event, self.collection))

        const info = (hasBoth()) ? buttonLabels.both : buttonLabels[type]
        signatureLabel.attr({ 'aria-label': `${info} ${getDisplayName(address)}`, title: info })
        return signatureLabel
      }

      this.collection.opt = ({ sortById: true })

      this.$el.append(
        new ListView({
          tagName: 'ul',
          collection: this.collection,
          childOptions: {
            titleAttribute: 'displayname',
            customize (model) {
              this.$('.list-item-title').addClass('justify-center font-bold')
              const preview = snippetsUtil.sanitize(model.get('content') || model.get('error'))
              const title = model.get('displayname')
              this.$('.list-item-controls').append(
                model.has('error') ? [] : listUtils.controlsEdit({ ariaLabel: gt('Edit %1$s', title) }),
                listUtils.controlsDelete({ ariaLabel: gt('Delete %1$s', title) })
              )
              this.$el.append(
                preview && $('<div class="signature-preview text-gray w-full mt-8">').append(
                  $('<div>').on('click', clickEdit.bind(self)).append(preview)
                ),
                renderDefaultSignatureButtons(model)
              )
            }
          }
        })
          .on('edit', clickEdit)
          .on('delete', async event => {
            const signatureData = getSignatureData(event)
            event.preventDefault()
            try {
              await snippetsUtil.showDeleteDialog(signatureData)
            } catch (error) {
              // cancel causes promise rejection so just catch it and do nothing
              return
            }

            const defaultSignatures = mailUtil.getDefaultSignatures('new')
            Object.keys(defaultSignatures)
              .filter(account => defaultSignatures[account] === signatureData.id)
              .forEach(account => delete defaultSignatures[account])
            settings.set('defaultSignature', defaultSignatures, { silent: true })

            const defaultReplyForwardSignature = mailUtil.getDefaultSignatures('replyForward')
            Object.keys(defaultReplyForwardSignature)
              .filter(account => defaultReplyForwardSignature[account] === signatureData.id)
              .forEach(account => delete defaultReplyForwardSignature[account])
            settings.set('defaultReplyForwardSignature', defaultReplyForwardSignature, { silent: true })

            settings.save()
          })
          .render().$el
      )
    }
  }
)
