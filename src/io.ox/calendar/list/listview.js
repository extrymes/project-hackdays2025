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

import * as util from '@/io.ox/calendar/util'
import models from '@/io.ox/calendar/model'
import api from '@/io.ox/calendar/api'
import ext from '@/io.ox/core/extensions'
import folderAPI from '@/io.ox/core/folder/api'
import ListView from '@/io.ox/core/tk/list'
import _ from '@/underscore'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import '@/io.ox/calendar/list/view-options'
import { createIcon } from '@/io.ox/core/components'

import { settings } from '@/io.ox/calendar/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import gt from 'gettext'
import ox from '@/ox'

ext.point('io.ox/chronos/listview/item').extend({
  id: 'appointment-class',
  index: 100,
  draw () {
    this.closest('li').addClass('appointment')
  }
})

const setColors = (colorLabel, color, folder, model) => {
  const colors = util.deriveAppointmentColors(color)

  colorLabel.css({
    'background-color': colors.border // this entire element acts as a border, so background is border color
  })
}

ext.point('io.ox/chronos/listview/item').extend({
  id: 'time',
  index: 200,
  draw (baton) {
    const self = this
    const model = baton.model
    const timeSplits = util.getStartAndEndTime(model.attributes)
    const time = $('<div class="time custom_shown_as" aria-hidden="true">')
    const colorLabel = $('<div class="color-label">')

    // reset classes in case the div gets reused
    this.attr('class', 'list-item-content')

    if (model.get('folder')) {
      // conflicts with appointments, where you aren't a participant don't have a folder_id.
      folderAPI.get(model.get('folder')).done(function applyColors (folder) {
        const conf = util.getConfirmationStatus(model)
        self.addClass(util.getConfirmationClass(conf) + ' ' + util.getStatusClass(model) + (model.get('hard_conflict') ? ' hardconflict' : ''))
        const color = util.getAppointmentColor(folder, model)
        settings.once('change:categoryColorAppointments', applyColors.bind(this, folder))
        coreSettings.once('change:categories/userCategories', applyColors.bind(this, folder))
        colorLabel.attr({
          'data-folder': util.canAppointmentChangeColor(folder, model) ? folder.id : ''
        })

        // update colors on theme change (differs between dark and light theme)
        setColors(colorLabel, color, folder, model)
        ox.on('themeChange', () => setColors(colorLabel, color, folder, model))

        time.addClass(util.getForegroundColor(color) === 'white' ? 'white' : 'black')
      })
    }

    this.addClass('calendar ' + util.getShownAsClass(model)).append(
      time.append(
        $('<div class="fragment">').text(timeSplits[0]),
        colorLabel
      )
    )
  }
})

ext.point('io.ox/chronos/listview/item').extend({
  id: 'content-container',
  index: 300,
  draw (baton) {
    const content = $('<div class="contentContainer" aria-hidden="true">')
    this.append(content)
    ext.point('io.ox/chronos/listview/item/content').invoke('draw', content, baton)
  }
})

ext.point('io.ox/chronos/listview/item/content').extend({
  id: 'date',
  index: 100,
  draw (baton) {
    const model = baton.model
    this.append(
      $('<div class="date">')
        .text(util.getDateInterval(model.attributes))
        .toggle(!util.isAllday(model) && (util.getDurationInDays(model.attributes) > 0))
    )
  }
})

ext.point('io.ox/chronos/listview/item/content').extend({
  id: 'private',
  index: 200,
  draw (baton) {
    if (!util.isPrivate(baton.model)) return
    this.append(
      createIcon(util.isPrivate(baton.model, true) ? 'bi/person-circle.svg' : 'bi/eye-slash.svg')
    )
  }
})

