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

import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import upsell from '@/io.ox/core/upsell'
import api from '@/io.ox/core/folder/api'
import * as contactsUtil from '@/io.ox/contacts/util'
import Collection from '@/io.ox/core/collection'
import capabilities from '@/io.ox/core/capabilities'

import { createIcon, createButton } from '@/io.ox/core/components'

// just to make identifying actions easier
export const Action = function (id, options) {
  if (options.shortcut) {
    // beware: this only works for actions that do not use a baton
    ext.point('io.ox/shortcuts').extend({
      id: options.shortcut,
      action: options.shortcut,
      perform (e) {
        const collection = options.getCollection && options.getCollection()
        const baton = ensureBaton(collection)
        baton.e = e

        invoke(id, baton)
      }
    })
  }
  ext.point(id).extend(_.extend({ id: 'default', index: 100 }, options))
}

export const createListItem = function () {
  return $('<li role="presentation">')
}

export const createDivider = function () {
  return $('<li class="divider" role="separator">')
}

export const createCaption = function (text) {
  return $('<li class="dropdown-header dropdown-description" role="presentation">').text(text)
}

export const createSectionTitle = function (text) {
  return $('<li class="dropdown-header" role="presentation">').text(text)
}

export const createDropdownToggle = function () {
  return $('<button type="button" class="dropdown-toggle btn btn-toolbar" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" draggable="false" tabindex="-1">')
}

export const createDropdownList = function () {
  return $('<ul class="dropdown-menu" role="menu">')
}

export const createCaret = function () {
  return createIcon('bi/chevron-down.svg').addClass('bi-12 ms-4')
}

export const processItem = function (baton, link) {
  // check priority (none)
  if (!checkPriority(link)) return { link, available: false }
  // skip drop down menus
  if (link.dropdown || link.custom) return { link, available: true, enabled: true }
  // get actions
  const actions = link.ref ? ext.point(link.ref).list() : []
  // check general availability
  const available = actions.filter(checkActionAvailability)
  if (!available.length) return { link, available: false }
  // check collection && matches
  const enabled = available.filter(checkActionEnabled.bind(null, baton))
  if (/\bactions/.test(_.url.hash('debug'))) {
    console.debug('item', link.ref, 'available', available, 'enabled', enabled.length > 0, 'action', actions, 'baton', baton)
  }
  return { link, available: true, enabled: enabled.length > 0, actions: enabled }
}

export const checkPriority = function (link) {
  return link[_.device('smartphone') ? 'mobile' : 'prio'] !== 'none'
}

export const checkActionAvailability = function (action) {
  if ('toggle' in action && !action.toggle) return false
  if (!_.device(action.device)) return false
  if (!upsell.visible(action.capabilities)) return false
  return true
}

export const checkActionEnabled = function (baton, action) {
  // stopped? (special case, e.g. first action stops other actions)
  if (baton.isPropagationStopped()) return false
  // has required attribute and some items are missing it
  if (action.every && !every(baton.data, action.every)) return false
  // matches as string?
  if (action.collection && !baton.collection.matches(action.collection)) return false
  // folder check?
  if (action.folder && !checkFolder(baton, action)) return false
  // otherwise
  return true
}

export const createItem = function (baton, item) {
  if (!item.available) return
  if (!item.enabled && !item.link.drawDisabled) return
  const $li = createListItem(); const link = item.link; let def
  // nested dropdown?
  if (link.dropdown) {
    def = renderDropdown($li, baton, {
      caret: link.caret,
      customize: link.customize,
      drawDisabled: link.drawDisabled,
      icon: link.icon,
      point: link.dropdown,
      title: getTitle(link.title || link.label, baton),
      tooltip: link.tooltip
    })
    return { $li, def }
  }
  // use own draw function?
  if (link.custom) {
    link.draw.call($li, baton)
  } else if (link.icon) {
    renderButtonWithIcon($li, baton, item)
  } else {
    renderListItem($li, baton, item)
  }
  // finally looks for dynamic checks
  return { $li, def: processMatches($li, baton, item) }
}

