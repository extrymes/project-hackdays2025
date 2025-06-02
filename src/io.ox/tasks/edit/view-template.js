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

import views from '@/io.ox/backbone/views'
import upload from '@/io.ox/core/tk/upload'
import yell from '@/io.ox/core/yell'
import mini from '@/io.ox/backbone/mini-views'
import DatePicker from '@/io.ox/backbone/mini-views/datepicker'
import * as util from '@/io.ox/tasks/edit/util'
import RecurrenceView from '@/io.ox/backbone/views/recurrence-view'
import AddParticipantView from '@/io.ox/participants/add'
import pViews from '@/io.ox/participants/views'
import ext from '@/io.ox/core/extensions'
import * as taskUtil from '@/io.ox/tasks/util'
import folderAPI from '@/io.ox/core/folder/api'
import { CategoryBadgesView, CategoryDropdown } from '@/io.ox/core/categories/view'
import { getCategoriesFromModel } from '@/io.ox/core/categories/api'
import { AttachmentCollection, AttachmentListView, AttachmentUploadView, AttachmentDriveUploadView } from '@/io.ox/backbone/mini-views/attachments'
import moment from '@open-xchange/moment'
import WindowActionButtonsView from '@/io.ox/core/window-action-buttons-view'

import { settings } from '@/io.ox/tasks/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import gt from 'gettext'

const point = views.point('io.ox/tasks/edit/view')

point.basicExtend({
  index: 100,
  id: 'dnd',
  draw (baton) {
    this.append(
      new upload.dnd.FloatingDropzone({
        app: baton.app,
        point: 'io.ox/tasks/edit/dnd/actions'
      }).render().$el
    )
  }
})

// headline
point.basicExtend({
  id: 'headline',
  index: 100,
  row: '0',
  draw (baton) {
    let saveBtnText = gt('Create')
    let headline, saveBtn
    const app = baton.app
    if (baton.model.attributes.id) saveBtnText = gt('Save')

    app.getWindow().setHeader(new WindowActionButtonsView({
      app,
      saveTitle: saveBtnText,
      onSave () {
        app.getWindow().busy()
        util.sanitizeBeforeSave(baton)
        baton.model.saving = true
        baton.model.save().done(function () {
          delete baton.model.saving
          app.markClean()
          app.quit()
        }).fail(function (response) {
          setTimeout(function () {
            delete baton.model.saving
            app.getWindow().idle()
            yell(response)
          }, 300)
        })
      }
    }).render().$el)

    baton.parentView.on('changeMode', function (e, mode) {
      if (mode === 'edit') {
        headline.text(gt('Edit task'))
        saveBtn.text(gt('Save'))
      } else {
        headline.text(gt('Create task'))
        saveBtn.text(gt('Create'))
      }
    })
  }
})

// title
point.extend({
  id: 'title',
  index: 200,
  className: 'col-sm-12',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label">').text(gt('Subject')).attr({ for: guid }),
      new mini.InputView({ name: 'title', model: this.model, mandatory: true }).render().$el.attr({ id: guid }).addClass('title-field')
    )
  }
}, { row: '1' })

// note
point.extend({
  id: 'note',
  index: 300,
  className: 'col-sm-12',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label">').text(gt('Description')).attr({ for: guid }),
      new mini.TextView({ name: 'note', model: this.model }).render().$el.attr({ id: guid }).addClass('note-field')
    )
  }
}, { row: '2' })

point.basicExtend({
  id: 'expand_link',
  index: 400,
  row: '3',
  draw (baton) {
    let text = gt('Collapse form')

    if (baton.parentView.collapsed) {
      text = gt('Expand form')
    }
    this.append(
      $('<div class="col-lg-12">').append(
        $('<button type="button" class="btn btn-link expand-link mt-8 mb-8 pl-0">').attr('aria-expanded', !baton.parentView.collapsed).text(text)
          .on('click', function () {
            baton.parentView.collapsed = !baton.parentView.collapsed
            baton.parentView.$el.toggleClass('expanded', !baton.parentView.collapsed)
            $(this).attr('aria-expanded', !baton.parentView.collapsed).text((baton.parentView.collapsed ? gt('Expand form') : gt('Collapse form')))
          })
      )
    )
  }
})

