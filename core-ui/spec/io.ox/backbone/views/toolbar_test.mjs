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

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import $ from '@/jquery'
import _ from '@/underscore'

import ToolbarView from '@/io.ox/backbone/views/toolbar'
import ext from '@/io.ox/core/extensions'

const POINT = 'io.ox/test/toolbar'
const folderId = 'toolbar/test'
const data = [{ id: 1, folder_id: folderId }, { id: 2, folder_id: folderId }]
let enableEight = false

// define links
ext.point(POINT + '/links').extend(
  { id: 'one', title: 'One', prio: 'hi', ref: POINT + '/actions/one', section: 'a' },
  { id: 'two', title: 'Two', prio: 'hi', ref: POINT + '/actions/two', icon: 'bi/trash.svg', section: 'a' },
  { id: 'three', label: 'Three', prio: 'hi', ref: POINT + '/actions/three', drawDisabled: true, section: 'a' },
  { id: 'four', title: 'Four', prio: 'lo', ref: POINT + '/actions/four', section: 'b' },
  { id: 'five', title: 'Five', prio: 'lo', ref: POINT + '/actions/five', section: 'b' },
  { id: 'six', title: 'Six', prio: 'lo', ref: POINT + '/actions/six', section: 'c' },
  { id: 'seven', title: 'Seven', prio: 'lo', ref: POINT + '/actions/seven', section: 'c' },
  { id: 'eight', title: 'Eight', prio: 'lo', ref: POINT + '/actions/eight', section: 'd', sectionTitle: 'foo' }
)

// define actions
action(POINT + '/actions/one', {
  device: 'chrome',
  collection: 'some'
})

action(POINT + '/actions/two', {
  // backwars compat
  requires: function (e) {
    if (!e.collection.has('some')) return
    return $.when(true)
  }
})

action(POINT + '/actions/three', {
  // drawDisabled
  matches: _.constant(false)
})

action(POINT + '/actions/four', {
  matches: _.constant(true)
})

action(POINT + '/actions/five')

action(POINT + '/actions/six', {
  toggle: false
})

action(POINT + '/actions/seven', {
  device: 'firefox'
})

action(POINT + '/actions/eight', {
  matches: function () {
    if (!enableEight) return false
    return _.wait(1).then(_.constant(true))
  }
})

function action (id, options) {
  ext.point(id).extend(_.extend({ id: 'default', index: 100 }, options))
}

describe('Actions', function () {
  //
  // Action Toolbar
  //

  describe('Toolbar view', function () {
    let toolbar

    beforeEach(function () {
      toolbar = new ToolbarView({ point: POINT + '/links', simple: true })
    })

    it('trigger ready event synchronously', function () {
      const spy = jest.fn()
      toolbar.on('ready', spy)
      toolbar.setSelection(data)
      expect(spy.mock.calls).toHaveLength(1)
    })

    it('waits for an async action', function (done) {
      enableEight = true
      const spy = jest.fn()
      toolbar.on('ready', spy)
      toolbar.on('ready:toolbar/test.1,toolbar/test.2', function (selection) {
        // use try/catch to see the error instead of timeout
        try {
          expect(selection).toEqual('toolbar/test.1,toolbar/test.2')
          expect(spy.mock.calls).toHaveLength(1)
          spy.mockClear()
        } catch (e) {
          console.error(e)
        } finally {
          done()
        }
      })
      toolbar.setSelection(data)
      expect(spy.mock.calls).toHaveLength(0)
      enableEight = false
    })
  })
})
