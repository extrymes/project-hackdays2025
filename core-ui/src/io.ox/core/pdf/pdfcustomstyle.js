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

// optimised CSS custom property getter/setter
const CustomStyle = (function CustomStyleClosure () {
  // As noted on: http://www.zachstronaut.com/posts/2009/02/17/
  // animate-css-transforms-firefox-webkit.html
  // in some versions of IE9 it is critical that ms appear in this
  // list
  // before Moz
  const prefixes = ['ms', 'Moz', 'Webkit', 'O']
  const _cache = {}

  function CustomStyle () {
  }

  CustomStyle.getProp = function get (propName, element) {
    // check cache only when no element is given
    if (arguments.length === 1 && typeof _cache[propName] === 'string') {
      return _cache[propName]
    }

    element = element || document.documentElement
    const style = element.style; let prefixed

    // test standard property first
    if (typeof style[propName] === 'string') {
      return (_cache[propName] = propName)
    }

    // capitalize
    const uPropName = propName.charAt(0).toUpperCase() + propName.slice(1)

    // test vendor specific properties
    for (let i = 0, l = prefixes.length; i < l; i++) {
      prefixed = prefixes[i] + uPropName
      if (typeof style[prefixed] === 'string') {
        return (_cache[propName] = prefixed)
      }
    }

    // if all fails then set to undefined
    return (_cache[propName] = 'undefined')
  }

  CustomStyle.setProp = function set (propName, element, str) {
    const prop = this.getProp(propName)
    if (prop !== 'undefined') {
      element.style[prop] = str
    }
  }

  return CustomStyle
})()

export default CustomStyle
