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
import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/core/folder/api'

import TreeNodeView from '@/io.ox/core/folder/node'
import contextMenu from '@/io.ox/core/folder/contextmenu'
import contextUtils from '@/io.ox/backbone/mini-views/contextmenu-utils'
import actions from '@/io.ox/core/folder/actions/common'
import apps from '@/io.ox/core/api/apps'
import Backbone from '@/backbone'
import { validateFilename } from '@/io.ox/files/util'

import { settings as calendarSettings } from '@/io.ox/calendar/settings'
import { addResourceLinkHandler } from '@/io.ox/calendar/resources/actions'
import { addResourceDialog, removeResourceDialog } from '@/io.ox/calendar/resources/view'

import gt from 'gettext'

const ValidateModel = Backbone.Model.extend({
  initialize () {
    this.listenTo(this.model, 'change', () => {
      const name = this.attributes['folder-name'].trimEnd()
      this.model.set({ 'folder-name': name }, { silent: true })
    })
  },
  validate (attributes) {
    this.trigger('valid:folder-name')
    const title = attributes['folder-name']
    const warnings = validateFilename(attributes['folder-name'], 'folder')
    if (attributes.resourceGroups.some(groupTitle => groupTitle === title)) warnings.push(gt('A resource group named "%1$s" already exists!', title))
    if (warnings[0]) this.trigger('invalid:folder-name', warnings[0])
    else this.trigger('valid:folder-name')
    return warnings[0]
  },
  save () {
    const folderName = this.get('folder-name')
    const folderId = `flat/event/resources.${folderName}`
    calendarSettings.set(`resources/groups/${folderName}`, { folderId, title: folderName, folders: [] }).save()
    this.trigger('folderAdded')
  }
})

ext.point('io.ox/core/foldertree/contextmenu/mycalendars').extend({
  id: 'add-resource',
  index: 200,
  render (baton) {
    this.divider()
    const id = 'virtual/flat/event/resources.general'
    this.link('folder', gt('Add new resource calendar'), () => addResourceLinkHandler(id))
  }
})

ext.point('io.ox/core/foldertree/contextmenu/mycalendars').extend({
  id: 'add-resource-group',
  index: 300,
  render (baton) {
    this.link('folder', gt('Add new resource calendar group'), function (e) {
      const resourceGroups = Object.keys(calendarSettings.get('resources/groups', {
        general: { folderId: 'flat/event/resources.general', folders: [] }
      }))
      const model = new ValidateModel({ resourceGroups })

      addResourceDialog(model)
      model.once('folderAdded', async function () {
        const folderId = `flat/event/resources.${this.get('folder-name')}`
        await addResourceLinkHandler(folderId)

        const folderName = folderId.split('.')[1]
        const treeNode = new TreeNodeView({
          contextmenu: 'resources',
          folder: `virtual/${folderId}`,
          model_id: folderId,
          tree: baton.app.treeView,
          parent: baton.app.treeView,
          title: this.get('folder-name'),
          empty: true,
          count: 0,
          indent: false,
          open: false,
          section: true
        }).render().$el.addClass('section')

        const container = baton.app.treeView.$container
        const groupIds = resourceGroups.filter(keys => keys !== 'general')
        groupIds.push(folderName)
        const orderedGroups = groupIds.sort()
        const index = orderedGroups.findIndex(id => id === folderName)
        const lastResourceGroup = index !== 0 ? orderedGroups[index - 1] : 'general'
        const target = $(container).find(`li[data-id="virtual/flat/event/resources.${lastResourceGroup}"]`)
        if (target.length === 0) container.append(treeNode)
        else target.after(treeNode)
      })
    })
  }
})

