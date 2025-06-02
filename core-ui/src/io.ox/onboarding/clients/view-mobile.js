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
import ext from '@/io.ox/core/extensions'
import ModalDialog from '@/io.ox/backbone/views/modal'
import config from '@/io.ox/onboarding/clients/config'
import api from '@/io.ox/onboarding/clients/api'
import a11y from '@/io.ox/core/a11y'
import { createIcon } from '@/io.ox/core/components'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

const POINT = 'io.ox/onboarding/clients/views/mobile'

function onPremium (e) {
  e.preventDefault()
  const item = $(e.target).closest('.scenario')
  const missing = item.attr('data-missing-capabilities')
  if (!missing) return
  import('@/io.ox/core/upsell').then(function ({ default: upsell }) {
    if (!upsell.enabled(missing.replace(/,/g, ' '))) return
    upsell.trigger({
      type: 'custom',
      id: item.attr('data-id'),
      missing
    })
  })
}

const extensions = {

  scenario (scenario, index, list) {
    return [
      // scenario
      $('<article class="scenario">').attr({ 'data-id': scenario.id, 'data-missing-capabilities': scenario.missing_capabilities }).append(
        $('<h2 class="title">').text(scenario.name || ''),
        $('<p class="description">').text(scenario.description),
        $('<div class="actions">').append(_.map(scenario.actions, _.partial(extensions.action, scenario)))
      ),
      // divider
      index !== list.length - 1 ? $('<hr class="divider">') : $()
    ]
  },

  action (scenario, action, index) {
    const node = $('<section class="action">').attr('data-action', action.id).attr({ 'data-index': index })
    const type = action.id.split('/')[0]
    ext.point(POINT + '/' + type).invoke('draw', node, action, scenario)
    return node
  },

  // DISPLAY: IMAP, SMTP and EAS

  block (action) {
    this.append(
      $('<pre class="config">').append(
        $('<div>').append(_.map(action.data, function (prop) {
          const isTitle = !('value' in prop)
          return $('<div class="property">').addClass(isTitle ? 'title' : '').text(prop.name + (isTitle ? '' : ':'))
        })),
        $('<div>').append(_.map(action.data, function (prop) {
          const isTitle = !('value' in prop)
          return $('<div class="value">').text(isTitle ? '\xa0' : prop.value).addClass(isTitle ? 'title' : '')
        }))
      )
    )
  },

  toggle () {
    // make content toggleable when 'display' isn't the primary action of a scenario
    if (this.attr('data-index') === '0') return

    const action = $('<a href="#" role="button" class="inline-link">')
    const container = $('<div>').append(this.find('.config'))

    a11y.collapse(action, container, { onChange: setLabel })
    function setLabel (state) {
      // #. button: show collapsed content
      if (/(show)/.test(state)) return action.text(gt('Hide details'))
      // #. button: hide collapsable content
      if (/(hide)/.test(state)) return action.text(gt('Show details'))
    }
    this.empty().append(action, container)
  },

  // DOWNLOAD: Profile

  titleDownload () {
    this.append($('<h3 class="title">').text(
      gt('Automatic Configuration')
    ))
  },

  descriptionDownload (action) {
    this.append(
      $('<p class="description">').text(action.description)
    )
  },

  buttonDownload (action) {
    const ref = _.uniqueId('description-')
    this.append($('<button type="button" class="btn btn-primary action-call">')
      .attr('aria-describedby', ref)
      .text(gt('Install'))
      .on('click', function (e) {
        e.preventDefault()
        const url = api.getUrl(action.scenario, action.id, config.getDevice().id)
        import('@/io.ox/core/download').then(function ({ default: download }) {
          download.url(url)
        })
      })
    )
  },

  // LINK: App in a Store

  descriptionLink: (function () {
    return function (action) {
      this.append($('<p class="description">').append(
        action.description ? action.description + ' ' : '',
        action.store ? action.store.description : ''
      ))
    }
  })(),

  imageLink (action) {
    // defaults
    if (!action.image && !action.imageplaceholder) return
    this.find('.description').prepend($('<a class="app" target="_blank">').attr('href', action.link).append(
      $('<img class="app-icon action-call" role="button">').attr({
        'data-detail': action.store.name,
        src: action.image || action.imageplaceholder
      })
    ))
  },

  badge (action) {
    if (!action.store.image) return
    this.append(
      $('<a class="store" target="_blank">').attr('href', action.link).append(
        $('<img class="store-icon action-call" role="button">').attr({
          'data-detail': action.store.name,
          src: action.store.image
        })
      )
    )
  },

  premium (action, scenario) {
    if (scenario.enabled) return
    if (!settings.get('features/upsell/client.onboarding/enabled', true)) return
    const container = $('<div class="premium-container">'); let textnode
    const color = settings.get('features/upsell/client.onboarding/color')
    container.append(
      $('<div class="premium">').append(
        textnode = $('<span>').text(gt('Premium')),
        createIcon('bi/star.svg')
      )
    )
    // custom icon/color
    if (color) textnode.css('color', color)
    // upsell
    container.on('click', onPremium)
    this.append(container)
  }
}

// supported
ext.point(POINT + '/display').extend(
  { id: 'premium', draw: extensions.premium },
  { id: 'block', draw: extensions.block },
  { id: 'toggle', draw: extensions.toggle }
)
ext.point(POINT + '/download').extend(
  { id: 'premium', draw: extensions.premium },
  { id: 'title', draw: extensions.titleDownload },
  { id: 'description', draw: extensions.descriptionDownload },
  { id: 'button', draw: extensions.buttonDownload }
)
ext.point(POINT + '/link').extend(
  { id: 'premium', draw: extensions.premium },
  { id: 'description', draw: extensions.descriptionLink },
  { id: 'imageLink', draw: extensions.imageLink },
  { id: 'badge', draw: extensions.badge }
)

// unsupported
ext.point(POINT + '/email').extend({ draw: $.noop })
ext.point(POINT + '/sms').extend({ draw: $.noop })

export default {

  extensions,

  get () {
    return new ModalDialog({
      title: gt('Connect this device'),
      point: 'io.ox/onboarding/clients/views/mobile',
      maximize: false
    })
      .extend({
        layout () {
          this.$el.addClass('client-onboarding mobile')
        },
        'action-close' () {
          this.$el.find('.modal-header').append(
            $('<a href="#" class="modal-action close" data-action="cancel" role="button">')
              .attr('aria-label', gt('Close'))
              .append(createIcon('bi/x.svg').attr('title', gt('Close')))
              .on('click', this.close)
          )
        },
        content () {
          const scenarios = _.map(config.getScenarios(), function (scenario) {
            return _.extend(scenario, { actions: config.getActions(scenario.id) })
          })
          // mapping function returns array of nodes
          this.$body.append(_(scenarios).chain().map(extensions.scenario).flatten().value())
        }
      })
  }
}
