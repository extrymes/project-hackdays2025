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
import ext from '@/io.ox/core/extensions'
import model from '@/io.ox/core/sub/model'
import views from '@/io.ox/backbone/views'
import folderAPI from '@/io.ox/core/folder/api'
import BreadcrumbView from '@/io.ox/core/folder/breadcrumb'
import yell from '@/io.ox/core/yell'
import capabilities from '@/io.ox/core/capabilities'
import '@/io.ox/core/sub/style.scss'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

const point = views.point('io.ox/core/sub/settings/list')
const SettingView = point.createView({ className: 'sub settings' })
let filter; let folderState

ext.point('io.ox/core/sub/settings/detail').extend({
  index: 100,
  id: 'extensions',
  draw (baton) {
    const folder = baton.options.data ? baton.options.data.id : undefined
    filter = { folder }

    folderState = {
      isPublished: folderAPI.is('published', baton.options.data || {}),
      isSubscribed: folderAPI.is('subscribed', baton.options.data || {})
    }

    const view = new SettingView({
      subscriptions: model.subscriptions()
    })

    this.append(
      view.render().$el
    )
  }
})

function createPathInformation (model) {
  const folder = model.has('folder')
    // subscriptions have a folder on top-level
    ? model.get('folder')
    // publications have a property 'entity'
    : model.get('entity').folder

  return new BreadcrumbView({
    folder,
    exclude: ['9'],
    notail: true,
    isLast: true
  })
    .render().$el
}

const getSiteNameRegex = /^http[^?]+\/(\w+)\?/
const getShortUrlRegex = /\?secret=.+$/

function getSiteName (url) {
  if (!url) return
  url = url.match(getSiteNameRegex)
  return url ? url[1] : ''
}

const getUrl = (function () {
  const linkedIn = 'com.openexchange.subscribe.socialplugin.linkedin'

  return function (data) {
    if (linkedIn in data) return 'http://www.linkedin.com'
    if ('target' in data) return (data[data.target] || {}).url || ''
    if ('source' in data) return (data[data.source] || {}).url || ''
    return ''
  }
}())

function getShortUrl (url) {
  return url.replace(getShortUrlRegex, '...')
}

function getDisplayName (data) {
  return getSiteName(data.displayName) || data.displayName || gt('Unnamed subscription')
}

function isDestructiveRefresh (data) {
  return isDestructiveRefresh.needsWarning[data.source]
}

isDestructiveRefresh.needsWarning = {
  'com.openexchange.subscribe.crawler.google.calendar': true
}

function refreshWarning (data) {
  if (isDestructiveRefresh(data)) {
    return $('<span class="text-warning"></span>').text(gt('Note: Refreshing this subscription will replace the calendar content with the external content. Changes you have made inside appsuite will be overwritten'))
  }
  return $()
}

function errorWarning (data) {
  if (data.errors !== 'true') return $()
  return $('<div class="error-wrapper">').append(
    createIcon('bi/exclamation-triangle.svg').addClass('error-icon').addClass(
      _.device('smartphone')
        ? 'text-3xl mr-16'
        : 'text-l mr-8'
    ),
    $('<div class="error-message">').text(gt('The subscription could not be updated due to an error and must be recreated.'))
  )
}

ext.point('io.ox/core/sub/settings/list/itemview').extend({
  id: 'itemview',
  draw (baton) {
    const data = baton.model.toJSON()
    const isBroken = data.source === 'com.openexchange.subscription.fallback'
    const enabled = data.enabled
    let dynamicAction
    const url = getUrl(data)
    const shortUrl = getShortUrl(url)
    const displayName = getDisplayName(data) || '\u00A0'

    this[enabled ? 'removeClass' : 'addClass']('disabled')

    if (isBroken) this.addClass('broken disabled')

    if (data.source && (baton.model.refreshState() === 'ready')) {
      // this is a subscription
      dynamicAction = $('<button role="button" class="btn btn-toolbar action" data-action="refresh">').attr({
        'aria-label': displayName + ', ' + gt('Refresh')
      }).text(gt('Refresh'))
      if (isDestructiveRefresh(data)) {
        dynamicAction.addClass('text-error')
      }
    } else if (data.source && (baton.model.refreshState() !== 'pending')) {
      // this is a subscription and refresh should be disabled
      dynamicAction = $('<span>')
    }

    this.addClass('settings-list-item flex-row').append(
      $('<div class="list-item-title flex-col flex-grow">').append(
        $('<div class="font-bold truncate">').text(displayName),
        $('<div class="url">')
          .addClass(shortUrl ? '' : 'empty')
          .append(
            enabled
              ? $('<a target="_blank">').attr('href', url).text(shortUrl)
              : $('<i>').text(shortUrl)
          ),
        createPathInformation(baton.model),
        refreshWarning(data),
        errorWarning(data)
      ),
      $('<div class="list-item-controls">').append(
        enabled ? dynamicAction : '',
        data.source
          ? $('<button type="button" class="btn btn-toolbar action" data-action="toggle">').attr({
            'aria-label': displayName + ', ' + (enabled ? gt('Disable') : gt('Enable'))
          }).text(enabled ? gt('Disable') : gt('Enable'))
          : '',
        $('<a href="#" role="button" class="btn btn-toolbar remove" data-action="remove">').attr({
          title: gt('Delete'),
          'aria-label': displayName + ', ' + gt('Delete')
        })
          .append(createIcon('bi/x-lg.svg').addClass('m-16'))
      )
    )

    if (data.source && (baton.model.refreshState() === 'pending')) {
      // this is a subscription and we are refreshing
      this.find('.name').append(
        createIcon('bi/arrow-clockwise.svg').addClass('animate-spin')
      )
    }
  }
})