// helper functions so we keep the input fields correct when a fulltime switch happens. We need to convert utc to local timezone but at the same time keep the input the same (utc acts as no timezone here).

// takes the attribute as local time and converts it to iso format without any time information, then we put the same date in utc time => converted from any other timezone to utc without calculating offsets etc
function convertToFulltime (model, attribute) {
  model.set(attribute, moment.utc(moment.tz(model.get(attribute), model.get('timezone')).format('YYYY-MM-DD')).valueOf())
}

// takes the attribute as utc and converts it to iso format without any time information, then we put the same date in local time => converted from utc to any other timezone without calculating offsets etc
function convertFromFulltime (model, attribute) {
  model.set(attribute, moment.tz(moment.utc(model.get(attribute)).format('YYYY-MM-DD'), model.get('timezone')).valueOf())
}

point.basicExtend({
  id: 'start_date',
  index: 500,
  row: '4',
  draw (baton) {
    this.append(
      new DatePicker({
        model: baton.model,
        className: 'col-sm-6 col-xs-12 collapsible',
        attribute: 'start_time',
        label: gt('Start date'),
        clearButton: true,
        display: baton.model.get('full_time') ? 'DATE' : 'DATETIME'
      }).listenTo(baton.model, 'change:full_time', function (model, fulltime) {
        this.toggleTimeInput(!fulltime)
        // exact check to support timestamp 0
        if (this.model.get('start_time') === null || this.model.get('start_time') === undefined) return
        (fulltime ? convertToFulltime : convertFromFulltime)(model, 'start_time')
      }).on('click:time', function () {
        const target = this.$el.find('.dropdown-menu.calendaredit')
        const container = target.scrollParent()
        const pos = target.offset().top - container.offset().top

        if ((pos < 0) || (pos + target.height() > container.height())) {
          // scroll to Node, leave 16px offset
          container.scrollTop(container.scrollTop() + pos - 16)
        }
      }).render().$el.attr('data-extension-id', 'start_time')
    )
  }
})

point.basicExtend({
  id: 'end_date',
  index: 600,
  row: '4',
  draw (baton) {
    this.append(
      new DatePicker({
        model: baton.model,
        className: 'col-sm-6 col-xs-12 collapsible',
        attribute: 'end_time',
        label: gt('Due date'),
        clearButton: true,
        display: baton.model.get('full_time') ? 'DATE' : 'DATETIME'
      }).listenTo(baton.model, 'change:full_time', function (model, fulltime) {
        this.toggleTimeInput(!fulltime)
        // exact check to support timestamp 0
        if (this.model.get('end_time') === null || this.model.get('end_time') === undefined) return
        (fulltime ? convertToFulltime : convertFromFulltime)(model, 'end_time')
      }).on('click:time', function () {
        const target = this.$el.find('.dropdown-menu.calendaredit')
        const container = target.scrollParent()
        const pos = target.offset().top - container.offset().top

        if ((pos < 0) || (pos + target.height() > container.height())) {
          // scroll to Node, leave 16px offset
          container.scrollTop(container.scrollTop() + pos - 16)
        }
      }).render().$el.attr('data-extension-id', 'end_time')
    )
  }
})

// full time
point.extend({
  id: 'full_time',
  index: 700,
  className: 'col-md-6 collapsible',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      new mini.CustomCheckboxView({ id: guid, name: 'full_time', label: gt('All day'), model: this.model }).render().$el
    )
  }
}, { row: '5' })

point.extend({
  id: 'recurrence',
  className: 'col-xs-12 collapsible',
  tabindex: 0,
  index: 800,
  render () {
    this.$el.append(new RecurrenceView({
      model: this.model
    }).render().$el)
    this.$el.find('.recurrence-view checkbox').attr('tabindex', 0)
  }
}, { row: 6 })

