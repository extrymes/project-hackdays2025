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
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/core/api/account'
import AccountModel from '@/io.ox/mail/accounts/model'
import AccountDetailView from '@/io.ox/mail/accounts/view-form'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'
import a11y from '@/io.ox/core/a11y'
import '@/io.ox/settings/style.scss'

import { settings as mailSettings } from '@/io.ox/mail/settings'
import gt from 'gettext'

function renderDetailView (evt, data, apiModel) {
  let ignoreValidationErrors = true

  const myViewNode = $('<div>').addClass('accountDetail')
  const myModel = new AccountModel(data)
  const myView = new AccountDetailView({ model: myModel, node: myViewNode })
  myView.listenTo(myModel, 'sync', function (model) {
    apiModel.set(model.attributes)
  })

  myView.dialog = new ModalDialog({
    width: _.device('smartphone') ? '' : '43.75rem',
    maximize: '31.25rem',
    async: true,
    point: 'io.ox/settings/accounts/mail/settings/detail/dialog',
    title: myModel.get('id') || myModel.get('id') === 0 ? gt('Edit mail account') : gt('Add mail account'),
    view: myView
  }).extend({
    text () {
      this.$body.append(
        this.options.view.render().el
      )
    },
    secondary () {
      const model = this.options.view.model
      if (!model.get('secondary')) return
      // show both actions on smartphone - 'disable' on other devices only
      if (!_.device('smartphone') && model.get('deactivated')) return
      this.addButton({
        placement: 'left',
        className: 'btn-default',
        action: 'toggle',
        label: model.get('deactivated') ? gt('Enable') : gt('Disable')
      }).on('toggle', function () {
        const self = this
        import('@/io.ox/core/api/account').then(function ({ default: accountAPI }) {
          // get untouched model
          accountAPI.get(model.get('id')).done(function (data) {
            const aModel = new AccountModel(data)
            aModel.set('deactivated', !aModel.get('deactivated')).save()
            self.close()
          })
        })
      })
    }
  })
    .addCancelButton()
    .addButton({
      action: 'save',
      label: gt('Save')
    })
    .open()

  // show errors
  myModel.on('validated', function (valid, model, error) {
    const $form = myView.$el
    $form.find('.error').removeClass('error')
    $form.find('.help-block').prev().removeAttr('aria-invalid aria-describedby')
    $form.find('.help-block').remove()

    if (ignoreValidationErrors) return
    _.each(error, function (message, key) {
      const $field = myView.$el.find('#' + key).parent()
      const $row = $field.closest('.form-group')
      const helpBlock = $('<div class="help-block error">').attr('id', _.uniqueId('error-help-'))
      helpBlock.append($.txt(message))
      $field.append(helpBlock)
      helpBlock.prev().attr({
        'aria-invalid': true,
        'aria-describedby': helpBlock.attr('id')
      })
      $row.addClass('error')
    })
  })

  // validate on change, so errormessages and aria-invalid states are updated
  myModel.on('change', function (model) {
    model.validate()
  })

  myView.dialog.on('save', function () {
    ignoreValidationErrors = false
    myModel.validate()
    if (myModel.isValid()) {
      myView.dialog.$body.find('.settings-detail-pane').trigger('save')
    } else {
      yell('error', gt('Account settings could not be saved. Please take a look at the annotations in the form. '))
      myView.dialog.idle()

      // disable fields for primary account again
      if (myModel.get('id') === 0) {
        myView.$el.find('input, select').not('#personal, #name, #reply_to,  [data-property="unified_inbox_enabled"]').prop('disabled', true)
      }
    }
  })

  myView.success = successDialog
  myView.collection = collection
  return myView.node
}

function createUnifiedMailboxInput (data) {
  if (!mailSettings.get('features/accounts/configureUnifiedInboxOnCreate', false)) return

  data = _.defaults({ unified_inbox_enabled: false }, data)
  return $('<div class="form-group checkbox">').append(
    $('<label for="unified_inbox_enabled">').append(
      $('<input type="checkbox" name="unified_inbox_enabled">')
        .prop('checked', data.unified_inbox_enabled),
      gt('Use unified mail for this account')
    )
  )
}

