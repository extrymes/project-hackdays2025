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

import ext from '@/io.ox/core/extensions'
import sub from '@/io.ox/core/sub/model'
import { api as subscriptionsAPI } from '@/io.ox/core/api/sub'
import folderAPI from '@/io.ox/core/folder/api'
import yell from '@/io.ox/core/yell'
import ModalDialog from '@/io.ox/backbone/views/modal'
import keychainAPI from '@/io.ox/keychain/api'
import mini from '@/io.ox/backbone/mini-views'
import OAuth from '@/io.ox/oauth/backbone'
import { getAPI } from '@/io.ox/oauth/keychain'
import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

const POINT = 'io.ox/core/sub/subscribe'
// needs id and module (e.g. contacts)
const buildSubscribeDialog = function (options) {
  options = options || {}
  const model = new sub.Subscription({
    folder: options.folder,
    entity: { folder: options.folder },
    entityModule: options.module
  })

  new SubscriptionView({ model, app: options.app }).render()
}

const getAccountType = function (type) {
  return type.substring(type.lastIndexOf('.') + 1)
}

async function getSubscriptionServices () {
  const s = { calendar: false, contacts: false }
  const { services } = await getAPI()
  _(services.models).each(function (service) {
    if (service.get('availableScopes').indexOf('contacts') !== -1 || service.get('availableScopes').indexOf('contacts_ro') !== -1) s.contacts = true
    if (service.get('availableScopes').indexOf('calendar') !== -1 || service.get('availableScopes').indexOf('calendar_ro') !== -1) s.calendar = true
  })
  return s
}

export async function getAvailableServices () {
  const availableServices = await getSubscriptionServices()
  if (!availableServices.contacts || !availableServices.calendar) {
    try {
      const sources = await subscriptionsAPI.getSources()
      availableServices.contacts = availableServices.contacts || _(sources).any({ module: 'contacts' })
      availableServices.calendar = availableServices.calendar || _(sources).any({ module: 'calendar' })
    } catch (err) {}
  }
  return availableServices
}

export function getSubscribableServices (module, subscription) {
  return subscriptionsAPI.getSources().then(function (data) {
    // filter services for the current module
    const services = []
    _.each(data, function (service) {
      if (service.module === module) {
        services.push(service)
      }
    })

    // filter disabled/unavailable oauth sources without existing accounts
    return _.filter(services, function (service) {
      const fdLength = (service.formDescription || []).length; let enabled

      // process when no formDescriptions
      if (fdLength === 0) return true

      service.formDescription = _.filter(service.formDescription, function (fd) {
        if (fd.widget !== 'oauthAccount') return true

        const accountType = getAccountType(fd.options.type)
        const accounts = _.where(keychainAPI.getAll(), { serviceId: fd.options.type }).filter(function (account) {
          if (!subscription || !_.isArray(subscription.wantedOAuthScopes)) {
            return true
          }
          return subscription.wantedOAuthScopes.reduce(function (acc, scope) {
            return acc && account.availableScopes.indexOf(scope) >= 0
          }, true)
        })

        // process when at least one account exists
        if (accounts.length) return true

        enabled = keychainAPI.isEnabled(accountType)

        if (!enabled) {
          console.error('Keys for ' + accountType + ' are missing. A needed plugin was not registered in the server config.')
        }

        // remove formdescription entry when oauth service isn't available
        return enabled
      })

      // remove service in case all formdescriptions where removed
      return (service.formDescription || []).length
    })
  })
}

