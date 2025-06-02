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
import Wizard from '@/io.ox/core/tk/wizard'
import config from '@/io.ox/onboarding/clients/config'
import ext from '@/io.ox/core/extensions'
import capabilities from '@/io.ox/core/capabilities'
import yellNotification from '@/io.ox/core/yell'
import '@/io.ox/onboarding/clients/views'
import '@/io.ox/onboarding/clients/style.scss'
import { createIcon } from '@/io.ox/core/components'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

// deeplink example:
// &reg=client-onboarding&regopt=platform:apple,device:apple.iphone,scenario:mailappinstall

const POINT = 'io.ox/onboarding/clients/views'
// #. title for 1st and snd step of the client onboarding wizard
// #. users can configure their devices to access/sync appsuites data (f.e. install ox mail app)
// #. %1$s the product name
// #, c-format
const titleLabel = gt('Take %1$s with you! Stay up-to-date on your favorite devices.', ox.serverConfig.productName)
let initiate

function yell () {
  const args = arguments
  yellNotification.apply(undefined, args)
}

const options = {

  _getListItems (type, list) {
    return _.chain(list)
      .filter(_.partial(options._getValid, _, type))
      .map(options._getListItem)
      .value()
  },

  _getListItem (obj) {
    return $('<li class="option">')
      .attr('data-value', obj.id)
      .attr('data-missing-capabilities', obj.missing_capabilities)
      .append(options._getLink(obj))
  },

  // back button
  _getListItemBack (type) {
    if (!_.contains(['device', 'scenario'], type)) return
    // tabindex needed (wizard tabtrap)
    return $('<li class="option centered" data-value="back">').append(
      $('<button class="link box navigation" role="menuitem">').append(
        $('<div class="icon-list">').append(options._getIcons('bi/chevron-left.svg')),
        // a11y
        options._getTitle({ title: gt('back') }).addClass('sr-only')
      )
    )
  },

  _getLink (obj) {
    // tabindex needed (wizard tabtrap)
    return $('<button class="link box" role="menuitem">')
      .addClass(obj.enabled ? '' : 'disabled')
      .append(
        options._getPremium(obj),
        options._getIcons(obj.icon),
        options._getTitle(obj)
      )
  },

  _getPremium (obj) {
    if (obj.enabled) return
    if (!settings.get('features/upsell/client.onboarding/enabled', true)) return
    const container = $('<div class="premium-container">'); let textnode
    const color = settings.get('features/upsell/client.onboarding/color')
    // hierarchy
    container.append(
      $('<div class="premium">').append(
        textnode = $('<span>').text(gt('Premium')),
        createIcon('bi/star.svg')
      )
    )
    // custom icon/color
    if (color) textnode.css('color', color)
    return container
  },

  _getTitle (obj) {
    obj = obj || {}
    return $('<div class="title">').text(obj.title || obj.name || obj.id || '\xa0')
  },

  _getIcons (icon) {
    const list = [].concat(icon)
    return $('<div class="icon-list">')
      .append(
        _.map(list, function (svgIcon) {
          return createIcon(svgIcon)
        })
      )
  },

  _getValid (obj, type) {
    if (type !== 'device') return true
    return obj.scenarios.length > 0
  },

  getNode (type, list) {
    return $('<ul class="options" role="menu">')
      .append(
        options._getListItemBack(type),
        options._getListItems(type, list)
      )
  }
}

//
// Platform & device
//

function onSelect (e) {
  e.preventDefault()
  const value = $(e.currentTarget).closest('li').attr('data-value')
  const wizard = this.parent
  const type = this.$el.attr('data-type')
  // back button
  if (value === 'back') {
    // remove value set within previous step
    wizard.model.unset('platform')
    return wizard.trigger('step:back')
  }
  // update model
  this.parent.model.set(type, value)
  wizard.trigger(type + ':select', value)
  this.trigger('next')
}

function focus () {
  this.$('.wizard-content').find('button[tabindex!="-1"][disabled!="disabled"]:not(.navigation):visible:first').focus()
}

function drawPlatforms () {
  const config = this.parent.config
  const descriptionId = _.uniqueId('description')
  // title
  this.$('.wizard-title').text(titleLabel)
  // content
  this.$('.wizard-content').empty()
    .addClass('onboarding-platform')
    .append(
      options.getNode('platform', config.getPlatforms())
        .on('click', 'button', onSelect.bind(this)),
      // #. user can choose between windows, android, apple (usually)
      $('<p class="teaser">').attr('id', descriptionId).text(gt('Please select the platform of your device.'))
    )
  // a11y
  this.$el.attr('aria-labelledby', descriptionId + '  dialog-title')
  this.$('.link').attr('aria-describedby', descriptionId)
  this.$('.options').attr('aria-label', gt('list of available platforms'))
}

