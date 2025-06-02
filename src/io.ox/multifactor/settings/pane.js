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
import * as util from '@/io.ox/core/settings/util'
import api from '@/io.ox/multifactor/api'
import factorRenderer from '@/io.ox/multifactor/factorRenderer'
import yell from '@/io.ox/core/yell'

import { settings } from '@/io.ox/multifactor/settings'
import '@/io.ox/multifactor/settings/style.scss'

import gt from 'gettext'

let INDEX = 0
let statusDiv, backupDiv, hasBackup

ext.point('io.ox/multifactor/settings/detail/view').extend(
  {
    id: 'status',
    index: INDEX += 100,
    render () {
      statusDiv = $('<div id="multifactorStatus" class="multifactorStatusDiv">')
      this.$el.append(util.fieldset(
        gt('Verification Options'),
        statusDiv,
        $('<div class="flex mt-8">').append(
          $('<button id="addDevice" class="btn btn-primary">')
            .text(gt('Add verification option'))
            .on('click', () => addMultifactor()),
          $('<span class="settings-explanation ml-auto">')
            .append(
              util.helpButton('ox.appsuite.user.sect.security.multifactor.settings.html')
            )
        )
      ))
    }
  },
  {
    id: 'recoveryDevices',
    index: INDEX += 100,
    render () {
      backupDiv = $('<div id="multifactorStatus" class="multifactorBackupDiv">')
      const fieldset = util.fieldset(
        gt('Recovery Options'),
        backupDiv,
        $('<button id="addBackupDevice" class="btn btn-primary mt-8 addBackupDevice">')
          .text(gt('Add recovery option'))
          .on('click', () => addMultifactor(true))
      ).addClass('multifactorBackupField')
      this.$el.append(fieldset)
      refresh(statusDiv, backupDiv)
    }
  }
)

// Refresh the status div and update buttons
function refresh (statusDiv, backupDiv) {
  if (!statusDiv) {
    statusDiv = $('.multifactorStatusDiv')
    backupDiv = $('.multifactorBackupDiv')
  }
  ox.busy(true)
  statusDiv.empty()
  backupDiv.empty()
  api.getDevices().then(function (status) {
    drawStatus(statusDiv, status)
  })
  api.getDevices('BACKUP').then(function (status) {
    drawStatus(backupDiv, status, true)
    if (status.length > 0) {
      $('.addBackupDevice').hide()
    } else {
      $('.addBackupDevice').show()
    }
    statusDiv.addClass('mfLoaded')
  })
    .always(function () {
      ox.idle()
    })
}

// Draw the status div, including proper buttons
function drawStatus (node, devices, isBackup) {
  if (devices) {
    if (devices && devices.length > 0) {
      node.append(factorRenderer.renderDeletable(devices))
      $('.multifactorRecoverySection').show()
      addDeleteAction(node) // Add button actions
      addEditAction(node)
      $('.multifactorBackupField').show()
      if (isBackup) {
        hasBackup = true
      }
      if (!settings.get('allowMultiple')) {
        $('#addDevice').hide()
      }
      return
    }
  }
  if (isBackup) {
    hasBackup = false
  } else {
    node.append($('<div class="emptyMultifactor">').append(gt('No 2-step verification options configured yet.')))
    $('.multifactorBackupField').hide()
    $('#addDevice').show()
  }
}

function addDeleteAction (node) {
  node.find('.mfDelete').click(function (e) {
    e.preventDefault()
    removeMultifactor($(e.target).closest('.multifactordevice'))
  })
}

function addEditAction (node) {
  node.find('.mfEdit').click(function (e) {
    e.preventDefault()
    editMultifactor($(e.target).closest('.multifactordevice'))
  })
}

// Button actions

function removeMultifactor (toDelete) {
  ox.load(() => import('@/io.ox/multifactor/settings/views/deleteMultifactorView')).then(function ({ default: view }) {
    view.open(toDelete).then(function () {
      refresh()
    })
  })
}

function editMultifactor (toEdit) {
  ox.load(() => import('@/io.ox/multifactor/settings/views/editMultifactorView')).then(function ({ default: view }) {
    view.open(toEdit).then(function () {
      refresh()
    })
  })
}

function addMultifactor (backup) {
  api.getProviders(backup).then(function (data) {
    if (data && data.providers) {
      ox.load(() => import('@/io.ox/multifactor/settings/views/addMultifactorView')).then(function ({ default: view }) {
        view.open(data.providers, backup).then(function () {
          refresh()
          if (!backup && !hasBackup) { // If we don't have any backup providers, try adding now.
            addMultifactor(true)
          }
        })
      })
    } else {
      // #. Error message when trying to get available providers from middleware
      yell('error', gt('Problem getting 2-step verification providers'))
    }
  })
}
