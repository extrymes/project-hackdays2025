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
import folderAPI from '@/io.ox/core/folder/api'
import '@/io.ox/mail/mailfilter/settings/filter/actions/register'
import '@/io.ox/mail/mailfilter/settings/filter/tests/register'

function reduce (point, config, cb, memo) {
  return ext.point(point)
    .filter(point => {
      if (_.isUndefined(point.supported)) return true
      if (_.isFunction(point.supported)) return point.supported(config)
      return point.supported
    })
    .reduce((memo, point) => cb(memo, point), memo)
}

const defaults = {
  applyMailFilterSupport: false,

  getConditionsTranslation (config) {
    return reduce('io.ox/mail/mailfilter/tests', config, (memo, point) => {
      return Object.assign(memo, point.translations)
    }, {})
  },

  getActionsTranslations (config) {
    return reduce('io.ox/mail/mailfilter/actions', config, (memo, point) => {
      return Object.assign(memo, point.translations)
    }, {})
  },

  getActionCapabilities (config) {
    return reduce('io.ox/mail/mailfilter/actions', config, (memo, point) => {
      return Object.assign(memo, point.actionCapabilities)
    }, {})
  },

  getConditionsMapping (config) {
    return reduce('io.ox/mail/mailfilter/tests', config, (memo, point) => {
      return Object.assign(memo, point.conditionsMapping)
    }, {})
  },

  getActionsOrder (config) {
    return reduce('io.ox/mail/mailfilter/actions', config, (memo, point) => {
      if (_.isFunction(point.order)) point.order(memo)
      else if (_.isArray(point.order)) memo.push.apply(memo, point.order)
      else memo.push(point.id)

      return memo
    }, [])
  },

  getConditionsOrder (config) {
    return reduce('io.ox/mail/mailfilter/tests', config, (memo, point) => {
      if (_.isFunction(point.order)) point.order(memo)
      else if (_.isArray(point.order)) memo.push.apply(memo, point.order)
      else memo.push(point.id)

      return memo
    }, [])
  },

  getActions (config) {
    return reduce('io.ox/mail/mailfilter/actions', config, (memo, point) => {
      return Object.assign(memo, point.actions)
    }, {})
  },

  getTests (config) {
    return reduce('io.ox/mail/mailfilter/tests', config, (memo, { tests }) => {
      if (_.isFunction(tests)) tests = tests(config)
      return Object.assign(memo, tests)
    }, {
      true: {
        id: 'true'
      }
    })
  }
}

// for whatever reason support for "apply filter to folder" is not exposed as general capability
// since SIEVE rules can only apply to default0 folders, check the INBOX for support
folderAPI.get('default0/INBOX').then(function (f) {
  defaults.applyMailFilterSupport = _(f.supported_capabilities).contains('MAIL_FILTER')
})

export default defaults
