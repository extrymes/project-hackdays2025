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
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/core/api/mailfilter'
import mailfilterModel from '@/io.ox/mail/mailfilter/settings/model'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'
import * as util from '@/io.ox/core/settings/util'
import * as settingsUtil from '@/io.ox/settings/util'
import FilterDetailView from '@/io.ox/mail/mailfilter/settings/filter/view-form'
import listUtils from '@/io.ox/backbone/mini-views/listutils'
import ListView from '@/io.ox/backbone/mini-views/settings-list-view'
import DisposableView from '@/io.ox/backbone/views/disposable'
import defaults from '@/io.ox/mail/mailfilter/settings/filter/defaults'
import picker from '@/io.ox/core/folder/picker'
import mailAPI from '@/io.ox/mail/api'
import '@/lib/jquery-ui.min.js'
import '@/io.ox/mail/mailfilter/settings/style.scss'
import { createIcon } from '@/io.ox/core/components'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

const factory = mailfilterModel.protectedMethods.buildFactory('io.ox/core/mailfilter/model', api)
const collection = factory.createCollection([])
collection.comparator = function (model) {
  return model.get('position')
}
collection.on('add remove reset', countAllCatchAllRedirects)
countAllCatchAllRedirects()

// counts all redirect actions that have no test (aka this rule matches every mail)
// There is a limit on how often a matching mail can be redirected. We cannot check this accurately in advance but catch all redirects can be checked.
// check OXUIB-2150 for more information
function countAllCatchAllRedirects () {
  collection.catchAllRedirects = collection.filter(rule => rule.get('test')?.id === 'true').map(rule => rule.get('actioncmds')).flat().filter(action => action.id === 'redirect').length
}
const notificationId = _.uniqueId('notification_')

function containsStop (actioncmds) {
  let stop = false
  _.each(actioncmds, function (action) {
    if (_.contains(['stop'], action.id)) {
      stop = true
    }
  })
  return stop
}

function updatePositionInCollection (collection, positionArray) {
  _.each(positionArray, function (key, val) {
    collection.get(key).set('position', val)
  })
  collection.sort()
}

function renderDetailView (evt, data, config) {
  const header = data.id === undefined ? gt('Create new rule') : gt('Edit rule')

  const checkForPosition = function (array, target) {
    let position
    _.each(array, function (val, index) {
      if (_.isEqual(val, target)) {
        position = index
      }
    })
    return position
  }

  const filterCondition = function (tests, condition) {
    const position = checkForPosition(tests, condition)
    if (position) {
      tests.splice(position, 1)
    }
    return tests
  }

  const myView = new FilterDetailView({
    model: data,
    listView: evt.data.listView,
    config,
    collection,
    conditionsTranslation: defaults.getConditionsTranslation(config),
    actionsTranslations: defaults.getActionsTranslations(config),
    defaults: {
      tests: defaults.getTests(config),
      conditionsMapping: defaults.getConditionsMapping(config),
      conditionsTranslation: defaults.getConditionsTranslation(config),
      conditionsOrder: defaults.getConditionsOrder(config),
      actions: defaults.getActions(config),
      actionsOrder: defaults.getActionsOrder(config),
      actionsTranslations: defaults.getActionsTranslations(config),
      actionCapabilities: defaults.getActionCapabilities(config)
    }
  })

  myView.model.set('config', config)

  if (myView.model.get('test').tests) {
    let conditionsCopy = myView.model.get('test')

    conditionsCopy.tests = filterCondition(conditionsCopy.tests, { id: 'true' })

    if (conditionsCopy.tests.length === 1) {
      const includedTest = _.copy(conditionsCopy.tests[0])
      conditionsCopy = includedTest
    }
    myView.model.set('test', conditionsCopy)
  }

  const testArray = _.copy(myView.model.get('test'), true)
  const actionArray = _.copy(myView.model.get('actioncmds'), true)
  const rulename = _.copy(myView.model.get('rulename'), true)

  const Dialog = ModalDialog.extend({
    // manipulating the focus renders the dialog dropdown menus dysfunctional
    pause () {
      // $(document).off('focusin', this.keepFocus);
      this.$el.next().hide()
      this.$el.toggleClass('hidden', true)
    },
    resume () {
      // $(document).on('focusin', $.proxy(this.keepFocus, this));
      this.$el.next().show()
      this.$el.toggleClass('hidden', false)
    }
  })

  myView.dialog = new Dialog({
    top: 60,
    width: 800,
    center: false,
    maximize: true,
    async: true,
    point: 'io.ox/settings/mailfilter/filter/settings/detail/dialog',
    title: header,
    help: data.id === undefined ? 'ox.appsuite.user.sect.email.mailfilter.create.html' : 'ox.appsuite.user.sect.email.mailfilter.change.html'
  })

  myView.dialog.$body.append(
    myView.render().el
  )

  if (defaults.applyMailFilterSupport) {
    myView.dialog.addAlternativeButton({
      label: gt('Save and apply rule now'),
      action: 'apply'
    })
  }

  myView.dialog
    .addCancelButton()
    .addButton({
      label: gt('Save'),
      action: 'save'
    })

  // disable save button if no action is set
  if (actionArray.length === 0) myView.dialog.$el.find('.modal-footer[data-action="save"]').prop('disabled', true)

  myView.dialog.open()
  myView.$el.find('input[name="rulename"]').focus()

  if (data.id === undefined) {
    myView.$el.find('input[name="rulename"]').trigger('select')
  }

  myView.collection = collection

  myView.dialog.on('save', function () {
    myView.onSave()
  })

  myView.dialog.on('apply', function () {
    myView.onApply()
  })

  myView.dialog.on('cancel', function () {
    // reset the model
    myView.model.set('test', testArray)
    myView.model.set('actioncmds', actionArray)
    myView.model.set('rulename', rulename)
  })
}