function drawDevices () {
  const config = this.parent.config
  const list = config.getDevices()
  const descriptionId = _.uniqueId('description')
  // title
  this.$('.wizard-title').text(titleLabel)
  // content
  this.$('.wizard-content').empty()
    .append(
      options.getNode('device', list)
        .on('click', 'button', onSelect.bind(this)),
      // #. user can choose between smartphone, tablet and laptop/desktop (usually)
      $('<p class="teaser">').attr('id', descriptionId).text(gt('What type of device do you want to configure?'))
    )
  // a11y
  this.$el.attr('aria-labelledby', descriptionId + '  dialog-title')
  this.$('.link').attr('aria-describedby', descriptionId)
  this.$('.options').attr('aria-label', gt('list of available devices'))
  this.$('.title.sr-only').text(gt('choose a different platform'))
}

//
// Scenario
//

function select (e) {
  e.preventDefault()
  const node = $(e.target)
  const data = e.data
  const wizard = data.wizard
  const container = node.closest('[data-type]')
  const type = container.attr('data-type')
  const value = node.closest('[data-value]').attr('data-value')
  // disabled with upsell
  if (node.closest('.link').find('.premium').length) return wizard.trigger('scenario:upsell', e)
  // just disabled
  if (node.closest('.link').hasClass('disabled')) return
  // back
  if (value === 'back') {
    // remove value set within previous step
    wizard.model.unset('device')
    wizard.model.unset('scenario')
    return wizard.trigger('step:back')
  }
  wizard.trigger('scenario:select', value)
  wizard.trigger('selected', { type, value })
}

function drawScenarios () {
  const config = this.parent.config
  const list = config.getScenarios()
  const wizard = this.parent
  const descriptionId = _.uniqueId('description')
  const container = this.$('.wizard-content').empty()
  const self = this
  // title and teaser
  // #. title for 3rd step of the client onboarding wizard
  // #. user can choose between different scenarios (usually identical with our apps)
  this.$('.wizard-title').attr('id', descriptionId).text(gt('What do you want to use?'))
  // content
  container.append(
    options
      .getNode('scenario', list)
      .on('click', 'button', { wizard: this.parent }, select)
  )
  // description
  container.append(
    $('<ul class="descriptions">').append(function () {
      return _.map(list, function (obj) {
        const descriptionId = _.uniqueId('description')
        self.$(`.option[data-value="${CSS.escape(obj.id)}"] > .link`).attr('aria-labelledby', descriptionId)
        return $('<li class="description hidden">')
          .attr({
            'data-parent': obj.id
          })
          .append(
            $('<div class="">').text(obj.description || obj.id || '\xa0')
              .attr({
                id: descriptionId
              })
          )
      })
    })
  )
  // actions
  ext.point(POINT).invoke('draw', container, { $step: this.$el, scenarios: list, config, wizard })
  // max width: suppress resizing in case description is quite long
  const space = ((list.length + 1) * 160) + 32
  container.find('.descriptions').css('max-width', space > 560 ? space : 560)
  // a11y
  this.$el.attr('aria-labelledby', descriptionId + '  dialog-title')
  this.$('.options').attr('aria-label', gt('list of available devices'))
  this.$('.actions-scenario').attr('aria-label', gt('list of available actions'))
  this.$('.title.sr-only').text(gt('choose a different scenario'))
  // autoselect first enabled
  let id = config.model.get('scenario')
  const enabled = _.where(list, { enabled: true })
  if (list.length === 0 || enabled.length === 0) return
  if (!id) { config.model.set('scenario', id = _.first(enabled).id) }
  if (enabled.length) wizard.trigger('selected', { type: 'scenario', value: id })
}

