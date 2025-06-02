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
import capabilities from '@/io.ox/core/capabilities'
import { settings } from '@/io.ox/core/settings'

import gt from 'gettext'

ext.point('io.ox/core/appcontrol/right/settings').extend({
  id: 'connect-wizard',
  index: 200,
  enabled: capabilities.has('client-onboarding'),
  extend () {
    if (_.device('smartphone') || !settings.get('onboardingWizard')) return

    this.link('connect-wizard', gt('Connect your device'), async function () {
      const { default: wizard } = await import('@/io.ox/onboarding/main')
      wizard.load()
    })
  }
})

ext.point('io.ox/core/appcontrol/right/account').extend({
  id: 'connect-wizard-mobile',
  index: 120,
  enabled: capabilities.has('client-onboarding'),
  extend () {
    if (!_.device('smartphone') || !settings.get('onboardingWizard')) return

    this.link('connect-wizard-mobile', gt('Connect this device'), async function () {
      const { default: wizard } = await import('@/io.ox/onboarding/main')
      wizard.load()
    })
  }
})
