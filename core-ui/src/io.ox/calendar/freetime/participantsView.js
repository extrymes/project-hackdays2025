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

import AddParticipantsView from '@/io.ox/participants/add'
import { AttendeeContainer } from '@/io.ox/participants/chronos-views'
import ext from '@/io.ox/core/extensions'
import DisposableView from '@/io.ox/backbone/views/disposable'
import { icon, iconWithTooltip } from '@/io.ox/core/components'
import $ from '@/jquery'

import gt from 'gettext'

const pointHeader = ext.point('io.ox/calendar/freetime/participants-view-header')
const pointBody = ext.point('io.ox/calendar/freetime/participants-view-body')

// add participants view
pointHeader.extend({
  id: 'add-participant',
  index: 100,
  draw (baton) {
    const typeahead = new AddParticipantsView({
      apiOptions: {
        contacts: true,
        users: true,
        groups: true,
        resources: true,
        distributionlists: true
      },
      convertToAttendee: true,
      placeholder: gt('Add participant') + ' \u2026',
      collection: baton.model.get('attendees')
    })
    this.append(typeahead.render().$el)
    typeahead.$el.addClass('add-participants-wrapper col-md-12')
      // remove padding class from sr-only label (not quite sure why an sr-only label needs a height anyway)
      .find('.pt-8').removeClass('pt-8')
  }
})

// participants container
pointBody.extend({
  id: 'participants_list',
  index: 100,
  draw (baton) {
    this.append(
      new AttendeeContainer({
        collection: baton.model.get('attendees'),
        baton,
        entryClass: 'col-xs-12 col-sm-12',
        labelClass: 'sr-only',
        halo: false,
        hideMail: true,
        asHtml: true,
        noEmptyLabel: true,
        showOptionalButton: false,
        showHeadlines: false,
        customize () {
          // if freeBusyVisibility information is not available draw icon
          if (!this.model.get('missingAppointmentInfo')) return
          this.$remove.before(
            $('<div class="flex items-center p-4">').append(
              iconWithTooltip({
                icon: icon('bi/eye-slash.svg'),
                tooltip: gt('The user doesn\'t share his free/busy information with you.')
              })
            )
          )
        }
      })
        .render().$el.addClass('participantsrow')
    )
  }
})

//
// participantsview. Subview of freetimeview to show participants
//

export default DisposableView.extend({
  className: 'freetime-participants-view',
  initialize () {
    this.pointHeader = pointHeader
    this.pointBody = pointBody
    this.headerNodeRow = $('<div class="freetime-participants-view-header row2">')
    this.bodyNode = $('<div class="freetime-participants-view-body scrollpane">')
  },

  renderHeader () {
    const baton = new ext.Baton({ view: this, model: this.model })
    this.headerNodeRow.empty()
    this.pointHeader.invoke('draw', this.headerNodeRow, baton)
  },

  renderBody () {
    const baton = new ext.Baton({ view: this, model: this.model })
    this.bodyNode.empty()
    this.pointBody.invoke('draw', this.bodyNode, baton)
  }
})
