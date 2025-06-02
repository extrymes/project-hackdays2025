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

import TimezonePicker from '@/io.ox/backbone/mini-views/timezonepicker'
import ListView from '@/io.ox/backbone/mini-views/settings-list-view'
import listutils from '@/io.ox/backbone/mini-views/listutils'
import _ from '@/underscore'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'

import { settings as coreSettings } from '@/io.ox/core/settings'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

const FavoriteTimezone = Backbone.Model.extend({
  initialize () {
    this.onChangeTimezone()
    this.on('change:timezone', this.onChangeTimezone.bind(this))
  },
  defaults: {
    timezone: coreSettings.get('timezone')
  },
  onChangeTimezone () {
    this.tz = moment.tz(this.get('timezone'))
    this.set('utcOffset', this.tz.utcOffset())
    this.set('title', this.get('timezone').replace(/_/g, ' '))
    this.set('id', this.cid)
  }
})

const FavoriteCollection = Backbone.Collection.extend({
  model: FavoriteTimezone,
  comparator: 'utcOffset'
})

const FavoriteView = Backbone.View.extend({

  tagName: 'div',
  className: 'favorite-view',

  events: {
    'click button[data-action="add"]': 'addFavorite',
    'click button[data-action="delete"]': 'removeFavorite'
  },

  initialize () {
    this.collection = new FavoriteCollection(_(this.model.get('favoriteTimezones')).map(function (tz) {
      return { timezone: tz }
    }))

    this.listenTo(this.collection, 'add remove', this.sync.bind(this))

    this.listView = new ListView({
      tagName: 'ul',
      collection: this.collection,
      childOptions: {
        customize (model) {
          const title = model.get('title')
          this.$('.list-item-title').addClass('text-medium').before(
            $('<span class="offset me-8">').text(model.tz.format('Z')),
            $('<span class="timezone-abbr me-8">').text(model.tz.zoneAbbr())
          )
          this.$('.list-item-controls').append(
            listutils.controlsDelete({ ariaLabel: gt('Delete %1$s', title) })
          )
        }
      }
    })
  },

  render () {
    const model = new FavoriteTimezone()
    this.timezonePicker = new TimezonePicker({
      id: 'settings-timezone',
      name: 'timezone',
      model,
      className: 'form-control'
    })

    this.$el.append(
      $('<div>').append(
        $('<label for="settings-timezone">').text(gt('Select time zone'))
      ),
      $('<div class="form-group row">').append(
        $('<div class="col-md-6">').append(
          this.timezonePicker.render().$el
        ),
        $('<div class="col-md-6">').append(
          $('<button type="button" class="btn btn-primary" data-action="add">').text(gt('Add time zone'))
        )
      ),
      $('<div class="form-group">').append(
        this.listView.render().$el
      )
    )

    return this
  },

  addFavorite () {
    const timezone = this.timezonePicker.model.get('timezone')
    const exists = this.collection.findWhere({ timezone })
    if (exists) {
      yell('error', gt('The selected timezone is already a favorite.'))
      return
    }
    this.collection.add({ timezone })
  },

  removeFavorite (e) {
    e.preventDefault()
    const id = $(e.currentTarget).closest('li').attr('data-id')
    this.collection.remove(id)
  },

  sync () {
    const list = this.collection.pluck('timezone')
    this.model.set('favoriteTimezones', list)
    // make sure, that a timezone which is deleted is not rendered in the week view as timezone label anymore
    this.model.set('renderTimezones', _.intersection(list, this.model.get('renderTimezones', [])))
    // this.model is actually a settings object so "save" will updates the JSLOB
    this.model.save()
  }
})

export default FavoriteView