const OnboardingView = Backbone.View.extend({

  initialize (config, options) {
    // wizard options (you can store any data you want; only 'id' is mandatory)
    const opt = _.extend({
      id: 'client-onboarding',
      title: gt('Client onboarding'),
      type: 'onboarding',
      data: {}
    }, options)
    // store model and options
    this.config = config
    this.model = config.model
    this.opt = opt
    // apply predefined data
    this.set(opt.data)
    // register render
    Wizard.registry.add(opt, this.render.bind(this))
  },

  // set predefined selections (deep link)
  // ...&reg=client-onboarding&regopt=platform:windows,device:windows.desktop,scenario:emclientinstall
  set (data) {
    const props = { platform: 'platforms', device: 'devices', scenario: 'scenarios' }
    const obj = {}
    // remove invalid values
    _.each(data, function (value, key) {
      const prop = props[key]
      // invalid key
      if (!prop) return
      // invalid value
      if (!this.config.hash[prop][value]) return
      obj[key] = value
    }.bind(this))
    this.model.set(obj)
  },

  run () {
    if (capabilities.has('!client-onboarding')) return
    if (_.device('smartphone')) {
      import('@/io.ox/onboarding/clients/view-mobile').then(function ({ default: dialog }) {
        dialog.get().open()
        settings.set('features/clientOnboardingHint/remaining', 0).save()
      })
      return this
    }
    // wrapper for wizard registry
    Wizard.registry.run(this.opt.id)
    return this
  },

  _onStepBeforeShow () {
    // update this.$el reference
    const id = this.wizard.currentStep
    const node = (this.wizard.steps[id])
    this.setElement(node.$el)
    this.$el.addClass('selectable-text')
  },

  _reset () {
    const model = this.model
    _.each(['platform', 'device', 'scenario'], function (key) {
      model.unset(key)
    })
  },

  _onSelect (data) {
    const node = this.wizard.getCurrentStep().$el
    const options = node.find('.options')
    // update model
    this.model.set(data.type, data.value)
    // mark option
    const selector = CSS.escape(data.value)
    options.find('li')
      .removeClass('selected')
      .filter(`[data-value="${selector}"]`)
      .addClass('selected')
    // show children
    node.find('[data-parent]')
      .addClass('hidden')
      .filter(`[data-parent="${selector}"]`)
      .removeClass('hidden')
    // show first action
    const expanded = node.find(`.actions > [data-parent="${selector}"] > .action`).hasClass('expanded')
    if (!expanded) {
      node.find(`.actions > [data-parent="${selector}"] > .action`)
        .first().addClass('expanded')
    }
  },

  upsell (e) {
    const item = $(e.target).closest('li')
    const missing = item.attr('data-missing-capabilities')
    if (!missing) return
    import('@/io.ox/core/upsell').then(function ({ default: upsell }) {
      if (!upsell.enabled(missing.replace(/,/g, ' '))) return
      // TODO: without this workaround wizard step would overlay upsell dialog
      this.wizard.trigger('step:close')
      upsell.trigger({
        type: 'custom',
        id: item.attr('data-value'),
        missing
      })
    }.bind(this))
  },

  register () {
    // set max width of description block
    this.wizard.on({
      // step:before:show, step:ready, step:show, step:next, step:before:hide, step:hide, change:step,
      // 'all': this._inspect,
      'step:before:show': _.bind(this._onStepBeforeShow, this),
      selected: _.bind(this._onSelect, this),
      'before:stop': _.bind(this._reset, this),
      // upsell
      'scenario:upsell': _.bind(this.upsell, this)
    })
  },

  render () {
    const wizard = this.wizard = new Wizard({ model: this.model })
    const self = this
    // add references
    wizard.config = this.config
    wizard.model = this.model
    wizard.container.addClass('client-onboarding')
    // create wizard steps/pages
    wizard
    // platform
      .step({
        attributes: { 'data-type': 'platform' },
        id: 'platform',
        back: false,
        next: false,
        minWidth: '540px'
      })
      .on('before:show', drawPlatforms)
      .on('show', focus)
      .end()
    // device
      .step({
        attributes: { 'data-type': 'device' },
        id: 'device',
        back: false,
        next: false,
        minWidth: '540px'
      })
      .on('before:show', drawDevices)
      .on('show', focus)
      .end()
    // scenarios
      .step({
        attributes: { 'data-type': 'scenario', 'data-mode': 'simple' },
        id: 'scenario',
        back: false,
        next: false,
        width: 'auto',
        minWidth: '540px'
      })
      .on('show', focus)
      .on('before:show', drawScenarios)
      .end()
    // add some references to steps
    _.each(wizard.steps, function (step) {
      _.extend(step, {
        view: self
      })
    })
    // register handlers
    this.register()
    // render
    wizard.start()
  }

})

const wizard = {

  load () {
    if (!initiate) initiate = config.load().promise()
    // generic error message
    initiate.fail(yell)
    return initiate
  },

  render (config, options) {
    if (config.isIncomplete()) {
      // #. error message when server returns incomplete
      // #. configuration for client onboarding
      yellNotification('error', gt('Incomplete configuration.'))
      return
    }
    return new OnboardingView(config, options).run()
  },

  run (options) {
    // add 'options' to 'resolve' result
    const render = _.partial(wizard.render, _, options)
    return wizard.load().then(render)
  }
}

export default wizard