ext.point('io.ox/settings/accounts/mail/settings/detail').extend({
  index: 200,
  id: 'emailaccountssettings',
  draw (evt) {
    if (evt.data.id >= 0) {
      api.get(evt.data.id).done(function (obj) {
        renderDetailView(evt, obj, evt.data.model)
      })
    } else {
      renderDetailView(evt, evt.data, evt.data.model)
    }
  }
}, {
  index: 100,
  id: 'mail-address',
  renderSubtitle (model) {
    // already covered by oauth view
    if (model.has('serviceId')) return
    if (model.get('id') !== 0 && !model.get('secondary')) return

    // more than one email address (alias)
    const title = model.get('addresses') || model.get('primary_address') || ''
    this.append(
      $('<button type="button" class="btn btn-link no-padding deeplink account-button">').attr({
        // #. link title for related accounts into the corresponding folder
        // #. %1$s - the name of the folder to link into, e.g. "My G-Calendar"
        // #. %2$s - the translated name of the application the link points to, e.g. "Mail", "Drive"
        title: gt('Open %1$s in %2$s', title, gt.pgettext('app', 'Mail'))
      })
        .append(title)
        .prop('disabled', !!model.get('deactivated'))
        .addClass(model.get('deactivated') ? 'disabled' : '')
        .on('click', function () {
          const folder = 'default' + model.get('id') + '/INBOX'
          ox.launch(() => import('@/io.ox/mail/main')).then(function (app) {
            app.folder.set(folder)
          })
        })
    )
  }
})

ext.point('io.ox/mail/add-account/preselect').extend({
  id: 'oauth',
  index: 100,
  draw (baton) {
    const $el = this
    $el.empty().addClass('mail-account-dialog')
    Promise.all([
      import('@/io.ox/oauth/keychain').then(({ getAPI }) => getAPI()),
      import('@/io.ox/oauth/backbone').then(({ default: api }) => api)
    ]).then(function ([oauthAPI, OAuth]) {
      const mailServices = new Backbone.Collection(oauthAPI.services.filter(function (service) {
        return service.canAdd({ scopes: ['mail'] }) &&
          oauthAPI.accounts.forService(service.id, { scope: 'mail' }).map(function (account) {
            return account.id
          })
            .reduce(function (acc, oauthId) {
              // make sure, no mail account using this oauth-account exists
              return acc && !_(api.cache).chain()
                .values()
                .map(function (account) {
                  return account.mail_oauth
                })
                .any(oauthId)
                .value()
            }, true)
      }))
      const list = new OAuth.Views.ServicesListView({ collection: mailServices, model: { mailService: true } })

      if (mailServices.length === 0) {
        baton.popup.$footer.find('[data-action="add"]').show()
        // invoke wizard, there are no OAuth options to choose from
        ext.point('io.ox/mail/add-account/wizard').invoke('draw', baton.popup.$body.empty())
        // ensure modal's 'compact layout' for empty bodies gets removed
        $el.closest('.modal').removeClass('compact')
        return
      }
      // Invoke extension point for custom predefined non-oauth accounts
      ext.point('io.ox/mail/add-account/predefined').invoke('customize', this, mailServices)

      mailServices.push({
        id: 'mailwizard',
        type: 'wizard',
        displayName: gt('Add other mail account')
      })

      $el.append(
        $('<label>').text(gt('Please choose your mail account provider.')),
        list.render().$el,
        createUnifiedMailboxInput()
      )

      // this code block runs deferred, need to focus the first element, again
      a11y.getTabbable($el).first().focus()
      // ensure modal's 'compact layout' for empty bodies gets removed
      $el.closest('.modal').removeClass('compact')

      list.listenTo(list, 'select', function (service) {
        if (service.get('type') === 'wizard') return
        const account = new OAuth.Account.Model({
          serviceId: service.id,
          displayName: oauthAPI.chooseDisplayName(service)
        })

        account.enableScopes('mail').save().then(function () {
          baton.popup.busy()
          const busyMessage = $('<div class="alert-placeholder">')
          $el.append(busyMessage)
          drawBusy(busyMessage)

          api.autoconfig({
            oauth: account.id
          }).then(function (data) {
            const def = $.Deferred()
            // hopefully, login contains a valid mail address
            data.primary_address = data.login
            data.unified_inbox_enabled = $el.find('input[name="unified_inbox_enabled"]').prop('checked') === true

            validateMailaccount(data, baton.popup, def)
            return def
          }).fail(yell).always(function () {
            baton.popup?.idle?.()
          })
        })
      })

      list.listenTo(list, 'select:wizard', function () {
        baton.popup.$footer.find('[data-action="add"]').show()
        // invoke wizard
        const data = {}
        data.unified_inbox_enabled = $el.find('input[name="unified_inbox_enabled"]').prop('checked') === true
        ext.point('io.ox/mail/add-account/wizard').invoke('draw', baton.popup.$body.empty(), data)
      })
    })
  }
})

