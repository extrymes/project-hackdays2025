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

import ox from '@/ox'
import $ from '@/jquery'
import _ from '@/underscore'

export function getSVGLogo (path = './themes/default/logo-dynamic.svg') {
  return fetch(path)
    .then(response => {
      if (!response.ok) {
        console.error(`Could not load SVG logo "${path}"`)
        return '<svg width="1px" height="1px" version="1.1" xmlns="http://www.w3.org/2000/svg"></svg>'
      }
      return response.text()
    })
}

export function updateFavicons () {
  if (!ox.serverConfig.disableSVGFavicon) {
    // use versioned icon requests here. Firefox has some issues with caching and would trigger a new version event by sending an old cached icon response instead.
    $('head').append(`<link id="favicon" rel="icon" href="./favicon.svg?version=${ox.currentServiceWorkerVersion || 0}" type="image/svg+xml">`)
  }
  if (ox.serverConfig.useOXLogo) {
    const icons = {
      '#homescreen-icon': 'ox_icon180.png',
      '#favicon-ico': 'ox_favicon.ico',
      '#favicon': 'ox_favicon.svg'
    }
    _(icons).forEach((icon, selector) => {
      $(`head ${selector}`).attr({ href: `./themes/${ox.theme}/${icon}` }).detach().appendTo('head')
    })
  }
}

export const colorToRGB = (function () {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = 1
  canvas.height = 1
  return _.memoize(function (color) {
    context.fillStyle = 'white'
    context.fillRect(0, 0, 1, 1)
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    return context.getImageData(0, 0, 1, 1).data
  })
}())

export const colorToHSL = _.memoize(function (color) {
  const rgb = colorToRGB(color)
  const r = rgb[0] / 255
  const g = rgb[1] / 255
  const b = rgb[2] / 255
  const max = Math.max(r, g, b); const min = Math.min(r, g, b)
  let h; let s; const l = (max + min) / 2
  if (max === min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
      default: h = 0; break
    }
    h /= 6
  }
  return [Math.floor(h * 360), Math.floor(s * 100), Math.floor(l * 100)]
})

export const colorToHex = _.memoize(function (color) {
  const data = colorToRGB(color)
  return '#' + Number((data[0] << 16) + (data[1] << 8) + data[2]).toString(16)
})

// delta is a number between -100 and +100
export const shadeColor = _.memoize(function (color, delta) {
  let [h, s, l] = colorToHSL(color)
  l = Math.floor(l + delta)
  l = Math.max(Math.min(100, l), 0)
  return `hsl(${h}, ${s}%, ${l}%)`
}, hashFunction)

function hashFunction () {
  return _.toArray(arguments).join(',')
}

export const getRelativeLuminance = (function () {
  function val (x) {
    x /= 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  return function (rgb) {
    const l = 0.2126 * val(rgb[0]) + 0.7152 * val(rgb[1]) + 0.0722 * val(rgb[2])
    // round to 3 digits (rather useful for unit testing)
    return Math.round(l * 1000) / 1000
  }
}())
