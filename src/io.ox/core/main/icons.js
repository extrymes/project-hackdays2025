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
import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import { createIcon } from '@/io.ox/core/components'

/**
 * Loading the SVG icons is done here to provide a single
 * point for customizing icons
 */

let map, icons

function exposeIcons () {
  $.fn.extend({
    appendIcon (id) {
      return $(this).append(icons[id].clone())
    }
  })

  ox.ui.appIcons = icons
}

ext.point('io.ox/core/main/icons').extend({
  id: 'iconmap',
  index: 500,
  run () {
    // map icons for double use
    map = {
      'io.ox/mail/compose': 'io.ox/mail',
      'io.ox/contacts/edit': 'io.ox/contacts',
      'io.ox/calendar/edit': 'io.ox/calendar',
      'io.ox/tasks/edit': 'io.ox/tasks'
    }
  }
})

ext.point('io.ox/core/main/icons').extend({
  id: 'parse',
  index: 1000,
  run () {
    const calendarIcon = createIcon('bi/ox-calendar.svg')

    calendarIcon.one('load', function () {
      calendarIcon[0].getElementsByTagName('text')[0].textContent = String(new Date().getDate())
    })
    icons = {
      'io.ox/mail': createIcon('bi/ox-mail.svg'),
      'io.ox/calendar': calendarIcon,
      'io.ox/contacts': createIcon('bi/ox-address-book.svg'),
      'io.ox/files': createIcon('bi/cloud.svg'),
      'io.ox/portal': createIcon('bi/grid.svg'),
      'io.ox/tasks': createIcon('bi/ox-tasks.svg'),
      'io.ox/search': createIcon('bi/search.svg'),
      launcher: createIcon('bi/list.svg'),
      fallback: createIcon('bi/question.svg')
    }
    exposeIcons()
  }
})

// map child-apps to core apps
ext.point('io.ox/core/main/icons').extend({
  id: 'mapping',
  index: 2000,
  run () {
    const set = {}
    _(map).each(function (value, key) {
      set[key] = icons[value]
    })
    _(ox.ui.appIcons).extend(set)
  }
})

ext.point('io.ox/core/main/icons').invoke('run')

export default icons