ext.point('io.ox/mail/add-account/wizard').extend({
  id: 'address',
  index: 100,
  draw () {
    let input; const self = this
    this.append(
      $('<div class="form-group">').append(
        $('<label for="add-mail-account-address">').text(gt('Your mail address')),
        input = $('<input id="add-mail-account-address" type="text" class="form-control add-mail-account-address" autocomplete="section-addAccount username">')
      )
    )

    input.on('change', function () {
      const alert = self.find('.alert')
      if (alert.length && alert.attr('errorAttributes').indexOf('address') !== -1) {
        alert.remove()
      }
    })
  }
})

ext.point('io.ox/mail/add-account/wizard').extend({
  id: 'password',
  index: 200,
  draw () {
    let input; const self = this
    this.append(
      $('<div class="form-group">').append(
        $('<label for="add-mail-account-password">').text(gt('Your password')),
        input = $('<input id="add-mail-account-password" type="password" class="form-control add-mail-account-password" autocomplete="section-addAccount new-password">')
      )
    )

    input.on('change', function () {
      const alert = self.find('.alert')
      if (alert.length && alert.attr('errorAttributes').indexOf('password') !== -1) {
        alert.remove()
      }
    })
  }
})

ext.point('io.ox/mail/add-account/wizard').extend({
  id: 'security-hint',
  index: 300,
  draw () {
    if (window.location.protocol !== 'https:') return
    this.append($('<div class="help-block">').text(gt('Your credentials will be sent over a secure connection only')))
    if (!mailSettings.get('features/allowExternalSMTP', true)) {
      this.append($('<div class="smtp-disabled help-block">').text(
        gt('External mail accounts are read-only')
      ))
    }
  }
})

ext.point('io.ox/mail/add-account/wizard').extend({
  id: 'unified-mail',
  index: 400,
  draw (data) {
    this.append(createUnifiedMailboxInput(data))
  }
})

ext.point('io.ox/mail/add-account/wizard').extend({
  id: 'feedback',
  index: 1000000000000,
  draw () {
    this.append(
      $('<div class="alert-placeholder">')
    )
  }
})

let collection
const myModel = new AccountModel({})

const createExtpointForNewAccount = function (args) {
  const node = $('<div>')
  ext.point('io.ox/settings/accounts/mail/settings/detail').invoke('draw', node, args)
}

const getAlertPlaceholder = function (popup) {
  return popup.$body.find('.alert-placeholder')
}

const drawAlert = function (alertPlaceholder, message, options) {
  options = options || {}
  alertPlaceholder.find('.alert').remove()
  alertPlaceholder.find('.busynotice').remove()
  alertPlaceholder.append(
    // errorAttributes is used to dynamically remove the error message on attribute change
    $.alert({ message, dismissible: true }).attr('errorAttributes', options.errorAttributes || '').one('click', '.close', function () {
      alertPlaceholder.empty()
    })
  )
}

const drawBusy = function (alertPlaceholder) {
  alertPlaceholder.find('.notice').remove()
  alertPlaceholder.find('.alert').remove()
  alertPlaceholder.append(
    $('<div>').addClass('busynotice').text(gt('Trying to auto-configure your mail account'))
      .addClass('notice')
      .append($('<div>').addClass('busy_pic')
      )
  )
}

const drawMessageWarning = function (alertPlaceholder, message) {
  alertPlaceholder.find('.notice').remove()
  alertPlaceholder.find('.alert').remove()
  alertPlaceholder.append(
    $('<div>').addClass('alert alert-danger').text(message)
  )
}

const validateMailaccount = function (data, popup, def, options) {
  const node = popup.$body.find('input[name="unified_inbox_enabled"]')

  if (node.length > 0 && node.prop('checked')) {
    data.unified_inbox_enabled = true
  }
  myModel.validationCheck(data, { ignoreInvalidTransport: true }).then(
    function success (response, responseobject) {
      if (response === true) {
        myModel.save(data).then(
          function saveSuccess (response) {
            if (response.error_id) {
              popup.close()
              failDialog(response.error)
            } else {
              popup.close()
              if (collection) collection.add([response])
              successDialog()
              // update oauth scope to keep settings account collection in sync
              if (response.mail_oauth !== undefined) {
                import('@/io.ox/oauth/keychain').then(async function ({ getAPI }) {
                  const api = await getAPI()
                  const acc = api.accounts.get(response.mail_oauth)
                  if (acc) acc.fetch()
                })
              }
              def.resolve(response)
            }
          },
          function saveFail (response) {
            popup.close()
            failDialog(response.error)
            // error is already shown to the user, don't yell
            response.handled = true
            def.reject(response)
          }
        )
      } else if (options && options.onValidationError) {
        options.onValidationError(response, responseobject)
      } else {
        // this will not work if called from the "add account" autoconfig part, in this case
        // the callback from the options will be called (see above)
        const message = responseobject.error ? responseobject.error : gt('There was no suitable server found for this mail/password combination')
        drawAlert(getAlertPlaceholder(popup), message, { errorAttributes: 'address password' })
        popup.idle()
        popup.getBody().find('a.close').focus()
      }
    },
    function fail () {
      const message = gt('Failed to connect.')
      drawAlert(getAlertPlaceholder(popup), message)
      popup.idle()
    }
  )
}

