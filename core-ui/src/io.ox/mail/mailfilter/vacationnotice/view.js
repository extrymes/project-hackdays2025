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
import Model from '@/io.ox/mail/mailfilter/vacationnotice/model'
import api from '@/io.ox/core/api/mailfilter'
import ext from '@/io.ox/core/extensions'
import mini from '@/io.ox/backbone/mini-views'
import MiniDatePickerView from '@/io.ox/backbone/mini-views/datepicker'
import ModalView from '@/io.ox/backbone/views/modal'
import * as util from '@/io.ox/core/settings/util'
import yell from '@/io.ox/core/yell'
import userAPI from '@/io.ox/core/api/user'
import accountAPI from '@/io.ox/core/api/account'
import * as contactsUtil from '@/io.ox/contacts/util'
import '@/io.ox/mail/mailfilter/vacationnotice/style.scss'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

const POINT = 'io.ox/mail/vacation-notice/edit'
let INDEX = 0
let INDEX_RANGE = 0
let INDEX_ADV = 0

const DatePickerView = MiniDatePickerView.extend({
  // overwrite to skip validation
  updateModel () {
    this.model.set(this.attribute, this.getTimestamp(), { validate: false, fulltime: this.isFullTime() })
  }
})

function open () {
  return getData().then(openModalDialog, fail)
}

function fail (e) {
  yell('error', e.code === 'MAIL_FILTER-0015'
    ? gt('Unable to load mail filter settings.')
    : gt('Unable to load your vacation notice. Please retry later.')
  )
  throw e
}

function openModalDialog (data) {
  return new ModalView({
    async: true,
    focus: 'input[name="active"]',
    model: data.model,
    point: POINT,
    title: gt('Vacation notice'),
    help: 'ox.appsuite.user.sect.email.send.vacationnotice.html',
    width: 640
  })
    .inject({
      updateActive () {
        const enabled = this.model.get('active')
        this.$body.toggleClass('disabled', !enabled).find(':input').prop('disabled', !enabled)
        this.updateDateRange()
      },
      updateDateRange () {
        const enabled = this.model.get('active') && this.model.get('activateTimeFrame')
        const formclass = _.device('smartphone') ? '.dateinput.mobile-mode' : '.form-control'

        this.$('.date-range ' + formclass).prop('disabled', !enabled)
      },
      getAddresses () {
        let name = contactsUtil.getMailFullName(this.data.user).trim()
        const regex = /^[A-Za-z0-9 ]+$/
        const needsQuoting = !regex.test(name)
        if (needsQuoting) name = '"' + name + '"'

        return [].concat(
          // default sender
          { value: 'default', label: gt('Default sender') },
          // aliases
          _(this.data.aliases).map(function (address) {
            address = name ? name + ' <' + address + '>' : address
            return { value: address, label: address }
          })
        )
      },
      getDurationString () {
        const duration = this.model.getDuration()
        return duration > 0 ? gt.ngettext('%1$d day', '%1$d days', duration, duration) : ''
      },
      getTimeFrameError () {
        const error = this.model.validate()
        return (error && error.dateUntil) || ''
      },
      reflectValidity () {
        const error = (this.model.validationError || {}).dateUntil
        const inactive = !this.model.get('active')
        this.$('.error-message > .help-block').text(error).parent().toggle(!!error)
        this.$('[name="dateUntil"]').parent().toggleClass('has-error', !!error)
        this.$('.btn-primary[data-action="save"]').prop('disabled', !!error)
        this.$('[name="subject"]').prop('disabled', !!error || inactive)
        this.$('[name="text"]').prop('disabled', !!error || inactive)
      }
    })
    .build(function () {
      this.data = _(data).pick('aliases', 'config', 'user', 'primary')
      this.$el.addClass('rule-dialog')
    })
    .addCancelButton()
    .addButton({ label: gt('Apply changes'), action: 'save' })
    .on('open', function () {
      this.updateActive()
    })
    .on('save', function () {
      this.model.save().done(this.close).fail(this.idle).fail(yell)
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
        size: _.device('smartphone') ? 'small' : 'large',
        label: gt('Vacation notice')
      }).render()
      switchView.$el.attr('title', gt('Enable or disable vacation notice'))
      switchView.$el.find('span').addClass('sr-only')

      this.$header.prepend(switchView.$el)

      this.listenTo(this.model, 'change:active', this.updateActive)
    }
  },
  //
  // Time range
  //
  {
    index: INDEX += 100,
    id: 'range',
    render (baton) {
      // supports date?
      if (!_(this.data.config.tests).findWhere({ id: 'currentdate' })) return
      this.$body.append(
        baton.branch('range', this, $('<div class="form-group date-range">'))
      )
    }
  }
)

