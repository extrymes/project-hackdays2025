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
import { createIcon } from '@/io.ox/core/components'
import gt from 'gettext'

export function getConference (conferences) {
  if (!_.isArray(conferences) || !conferences.length) return
  // we just consider the first one
  const conference = conferences[0]
  const params = conference.extendedParameters
  if (!params || !params['X-OX-TYPE']) return
  return {
    id: params['X-OX-ID'],
    joinURL: conference.uri,
    owner: params['X-OX-OWNER'],
    params,
    type: params['X-OX-TYPE']
  }
}

export const solutions = []

const defaultTitle = gt('Join conference call')
let solutionRegex

export function addSolution ({ type, urlRegex, title = defaultTitle } = {}) {
  // we need a regex or type
  if (!type && !(urlRegex instanceof RegExp)) return
  // reset solutionRegex and add to list
  solutionRegex = undefined
  solutions.push({ type, urlRegex, title })
}

export function getJoinDetails (appointment = {}) {
  const result = {}
  const conference = getConference(appointment.conferences)
  if (conference) {
    result.title = getTitle(conference)
    result.url = conference.joinURL
  } else {
    const fields = [appointment.location, appointment.description].filter(Boolean).join(' ')
    const match = fields.match(getSolutionRegex())
    if (match) {
      const url = match[0]
      result.title = getTitleByUrl(match[1])
      result.url = url
      return result
    }
  }
  return result
}

function getSolutionRegex () {
  // pattern taken from https://stackoverflow.com/questions/1500260/detect-urls-in-text-with-javascript
  // necessary since Teams, example, often has the pattern: Click here to join the meeting<$link>
  // so it's important to skip the > at the end
  return solutionRegex || (solutionRegex = new RegExp('(https://(' + solutions.filter(solution => solution.urlRegex).map(({ urlRegex }) => urlRegex.source).join('|') + ')[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])', 'i'))
}

function getTitleByUrl (url) {
  for (const { urlRegex, title } of solutions) {
    if (urlRegex?.test(url)) return title
  }
  return defaultTitle
}

function getTitle (conference) {
  // check type first
  const solution = solutions.find(({ type }) => type && type === conference.type)
  if (solution) return solution.title
  return getTitleByUrl(conference.joinURL)
}

export function getJoinButton (joinDetails) {
  return createJoinButton(joinDetails.url).addClass('btn-default')
    .text(joinDetails.title + ' ...')
}

export function getJoinIcon (joinDetails) {
  return createJoinButton(joinDetails.url).addClass('btn-action')
    .attr('title', joinDetails.title)
    .append(createIcon('bi/camera-video.svg').addClass('bi-16'))
}

function createJoinButton (url) {
  return $('<button type="button" class="btn" data-action="join">')
    .on('click', { url }, e => { window.open(e.data.url, '_blank', 'noopener') })
}
