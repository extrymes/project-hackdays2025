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

import gt from 'gettext'
import { deriveAppointmentColors } from '@/io.ox/calendar/util'
import { getCategoriesFromModel } from '@/io.ox/core/categories/api'

// maps to deriveAppointmentColors but with special handling for transparent color
export function deriveCategoryColors (color) {
  return color !== 'transparent'
    ? deriveAppointmentColors(color)
    : {
        border: 'var(--border)',
        foreground: 'var(--text)',
        background: 'transparent'
      }
}

export function getCategoryColor (categories = [], pimId) {
  if (!pimId) return null
  const [model] = getCategoriesFromModel(categories, pimId)
  const color = model ? model.get('color') : null
  if (color === 'transparent') return null
  return color
}

// item picker
const colorsHEX = {
  transparent: 'transparent',
  red: '#ff2968',
  orange: '#ff9500',
  yellow: '#ffcc00',
  green: '#63da38',
  blue: '#16adf8',
  darkblue: '#d6dfff',
  purple: '#cc73e1',
  brown: '#a2845e',
  gray: '#707070'
}

const basecolors = [
  // #. Used as tooltip for no color option when creating categories
  { label: gt('No color'), value: colorsHEX.transparent },
  // #. Used as tooltip for red color option when creating categories
  { label: gt('Red'), value: colorsHEX.red },
  // #. Used as tooltip for orange color option when creating categories
  { label: gt('Orange'), value: colorsHEX.orange },
  // #. Used as tooltip for yellow color option when creating categories
  { label: gt('Yellow'), value: colorsHEX.yellow },
  // #. Used as tooltip for green color option when creating categories
  { label: gt('Green'), value: colorsHEX.green },
  // #. Used as tooltip for blue color option when creating categories
  { label: gt('Blue'), value: colorsHEX.blue },
  // #. Used as tooltip for dark blue color option when creating categories
  { label: gt('Dark Blue'), value: colorsHEX.darkblue },
  // #. Used as tooltip for purple color option when creating categories
  { label: gt('Purple'), value: colorsHEX.purple },
  // #. Used as tooltip for brown color option when creating categories
  { label: gt('Brown'), value: colorsHEX.brown },
  // #. Used as tooltip for gray color option when creating categories
  { label: gt('Gray'), value: colorsHEX.gray }
]

// cant export a pre-computed list, since theme (and thus deriveCategoryColors) might have changed
export function colors () { return basecolors.map(color => ({ ...color, ...deriveCategoryColors(color.value) })) }

export const icons = [
  // #. Used as tooltip for no icon option when creating categories
  { label: gt('No icon'), value: 'none' },
  // #. Used as tooltip for alarm icon option when creating categories
  { label: gt('Alarm'), value: 'bi/alarm.svg' },
  // #. Used as tooltip for camera icon option when creating categories
  { label: gt('Zoom'), value: 'bi/camera-video.svg' },
  // #. Used as tooltip for meeting icon option when creating categories
  { label: gt('Meeting'), value: 'bi/people.svg' },
  // #. Used as tooltip for exclamation mark icon option when creating categories
  { label: gt('Important'), value: 'bi/exclamation-circle.svg' },
  // #. Used as tooltip for briefcase icon option when creating categories
  { label: gt('Work'), value: 'bi/briefcase.svg' },
  // #. Used as tooltip for house icon option when creating categories
  { label: gt('Home'), value: 'bi/house-door.svg' },
  // #. Used as tooltip for star icon option when creating categories
  { label: gt('Favorite'), value: 'bi/star.svg' },
  // #. Used as tooltip (noun) for telephone icon option when creating categories
  { label: gt('Call'), value: 'bi/telephone.svg' },
  // #. Used as tooltip for mortarboard icon option when creating categories
  { label: gt('Learning'), value: 'bi/mortarboard.svg' }
]
