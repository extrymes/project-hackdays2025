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
import Model from '@/io.ox/mail/mailfilter/autoforward/model'
import ModalView from '@/io.ox/backbone/views/modal'
import mini from '@/io.ox/backbone/mini-views'
import * as util from '@/io.ox/core/settings/util'
import ext from '@/io.ox/core/extensions'
import yell from '@/io.ox/core/yell'
import '@/io.ox/mail/mailfilter/vacationnotice/style.scss'

import gt from 'gettext'

const POINT = 'io.ox/mail/auto-forward/edit'
let INDEX = 0

function open () {
  return getData().then(openModalDialog, fail)
}

function fail (e) {
  yell('error', e.code === 'MAIL_FILTER-0015'
    ? gt('Unable to load mail filter settings.')
    : gt('Unable to load your auto forward settings. Please retry later.')
  )
  throw e
}

function openModalDialog (data) {
  return new ModalView({
    async: true,
    focus: 'input[name="active"]',
    model: data.model,
    point: POINT,
    title: gt('Auto forward'),
    help: 'ox.appsuite.user.sect.email.send.autoforward.html',
    width: 640
  })
    .inject({
      updateActive () {
        const enabled = this.model.get('active')
        this.$body.toggleClass('disabled', !enabled).find(':input').prop('disabled', !enabled)
      },
      manageSaveButton () {
        const saveButton = _.first(this.$footer.find('[data-action="save"]'))
        const field = _.first(this.$body.find('input[name="to"]'))
        const self = this

        function setStatus () {
          $(saveButton).attr('disabled', ($(field).val().trim() === '' && !self.model.get('id')) || ($(field).val().trim() === '' && self.model.get('active')))
        }

        if ($(field).val().trim() === '' && !this.model.get('active')) $(saveButton).attr('disabled', true)

        $(field).on('keyup', function () {
          setStatus()
        })

        this.model.on('change:active', function () {
          setStatus()
        })
      }
    })
    .build(function () {
      this.data = data
      this.$el.addClass('rule-dialog')
    })
    .addButton({ label: gt('Reset'), action: 'reset', className: 'btn-default pull-left' })
    .addCancelButton()
    .addButton({ label: gt('Apply changes'), action: 'save' })
    .on('open', function () {
      this.updateActive()
      this.manageSaveButton()
    })
    .on('save', function () {
      if (this.model.get('id') !== undefined && this.model.get('to') === undefined) {
        this.model.destroy().done(this.close).fail(this.idle).fail(yell)
      } else {
        this.model.save().done(this.close).fail(this.idle).fail(yell)
      }
    })
    .on('reset', function () {
      this.model.set({
        to: undefined,
        copy: false,
        stop: true,
        active: false
      })
      this.idle()
      this.updateActive()
      $('[data-action="save"]').attr('disabled', this.model.get('id') === undefined)
    })
    .open()
}

ext.point(POINT).extend(
  //
  // switch
  //
  {
    index: INDEX += 100,
    id: 'switch',
    render () {
      const switchView = new mini.SwitchView({
        name: 'active',
        model: this.model,
        label: gt('Auto forward'),
        size: 'large'
      }).render()
      switchView.$el.attr('title', gt('Enable or disable auto forward'))
      switchView.$el.find('span').addClass('sr-only')

      this.$header.prepend(switchView.$el)

      this.listenTo(this.model, 'change:active', this.updateActive)
    }
  },
  //
  // Address
  //
  {
    index: INDEX += 100,
    id: 'to',
    render () {
      this.$body.append(util.input('to', gt('Forward all incoming emails to this address'), this.model))
    }
  },
  //
  // Keep
  //
  {
    index: INDEX += 100,
    id: 'copy',
    render () {
      this.$body.append(util.checkbox('copy', gt('Keep a copy of the message'), this.model))
    }
  },
  //
  // Stop
  //
  {
    index: INDEX += 100,
    id: 'stop',
    render () {
      this.$body.append(util.checkbox('processSub', gt('Process subsequent rules'), this.model))
      this.model.on('change:processSub', e => this.trigger('updateProcessNext', e.changed.processSub))
    }
  }
)

//
// Get required data
//
function getData () {
  const model = new Model()
  return model.fetch().then(function () {
    return { model }
  })
}

export default { open }