// reminder selection
point.basicExtend({
  id: 'alarm_select',
  index: 900,
  row: '7',
  draw (baton) {
    let selector
    this.append(
      $('<div class="col-sm-6 collapsible">').append(
        $('<label for="task-edit-reminder-select">').text(gt('Reminder')),
        selector = $('<select id="task-edit-reminder-select" class="form-control">')
          .append($('<option>')
          // #. Text that is displayed in a select box for task reminders, when the user does not use a predefined time, like in 15minutes
            .text(gt('Manual input')), taskUtil.buildDropdownMenu(),
          $('<option>').text(gt('No reminder')))
          .on('change', function () {
            if (selector.prop('selectedIndex') === 0) {
              // manual input selected, change nothing
            } else if (selector.prop('selectedIndex') === selector.prop('length') - 1) {
              // no Reminder Selected, remove reminder
              baton.model.set('alarm', null, { validate: true, setBy: 'selectbox' })
            } else {
              // set to correct time
              baton.model.set('alarm', taskUtil.computePopupTime(selector.val()).alarmDate, { validate: true, setBy: 'selectbox' })
            }
          })
      )
    )
    baton.model.on('change:alarm', function (model, value, options) {
      // no need to update the selectbox if the new value was set by it (avoid infinite loop)
      if (options.setBy !== 'selectbox') {
        if (_.isNull(value)) {
          // set to no reminder
          selector.prop('selectedIndex', selector.prop('length') - 1)
        } else {
          // set to manual input
          selector.prop('selectedIndex', 0)
        }
      }
    })
    if (!baton.model.get('alarm')) {
      // set to no reminder
      selector.prop('selectedIndex', selector.prop('length') - 1)
    }
  }
})

// reminder date
point.basicExtend({
  id: 'alarm',
  index: 1000,
  row: '7',
  draw (baton) {
    this.append(
      new DatePicker({
        model: baton.model,
        display: 'DATETIME',
        ignoreToggle: true,
        className: 'col-xs-12 col-sm-6 collapsible',
        attribute: 'alarm',
        label: gt('Reminder date'),
        clearButton: true
      }).on('click:time', function () {
        const target = this.$el.find('.dropdown-menu.calendaredit')
        const container = target.scrollParent()
        const pos = target.offset().top - container.offset().top

        if ((pos < 0) || (pos + target.height() > container.height())) {
          // scroll to Node, leave 16px offset
          container.scrollTop(container.scrollTop() + pos - 16)
        }
      }).render().$el.attr('data-extension-id', 'alarm')
    )
  }
})

// status
point.extend({
  id: 'status',
  index: 1100,
  className: 'col-sm-3 collapsible',
  render () {
    const guid = _.uniqueId('form-control-label-')
    const self = this
    const options = [
      { label: gt('Not started'), value: 1 },
      { label: gt('In progress'), value: 2 },
      { label: gt('Done'), value: 3 },
      { label: gt('Waiting'), value: 4 },
      { label: gt('Deferred'), value: 5 }
    ]; let selectInput
    this.$el.append(
      $('<label class="control-label">').attr('for', guid).text(gt('Status')),
      $('<div>').append(
        selectInput = new mini.SelectView({
          list: options,
          name: 'status',
          model: this.baton.model,
          id: guid,
          className: 'form-control'
        }).render().$el
      )
    )
    selectInput.on('change', function () {
      if ($(this).prop('selectedIndex') === 0) {
        self.model.set('percent_completed', 0, { validate: true })
      } else if ($(this).prop('selectedIndex') === 2) {
        self.model.set('percent_completed', 100, { validate: true })
      } else if ($(this).prop('selectedIndex') === 1 && (self.model.get('percent_completed') === 0 || self.model.get('percent_completed') === 100)) {
        self.model.set('percent_completed', 25, { validate: true })
      }
    })
  }
}, { row: '8' })

