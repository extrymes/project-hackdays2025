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
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import $ from '@/jquery'
import ListView from '@/io.ox/backbone/mini-views/settings-list-view'
import listUtils from '@/io.ox/backbone/mini-views/listutils'
import snippetsApi from '@/io.ox/core/api/snippets'
import snippetsUtil from '@/io.ox/core/tk/snippetsUtil'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

import '@/io.ox/mail/settings/templates/style.scss'

function load () {
  snippetsApi.getAll({ timeout: 0 })
}

ext.point('io.ox/mail/settings/templates/view').extend({
  id: 'view',
  index: 100,
  draw () {
    this.append(
      new ExtensibleView({ point: 'io.ox/mail/settings/templates/section', model: settings })
        .render().$el.addClass('io-ox-template-settings')
    )
  }
})

ext.point('io.ox/mail/settings/templates/section').extend(
  {
    id: 'buttons',
    index: 200,
    render () {
      const $el = $('<div class="form-group">').append(
        $('<button type="button" class="btn btn-primary">')
          .text(gt('Add new template'))
          .on('click', () => snippetsUtil.editSnippet({}, { type: 'template' }))
      )

      this.$el.append($el)
    }
  },
  {
    id: 'collection',
    index: 300,
    render () {
      load()
      snippetsApi.on('refresh.all', load)
      this.on('dispose', () => snippetsApi.off('refresh.all', load))
    }
  },
  {
    id: 'list-view',
    index: 400,
    render () {
      function getTemplateData (event) {
        const id = $(event.currentTarget).closest('li').attr('data-id')
        return snippetsApi.getCollection('template').get(id).toJSON()
      }

      function clickEdit (event) {
        if ((event.type !== 'click' && event.which !== 13)) return

        snippetsUtil.editSnippet({}, getTemplateData(event))
        event.preventDefault()
      }

      this.$el.append(
        new ListView({
          tagName: 'ul',
          collection: snippetsApi.getCollection('template'),
          childOptions: {
            titleAttribute: 'displayname',
            customize (model) {
              this.$('.list-item-title').addClass('justify-center font-bold')
              const title = model.get('displayname')
              const preview = snippetsUtil.sanitize(model.get('content') || model.get('error'))
              this.$('.list-item-controls').append(
                model.has('error') ? [] : listUtils.controlsEdit({ ariaLabel: gt('Edit %1$s', title) }),
                listUtils.controlsDelete({ ariaLabel: gt('Delete %1$s', title) })
              )
              this.$el.append(
                preview && $('<div class="template-preview text-gray w-full mt-8">').append(
                  $('<div>').on('click', clickEdit).append(preview)
                )
              )
            }
          }
        })
          .on('edit', clickEdit)
          .on('delete', async event => {
            event.preventDefault()
            try {
              await snippetsUtil.showDeleteDialog(getTemplateData(event))
            } catch (error) {
              // cancel causes promise rejection so just catch it and do nothing
            }
          })
          .render().$el
      )
    }
  }
)
