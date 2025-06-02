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
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import { addReadyListener } from '@/io.ox/core/events'
import mini from '@/io.ox/backbone/mini-views'
import * as util from '@/io.ox/core/settings/util'
import { st, isConfigurable } from '@/io.ox/settings/index'

import { settings } from '@/io.ox/files/settings'
import gt from 'gettext'

addReadyListener('capabilities:user', (capabilities) => {
  // change events
  settings.on('change', function () {
    settings.saveAndYell()
  })

  settings.on('change:showHidden', function () {
    import('@/io.ox/core/folder/api').then(function ({ default: folderAPI }) {
      folderAPI.refresh()
    })
  })

  //
  // Extensible View
  //

  ext.point('io.ox/files/settings/detail').extend({
    index: 100,
    id: 'view',
    draw () {
      this.append(
        util.header(
          st.DRIVE,
          'ox.appsuite.user.sect.drive.settings.html'
        ),
        new ExtensibleView({ point: 'io.ox/files/settings/detail/view', model: settings })
          .inject({
            getUploadOptions () {
              return [
                { label: gt('Add new version'), value: 'newVersion' },
                { label: gt('Add new version and show notification'), value: 'announceNewVersion' },
                { label: gt('Rename automatically and keep both files separately'), value: 'newFile' }
              ]
            },
            getAutoPlayOptions () {
              return [
                { label: gt('Show all images just once'), value: 'loopOnceOnly' },
                { label: gt('Repeat slideshow'), value: 'loopEndlessly' }
              ]
            },
            getAutoPlayPauseOptions () {
              return _.map([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40, 50, 60], function (i) {
                return {
                  value: String(i),
                  label: gt.ngettext('%1$d second', '%1$d seconds', i, i)
                }
              })
            },
            getRetentionDaysOptions (retentionDays) {
              const entries = [
                { label: gt('Unlimited'), value: 0 },
                { label: gt('1 day'), value: 1 },
                { label: gt('7 days'), value: 7 },
                { label: gt('30 days'), value: 30 },
                { label: gt('60 days'), value: 60 },
                { label: gt('90 days'), value: 90 },
                { label: gt('1 year'), value: 365 }
              ]
              const entry = _.findWhere(entries, { value: retentionDays })
              if (!entry) {
                entries.unshift({
                  label: gt.ngettext('%1$d day', '%1$d days', retentionDays, retentionDays),
                  value: retentionDays
                })
              }
              return entries
            },
            getMaxVersionsOptions (maxVersions) {
              const entries = [
                { label: gt('Unlimited'), value: 0 },
                { label: gt('1 version'), value: 2 },
                { label: gt('5 versions'), value: 6 },
                { label: gt('10 versions'), value: 11 },
                { label: gt('20 versions'), value: 21 },
                { label: gt('30 versions'), value: 31 },
                { label: gt('40 versions'), value: 41 },
                { label: gt('50 versions'), value: 51 },
                { label: gt('60 versions'), value: 61 },
                { label: gt('70 versions'), value: 71 },
                { label: gt('80 versions'), value: 81 },
                { label: gt('90 versions'), value: 91 },
                { label: gt('100 versions'), value: 101 }
              ]
              const entry = _.findWhere(entries, { value: maxVersions })
              if (!entry) {
                entries.unshift({
                  label: gt.ngettext('%1$d version', '%1$d versions', maxVersions - 1, maxVersions - 1),
                  value: maxVersions
                })
              }
              return entries
            }
          })
          .build(function () {
            this.$el.addClass('settings-body io-ox-drive-settings')
          })
          .render().$el
      )
    }
  })

  let INDEX = 0
  ext.point('io.ox/files/settings/detail/view').extend(
    {
      id: 'add',
      index: INDEX += 100,
      render: util.renderExpandableSection(st.ADDING_FILES, st.ADDING_FILES_EXPLANATION, 'io.ox/files/settings/add', true)
    },
    {
      id: 'advanced',
      index: 10000,
      render: util.renderExpandableSection(st.DRIVE_ADVANCED, '', 'io.ox/files/settings/advanced')
    }
  )

  INDEX = 0
  ext.point('io.ox/files/settings/add').extend(
    {
      id: 'names',
      index: INDEX += 100,
      render ({ view }) {
        this.append(
          util.fieldset(
            st.IDENTICAL_NAMES,
            new mini.CustomRadioView({ name: 'uploadHandling', model: settings, list: view.getUploadOptions() }).render().$el
          )
        )
      }
    }
  )

  INDEX = 0
  ext.point('io.ox/files/settings/advanced').extend(
    //
    // Advanced
    //
    {
      id: 'advanced',
      index: 10000,
      render () {
        if (!isConfigurable.HIDDEN_FILES) return
        this.append(
          $('<div class="form-group">').append(
            util.checkbox('showHidden', st.HIDDEN_FILES, settings)
          )
        )
      }
    },
    //
    // Autoplay
    //
    {
      id: 'autoplay',
      index: INDEX += 100,
      render ({ view }) {
        this.append(
          util.fieldset(
            st.AUTOPLAY_MODE,
            $('<div class="form-group">').append(
              new mini.CustomRadioView({ name: 'autoplayLoopMode', model: settings, list: view.getAutoPlayOptions() }).render().$el
            ),
            util.compactSelect('autoplayPause', st.AUTOPLAY_PAUSE, settings, view.getAutoPlayPauseOptions(), { width: 3 })
          )
        )
      }
    },
    //
    // Automatic version cleanup
    //
    {
      id: 'versionCleanup',
      index: INDEX += 100,
      render ({ view }) {
        const retentionDays = settings.get('features/autodelete/retentionDays')
        const maxVersions = settings.get('features/autodelete/maxVersions')

        // disabled
        if (!capabilities.has('autodelete_file_versions')) {
          // nothing configured
          if (!retentionDays && !maxVersions) return
          // configured by admin
          this.append(
            util.fieldset(
              st.FILE_VERSION_HISTORY,
              $('<span>').append(gt('Timeframe')),
              $('<ul>').append($('<li>').append((retentionDays <= 0)
                ? gt('The timeframe is not limited.')
              // #. %1$d is the number of days
              // #, c-format
                : gt.ngettext('The timeframe is limited to %1$d day.', 'The timeframe is limited to %1$d days.', retentionDays, retentionDays)
              )),
              $('<span>').append(gt('File version limit')),
              $('<ul>').append($('<li>').append((maxVersions <= 0)
                ? gt('The number of versions is not limited.')
              // #. %1$d is the number of versions
              // #, c-format
                : gt.ngettext('The number of versions is limited to %1$d version.', 'The number of versions is limited to %1$d versions.', maxVersions - 1, maxVersions - 1)
              ))
            ).addClass('file-version-history')
          )
          return
        }

        this.append(
          util.fieldset(
            st.FILE_VERSION_HISTORY,
            $('<div class="form-group mb-24">').append(
              util.compactSelect('features/autodelete/retentionDays', st.VERSION_RETENTION, settings, view.getRetentionDaysOptions(retentionDays), { width: 4, integer: true }),
              util.explanation(
                gt('This setting defines for how long file version are kept until they get deleted automatically after next sign-in')
              )
            ),
            $('<div class="form-group mb-24">').append(
              util.compactSelect('features/autodelete/maxVersions', st.VERSION_LIMIT, settings, view.getMaxVersionsOptions(maxVersions), { width: 4, integer: true }),
              util.explanation(
                gt('This setting defines how many versions will be kept. Older versions that exceed this limit will be automatically deleted')
              )
            )
          ).addClass('file-version-history')
        )
        if (!settings.get('features/autodelete/editable')) {
          this.find('#settings-features\\/autodelete\\/retentionDays').attr('disabled', true)
          this.find('#settings-features\\/autodelete\\/maxVersions').attr('disabled', true)
        }
      }
    }
  )
})
