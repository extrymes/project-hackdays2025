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
import _ from '@/underscore'
import 'backbone-validation'

import accountAPI from '@/io.ox/core/api/account'
import yell from '@/io.ox/core/yell'
import ext from '@/io.ox/core/extensions'
import mini from '@/io.ox/backbone/mini-views'
import picker from '@/io.ox/core/folder/picker'
import capabilities from '@/io.ox/core/capabilities'
import * as util from '@/io.ox/core/settings/util'
import { settings } from '@/io.ox/core/settings'

import { settings as mailSettings } from '@/io.ox/mail/settings'
import gt from 'gettext'

const POINT = 'io.ox/settings/accounts/mail/settings/detail'
let model

let optionsServerType = [
  { label: 'IMAP', value: 'imap' },
  { label: 'POP3', value: 'pop3' }
]

const serverTypePorts = {
  imap: { common: '143', secure: '993' },
  pop3: { common: '110', secure: '995' }
}

const optionsRefreshRatePop = [
  { label: '3', value: '3' },
  { label: '5', value: '5' },
  { label: '10', value: '10' },
  { label: '15', value: '15' },
  { label: '30', value: '30' },
  { label: '60', value: '60' },
  { label: '360', value: '360' }
]

const optionsAuthType = [
  // #. Auth type. Short for "Use same credentials as incoming mail server"
  { value: 'mail', label: gt('As incoming mail server') },
  // #. Auth type. Use separate username and password
  { value: 'custom', label: gt('Use separate username and password') },
  // #. Auth type. None. No authentication
  { value: 'none', label: gt('None') }
]

const optionsConnectionSecurity = [
  // #. Connection security. None.
  { value: 'none', label: gt('None') },
  // #. Connection security. StartTLS.
  { value: 'starttls', label: gt('StartTLS') },
  // #. Connection security. SSL/TLS.
  { value: 'ssl', label: gt('SSL/TLS') }
]

const portDefaults = {
  mail_port: '143',
  transport_port: '587'
}

// conditional defaults
const defaults = {
  pop3: {
    pop3_refresh_rate: optionsRefreshRatePop[0].value,
    pop3_delete_write_through: false,
    pop3_expunge_on_quit: false
  }
}

let originalModel

// customize mini views: suppress validate onChange (validated when user hits save)
const custom = {
  onChange () {
    this.model.set(this.name, this.$el.val(), { validate: false })
  }
}
const InputView = mini.InputView.extend(custom)
const PasswordView = mini.PasswordView.extend(custom)

const returnPortMail = function () {
  const secure = model.get('mail_secure')
  const protocol = model.get('mail_protocol') || 'imap'
  return serverTypePorts[protocol][secure ? 'secure' : 'common']
}

const is = function (aspect) {
  // multi-param OR conjunction
  if (arguments.length > 1) return _.reduce(arguments, function (memo, key) { return memo || is(key) }, false)

  switch (aspect) {
    case 'primary':
      return model.get('id') === 0
    case 'secondary':
      return model.get('secondary')
    default:
      return false
  }
}

const returnSecurityValue = function (model, ssl, starttls) {
  if (model.get(ssl)) return 'ssl'
  if (model.get(starttls)) return 'starttls'
  return 'none'
}

// validation can be skipped when only this props are changed
const novalidate = ['personal', 'name', 'unified_inbox_enabled',
  'archive_fullname', 'confirmed-ham_fullname', 'confirmed-spam_fullname', 'drafts_fullname', 'sent_fullname', 'spam_fullname', 'trash_fullname']