ext.point('io.ox/settings/mailfilter/filter/settings/detail').extend({
  index: 200,
  id: 'mailfiltersettings',
  draw (evt, config) {
    renderDetailView(evt, evt.data.obj, config)
  }
})

ext.point('io.ox/settings/mailfilter/filter/settings/actions/common').extend({
  index: 200,
  id: 'actions',
  draw (model, config) {
    const flag = (model.get('flags') || [])[0]
    const title = model.get('rulename')
    const applytoggle = gt('Apply')
    const texttoggle = model.get('active') ? gt('Disable') : gt('Enable')
    const actioncmds = model.get('actioncmds')
    const icon = containsStop(actioncmds) ? 'bi/exclamation-circle.svg' : 'bi/arrow-down.svg'
    let actionValue
    const applyToggle = flag === 'vacation' || flag === 'autoforward' || !defaults.applyMailFilterSupport ? [] : listUtils.applyToggle(applytoggle)

    if (applyToggle.length && model.get('actioncmds').some(action => config.options.blockedApplyActions.includes(action.id))) {
      applyToggle.addClass('disabled').attr({
        'data-action': '',
        'aria-disabled': true,
        title: gt('Actions of this filter rule are not allowed to be applied to existing mails.')
      })
    }

    if (flag === 'vacation') {
      actionValue = 'edit-vacation'
    } else if (flag === 'autoforward') {
      actionValue = 'edit-auto-forward'
    } else {
      actionValue = 'edit'
    }

    $(this).append(
      applyToggle,
      !_.device('smartphone')
        ? listUtils.controlsEdit({ ariaLabel: gt('Edit %1$s', title), action: actionValue })
        : '',
      listUtils.controlsToggle(texttoggle),
      listUtils.controlProcessSub({
        icon,
        title: gt('Process subsequent rules of %1$s', title)
      }),
      listUtils.controlsDelete({ ariaLabel: gt('Delete %1$s', title) })
    )
  }
})

ext.point('io.ox/settings/mailfilter/filter/settings/actions/unknown').extend({
  index: 200,
  id: 'actions',
  draw (model) {
    const title = model.get('rulename')
    $(this).append(
      listUtils.drawWarning(gt('This rule contains unsupported properties. ')),
      listUtils.controlsDelete({ ariaLabel: gt('Delete %1$s', title) })
    )
  }
})

ext.point('io.ox/settings/mailfilter/filter/settings/actions/vacation').extend({
  index: 200,
  id: 'actions',
  draw (model, config) {
    // redirect
    ext.point('io.ox/settings/mailfilter/filter/settings/actions/common')
      .invoke('draw', this, model, config)
  }
})

ext.point('io.ox/settings/mailfilter/filter/settings/actions/autoforward').extend({
  index: 200,
  id: 'actions',
  draw (model, config) {
    // redirect
    ext.point('io.ox/settings/mailfilter/filter/settings/actions/common')
      .invoke('draw', this, model, config)
  }
})

function updateProcessNextIcon (htmlTarget, isProcessingNext) {
  htmlTarget.replaceChildren()
  htmlTarget.append(createIcon(isProcessingNext ? 'bi/arrow-down.svg' : 'bi/exclamation-circle.svg').addClass('bi-18')[0])
}

