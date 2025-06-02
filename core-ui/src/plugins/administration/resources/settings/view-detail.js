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

import DOMPurify from 'dompurify'
import _ from '@/underscore'
import $ from '@/jquery'
import { urlify, parsePhoneNumbers } from '@/io.ox/core/util'

import DisposableView from '@/io.ox/backbone/views/disposable'
import { resourceCollection } from '@/io.ox/core/api/resource'
import { DelegatesView } from '@/plugins/administration/resources/settings/view-delegates'
import { createIcon } from '@/io.ox/core/components'
import { hasFeature } from '@/io.ox/core/feature'
import '@/plugins/administration/resources/settings/style.scss'

import gt from 'gettext'

function parseLinks (description) {
  return _.escape(description)
    // links
    .replace(/^.*$/gm, match => urlify(match))
    // phone numbers
    .replace(/^.*$/gm, match => parsePhoneNumbers(match))
    // missing newlines
    .replace(/\n/g, '<br>')
}

function sanitize (description) {
  return $('<div>').html(
    _.escape(description)
      .replace(/[ \t]+/g, ' ')
      .replace(/<br>/g, '\n') + '\n'
  ).text()
}

export const ResourceDetailView = DisposableView.extend({

  initialize (options = {}) {
    // in the detail popup, 'cid' refers to the ID of the resource
    const { cid: id, data, callbacks } = options
    this.model = resourceCollection.get(id) || resourceCollection.add(data, { merge: true })
    this.callbacks = callbacks
    this.listenTo(resourceCollection, 'reset', function rerender () {
      this.model = resourceCollection.get(id)
      if (!this.model) return this.dispose()
      this.render()
    })
  },

  render () {
    const description = this.model.get('description').trim()

    this.$el.empty().append(
      $('<div class="detail-row">').append(
        $('<div class="icon">'),
        $('<div class="content user-select-text">').append(
          $('<h1 class="text-2xl text-bold m-0 mt-8 break-words">').text(this.model.get('display_name'))
        )
      )
    )

    // description
    if (description) {
      this.$el.append(
        $('<div class="detail-row">').append(
          $('<div class="icon">').append(createIcon('bi/justify-left.svg')),
          $('<div class="content user-select-text">').append(
            $('<p class="ellipsis whitespace-pre-line">').append(
              $('<div>').html(parseLinks(description)),
              this.callbacks?.extendDescription
                // add link to copy resource description to appointment description
                ? $('<a href="#">').text(gt('Copy to description'))
                  .on('click', { description: sanitize(description) }, this.callbacks.extendDescription)
                : $()
            )
          )
        )
      )
    }

    // booking behavior
    if (hasFeature('managedResources')) {
      this.$el.append(
        $('<div class="detail-row">').append(
          $('<div class="icon">').append(createIcon('bi/calendar2-range.svg')),
          $('<div class="content">').append(
            $('<p>').text(
              this.model.hasDelegates()
                ? gt('Booking requests for this resource need manual approval. Notifications will be sent automatically to resource delegates who will then take care of booking requests.')
                : gt('Booking requests are automatically accepted if the resource is free.')
            )
          )
        )
      )
    }

    // delegate list
    if (hasFeature('managedResources') && this.model.hasDelegates()) {
      const view = new DelegatesView({
        collection: this.model.getPermissionsAsCollection(),
        editable: false,
        empty: gt('This list has no delegates yet'),
        label: 'no'
      })

      this.$el.append(
        $('<div class="detail-row">').append(
          $('<div class="icon">').append(createIcon('bi/person.svg')),
          $('<div class="content">').append(
            $('<h2 class="mb-10 heading-unstyled">').text(gt('Resource delegates')),
            view.render().$el
          )
        )
      )
    }

    // mailaddress
    const address = (this.model.get('mailaddress') || '').toLowerCase().trim()
    const linkNode = DOMPurify.sanitize($(`<a href="mailto:${address}">`).get(0))
    this.$el.append(
      $('<div class="detail-row">').append(
        $('<div class="icon">').append(createIcon('bi/envelope.svg')),
        $('<div class="content">').append(
          $('<p class="ellipsis">').append(
            $(linkNode).text(address)
          )
        )
      )
    )

    return this
  }
})
