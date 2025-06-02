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

// cSpell:ignore Kleine, Mckenna, Daiga

import $ from '@/jquery'
import _ from '@/underscore'
import ext from '@/io.ox/core/extensions'
import gt from 'gettext'
import { settings } from '@/io.ox/core/settings'
import dynamic from '@/io.ox/core/theming/dynamic/main'
import ox from '@/ox'
import { addReadyListener } from '@/io.ox/core/events'
import GridView from '@/io.ox/backbone/mini-views/gridview'

ext.point('io.ox/topbar/settings-dropdown').extend({
  id: 'themes',
  index: 100,
  render () {
    if (!supportsPicker()) return
    const favorites = _(themes).pick('white', 'blue', 'steel', 'dark', 'mountains', 'beach', 'city', 'blueSunset')
    const currentTheme = getCurrentTheme()

    this.header(gt('Themes'))
    const items = Object.entries(favorites).map(([id, theme], i) =>
      $('<a role="menuitem" class="btn btn-default card card-m">')
        .attr({
          'data-keep-open': true,
          'data-name': id,
          title: theme.title,
          tabindex: -1
        })
        .toggleClass('current', currentTheme.id === id)
        .css('background', theme.backgroundPreview || theme.background || 'none')
        .on('click', handler.bind(null, id))
    )

    ox.on('themeChange', () => {
      const currentTheme = getCurrentTheme()
      $grid.find('.current').removeClass('current')
      $grid.find('[data-name=' + currentTheme.id + ']').addClass('current')
    })

    const $grid = new GridView({ items, label: 'Themes' }).render().$el
    $grid.addClass('px-20')
    this.append($grid)

    this.link('choose-theme', gt('View more ...'), choose)
    this.divider()
    function handler (theme, e) {
      e.preventDefault()
      settings.set('theming/autoDarkMode', false).save()
      setTheme(theme)
      setAccentColorFromTheme(theme)
      saveCurrent()
    }
  }
})

const accentColors = {
  red: { h: 0, s: 95, name: gt('Red') },
  orange: { h: 20, s: 90, name: gt('Orange') },
  yellow: { h: 40, s: 100, name: gt('Yellow') },
  // lemon: { hs: '75, 57', name: gt('Lemon') },
  green: { h: 110, s: 35, name: gt('Green') },
  petrol: { h: 174, s: 40, name: gt('Petrol') },
  // cyan: { hs: '187, 70', name: gt('Cyan') },
  // azure: { hs: '199, 80', name: gt('Azure') },
  blue: { h: 212, s: 50, name: gt('Blue') },
  indigo: { h: 226, s: 48, name: gt('Indigo') },
  purple: { h: 262, s: 52, name: gt('Purple') },
  magenta: { h: 291, s: 64, name: gt('Magenta') },
  pink: { h: 330, s: 82, name: gt('Pink') },
  gray: { h: 40, s: 5, name: gt('Warm Gray') },
  steel: { h: 240, s: 8, name: gt('Steel gray') }
  // midgray: { hs: '0, 0', name: gt('Gray') }
}

const appColors = {}
const coreApps = ['mail', 'calendar', 'contacts', 'tasks', 'files', 'portal']
const officeApps = ['text', 'spreadsheet', 'presentation']
coreApps.forEach(id => {
  appColors['io.ox/' + id] = `var(--app-color-${id})`
})
officeApps.forEach(id => {
  appColors['io.ox/office/' + id] = `var(--app-color-${id})`
  appColors['io.ox/office/portal/' + id] = `var(--app-color-${id})`
})

const groups = {
  default: gt('Default'),
  images: gt('Images'),
  sunsets: gt('Sunsets'),
  unicolor: gt('Unicolor'),
  washed: gt('Washed out')
}

const path = 'themes/default/backgrounds'

