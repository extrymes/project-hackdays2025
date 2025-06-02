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
import $ from '@/jquery'
import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import { settings } from '@/io.ox/core/settings'
import { settings as dynamicSettings } from '@/io.ox/core/theming/dynamic/settings'
import { getSVGLogo, colorToHSL, colorToRGB, getRelativeLuminance, shadeColor } from '@/io.ox/core/theming/util'
import capabilities from '@/io.ox/core/capabilities'

const dynamics = {
  mapping: {
    linkColor: ['link', 'link-hover'],
    toolbarColor: ['toolbar'],
    mainColor: [
      'focus-500', 'btn-primary-background', 'btn-primary-hover-background',
      'selected-background-focus', 'selected-background-focus-shade', 'selected-background-focus-hover'
    ],
    topbarColor: ['topbar-icon'],
    topbarBackground: ['topbar-background'],
    topbarHover: ['topbar-hover'],
    listHover: ['selected-background-hover'],
    listSelected: ['selected-background', 'selected-background-shade'],
    listSelectedFocus: ['selected-background-focus', 'selected-background-focus-shade', 'selected-background-focus-hover'],
    folderBackground: ['sidepanel-background'],
    folderHover: ['sidepanel-selectable-background-hover'],
    folderSelected: ['sidepanel-selected-background', 'sidepanel-selected-background-hover'],
    folderSelectedFocus: ['sidepanel-selected-background-focus', 'sidepanel-selected-background-focus-shade']
  },
  transform: {
  }
}

// same defaults as unchanged /opt/open-xchange/etc/settings/open-xchange-dynamic-theme.properties
const defaults = {
  mainColor: '#283f73',
  linkColor: '@io-ox-dynamic-theme-mainColor',
  toolbarColor: '@io-ox-dynamic-theme-mainColor',
  loginColor: '#1f3d66',
  headerPrefixColor: '#6cbafc',
  headerColor: '#fff',
  headerLogo: '',
  logoURL: '',
  logoWidth: 60,
  logoHeight: 'auto',
  topbarBackground: '@io-ox-dynamic-theme-mainColor',
  topbarColor: '#fff',
  topbarHover: 'rgba(0, 0, 0, 0.3)',
  topbarHoverColor: '@io-ox-dynamic-theme-topbarColor',
  listSelected: '#ddd',
  listHover: '#f7f7f7',
  listSelectedFocus: '@io-ox-dynamic-theme-mainColor',
  folderBackground: '#f5f5f5',
  folderSelected: 'rgba(0, 0, 0, 0.1)',
  folderHover: 'rgba(0, 0, 0, 0.05)',
  folderSelectedFocus: '@io-ox-dynamic-theme-mainColor'
}

function apply (themes) {
  if (!capabilities.has('dynamic-theme')) return
  const settings = dynamicSettings.get()
  // don't do anything if config is empty
  if (!Object.keys(settings).length) return
  // don't do anything in case of unchanged defaults
  if (_.isEqual(defaults, settings)) return
  // avoid changing accent color (it might look very strange)
  themes.white.changeAccentColor = false
  // runtime defaults
  const vars = themes.white.variables
  const values = Object.assign(defaults, settings)
  Object.entries(dynamics.mapping).forEach(([id, list]) => {
    let value = values[id]
    if (!value) return
    value = String(value).replace(/^@(io-ox-dynamic-theme-.+)$/, 'var(--$1)')
    list.forEach(variable => {
      vars[variable] = (dynamics.transform[variable] || _.identity)(value)
    })
  })
  // allow self-reference
  Object.entries(values).forEach(([id, value]) => {
    if (/^logo/i.test(id)) return
    vars['io-ox-dynamic-theme-' + id] = String(value).replace(/^@(io-ox-dynamic-theme-.+)$/, 'var(--$1)')
  })
  // apply main color as accent color to get all shades
  if (values.mainColor) {
    const [h, s] = colorToHSL(values.mainColor)
    themes.white.defaultAccent = `${h}, ${s}`
    const luminanceShift = getProperLuminanceShift(values.mainColor)
    vars['accent-luminance-shift'] = luminanceShift + '%'
    vars['gray-base'] = '0, 0%'
    if (!values.listSelected) {
      vars['selected-background'] = 'var(--gray-100)'
      vars['selected-background-shade'] = 'var(--gray-200)'
    }
    if (!values.topbarHover) {
      vars['topbar-hover'] = shadeColor(values.mainColor, -5)
    }
  }
}

function getProperLuminanceShift (color) {
  const [h, s] = colorToHSL(color)
  let shift = 0
  while (true) {
    const accent500 = `hsl(${h}, ${s}%, ${48 - shift}%)`
    const contrast = colorContrast(accent500)
    if (contrast > 4.5) return shift
    shift += 5
  }
}

// color compared against white background (l1 = 1 + 0.05)
function colorContrast (color) {
  return 1.05 / (getRelativeLuminance(colorToRGB(color)) + 0.05)
}

async function getLogo (dark = false) {
  const { path, width, height } = getLogoData(dark)
  return ((/^(?!https?:).*\.svg$/i).test(path) ? $(await getSVGLogo(path)) : $('<img>').attr({ src: path })).width(width || '').height(height || '')
}

function getLogoData (dark = false) {
  const result = ext.point('io.ox/core/theming/logo').invoke('get', null, ext.Baton({ dark })).compact().value()
  return result[0]
}

function getLogoURLs () {
  // can be primitive (<url>) or non-primitive ({ light: <url>, dark: <url> })
  const data = dynamicSettings.get('logoURL', '')
  const logoURL = data.light || data
  const logoURLDark = data.dark || dynamicSettings.get('logoURLDark')
  return { logoURL, logoURLDark }
}

ext.point('io.ox/core/theming/logo').extend(
  {
    id: 'dynamic',
    index: 100,
    get (baton) {
      // check dynamic theme first
      const logos = getLogoURLs()
      const path = capabilities.has('dynamic-theme') && ((baton.dark && logos.logoURLDark) || logos.logoURL)
      if (!path) return false
      baton.stopPropagation()
      // fix for old and non-working config in dynamic themes, see OXUIB-1618
      let height = dynamicSettings.get('logoHeight')
      let width = dynamicSettings.get('logoWidth')
      if (/(^\s*$|auto)/i.test(width || '') && /auto/i.test(height)) {
        console.warn(`Dynamic-theme: Config contains incompatible values for logo size (height: '${height}', width: '${width}'). Applying fallback.`)
        height = ''
        width = 'auto'
      }
      return { path, width, height }
    }
  },
  {
    id: 'ox-logo',
    index: 200,
    get (baton) {
      // use OX logo?
      if (!ox.serverConfig.useOXLogo) return false
      baton.stopPropagation()
      return { path: './themes/default/ox_logo.svg', height: '24px' }
    }
  },
  {
    id: 'default',
    index: 300,
    get (baton) {
      // default path
      const theme = settings.get('theme') || 'default'
      const base = settings.get('theming/logo/base', `./themes/${theme}`)
      // special config for small devices?
      const section = _.device('smartphone') && settings.get('theming/logo/smartphone') ? '/smartphone' : ''
      // use configurable logo or default
      const configuredLogo = (baton.dark && settings.get(`theming/logo${section}/dark`)) || settings.get(`theming/logo${section}/name`)
      return { path: base + '/' + (configuredLogo || 'logo-dynamic.svg'), height: settings.get(`theming/logo${section}/height`) }
    }
  }
)

export default { apply, getLogo, getLogoData, getLogoURLs }
