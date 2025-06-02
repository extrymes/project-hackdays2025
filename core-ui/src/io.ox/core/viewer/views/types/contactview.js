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
import ext from '@/io.ox/core/extensions'
import BaseView from '@/io.ox/core/viewer/views/types/baseview'
import detail from '@/io.ox/contacts/view-detail'

const ContactView = BaseView.extend({

  initialize () {
    this.isPrefetched = false
  },

  render () {
    // quick hack to get rid of flex box
    this.$el.empty().css('display', 'block')
    return this
  },

  prefetch () {
    this.isPrefetched = true
    return this
  },

  show () {
    const baton = new ext.Baton({
      data: this.model.toJSON()
    })

    baton.disable('io.ox/contacts/detail', 'inline-actions')
    this.$el.append(
      $('<div class="white-page">').append(
        detail.draw(baton)
      )
    )

    return this
  },

  unload () {
    this.isPrefetched = false
    return this
  }
})

export default ContactView