const themes = {
  white: {
    title: gt('White'),
    group: 'default',
    background: _.device('smartphone') ? 'var(--gray-5)' : 'linear-gradient(0deg, var(--gray-100) 50%, white)',
    backgroundPreview: 'white',
    defaultAccent: 'indigo',
    themeColor: _.device('smartphone') ? '#F4F3F1' : undefined,
    variables: {
      gap: '1px',
      'gap-radius': '0',
      'translucency-factor': 0,
      'backdrop-blur-factor': 0,
      'topbar-search-background': 'var(--gray-10)'
    },
    tint: false
  },
  smoke: {
    title: gt('Smoke Gray'),
    group: 'default',
    background: '#e5e5e5',
    backgroundPreview: '#f0f0f0',
    defaultAccent: 'petrol',
    themeColor: '#e5e5e5',
    tint: false,
    variables: {
      gap: '4px',
      background: '#fff',
      'translucent-high': '#fafafa',
      'translucent-medium': '#fafafa',
      'translucent-low': '#fafafa',
      'translucent-start': '#fafafa',
      'translucent-constant': 'transparent',
      'backdrop-blur-factor': 0,
      'sidepanel-selected-focus': 'white',
      'sidepanel-selected-background': '#d0d0d0',
      'sidepanel-selected-background-hover': '#dadada'
    }
  },
  solarized: {
    // no translation (thanks to https://ethanschoonover.com/solarized/)
    title: 'Solarized',
    group: 'default',
    background: '#eee8d5',
    backgroundPreview: '#eee8d5',
    defaultAccent: '237, 43',
    themeColor: '#eee8d5',
    tint: false,
    variables: {
      gap: '4px',
      'gray-base': '46, 42%',
      background: '#fdf6e3',
      'background-5': '#eee8d5',
      'background-base': '44, 87%, 94%',
      text: '#657b83',
      'text-gray': '#839496',
      'text-dark': '#586e75',
      'topbar-search-background': '#fdf6e3',
      'topbar-icon': '#657b83',
      toolbar: '#dc322f',
      'folder-icon': '#dc322f',
      avatar: '#859900',
      'avatar-background': '#85990030',
      link: '#268bd2',
      'link-hover': '#268bd2',
      'translucent-high': '#fdf6e3',
      'translucent-medium': '#fdf6e3',
      'translucent-low': '#fdf6e3',
      'translucent-start': '#fdf6e3',
      'translucent-constant': '#fdf6e3',
      'selected-background': 'var(--shade-a10)',
      'selected-background-hover': 'var(--background-200)',
      'selected-background-shade': 'var(--accent-300)',
      'presence-online': '#859900',
      'presence-absent': '#b58900',
      'presence-busy': '#dc322f',
      attention: '#dc322f',
      today: '#dc322f',
      missed: '#dc322f',
      'backdrop-blur-factor': 0,
      'countdown-background': '#859900',
      'countdown-background-started': '#586e75',
      'countdown-background-late': '#dc322f',
      'skeleton-background': '#fdf6e3'
    }
  },
  dark: {
    title: gt('Dark'),
    group: 'default',
    background: '#111',
    defaultAccent: '0, 0',
    themeColor: '#111',
    dark: true,
    variables: {
      'checkbox-svg': 'var(--checkbox-svg-dark)',
      'checkbox-svg-inverted': 'var(--checkbox-svg-white)',
      'radio-svg': 'var(--radio-svg-dark)',
      // increase luminance to provide adequate color contrast on dark background
      accent: 'var(--accent-300)',
      'btn-primary-background': 'var(--accent-700)',
      'btn-primary-background-hover': 'var(--accent-800)',
      link: 'var(--accent-300)',
      'link-hover': 'var(--accent-400)',
      toolbar: '#909090',
      text: '#b0b0b0',
      'text-disabled': '#505050',
      'text-accent': 'var(--accent-500)',
      background: '#222',
      'background-base': '0, 0%, 0%',
      'background-5': '#2a2a2a',
      'background-10': '#2d2d2d',
      'background-50': '#303030',
      'background-100': '#333',
      'background-200': '#444',
      'background-300': '#555',
      'shade-base': '0, 100%, 100%',
      'translucent-high': '#1a1a1a',
      'translucent-medium': '#1a1a1a',
      'translucent-low': '#1a1a1a',
      'translucent-start': '#1a1a1a',
      'translucent-constant': '#101010',
      'backdrop-blur-factor': 0,
      'text-gray': '#909090',
      'text-dark': '#d0d0d0',
      border: 'var(--background-200)',
      'border-bright': 'var(--background-200)',
      'border-subdued': 'var(--background-50)',
      'border-bootstrap': 'var(--background-200)',
      'tooltip-text': '#303030',
      'tooltip-background': 'var(--gray-100)',
      'topbar-icon': '#aaa',
      'topbar-search-background': '#222',
      'selected-background': '#333',
      'selected-background-shade': '#909090',
      'selected-background-focus': '#555',
      'btn-primary-outline': 'hsla(var(--accent-base), 50%, 50%)',
      'sidepanel-selected-background': '#333',
      'sidepanel-selected-background-hover': '#222',
      'sidepanel-selected-background-focus': 'var(--accent-700)',
      'btn-current': 'var(--accent-700)',
      gap: '1px',
      'gap-radius': '0',
      'button-circular': 'var(--accent)',
      'button-circular-hover': 'var(--text-gray-on-gray)',
      'button-circular-border': 'var(--border)',
      'button-circular-background': 'transparent',
      'selected-dropdown-background-hover': '#242424',
      'skeleton-background': '#535353'
    },
    tint: false
  },
  mountains: {
    title: gt('Mountains'),
    group: 'images',
    // Mountains, Italy
    // https://unsplash.com/photos/V1NVvXmO_dk by Konstantin Kleine
    background: `url("${path}/foggy_mountains.jpg") top/cover`,
    backgroundPreview: `url("${path}/foggy_mountains_preview.jpg") top/cover`,
    defaultAccent: 'petrol',
    themeColor: '#425369',
    variables: {
    }
  },
  beach: {
    title: gt('Beach'),
    group: 'images',
    // Beach
    // https://unsplash.com/photos/eXHeq48Z-Q4 by Frank Mckenna
    background: `url("${path}/beach.jpg") top/cover`,
    backgroundPreview: `url("${path}/beach_preview.jpg") top/cover`,
    defaultAccent: 'indigo',
    themeColor: '#D2D8E8',
    variables: {
    }
  },
  ocean: {
    title: gt('Ocean'),
    group: 'images',
    // Brasil
    // https://unsplash.com/photos/CcJ4lweo8dA by Willian Justen de Vasconcellos
    background: `url("${path}/ocean.jpg") center/cover`,
    backgroundPreview: `url("${path}/ocean_preview.jpg") center/cover`,
    defaultAccent: '227, 26',
    themeColor: '#5E6DA1',
    variables: {
      'topbar-icon': '#333'
    }
  },
  landscape: {
    // #. Landscape is used in the context of an image, like scenery or countryside.
    title: gt('Landscape'),
    group: 'images',
    // Landscape
    // https://unsplash.com/photos/ucYWe5mzTMU by Jeremy Cai
    background: `url("${path}/green.jpg") center/cover`,
    backgroundPreview: `url("${path}/green_preview.jpg") center/cover`,
    defaultAccent: 'green',
    themeColor: '#385738',
    variables: {
    }
  },
  flowers: {
    title: gt('Flowers'),
    group: 'images',
    // Flowers
    // https://unsplash.com/photos/YnNczu62rdk by Daiga Ellaby
    background: `url("${path}/flowers.jpg") top/cover`,
    backgroundPreview: `url("${path}/flowers_preview.jpg") top/cover`,
    defaultAccent: 'orange',
    themeColor: '#6C7751',
    variables: {
    }
  },
  city: {
    title: gt('City'),
    group: 'images',
    // New York; Empire State Building
    // https://unsplash.com/photos/_wqj9tC0WSE by Bing HAO
    background: `url("${path}/city.jpg") top/cover`,
    backgroundPreview: `url("${path}/city_preview.jpg") top/cover`,
    defaultAccent: '244, 5',
    themeColor: '#4B4D64',
    variables: {
    }
  }
}