const configureManuallyDialog = function (args, newMailaddress) {
  new ModalDialog({ width: 400, title: gt('Error') })
    .addCancelButton()
    .addButton({ action: 'manual', label: gt('Configure manually') })
    .on('manual', function () {
      const data = {}
      data.primary_address = newMailaddress
      if (args) {
        args.data = data
        createExtpointForNewAccount(args)
      }
    })
    .open()
    .$body.text(gt('Auto-configuration failed. Do you want to configure your account manually?'))
}

const autoConfigureAccount = function (opt) {
  const args = opt.args
  const dialog = opt.dialog
  const email = opt.email
  const password = opt.password
  const def = opt.def
  const enforceSecureConnection = opt.enforceSecureConnection

  api.autoconfig({
    email,
    password,
    force_secure: !!enforceSecureConnection
  })
    .done(function (data) {
      if (data.login) {
        data.primary_address = email
        data.password = password
        // make sure not to set the SMTP credentials
        delete data.transport_login
        delete data.transport_password

        validateMailaccount(data, dialog, def, {
          onValidationError (state, error) {
            if (error) {
              if (error.code === 'MSG-0091') {
              // typical error "wrong credentials", let the user try again without
              // going to the manual configuration
                dialog.idle()
                yell('error', gt('The provided password for the email address %1$s is incorrect', email))
              } else {
                configureManuallyDialog(args, email)
                dialog.close()
                def.reject()
              }
            }
          }
        })
      } else if (enforceSecureConnection) {
        new ModalDialog({ async: true, width: 400, title: gt('Warning') })
          .addCancelButton()
          .addButton({ action: 'proceed', label: gt('Ignore Warnings') })
          .on('proceed', function () {
            // proceed without tls/ssl
            opt.enforceSecureConnection = false
            opt.dialog = this
            autoConfigureAccount(opt)
          })
          .on('cancel', function () {
            def.reject()
          })
          .open()
          .$body.append(gt('Cannot establish secure connection. Do you want to proceed anyway?'))

        dialog.close()
      } else {
        configureManuallyDialog(args, email)
        dialog.close()
        def.reject()
      }
    })
    .fail(function () {
      configureManuallyDialog(args, email)
      dialog.close()
      def.reject()
    })
}

const mailAutoconfigDialog = function (args, opt) {
  const def = $.Deferred()
  const baton = ext.Baton({})
  if (opt) {
    collection = opt.collection ? opt.collection : collection
  }

  new ModalDialog({
    model: new Backbone.Model(),
    title: gt('Add mail account'),
    enter: 'add',
    help: 'ox.appsuite.user.sect.email.accounts.html',
    async: true
  })
    .build(function () {
      baton.popup = this
      // invoke extensions
      ext.point('io.ox/mail/add-account/preselect').invoke('draw', this.$body, baton)
    })
    .addCancelButton()
    .addButton({ label: gt('Add'), action: 'add' })
    .on('add', function () {
      const alertPlaceholder = this.$body.find('.alert-placeholder')
      const newMailaddress = this.$body.find('.add-mail-account-address').val()
      const newPassword = this.$body.find('.add-mail-account-password').val()

      if (myModel.isMailAddress(newMailaddress) === undefined) {
        this.busy()
        autoConfigureAccount({
          args,
          email: newMailaddress,
          password: newPassword,
          dialog: this,
          def,
          enforceSecureConnection: true
        })
      } else {
        const message = gt('This is not a valid mail address')
        drawAlert(alertPlaceholder, message, { errorAttributes: 'address' })
        this.$body.find('.add-mail-account-password').focus()
        this.idle()
      }
    })
    .on('open', function () {
      this.$footer.find('[data-action="add"]').hide()
    })
    .open()

  return def
}

const successDialog = function () {
  yell('success', gt('Account added successfully'))
}

const failDialog = function (message) {
  const alertPlaceholder = $('<div>')

  new ModalDialog({
    title: gt('Error'),
    width: 400,
    async: true
  })
    .addButton({ label: gt('Close'), action: 'cancel' })
    .build(function () {
      this.$body.append(alertPlaceholder)
      this.$footer.find('.btn').addClass('closebutton')
      drawMessageWarning(alertPlaceholder, message)
    })
    .open()
}

export default {
  mailAutoconfigDialog
}
