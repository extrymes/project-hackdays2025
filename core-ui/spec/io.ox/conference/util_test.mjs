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

import { describe, it, expect } from '@jest/globals'
import { getJoinDetails, getConference, addSolution } from '@/io.ox/conference/util'

// load extensions, to register the different conference solutions
import '@/io.ox/conference/extensions'
import ext from '@/io.ox/core/extensions'

ext.point('io.ox/calendar/conference-solutions/join-buttons').extend({
  id: 'awesomeMeeting',
  index: 700,
  type: 'awesome',
  title: 'Join my Awesome conference!'
})
ext.point('io.ox/calendar/conference-solutions/join-buttons').list().forEach(addSolution)

describe('Conference utils', function () {
  describe('getConference', function () {
    it('Zoom link in conference field', function () {
      const conferences = [{
        uri: 'https://foo.zoom.us/my/whatever?pwd=1234',
        extendedParameters: {
          'X-OX-ID': '1234',
          'X-OX-TYPE': 'zoom',
          'X-OX-OWNER': 'whoever'
        }
      }]
      const conference = getConference(conferences)
      expect(conference.type).toEqual('zoom')
      expect(conference.joinURL).toEqual('https://foo.zoom.us/my/whatever?pwd=1234')
    })
  })
  describe('getJoinDetails', function () {
    // link in location
    it('Zoom link in location & empty description', function () {
      const details = getJoinDetails({
        location: 'https://foo.zoom.us/my/whatever?pwd=1234ABC',
        description: ''
      })
      expect(details.title).toEqual('Join Zoom meeting')
      // no undefined in URL
      expect(details.url).toEqual('https://foo.zoom.us/my/whatever?pwd=1234ABC')
    })
    it('Zoom link in location & filled description', function () {
      const details = getJoinDetails({
        location: 'https://foo.zoom.us/my/whatever?pwd=1234ABC',
        description: 'some text'
      })
      expect(details.title).toEqual('Join Zoom meeting')
      // first word of description is not part of the URL
      expect(details.url).toEqual('https://foo.zoom.us/my/whatever?pwd=1234ABC')
    })
    it('Google Meet link in location', function () {
      const details = getJoinDetails({
        location: ' https://meet.google.com/1234 '
      })
      expect(details.title).toEqual('Join with Google Meet')
      expect(details.url).toEqual('https://meet.google.com/1234')
    })
    it('Teams Meeting link in description', function () {
      const details = getJoinDetails({
        description: 'Click here to join the meeting<https://teams.microsoft.com/l/meetup-join/4382748498327>\nMeeting ID: 111 222 303 44'
      })
      expect(details.title).toEqual('Join Teams Meeting')
      expect(details.url).toEqual('https://teams.microsoft.com/l/meetup-join/4382748498327')
    })
    it('Skype link in location', function () {
      const details = getJoinDetails({
        location: 'https://join.skype.com?1234'
      })
      expect(details.title).toEqual('Join Skype meeting')
      expect(details.url).toEqual('https://join.skype.com?1234')
    })
    it('Facetime link in location', function () {
      const details = getJoinDetails({
        location: 'https://facetime.apple.com/join#1234'
      })
      expect(details.title).toEqual('Join with Apple Facetime')
      expect(details.url).toEqual('https://facetime.apple.com/join#1234')
    })
    // link in the description below
    it('Zoom link in description', function () {
      const details = getJoinDetails({
        location: 'Dortmund',
        description: 'some text https://foo.zoom.us/my/whatever?pwd=1234ABC'
      })
      expect(details.title).toEqual('Join Zoom meeting')
      expect(details.url).toEqual('https://foo.zoom.us/my/whatever?pwd=1234ABC')
    })
    // link in conference field
    it('Zoom link in conference field', function () {
      const details = getJoinDetails({
        conferences: [{
          uri: 'https://foo.zoom.us/my/whatever?pwd=1234',
          extendedParameters: {
            'X-OX-ID': '1234',
            'X-OX-TYPE': 'zoom',
            'X-OX-OWNER': 'whoever'
          }
        }],
        location: 'https://meet.google.com/1234',
        description: 'text'
      })
      expect(details.title).toEqual('Join Zoom meeting')
      expect(details.url).toEqual('https://foo.zoom.us/my/whatever?pwd=1234')
    })
    it('Google Meet link in conference field', function () {
      const details = getJoinDetails({
        conferences: [{
          uri: 'https://meet.google.com/1234',
          extendedParameters: {
            'X-OX-ID': '1234',
            'X-OX-TYPE': 'google-meet',
            'X-OX-OWNER': 'whoever'
          }
        }],
        location: 'https://foo.zoom.us/my/whatever?pwd=1234',
        description: 'text'
      })
      expect(details.title).toEqual('Join with Google Meet')
      expect(details.url).toEqual('https://meet.google.com/1234')
    })
    it('Custom join link in conference field', function () {
      const details = getJoinDetails({
        conferences: [{
          uri: 'https://awesome.example.com/',
          extendedParameters: {
            'X-OX-ID': '1234',
            'X-OX-TYPE': 'awesome',
            'X-OX-OWNER': 'whoever'
          }
        }],
        location: 'https://foo.zoom.us/my/whatever?pwd=1234',
        description: 'text'
      })
      expect(details.title).toEqual('Join my Awesome conference!')
      expect(details.url).toEqual('https://awesome.example.com/')
    })
    it('Unknown join link in conference field', function () {
      const details = getJoinDetails({
        conferences: [{
          uri: 'https://some-unknown-service.com/1234',
          extendedParameters: {
            'X-OX-ID': '1234',
            'X-OX-TYPE': 'unknown-service',
            'X-OX-OWNER': 'whoever'
          }
        }],
        location: 'https://foo.zoom.us/my/whatever?pwd=1234',
        description: 'text'
      })
      expect(details.title).toEqual('Join conference call')
      expect(details.url).toEqual('https://some-unknown-service.com/1234')
    })
  })
})
