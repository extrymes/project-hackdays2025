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
const li = $('<li tabindex="-1" role="option" aria-selected="false" aria-checked="false" data-cid=""><i class="fa checkmark" aria-hidden="true"></i></li>')[0]

$('body').append(
  $('<ul class="megalist checkboxes" role="listbox" aria-multiselectable="true">').append(
    _.range(0, 20).map(function (i) {
      return $('<li class="page-divider">').attr('data-divider', i)
    })
  )
)

const $el = $('.megalist'); const el = $el[0]

// prepare pages
const pages = _.range(0, 20).map(function (i) {
  const fragment = document.createDocumentFragment()
  _.range(0, 50).forEach(function (j) {
    const clone = li.cloneNode(true); const cid = i * 100 + j
    clone.setAttribute('data-cid', cid)
    clone.appendChild(document.createTextNode('List option #' + cid))
    fragment.appendChild(clone)
  })
  return { detached: true, fragment }
})

insertAfter(pages[0].fragment, el.querySelector('.page-divider'))
pages[0].detached = false

$el.on('scrollend', function () {
  const v1 = this.scrollTop
  const v2 = v1 + this.clientHeight
  const divider = this.querySelectorAll('.page-divider')
  let fragment
  let page
  let p1
  let p2

  for (let i = 0; i < divider.length; i++) {
    page = divider[i]
    p1 = page.offsetTop
    p2 = p1 + page.offsetHeight
    if (p2 < v1 || p1 > v2) {
      // out of viewport
      if (pages[i].detached) continue
      fragment = document.createDocumentFragment()
      // i is a number so no $.escapeSelector needed
      el.querySelectorAll(`[data-page="${i}"]`).forEach(function (elem) {
        this.appendChild(elem)
      }.bind(fragment))
      pages[i].fragment = fragment
      pages[i].detached = true
    } else {
      // inside viewport
      if (!pages[i].detached) continue
      // insert after
      insertAfter(pages[i].fragment, divider[i])
      pages[i].detached = false
    }
  }
})

function insertAfter (newNode, referenceNode) {
  if (!referenceNode.nextSibling) {
    el.append(newNode)
  } else {
    el.insertBefore(newNode, referenceNode)
  }
}

// the root element during range select
let rangeStart = 0

$el
  .attr('tabindex', -1)
  .find('[role="option"]:first').attr({ tabindex: 1, 'aria-selected': true }).end()
  .focus()

// DOM EVENTS

$el
  .on('focusin focusout', function (e) {
    $(this).toggleClass('has-focus', e.type === 'focusin')
  })
  .on('keydown', function (e) {
    switch (e.which) {
      case 13: onEnter(e); break
      case 32: onSpace(e); break
      case 35:
      case 36: onHomeEnd(e); break
      case 38:
      case 40: onCursor(e); break
                /* no default */
    }
  })
  .on('mousedown', '[role="option"]', function (e) {
    const isToggle = e.ctrlKey || e.metaKey || (e.offsetX < 48 && hasCheckboxes())
    trigger(e.currentTarget, isToggle ? 'toggle' : 'select', e)
  })
  .on('select', '[role="option"]', function (e) {
    onSelect.call(e.currentTarget, e)
  })
  .on('toggle', '[role="option"]', function (e) {
    onToggle.call(e.currentTarget, e)
  })
  .on('enter action', function (e, cid) {
    console.log('selection:' + e.type, cid)
  })
  .on('change', function (e, data) {
    console.log('selection:change', data)
  })

// HELPER

const CHECKED = 'aria-checked'
const CHECKEDTrue = '[' + CHECKED + '="true"]'
const CHECKEDFalse = '[' + CHECKED + '="false"]'
const SELECTED = 'aria-selected'
const SELECTEDTrue = '[' + SELECTED + '="true"]'
const TABINDEX = 'tabindex'
const TABINDEX_1 = '[' + TABINDEX + '="1"]'

function get (arg) {
  return _.isNumber(arg) ? getItems().eq(arg) : $(arg)
}

function getAllChecked () {
  return getItems().filter(CHECKEDTrue)
}

function getAllSelected () {
  return getItems().filter(SELECTEDTrue)
}

function hasChecked () {
  return !!el.querySelector(CHECKEDTrue)
}

function hasCheckboxes () {
  return $el.hasClass('checkboxes')
}

function trigger (arg, type, e) {
  get(arg).trigger($.Event(type, { shiftKey: e.shiftKey }))
}

// EVENT HANDLING

function onToggle () {
  toggle($(this))
  propagateChange()
}

function getItems () {
  return $el.find('[role="option"]')
}

function onSelect (e) {
  const index = getItems().index(this)

  deselectAll()

  if (e.shiftKey) {
    selectRange(index)
  } else {
    rangeStart = index
    select(get(index))
  }

  propagateChange()
}

function onCursor (e) {
  e.preventDefault()

  const items = getItems()
  let index = items.index(document.activeElement)

  index += e.which === 38 ? -1 : +1
  if (index < 0 || index >= items.length) return

  const item = get(index)
  focus(item)

  // just focus movement if cmd/ctrl key is pressed
  if (e.ctrlKey || e.metaKey) {
    // clear selection if we're not in multi-selection
    if (!hasChecked()) deselectAll()
    rangeStart = index
    return
  }

  trigger(item, 'select', e)
}

function onHomeEnd (e) {
  const item = getItems().eq(e.which === 35 ? -1 : 0)
  focus(item)
  trigger(item, 'select', e)
}

function onSpace (e) {
  e.preventDefault()
  trigger(document.activeElement, 'toggle', e)
}

function onEnter () {
  $el.trigger('enter', $(document.activeElement).attr('data-cid'))
}

// CHANGE STATE

function toggle (item) {
  const newState = item.attr(CHECKED) !== 'true'
  if (hasCheckboxes()) {
    const count = getAllChecked().length
    item.attr(CHECKED, newState)
    if (newState || count > 1) item.attr(SELECTED, newState)
    if (newState) getItems().filter(CHECKEDFalse + SELECTEDTrue).attr(SELECTED, false)
  } else {
    item.attr(CHECKED, newState).attr(SELECTED, newState)
  }
}

function focus (item) {
  getItems().filter(TABINDEX_1).attr(TABINDEX, -1)
  item.attr(TABINDEX, 1).focus()
}

function select (item) {
  item.attr(SELECTED, true)
}

function selectRange (index) {
  const start = Math.min(rangeStart, index); const end = Math.max(rangeStart, index)
  getItems().slice(start, end + 1).attr(CHECKED, true).attr(SELECTED, true)
}

function deselectAll () {
  getAllChecked().attr(CHECKED, false)
  getAllSelected().attr(SELECTED, false)
}

function toggleCheckboxes (state) {
  $el.toggleClass('checkboxes', state)
}

window.toggleCheckboxes = toggleCheckboxes

// PROGAPATE CHANGE

function getCIDs (selector) {
  return getItems().filter(selector).map(function () { return $(this).attr('data-cid') }).toArray()
}

function propagateChange () {
  const selected = getCIDs(SELECTEDTrue); let checked
  if (hasCheckboxes()) {
    checked = selected.length > 1 ? selected : []
  } else {
    checked = getCIDs(CHECKEDTrue)
  }
  $el.trigger('change', { checked, selected })
}