const SubscriptionView = Backbone.View.extend({

  initialize (opt) {
    this.on('subscribe', this.subscribe)
    this.app = opt.app
  },

  getServices () {
    const module = this.model.get('entityModule')
    const subscription = this.app.subscription
    return getSubscribableServices(module, subscription)
  },

  render () {
    const self = this
    let title = gt('Subscribe')

    if (this.model.get('entityModule') === 'contacts') title = gt('Subscribe to address book')
    if (this.model.get('entityModule') === 'calendar') title = gt('Subscribe to calendar')

    const popup = new ModalDialog({
      title,
      async: true,
      help: 'ox.appsuite.user.sect.contacts.folder.subscribe.html',
      // 130 * 4 + 8 * 3 + 30, Button.width * ButtonsPerRow + Button.rightMargin * (ButtonsPerRow - 1) + leftAndRightPaddingOfDialog
      width: 576
    })

    this.getServices().then(function (services) {
      self.services = services
      if (self.app.subscription && _.isArray(self.app.subscription.wantedOAuthScopes)) {
        // app requires some oauth scopes for subscriptions
        // TODO: should this info come from the backend?
        self.model.set('wantedScopes', self.app.subscription.wantedOAuthScopes)
      }
      if (services.length > 0) {
        const baton = ext.Baton({
          view: self,
          model: self.model,
          data: self.model.attributes,
          services,
          popup,
          app: self.app
        })
        ext.point(POINT + '/dialog').invoke('draw', popup.$body, baton)
        popup.addCancelButton()
          .addButton({ label: gt('Add'), action: 'add' })
          .build(function () { this.$footer.find('[data-action="add"]').hide() })
      } else {
        popup.addDescription({ description: gt('No subscription services available for this module') })
        popup.addButton({ label: gt('Cancel'), action: 'cancel' })
      }
      popup.open()

      if (services.length <= 3) $('.modal-dialog', popup.$el).css('width', '440px')

      popup.on('add', function () {
        popup.$body.find('div.alert').remove()
        self.subscribe()
      })
    })

    this.popup = popup
  },

  subscribe () {
    const self = this
    const popup = this.popup
    const service = _(this.services).findWhere({ id: this.model.get('source') })

    popup.busy()
    // workaround: service is needed for proper validation
    this.model.set('service', service)

    // validate model and check for errors
    this.model.validate()
    if (this.model.errors && this.model.errors.hasErrors()) {
      this.model.errors.each(function (errors) {
        if (errors.length > 0) showErrorInline(popup.$body, gt('Error:'), errors)
      })
      popup.idle()
      return
    }

    createSubscription(this.model, service).then(
      function saveSuccess (id) {
        // set id, if none is present (new model)
        if (!self.model.id) { self.model.id = id }
        subscriptionsAPI.refresh({ id, folder: self.model.get('folder') }).then(
          function refreshSuccess () {
            yell('success', gt('Subscription successfully created.'))
            popup.close()
            return self.model
          },
          function refreshFail (error) {
            popup.idle()
            showErrorInline(popup.$body, gt('Error:'), error.error_html || error.error)
            subscriptionsAPI.destroy(id)
            self.model = self.model.clone()
            folderAPI.remove(self.model.get('folder'))
            throw error
          }
        )
          .then(function (model) {
            return model.fetch()
          })
          .then(function (model) {
            const subscriptions = sub.subscriptions()
            // update the model-(collection)
            subscriptions.add(model, { merge: true })
            // select subscribed folder
            self.app.folder.set(self.model.get('folder'))
          })
      },
      function saveFail (error) {
        popup.idle()
        if (error.error) {
          showErrorInline(popup.$body, gt('Error:'), error.error)
        } else {
          yell({
            type: 'error',
            headline: gt('Error'),
            message: gt('The subscription could not be created.')
          })
        }
        folderAPI.remove(self.model.get('folder'))
        throw error
      }
    )
  }

})

function createSubscription (model, service) {
  const module = model.get('entityModule')
  const folder = settings.get('folder/' + module)
  let title = gt('New Folder')

  if (service.displayName && module === 'calendar') title = gt('My %1$s calendar', service.displayName)
  if (service.displayName && module === 'contacts') title = gt('My %1$s contacts', service.displayName)

  return folderAPI.create(folder, { title })
    .then(function (folder) {
      model.attributes.folder = model.attributes.entity.folder = folder.id
      model.unset('wantedScopes')
      return model.save()
    })
}