function performRender () {
  this.render()
}

function performRemove () {
  this.remove()
}

const SubItem = Backbone.View.extend({
  tagName: 'li',
  className: '',
  initialize () {
    this.listenTo(this.model, 'change', performRender)
    this.listenTo(this.model, 'remove', performRemove)
  },
  events: {
    'click [data-action="toggle"]': 'onToggle',
    'click [data-action="refresh"]': 'onRefresh',
    'click [data-action="remove"]': 'onRemove'
  },
  render () {
    const baton = ext.Baton({ model: this.model, view: this })
    ext.point('io.ox/core/sub/settings/list/itemview').invoke('draw', this.$el.empty(), baton)
    return this
  },
  onToggle (ev) {
    const model = this.model
    ev.preventDefault()

    model.set('enabled', !model.get('enabled'), { validate: true }).save().fail(function () {
      model.set('enabled', !model.get('enabled'), { validate: true })
    })
    this.render()
  },
  onRefresh (ev) {
    const baton = ext.Baton({ model: this.model, view: this })
    ev.preventDefault()
    yell({
      type: 'info',
      headline: gt('Subscription refresh'),
      message: gt(
        'A refresh takes some time, so please be patient, while the refresh runs in the background. ' +
        'Only one refresh per subscription and per session is allowed.'
      )
    })
    this.model.performRefresh().done(function () {
      baton.view.render()
    })
    baton.view.render()
  },
  onRemove (e) {
    e.preventDefault()
    this.model.destroy().done(function () {
      // remove cloud icon
      folderAPI.refresh()
    })
  },
  close () {
    this.stopListening()
  }
})

function createSubItem (model) {
  return new SubItem({ model })
}

/**
 * Setup a new sub collection
 *
 * @private
 * @param {jQuery.Node}         node       list node element
 * @param {Backbone.Collection} collection
 */
function setupList (node, collection, type) {
  let filteredList = collection.forFolder(filter)
  let hintNode; let hint

  if (!capabilities.has(type)) return

  _.each(filteredList, function (model) {
    node.append(
      createSubItem(model).render().el
    )
  })

  collection.on('add', function (model, collection) {
    const filteredIndex = _.chain(collection.forFolder(filter))
      .map(function (e) { return e.id })
      .indexOf(model.id)
      .value()
    if (filteredIndex < 0) { return }

    const item = createSubItem(model).render().el

    if (hintNode) { hintNode.remove() }

    if (filteredIndex === 0) {
      node.prepend(item)
    } else {
      node.children('li:nth-child(' + collection.indexOf(model) + ')').after(item)
    }
  })

  // handle empty lists

  collection.on('remove', function (model, collection) {
    if (collection.length === 0) addHint()
  })

  function getHint () {
    filteredList = collection.forFolder(filter)
    const isEmpty = filteredList.length === 0
    const isFiltered = !!filter.folder
    const hasPublications = folderState.isPublished && type === 'publication'
    const hasSubscriptions = folderState.isSubscribed && type === 'subscription'
    const notAccessible = isEmpty && (hasPublications || hasSubscriptions)

    if (notAccessible) {
      if (hasPublications) return gt('This folder has publications but you are not allowed to view or edit them')
      if (hasSubscriptions) return gt('This folder has subscriptions but you are not allowed to view or edit them')
    }

    if (isEmpty) {
      if (isFiltered) {
        return type === 'publication'
          ? gt('This folder has no publications')
          : gt('This folder has no subscriptions')
      }
      return type === 'publication'
        ? gt('You don\'t have any publications yet')
        : gt('You don\'t have any subscriptions yet')
    }

    return ''
  }

  function addHint () {
    if ((hint = getHint())) {
      // add node
      node.append(hintNode = $('<li class="empty">').text(hint + '.'))
    }
  }

  addHint()
}

point.extend({
  id: 'content',
  render () {
    this.$el.append(
      this.baton.subListNode = $('<ul class="list-unstyled subscriptions settings-list-view">')
    )
    setupList(this.baton.subListNode.empty(), this.baton.subscriptions, 'subscription')
  }
})
