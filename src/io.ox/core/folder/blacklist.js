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

import _ from '@/underscore'
import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import { settings } from '@/io.ox/core/settings'
import { settings as fileSettings } from '@/io.ox/files/settings'

const point = ext.point('io.ox/core/folder/filter')
const localBlocklist = {}
let hash = {}
let ids = []

settings.ready(() => {
  hash = settings.get('folder/blacklist', {})
  ids = _(hash).keys().sort()
  if (ox.debug && ids.length > 0) console.info('Blocklisted folders:', ids)
})

point.extend(
  {
    id: 'blocklist',
    index: 100,
    visible (baton) {
      const data = baton.data; const id = String(data.id)
      // work with fresh hash (esp. for testing)
      hash = _.extend(settings.get('folder/blacklist', {}), localBlocklist)
      return !hash[id]
    }
  },
  {
    id: 'dot-folders',
    index: 200,
    visible (baton) {
      // not in drive app?
      if (baton.data.module !== 'infostore') return true
      // filter not enabled?
      if (fileSettings.get('showHidden', false) === true) return true
      // check that title doesn't start with a dot
      return !(/^\./.test(baton.data.title))
    }
  }
)

// utility function
function reduce (memo, visible) {
  return memo && !!visible
}

export default {

  // direct access
  hash,

  // returns true if a folder is visible
  // returns false if a folder is blocklisted
  filter (data) {
    const baton = ext.Baton({ data })
    return point
      .invoke('visible', null, baton)
      .reduce(reduce, true)
      .value()
  },

  // convenience
  visible (data) {
    return this.filter(data)
  },

  // filter array of folders
  apply (array) {
    return _(array).filter(this.filter, this)
  },

  add (id) {
    localBlocklist[id] = true
  }
}
