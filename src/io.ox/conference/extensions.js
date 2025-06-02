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

import ext from '@/io.ox/core/extensions'
import { getJoinDetails, getJoinButton, addSolution } from '@/io.ox/conference/util'
import { getRow } from '@/io.ox/calendar/util'
import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'
import ConferenceSelectView from '@/io.ox/conference/views/conference-select'
import { ready } from '@/io.ox/core/events'
import { manifestManager } from '@/io.ox/core/manifests'
import { settings as jitsiSettings } from '@/io.ox/jitsiReservationManager/settings'
import '@/io.ox/conference/style.scss'

ext.point('io.ox/calendar/detail').extend({
  before: 'location',
  id: 'join',
  draw (baton) {
    // TODO: Split this for compability with pure location and real conference
    // conference field should also be printed in the view
    const details = getJoinDetails(baton.data)
    if (!details.url) return

    const { $row, $icon, $content } = getRow()
    $icon.append(createIcon('bi/camera-video.svg').css('top', '8px'))
    $content.append(getJoinButton(details))
    this.append($row)

    // avoid actions
    baton.disable('io.ox/calendar/detail', 'actions')
  }
})

// edit appointment
ext.point('io.ox/calendar/edit/section').extend({
  id: 'conference',
  before: 'location',
  draw (baton) {
    const point = ext.point('io.ox/calendar/conference-solutions')
    if (point.list().length <= 1) return
    new ConferenceSelectView({ el: this, appointment: baton.model, point }).render()
  }
})

ext.point('io.ox/calendar/conference-solutions')
  .extend({ id: 'none', index: 100, value: 'none', label: gt('None') })

ext.point('io.ox/calendar/conference-solutions/join-buttons').extend({
  id: 'zoom',
  index: 100,
  type: 'zoom',
  title: gt('Join Zoom meeting'),
  urlRegex: /.*?\.zoom\.us/i
})

ext.point('io.ox/calendar/conference-solutions/join-buttons').extend({
  id: 'meet',
  index: 200,
  title: gt('Join with Google Meet'),
  urlRegex: /meet\.google\.com/i
})

ext.point('io.ox/calendar/conference-solutions/join-buttons').extend({
  id: 'teams',
  index: 300,
  title: gt('Join Teams Meeting'),
  urlRegex: /teams\.microsoft\.com\/l\/meetup-join/i
})

ext.point('io.ox/calendar/conference-solutions/join-buttons').extend({
  id: 'skype',
  index: 400,
  title: gt('Join Skype meeting'),
  urlRegex: /join\.skype\.com/i
})

ext.point('io.ox/calendar/conference-solutions/join-buttons').extend({
  id: 'facetime',
  index: 500,
  title: gt('Join with Apple Facetime'),
  urlRegex: /facetime\.apple\.com\/join#/i
})

ext.point('io.ox/calendar/conference-solutions/join-buttons').extend({
  id: 'jitsi',
  index: 600,
  type: 'jitsi',
  // #. %s is a configurable product name of meeting service e.g. Jitsi or Zoom
  title: gt('Join %s conference', jitsiSettings.get('productName'))
})

ready(() => {
  manifestManager.loadPluginsFor('conference').then(() => {
    ext.point('io.ox/calendar/conference-solutions/join-buttons').list().forEach(addSolution)
  })
})
