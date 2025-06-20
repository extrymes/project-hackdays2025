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
import BaseView from '@/io.ox/core/viewer/views/types/baseview'
import detail from '@/io.ox/mail/detail/view'

const MailView = BaseView.extend({

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
    const data = this.model.get('origData').nested_message
    if (!this.view) {
      // add filename that is used as indicator for isEmbedded and is('toplevel')
      _.extend(data, { filename: this.model.get('filename') })
      // nested mails may not have full data, use attachments attribute to determine
      this.view = new detail.View({ data, loaded: !!data.attachments })
    }

    // if we want to reuse the view, we must not delete $el by emptying the slide. Otherwise the view get's disposed
    this.view.$el.empty().detach()
    this.$el.empty().append(
      $('<div class="mail-view thread-view list-view">').append(
        this.view.render().expand().$el
      )
    )

    return this
  },

  unload () {
    this.isPrefetched = false
    return this
  }
})

export default MailView
