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
import { applyTooltip } from '@/io.ox/core/tooltip.js'
import questionOctagonIcon from 'bootstrap-icons/icons/question-octagon.svg?raw'

const iconCache = {}

;(function () {
  // periodically check and update the calendar date icon (OXUIB-1547)
  const interval = 60 * 1000
  let date = new Date().getDate()
  setInterval(() => {
    const newDate = new Date().getDate()
    if (date !== newDate) {
      $('.calendar-icon-date').text(newDate)
      date = newDate
    }
  }, interval)
})()

// TODO: use this directly with the icons
// const regLarger = /^(reply|forward)/i

function insertDataInto (svg) {
  const parser = new DOMParser()
  return data => {
    const icon = parser.parseFromString(data.default || data, 'image/svg+xml').getElementsByTagName('svg')[0]
    for (const { name, value } of (icon.attributes || [])) {
      if (name === 'class') svg.setAttribute('class', [svg.getAttribute('class'), value].filter(Boolean).join(' '))
      else svg.setAttribute(name, value)
    }
    svg.innerHTML = icon.innerHTML
    svg.dispatchEvent(new Event('load'))
  }
}

async function fetchBootstrapIcon (path) {
  if (iconCache[path]) return iconCache[path]

  const response = await fetch(`./themes/default/icons/${path}`)
  if (!response.ok) throw new Error(`Could not load icon ${path}`)
  iconCache[path] = response.text()
  return iconCache[path]
}

/**
 * Convenience function to create icons
 *
 * @param   {string}  icon  The string containing the raw icon source code
 * @returns                 jQuery object containing the icon
 */
export function createIcon (icon, { className } = {}) {
  function prepare ($icon) {
    if (className) {
      // DEPRECATED: Disabled support for second parameter `options` for `createIcon`, pending remove with 8.20. Use `icon.addClass` instead
      if (ox.debug) console.warn('Second parameter `options` for `createIcon` is deprecated, pending remove with 8.20. Use `icon.addClass` instead.')
      document.getElementsByTagName('html')[0].classList.add('deprecated-code')
      $icon.addClass(className)
    }
    return $icon
  }

  if (_.isString(icon) && !icon.startsWith('<svg')) {
    icon = fetchBootstrapIcon(icon)
  }

  if (icon instanceof Promise) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', 16)
    svg.setAttribute('height', 16)
    svg.setAttribute('aria-hidden', true)

    icon
      .then(insertDataInto(svg))
      .catch(() => { svg.innerHTML = $(questionOctagonIcon).html() })
    return prepare($(svg))
  }

  if (_.isString(icon) && icon.startsWith('<svg')) {
    const $icon = $(icon).attr('aria-hidden', 'true')
    setTimeout(() => $icon[0].dispatchEvent(new Event('load')), 0)
    return prepare($icon)
  }

  if (ox.debug) console.warn('Using icon names is not supported anymore! Pass the raw icon source code instead:', icon?.name)
  return $(questionOctagonIcon).attr('aria-hidden', 'true')
}

/**
 * Convenience function to create accessible buttons
 *
 * @param   {object}         options
 * @param   {string}         [options.type='button']      - Change the type of the button
 * @param   {string}         [options.text]               - The text of the button
 * @param   {string}         [options.variant='default']  - One of bootstrap button variants. No bootstrap class is added if set to 'none'
 * @param   {string}         [options.href=undefined]     - If provided, button renders as anchor-tag with role button
 * @param   {number}         [options.tabindex]           - Set the tabindex
 * @param   {string}         [options.className]          - Additional classes to be added to the button
 * @param   {string|object}  [options.icon]               - Icon to be added to the button. Is either the raw source code or an object with additional options.
 * @param   {string}         [options.icon.name]          - The string containting the raw icon source code
 * @param   {string}         [options.icon.className]     - Additional classes to be added to the icon
 * @param   {string}         [options.icon.title]         - The title for the icon. If text is provided, this will also be used as the aria-label for the button
 * @param   {'left'|'right'} [options.icon.position]      - Position icon left or right of the string
 * @returns                                              A jQuery object containing the button
 */
