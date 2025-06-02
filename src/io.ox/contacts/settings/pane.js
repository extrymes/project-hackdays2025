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
import mini from '@/io.ox/backbone/mini-views'
import * as util from '@/io.ox/core/settings/util'
import capabilities from '@/io.ox/core/capabilities'
import names from '@/io.ox/contacts/names'
import { st, isConfigurable } from '@/io.ox/settings/index'

import { settings } from '@/io.ox/contacts/settings'
import gt from 'gettext'

ext.point('io.ox/contacts/settings/detail').extend({
  index: 100,
  id: 'view',
  draw () {
    this.append(
      util.header(
        st.CONTACTS,
        'ox.appsuite.user.sect.contacts.settings.html'
      ),
      new ExtensibleView({ point: 'io.ox/contacts/settings/detail/view', model: settings })
        .inject({
          getNameOptions () {
            const localizedExample = _.printf(names.localizedFullnameFormats.withoutTitle, gt('First name'), gt('Last name'))
            return [
              { label: gt('Language-specific default (%s)', localizedExample), value: 'auto' },
              { label: gt('First name Last name'), value: 'firstname lastname' },
              { label: gt('Last name, First name'), value: 'lastname, firstname' }
            ]
          },
          getMapOptions () {
            const options = [
              { label: gt('Google Maps'), value: 'google' },
              { label: gt('Open Street Map'), value: 'osm' },
              { label: gt('No link'), value: 'none' }
            ]
            if (_.device('ios || macos')) options.splice(2, 0, { label: gt('Apple Maps'), value: 'apple' })
            return options
          }
        })
        .build(function () {
          this.$el.addClass('settings-body io-ox-contacts-settings')
          this.listenTo(settings, 'change', function () {
            settings.saveAndYell()
          })
        })
        .render().$el
    )
  }
})

let INDEX = 0
ext.point('io.ox/contacts/settings/detail/view').extend(
  {
    id: 'view',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.CONTACTS_VIEW, st.CONTACTS_VIEW_EXPLANATION, 'io.ox/contacts/settings/view', true)
  },
  {
    id: 'advanced',
    index: 10000,
    render: util.renderExpandableSection(st.CONTACTS_ADVANCED, '', 'io.ox/contacts/settings/advanced')
  }
)

INDEX = 0
ext.point('io.ox/contacts/settings/view').extend(
  //
  // Display name
  //
  {
    id: 'names',
    index: INDEX += 100,
    render ({ view }) {
      this.append(
        util.fieldset(
          st.NAME_FORMAT,
          util.explanation(gt('This setting allows you to choose how names consisting of first and last name are formatted')),
          new mini.CustomRadioView({ name: 'fullNameFormat', model: settings, list: view.getNameOptions() }).render().$el
        )
      )
    }
  },
  //
  // Map service
  //
  {
    id: 'map-service',
    index: INDEX += 100,
    render ({ view }) {
      if (!isConfigurable.MAP_SERVICE) return
      this.append(
        util.fieldset(
          st.MAP_SERVICE,
          capabilities.has('calendar')
            ? util.explanation(gt('Postal addresses might appear in address book entries as well as in the appointment location field'))
            : $(),
          new mini.CustomRadioView({ name: 'mapService', model: settings, list: view.getMapOptions() }).render().$el
        )
      )
    }
  }
)

INDEX = 0
ext.point('io.ox/contacts/settings/advanced').extend(
  //
  // Initial folder
  //
  {
    id: 'startfolder',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.START_IN_GAB) return
      this.append(
        $('<div class="form-group">').append(
          util.checkbox('startInGlobalAddressbook', st.START_IN_GAB, settings)
        )
      )
    }
  },
  {
    id: 'shared-address-books',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.SUBSCRIBE_ADDRESSBOOK) return

      function openDialog () {
        import('@/io.ox/core/sub/sharedFolders').then(function ({ default: subscribe }) {
          subscribe.open({
            module: 'contacts',
            help: 'ox.appsuite.user.sect.contacts.folder.subscribeshared.html',
            title: gt('Subscribe to shared address books'),
            tooltip: gt('Subscribe to address book'),
            point: 'io.ox/core/folder/subscribe-shared-address-books',
            noSync: !capabilities.has('carddav'),
            sections: {
              public: gt('Public'),
              shared: gt('Shared'),
              private: gt('Private'),
              hidden: gt('Hidden')
            }
          })
        })
      }

      this.append(
        $('<div>').append(
          $('<button type="button" class="btn btn-default" data-action="subscribe-shared-address-books">')
            .text(gt('Subscribe to shared address books'))
            .on('click', openDialog)
        )
      )
    }
  }
)