// some actions need to run further checks
// toolbar item gets hidden or disabled (if drawDisabled) until function resolves
export const processMatches = function ($li, baton, item) {
  const actions = item.actions || []
  const result = $.Deferred()

  // return true if there is no action to check
  if (actions.length) nextAction(); else result.resolve(true)

  function nextAction () {
    const action = actions.shift()
    if (action && !baton.isPropagationStopped()) checkAction(action); else result.resolve(false)
  }

  function checkAction (action) {
    matches(baton, action, false)
      .done(function (state) {
        if (state) result.resolve(true); else nextAction()
      })
      .fail(nextAction)
  }

  return result.done(function (state) {
    baton.resumePropagation()
    if (state) return
    if (item.link.drawDisabled) $li.children('a, button').addClass('disabled').attr('aria-disabled', true)
    else $li.addClass('hidden')
  })
}

export const waitForMatches = function (items, callback) {
  const defs = _(items).chain().pluck('def').flatten().compact().value()
  return $.when.apply($, defs).done(callback)
}

export const renderButtonWithIcon = function ($li, baton, item) {
  function isUpsell (item) {
    if (!item.actions[0]) return false
    const requires = item.actions[0].capabilities
    return !upsell.has(requires) && upsell.enabled(requires)
  }

  const label = getTitle(item.link.title || item.link.label, baton)
  const icon = item.link.icon
  const tooltip = item.enabled !== false && (item.link.tooltip || (icon && label))

  $li
    .attr('data-prio', item.link[_.device('smartphone') ? 'mobile' : 'prio'] || 'lo')
    .data({
      section: item.link.section,
      sectionTitle: item.link.sectionTitle,
      caption: item.link.caption
    })
    .on('shown.bs.dropdown', hideTooltip)
    .append(function () {
      const $button = createButton({ variant: 'toolbar', type: 'button', icon: { name: icon, title: label, className: item.link.iconClass || 'bi-18' }, disabled: !item.enabled, tabindex: -1 })
        .data({ baton })
        .attr({ 'data-action': item.link.ref })

      if (tooltip) $button.addActionTooltip(tooltip)
      if (!item.enabled) $button.addClass('disabled').attr('aria-disabled', true).removeAttr('href')
      if (item.link.customize) setTimeout(item.link.customize.bind($button, baton))
      if (!isUpsell(item)) return $button

      return $button.addClass('upsell').append(
        createIcon('bi/star.svg').addClass('upsell-icon')
      )
    })
}

export const renderListItem = function ($li, baton, item) {
  function isUpsell (item) {
    if (!item.actions[0]) return false
    const requires = item.actions[0].capabilities
    return !upsell.has(requires) && upsell.enabled(requires)
  }

  $li
    .attr('data-prio', item.link[_.device('smartphone') ? 'mobile' : 'prio'] || 'lo')
    .data({
      section: item.link.section,
      sectionTitle: item.link.sectionTitle,
      caption: item.link.caption
    })
    .on('shown.bs.dropdown', hideTooltip)
    .append(function () {
      const $a = $('<a href="#" class="btn btn-toolbar" role="button" draggable="false" tabindex="-1">')
        .data({ baton })
        .attr({ 'data-action': item.link.ref })
      applyIconTitleTooltip($a, item.link, baton, item.enabled)
      if (!item.enabled) $a.addClass('disabled').attr('aria-disabled', true).removeAttr('href')
      if (!isUpsell(item)) return $a
      // add upsell icon
      return $a.addClass('upsell').append(
        createIcon('bi/star.svg').addClass('upsell-icon')
      )
    })
}

export const renderDropdown = function ($el, baton, options) {
  const $toggle = (options.$toggle || createDropdownToggle()).attr('data-dropdown', options.point)
  applyIconTitleTooltip($toggle, options, baton)
  if (options.caret !== false) $toggle.append(createCaret())

  const $ul = createDropdownList()
  $el.addClass('dropdown').append($toggle, $ul)
  // close tooltip when opening the dropdown
  $el.on('shown.bs.dropdown', hideTooltip)
  if (_.device('smartphone')) bindActionEvent($ul)

  return baton ? renderDropdownItems($el, baton, options) : $.when()
}