function showErrorInline (node, label, msg) {
  const list = [].concat(msg)
  node.find('div.alert').remove()
  _(list).each(function (msg) {
    this.prepend($('<div class="alert alert-danger alert-dismissible" role="alert">').append(
      $('<strong>').text(label),
      $.txt(' '),
      $('<span>').html(msg)
    )
    )
  }, node)
}

ext.point(POINT + '/dialog').extend({
  id: 'service',
  index: 100,
  draw (baton) {
    // ensure correct icon
    _(baton.services).each(function (service) {
      if (/.*(contact|calendar)$/.test(service.id)) {
        // example for service.id: 'com.openexchange.subscribe.google.contact'
        service.icon = _.last(service.id.split('.'), 2)[0]
      }
      if (service.id.indexOf('gmx.de') >= 0) service.icon = 'gmx'
      if (service.id.indexOf('web.de') >= 0) service.icon = 'webde'
      if (service.id === 'com.openexchange.subscribe.microformats.contacts.http') service.icon = 'oxmf'
    })
    // if oxmf is present, move it to the end
    baton.services = _(baton.services).sortBy(function (service) {
      if (service.id === 'com.openexchange.subscribe.microformats.contacts.http') return 1
      return 0
    })
    this.append(new OAuth.Views.ServicesListView({
      collection: new Backbone.Collection(baton.services)
    })
      .on('select', function (model) {
        const fd = model.get('formDescription')
        const bat = ext.Baton({ view: baton.view, subModel: baton.model, model, services: baton.services, popup: baton.popup, app: baton.app })
        baton.model.setSource(model.toJSON())
        baton.popup.$body.find('div.alert').remove()
        if (fd.length === 1 && fd[0].widget === 'oauthAccount') {
          ext.point(POINT + '/oauth').invoke('configure', this, bat)
        } else {
          ext.point(POINT + '/subscribe').invoke('configure', this, bat)
        }
      }).render().$el)
  }
})

async function createAccount (service, scope) {
  const serviceId = service.formDescription[0].options.type
  const oauthAPI = await getAPI()
  const account = new OAuth.Account.Model({
    serviceId,
    displayName: oauthAPI.chooseDisplayName(service)
  })
  return account.enableScopes(scope).save()
}

ext.point(POINT + '/oauth').extend({
  id: 'oauth',
  index: 100,
  configure (baton) {
    const model = baton.model
    const service = model.toJSON()
    createAccount(service, baton.subModel.get('wantedScopes')).then(function success (account) {
      baton.subModel.setSource(service, { account: parseInt(account.id, 10) })
      baton.view.trigger('subscribe')
    }, function fail (error) {
      showErrorInline(baton.view.popup.$body, gt('Error:'), error)
    })
  }
})

ext.point(POINT + '/subscribe').extend({
  id: 'subscribe',
  index: 100,
  configure (baton) {
    const model = baton.model
    const inputModel = new Backbone.Model()
    const service = model.toJSON()
    baton.popup.$body.empty().append(
      $('<form class="form-horizontal">').append(
        $('<h4>').text(gt('Configure %s', model.get('displayName'))),
        _(model.get('formDescription')).map(function (fd) {
          const Input = fd.name === 'password' ? mini.PasswordView : mini.InputView
          return $('<div class="control-group">').append(
            $('<label class="control-label">').attr('for', fd.name).text((fd.name === 'account' ? gt('Account') : fd.displayName)),
            $('<div class="controls">').append(new Input({ model: inputModel, name: fd.name, autocomplete: false }).render().$el)
          )
        })
      ).on('keydown', function (e) {
        if (e.which === 10 || e.which === 13) baton.view.trigger('subscribe')
      })
    )
    baton.popup.$footer.find('[data-action="add"]').show()
    baton.view.listenTo(inputModel, 'change', function () {
      baton.subModel.setSource(service, inputModel.toJSON())
    })
  }
})

export default {
  getAvailableServices,
  buildSubscribeDialog
}
