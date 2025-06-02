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
import Backbone from '@/backbone'
import ox from '@/ox'
import moment from '@open-xchange/moment'
import ModalDialog from '@/io.ox/backbone/views/modal'

import ext from '@/io.ox/core/extensions'
import AppointmentModel from '@/io.ox/calendar/model'
import api from '@/io.ox/calendar/api'
import EditView from '@/io.ox/calendar/edit/view'
import yell from '@/io.ox/core/yell'
import folderAPI from '@/io.ox/core/folder/api'
import * as util from '@/io.ox/calendar/util'
import manifests from '@/io.ox/core/manifests'
import '@/lib/jquery-ui.min.js'

import '@/io.ox/calendar/edit/style.scss'

import { settings } from '@/io.ox/calendar/settings'
import gt from 'gettext'
import { device } from '@/browser'

let INDEX = 0

ext.point('io.ox/calendar/edit/boot').extend({
  id: 'models-and-objects',
  index: INDEX += 100,
  perform (baton) {
    const model = baton.data
    delete baton.data
    if (model) {
      if (model instanceof Backbone.Model) {
        baton.data = model.toJSON()
      } else if (_.isObject(model)) {
        baton.data = model
      }
    }
  }
}, {
  id: 'load',
  index: INDEX += 100,
  perform (baton) {
    const action = baton.options.action
    const originalData = baton.data
    const o = originalData && api.reduce(originalData)
    // is not editing
    if (!o || !o.id || !o.folder) return
    // use series root for this and future
    if (action === 'series' || action === 'thisandfuture') {
      // edit the series, discard recurrenceId and reference to seriesId if exception
      delete o.recurrenceId
      o.id = originalData.seriesId || originalData.id
    }
    return api.get(o, false).then(function (data) {
      data = data.toJSON()
      if (action === 'thisandfuture') data = util.createUpdateData(data, originalData)
      baton.data = data
    }, yell)
  }
}, {
  id: 'appointment-model',
  index: INDEX += 100,
  perform (baton) {
    const options = baton.options
    const data = baton.data
    const app = baton.app
    if (options.mode === 'edit' && data.id) {
      // hash support
      app.setState({ folder: data.folder, id: data.id })
      app.model = new AppointmentModel.Model(data)
    } else {
      // default values from settings
      data.alarms = data.alarms || util.getDefaultAlarms(data)

      // transparency is the new shown_as property. It only has 2 values, TRANSPARENT and OPAQUE
      data.transp = data.transp || ((util.isAllday(data) && settings.get('markFulltimeAppointmentsAsFree', false)) ? 'TRANSPARENT' : 'OPAQUE')
      app.model = new AppointmentModel.Model(data)
      if (!data.folder || /^virtual|^cal:\/\/0\/resource/.test(data.folder)) {
        app.model.set('folder', data.folder = folderAPI.getDefaultFolder('calendar'))
      }
    }
    baton.model = app.model
  }
}, {
  id: 'load-folder',
  index: INDEX += 100,
  perform (baton) {
    return folderAPI.get(baton.model.get('folder')).catch()
  }
}, {
  id: 'set-default-attendee',
  index: INDEX += 100,
  perform (baton) {
    return baton.model.setDefaultAttendees({ create: baton.options.mode === 'create' })
  }
}, {
  id: 'set-selected-resource-attendees',
  index: INDEX += 100,
  perform (baton) {
    return baton.model.addSelectedResources({ create: baton.options.mode === 'create' })
  }
}, {
  id: 'model-setup',
  index: INDEX += 100,
  perform (baton) {
    const options = baton.options
    if (options.mode === 'create') {
      baton.model.set('attendeePrivileges', baton.data.attendeePrivileges || (settings.get('chronos/allowAttendeeEditsByDefault', false) && !folderAPI.pool.getModel(baton.model.get('folder')).is('public') ? 'MODIFY' : 'DEFAULT'))
    }

    if (options.mode === 'edit' && util.isAllday(baton.model)) {
      // allday appointments do not include the last day. To not mislead the user we subtract a day (so one day appointments only show one date for example)
      // this day will be added again on save
      baton.model.set('endDate', { value: moment(baton.model.get('endDate').value).subtract('1', 'days').format('YYYYMMDD') })
    }

    baton.model.on({
      'sync:start' () {
        baton.win.busy()
      }
    })

    if (options.mode === 'edit') {
      if (options.action === 'appointment') {
        baton.model.set('rrule', undefined, { validate: true })
        baton.model.mode = 'appointment'
      }

      if (options.action === 'series') baton.model.mode = 'series'
      if (options.action === 'thisandfuture') baton.model.mode = 'thisandfuture'
    }

    baton.model.on('change', function () {
      baton.app.considerSaved = false
    })
  }
}, {
  id: 'view',
  index: INDEX += 100,
  perform (baton) {
    const app = baton.app
    const options = baton.options
    baton.view = app.view = new EditView({
      model: baton.model,
      mode: options.mode,
      app,
      callbacks: {
        extendDescription: app.extendDescription
      },
      // restore meta data for used groups if given
      usedGroups: options.usedGroups || []
    })
  }
}, {
  id: 'set-content',
  index: INDEX += 100,
  perform (baton) {
    const options = baton.options
    const app = baton.app
    const model = baton.model
    // if initialModelData is given, we are using a restore point. Don't consider this as saved
    app.considerSaved = !options.initialModelData

    app.setTitle(model.get('summary') || options.mode === 'create' ? gt('Create appointment') : gt('Edit appointment'))

    // use deep clone so we don't have accidental references
    app.initialModelData = _.deepClone(options.initialModelData || model.toJSON())
    $(app.getWindow().nodes.main[0]).append(app.view.render().el)
  }
}, {
  id: 'idle',
  index: INDEX += 100,
  perform (baton) {
    const win = baton.win
    // Set window and toolbars visible again
    win.nodes.header.removeClass('sr-only')
    win.nodes.body.removeClass('sr-only').find('.scrollable').scrollTop(0).trigger('scroll')
    win.idle()
  }
}, {
  id: 'done',
  index: INDEX += 100,
  perform (baton) {
    const app = baton.app
    const model = baton.model
    // set url parameters
    app.setState({ folder: model.attributes.folder, id: model.get('id') ? model.attributes.id : null })
    app.onShowWindow()
    // used by guided tours so they can show the next step when everything is ready
    $(app).trigger('finishedCreating')
  }
}, {
  id: 'dropzone',
  index: INDEX += 100,
  perform (baton) {
    const app = baton.app
    if (app.dropZone) {
      baton.win.on('hide', function () { app.dropZone.remove() })
      if (app.dropZone.include) app.dropZone.include()
    }
  }
})

