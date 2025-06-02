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
import { device } from '@/browser'
import _ from '@/underscore'

import ox from '@/ox'
import apps from '@/io.ox/core/api/apps'
import ext from '@/io.ox/core/extensions'
import ModalDialog from '@/io.ox/backbone/views/modal'

import capabilities from '@/io.ox/core/capabilities'
import TreeView from '@/io.ox/core/folder/tree'
import api from '@/io.ox/core/folder/api'
import * as folderUtil from '@/io.ox/core/folder/util'
import '@/io.ox/settings/style.scss'
import getAllExtensions from '@/io.ox/settings/extensions'
import manifests from '@/io.ox/core/manifests'
import PageController from '@/io.ox/core/page-controller'
import Bars from '@/io.ox/core/toolbars-mobile'
import { index } from '@/io.ox/settings/index'
import { SearchView } from '@/io.ox/settings/search'
import '@/io.ox/settings/strings'

import gt from 'gettext'

const pool = api.pool
let modal
// tabindex needed or mac voice over reads the whole settings pane when an input element is focused
// scrollpane is important for keydown.foldertree in a11y.js to find this node and focus the detailpane on tree <enter>
const right = $('<div class="settings-detail-pane f6-target rightside flex-col" tabindex="0">')
const $toolbar = $('<div class="mobile-toolbar">')
const $navbar = $('<div class="mobile-navbar">')
const $pagesContainer = $('<div class="window-content">')

function createExtensionsForApps () {
  // Create extensions for the apps
  const appsWithSettings = apps.filter(app => !!app.get('settings'))
  ext.point('io.ox/settings/pane').extend({
    id: 'main',
    index: 200,
    subgroup: 'io.ox/settings/pane/main'
  })

  appsWithSettings.forEach((app, i) => {
    // filter apps which don't have required capability (upsell case)
    if (!capabilities.has(app.get('requires'))) return

    ext.point('io.ox/settings/pane/main').extend(_.extend({}, {
      title: app.get('description'),
      ref: app.id,
      searchTerms: [],
      index: (i + 1) * 100
    }, app.toJSON(), {
      load: _.isFunction(app.get('settings')) ? app.get('settings') : null
    }))
  })
}

const createMobileSettings = ({ tree }) => {
  const pages = new PageController({ appname: 'settings', toolbar: $toolbar, navbar: $navbar, container: $pagesContainer })
  const baton = new ext.Baton({ tree, right, pages })

  pages.addPage({
    name: 'folderTree',
    navbar: new Bars.NavbarView({
      extension: 'io.ox/settings/mobile/navbarFolderTree',
      baton
    }),
    startPage: true
  })

  pages.addPage({
    name: 'detailView',
    container: right,
    navbar: new Bars.NavbarView({
      extension: 'io.ox/settings/mobile/navbar',
      baton
    })
  })

  pages.getNavbar('detailView').on('leftAction', pages.goBack.bind(pages))

  return pages
}

function createTree (options) {
  const tree = new TreeView({
    ...options,
    root: '1',
    all: false,
    context: 'modal',
    contextmenu: false,
    flat: false,
    icons: true,
    indent: true,
    abs: false,
    module: 'settings',
    ariaLabel: gt('Settings Folders')
  })

  // select virtual node
  tree.on('virtual', select.bind(this, tree))

  if (device('smartphone')) tree.$container.on('click', '.folder.selectable.selected .folder-label', () => tree.options.pages.changePage('detailView'))

  return tree
}

function select (tree, folder, item, baton, section = null) {
  // a11y - avoid this folder to avoid focus drop
  if (folder === 'virtual/settings') return

  const opt = {
    focus: false,
    focusPane: !!baton
  }

  // different selections
  tree.selection.uncheck().preselect(folder)
  item = tree.selection.byId(folder)

  // view may not exists if the user does not have this setting
  let view
  if (!item.closest) view = item
  else view = item.closest('li').data('view')

  if (!view) return
  _.url.hash({ settings: folder, section })

  // expand subfolders
  folderUtil.open(view.options.parent)
  // focus tree node
  if (opt.focus) item.focus()

  // show subfolders on default
  if (view.hasSubFolders() && view.options.open !== 'open') view.toggle('open', true)

  showSettings(baton || pool.getModel(folder).get('meta'), opt.focusPane, tree.options.pages)
}

