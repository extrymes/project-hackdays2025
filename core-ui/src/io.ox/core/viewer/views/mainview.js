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
import Backbone from '@/backbone'
import ox from '@/ox'

import ToolbarView from '@/io.ox/core/viewer/views/toolbarview'
import DisplayerView from '@/io.ox/core/viewer/views/displayerview'
import SidebarView from '@/io.ox/core/viewer/views/sidebarview'
import DisposableView from '@/io.ox/backbone/views/disposable'
import Util from '@/io.ox/core/viewer/util'
import Settings from '@/io.ox/core/viewer/settings'
import a11y from '@/io.ox/core/a11y'
import tabApi from '@/io.ox/core/api/tab'

import '@/io.ox/core/viewer/style.scss'

// prefetch file actions
import '@/io.ox/files/actions'
import '@/io.ox/core/tk/nodetouch'

/**
 * The MainViewer is the base view for the OX Viewer.
 * This view imports, manage and  renders these children views:
 * - ToolbarView
 * - DisplayerView
 * - SidebarView
 */
const MainView = DisposableView.extend({

  className: 'io-ox-viewer abs',

  events: {
    keydown: 'onKeydown'
  },

  initialize (options) {
    Util.logPerformanceTimer('MainView:initialize')

    _.extend(this, options)
    // apps with 'simple window' class (Portal) scrolls behind the viewer.
    // Hide it for the moment as a workaround.
    // TODO: find a better solution
    if (!this.standalone) {
      this.$el.parent().find('.simple-window').hide()
    }
    // set classes at root element
    this.$el.addClass('io-ox-viewer abs').toggleClass('standalone', !!this.standalone)
    // create the event aggregator of this view.
    this.viewerEvents = _.extend({}, Backbone.Events)
    // create children views
    const childViewParams = { collection: this.collection, viewerEvents: this.viewerEvents, standalone: this.standalone, app: this.app, opt: this.opt, isViewer: true, openedBy: this.openedBy, isSharing: this.isSharing }
    this.toolbarView = new ToolbarView(childViewParams)
    this.displayerView = new DisplayerView(childViewParams)
    this.sidebarView = new SidebarView(childViewParams)
    // close viewer on events
    this.listenTo(this.viewerEvents, 'viewer:close', this.viewerCloseHandler)
    this.listenTo(this.viewerEvents, 'viewer:toggle:sidebar', this.onToggleSidebar)
    // bind toggle side bar handler
    this.listenTo(this.viewerEvents, 'viewer:sidebar:change:state', this.onSideBarToggled)
    // close viewer when other app is start or resumed, except in standalone mode
    if (!this.standalone) {
      this.listenTo(ox, 'app:start app:resume', this.viewerCloseHandler)
    }
    // register app resume event for stand alone mode
    if (this.app) {
      this.app.on('resume', this.onAppResume)
    }
    // handle DOM events
    $(window).on('resize.viewer-mainview', () => this.refreshViewSizes())
    // display the selected file initially
    const startIndex = this.collection.getStartIndex()
    const startModel = this.collection.at(startIndex)
    this.render(startModel)
  },

  /**
   * Renders this MainView with the supplied model.
   *
   * @param   {Backbone.Model} model The file model object.
   * @returns {Backbone.View}        MainView
   */
  render (model) {
    // #58229 - sidebar closed by default for shared files
    const state = (this.isSharing) ? false : Settings.getSidebarOpenState()

    if (!model) {
      console.error('Core.Viewer.MainView.render(): no file to render')
      return
    }
    // make this main view focusable and prevent focus from leaving the viewer.
    this.$el.attr('tabindex', -1)
    // set device type
    Util.setDeviceClass(this.$el)
    // append toolbar view
    this.$el.append(
      this.sidebarView.render(model).el,
      this.toolbarView.render(model).el,
      this.displayerView.render(model).el
    )
    // set initial sidebar state
    this.sidebarView.toggleSidebar(state)
    return this
  },

  // handler for keyboard events on the viewer
  onKeydown (event) {
    const viewerRootEl = this.$el
    const swiper = this.displayerView.swiper
    const self = this

    const handleChangeSlide = _.throttle(function (direction) {
      if (!swiper) { return }

      if (direction === 'right') {
        swiper.slideNext()
      } else {
        swiper.slidePrev()
      }
    }, 200)

    // manual TAB traversal handler. 'Traps' TAB traversal inside the viewer root component.
    function tabHandler (event) {
      const tabbableActions = a11y.getTabbable(viewerRootEl).filter(':not(.swiper-button-control):not([tabindex=-1])')
      const tabbableActionsCount = tabbableActions.length

      // quit immediately if no tabbable actions are found
      if (tabbableActionsCount === 0) { return }

      const focusedElementIndex = tabbableActions.index(document.activeElement)
      const traversalStep = event.shiftKey ? -1 : 1
      let nextElementIndex = focusedElementIndex + traversalStep
      // prevent default TAB traversal
      event.preventDefault()
      // traverse to prev/next action
      if (nextElementIndex >= tabbableActionsCount) {
        nextElementIndex = 0
      }
      // focus next action candidate
      tabbableActions.eq(nextElementIndex).visibleFocus()
    }

    function handleLeftRightArrowKey (direction) {
      // need to use defer here in order to let the toolbar navigation select the action link first
      _.defer(function () {
        if (self.disposed) return
        const toolbarFocused = $.contains(self.toolbarView.el, document.activeElement)
        // if the focus is inside the toolbar cursor left/right switches between toolbar links, otherwise between slides
        if (!toolbarFocused) {
          handleChangeSlide(direction)
        }
      })
    }

    let escTarget, isDropdownMenuItem, isDropdownToggler
    switch (event.which) {
      case 9: // TAB key
        if (this.standalone) return
        tabHandler(event)
        break
      case 27: // ESC key
        escTarget = $(event.target)
        isDropdownMenuItem = escTarget.parents('.dropdown-menu').length > 0
        isDropdownToggler = escTarget.attr('data-toggle') === 'dropdown' && escTarget.attr('aria-expanded') === 'true'
        // close the viewer only if user is not on a dropdown menu, or a dropdown menu item
        if (!isDropdownMenuItem && !isDropdownToggler && !(tabApi.openInTabEnabled() && this.standalone)) {
          this.viewerCloseHandler()
        }
        break
      case 37: // left arrow
        handleLeftRightArrowKey('left')
        break
      case 39: // right arrow
        handleLeftRightArrowKey('right')
        break
      case 33: // page up
        event.preventDefault()
        this.viewerEvents.trigger('viewer:document:previous')
        break
      case 34: // page down
        event.preventDefault()
        this.viewerEvents.trigger('viewer:document:next')
        break
      case 114: // Ctrl/Meta + F3
        if (!event.altKey && !event.shiftKey && (event.metaKey !== event.ctrlKey)) {
          event.preventDefault()
          this.onToggleSidebar()
        }
        break
          // no default
    }
  },

  // toggle sidebar after the sidebar button is clicked
  onToggleSidebar () {
    this.sidebarView.toggleSidebar()
  },

  // handle sidebar toggle
  onSideBarToggled (/* state */) {
    this.refreshViewSizes()
  },

  // recalculate view dimensions after e.g. window resize events
  refreshViewSizes () {
    // filter random resize events that are coming from other parts of appsuite while switching apps.
    if (this.disposed || !this.$el.is(':visible')) {
      return
    }

    const rightOffset = this.sidebarView.open ? this.sidebarView.$el.outerWidth() : 0
    const displayerEl = this.displayerView.$el
    const activeSlide = this.displayerView.getActiveSlideNode()
    const swiper = this.displayerView.swiper

    displayerEl.css({ width: window.innerWidth - rightOffset })
    activeSlide.find('.viewer-displayer-item').css({ maxWidth: window.innerWidth - rightOffset })

    if (swiper) {
      swiper.update()
      this.viewerEvents.trigger('viewer:resize')
    }
  },

  // handle app resume
  onAppResume () {
    $(window).trigger('resize')
  },

  /**
   * Viewer close handler.
   * - triggers an 'viewer:beforeclose' event.
   * - save sidebar state into the Settings.
   * - Hides viewer DOM first and then do cleanup.
   */
  viewerCloseHandler (app) {
    // ignore startup of applications plugged by the Viewer (triggers the "app:start" event)
    if (app && app.options && app.options.plugged) {
      return
    }

    // don't close the Viewer when help is opened
    if (app && app.get('name') === 'io.ox/help') {
      return
    }

    this.viewerEvents.trigger('viewer:beforeclose')
    // save sidebar state, but only if files are not shared #58229
    if (!this.isSharing) {
      Settings.setSidebarOpenState(this.sidebarView.open)
    }
    this.$el.hide()
    if (!this.standalone) {
      this.$el.parent().find('.simple-window').show()
      this.remove()
    } else {
      this.app.quit()
    }
  },

  onDispose () {
    if (this.toolbarView) { this.toolbarView.remove() }
    if (this.displayerView) { this.displayerView.remove() }
    if (this.sidebarView) { this.sidebarView.remove() }
    this.collection = null
    this.toolbarView = null
    this.displayerView = null
    this.sidebarView = null

    $(window).off('resize.viewer-mainview')

    if (this.app) {
      this.app.off('resume', this.onAppResume)
    }

    if (!this.standalone && this.app) {
      this.app.quit()
      this.app = null
    }
  }
})
export default MainView