point.basicExtend({
  id: 'progress',
  index: 1200,
  row: '8',
  draw (baton) {
    const progressField = util.buildProgress(baton.model.get('percent_completed'))
    this.append(
      $('<div class="col-sm-3 collapsible">').append(
        $('<label for="task-edit-progress-field">').text(gt('Progress in %')), $(progressField.wrapper)
          .val(baton.model.get('percent_completed'))
          .on('change', function () {
            const value = $.trim(progressField.progress.val()).replace(/\s*%$/, '')
            const valid = /^\d+$/.test(value)
            const number = parseInt(value, 10)
            if (valid && number >= 0 && number <= 100) {
              if (number === 0 && baton.model.get('status') === 2) {
                baton.model.set('status', 1, { validate: true })
              } else if (number === 100 && baton.model.get('status') !== 3) {
                baton.model.set('status', 3, { validate: true })
              } else if (baton.model.get('status') === 3) {
                baton.model.set('status', 2, { validate: true })
              } else if (baton.model.get('status') === 1) {
                baton.model.set('status', 2, { validate: true })
              }
              baton.model.set('percent_completed', number, { validate: true })
            } else {
              yell('error', gt('Please enter value between 0 and 100.'))
              baton.model.trigger('change:percent_completed')
            }
          })
      )
    )
    baton.model.on('change:percent_completed', function () {
      progressField.progress.val(baton.model.get('percent_completed'))
    })
  }
})

// priority
point.extend({
  id: 'priority',
  index: 1300,
  className: 'col-sm-3 collapsible',
  render () {
    const guid = _.uniqueId('form-control-label-')
    const options = [
      { label: gt.pgettext('Tasks priority', 'None'), value: 'null' },
      { label: gt.pgettext('Tasks priority', 'Low'), value: 1 },
      { label: gt.pgettext('Tasks priority', 'Medium'), value: 2 },
      { label: gt.pgettext('Tasks priority', 'High'), value: 3 }
    ]; let selectbox
    this.$el.append(
      $('<label>').attr({
        class: 'control-label',
        for: guid
      }).text(gt.pgettext('Tasks', 'Priority')),
      $('<div>').append(
        selectbox = new mini.SelectView({
          list: options,
          name: 'priority',
          model: this.baton.model,
          id: guid,
          className: 'form-control'
        }).render().$el
      )
    )
    if (!this.baton.model.get('priority')) {
      selectbox.find('option').first().attr('selected', 'selected')
    }
  }
}, { row: '8' })

// privateflag
point.extend({
  id: 'private_flag',
  index: 1400,
  className: 'col-sm-3 collapsible',
  render () {
    // private flag only works in private folders
    const folderId = this.model.get('folder_id')
    if (!folderAPI.pool.getModel(folderId).is('private')) return
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<fieldset>').append(
        $('<legend class="simple">').text(gt('Type')),
        new mini.CustomCheckboxView({ id: guid, name: 'private_flag', label: gt('Private'), model: this.model }).render().$el
      )
    )
  }
}, { row: '8' })

// categories
point.basicExtend({
  id: 'categories',
  index: 1500,
  className: 'col-sm-6 collapsible',
  row: '9',
  draw (baton) {
    if (!coreSettings.get('features/categories', false)) return

    const pimId = 'task' + baton.model.get('id')
    const pimCategories = getCategoriesFromModel(baton.model.get('categories'), pimId)
    const categoryBadges = new CategoryBadgesView({ collection: pimCategories, removable: true })

    const categoriesDropdown = new CategoryDropdown({
      pimId,
      pimModel: baton.model,
      pimCategories,
      caret: true,
      label: gt('Add category'),
      buttonToggle: true,
      useToggleWidth: true
    })

    this.append(
      $('<fieldset class="col-xs-6 collapsible categoriesrow">')
        .append(
          $('<legend class="simple">').text(gt('Categories')),
          $('<div class="category-dropdown-wrapper">').append(
            categoriesDropdown.el
          )
        )
    )
    this.after(
      $('<div class="row">').append(
        $('<div class="col-xs-12 collapsible">').append(
          categoryBadges.render().$el
        )
      ))
  }
})

