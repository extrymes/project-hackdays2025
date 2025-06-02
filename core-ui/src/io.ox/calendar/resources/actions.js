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

import api from '@/io.ox/core/folder/api'
import defaultPicker from '@/io.ox/contacts/addressbook/popup'
import enterprisePicker from '@/io.ox/contacts/enterprisepicker/dialog'
import ox from '@/ox'
import resourceAPI from '@/io.ox/core/api/resource'
import calendarAPI from '@/io.ox/calendar/api'
import { addReadyListener } from '@/io.ox/core/events'

import { settings as calendarSettings } from '@/io.ox/calendar/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import gt from 'gettext'

const generalFolderName = gt('Resources')

async function addResourceFolder (resources, parentFolder) {
  const parentFolderId = parentFolder.split('.')[1]
  const settingsGroupPath = `resources/groups/${parentFolderId}`
  const resourceGroup = calendarSettings.get(settingsGroupPath, {
    folderId: 'flat/event/resources.general',
    folders: []
  })
  const resourceFoldersInGroup = resourceGroup.folders
  const resourceFolders = calendarSettings.get('resources/folders', {})
  resources.forEach(resource => {
    if (!resourceFolders[resource.id]) {
      resourceFolders[resource.id] = {
        folderId: `${resource.folder_id}${resource.id}`,
        'com.openexchange.calendar.extendedProperties': { color: { value: '#16adf8' } }
      }
    }
    resourceFoldersInGroup.push(resource.id)
    api.trigger('create', { id: `${resource.folder_id}${resource.id}`, module: 'calendar' })
  })

  calendarSettings
    .set('resources/folders', resourceFolders)
    .set(settingsGroupPath, resourceGroup)
    .save()
  await addVirtualResourceCalendarFolders()
  calendarAPI.trigger('updateResourceFolders')
  api.flat({ module: 'event' })
}

function pruneSelectedCalendarFolders (allResourceIds) {
  const selectedCalendarFolders = calendarSettings.get('selectedFolders', [])
  const resourceFolders = Object.keys(calendarSettings.get('resources/folders', {}))
  const foldersToDelete = selectedCalendarFolders
    .filter(id => /^cal:\/\/0\/resource/.test(id))
    .filter(id => {
      return !allResourceIds.includes(Number(id.replace('cal://0/resource', ''))) ||
      !resourceFolders.includes(String(id.replace('cal://0/resource', '')))
    })
  if (foldersToDelete.length > 0) calendarSettings.set('selectedFolders', selectedCalendarFolders.filter(id => !foldersToDelete.includes(id))).save()
}

export function addResourceLinkHandler (id) {
  const groupId = id.split('.')[1]
  const resourceFolderIds = calendarSettings.get(`resources/groups/${groupId}/folders`, [])
  const picker = coreSettings.get('features/enterprisePicker/enabled', false) ? enterprisePicker : defaultPicker
  return picker.open(async resources => {
    await addResourceFolder(resources, id)
  }, { onlyResources: true, title: gt('Select resources'), resourceFolderIds, useCache: false })
}

export function addResourceGroupFolder (title) {
  const folderId = `flat/event/resources.${title}`
  calendarSettings.set(`resources/groups/${title}`, { folderId, title, folders: [] }).save()
  api.injectVirtualResourceCalendarFolders()
  return { folderId, title }
}