function createInstance () {
  const app = ox.ui.createApp({
    name: 'io.ox/calendar/edit',
    title: gt('Edit Appointment'),
    userContent: true,
    closable: true,
    resizable: false,
    floating: !_.device('smartphone'),
    size: 'width-xs',
    load: () => manifests.manager.loadPluginsFor('io.ox/calendar/edit')
  })

  app.setLauncher(function () {
    const win = ox.ui.createWindow({
      name: 'io.ox/calendar/edit',
      chromeless: true,
      floating: _.device('!smartphone'),
      closable: true,
      title: gt('Edit Appointment')
    })

    app.setWindow(win)
    win.nodes.outer.addClass('gray-background')

    _.extend(app, {
      dispose () {
        this.model.off()
      },

      // description field (resource only) uses this function to
      // offer "Copy to description"; the click event lands here
      extendDescription (e) {
        // we simply have to look for the textarea
        e.preventDefault()
        if (!app.view) return
        const textarea = app.view.$el.find('textarea.note')
        // trigger change to update the model
        textarea.val(textarea.val() + e.data.description).trigger('change')
        yell('success', gt('Description has been copied'))
      },

      async edit (data, opt) {
        opt = {
          mode: 'edit',
          ...opt
        }

        app.cid = 'io.ox/calendar:' + opt.mode + '.' + util.cid(data)

        if (opt.previousFocus && $(opt.previousFocus).is(':visible') && !device('smartphone')) win.floating.model.set('previousFocus', opt.previousFocus)

        // Set window and toolbars invisible initially
        win.nodes.header.addClass('sr-only')
        win.nodes.body.addClass('sr-only')

        await new Promise(resolve => win.busy().show(resolve))
        try {
          await ext.point('io.ox/calendar/edit/boot').cascade(app, { app, data: data || {}, options: opt, win })
        } catch (err) {
          app.quit()
          throw err
        }
      },

      considerSaved: false,

      create (data) {
        data = data instanceof Backbone.Model ? data.toJSON() : data
        // apply defaults. Cannot be done in default of model, because then events in week/month view have class public by default
        if (!data.class) data.class = 'PUBLIC'
        this.edit(data, { mode: 'create' })
      },

      getDirtyStatus () {
        if (this.considerSaved) return false
        // we need to compare data with sorted attendees
        // also reduce attendee data to avoid false positives
        const current = this.model.toJSON()
        current.attendees = _(current.attendees?.map(pick)).sortBy('uri')
        const initial = { ...this.initialModelData }
        initial.attendees = _(initial.attendees?.map(pick)).sortBy('uri')
        if (ox.debug) {
          console.debug('Attendees. current vs initial', current.attendees, initial.attendees)
          console.debug('Attendees. dirty?', !_.isEqual(current.attendees, initial.attendees))
        }
        // same is needed for categories
        if (_.isArray(initial.categories)) initial.categories = initial.categories.join(',')
        return !_.isEqual(current, initial)

        function pick ({ cuType, role, uri }) {
          return { cuType, role, uri }
        }
      },

      // gets the delta for an update request. That way we don't need to send the whole model
      getDelta () {
        if (this.view.options.mode !== 'edit') return this.model.toJSON()
        const self = this
        const data = this.model.toJSON()
        const delta = {
          id: this.initialModelData.id,
          folder: this.initialModelData.folder,
          timestamp: this.initialModelData.timestamp
        }
        const keys = _(data).keys()

        _(keys).each(function (key) {
        // endDate needs some special attention since it's one day off for allday appointments (for user convenience)
          if ((key === 'endDate' && util.isAllday(data) ? (self.view.tempEndDate && !_.isEqual(self.view.tempEndDate, self.initialModelData[key])) : (!_.isEqual(self.initialModelData[key], data[key]))) &&
          (self.initialModelData[key] || data[key])) {
            delta[key] = data[key]
          }
        })

        if (this.initialModelData.recurrenceId) {
          delta.recurrenceId = this.initialModelData.recurrenceId
          delta.seriesId = this.initialModelData.seriesId
        }

        return delta
      },

      // clean up model so no empty values are saved and dirty check has no false positives
      cleanUpModel () {
        const data = this.model.toJSON()
        const self = this

        _(data).each(function (value, key) {
        // if value is undefined, '' or null and the key is not in the initial model data, we can omit it
          if (!value && !_(self.initialModelData).has(key)) {
          // use silent or mini views add the attribute again with undefined value. We want to omit them here
            self.model.unset(key, { silent: true })
          }
        })
      },

      onShowWindow () {
        let array = []
        const signatureSequence = ['keyup', 'focus']

        function stopPointerEvents (e) {
          if (e.type === 'focus') array.push('focus')
          if (e.type === 'keyup') array.push('keyup')

          if (array.length === 2) {
            if (_.isEmpty(_.difference(signatureSequence, array))) {
              e.data.list.css('pointer-events', 'none')
            }
            array = []
          }

          self.getWindow().nodes.main.find('.control-group').on('mousemove', function () {
            e.data.list.css('pointer-events', 'auto')
          })
        }

        const self = this
        self.model.adjustEndDate = true
        if (self.model.get('summary')) {
          self.getWindow().setTitle(self.model.get('summary'))
          self.setTitle(self.model.get('summary'))
        }
        self.model.on('keyup:summary', function (value) {
          if (!value) value = self.model.get('id') ? gt('Edit appointment') : gt('Create appointment')

          self.getWindow().setTitle(value)
          self.setTitle(value)
        })

        // make window scrollable
        $(self.getWindow().nodes.main[0]).addClass('scrollable')

        // focus first input element
        // on mobile: opening animation of compose window and keyboard at the same time leads to inconsistent behaviour and wrong window positioning
        // therefore we wait for the animation to finish before setting focus to input field
        if (_.device('smartphone')) {
          const $window = self.view.$el.closest('.io-ox-calendar-edit-window')
          $window.one('transitionend', () => {
            $(self.getWindow().nodes.main).find('input')[0].focus()
            $(self.getWindow().nodes.main).scrollTop(0)
          })
        } else {
          $(self.getWindow().nodes.main).find('input')[0].focus()
        }

        const controlsBlock = $(self.getWindow().nodes.main).find('.controls')
        const list = controlsBlock.find('ul')
        const input = controlsBlock.find('input')

        input.on('keyup focus', { list }, stopPointerEvents)
      },

      onSave: function onSave (data) {
        const self = this
        if (data && data.conflicts) {
          ox.load(() => import('@/io.ox/calendar/conflicts/conflictList')).then(function ({ default: conflictView }) {
            conflictView.dialog(data.conflicts)
              .on('cancel', function () {
                self.getWindow().idle()

                // restore times (we add a day before saving allday appointments)
                if (self.view.tempEndDate) {
                  self.model.set('endDate', self.view.tempEndDate, { silent: true })
                  self.view.tempEndDate = null
                }
              })
              .on('ignore', function () {
                if (self.view.options.mode === 'create') {
                  api.create(
                    self.model,
                    _.extend(util.getCurrentRangeOptions(), {
                      usedGroups: self.model._attendees.usedGroups,
                      attachments: self.binaries || [],
                      checkConflicts: false
                    })
                  ).then(self.onSave, self.onError)
                } else {
                  api.update(
                    self.getDelta(),
                    _.extend(util.getCurrentRangeOptions(), {
                      attachments: self.binaries || [],
                      checkConflicts: false,
                      recurrenceRange: self.view.model.mode === 'thisandfuture' ? 'THISANDFUTURE' : undefined,
                      usedGroups: self.model._attendees.usedGroups,
                      showRecurrenceInfo: true
                    })
                  ).then(self.onSave, self.onError)
                }
              })
          })
          return
        }

        // update model with current data (omit undefined)
        if (data) this.model.set(_(data.toJSON()).omit(function (value) { return !value }))

        // needed for attachment uploads to work
        if (this.view.options.mode === 'create') {
          this.model.trigger('create')
          ox.trigger('appointment:create', this.model.get('attendeePrivileges') === 'MODIFY' ? 1 : 0)
        } else {
          this.model.trigger('update')
        }

        if (this.moveAfterSave) {
          api.move(this.model, this.moveAfterSave, util.getCurrentRangeOptions()).then(function () {
            delete self.moveAfterSave
            self.onSave()
          }, self.onError)
        } else {
          this.model.adjustEndDate = false
          this.considerSaved = true
          self.getWindow().idle()
          this.quit()
        }
      }.bind(app),

      onError: function onError (error) {
      // restore state of model attributes for moving
        if (this.moveAfterSave && this.model.get('folder') !== this.moveAfterSave) {
          this.model.set('folder', this.moveAfterSave, { silent: true })
        }
        delete this.moveAfterSave
        this.getWindow().idle()

        // restore times (we add a day before saving allday appointments)
        if (this.tempEndDate && self.tempStartDate) {
          this.model.set('endDate', this.tempEndDate)
          this.model.set('startDate', this.tempStartDate)
          this.tempEndDate = this.tempStartDate = null
        }
        // when to do what?
        // show validation errors inline -> don't yell
        // show server errors caused -> yell
        if (error) yell(error)
      }.bind(app),

      failSave () {
        // make sure latests data is actually in the model
        this.view.$el.find(document.activeElement).filter('input').trigger('change')
        if (this.model) {
          return {
            description: this.get('title') || gt('Appointment'),
            module: 'io.ox/calendar/edit',
            point: {
              data: this.model.attributes,
              action: this.model.mode,
              meta: { usedGroups: this.model._attendees.usedGroups },
              // save this so the dirty check works correctly after the restore
              initialModelData: this.initialModelData
            }
          }
        }
        return false
      },

      async failRestore (point) {
      // support for legacy restore points
        const data = point.data || point
        this.edit(data, {
          mode: _.isUndefined(data.id) ? 'create' : 'edit',
          initialModelData: point.initialModelData,
          action: point.action,
          usedGroups: point.meta ? point.meta.usedGroups : []
        })
      },

      getContextualHelp () {
        return 'ox.appsuite.user.sect.calendar.gui.create.html'
      }
    })
  })

  app.setQuit(function (options) {
    const isDiscard = options && options.type === 'discard'
    const model = this.model

    // trigger blur inputfields so the model has current data and the dirty check is correct
    $(document.activeElement).filter('input').trigger('change')
    this.cleanUpModel()
    // be gentle
    return new Promise((resolve, reject) => {
      if (this.getDirtyStatus()) {
        if (app.getWindow().floating) {
          app.getWindow().floating.toggle(true)
        } else if (_.device('smartphone')) {
          app.getWindow().resume()
        }
        new ModalDialog({
        // #. 'Discard changes' as header text of an appointment to confirm to discard changes via a modal dialog.
          title: gt('Discard changes'),
          description: gt('Do you really want to discard your changes?')
        })
        // #. "Discard changes" appears in combination with "Cancel" (this action)
        // #. Translation must be distinguishable for the user
          .addCancelButton()
          .addButton({ label: gt.pgettext('dialog', 'Discard changes'), action: 'delete' })
          .on('action', function (action) {
            if (action === 'delete') {
              if (isDiscard) model.trigger('discard')
              app.dispose()
              resolve()
            } else {
              reject(new Error('dirtyDialogDiscarded'))
            }
          })
          .open()
      } else {
      // just let it go
        if (isDiscard) model.trigger('discard')
        resolve()
      }
    })
  })

  return app
}

export default {
  getApp: createInstance,
  reuse (type, data) {
    if (type === 'edit') {
      return ox.ui.App.reuse('io.ox/calendar:edit.' + util.cid(data))
    }
  }
}