// add accent color-based theme
Object.entries(accentColors).forEach(([id, color]) => {
  const hs = `${color.h}, ${color.s}%`
  themes[id] = {
    title: color.name,
    group: 'unicolor',
    background: `linear-gradient(hsl(${hs}, 95%), hsl(${hs}, 70%))`,
    backgroundPreview: `hsl(${hs}, 50%)`,
    defaultAccent: id,
    themeColor: `hsl(${hs}, 50%)`,
    variables: {
      gap: '4px',
      'translucency-factor': '0.05',
      'backdrop-blur-factor': 0
    },
    tint: false
  }
})

// Washed out
const washedOut = _(accentColors).pick('red', 'green', 'blue', 'indigo', 'pink')
Object.entries(washedOut).forEach(([id, color]) => {
  const hs = `${color.h}, ${color.s * 0.5 >> 0}`
  themes['washed_' + id] = {
    title: color.name,
    group: 'washed',
    background: `linear-gradient(hsl(${hs}%, 90%), hsl(${hs}%, 75%))`,
    backgroundPreview: `hsl(${hs}%, 50%)`,
    defaultAccent: hs,
    themeColor: `hsl(${hs}%, 50%)`,
    variables: {
      gap: '1px',
      'gap-radius': '0',
      'translucency-factor': '0.10',
      'backdrop-blur-factor': 0
    },
    tint: false
  }
})