ext.point('io.ox/chronos/listview/item/content').extend({
  id: 'summary',
  index: 300,
  draw (baton) {
    const model = baton.model
    const summary = model.get('summary') ? baton.model.get('summary') : gt('Private')
    const startDate = model.getMoment('startDate')
    const endDate = model.getMoment('endDate')

    const a11yLabel = [summary]
    if (util.isPrivate(model) && !!model.get('summary')) a11yLabel.push(gt('Private'))
    // #. %1$s is an appointment location (e.g. a room, a telco line, a company, a city)
    // #. This fragment appears within a long string for screen readers
    if (model.get('location')) a11yLabel.push(gt.pgettext('a11y', 'location %1$s', model.get('location')))
    a11yLabel.push(util.getShownAs(model))
    a11yLabel.push(startDate.isSame(endDate, 'day') ? util.getEvenSmarterDate(model) : util.getDateIntervalA11y(model.attributes))
    a11yLabel.push(util.getTimeIntervalA11y(model.attributes))

    this.closest('li').attr('aria-label', _.escape(a11yLabel.join(', ')) + '.')
    this.append($('<div class="title">').text(summary))

    if (model.get('folder')) {
      folderAPI.get(model.get('folder')).done(function (folder) {
        const color = util.getAppointmentColor(folder, model)
        const colorName = util.getColorName(color)

        if (colorName) {
          // #. Will be used as aria label for the screen reader to tell the user which color/category the appointment within the calendar has.
          a11yLabel.push(gt('Category') + ': ' + util.getColorName(color))
          this.closest('li').attr('aria-label', _.escape(a11yLabel.join(', ')) + '.')
        }
      }.bind(this))
    }
  }
})

ext.point('io.ox/chronos/listview/item/content').extend({
  id: 'location',
  index: 400,
  draw (baton) {
    this.append(
      $('<span class="gray location">').text(baton.model.get('location') || '\u00A0')
    )
  }
})

ext.point('io.ox/chronos/listview/notification/empty').extend({
  id: 'empty-label',
  index: 100,
  draw (baton) {
    const collection = baton.listView.collection
    const m = moment(collection.originalStart).add(collection.range || 0, 'month').startOf('day')
    if (collection.cid.indexOf('folders') < 0) return
    this.addClass('empty').text(gt('No appointments found until %s', m.format('LLL')))
    _.defer(baton.listView.drawTail.bind(baton.listView))
  }
})

ext.point('io.ox/chronos/listview/notification/error').extend({
  id: 'error',
  index: 100,
  draw (baton) {
    function retry (e) {
      e.data.baton.listView.reload()
    }

    this.append(
      createIcon('bi/exclamation-triangle.svg'),
      $.txt(gt('Error: Failed to load appointments')),
      $('<button type="button" class="btn btn-link">')
        .text(gt('Retry'))
        .on('click', { baton }, retry)
    )
  }
})

