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
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import api from '@/io.ox/calendar/api'
import folderAPI from '@/io.ox/core/folder/api'
import perspective from '@/io.ox/calendar/perspective'
import viewDetail from '@/io.ox/calendar/view-detail'
import * as util from '@/io.ox/calendar/util'
import _ from '@/underscore'
import $ from '@/jquery'
import Backbone from '@/backbone'
import '@/io.ox/calendar/list/style.scss'

import gt from 'gettext'

const CalendarHeader = perspective.CalendarHeader.extend({
  render () {
    this.$el.empty()
    ext.point('io.ox/calendar/listview/header').invoke('render', this.$el, ext.Baton({ app: this.app }))
    const dropdown = this.renderLayoutDropdown()
    this.app.listView.on('connect', () => {
      dropdown.$el.toggle(this.app.listView.loader.mode !== 'search')
    })
    return this
  }
})

export default perspective.View.extend({

  events: {},

  className () {
    if (_.device('smartphone')) return
    return 'calendar-list-view'
  },

  async initialize (opt) {
    const self = this
    const app = opt.app
    this.app = app

    // render early to have all nodes at hand
    this.render()
    this.render = _.constant(this)

    this.listenTo(app.listView, {
      'selection:empty' () {
        self.drawMessageRight(gt('No appointment selected'))
      },
      'selection:one' (list) {
        self.showAppointment(util.cid(list[0]))
      },
      'selection:multiple' (list) {
        const count = $('<span class="number">').text(list.length).prop('outerHTML')
        self.drawMessageRight(gt('%1$s appointments selected', count))
      }
    })

    this.listenTo(api, {
      beforedelete (ids) {
        const selection = app.listView.selection.get()
        const cids = _.map(ids, util.cid)
        if (_.intersection(cids, selection).length) app.listView.selection.dodge()
      },
      // refresh listview on all update/delete events
      'refresh.all' () {
        // make sure the collection loader uses the correct collection
        const loader = app.listView.loader
        const collection = app.listView.collection
        loader.collection = collection
        app.listView.reload()
      },
      'process:create' (data) {
        app.listView.collection.once('reload', function () {
          app.listView.selection.set([util.cid(data)])
        })
      },
      // to show an appointment without it being in the grid, needed for direct links
      'show:appointment': this.showAppointment
    })

    // drag & drop support
    app.getWindow().nodes.outer.on('selection:drop', function (e, baton) {
      const list = _.map(baton.data, util.cid)
      api.getList(list).then(function (models) {
        baton.data = _(models).invoke('toJSON')
        actionsUtil.invoke('io.ox/calendar/detail/actions/move', baton)
      })
    })

    this.listenTo(app, 'folders:change', this.onUpdateFolders)
    const folderData = await Promise.all([app.folder.getData(), app.folders.getData()])
    self.onUpdateFolders(_(folderData[1]).pluck('id'))

    app.listView.once('reset', () => perspective.View.prototype.initialize.call(this, opt))

    app.pages.getPage('list').on('pagebeforehide', function () {
      _.url.hash('id', null)
    })
  },

  onUpdateFolders (folders) {
    const app = this.app
    app.listView.model.set('folders', folders)
  },

  render () {
    if (_.device('smartphone')) {
      this.app.left.addClass('calendar-list-view vsplit')
      this.app.right.addClass('calendar-detail-pane f6-target')
        .attr({ 'aria-label': gt('Appointment'), tabindex: -1 })
      this.app.detailPane = this.app.right
    } else {
      this.$el.addClass('translucent-low').append(
        // new CalendarHeader({ app: this.app }).render().$el,
        $('<div class="vsplit">').append(
          this.app.left,
          this.app.right.addClass('flex-col').append(
            new CalendarHeader({ app: this.app, model: this.model, type: 'list' }).render().$el,
            this.app.detailPane = $('<div class="calendar-detail-pane f6-target flex-grow">')
              .attr({ 'aria-label': gt('Appointment'), tabindex: -1 })
          )
        )
      )
      this.app.detailPane.scrollable()
    }

    return this
  },

  async showAppointment (e, obj) {
    if (!obj) obj = e

    if (_.device('smartphone') && this.app.props.get('checkboxes') === true) return
    if (obj instanceof Backbone.Model) obj = obj.attributes

    async function show (appointmentModel) {
      // we need to check folder api first when list perspective is used for search results. Those can contain appointments where the user has no right to see the folder
      // this affects the shared folder check of the accept decline actions
      // if the appointment data itself can tell the UI if it's a shared folder or not we can drop this check. tbd
      let folderData
      if (this.app.props.get('find-result')) folderData = await folderAPI.get(appointmentModel.get('folder'))
      // we use lfo here and wait for a folder api call. This might cause some ugly race conditions. The appointmentModel might be updated by a list or refresh call in the meantime, just make sure it's a fully featured model
      if (appointmentModel.get('attendees')) {
        _.lfo(this.drawAppointment.bind(this))(appointmentModel, { noFolderCheck: folderData && folderData.error })
        return
      }
      const fullModel = await api.get(appointmentModel.attributes)
      _.lfo(this.drawAppointment.bind(this))(fullModel, { noFolderCheck: folderData && folderData.error })
    }

    // be busy
    this.app.detailPane.busy({ empty: true })

    api.get(obj)
      .then(
        show.bind(this),
        _.lfo(this.drawMessageRight.bind(this, gt('Couldn\'t load appointment data.')))
      )
  },

  drawAppointment (model, options) {
    const baton = ext.Baton({ model, data: model.attributes })
    if (_.device('smartphone')) {
      this.app.pages.changePage('detailView')
      const app = this.app
      const p = app.pages.getPage('detailView')
      // clear selection after page is left, otherwise the selection
      // will not fire an event if the user click on the same appointment again
      p.one('pagehide', function () {
        app.listView.selection.clear()
      })
      // draw details to page
      p.idle().empty().append(viewDetail.draw(new ext.Baton({ model }), options))
      // update toolbar with new baton
      this.app.pages.getToolbar('detailView').setBaton(baton)
    } else {
      baton.disable('io.ox/calendar/detail', 'inline-actions')
      this.app.detailPane.idle().empty().append(viewDetail.draw(baton, options))
    }
  },

  drawMessageRight (msg) {
    this.app.detailPane.idle().empty().append(
      $('<div class="flex-center multi-selection-message">').append(
        $('<div class="message">').append(msg)
      )
    )
  },

  beforeUpdateFolder (id, model) {
    if (model.get('module') !== 'calendar') return
    if (!model.changed['com.openexchange.calendar.extendedProperties']) return
    this.updateColor(model)
  },

  updateColor (model) {
    if (!model) return
    const color = util.getFolderColor(model.attributes)
    const container = this.$(`[data-folder="${CSS.escape(model.get('id'))}"]`)
    this.$(`[data-folder="${CSS.escape(model.get('id'))}"]`).css({
      'background-color': color
    })

    container.parent().removeClass('black white')
    container.parent().addClass(util.getForegroundColor(color) === 'white' ? 'white' : 'black')
  },

  includeAppointment (appointmentModel) {
    const { model: viewModel } = this.app.listView
    const folders = viewModel.get('folders')
    // when `folders` are undefined we are currently in app startup
    if (folders && !folders.includes(appointmentModel.get('folder'))) return
    viewModel.set('target', appointmentModel.getMoment('startDate'))
  },

  getName () {
    return 'list'
  }

})
