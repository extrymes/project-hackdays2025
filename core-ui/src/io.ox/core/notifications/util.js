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

import ext from '@/io.ox/core/extensions'

export function mediator (name, obj) {
  // get extension point
  const point = ext.point(`${name}/mediator`); let index = 0
  // loop over key/value object
  Object.entries(obj).forEach(([id, fn]) => {
    point.extend({ id, index: (index += 100), setup: fn })
  })
}

export async function mediate (name, obj) {
  const list = ext.point(`${name}/mediator`).list()
  for (const extension of list) {
    try {
      if (extension.setup) await extension.setup(obj)
    } catch (e) {
      console.error('mediate', extension.id, e.message, e)
    }
  }
  return obj
}