export const renderDropdownItems = function ($el, baton, options) {
  const items = ext.point(options.point).list()
    .map(processItem.bind(null, baton))
    .map(createItem.bind(null, baton))
    .filter(Boolean)

  const $ul = $el.find('> .dropdown-menu')
  $ul.empty().append(_(items).pluck('$li'))

  return waitForMatches(items, function () {
    injectSectionDividers($ul)
    // disable empty or completely disabled drop-downs
    const disabled = !$ul.find('[data-action]:not(.disabled)').length
    if (disabled) if (options.drawDisabled) $el.find('.dropdown-toggle').addClass('disabled').attr('aria-disabled', true); else $el.hide()
  })
}

export const injectCaption = function name (li) {
  li = $(li)
  const link = li.find('a')
  const caption = createCaption(li.data('caption'))
  // screen reader support
  const id = _.uniqueId('link-description-')
  caption.attr('id', id)
  link.attr('aria-describedby', id)
  // ux convenience: retrigger clicks
  caption.on('click', link.trigger.bind(link, 'click'))
  caption.insertAfter(li)
}

export const injectSectionDividers = function ($ul) {
  let section = null
  // clean up first
  $ul.find('li.hidden').remove()
  $ul.find('a[role="button"]').attr('role', 'menuitem').removeClass('btn btn-toolbar')
  // inject sections
  $ul.children().each(function (i, node) {
    const data = $(node).data()
    // add link caption?
    if (data.caption) injectCaption(node)
    if (data.section === section) return
    section = data.section
    // inject divider
    // avoid divider before first item
    if (i !== 0) createDivider().insertBefore(node)
    // inject section title (also for first item)
    if (data.sectionTitle) createSectionTitle(data.sectionTitle).insertBefore(node)
  })
}

export const hasActions = function ($el) {
  return $el.find('ul > li > a:not(.disabled)').length > 0
}

export const invokeByEvent = function (e) {
  e.preventDefault()
  const node = $(e.currentTarget)
  const baton = node.data('baton')
  const action = node.data('action')
  // baton might be undefined if the toolbar gets removed by other handlers (e.g. viewer closes)
  if (node.hasClass('disabled') || !baton) return
  baton.e = e
  invoke(action, baton)
  _.defer(function () { node.tooltip('hide') })
}

// fast simple one-way variant of _.cid
export const cid = function (data) {
  return [data.folder_id || data.folder, data.id, data.recurrenceId].filter(Boolean).join('.')
}

// every item in array needs to match given condition
export const every = function (array, condition) {
  const expr = String(condition || '').replace(/\w[\w:]+/ig, function (match) {
    if (/^(undefined|null|true|false)$/.test(match)) return match
    return 'data["' + match + '"]'
  })
  try {
    /* eslint no-new-func: 0 */
    const fn = new Function('data', 'return !!(' + expr + ')')
    return array.every(fn)
  } catch (e) {
    console.error('every', e, condition, array)
    return false
  }
}

// check folder-specific capabilities
export const checkFolder = function (baton, action) {
  if (baton.folder_id === undefined) {
    console.error('ActionsUtil > checkFolder: No folder_id given', action, baton)
    return false
  }
  const model = api.pool.models[baton.folder_id]
  if (!model) return false
  const condition = String(action.folder).replace(/\w[\w:]+/ig, function (match) {
    if (/^(undefined|null|true|false)$/.test(match)) return match
    if (match === 'gab') return String(baton.folder_id) === contactsUtil.getGabId()
    return model.can(match.toLowerCase())
  })
  try {
    /* eslint no-new-func: 0 */
    return new Function('return !!(' + condition + ')')()
  } catch (e) {
    console.error('checkFolder', action.folder, 'condition', condition, model, e)
    return false
  }
}