ext.point(POINT + '/range').extend(
  //
  // Date range / checkbox
  //
  {
    index: INDEX_RANGE += 100,
    id: 'checkbox',
    render (baton) {
      this.listenTo(baton.model, 'change:activateTimeFrame', function () {
        this.updateDateRange()
      })

      baton.$el.append(
        util.checkbox('activateTimeFrame', gt('Send vacation notice during this time only'), baton.model)
      )
    }
  },
  //
  // Date range / from & until
  //
  {
    index: INDEX_RANGE += 100,
    id: 'from-util',
    render (baton) {
      const labels = { dateFrom: gt('Start'), dateUntil: gt('End') }

      baton.$el.append(
        $('<div class="row">').append(
          ['dateFrom', 'dateUntil'].map(function (id) {
            return $('<div class="col-md-4">').append(
              $('<label class="control-label">').attr('for', 'vacation_notice_' + id).text(labels[id]),
              _.device('smartphone')
                ? new DatePickerView({ attribute: id, model: baton.model, id: 'vacation_notice_' + id, clearButton: true })
                  .render().$el
                  .prop('disabled', !baton.model.get('activateTimeFrame'))
                : new mini.DateView({ name: id, model: baton.model, id: 'vacation_notice_' + id })
                  .render().$el
                  .prop('disabled', !baton.model.get('activateTimeFrame'))
            )
          })
        )
      )

      this.listenTo(this.model, 'change:dateFrom', function (model, value) {
        const length = (model.get('dateUntil') - model.previous('dateFrom')) || 0
        if (length < 0) return
        model.set('dateUntil', value + length)
      })
    }
  },
  //
  // Show length indicator
  //
  {
    index: INDEX_RANGE += 100,
    id: 'days',
    render (baton) {
      if (!_.device('smartphone')) {
        baton.$el.find('.row:last').append(
          $('<div class="col-md-4 duration">').text(this.getDurationString())
        )
      }

      baton.$el.append(
        $('<div class="row error-message has-error">').hide().append(
          $('<div class="col-md-8 col-md-offset-4 help-block">')
        )
      )

      this.listenTo(this.model, 'change:dateFrom change:dateUntil change:active change:activateTimeFrame', function () {
        this.$('.duration').text(this.getDurationString())
        // trigger internal validation
        if (this.model.isValid()) this.reflectValidity()
      })

      this.listenTo(this.model, 'invalid', this.reflectValidity)
    }
  }
)

ext.point(POINT).extend(
  //
  // Subject
  //
  {
    index: INDEX += 100,
    id: 'subject',
    render (baton) {
      this.$body.append(
        $('<div class="form-group">').append(
          $('<label for="vacation_notice_subject">').append(gt('Subject')),
          new mini.InputView({ name: 'subject', model: baton.model, id: 'vacation_notice_subject' }).render().$el
        )
      )
    }
  },
  //
  // Mail text
  //
  {
    index: INDEX += 100,
    id: 'text',
    render (baton) {
      this.$body.append(
        $('<div class="form-group">').append(
          $('<label for="vacation_notice_text">').text(gt('Message')),
          new mini.TextView({ name: 'text', model: baton.model, id: 'vacation_notice_text', rows: 6 }).render().$el
        )
      )
    }
  },
  //
  // Advanced section
  //
  {
    id: 'advanced',
    index: 10000,
    render (baton) {
      this.$body.append(
        $('<div>').append(
          $('<button type="button" class="btn btn-link">')
            .text(gt('Show advanced options'))
            .on('click', onClick)
        ),
        baton.branch('advanced', this, $('<div class="form-group">').hide())
      )

      function onClick () {
        $(this).parent().next().show().find(':input:first').focus()
        $(this).remove()
      }
    }
  }
)

ext.point(POINT + '/advanced').extend(
  //
  // Days
  //
  {
    index: INDEX_ADV += 100,
    id: 'days',
    render (baton) {
      const days = _.range(1, 32).map(function (i) { return { label: i, value: i } })

      baton.$el.append(
        $('<div class="form-group row">').append(
          // #. Context: Vacation notices
          $('<label for="vacation_notice_days" class="col-md-12">').text(gt('Days between notices to the same sender')),
          $('<div class="col-md-4">').append(
            new mini.SelectView({ list: days, name: 'days', model: baton.model, id: 'vacation_notice_days' }).render().$el
          )
        )
      )
    }
  },
  //
  // Sender
  //
  {
    index: INDEX_ADV += 100,
    id: 'sender',
    render (baton) {
      if (!settings.get('features/setFromInVacationNotice', true)) return

      baton.$el.append(
        $('<div class="form-group">').append(
          $('<label for="from">').text(gt('Send from')),
          new mini.SelectView({ list: this.getAddresses(), name: 'from', model: this.model, id: 'from' }).render().$el
        )
      )

      // fix invalid address
      if (!this.$('select[name="from"]').val()) this.$('select[name="from"]').val('default')
    }
  },
  // Aliases
  {
    index: INDEX_ADV += 100,
    id: 'aliases',
    render (baton) {
      const model = this.model
      const primaryMail = this.data.primary || this.data.aliases[0]
      model.set('primaryMail', primaryMail)

      if (this.data.aliases.length <= 1) return
      if (!settings.get('features/setAddressesInVacationNotice', true)) return

      // remove primary mail from aliases
      this.data.aliases.splice(_(this.data.aliases).indexOf(primaryMail), 1)

      baton.$el.append(
        $('<div class="help-block">').text(
          gt('The notice is sent out for messages received by %1$s. You may choose to send it out for other recipient addresses too:', primaryMail)
        ),
        _(this.data.aliases).map(function (alias) {
          return util.checkbox('alias_' + alias, alias, model)
        }),
        $('<div>').append(
          $('<button type="button" class="btn btn-link" data-action="select-all">')
            .text(gt('Select all'))
            .on('click', { view: this }, onSelectAll)
        )
      )

      function onSelectAll (e) {
        const view = e.data.view
        _(view.data.aliases).each(function (alias) {
          view.model.set('alias_' + alias, true)
        })
      }
    }
  }
)

//
// Get required data
//
function getData () {
  const model = new Model()
  return $.when(userAPI.get(), api.getConfig(), accountAPI.getPrimaryAddress(), api.getRules(), model.fetch()).then(function (user, config, primary, currentRules) {
    // vacation notice becomes first rule upon creation
    if (!_.isEmpty(currentRules) && model.get('position') === undefined) model.set('position', 0)

    return { model, aliases: user.aliases, config, user, primary: primary[1] }
  })
}

export default { open }
