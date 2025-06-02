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

import capabilities from '@/io.ox/core/capabilities'
import upsell from '@/io.ox/core/upsell'
import gt from 'gettext'

export const subscribe = function (baton) {
  const dropdown = this
  if (baton.appId !== 'io.ox/contacts') return
  if (!capabilities.has('subscription') && !upsell.enabled(['subscription'])) return

  this.action('io.ox/contacts/actions/subscribe', gt('Subscribe to address book'), baton)

  // if there is nothing configured we do not show the "subscribe" button
  import('@/io.ox/core/sub/subscriptions').then(({ getSubscribableServices }) => {
    getSubscribableServices('contacts', baton.app.subscription).then((sources) => {
      if (sources.length) return
      dropdown.$ul.find('[data-name="io.ox/contacts/actions/subscribe"]').closest('li').remove()
    })
  })
}

export const subscribeShared = function (baton) {
  const dropdown = this
  if (baton.appId !== 'io.ox/contacts') return
  // dialog serves multiple purposes, manage sync via carddav (all folder types) or subscribe/unsubscribe shared or public folders
  if (!capabilities.has('edit_public_folders || read_create_shared_folders || carddav')) return
  this.action('io.ox/contacts/actions/subscribe-shared', gt('Subscribe to shared address books'), baton)

  import('@/io.ox/core/sub/subscriptions').then(async ({ getAvailableServices }) => {
    const services = await getAvailableServices()
    if (services.contacts) return
    dropdown.$ul.find('[data-name="io.ox/contacts/actions/subscribe-shared"]').closest('li').remove()
  })

  this.divider()
}

export default {
  subscribe,
  subscribeShared
}