const AccountDetailView = Backbone.View.extend({
  tagName: 'div',
  initialize () {
    model = this.model
    this.prevPersonal = this.model.get('personal')
    // if the server has no pop3 support and this account is a new one, remove the pop3 option from the selection box
    // we leave it in with existing accounts to display them correctly even if they have pop3 protocol (we deny protocol changing when editing accounts anyway)
    if (!capabilities.has('pop3') && !this.model.get('id')) {
      optionsServerType = [{ label: 'IMAP', value: 'imap' }]
    }

    // check if login and mailaddress are synced
    this.inSync = false

    // use mail display name?
    const personal = this.model.get('personal')
    if (!personal) {
      accountAPI.getDefaultDisplayName().then(defaultDisplayName => {
        this.model.set('personal', defaultDisplayName)
      })
    } else if (personal === ' ') {
      this.model.set('personal', '')
    }

    // create model for selections
    this.selectionModel = new Backbone.Model({
      mail_secure: returnSecurityValue(this.model, 'mail_secure', 'mail_starttls'),
      transport_secure: returnSecurityValue(this.model, 'transport_secure', 'transport_starttls')
    })
    this.listenTo(this.selectionModel, 'change:mail_secure', this.onMailSecureChange.bind(this))
    this.listenTo(this.selectionModel, 'change:transport_secure', this.onTransportSecureChange.bind(this))

    // store original model to determine changes
    originalModel = _.copy(this.model.toJSON(), true)
    // forceUpdate needed otherwise model is always valid even if inputfields contain wrong values
    Backbone.Validation.bind(this, { selector: 'name', forceUpdate: true })
  },
  render () {
    this.$el.empty().append(
      $('<div class="settings-detail-pane">').append(
        $('<div class="io-ox-account-settings">')
      )
    )

    ext.point(POINT + '/pane').invoke('draw', this.$el.find('.io-ox-account-settings'), this)

    const pop3nodes = this.$el.find('.form-group.pop3')
    const dropdown = this.$el.find('#mail_protocol')

    // check if pop3 refresh rate needs to be displayed
    if (this.model.get('mail_protocol') !== 'pop3') {
      pop3nodes.hide()
    }

    // no need to edit it with only one option or when editing an account(causes server errors)
    if (this.model.get('id') || !capabilities.has('pop3')) {
      dropdown.prop('disabled', true)
    }

    // setting port defaults
    if (this.model.get('id') === undefined) {
      _.each(portDefaults, function (value, key) {
        model.set(key, value)
      })
    }

    function syncLogin (model, value) {
      model.set('login', value, { validate: true })
    }

    // check for primary account
    if (!is('primary', 'secondary')) {
      // refresh rate field needs to be toggled
      this.model.on('change:mail_protocol', function (model, value) {
        if (value !== 'pop3') {
          pop3nodes.hide()
        } else {
          // conditional defaults
          _.each(defaults.pop3, function (value, key) {
            if (!model.has(key)) {
              model.set(key, value)
            }
          })
          pop3nodes.show()
        }
      })

      // login for server should be email address by default;
      if (this.model.get('login') === undefined && this.model.get('primary_address') !== '') {
        this.model.set('login', this.model.get('primary_address'), { validate: true })
      }

      // if login and email address are the same change login if email address changes
      if (this.model.get('primary_address') === this.model.get('login') && !this.inSync) {
        this.model.on('change:primary_address', syncLogin)
        this.inSync = true
      }

      // react to login change
      this.model.on('change:login', function (model, value) {
        if (value === model.get('primary_address')) {
          // no need to sync if its already synced...would cause multiple events to be triggered
          if (!this.inSync) {
            this.model.on('change:primary_address', syncLogin)
            this.inSync = true
          }
        } else {
          this.model.off('change:primary_address', syncLogin)
          this.inSync = false
        }
      }, this)
    } else {
      // primary account does not allow editing besides display name and unified mail
      this.$el.find('input, select').not('#personal, #name, [name="unified_inbox_enabled"], [name="reply_to"]').prop('disabled', true)
    }

    const isMailOauth = _.isNumber(model.get('mail_oauth')) && model.get('mail_oauth') > -1
    const isTransportOauth = _.isNumber(model.get('transport_oauth')) && model.get('transport_oauth') > -1

    // disable account name if editRealName setting is set to 'false'
    if (!mailSettings.get('editRealName', true)) this.$el.find('#personal').prop('disabled', true)

    // disable E-mail address if any oauth is used
    if (isMailOauth || isTransportOauth) this.$el.find('#primary_address').prop('disabled', true)

    if (isMailOauth) this.$el.find('.data_incoming').hide()
    if (isTransportOauth) this.$el.find('.data_outgoing').hide()

    return this
  },

  events: {
    save: 'onSave',
    'click .folderselect': 'onFolderSelect',
    'change [name="mail_protocol"]': 'onMailProtocolChange'
  },

  onMailProtocolChange () {
    model.set('mail_port', returnPortMail())
  },

  onMailSecureChange () {
    model.set('mail_secure', this.selectionModel.get('mail_secure') === 'ssl')
    model.set('mail_starttls', this.selectionModel.get('mail_secure') === 'starttls')
    model.set('mail_port', returnPortMail())
  },

  onTransportSecureChange () {
    model.set('transport_secure', this.selectionModel.get('transport_secure') === 'ssl')
    model.set('transport_starttls', this.selectionModel.get('transport_secure') === 'starttls')

    const value = this.selectionModel.get('transport_secure') === 'ssl' ? '465' : '587'
    this.model.set('transport_port', value)
  },

  onSave () {
    const self = this
    const differences = returnDifferences(this.model.attributes, originalModel)

    function returnDifferences (a, b) {
      const array = []
      _.each(a, function (single, key) {
        if (b[key] !== single) {
          array.push(key)
        }
      })
      return array
    }

    function needToValidate (differences) {
      // validate is bound to this capability (see bug 36849)
      if (!capabilities.has('multiple_mail_accounts')) return false
      // relevant property changes for validation?
      return !!_.difference(differences, novalidate).length
    }

    async function saveAccount () {
      // revert default display name
      const personal = self.model.get('personal')
      if (personal === await accountAPI.getDefaultDisplayName()) {
        // empty!
        self.model.set('personal', null, { silent: true })
      } else if ($.trim(personal) === '') {
        // yep, one space!
        self.model.set('personal', ' ', { silent: true })
      }

      // prevent overwriting 'personal' if user forces it by removing disabled attribute from input field
      if (!mailSettings.get('editRealName', true)) self.model.set('personal', self.prevPersonal)

      return self.model.save().then(
        function success (data) {
          self.dialog.close()
          if (self.collection) {
            self.collection.add([data])
          }
          if (originalModel.id === undefined && self.model.isNew()) {
            self.success()
          } else {
            yell('success', gt('Account updated'))
          }
        },
        function fail (data) {
          // string comparison is ugly, maybe backend has a translated version of this
          if (data.code === 'ACC-0004' && data.error_params[0].substring(8, 13) === 'login') {
            yell('error', gt('Username must not be empty.'))
          } else if (data.code === 'SVL-0002') {
            yell('error',
              // #. %1$s the missing request parameter
              // #, c-format
              gt('Please enter the following data: %1$s', data.error_params[0]))
          } else {
            yell('error', data.error)
          }
          self.dialog.idle()
        }
      )
    }
    if (needToValidate(differences)) {
      this.model.validationCheck().done(function (response, error) {
        // an undefined response variable implies an error (f.e. category 'USER_INPUT')
        const hasError = _.isUndefined(response) || (error ? [].concat(error.categories || []).indexOf('ERROR') > -1 : false)
        const hasWarning = error && error.warnings

        if (hasError) {
          // on error yell
          yell(error)
          self.dialog.idle()
        } else if (hasWarning) {
          // on warning ask user
          import('@/io.ox/backbone/views/modal').then(function ({ default: ModalDialog }) {
            const messages = _.map([].concat(error.warnings), function (warn) {
              return $('<div class="alert alert-warning" style="margin: 10px">').text(warn.error)
            })
            self.dialog.pause()
            const dialog = new ModalDialog({ title: gt('Warnings') })
              .build(function () { this.$body.append(messages) })
              .addCancelButton()
              .addButton({ label: gt('Ignore Warnings'), action: 'proceed', placement: 'left', className: 'btn-default' })
              .on('action', function (action) {
                self.dialog.resume()
                if (action === 'proceed') {
                  saveAccount()
                } else if (action === 'inspect') {
                  import('@/io.ox/settings/security/certificates/settings/utils').then(function (certUtils) {
                    certUtils.openExamineDialog(error, self.dialog)
                  })
                } else {
                  self.dialog.idle()
                }
              })

            if (/SSL/.test(error.code) && settings.get('security/manageCertificates')) dialog.addButton({ label: gt('Inspect certificate'), action: 'inspect' })

            dialog.open()
          })
        } else {
          // on success save
          saveAccount()
        }
      })
    } else {
      saveAccount()
    }
  },

  onFolderSelect (e) {
    this.dialog.pause()

    const accountId = 'default' + this.model.get('id')
    const property = $(e.currentTarget).attr('data-property')
    const id = this.model.get(property)
    const self = this

    picker({
      async: true,
      context: 'account',
      done (target, dialog) {
        self.model.set(property, target, { validate: true })
        dialog.close()
      },
      folder: id,
      module: 'mail',
      realNames: true,
      root: accountId,
      // #. 'Select' as button text to confirm the selection of a chosen folder via a picker dialog.
      button: gt('Select')
    })
  }
})