export const setSelection = function (selection, options) {
  // inject finalize per instance
  if (!this.setSelectionFinalize) addFinalize(this)

  if (!options) options = {}
  else if (_.isFunction(options)) options = options.call()

  // true = sync; this = thisArg for finalize
  const cont = _.lfo(true, this, this.setSelectionFinalize);

  (options.promise ? options : $.when(options)).done(function (options) {
    if (this.options.simple) {
      cont(options, selection, new Collection.Simple(selection))
    } else {
      // we prefer options.data as it might provide object_permissions
      const collection = new Collection(options.data || selection)
      collection.getProperties().done(function () { cont(options, selection, collection) })
    }
  }.bind(this))

  return this
}

// convenience function (data is object or array of object)
export const setData = function (data) {
  data = [].concat(data)
  setSelection.call(this, data, { data })
  return this
}

export const getBaton = function (data, options) {
  return ext.Baton(_.extend({ data, selection: data, collection: new Collection.Simple(data) }, options))
}

export const invoke = function (ref, baton, checkOnly) {
  const point = ext.point(ref)
  // get all sets of capabilities including empty sets
  const sets = point.pluck('capabilities')
  const list = point.list()
  const done = $.Deferred()

  // check capabilities upfront; if no action can be applied due to missing
  // capabilities, we try to offer upsell
  // if an action has an empty set we must not run into upsell (see bug 39009)
  if (sets.length && !sets.some(upsell.has)) {
    if (!checkOnly && upsell.enabled(sets)) {
      upsell.trigger({
        type: 'inline-action',
        id: ref,
        missing: upsell.missing(sets)
      })
    }
    return done.resolve(false)
  }

  baton = ensureBaton(baton)

  if (!baton.collection) {
    new (baton.simple ? Collection.Simple : Collection)(baton.array())
      .getPromise()
      .pipe(function (collection) {
        baton.collection = collection
        nextAction()
      })
  } else {
    nextAction()
  }

  function nextAction () {
    const action = list.shift()
    if (action) checkAction(action); else done.resolve(false)
  }

  function checkAction (action) {
    // avoid default behaviour
    if (action.id === 'default' && baton.isDefaultPrevented()) return nextAction()
    // check for disabled extensions
    if (baton.isDisabled(point.id, action.id)) return nextAction()
    // has all capabilities?
    if (action.capabilities && !capabilities.has(action.capabilities)) return nextAction()
    // check general availability
    if (!checkActionAvailability(action)) return nextAction()
    // static checks
    if (!checkActionEnabled(baton, action)) return nextAction()
    // dynamic checks
    if (hasMatches(action)) return checkMatches(action, baton)
    // call action directly
    callAction(action, baton)
  }

  function checkMatches (action, baton) {
    try {
      matches(baton, action, true)
        .done(function (state) {
          if (state) callAction(action, baton); else nextAction()
        })
        .fail(nextAction)
    } catch (e) {
      console.error(e)
      nextAction()
    }
  }

  function callAction (action, baton) {
    try {
      if (!checkOnly) {
        if (_.isFunction(action.action)) {
          action.action(baton)
        } else if (_.isFunction(action.multiple)) {
          action.multiple(baton.array(), baton)
        }
        ox.trigger('action:invoke action:invoke:' + ref, baton, action, ref)
      }
    } catch (e) {
      console.error('point("' + ref + '") > invoke()', e.message, {
        baton,
        action,
        exception: e
      })
    } finally {
      done.resolve(true)
    }
  }

  return done
}

export const checkAction = function (action, baton) {
  return invoke(action, baton, true).pipe(function (state) {
    return state ? baton : $.Deferred().reject()
  })
}

export const check = function (action, baton) {
  return invoke(action, baton, true)
}

export const addBackdrop = function ($el) {
  let $toggle = $el.find('.dropdown-toggle')
  let $menu = $el.find('.dropdown-menu')
  let $backdrop = $('<div class="smart-dropdown-container dropdown open" role="navigation">')
    // we just need this to catch clicks in e2e properly
    .append('<div class="smart-dropdown-backdrop abs">')
    .on('click contextmenu', toggle)
  const className = $el.attr('class')

  // listen for click event directly on menu for proper backdrop support
  bindActionEvent($menu)
  $el.on({ 'show.bs.dropdown': show, 'hide.bs.dropdown': hide, dispose })

  function show () {
    $backdrop.append($menu).addClass(className).appendTo('body')
    adjustPosition($toggle, $menu)
  }

  function hide () {
    $backdrop.detach()
    $menu.insertAfter($toggle)
  }

  function toggle () {
    if ($toggle) $toggle.dropdown('toggle')
    return false
  }

  function dispose () {
    // make sure backdrop and menu are removed (might be open during dispose)
    if ($backdrop) $backdrop.remove()
    $toggle = $menu = $backdrop = null
  }
}

