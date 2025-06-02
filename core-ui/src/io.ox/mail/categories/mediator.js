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

import _ from '@/underscore'
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/mail/categories/api'
import mailAPI from '@/io.ox/mail/api'
import TabView from '@/io.ox/mail/categories/tabs'
import yell from '@/io.ox/core/yell'
import { addReadyListener } from '@/io.ox/core/events'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

/**
 * mail app property 'categories': feature toggle
 * mail listview model property 'category_id': mail api requests param
 * mail app property 'category_id': stores last selected category
 */

// helpers
const DEFAULT_CATEGORY = 'general'
const INBOX = settings.get('folder/inbox')
let isVisible = false
const toolbarAction = ext.point('io.ox/mail/actions/category')
const helper = {
  isVisible () {
    return isVisible
  },
  getInitialCategoryId () {
    return DEFAULT_CATEGORY
  }
}

addReadyListener('capabilities:user', (capabilities) => {
  if (_.device('smartphone') && capabilities.has('mail_categories')) return
  // extend mediator
  ext.point('io.ox/mail/mediator').extend(
    {
      id: 'toggle-category-tabs',
      index: 20000,
      setup (app) {
        function isEnabled () {
          return !!app.props.get('categories')
        }

        function isInbox () {
          return app.folder.get() === INBOX
        }

        function toggleCategories () {
          isVisible = isEnabled() && isInbox()
          if (isVisible && app.listView.model.has('criteria')) yell('info', gt('The categories will appear once your search is done.'))
          else app.getWindow().nodes.outer.toggleClass('mail-categories-visible', isVisible)
          app.listView.model.set('category_id', isVisible ? app.props.get('category_id') : undefined)
          if (isVisible) api.collection.initializeRefresh()
          toolbarAction.toggle('default', isVisible)
        }

        app.on('folder:change', toggleCategories)
        app.props.on('change:categories', function () {
          // ensure inbox if user enables while in a different folder
          if (isEnabled() && !isInbox()) app.folder.set(INBOX)
          toggleCategories()
        })

        toggleCategories()
      }
    },
    {
      id: 'forward-category-id',
      index: 20100,
      setup (app) {
        // update collection loaders parameter
        app.props.on('change:category_id', function (model, value) {
          if (!isVisible) return
          app.listView.model.set('category_id', value)
        })
      }
    },
    {
      id: 'import',
      // a little bit more than 'import-eml'
      index: 1000000000010,
      setup (app) {
        if (!app.queues.importEML) return
        app.queues.importEML.on('stop', function (e, last, position, files) {
          const source = helper.getInitialCategoryId()
          const target = app.listView.model.get('category_id')
          // stop when not active or imported to 'general'
          if (!helper.isVisible() || !target || (source === target)) return
          // pick successful responses
          const imported = _(files).chain()
            .pluck('response')
            .filter(function (response) { return !('Error' in response) })
            .value()
          // get full data and move to target category
          mailAPI.getList(imported).done(function (data) {
            api.move({
              source,
              target,
              sourcename: api.collection.get(source).get('name'),
              targetname: api.collection.get(target).get('name'),
              data
            }).fail(yell)
          })
        })
      }
    },
    {
      id: 'category-tabs',
      index: 20200,
      setup (app) {
        // add placeholder
        // NOTE: Added _.defer as the source order, this should be solved in a more proficient way
        _.defer(function () {
          app.getWindow().nodes.body.prepend(
            new TabView({ props: app.props }).render().$el.addClass('translucent-constant')
          )
        })

        // events
        api.on('move train', app.listView.reload.bind(app.listView))
        api.collection.on('save', app.listView.reload.bind(app.listView))
      }
    },
    {
      id: 'ensure-category-id',
      index: 20300,
      setup (app) {
        // current category gets disabled: use 'general' as fallback
        api.collection.on('change:enabled', function (model, enabled) {
          if (enabled) return
          if (model.id !== app.props.get('category_id')) return
          app.props.set('category_id', DEFAULT_CATEGORY)
        })
      }
    },
    {
      id: 'setting-updates-prop',
      index: 20400,
      setup (app) {
        settings.on('change:categories/enabled', function (value) {
          app.props.set('categories', value)
        })
      }
    },
    {
      id: 'check-category-state',
      index: 20500,
      setup (app) {
        if (!app.props.get('categories')) return
        if (settings.get('categories/initialized') !== 'running') return
        // #. mail categories feature: the update job is running that assigns
        // #. some common mails (e.g. from twitter.com) to predefined categories
        yell('info', gt('It may take some time until mails are assigned to the default categories.'))
      }
    },
    {
      id: 'search-updates-visibility',
      index: 20600,
      setup (app) {
        app.listView.model.on('change:criteria', function (model, value) {
          if (value) app.getWindow().nodes.outer.toggleClass('mail-categories-visible', false)
          else app.getWindow().nodes.outer.toggleClass('mail-categories-visible', settings.get('categories/enabled'))
        })
      }
    }
  )
})

export default helper