// utility functions
function group () {
  const args = _(arguments).toArray()
  return $('<div class="form-group">').append(args)
}

function label (id, text) {
  return $('<label class="control-label col-sm-4">').attr('for', id).text(text)
}

function div () {
  const args = _(arguments).toArray()
  return $('<div class="col-sm-7">').append(args)
}

function checkbox (id, text, model) {
  return $('<div class="col-sm-offset-4 col-sm-7">').append(
    util.checkbox(id, text, model)
  )
}

ext.point(POINT + '/pane').extend({
  index: 100,
  id: 'header',
  draw (view) {
    //
    // Incoming (IMAP/POP3)
    //

    // OXUIB-2096: Hide 'Connection security' settings if primary or secondary account or if set to false
    const showMailSecurity = !is('primary', 'secondary') || model.get('mail_secure')
    const showTransportSecurity = !is('primary', 'secondary') || model.get('transport_secure')

    const serverSettingsIn = $('<fieldset class="data_incoming">').append(
      $('<legend class="sectiontitle">').text(gt('Incoming server')),
      $('<form class="form-horizontal">').append(
        // server type
        group(
          label('mail_protocol', gt('Server type')),
          $('<div class="col-sm-3">').append(
            new mini.SelectView({ list: optionsServerType, model, id: 'mail_protocol' }).render().$el
          )
        ),
        // mail_server
        group(
          label('mail_server', gt('Server name')),
          div(
            new InputView({ model, id: 'mail_server', mandatory: !is('primary', 'secondary') }).render().$el)
        ),
        // secure
        showMailSecurity && group(
          label('mail_secure', gt('Connection security')),
          $('<div class="col-sm-3">').append(
            new mini.SelectView({ list: optionsConnectionSecurity, model: view.selectionModel, id: 'mail_secure' }).render().$el
          )
        ),
        // mail_port
        group(
          label('mail_port', gt('Server port')),
          $('<div class="col-sm-3">').append(
            new InputView({ model, id: 'mail_port', mandatory: !is('primary', 'secondary') }).render().$el
          )
        ),
        // login
        group(
          label('login', gt('Username')),
          div(
            new InputView({ model, id: 'login', mandatory: !is('primary', 'secondary') }).render().$el
          )
        ),
        // password
        group(
          label('password', gt('Password')),
          div(
            new PasswordView({ model, id: 'password', mandatory: model.get('id') === undefined, autocomplete: false }).render().$el
          )
        ),
        // refresh rate (pop3 only)
        group(
          label('pop3_refresh_rate', gt('Refresh rate in minutes')),
          div(
            new mini.SelectView({ list: optionsRefreshRatePop, model, id: 'pop3_refresh_rate' }).render().$el
          )
        )
          .addClass('pop3'),
        // expunge (pop3 only)
        group(
          checkbox('pop3_expunge_on_quit', gt('Remove copy from server after retrieving a message'), model)
        )
          .addClass('pop3'),
        // delete write-through (pop3)
        group(
          checkbox('pop3_delete_write_through', gt('Deleting messages on local storage also deletes them on server'), model)
        )
          .addClass('pop3')
      )
    )

    const serverSettingsOut = $('<fieldset class="data_outgoing">').append(
      $('<legend class="sectiontitle">').text(gt('Outgoing server (SMTP)')),
      $('<form class="form-horizontal">').append(
        // server
        group(
          label('transport_server', gt('Server name')),
          div(
            new InputView({ model, id: 'transport_server', mandatory: !is('primary', 'secondary') }).render().$el
          )
        ),
        // secure
        showTransportSecurity && group(
          label('transport_secure', gt('Connection security')),
          $('<div class="col-sm-3">').append(
            new mini.SelectView({ list: optionsConnectionSecurity, model: view.selectionModel, id: 'transport_secure' }).render().$el
          )
        ),
        // port
        group(
          label('transport_port', gt('Server port')),
          $('<div class="col-sm-3">').append(
            new InputView({ model, id: 'transport_port', mandatory: !is('primary', 'secondary') }).render().$el
          )
        ),
        // Auth type
        group(
          label('transport_auth', gt('Authentication')),
          div(
            new mini.SelectView({ list: optionsAuthType, model, id: 'transport_auth' }).render().$el
          )
        ),
        // login
        group(
          label('transport_login', gt('Username')),
          div(
            new InputView({ model, id: 'transport_login' }).render().$el
          )
        ),
        // password
        group(
          label('transport_password', gt('Password')),
          div(
            new PasswordView({ model, id: 'transport_password', autocomplete: false }).render().$el
          )
        )
      )
    )

    const folderLabels = {
      // #. Sent folder
      sent: gt.pgettext('folder', 'Sent messages'),
      // #. Trash folder
      trash: gt.pgettext('folder', 'Deleted messages'),
      // #. Drafts folder
      drafts: gt.pgettext('folder', 'Drafts'),
      // #. Spam folder
      spam: gt.pgettext('folder', 'Spam'),
      // #. Archive folder
      archive: gt.pgettext('folder', 'Archive')
    }

    const serverSettingsFolder = $('<fieldset class="data_folders">').append(
      $('<legend class="sectiontitle">').text(gt('Standard folders')),
      $('<form class="form-horizontal">').append(
        // add four input fields
        'sent trash drafts spam archive'.split(' ')
          .filter(folder => !(folder === 'archive' && !capabilities.has('archive_emails'))) // skip archive if capability is missing
          .map(function (folder) {
            // offer folder selector if id is not undefined (i.e. while creating a new account)
            const text = folderLabels[folder]
            const id = model.get('id')
            const enabled = id !== undefined && !is('secondary')

            folder = folder + '_fullname'

            return group(
              label(folder, text),
              $('<div class="col-sm-7">').append(enabled
              // show controls
                ? $('<div class="input-group folderselect enabled">').attr('data-property', folder).append(
                  new InputView({ model, id: folder })
                    .on('update', function (node) {
                      if (node && _.isString(this.model.get(folder))) node.val(this.model.get(folder).replace(/^default\d+\D/, ''))
                    }).render().$el.prop('disabled', true),
                  $('<span class="input-group-btn">').append(
                    $('<button type="button" class="btn btn-default">').text(gt('Select'))
                  )
                )
              // just show path
                : $('<input type="text" class="form-control" disabled="disabled">')
                  .val($.trim(model.get(folder)).replace(/^default\d+\D/, ''))
              )
            )
          })
      )
    )

    this.append(
      $('<fieldset class="data_account">').append(
        $('<legend class="sectiontitle">').text(gt('Account settings')),
        $('<form class="form-horizontal">').append(
          // account name
          group(
            label('name', gt('Account name')),
            div(
              new InputView({ model, id: 'name', mandatory: true }).render().$el
            )
          ),
          // personal
          group(
            label('personal', gt('Your name')),
            div(
              new InputView({ model, id: 'personal' }).render().$el
            )
          ),
          // primary address
          group(
            label('primary_address', gt('Email address')),
            div(
              new InputView({ model, id: 'primary_address', mandatory: true }).render().$el
            )
          ),
          group(
            label('reply_to', gt('Reply To')),
            div(
              new InputView({ model, id: 'reply_to', mandatory: false }).render().$el
            )
          ),

          capabilities.has('!multiple_mail_accounts') || capabilities.has('!unified-mailbox')
            ? $()
            : group(
              checkbox('unified_inbox_enabled', gt('Use unified mail for this account'), model)
            )
        )
      )
    )

    function adoptCredentials () {
      if (this.model.get('transport_auth') === 'mail') {
        this.model.set({
          transport_login: model.get('login'),
          transport_password: null
        })
      }
    }

    function changeTransportAuth () {
      const type = this.model.get('transport_auth')
      this.$el.find('#transport_login, #transport_password').prop('disabled', type !== 'custom').attr('data-state', 'manual')
      if (type === 'mail') {
        adoptCredentials.call(this)
      } else if (this.model.previous('transport_auth') === 'mail') {
        // only reset values if switched from 'mail' (Bug #46346)
        this.model.set({ transport_login: '', transport_password: '' })
      }
    }

    if (!model.isHidden()) {
      this.append(serverSettingsIn)
      if (mailSettings.get('features/allowExternalSMTP', true)) this.append(serverSettingsOut)
      view.listenTo(model, 'change:transport_auth', changeTransportAuth)
      view.listenTo(model, 'change:login', adoptCredentials)
      // TODO: is this needed?
      changeTransportAuth.call(view)
    }

    // don't show folder settings if this is a new account
    if (model.get('id') !== undefined) {
      this.append(serverSettingsFolder)
    }
  }
})

export default AccountDetailView
