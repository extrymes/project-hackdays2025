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

const helperUtil = require('@open-xchange/codecept-helper/src/util.js')
require('codeceptjs')
const { getConfig } = require('codeceptjs/lib/command/utils')

const removeContexts = async () => {
  const codeceptDir = process.cwd()
  const config = getConfig(codeceptDir)
  const { admin } = config.helpers.OpenXchange

  try {
    const [contexts] = await helperUtil.executeSoapRequest('OXContextService', 'listAll', {
      auth: admin
    })
    const contextIds = contexts.return.map(context => context.id).filter(id => id >= 100)
    /* await Promise.all([
      contextIds.forEach(filteredId => {
        helperUtil.executeSoapRequest('OXContextService', 'delete', {
          auth: admin,
          ctx: { id: filteredId }
        })
      })
    ]) */
    console.log(contextIds.length)
  } catch (error) {
    console.log(error)
  }
}

removeContexts()