export default {
  editMailfilter ($node, baton) {
    const createExtpointForSelectedFilter = function (node, args, config) {
      ext.point('io.ox/settings/mailfilter/filter/settings/detail').invoke('draw', node, args, config)
    }
    const self = this
    const scrollPane = $node.closest('.scrollable-pane')

    return this.initialize().then(function (data, config) {
      // adds test for testcase
      // config.tests.push({ test: 'newtest', comparison: ['regex', 'is', 'contains', 'matches', 'testValue'] });

      scrollPane.one('refresh:mailfilter', function () {
        self.refresh()
      })

      const FilterSettingsView = DisposableView.extend({

        tagName: 'li',
        className: 'settings-list-item',
        saveTimeout: 0,

        initialize () {
          if (_.indexOf(this.model.get('flags'), 'vacation') !== -1) this.listenTo(ox, 'mail:change:vacation-notice', this.handleToogleState)
          if (_.indexOf(this.model.get('flags'), 'autoforward') !== -1) this.listenTo(ox, 'mail:change:auto-forward', this.handleToogleState)
          this.listenTo(this.model, 'apply', function () {
            this.onApply()
          })
        },

        handleToogleState (model) {
          this.model.set('active', model.get('active'))
          this.toggleProcessSub(model.get('processSub'))
          this.render()
        },

        render () {
          if (this.disposed) return

          const model = this.model
          const flag = (model.get('flags') || [])[0]
          const actions = (model.get('actioncmds') || [])
          const testsPart = model.get('test')
          const supportColorFlags = settings.flagByColor

          function checkForUnknown () {
            let unknown = false

            function checkForColorFlags (a) {
              if (!a.flags) return
              return !supportColorFlags && (/\$cl_/g.test(a.flags[0]))
            }

            function collectIds (testsPart) {
              const idList = {}
              // is single test
              if (!testsPart.tests) {
                idList[testsPart.id] = true
              } else {
                _.each(testsPart.tests, function (value) {
                  if (!value.tests) {
                    idList[value.id] = true
                  } else {
                    // there is a nested test in the rule
                    if (!config.options.allowNestedTests) unknown = true
                    _.each(value.tests, function (value) {
                      idList[value.id] = true
                    })
                  }
                })
              }

              return idList
            }

            // is there an unsupported/disabled action?
            _.each(actions, function (action) {
              // in MW
              if (_.isEmpty(_.where(config.actioncmds, { id: action.id })) || checkForColorFlags(action)) unknown = true
              // in UI
              if ((!_.contains(['vacation', 'stop'], action.id) && _.isEmpty(_.where(defaults.getActions(config), { id: action.id }))) || checkForColorFlags(action)) unknown = true
            })

            // is there an unsupported/disabled test?
            _.each(collectIds(testsPart), function (value, key) {
              // in MW
              if (_.isEmpty(_.where(config.tests, { id: key }))) unknown = true
              // in UI
              if (_.isEmpty(_.where(defaults.getTests(config), { id: key }))) unknown = true
            })

            return unknown ? 'unknown' : undefined
          }

          function getEditableState () {
            return (checkForUnknown() === 'unknown' || _.contains(['autoforward', 'spam', 'vacation'], flag)) ? 'fixed' : 'editable'
          }

          const active = model.get('active')
          const title = model.get('rulename')
          const suffix = active ? '' : ` (${gt('Disabled')})`
          let titleNode

          this.$el.attr('data-id', model.get('id'))
            .addClass('flex-row items-center draggable ' + getEditableState())
            .attr('draggable', true)
            .toggleClass('active', active)
            .toggleClass('disabled', !active)
            .empty().append(
              listUtils.dragHandle(gt('Drag to reorder filter rules'), model.collection.length <= 1 ? 'hidden' : '').addClass('me-16'),
              titleNode = listUtils.makeTitle()
                .addClass('flex-grow me-16')
                .append($('<div class="truncate">').text(title + suffix)),
              listUtils.makeControls().append(function () {
                const point = ext.point('io.ox/settings/mailfilter/filter/settings/actions/' + (checkForUnknown() || flag || 'common'))
                point.invoke('draw', $(this), model, config)
              })
            )

          model.on('change:rulename', (el, val) => {
            titleNode.text(val)
          })

          model.on('ChangeProcessSub', (status) => {
            const target = this.$('[data-action="toggle-process-subsequent"]')
            updateProcessNextIcon(target[0], status)
          })

          return this
        },

        events: {
          'click [data-action="toggle"]': 'onToggle',
          'click [data-action="apply"]': 'onApply',
          'click [data-action="delete"]': 'onDelete',
          'click [data-action="edit"]': 'onEdit',
          'click [data-action="toggle-process-subsequent"]': 'onToggleProcessSub',
          'click [data-action="edit-vacation"]': 'onEditVacation',
          'click [data-action="edit-auto-forward"]': 'onEditAutoforward'
        },

        propagate (model) {
          if (_.indexOf(model.get('flags'), 'vacation') !== -1) {
            import('@/io.ox/mail/mailfilter/vacationnotice/model').then(function ({ default: Model }) {
              const vacationnoticeModel = new Model()
              vacationnoticeModel.set(model.toJSON())
              ox.trigger('mail:change:vacation-notice', vacationnoticeModel)
            })
          }

          if (_.indexOf(model.get('flags'), 'autoforward') !== -1) {
            import('@/io.ox/mail/mailfilter/autoforward/model').then(function ({ default: Model }) {
              const autoforwardModel = new Model()
              autoforwardModel.set(model.toJSON())
              ox.trigger('mail:change:auto-forward', autoforwardModel)
            })
          }
        },

        onToggle (event) {
          event.preventDefault()
          this.model.set('active', !this.model.get('active'))
          this.toggleDebounce(event)
        },

        toggleDebounce: _.debounce(function (event) {
          const self = this
          // yell on reject
          settingsUtil.yellOnReject(
            api.update(self.model).done(function () {
              self.$el.toggleClass('active', self.model.get('active'))
              self.$el.toggleClass('disabled', !self.model.get('active'))
              $(event.target).text(self.model.get('active') ? gt('Disable') : gt('Enable'))
              self.propagate(self.model)
            })
          )
        }, 300),

        onApply (event) {
          if (event) event.preventDefault()
          const self = this
          picker({
            async: true,
            context: 'filter',
            title: gt('Please select the folder to apply the rule to'),
            // #. 'Apply' as button text to confirm the chosen email folder where a new filter rule shall be applied to via a picker dialog.
            button: gt('Apply filter rule'),
            done (id, dialog) {
              dialog.close()
              const rule = self.$el.find('a[data-action="apply"]')
              rule.empty().append(
                createIcon('bi/arrow-clockwise.svg').addClass('animate-spin')
              )

              api.apply({ folderId: id, id: self.model.id }).then(function () {
                return mailAPI.expunge(id)
              }).fail(function (response) {
                rule.empty().text(gt('Apply'))
                yell('error', response.error)
              }).then(function () {
                // applied rule might have moved mails into folders or changed mails
                _(mailAPI.pool.getCollections()).forEach(function (o) {
                  o.collection.expire()
                })
                mailAPI.refresh()
                rule.empty().text(gt('Apply'))
              })
            },
            module: 'mail',
            root: '1',
            settings,
            persistent: 'folderpopup'
          })
        },

        onToggleProcessSub (e) {
          e.preventDefault()
          const processSubsequent = this.toggleProcessSub()
          settingsUtil.yellOnReject(
            api.update(this.model).done(function () {
              updateProcessNextIcon(e.target, processSubsequent)
            })
          )
        },

        toggleProcessSub (processSubsequent) {
          const actioncmds = this.model.get('actioncmds')
          const stop = containsStop(actioncmds)
          if (processSubsequent === undefined || processSubsequent === stop) {
            if (stop) actioncmds.pop(); else actioncmds.push({ id: 'stop' })
            this.model.set('actioncmds', actioncmds)
            processSubsequent = stop
          }
          return processSubsequent
        },

        onDelete (event) {
          event.preventDefault()

          // #. 'Delete filter rule' as a header of a modal dialog to confirm to delete a mail filter rule.
          new ModalDialog({ title: gt('Delete filter rule'), description: gt('Do you really want to delete this filter rule?') })
            .addCancelButton()
            .addButton({ label: gt('Delete'), action: 'delete' })
            .on('delete', function () {
              const view = this
              const model = this.model
              if (model.get('id') === false) return
              collection.remove(model)
              // yell on reject
              settingsUtil.yellOnReject(
                api.deleteRule(model.get('id')).done(function () {
                  // for proper handling in mail-settings/mail-list
                  view.propagate(model.set('active', false))
                  $node.find('.controls [data-action="add"]').focus()
                  const arrayOfFilters = $node.find('li[data-id]')
                  const data = _.map(arrayOfFilters, function (single) {
                    return parseInt($(single).attr('data-id'), 10)
                  })
                  // yell on reject
                  settingsUtil.yellOnReject(
                    api.reorder(data)
                  )
                  updatePositionInCollection(collection, data)
                })
              )
            }.bind(this))
            .open()
        },

        onEdit (event) {
          event.preventDefault()
          const self = this
          event.data = {}
          event.data.id = self.model.get('id')
          event.data.obj = self.model
          event.data.listView = this
          createExtpointForSelectedFilter(this.$el.parent(), event, config)
        },

        onEditVacation (event) {
          event.preventDefault()
          import('@/io.ox/mail/mailfilter/vacationnotice/view').then(function ({ default: view }) {
            view.open()
          })
        },

        onEditAutoforward (event) {
          event.preventDefault()
          const target = event.target.parentElement.querySelector('[data-action="toggle-process-subsequent"]')
          import('@/io.ox/mail/mailfilter/autoforward/view').then(async ({ default: view }) => {
            const modal = await view.open()
            modal.on('updateProcessNext', status => updateProcessNextIcon(target, status))
          })
        }
      })

      const MailfilterEdit = Backbone.View.extend({

        initialize () {
          this.collection = collection
          this.listenTo(ox, 'refresh^', this.onRefresh)
          this.listenTo(ox, 'app:start app:resume', function (data) { this.handleRefresh(data) })
          this.$el.on('dispose', function () { this.stopListening(ox, 'app:start app:resume') }.bind(this))
        },

        onRefresh () {
          self.refresh()
        },

        handleRefresh (data) {
          if (data.attributes.name !== baton.tree?.app?.attributes?.name) {
            this.stopListening(ox, 'refresh^')
          } else {
            this.listenTo(ox, 'refresh^', this.onRefresh)
          }
        },

        render () {
          this.$el.empty()
          const $group = $('<div class="form-group mb-24">')
          if (!_.device('smartphone')) {
            this.$el.append(
              util.explanation(
                gt('Rules provide you with the power to effortlessly organize and streamline your email inbox, enabling actions like automatically moving emails from specific senders to designated folders, deleting or marking them as read, or forwarding them to another email address.'),
                'ox.appsuite.user.sect.email.mailfilter.html'
              ).addClass('mb-24')
            )
            $group.append(
              $('<button type="button" class="btn btn-primary me-16" data-action="add">')
                .text(gt('Add new rule'))
            )
          }
          ext.point('io.ox/mail/settings/rules/buttons').invoke('render', $group, baton)
          this.$el.append(
            $group,
            $('<div class="sr-only" role="log" aria-live="polite" aria-relevant="all">').attr('id', notificationId)
          )
          this.renderFilter()
          return this
        },

        handleEmptynotice () {
          if (this.collection.length === 0) {
            this.$el.append($('<div class="hint">').text(gt('There is no rule defined')))
          } else {
            this.$el.find('.hint').remove()
          }
        },

        renderFilter () {
          this.handleEmptynotice()

          this.listenTo(this.collection, 'add remove', this.handleEmptynotice.bind(this))
          this.listenTo(ox, 'mail:change:vacation-notice mail:change:auto-forward', this.onRefresh.bind(this))

          this.$el.append(new ListView({
            collection: this.collection,
            sortable: true,
            containment: this.$el,
            notification: this.$('#' + notificationId),
            ChildView: FilterSettingsView
          }).on('order:changed', function () {
            const arrayOfFilters = $node.find('li[data-id]')
            const data = _.map(arrayOfFilters, function (single) {
              return parseInt($(single).attr('data-id'), 10)
            })

            // yell on reject
            settingsUtil.yellOnReject(
              api.reorder(data)
            )
            updatePositionInCollection(collection, data)
          }).render().$el.addClass('mb-24'))
        },

        events: {
          'click [data-action="add"]': 'onAdd'
        },

        onAdd (args) {
          args.data = {
            listView: this,
            obj: factory.create(mailfilterModel.protectedMethods.provideEmptyModel())
          }
          createExtpointForSelectedFilter(this.el, args, config)
        }

      })

      const mailFilter = new MailfilterEdit()

      $node.append(mailFilter.render().$el)
      return collection
    })
  },

  initialize () {
    // needed for mail actions
    const options = {
      api,
      model: mailfilterModel,
      filterDefaults: defaults
    }

    return $.when(api.getRules().done(function (data) {
      collection.reset()
      _(data).each(function (rule) {
        collection.add(factory.create(rule), { merge: true })
      })
    }), api.getConfig(), options)
  },

  refresh () { this.initialize() }
}