function showSettings (baton, focus, pages) {
  $('html').removeClass('complete')
  baton = ext.Baton.ensure(baton)

  const data = baton.data
  const settingsLoad = data.load || (() => {
    // eslint-disable-next-line no-console
    if (ox.debug) console.warn(`Settings pane "${data.ref || data.id}" without load functions are deprecated. Please define a load function.`)
    const settingsPath = data.pane || ((data.ref || data.id) + '/settings/pane')
    return import(/* @vite-ignore */`../../${settingsPath}.js`)
  })
  const extPointPart = data.pane || ((data.ref || data.id) + '/settings/detail')
  let def = $.Deferred()

  right.empty().busy()

  // on mobile
  if (device('smartphone')) {
    pages.getNavbar('detailView').setTitle(baton.data.title)
    pages.changePage('detailView')
  }

  if (data.loadSettingPane || _.isUndefined(data.loadSettingPane)) {
    def = settingsLoad()
  } else {
    def.resolve()
  }

  // only the pane last clicked should be opened. If loading takes longer and
  // a new pane has been opened meanwhile, only the latest click should count
  onlyResolveLastPromise(def).then(function () {
    // rightWrapper.attr('aria-label', /* #, dynamic */gt.pgettext('app', baton.data.title))
    // reset class (some views might add/remove classes)
    // right.attr('class', 'scrollable-pane')
    ext.point(extPointPart).invoke('draw', right, baton)
    if (focus) right.focus()
    right.idle()
    right.trigger('render')
    right.addClass('complete')
    $('html').addClass('complete')
  })
}

// only resolve the last object enqueued
const onlyResolveLastPromise = (function () {
  let active
  return function (def) {
    if (active) active.cancelled = true
    active = def

    return def.then(function () {
      if (this.cancelled) return $.Deferred().reject()

      active = null
      return $.Deferred().resolve()
    }.bind(active))
  }
}())

function getter () {
  const def = $.Deferred()
  def.resolve(pool.getCollection(this.id).models)
  return def
}

function createVirtualFolders (extensions, parent) {
  return extensions.map(extension => {
    let model

    if (parent) {
      model = pool.addModel({
        id: 'virtual/settings/' + extension.id,
        module: 'settings',
        own_rights: 134225984,
        title: /* #, dynamic */gt.pgettext('app', extension.title),
        meta: extension,
        icon: extension.icon
      })
    }

    if (extension.children?.length >= 0) {
      const list = createVirtualFolders(extension.children, extension)
      api.virtual.add('virtual/settings/' + extension.id, getter)
      pool.addCollection('virtual/settings/' + extension.id, list, { reset: true })
    }

    return model
  }).filter(model => !!model)
}

const setup = _.once(async () => {
  createExtensionsForApps()
  const allExtensions = await getAllExtensions()
  createVirtualFolders(allExtensions)
  const tree = createTree({ allExtensions })
  const pages = createMobileSettings({ tree })
  tree.options.pages = pages

  //
  // Custom search view
  //

  const searchView = new SearchView()
  searchView.$results = $('<ul class="search-results flex-grow overflow-y-auto list-unstyled vertical-cursor-trap">')
    .on('click', '.settings-search-result', function (e) {
      e.preventDefault()
      jumpToSetting($(e.currentTarget).data())
    })

  tree.render().$el
    .addClass('flex-col')
    .prepend(
      $('<h1 class="text-2xl font-bold mt-16 mb-32">').text(gt('Settings')),
      searchView.render().$el.addClass('mb-24'),
      searchView.$results.hide()
    )
    .find('.tree-container').addClass('flex-grow overflow-y-auto')

  searchView.on('searching', function () {
    tree.$('.tree-container').hide()
    this.$results
      .empty()
      .append(
        index.search(this.$input.val()).map((result, index) => {
          const title = result.text
          const section = [result.page, result.section].filter(Boolean).join(' / ')
          return $('<li role="option">')
            .append(
              $('<a role="button" href="#" class="settings-search-result no-underline">')
                .attr('tabindex', index === 0 ? 0 : -1)
                .data(result)
                .append(
                  $('<div class="title truncate text-medium">').attr('title', title).text(title),
                  $('<div class="section text-gray truncate">').text(section)
                )
            )
        })
      )
      .show()
  })

  searchView.on('cursor-down', function () {
    this.$results.find('a').first().focus()
  })

  searchView.on('submit', function () {
    this.$results.find('a').first().click()
  })

  searchView.on('cancel', function () {
    tree.$('.tree-container').show()
    this.$results.hide()
  })

  function jumpToSetting (data) {
    // split at first space only
    const [page, selector] = data.selector.split(/\s(.*)/, 2)
    if (tree.selection.get() === `virtual/settings/${page}`) {
      highlightSetting(selector)
    } else {
      // change folder
      tree.trigger('virtual', `virtual/settings/${page}`, {})
      right.one('render', () => highlightSetting(selector, false))
    }
  }

  return { tree, pages, searchView }
})