export default ListView.extend({

  ref: 'io.ox/chronos/listview',

  initialize (options) {
    ListView.prototype.initialize.call(this, options)
    this.$el.addClass('chronos-item').attr('aria-label', gt('List view'))
    this.connect(api.collectionLoader)
    this.listenTo(settings, 'change:showDeclinedAppointments', this.rerender)
    this.on('collection:change:attendees', this.onChangeAttendee)
    if (!_.device('smartphone')) {
      this.once('collection:reset', () => {
        // only select first list entry if no appointment has been selected yet
        if (this.selection.get().length) return
        this.selection.select(0, false, false)
      })
    }
  },

  onChangeAttendee (model) {
    // only call rerender, if the confirmation status is false and declined appointments are not shown
    if (util.getConfirmationStatus(model) !== 'DECLINED') return
    if (settings.get('showDeclinedAppointments', false)) return
    this.collection.remove(model)
    this.selection.dodge()
  },

  rerender () {
    function cont () {
      if (!this.originalCollection) return
      this.setCollection(this.originalCollection)
      this.collection.trigger('reset')
    }
    if (this.$el.is(':visible')) cont.call(this); else this.app.getWindow().one('show', cont.bind(this))
  },

  setCollection (collection) {
    function filter (model) {
      if (util.getConfirmationStatus(model) !== 'DECLINED') return true
      return settings.get('showDeclinedAppointments', false)
    }

    function setIndex (collection) {
      collection.forEach(function (model, i) {
        model.set('index', i)
      })
    }

    // use intermediate collection to filter declined appointments if necessary
    if (this.originalCollection) this.stopListening(this.originalCollection)
    this.originalCollection = collection
    collection = new models.Collection(collection.filter(filter))
    collection.cid = this.originalCollection.cid

    // apply intermediate collection to ListView
    const hasCollection = !!this.collection
    ListView.prototype.setCollection.call(this, collection)
    if (hasCollection && collection.length > 0) collection.trigger('reset')

    this.listenTo(this.originalCollection, {
      all: function all (event) {
        const args = _(arguments).toArray()
        if (/(add|remove|reset|sort)/.test(event)) return
        this.collection.trigger.apply(this.collection, args)
      }.bind(this),
      add: function add (model) {
        if (!filter(model)) return
        this.collection.add(model)
      }.bind(this),
      reset: function reset (data) {
        if (!data) return
        const selection = this.selection.get()
        this.collection.reset(data.filter(filter))
        setIndex(this.collection)
        if (this.collection.length && !this.selection.get().length && selection.length) {
          // re-select appointments
          this.selection.set(selection, true)
        }
      }.bind(this),
      remove (data) {
        this.collection.remove(data)
      },
      'remove sort': function () {
        // check for comparator first
        if (this.collection.comparator) this.collection.sort()
        setIndex(this.collection)
      }.bind(this),
      'change:startDate': function (model) {
        const startDate = model.getMoment('startDate')
        const prevStartDate = util.getMoment(model.previous('startDate'))
        if (startDate.isSame(prevStartDate, 'day')) return

        const end = moment(this.originalCollection.originalStart).add(this.originalCollection.range, 'month')
        if (startDate.isAfter(end)) return this.originalCollection.remove(model)

        this.collection.sort()
        setIndex(this.collection)

        _.defer(function () {
          this.onSort()
        }.bind(this))
      }.bind(this)
    })

    this.listenTo(this.collection, 'paginate', _.debounce(this.onPaginateEvent, 20))

    // make sure there is only one listener
    api.off('updateSearchCollection')
    // update search collection on changes. Search collection is not part of api's collection pool so we need to do this manually
    if (this.loader.mode === 'search') api.on('updateSearchCollection', () => this.reload())

    return this
  },

  getLabel (model) {
    return util.getEvenSmarterDate(model, true)
  },

  empty () {
    if (this.tail) this.tail.remove()
    return ListView.prototype.empty.apply(this, arguments)
  },

  onAdd (model) {
    if (this.$(`[data-cid="${CSS.escape(model.cid)}"]`).length > 0) return
    return ListView.prototype.onAdd.call(this, model)
  },

  renderListItem (model) {
    if (model === this.collection.last()) _.defer(this.drawTail.bind(this))
    return ListView.prototype.renderListItem.apply(this, arguments)
  },

  onPaginateEvent () {
    this.drawTail()
    if (this.collection.length === 0) this.renderEmpty()
  },

  drawTail () {
    // make sure there is no leftover busy indicator, not needed in calendar besides showing the busy animation
    if (this.getBusyIndicator().length) this.removeBusyIndicator()
    // only render if in listview. not in search
    if (this.collection.cid.indexOf('view=list') < 0) return
    if (this.tail) this.tail.remove()
    // increase by one month. Keep this in sync with the paginate function in the api (in case we increase the step to 2 months etc)
    const m = moment(this.originalCollection.originalStart).add(this.originalCollection.range + 1, 'month')

    this.$el.append(
      this.tail = $('<li class="tail" role="presentation">').append(
        $('<a href="#" class="load-more-appointments">')
          .text(gt('Load appointments until %1$s', m.format('l')))
          .on('click', this.onLoadMore.bind(this))
      )
    )
  },

  onLoadMore (e) {
    e.preventDefault()
    if (this.tail) this.tail.remove()
    this.loader.collection = this.originalCollection
    this.paginate()
  }

})