export const bindActionEvent = function ($el) {
  $el.on('click', 'a[data-action]', invokeByEvent)
}

function addFinalize (fn) {
  fn.setSelectionFinalize = function (options, selection, collection) {
    if (this.disposed) return
    const baton = ext.Baton(_.extend(options, { selection, collection, list: this.options.list, restoreFocus: '' }))
    this.render(baton)
  }
}

function ensureBaton (data) {
  if (data instanceof ext.Baton) return data
  if (!_.isArray(data)) data = [data]
  return ext.Baton({ data })
}

function hasMatches (action) {
  return _.isFunction(action.quick || action.matches)
}

function matches (baton, action, allowQuick) {
  if (ox.debug && !!action.requires) console.warn('"action.requires" is deprecated it will be removed with 8.16. Please use "action.matches" instead')
  // action.quick is a workaround (similar to former "filter") to do a "quick" check which is not async (e.g. popup blocker problem)
  let ret = true
  if (allowQuick && action.quick) ret = action.quick(baton)
  else if (action.matches) ret = action.matches(baton)
  return $.when(ret).pipe(null, _.constant(false))
}

function applyIconTitleTooltip ($el, link, baton, enabled) {
  const icon = link.icon
  const title = getTitle(link.title || link.label, baton)
  const tooltip = enabled !== false && (link.tooltip || (icon && title))
  const checkmarkFn = link.checkmarkFn
  // icon vs title
  const ignoreIcon = _.device('smartphone') && baton?.view?.options?.popup
  if (icon && !ignoreIcon) $el.attr('title', title).append(createIcon(icon).addClass(link.iconClass || 'bi-18'))
  else if (title) $el.text(title)
  if (_.isFunction(checkmarkFn)) $el.prepend(createIcon('bi/check.svg').css('visibility', checkmarkFn(baton) ? 'visible' : 'hidden'))
  if (tooltip) $el.addActionTooltip(tooltip)
  // setTimeout so that the node is already added
  if (link.customize) setTimeout(link.customize.bind($el, baton))
}

function getTitle (arg, baton) {
  return _.isFunction(arg) ? arg(baton) : arg
}

// simple but sufficient so far
function adjustPosition ($toggle, $ul) {
  const data = $ul.data()
  const pos = { right: 'auto', bottom: 'auto' }
  const menu = $ul.get(0).getBoundingClientRect()
  const vh = $(window).height() - 16
  const vw = $(window).width() - 16
  if (data.top !== undefined) {
    // use predefined position, e.g. originating from a right click
    pos.top = data.top
    pos.left = data.left
  } else {
    const box = $toggle.get(0).getBoundingClientRect()
    pos.top = box.top + box.height
    pos.left = $ul.hasClass('dropdown-menu-right') ? box.right - menu.width : box.left
  }
  // ensure proper position inside viewport
  pos.top = Math.max(0, Math.min(pos.top, vh - menu.height))
  pos.left = Math.max(0, Math.min(pos.left, vw - menu.width))
  $ul.css(pos)
}

$.fn.addActionTooltip = function (title) {
  if (_.device('smartphone')) return $(this).attr({ 'aria-label': title })
  return $(this)
    .attr({
      'data-original-title': title,
      // tooltip removes title attribute, therefore we always add aria-label for screen reader support
      'aria-label': title,
      'data-placement': 'bottom',
      'data-animation': 'false',
      'data-container': 'body'
    })
    .tooltip({ trigger: 'hover' })
}

function hideTooltip () {
  $(this).children('a').tooltip('hide')
}
