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

// own file because extensions.js is quite big already

import $ from '@/jquery'
import _ from '@/underscore'
import { createIcon } from '@/io.ox/core/components'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import openSettings from '@/io.ox/settings/util'
import snippetsApi from '@/io.ox/core/api/snippets'
import textproc from '@/io.ox/core/tk/textproc'
import { hasFeature } from '@/io.ox/core/feature'

import gt from 'gettext'

const templateCollection = snippetsApi.getCollection('template')

function drawTemplate (template, baton) {
  // careful with XSS here because this is user content
  return $('<li role="presentation">').append(
    $('<a href="#" class="template-item" draggable="false" role="menuitem" tabindex="-1">').append(
      $('<div class="title ellipsis">').text(template.get('displayname') || ''),
      _.device('smartphone') ? '' : $('<div class="truncate multiline text-gray">').text(textproc.htmltotext(template.get('content')) || '')
    )
  ).on('click', () => {
    const editor = baton.view.editor
    const content = editor.getMode() === 'text' ? textproc.htmltotext(template.get('content')) : template.get('content')
    editor.insertContent(content)
  })
}

function getDropdown (baton) {
  const options = _.device('smartphone')
    ? {}
    : {
        tagName: 'li',
        attributes: {
          role: 'presentation',
          'data-extension-id': 'templates'
        },
        dropup: true,
        label: gt('Templates'),
        caret: true,
        $toggle: $('<a href="#" role="button" class="dropdown-toggle" data-toggle="dropdown" tabindex="-1">').attr('aria-label', gt('Templates')).append(
          createIcon('bi/file-text.svg').attr('title', gt('Templates'))
        ).addActionTooltip(gt('Templates'))
      }

  const templateWrapper = $('<div role="group" class="template-wrapper">').attr('aria-label', gt('Templates'))

  const dropdown = new Dropdown(options)
  templateCollection.each(template => {
    templateWrapper.append(drawTemplate(template, baton))
  })
  dropdown.$ul.append(templateWrapper)
  dropdown.divider()
  dropdown.link('edit-templates', gt('Edit templates...'), () => openSettings('virtual/settings/io.ox/mail', 'io.ox/mail/settings/templates'), { icon: true })
  dropdown.render().$el.addClass('templates')
  return dropdown
}

export default {
  getDropdown,
  drawMenu (baton) {
    if (!hasFeature('templates')) return
    this.append(getDropdown(baton).$el)
  }
}