Object.assign(themes, {
  blueSunset: {
    title: 'Blue Sunset',
    group: 'sunsets',
    background: 'radial-gradient(at 50% 90%, #FEAF5E 0%, #E16269 20%, #595E9B 70%)',
    defaultAccent: 'indigo',
    themeColor: '#595E9B',
    variables: {
    }
  },
  pinkSunset: {
    title: 'Pink Sunset',
    group: 'sunsets',
    background: 'radial-gradient(at 50% 100%, #ffc107 0%, rgb(232 0 0) 30%, rgb(255 89 226) 95%)',
    defaultAccent: 'pink',
    themeColor: '#F57CAE',
    variables: {
    }
  },
  orangeGlow: {
    title: 'Orange Glow',
    group: 'sunsets',
    background: 'radial-gradient(at 50% 90%, #ffeb3b 0%, #ff9800 20%, #ff9800 70%)',
    defaultAccent: 'orange',
    themeColor: '#FF9800',
    variables: {
    }
  },
  sunset: {
    title: 'Sunset',
    group: 'sunsets',
    background: 'linear-gradient(to bottom, #b7bfc2, #ffd498)',
    defaultAccent: 'gray',
    themeColor: '#D8D9D6',
    variables: {
    }
  }
})

// add custom themes
const custom = settings.get('theming/themes/custom')
if (custom) _.extend(themes, custom)
// 1. apply allow and block list
// 2. inject custom variables
const allowlist = settings.get('theming/allowlist')
const blocklist = settings.get('theming/blocklist')
const hasAllowlist = _.isArray(allowlist) && allowlist.length
const hasBlocklist = _.isArray(blocklist) && blocklist.length
for (const id in themes) {
  if (hasAllowlist && !allowlist.includes(id)) delete themes[id]
  else if (hasBlocklist && blocklist.includes(id)) delete themes[id]
  else {
    const overrides = settings.get('theming/themes/' + id + '/variables')
    if (overrides) themes[id].variables = _.extend({}, themes[id].variables, overrides)
  }
}

const current = {}
let dark = false

function setTheme (id) {
  const preferDark = prefersDarkMode()
  if (preferDark) id = 'dark'
  if (_.device('smartphone') && id !== 'dark') id = 'white'
  const theme = getTheme(id)
  if (!theme) return
  const changedDark = !!theme.dark !== dark
  dark = !!theme.dark
  const rootRules = _(theme.variables).map((value, key) => `--${key}: ${value};`)
  if (dark) rootRules.push('color-scheme: dark;')
  $('html').toggleClass('dark', dark)
  $('#io-ox-core').css('background', theme.background || 'none')
  $('#io-ox-tint').toggle(theme.tint !== false)
  $('#theme').text(
    ':root {\n' + rootRules.join('\n') + '\n}'
  )
  $('meta[name="theme-color"]').attr('content', theme.themeColor || '#fff')
  if (!preferDark) current.theme = id
  if (changedDark) renderLogo()
  ox.trigger('themeChange')
}

function setVar (name, value) {
  const html = document.documentElement
  html.style.setProperty('--' + name, value)
}

function getCurrentAccentColor () {
  // unfortunately colors are not saved by name but by hue & saturation,
  // so this needs to be resolved here
  const [hue, saturation] = current.accentColor.split(', ')

  const currentColor = Object.entries(accentColors)
    .find(([id, color]) => color.h === +hue && color.s === +saturation)

  if (currentColor) {
    const [id, color] = currentColor
    return { ...color, id }
  }
  return {}
}

const getCurrentTheme = () => ({ ...themes[current.theme], id: current.theme })