ext.point('io.ox/core/foldertree/contextmenu/resources').extend({
  id: 'show-group-only',
  index: 100,
  draw (baton) {
    function selectGroupOnly (e) {
      const app = apps.get('io.ox/calendar')
      if (app.folders.isSingleSelection()) app.folders.reset()
      else app.folders.selectGroupOnly(e.data.folders)
    }

    const isSingleGroup = baton.view.$el.hasClass('single-selection')
    const folder = baton.data.id.replace('virtual/', '')
    const { models } = api.pool.getCollection(folder)
    const folderIds = models.map(model => model.get('id'))

    contextUtils.addLink(this, {
      action: 'showResourceGroupOnly',
      data: { folders: folderIds },
      handler: selectGroupOnly,
      text: isSingleGroup ? gt('Show all calendars') : gt('Show this group only'),
      enabled: true
    })
  }
})

ext.point('io.ox/core/foldertree/contextmenu/resources').extend({
  id: 'add-resource',
  index: 200,
  draw (baton) {
    const id = baton.data.id || 'virtual/flat/event/resources.general'
    contextUtils.addLink(this, {
      action: 'add-resource',
      data: { id },
      handler () { addResourceLinkHandler(id) },
      text: gt('Add new resource calendar'),
      enabled: true
    })
  }
})

ext.point('io.ox/core/foldertree/contextmenu/resources').extend({
  id: 'rename-resource-group',
  index: 300,
  draw (baton) {
    const id = baton.data.id
    if (!id || id === 'virtual/flat/event/resources.general') return
    contextUtils.addLink(this, {
      action: 'rename-resource-group',
      data: { id },
      async handler () {
        const modelId = id.replace('virtual/', '')
        ox.load(() => import('@/io.ox/core/folder/actions/rename')).then(function ({ default: rename }) {
          rename(modelId)
        })
      },
      text: gt('Rename resource group'),
      enabled: true
    })
  }
})

ext.point('io.ox/core/foldertree/contextmenu/resources').extend({
  id: 'divider-1',
  index: 310,
  draw: contextUtils.divider
})

ext.point('io.ox/core/foldertree/contextmenu/resources').extend({
  id: 'remove-resource-group',
  index: 400,
  draw (baton) {
    const id = baton.data.id || 'virtual/flat/event/resources.general'
    const modelId = id.replace('virtual/', '')
    contextUtils.addLink(this, {
      action: 'removeResourceGroup',
      data: { modelId, app: baton.app },
      handler () {
        removeResourceDialog(modelId, { removeResourceGroup: true })
      },
      text: gt('Delete resource group'),
      enabled: true
    })
  }
})

ext.point('io.ox/core/foldertree/contextmenu/resource-folder').extend({
  id: 'show-resource-only',
  index: 100,
  draw (baton) {
    const isOnly = baton.view.$el.hasClass('single-selection')
    contextUtils.addLink(this, {
      action: 'showResourceOnly',
      data: { folder: baton.data },
      handler: actions.selectOnly,
      text: isOnly ? gt('Show all calendars') : gt('Show this resource only'),
      enabled: true
    })
  }
})

ext.point('io.ox/core/foldertree/contextmenu/resource-folder').extend({
  id: 'divider-1',
  index: 110,
  draw: contextUtils.divider
})

ext.point('io.ox/core/foldertree/contextmenu/resource-folder').extend({
  id: 'choose-folder-color',
  index: 200,
  draw: contextMenu.extensions.customColor
})

ext.point('io.ox/core/foldertree/contextmenu/resource-folder').extend({
  id: 'divider-2',
  index: 210,
  draw: contextUtils.divider
})

ext.point('io.ox/core/foldertree/contextmenu/resource-folder').extend({
  id: 'remove-resource',
  index: 300,
  draw (baton) {
    const id = baton.data.id || 'virtual/flat/event/resources.general'
    contextUtils.addLink(this, {
      action: 'removeResource',
      data: { id, app: baton.app },
      handler () {
        removeResourceDialog(id, { removeResource: true, parentFolder: baton.view.getSelectedNodeView(id)?.options?.parent?.folder })
      },
      text: gt('Remove resource calendar'),
      enabled: true
    })
  }
})