function highlightSetting (selector, smoothScrolling = true) {
  const $body = right.find('.settings-body')
  $body.toggleClass('scroll-smooth', smoothScrolling)
  setTimeout(() => {
    const $el = right.find(selector).first()
    if (!$el.length) return $body.scrollTop(0)
    // generally open expandable sections
    $el.closest('.expandable-section').trigger('open')

    let $target
    if ($el.is(':checkbox')) {
      $target = $el.closest('label').addClass('settings-search-highlight')
    } else if ($el.is(':radio')) {
      $target = $el.closest('fieldset').find('legend:first').addClass('settings-search-highlight')
    } else if ($el.is('button, input, select, .expandable-section')) {
      $target = $el.addClass('settings-search-highlight')
    } else if ($el.is('fieldset')) {
      $target = $el.find('legend:first').addClass('settings-search-highlight')
    } else {
      $target = $el.addClass('settings-search-highlight')
    }
    scrollSectionIntoView($target)
    if ($target) setTimeout(() => { $target.removeClass('settings-search-highlight') }, 5000)
  }, 100)
}

function scrollSectionIntoView ($el = $()) {
  // scrollIntoView with block/center would be nice
  // but it often scrolls the wrong container. so manually:
  if (!$el.length) return
  const $body = $el.closest('.settings-body')
  const top = $el.offset().top - $body.offset().top + $body.scrollTop()
  // 24 -> do not hit the ceiling visually
  $body.scrollTop(top - 24)
}

export async function setCurrentSettings (folder, section = null) {
  const { tree } = await setup()
  tree.$el.addClass('complete')
  $('html').removeClass('complete')
  if (!section) $('html').addClass('complete')

  if (folder) {
    const baton = new ext.Baton({ data: pool.getModel(folder).get('meta') })
    tree.trigger('virtual', folder, tree.getNodeView(folder), baton, section)
    if (section) {
      right.one('render', () => {
        const $section = right.find(`[data-section="${CSS.escape(section)}"]`)
        $section.trigger('open')
        // short delay so that the section gets full height
        setTimeout(() => {
          scrollSectionIntoView($section)
          $('html').addClass('complete')
        }, 100)
      })
    }
  }

  if (!_.device('smartphone') && tree.selection.get() === undefined) tree.selection.uncheck().pick(0)
}

async function createModal () {
  const { search, tree, pages } = await setup()

  let $container

  modal = new ModalDialog({
    backdrop: false,
    title: gt('Settings'),
    point: 'io.ox/core/settings/dialog',
    focus: right, // focus content initially
    className: 'modal flex io-ox-settings-main window-container',
    keepWhenPaused: true,
    // window-container is important for keydown.foldertree in a11y.js to find this node and
    // focus the detailpane on tree <enter>
    search,
    tree,
    right,
    pages
  })
    .build(function () {
      $container = this.$body.parent()
      this.$el.on('click', '[data-action="close"]', () => { this.close() })
      if (device('smartphone')) {
        pages.getPage('folderTree').append(tree.$el)
        pages.getPage('detailView').append(right)
        this.$body.append($('<div class="window-body classic-toolbar-visible mobile-toolbar-visible">').append(
          $pagesContainer,
          $navbar,
          $toolbar
        ))
        this.hideFooter()
      } else { // both tablet and desktop
        this.$body.append(tree.$el)
        this.$body.append(right)
        this.$body.css('padding', 0)
        this.$header.hide()
        this.hideFooter()
      }
    })
    .on('close', () => {
      _.url.hash({ settings: null, section: null })
      $container.detach()
    })
    .open()
}

export function open (folder, section, cssSelector) {
  manifests.manager.loadPluginsFor('io.ox/settings')
    .then(async () => {
      createModal()
      await setCurrentSettings(folder, section)
      highlightSetting(cssSelector)
    })
}

export function close () {
  modal?.close()
}