export function createButton ({ type = 'button', text, variant = 'default', href, tabindex, className, icon, disabled = false } = {}) {
  const button = href ? $('<a role="button">').attr('href', href) : $('<button>').attr('type', type)
  if (variant !== 'none') button.addClass(`btn btn-${variant}`)
  if (tabindex !== undefined) button.attr('tabindex', tabindex)
  if (disabled) button.prop('disabled', true)
  button.addClass(className)

  button.text(text)

  if (icon) {
    if (_.isString(icon)) icon = { name: icon }
    const { name, position, className, title } = { position: 'right', ...icon }
    const justIcon = createIcon(name).addClass(className)
    const $icon = title ? $('<div aria-hidden="true">').attr('title', title).append(justIcon) : justIcon

    if (position === 'right') button.append($icon)
    else button.prepend($icon)

    if (!text) button.attr('aria-label', title)
  }

  return button
}

export function createCircularButton ({ action = '', icon = 'x-lg', title = 'n/a', disabled = false, caret = false } = {}) {
  return $('<button type="button" class="btn-circular">')
    .attr((() => {
      const attr = { 'data-action': action }
      if (caret) {
        Object.assign(attr, {
          'data-toggle': 'dropdown',
          'aria-haspopup': 'true',
          'aria-expanded': 'false'
        })
      }
      if (icon?.title && !title) {
        attr['aria-label'] = icon.title
      }
      return attr
    })())
    .prop('disabled', disabled)
    .append(
      $('<div class="circle">').append(() => {
        if (_.isString(icon)) icon = { name: icon }
        const { name, className, title } = { position: 'right', ...icon }
        const justIcon = createIcon(name).addClass(className)
        return title ? $('<div aria-hidden="true">').attr('title', title).append(justIcon) : justIcon
      }),
      title && $.txt(title),
      caret && createIcon('bi/chevron-down.svg').addClass('bi-12 ms-4')
    )
}

/**
 * Convenience function to create accessible label
 *
 * @param   {object}         options
 * @param   {string}         [options.text]           - The text of the label
 * @param   {string}         [options.for]            - The target input
 * @param   {string|object}  [options.icon]           - Icon to be added to the button. Is either the raw source code or an object with additional options.
 * @param   {string}         [options.icon.name]      - The string containting the raw icon source code
 * @param   {string}         [options.icon.className] - Additional classes to be added to the icon
 * @param   {string}         [options.icon.title]     - The title for the icon. If text is provided, this will also be used as the aria-label for the button
 * @param   {'left'|'right'} [options.icon.position]  - Position icon left or right of the string
 * @returns                                           A jQuery object containing the label
 */
export function createLabel ({ text, for: forName, icon } = {}) {
  const label = $('<label>').attr({ for: forName })

  label.text(text)

  if (icon) {
    if (_.isString(icon)) icon = { name: icon }
    const { name, position, className, title } = { position: 'right', ...icon }
    const justIcon = createIcon(name).addClass(className)
    const $icon = title ? $('<div aria-hidden="true">').attr('title', title).append(justIcon) : justIcon

    if (position === 'right') label.append($icon)
    else label.prepend($icon)

    if (!text) label.prepend($('<span class="sr-only">').text(title))
  }

  return label
}

// New shortcuts
// Idea: very specific/focused but accessible components

/**
 * Alias for createIcon
 * @param   {string}  icon - The string containing the raw icon source code
 * @returns jQuery object containing the icon
 */
export function icon (iconName) {
  return createIcon(iconName)
}

/**
 * Create an icon with tooltip
 * @param   {object}    options
 * @param   {Object}    options.icon      - jQuery object or element
 * @param   {string}    options.tooltip   - Tooltip content (plain text, html, or jQuery object)
 * @param   {string}    [options.srOnly]  - Alternative content for screenreaders
 * @returns jQuery object containing the icon
 */
export function iconWithTooltip ({ icon, tooltip, srOnly }) {
  return applyTooltip($('<span>').append(icon), { tooltip, srOnly })
}

/**
 * Simple button with text
 * @param   {Object} [className='btn-default'] - className to specify button style (also allows other classes)
 * @param   {string} text - Button text
 * @returns jQuery object containing the button
 */