point.basicExtend({
  id: 'participants_list',
  index: 1600,
  row: '10',
  draw (baton) {
    this.append(
      new pViews.UserContainer({
        collection: baton.model.getParticipants(),
        baton,
        empty: gt('This task has no participants yet')
      }).render().$el.addClass('collapsible')
    )
  }
})

point.basicExtend({
  id: 'add_participant',
  index: 1700,
  className: 'row',
  row: '11',
  draw (baton) {
    const view = new AddParticipantView({
      apiOptions: {
        contacts: true,
        users: true,
        groups: true,
        resources: false,
        distributionlists: true
      },
      placeholder: `${gt('Add contact')} \u2026`,
      label: gt('Add contact'),
      collection: baton.model.getParticipants()
    })
    this.append(
      view.$el
    )
    view.render().$el.addClass('col-md-12 collapsible')
    view.$el.find('input.add-participant')
      .addClass('task-participant-input-field')
      .attr('aria-label', gt('Add contact'))

    view.typeahead.on('typeahead-custom:dropdown-rendered', function () {
      const target = view.$el.find('.tt-dropdown-menu')
      const container = target.scrollParent()
      const pos = target.offset().top - container.offset().top

      if (!target.is(':visible')) {
        return
      }

      if ((pos < 0) || (pos + target.height() > container.height())) {
        // scroll to Node, leave 16px offset
        container.scrollTop(container.scrollTop() + pos - 16)
      }
    })
  }
})

// Attachments

// attachments label
point.extend({
  id: 'attachments_legend',
  index: 1800,
  className: 'col-md-12 collapsible',
  render () {
    this.$el.append(
      $('<fieldset>').append(
        $('<legend class="mb-12">').text(gt('Attachments'))
      )
    )
  }
}, { row: '12' })

point.basicExtend({
  id: 'attachment_upload',
  index: 2000,
  row: '14',
  draw (baton) {
    const model = baton.model
    const collection = baton.attachments = new AttachmentCollection()

    const listView = new AttachmentListView({ collection, model, module: 4 })
    const uploadView = new AttachmentUploadView({ collection, model })
    const driveUploadView = new AttachmentDriveUploadView({ collection, model })

    this.append(
      $('<div class="section col-md-12 collapsible">').attr('data-section', 'attachments').append(
        listView.render().$el,
        $('<div class="attachment-list-actions flex-row">').append(
          uploadView.render().$el,
          driveUploadView.render().$el
        )
      )
    )

    baton.app.listenTo(model, 'create update', data => {
      model.set(data)
      listView.save()
    })
  }
})

point.basicExtend({
  id: 'expand_detail_link',
  index: 2100,
  row: '15',
  draw (baton) {
    let text = gt('Hide details')
    if (baton.parentView.detailsCollapsed) {
      text = gt('Show details')
    }
    this.append(
      $('<div class="col-lg-12 collapsible">').append(
        $('<button type="button" class="btn btn-link expand-details-link mt-8 mb-8 pl-0">').attr('aria-expanded', !baton.parentView.detailsCollapsed).text(text)
          .on('click', function () {
            baton.parentView.detailsCollapsed = !baton.parentView.detailsCollapsed
            baton.parentView.$el.toggleClass('details-expanded', !baton.parentView.detailsCollapsed)
            $(this).attr('aria-expanded', !baton.parentView.detailsCollapsed).text((baton.parentView.detailsCollapsed ? gt('Show details') : gt('Hide details')))
          })
      )
    )
  }
})

