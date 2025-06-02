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
import moment from '@open-xchange/moment'

import ModalDialog from '@/io.ox/backbone/views/modal'
import DisposableView from '@/io.ox/backbone/views/disposable'
import ext from '@/io.ox/core/extensions'
import miniViews from '@/io.ox/backbone/mini-views'
import yell from '@/io.ox/core/yell'
import * as settingsUtil from '@/io.ox/core/settings/util'
import * as util from '@/io.ox/core/folder/util'
import '@/io.ox/files/share/style.scss'

import gt from 'gettext'

let INDEX = 0
const POINT_SETTINGS = 'io.ox/files/share/share-settings'

/**
 * Extension point for public link title text
 */
ext.point(POINT_SETTINGS + '/settings-public-link').extend({
  id: 'title',
  index: INDEX += 100,
  draw () {
    this.append(
      `<h2>${gt('Link options')}</h2>`
    )
  }
})

/**
 * Extension point for public link expires dropdown
 */
ext.point(POINT_SETTINGS + '/settings-public-link').extend({
  id: 'temporary',
  index: INDEX += 100,
  draw (baton) {
    const dataId = 'data-expire-date'
    const guid = _.uniqueId('form-control-label-')

    // #. options for terminal element of a sentence starts with "Expires in"
    const typeTranslations = {
      0: gt('One day'),
      1: gt('One week'),
      2: gt('One month'),
      3: gt('Three months'),
      4: gt('Six months'),
      5: gt('One year'),
      6: gt('Never')
    }

    const select = $('<select class="form-control">')
    Object.values(typeTranslations).forEach((val, key) => {
      key = parseInt(key, 10)
      const option = $('<option>').val(key).text(val)
      select.append(option)
    })

    this.append(
      $('<div>').append(
        $(`<label class="font-medium" for="${guid}">`).text(gt('Expiration')),
        $('<div>').addClass('row vertical-align-center').append(
          $('<div>').addClass('form-group col-sm-12').append(
            select.attr('id', guid)))
      )
    )

    if (!baton.view.hasPublicLink) {
      select.attr('disabled', true)
      // show no expiration date (Never) without existing link
      select.find("option[value='6']").attr('selected', 'true')
      return
    }

    baton.model.on('change:expiry_date', function (model, val) {
      if (baton.model.get('expires') !== null && baton.model.get('expires') !== '6') {
        const optionSelected = select.find('option:selected')
        optionSelected.removeAttr('selected')
        let option = select.find('option[' + dataId + ']')
        if (option.length === 0) {
          option = $('<option>')
            .attr(dataId, 'true')
          select.append($('<optgroup>').append(option))
        }

        option.val(baton.model.get('expiry_date')).attr('selected', 'true').text(moment(val).format('L'))
        setTimeout(function () {
          select.val(baton.model.get('expiry_date'))
          model.set('temporary', true)
        }, 10)
      } else {
        // Expired option is Never
        model.set('temporary', false)
        model.set('expiry_date', null)
        select.find('.option:selected').text(typeTranslations[6])
      }
    })

    baton.model.on('change:expires', function (model) {
      if (baton.model.get('expires') !== null) {
        model.set({
          temporary: true,
          expiry_date: model.getExpiryDate()
        })
      }
    })

    if (baton.model.get('expiry_date')) {
      baton.model.set('expires', null)
    }

    if (baton.model.get('expiry_date')) {
      const option = $('<option>')
        .val(baton.model.get('expiry_date'))
        .attr('selected', 'selected')
        .attr(dataId, 'true')
        .text(moment(baton.model.get('expiry_date')).format('L'))
      select.append($('<optgroup>').append(option))
      // select.find('.option:selected').text(new moment(baton.model.get('expiry_date')).format('L'));
    } else {
      select.find('option[value="6"]').attr('selected', 'true')
    }

    select.on('change', function (e) {
      baton.model.set('expires', e.target.value)
    })
  }
})

/**
 * Extension point for public link password
 */
ext.point(POINT_SETTINGS + '/settings-public-link').extend({
  id: 'password',
  index: INDEX += 100,
  draw (baton) {
    const guid = _.uniqueId('form-control-label-')
    const pwToggleNode = new miniViews.PasswordViewToggle({ name: 'password', model: baton.model, autocomplete: false }).render().$el
    pwToggleNode.find('input')
      // see bug 49639
      .attr({ id: guid, placeholder: gt('Password') })
      .removeAttr('name')
    pwToggleNode.find('input, button').prop('disabled', !baton.view.hasPublicLink)

    this.append(
      $('<div class="form-group">').append(
        $(`<label class="control-label font-medium" for="${guid}">`).text(gt('Password (optional)')),
        pwToggleNode
      )
    )
  }
})

/**
 * Extension point for public link allowance of subfolder access
 *
 * see SoftwareChange Request SCR-97: [https://jira.open-xchange.com/browse/SCR-97]
 */