export function buttonWithText ({ ariaLabel, className = 'btn btn-default', text = '' }) {
  return __button({ ariaLabel, className }).text(text)
}

function __button ({ ariaLabel, className, title } = {}) {
  const $btn = $('<button type="button">').addClass(className)
  if (ariaLabel) $btn.attr('aria-label', ariaLabel)
  if (title) $btn.attr('title', title)
  return $btn
}
/**
 * Simple button with text
 * @param   {Object} [className='btn-default'] - className to specify button style (also allows other classes)
 * @param   {object} icon - jQuery object or element
 * @param   {string} text - Button text
 * @returns jQuery object containing the button
 */
export function buttonWithIconAndText ({ className = 'btn btn-default', icon = $(), text = '' }) {
  return __button({ className }).append(icon.addClass('me-8'), text)
}

/**
 * Create a button with icon and (optional) tooltip
 * @param   {object}    options
 * @param   {object}    options.icon         - jQuery object or element
 * @param   {string}    options.title        - Add title content (alternative to tooltip)
 * @param   {string}    options.tooltip      - Tooltip content (plain text, html, or jQuery object)
 * @param   {string}    [options.ariaLabel]  - Just a shortcut for e2e tests to support I.click('~ariaLabel')
 * @param   {object}    [options.className='btn-default'] - className to specify button style (also allows other classes)
 * @param   {string}    [options.srOnly]     - Alternative content for screenreaders
 * @returns jQuery object containing the button
 */
export function buttonWithIcon ({ ariaLabel = '', className = 'btn-default', icon, srOnly = '', title, tooltip }) {
  const $wrapper = $('<div aria-hidden="true">').attr({ title })
  ariaLabel = !tooltip && ariaLabel === '' ? title : ariaLabel
  const $btn = __button({ ariaLabel, className }).append($wrapper.append(icon))
  return tooltip ? applyTooltip($btn, { tooltip, srOnly }) : $btn
}

/**
 * Apply tooltip to element
 * @param   {object}  $el      - The string containing the raw icon source code
 * @param   {object}  tooltip  - Tooltip content (plain text, html, or jQuery object)
 * @returns $el
 */
export function elementWithTooltip ({ $el, tooltip }) {
  return applyTooltip($el, { tooltip, attr: 'aria-describedby' })
}

/**
 * Create external link
 * @param   {string}  href     - target URL
 * @param   {string}  target   - target window; default is _blank
 * @param   {string}  text     - inner text
 * @returns $el
 */
export function externalLink ({ href = '#', target = '_blank', text = '' }) {
  return $('<a rel="noopener">').attr({ href, target }).text(text || href)
}

/**
 * Create an expandable settings section
 * @param   {string}  title        - section title
 * @param   {string}  explanation  - optional additional explanatory text
 * @param   {boolean} [expanded]   - toggle expanded state
 * @returns Array of nodes (header and section)
 */
export function expandableSection ({ title = 'Section', explanation = '', expanded = false } = {}) {
  const $summary = $('<summary tabindex=0 class="flex-row flex-center btn-text flex-grow text-left truncate me-8">')
  const $section = $('<details class="expandable-section">')
    .attr({ open: !!expanded })
    .append(
      $summary
        .attr({ 'aria-expanded': !!expanded }) // this shouldn't be necessary but helps VoiceOver to announce the correct state
        .append(
          $('<div class="flex-col flex-grow ps-24 min-h-40 justify-center truncate">').append(
            $('<h2 class="title font-bold truncate m-0">')
              .text(title)
              .append($('<span class="sr-only-text">').text('.')), // helps inflection when reading out the title
            explanation ? $('<p class="explanation font-normal text-xs leading-normal text-gray truncate m-0">').text(explanation) : $()
          ),
          icon('bi/chevron-right.svg').addClass('bi-20 ms-8')
        ),
      $('<section>')
    )
    .on('open close', e => $section.attr('open', e.type === 'open'))
    .on('toggle', e => {
      const isOpen = $section.attr('open') === 'open'
      _.url.hash('section', isOpen ? $section.attr('data-section') : null)
      $section.triggerHandler(isOpen ? 'open' : 'close')
      $summary.attr('aria-expanded', isOpen)
    })
  return $section
}
