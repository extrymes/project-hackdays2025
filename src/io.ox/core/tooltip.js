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

import $ from '@/jquery'
import _ from '@/underscore'

// Tested so far
// - VoiceOver with Safari
// Let's use a container unless we face unsolvable issues with screenreader
// ideally we migrate this to popper.js (while keeping a11y compliance) not to reinvent the wheel
const $container = $('<div class="accessible-tooltip-container" aria-hidden="true">').appendTo('body')
const $template = $('<div role="tooltip" class="accessible-tooltip"><div class="tooltip-arrow" aria-hidden="true"></div></div>')

/**
 * Add accessible tooltips to existing elements
 *
 * @param   {object}         reference              - Existing DOM element the tooltip gets attached to
 * @param   {object}         options
 * @param   {string|object}  [options.tooltip]      - Tooltip title (plain text, html, or jQuery node)
 * @param   {string}         [options.srOnly]       - Alternative plain text for screenreaders
 * @param   {string}         [options.attr]         - Aria attribute to reference tooltip. Supported: aria-labelledby and aria-describedby
 * @returns The target DOM element (el)
 */
export function applyTooltip (reference, { tooltip = '', srOnly = '', attr = 'aria-labelledby' } = {}) {
  const id = _.uniqueId('tooltip-')
  const $tooltip = $template.clone().attr('id', id)
  const $target = srOnly ? $('<span aria-hidden="true">').appendTo($tooltip) : $tooltip
  $target.append(_.isString(tooltip) ? $.txt(tooltip) : tooltip)
  if (srOnly) $tooltip.append($('<span class="sr-only">').text(srOnly))
  $target.appendTo($container)
  return $(reference).addClass('has-accessible-tooltip').attr(attr, id).on('dispose', remove)
}

// we keep track of the current tooltip to avoid having multiple (feels glitchy)
let tooltip = null
let target = null

// on smartphones we just provide the tooltip for the screenreader
if (!_.device('smartphone')) {
  // delayed visibility (an instant appearance quickly gets annoying)
  const DELAY = 500
  const SELECTOR = '.has-accessible-tooltip'
  let timerShow = 0
  let timerHide = 0
  let visible = false

  $(document)
    .on('mouseover focus', SELECTOR, e => {
      if (timerHide) timerHide = clearTimeout(timerHide)
      target = e.currentTarget
      if (visible) return show()
      timerShow = timerShow || setTimeout(() => { visible = true; timerShow = 0; show() }, DELAY)
    })
    .on('mouseout blur', SELECTOR, e => {
      if (timerShow) timerShow = clearTimeout(timerShow)
      target = null
      hide()
      timerHide = timerHide || setTimeout(() => { visible = false; timerHide = 0 }, DELAY)
    })

  // capture scroll event
  document.addEventListener('scroll', () => hide(tooltip), true)

  // capture escape if tooltip is visible
  document.addEventListener('keydown', e => {
    if (e.keyCode !== 27 || !tooltip) return
    e.stopPropagation()
    hide()
  }, true)
}

function getTooltip (el) {
  if (!el) return
  const id = el.getAttribute('aria-labelledby') || el.getAttribute('aria-describedby')
  return document.querySelector('#' + id)
}

function show () {
  const el = getTooltip(target)
  if (!el) return
  const rect = target.getBoundingClientRect()
  // hide open tooltip (might happen when mixing focus and mouseover)
  hide()
  const top = rect.top > 80
  el.classList.add('invisible', 'active')
  el.style.left = ((rect.x + rect.right - el.clientWidth) / 2) + 'px'
  el.style.top = (top ? (rect.top - el.clientHeight - 8) : (rect.bottom + 8)) + 'px'
  el.classList.toggle('top', top)
  el.classList.toggle('bottom', !top)
  el.classList.remove('invisible')
  tooltip = el
}

function hide () {
  if (!tooltip) return
  tooltip.classList.remove('active')
  tooltip = null
}

function remove () {
  // remove tooltip if the target element gets removed
  $(getTooltip(this)).remove()
}