const shades = [20, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
function setAccentColorByName (name) {
  $('#theme-accent').text(
    ':root {\n' +
    `--accent: var(--${name}-${current.theme === 'dark' ? 400 : 500});\n` +
    shades.map(value => `--accent-${value}: var(--${name}-${value});`).join('\n') +
    '\n}'
  )
}

const baseColors = {}
function setBaseColor (name, hue = 0, saturation = 50) {
  baseColors[name] = { hue, saturation }
  $('#theme-colors').text(
    ':root {\n' +
    Object.entries(baseColors).map(
      ([name, { hue, saturation }]) => `--${name}-base: ${hue}, ${saturation}%;`
    ).join('\n') +
    '\n}'
  )
}

function setAccentColor (hue = 0, saturation = 50) {
  if (/^\w+$/.test(hue)) {
    const color = accentColors[hue]
    if (!color) return
    [hue, saturation] = [color.h, color.s]
  } else if (/^(\d+),\s?(\d*\.?\d+)$/.test(hue)) {
    [, hue, saturation] = hue.match(/^(\d+),\s?(\d*\.?\d+)$/)
  }
  if (hue === '') return
  setBaseColor('accent', hue, saturation)
  current.accentColor = `${hue}, ${saturation}`
}

function setAccentColorByUser (hue, saturation) {
  if (!isChangingAccentColorAllowed()) return
  setAccentColor(hue, saturation)
}

function isChangingAccentColorAllowed () {
  // avoid changing accent color when certain themes are used (see dynamic/main)
  return themes[current.theme]?.changeAccentColor !== false
}

function setAccentColorFromTheme (id) {
  const theme = getTheme(id)
  if (!theme) return
  return setAccentColor(theme.defaultAccent)
}

function getThemes () {
  return { themes, groups }
}

function getTheme (id) {
  return themes[id] || themes.white
}

function getColors () {
  return accentColors
}

function getAppColor (id) {
  for (const key in appColors) {
    if (id.startsWith(key)) return appColors[key]
  }
  return 'var(--app-color-fallback)'
}

function getCurrent () {
  return Object.assign({}, current)
}

function saveCurrent () {
  settings.set('theming/current', getCurrent()).save()
}

function applyCurrent () {
  setTheme(current.theme)
  if (current.accentColor) setAccentColor(current.accentColor)
  else setAccentColorFromTheme(current.theme)
}

// TODO: unit tests don't know matchMedia
const mqDarkMode = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { addEventListener: _.noop, matches: false }
mqDarkMode.addEventListener('change', restoreCurrent)
settings.on('change:theming/autoDarkMode', restoreCurrent)

function prefersDarkMode () {
  const flag = settings.get('theming/autoDarkMode', false)
  return flag && mqDarkMode.matches
}

function restoreCurrent () {
  Object.assign(current, settings.get('theming/current', {
    accentColor: '',
    theme: 'white'
  }))
  applyCurrent()
}

async function choose () {
  const { getModalDialog } = await import('@/io.ox/core/theming/dialog')
  getModalDialog().open()
}

function renderLogo ($el = $('#io-ox-top-logo .logo-container')) {
  return getLogo().then(img => $el.empty().append(img.attr('alt', ox.serverConfig.productName)))
}

function getLogo () {
  return dynamic.getLogo(dark)
}

function loadCustomCSS () {
  const list = [].concat(settings.get('theming/css')).filter(Boolean)
  if (!list?.length) return
  list.forEach(path => {
    $('head').append($('<link rel="stylesheet">').attr('href', path))
  })
}

function supportsPicker () {
  const num = Object.keys(themes).length
  if (num <= 1) return false
  if (!settings.get('theming/picker/enabled', true)) return false
  if (!settings.isConfigurable('theming/current')) return false
  return true
}

addReadyListener('settings', () => {
  // apply custom colors via configuration
  Object.assign(appColors, settings.get('theming/appColors', {}))
  dynamic.apply(themes)
  restoreCurrent()
  renderLogo()
  loadCustomCSS()
})

export default {
  choose,
  getAppColor,
  getColors,
  getCurrent,
  getCurrentAccentColor,
  getCurrentTheme,
  restoreCurrent,
  renderLogo,
  getLogo,
  getTheme,
  getThemes,
  setTheme,
  setVar,
  setAccentColorByUser,
  setAccentColorByName,
  setAccentColorFromTheme,
  isChangingAccentColorAllowed,
  setBaseColor,
  saveCurrent,
  supportsPicker
}