ext.point(POINT_SETTINGS + '/settings-public-link').extend({
  id: 'includeSubfolders',
  index: INDEX += 100,
  draw (baton) {
    const isDrive = _(baton.model.get('files')).every(function (model) {
      return !model.isFolder() || util.is('drive', model.attributes)
    })
    if (!isDrive || !baton.model.attributes || !baton.model.attributes.files) {
      // needed so dirty check works correctly
      baton.model.originalAttributes.includeSubfolders = false
      return baton.model.set('includeSubfolders', false, { silent: true })
    }
    let onlyFiles = true
    _.each(baton.model.attributes.files, function (model) {
      if (model.isFolder()) {
        onlyFiles = false
      }
    })
    if (onlyFiles) return

    this.append($('<div>').addClass(_.device('smartphone') ? '' : 'cascade').append(
      settingsUtil.checkbox('includeSubfolders', gt('Share with subfolders'), baton.model).addClass((!baton.view.hasPublicLink) ? 'disabled' : '').on('change', function (e) {
        const input = e.originalEvent.srcElement
        baton.model.set('includeSubfolders', input.checked)
      })
    ))

    baton.model.once('change', function (model) {
      const isNewLink = model.get('is_new')
      let state = false

      if (isNewLink === true) {
        state = isNewLink
        model.set('includeSubfolders', state)
      } else {
        state = model.get('includeSubfolders')
      }
    })

    if (!baton.view.hasPublicLink) {
      this.find('input').prop('checked', baton.view.hasPublicLink).attr('disabled', 'disabled')
    }
  }
})

/**
 * Extension point for invite people options title text
 */
ext.point(POINT_SETTINGS + '/settings-invite-people').extend({
  id: 'invite-options-title',
  index: INDEX += 100,
  draw () {
    this.append(
      `<h2>${gt('Invite options')}</h2>`
    )
  }
})

/**
 * Extension point for invite people options send notification email
 */
ext.point(POINT_SETTINGS + '/settings-invite-people').extend({
  id: 'inviteptions-send-email',
  index: INDEX += 100,
  draw (baton) {
    this.append(
      $('<div>').addClass(_.device('smartphone') ? '' : 'cascade').append(
        settingsUtil.checkbox('sendNotifications', gt('Send notification by email'), baton.dialogConfig).on('change', function (e) {
          const input = e.originalEvent.srcElement
          baton.dialogConfig.set('byHand', input.checked)
        }).prop('disabled', baton.dialogConfig.get('disabled'))
      )
    )
    this.find('[name="sendNotifications"]').prop('disabled', baton.dialogConfig.get('disabled'))
  }
})

/**
 * extension point for invite people options include subfolder
 */
ext.point(POINT_SETTINGS + '/settings-invite-people').extend({
  id: 'inviteptions-cascade-permissions',
  index: INDEX += 100,
  draw (baton) {
    if (baton.view.applyToSubFolder) {
      this.append(
        $('<div class="form-group">').addClass(_.device('smartphone') ? '' : 'cascade').append(
          settingsUtil.checkbox('cascadePermissions', gt('Apply to all subfolders'), baton.dialogConfig).on('change', function (e) {
            const input = e.originalEvent.srcElement
            baton.dialogConfig.set('cascadePermissions', input.checked)
          })
        )
      )
    }
  }
})

/**
 * main view
 */
export const ShareSettingsView = DisposableView.extend({

  className: 'share-wizard',
  hasLinkSupport: true,
  supportsPersonalShares: true,
  applyToSubFolder: false,
  isFolder: false,

  initialize (options) {
    this.model = options.model.model
    this.hasPublicLink = options.model.hasPublicLink()
    this.hasLinkSupport = options.hasLinkSupport
    this.supportsPersonalShares = options.supportsPersonalShares
    this.applyToSubFolder = options.applyToSubFolder
    this.baton = ext.Baton({ model: this.model, view: this, dialogConfig: options.dialogConfig })

    this.listenTo(this.model, 'invalid', function (model, error) {
      yell('error', error)
    })
  },

  render () {
    this.$el.addClass(this.model.get('type'))
    if (this.hasLinkSupport) {
      ext.point(POINT_SETTINGS + '/settings-public-link').invoke('draw', this.$el, this.baton)
    }
    if (this.supportsPersonalShares) {
      ext.point(POINT_SETTINGS + '/settings-invite-people').invoke('draw', this.$el, this.baton)
    }
    return this
  }
})

export const showSettingsDialog = function (shareSettingsView) {
  const dialog = new ModalDialog({
    async: true,
    title: gt('Sharing options'),
    width: 350,
    smartphoneInputFocus: true
  })
    .addCancelButton()
    .addButton({ label: gt('Save'), action: 'save' })

  dialog.$body.addClass('share-options').append(
    shareSettingsView.render().$el
  )

  dialog
    .on('save', () => dialog.close())
    .open()
}

export default {
  ShareSettingsView,
  showSettingsDialog
}
