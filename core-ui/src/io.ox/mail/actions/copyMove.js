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
import api from '@/io.ox/mail/api'
import folderAPI from '@/io.ox/core/folder/api'
import ext from '@/io.ox/core/extensions'
import capabilities from '@/io.ox/core/capabilities'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

export default {

  multiple (o) {
    import('@/io.ox/core/folder/actions/move').then(function ({ default: move }) {
      let folderId, createRule, runFlag
      function generateRule () {
        import('@/io.ox/mail/mailfilter/settings/filter').then(function ({ default: filter }) {
          filter.initialize().then(function (data, config, opt) {
            const factory = opt.model.protectedMethods.buildFactory('io.ox/core/mailfilter/model', opt.api)
            const args = { data: { obj: factory.create(opt.model.protectedMethods.provideEmptyModel()) } }
            const hasAddress = opt.filterDefaults.getTests(config).address
            let preparedTest

            args.data.obj.set('config', config)
            args.data.obj.set('actioncmds', [{ id: 'move', into: folderId }])
            if (senderList.length > 1) {
              preparedTest = { id: 'anyof', tests: [] }
              _.each(senderList, function (item) {
                if (hasAddress) {
                  preparedTest.tests.push({ comparison: 'is', headers: ['from'], id: 'address', addresspart: 'all', values: [item] })
                } else {
                  preparedTest.tests.push({ comparison: 'contains', headers: ['From'], id: 'header', values: [item] })
                }
              })
            } else {
              preparedTest = hasAddress
                ? {
                    comparison: 'is',
                    headers: ['from'],
                    id: 'address',
                    addresspart: 'all',
                    values: [senderList[0]]
                  }
                : {
                    comparison: 'contains',
                    headers: ['From'],
                    id: 'header',
                    values: [senderList[0]]
                  }
            }

            args.data.obj.set('test', preparedTest)

            ext.point('io.ox/settings/mailfilter/filter/settings/detail').invoke('draw', undefined, args, config)
          })
        })
      }

      const senderList = _.chain(folderAPI.ignoreSentItems(o.list))
        .map(function (obj) {
          let sender = gt('unknown sender')
          if (_.isArray(obj.from) && obj.from[0] && obj.from[0][1]) sender = obj.from[0][1]
          return sender
        })
        .uniq()
        .value()

      // do not use "gt.ngettext" for plural without count
      const infoText = (senderList.length === 1)
      // #. informs user about the consequences when creating a rule for selected mails
        ? gt('All future messages from the sender will be moved to the selected folder.')
      // #. informs user about the consequences when creating a rule for selected mails
        : gt('All future messages from the senders of the selected mails will be moved to the selected folder.')

      move.item({
        all: o.list,
        api,
        button: o.label,
        list: folderAPI.ignoreSentItems(o.list),
        module: 'mail',
        root: '1',
        settings,
        success: o.success,
        target: o.baton.target,
        title: o.label,
        type: o.type,
        pickerInit (dialog, tree) {
          dialog.on('ok', function () { folderId = tree.selection.get() })

          if (_.device('small') || !capabilities.has('mailfilter_v2') || o.type !== 'move') return

          dialog.addCheckbox({ label: gt('Create filter rule'), action: 'create-rule', className: '', status: false })
          const checkbox = dialog.$footer.find('[name="create-rule"]')
          const infoblock = $('<div class="help-block">')
          // modify footer and place info block
          checkbox.closest('.checkbox').addClass('checkbox-block text-left')
            .after(infoblock)
          // change listeners
          checkbox.on('change', function onStateChange () {
            createRule = $(this).prop('checked')
            if (createRule) return infoblock.text(infoText)
            infoblock.empty()
          })
          tree.on('change', function onFolderChange (id) {
            const isDefaultAccount = id.split('/')[0] === 'default0'
            checkbox.closest('.checkbox').toggleClass('disabled', !isDefaultAccount)
            if (isDefaultAccount) return checkbox.prop('disabled', false)
            checkbox.prop({ checked: false, disabled: true }).trigger('change')
            infoblock.empty()
          })
        },
        pickerClose () {
          if (!runFlag && o.type === 'move' && createRule && folderId) {
            generateRule()
            runFlag = true
          }
        }
      })
    })
  }
}
