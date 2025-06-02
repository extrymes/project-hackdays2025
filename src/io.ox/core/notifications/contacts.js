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

import contactsAPI from '@/io.ox/contacts/api'
import * as util from '@/io.ox/contacts/util'
import _ from '@/underscore'
import moment from '@open-xchange/moment'
import { BaseView } from '@/io.ox/core/notifications/views'
import { createIcon } from '@/io.ox/core/components'
import { mediator } from '@/io.ox/core/notifications/util'
import { Adapter } from '@/io.ox/core/notifications/api'
import capabilities from '@/io.ox/core/capabilities'
import { settings } from '@/io.ox/core/settings'
import { isToday } from '@/io.ox/calendar/util'

// needed for contact picture css
import '@/io.ox/contacts/style.scss'

import gt from 'gettext'

const formatCalendar = {
  sameDay: `[${gt('Today')}]`,
  nextDay: `[${gt('Tomorrow')}]`,
  lastDay: 'l',
  nextWeek: 'l',
  lastWeek: 'l',
  sameElse: 'l'
}

function requestBirthdays () {
  if (!settings.get('showBirthdayNotifications')) return
  contactsAPI.currentBirthdays()
}

function getClosestBirthday (contact) {
  // birthday comes along in utc, so moment.utc(t); not moment(t).utc(true)
  const today = moment().utc(true).startOf('day')
  const birthday = moment.utc(contact.birthday).startOf('day')

  // last year, this year, next year
  return [-1, 0, 1].reduce((memo, num) => {
    const birthdayAt = birthday.clone().year(today.year()).add(num, 'years')
    const data = {
      birthday: birthdayAt,
      relative: birthdayAt.calendar(today, formatCalendar),
      age: util.hasYearOfBirth(birthday)
        ? birthdayAt.diff(birthday, 'years')
        : '',
      diff: birthdayAt.diff(today, 'days')
    }
    return memo && Math.abs(memo.diff) <= Math.abs(data.diff) ? memo : data
  }, undefined)
}
if (capabilities.has('contacts')) {
  mediator('io.ox/notifications/adapter', {

    'contacts:reminder': api => {
      const type = 'contacts:reminder'
      const detail = 'contact'
      const label = gt('Birthday')
      const persistence = true
      const adapter = new Adapter({ type, detail, label, api, persistence })
      let lastDate = moment()

      // sort by event start date (negated so today comes first)
      adapter.getSortName = model => -model.get('closest').birthday.valueOf()

      contactsAPI.on('birthdays:recent', (e, contacts) => {
        if (isToday(lastDate)) adapter.prune(contacts)
        else adapter.clear() // render correct relative day string for birthdays (see OXUIB-2246)
        lastDate = moment()

        for (const contact of contacts) {
          if (!_.isNumber(contact.birthday)) return

          adapter.add({
            app: 'contact',
            category: 'birthdays',
            // just to be sure hours are the same
            closest: getClosestBirthday(contact),
            title: util.getFullName(contact),
            email: contact.email,
            email1: contact.email1,
            id: contact.id,
            folder_id: contact.folder_id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            display_name: contact.display_name
          })
        }
      })

      settings.on('change:showBirthdayNotifications', () => {
        if (settings.get('showBirthdayNotifications')) return requestBirthdays()
        adapter.clear()
      })
    },

    'contacts:initial-fetch': (api) => {
      // load with delay
      setTimeout(() => {
        requestBirthdays()
        contactsAPI.on('refresh.all', requestBirthdays)
      }, 5000)
    }
  })
}

export const BirthdayReminderView = BaseView.extend({
  render () {
    const data = this.model.toJSON()
    this.$el.empty()
    this.$el.append(
      $('<div class="row-container">').append(
        this.renderTitle(),
        this.renderTime()
      ),
      contactsAPI.pictureHalo(
        $('<div class="contact-photo">').text(util.getInitials(data)),
        data,
        { width: 32, height: 32, fallback: false }
      )
    )
    return this
  },

  renderTitle () {
    if (!this.model.get('title')) return ''
    const data = this.model.toJSON()
    return $('<div class="item-row">').append(
      $('<div class="icon-wrap flex-center" aria-hidden="true">').attr('title', data.label).append(
        $('<div class="icon-background">'),
        createIcon('bi/gift.svg').addClass('title-icon')
      ),
      $('<h2 class="title truncate">').attr('title', this.model.get('title')).text(this.model.get('title'))
    )
  },

  renderTime (action = $()) {
    const closest = this.model.get('closest')
    return $('<div class="item-row">').append(
      $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Date')}">`).append(
        createIcon('bi/clock.svg').addClass('row-icon')
      ),
      $.txt(closest.relative),
      $('<span class="truncate">').text(closest.age ? `\u00a0(${gt('Age')}: ${closest.age})` : '')
    )
  }
})
