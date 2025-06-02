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

import { settings } from '@/io.ox/core/settings'
import registry from '@/io.ox/core/main/registry'

export default async function (baton) {
  const container = $(this).closest('.contact-detail.view')
  const contact = {}

  // copy data with values
  _(baton.data).each(function (value, key) {
    if (value) contact[key] = value
  })

  // create in default folder
  contact.folder_id = String(settings.get('folder/contacts'))

  // launch edit app
  baton.data = await registry.call('io.ox/contacts/edit', 'edit', contact)
  container.triggerHandler('redraw', baton)
};