export function removeResourceFolderGroup (id) {
  const model = api.pool.getModel(id)
  const collection = api.pool.getCollection(id)
  const folderId = id.split('.')[1]
  const resourceFolders = calendarSettings.get('resources/folders', {})
  const resourceFolderIdsInGroup = calendarSettings.get(`resources/groups/${folderId}/folders`, [])

  collection.models.forEach(model => {
    const modelData = model.toJSON()
    api.trigger('remove', modelData.id, modelData)
  })

  if (id !== 'flat/event/resources.general') {
    api.removeFromPool(id.replace(/virtual\//, ''))
    delete api.pool.models[id]
    model.trigger('destroy')
    calendarSettings.remove(`resources/groups/${folderId}`)
  // just reset folders for general resource group
  } else calendarSettings.set(`resources/groups/${folderId}/folders`, [])

  const resourceGroups = calendarSettings.get('resources/groups', {
    general: { folderId: 'flat/event/resources.general', folders: [] }
  })
  const uniqueResourceFolderIds = [...new Set(Object.entries(resourceGroups).flatMap(([groupId, group]) => group.folders))]
  const resourceFoldersToRemove = resourceFolderIdsInGroup.filter(folderId => !uniqueResourceFolderIds.find(id => folderId === id))
  if (resourceFoldersToRemove.length > 0) {
    resourceFoldersToRemove.forEach(id => delete resourceFolders[id])
    calendarSettings.set('resources/folders', resourceFolders)
  }
  calendarSettings.save()
  addVirtualResourceCalendarFolders()
}

export function removeResourceFolder (id, options) {
  const model = api.pool.getModel(id)
  const parentFolder = options.parentFolder?.split('.')[1]
  const folderData = model.toJSON()
  const folders = calendarSettings.get(`resources/groups/${parentFolder}/folders`)
  const resourceGroupFolders = folders.filter(folderId => folderId !== model.get('resourceId'))

  const parentCollectionId = `flat/event/resources.${parentFolder}`
  api.trigger('before:remove', { folder_id: '1', module: 'calendar' })
  api.pool.getCollection(parentCollectionId).remove(model)

  const collectionsWithModel = Object.keys(api.pool.collections).filter(collection => /^flat\/event\/resource/.test(collection) && api.pool.getCollection(collection).get(model))
  if (collectionsWithModel.length === 0) {
    delete api.pool.models[id]
    model.trigger('destroy')
    api.trigger('remove', folderData.id, folderData)
    calendarSettings.remove(`resources/folders/${model.get('resourceId')}`)
  }
  calendarSettings.set(`resources/groups/${parentFolder}/folders`, resourceGroupFolders).save()
}

export async function addVirtualResourceCalendarFolders () {
  const folderGroups = calendarSettings.get('resources/groups', {
    general: { folderId: 'flat/event/resources.general', folders: [] }
  })

  const addedResourceFolders = calendarSettings.get('resources/folders')
  if (!addedResourceFolders) return
  const allResourceIds = await resourceAPI.getAllIds({}, false)
  const existingResourceIds = Object.keys(addedResourceFolders)
    .filter(id => allResourceIds.includes(Number(id)))
    .map(res => { return { id: res } })
  const resourceList = await resourceAPI.getList(existingResourceIds)
  pruneSelectedCalendarFolders(allResourceIds)

  // Loop over resource groups and add collections and models
  Object.entries(folderGroups).forEach(folderGroup => {
    const [title, group] = folderGroup
    api.pool.addModel({
      id: group.folderId,
      standard_folder: false,
      title: group.title || generalFolderName,
      own_rights: 403710016, // all rights but admin
      permissions: [{ bits: 0, entity: ox.user_id, group: false }],
      subscribed: true
    })

    const resourceFolders = group.folders.filter(id => allResourceIds.includes(Number(id)))
    const resourceModels = resourceFolders.map(resourceId => {
      const resourceData = resourceList.find(resource => resource.id === resourceId)
      const folder = addedResourceFolders[resourceId]
      return api.pool.addModel({
        id: folder.folderId,
        resourceId,
        module: 'calendar',
        standard_folder: false,
        title: resourceData.display_name,
        own_rights: 0,
        permissions: [{ bits: 0, entity: ox.user_id, group: false }],
        subscribed: true,
        parentFolderGroup: title,
        'com.openexchange.calendar.extendedProperties': folder['com.openexchange.calendar.extendedProperties']
      })
    })
    api.pool.addCollection(group.folderId, resourceModels)
  })
}

addReadyListener('settings', addVirtualResourceCalendarFolders)
api.on('after:flat:event cache:flat:event', addVirtualResourceCalendarFolders)
resourceAPI.on('update remove', addVirtualResourceCalendarFolders)
