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
import Backbone from '@/backbone'
import ext from '@/io.ox/core/extensions'
import BasicModel from '@/io.ox/backbone/basicModel'
import { api as subscriptionsAPI } from '@/io.ox/core/api/sub'
import folderAPI from '@/io.ox/core/folder/api'
import * as settingsUtil from '@/io.ox/settings/util'

import gt from 'gettext'

function createSyncer () {
  return {
    create (model) {
      return settingsUtil.yellOnReject(
        subscriptionsAPI.create(model.attributes)
      )
    },
    read (model) {
      return subscriptionsAPI.get({ id: model.id, folder: model.get('folder') })
    },
    update (model) {
      return settingsUtil.yellOnReject(
        subscriptionsAPI.update(model.attributes)
      )
    },
    destroy (model) {
      return settingsUtil.yellOnReject(
        subscriptionsAPI.destroy(model.id)
      )
    }
  }
}

const Subscription = BasicModel.extend({
  ref: 'io.ox/core/sub/subscription/',
  url () {
    return this.attributes[this.attributes.source].url
  },
  source () {
    return this.attributes[this.attributes.source]
  },
  setSource (source, obj) {
    delete this.attributes[this.attributes.source]
    this.attributes.source = source.id
    this.attributes[this.attributes.source] = obj || {}
  },
  /**
   * Get the state concerning refresh.
   *
   * Knows three different states:
   * - 'ready' - ready to perform a refresh
   * - 'pending' - performing a refresh at the moment
   * - 'done' - refresh is already done
   *
   * @return {string} - the state
   */
  refreshState () {
    return this._refresh ? this._refresh.state() : 'ready'
  },
  performRefresh () {
    const self = this
    if (this.refreshState() === 'ready') {
      subscriptionsAPI.refresh(this)
        .always(function (data) {
          self.set('errors', data.error ? 'true' : 'false')
          folderAPI.refresh()
        })
      return (this._refresh = _.wait(5000))
    }
    return this._refresh
  },
  syncer: createSyncer()
})
const PubSubCollection = {
  factory (api) {
    return Backbone.Collection.extend({
      initialize () {
        const collection = this
        api.on('refresh:all', function () {
          collection.fetch()
        })
        this.on('change:enabled', function (model) {
          model.collection.sort()
        })
      },
      sync (method, collection) {
        if (method !== 'read') return
        const self = this

        return api.getAll().then(function (res) {
          _(res).each(function (obj) {
            // eslint-disable-next-line new-cap
            const myModel = new self.model(obj)
            myModel.fetch().then(function (myModel) {
              return collection.add(myModel)
            })
          })
          collection.each(function (model) {
            if (model && _(res).where({ id: model.id }).length === 0) {
              collection.remove(model)
            }
          })
          return collection
        })
      },
      /**
       * get a list of items for a folder
       *
       * If no folder is provided, all items will be returned.
       *
       * Use it like:
       * <code>
       * model.collection.forFolder({ folder_id: 2342 });
       * </code>
       *
       * @param  {object} folder object containing a folder_id attribute
       * @return                 an array containing matching model objects
       */
      forFolder: filterFolder,
      comparator (publication) {
        return !publication.get('enabled') + String(publication.get('displayName')).toLowerCase()
      }
    })
  }
}
const Subscriptions = PubSubCollection.factory(subscriptionsAPI).extend({
  model: Subscription
})
// singleton instances
let subscriptions

function filterFolder (folder) {
  const filter = String(folder.folder_id || folder.folder || '')

  if (!filter) { return this.toArray() }

  return this.filter(function (e) {
    return (e.get('entity') || { folder: e.get('folder') }).folder === filter
  })
}

ext.point('io.ox/core/sub/subscription/validation').extend({
  validate (obj, errors) {
    const ref = obj[obj.source]
    if (!ref) return errors.add(obj.source, gt('Model is incomplete.'))

    _((obj.service || {}).formDescription).each(function (field) {
      if (!field.mandatory || ref[field.name]) return
      // #. %1$s is a name/label of an input field (for example: URL or Login)
      // #, c-format
      errors.add(obj.source, gt('%1$s must not be empty.', field.displayName))
    })
  }
})

export default {
  subscriptions () {
    if (!subscriptions) {
      subscriptions = new Subscriptions()
    }
    subscriptions.fetch()

    return subscriptions
  },
  Subscription
}