// estimated duration
point.extend({
  id: 'target_duration',
  index: 2200,
  className: 'col-sm-6 task-edit-details',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label">').text(gt('Estimated duration in minutes')).attr({ for: guid }),
      new mini.InputView({ name: 'target_duration', model: this.model }).render().$el.attr({ id: guid }),
      new mini.ErrorView({ name: 'target_duration', model: this.model }).render().$el
    )
  }
}, { row: '16' })

// actual duration
point.extend({
  id: 'actual_duration',
  index: 2300,
  className: 'col-sm-6 task-edit-details',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label">').text(gt('Actual duration in minutes')).attr({ for: guid }),
      new mini.InputView({ name: 'actual_duration', model: this.model }).render().$el.attr({ id: guid }),
      new mini.ErrorView({ name: 'actual_duration', model: this.model }).render().$el
    )
  }
}, { row: '16' })

// estimated costs
point.extend({
  id: 'target_costs',
  index: 2400,
  className: 'col-sm-6 task-edit-details',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label">').text(gt('Estimated costs')).attr({ for: guid }),
      new mini.InputView({ name: 'target_costs', model: this.model }).render().$el.attr({ id: guid }),
      new mini.ErrorView({ name: 'target_costs', model: this.model }).render().$el
    )
  }
}, { row: '17' })

// actual costs
point.extend({
  id: 'actual_costs',
  index: 2500,
  className: 'col-sm-4 task-edit-details',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label">').text(gt('Actual costs')).attr({ for: guid }),
      new mini.InputView({ name: 'actual_costs', model: this.model }).render().$el.attr({ id: guid }),
      new mini.ErrorView({ name: 'actual_costs', model: this.model }).render().$el
    )
  }
}, { row: '17' })

// currency
point.extend({
  id: 'currency',
  index: 2600,
  className: 'col-sm-2 task-edit-details',
  render () {
    const guid = _.uniqueId('form-control-label-')
    let currencies = settings.get('currencies', ['BRL', 'CAD', 'CHF', 'DKK', 'EUR', 'GBP', 'JPY', 'MXN', 'PLN', 'RMB', 'RUB', 'SEK', 'USD'])
    // convenience: support string of comma separated values
    currencies = _.isString(currencies) ? currencies.split(',') : currencies
    currencies.unshift('')
    this.$el.append(
      $('<label>').attr({
        class: 'control-label',
        for: guid
      }).text(gt('Currency')),
      $('<div>').append(
        new mini.SelectView({
          list: currencies.map((key) => { return { label: key, value: key } }),
          name: 'currency',
          model: this.baton.model,
          id: guid,
          className: 'form-control'
        }).render().$el
      )
    )
  }
}, { row: '17' })

// distance
point.extend({
  id: 'trip_meter',
  index: 2700,
  className: 'col-sm-12 task-edit-details',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label">').text(gt('Distance')).attr({ for: guid }),
      new mini.InputView({ name: 'trip_meter', model: this.model }).render().$el.attr({ id: guid })
    )
  }
}, { row: '18' })

// billing information
point.extend({
  id: 'billing_information',
  index: 2800,
  className: 'col-sm-12 task-edit-details',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label">').text(gt('Billing information')).attr({ for: guid }),
      new mini.InputView({ name: 'billing_information', model: this.model }).render().$el.attr({ id: guid })
    )
  }
}, { row: '19' })

// companies
point.extend({
  id: 'companies',
  index: 2900,
  className: 'col-sm-12 task-edit-details',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label">').text(gt('Companies')).attr({ for: guid }),
      new mini.InputView({ name: 'companies', model: this.model }).render().$el.attr({ id: guid })
    )
  }
}, { row: '20' })

ext.point('io.ox/tasks/edit/dnd/actions').extend({
  id: 'attachment',
  index: 100,
  label: gt('Drop here to upload a <b class="dndignore">new attachment</b>'),
  multiple: (files, app) => {
    const baton = app.view.baton;
    [...files].forEach((fileData) => baton.attachments.add(fileData, { parse: true }))
    if (baton.parentView.collapsed) app.view.$('.expand-link').trigger('click')
  }
})
