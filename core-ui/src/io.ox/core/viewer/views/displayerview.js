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
import moment from '@open-xchange/moment'

import FilesAPI from '@/io.ox/files/api'
import TypesRegistry from '@/io.ox/core/viewer/typesregistry'
import DisposableView from '@/io.ox/backbone/views/disposable'
import Util from '@/io.ox/core/viewer/util'
import Swiper from 'swiper'
import { Navigation, Manipulation, Autoplay, Zoom } from 'swiper/modules'
import BigScreen from 'bigscreen'
import { createIcon } from '@/io.ox/core/components'
import * as util from '@/io.ox/core/util'

import { settings as filesSettings } from '@/io.ox/files/settings'
import gt from 'gettext'

import '@/io.ox/core/viewer/views/displayerview.scss'

import 'swiper/css'
import 'swiper/css/navigation'

/**
 * Fetches the options from the user settings and stores them into constants
 */
function requireAutoplayUserSettings () {
  // from user settings or by default/fallback according to https://jira.open-xchange.com/browse/DOCS-670
  const IS_LOOP_ENDLESSLY = (String(filesSettings.get('autoplayLoopMode')).toLowerCase() === 'loopendlessly') // default value equals true.
  IS_LOOP_ONCE_ONLY = !IS_LOOP_ENDLESSLY

  AUTOPLAY_PAUSE__WHILST_RUNNING = (Number(filesSettings.get('autoplayPause')) * 1000) // value of 'autoplayPause' in seconds
  if (!isFinite(AUTOPLAY_PAUSE__WHILST_RUNNING)) {
    AUTOPLAY_PAUSE__WHILST_RUNNING = 5000 // default/fallback value.
  }
}

/**
 * Applies the attributes NamedNodeMap, as returned by 'Element.attributes' to the given DOM element.
 *
 * @param {HTMLElement}  element    The DOM element to apply the attributes to.
 * @param {NamedNodeMap} attributes The attributes to apply
 */
function setAttributes (element, attributes) {
  if (!attributes || !attributes.length) { return }

  for (let attr, i = 0; i < attributes.length; i++) {
    attr = attributes.item(i)
    element.setAttribute(attr.name, attr.value)
  }
}

// show every image one time or repeat loop [loopEndlessly, loopOnceOnly]
let IS_LOOP_ONCE_ONLY
// delay for autoplay between slides (milliseconds)
let AUTOPLAY_PAUSE__WHILST_RUNNING
// in the autoplay mode show only images or the whole collection
const AUTOPLAY_ONLY_IMAGES = true

// predefined zoom levels for Swiper image zoom
const SWIPER_ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
// Swiper maximum image zoom level
const SWIPER_MAX_ZOOM_LEVEL = _.last(SWIPER_ZOOM_LEVELS)
// Swiper minimal image zoom level
const SWIPER_MIN_ZOOM_LEVEL = _.first(SWIPER_ZOOM_LEVELS)
// CSS class name of zoom container
const SWIPER_CONTAINER_CLASS = 'viewer-displayer-item-container'

/**
 * The displayer view is responsible for displaying preview images,
 * launching music or video players, or displaying pre-rendered OX Docs
 * document previews (TBD)
 */
const DisplayerView = DisposableView.extend({

  className: 'viewer-displayer',
  attributes: { role: 'main' },

  events: {
    'click a.fullscreen-button': 'toggleFullscreen'
  },

  initialize (options) {
    _.extend(this, options)
    // timeout object for the slide caption
    this.captionTimeoutId = null
    // timeout object for navigation items
    this.navigationTimeoutId = null
    // array of all slide content Backbone Views
    this.slideViews = []
    // map of the indices of temporary versions displayed
    this.temporaryVersions = {}
    // local array of loaded slide indices.
    this.loadedSlides = []
    // number of slides to be prefetched in the left/right direction of the active slide (minimum of 1 required)
    this.preloadOffset = 3
    // number of slides to be kept loaded at one time in the browser.
    this.slidesToCache = 7
    // instance of the swiper plugin
    this.swiper = null
    // Last Swiper zoom mode (in / out)
    this.lastSwiperZoomMode = null
    // the full screen state of the view, off by default.
    this.fullscreen = false
    // describes the fullscreen mode change transition; toggleFullscreen() creates the promise and onChangeFullScreen() handler resolves it.
    this.fullscreenPromise = $.when()
    // whether or not displayerview is able of auto-play mode that will display image-type file-items exclusively.
    this.canAutoplayImages = false
    // if able of auto-play mode, the current state of it, either "pausing" or "running".
    this.autoplayMode = ''
    this.autoplayStarted = false
    // if IS_LOOP_ONCE_ONLY is set, this is the index the autoplay should stop
    this.autoplayStopAtIndex = false
    // remember the sidebar open state for fullscreen
    this.sidebarBeforeFullscreen = null

    // listen to blend caption events
    this.listenTo(this.viewerEvents, 'viewer:blendcaption', this.blendCaption)
    this.listenTo(this.viewerEvents, 'viewer:blendnavigation', this.blendNavigation)

    // listen to Swiper zoom events
    this.listenTo(this.viewerEvents, 'viewer:zoom:in:swiper', this.onZoomIn)
    this.listenTo(this.viewerEvents, 'viewer:zoom:out:swiper', this.onZoomOut)

    // listen to version change events
    this.listenTo(FilesAPI, 'add:version remove:version change:version', this.onModelChangeVersion.bind(this))

    // listen to version display events
    this.listenTo(this.viewerEvents, 'viewer:display:version', this.onDisplayVersion.bind(this))

    // listen to autoplay events
    this.listenTo(this.viewerEvents, 'viewer:autoplay:toggle', this.handleToggleAutoplayMode.bind(this))

    // listen to delete event propagation from FilesAPI
    this.listenTo(FilesAPI, 'remove:file', this.onFileRemoved.bind(this))

    // a reference to a very own throttled and bound variant of this view's "mousemove" and "click" handler
    // in order to also use it for deregistering purposes while running the autoplay mode.
    this.displayerviewMousemoveClickHandler = _.throttle(this.blendNavigation.bind(this), 500)
    // blend in navigation by user activity
    this.$el.on('mousemove click', this.displayerviewMousemoveClickHandler)
    // handle zoom when double clicking on an image
    this.$el.on('dblclick', '.viewer-displayer-item-container', this.onToggleZoom.bind(this))

    this.updateModelAndDisplayVersionDebounced = _.debounce(this.updateModelAndDisplayVersion.bind(this), 100)

    // listen to full screen mode changes
    BigScreen.onchange = this.onChangeFullScreen.bind(this)
    BigScreen.onerror = this.onFullScreenError.bind(this)
  },

  /**
   * Initial Parameter for autoplay mode. Copies all images into an array for the swiper
   */
  initializeAutoplayImageModeData () {
    const fileModelList = this.collection.models
    const imageFileRegistry = fileModelList.reduce(function (map, fileModel) {
      if (fileModel.isImage()) {
        map[fileModel.attributes.id] = fileModel
      }
      return map
    }, {})

    if (Object.keys(imageFileRegistry).length >= 2) {
      this.canAutoplayImages = true
      this.imageFileRegistry = imageFileRegistry
    }
  },

  /**
   * Renders this DisplayerView with the supplied model.
   *
   * @param   {Backbone.Model} model The file model object.
   * @returns {Backbone.View}        DisplayerView
   */
  render (model) {
    if (!model) {
      console.error('Core.Viewer.DisplayerView.render(): no file to render')
      return false
    }

    const self = this
    const carouselRoot = $('<div id="viewer-carousel" class="swiper" role="listbox">')
    const carouselInner = $('<div class="swiper-wrapper">')
    const prevSlide = $('<a href="#" role="button" class="viewer-overlay-button swiper-button-control swiper-button-prev left" aria-controls="viewer-carousel">').append(createIcon('bi/chevron-left.svg'))
    const nextSlide = $('<a href="#" role="button" class="viewer-overlay-button swiper-button-control swiper-button-next right" aria-controls="viewer-carousel">').append(createIcon('bi/chevron-right.svg'))
    const caption = $('<div class="viewer-displayer-caption">')
    let fullscreen
    const startIndex = this.collection.getStartIndex()

    let swiperParameter = {
      loop: !this.standalone && (this.collection.length > 1),
      followFinger: false,
      simulateTouch: false, // simulateTouch interferes with mouse clicks of the plugged spreadsheet app
      noSwiping: true,
      speed: 0,
      initialSlide: startIndex,
      runCallbacksOnInit: false,
      zoom: {
        maxRatio: SWIPER_MAX_ZOOM_LEVEL,
        minRatio: SWIPER_MIN_ZOOM_LEVEL,
        toggle: false,
        containerClass: SWIPER_CONTAINER_CLASS
      },
      navigation: {
        nextEl: nextSlide[0],
        prevEl: prevSlide[0]
      },
      modules: [Navigation, Manipulation, Autoplay, Zoom],
      on: {
        slideChangeTransitionStart: this.onSlideChangeStart.bind(this),
        slideNextTransitionEnd: this.onSlideNextChangeEnd.bind(this),
        slidePrevTransitionEnd: this.onSlidePrevChangeEnd.bind(this),
        touchEnd: this.hideCaption.bind(this)
      }
    }

    // enable touch and swiping for 'smartphone' devices
    if (_.device('smartphone') || _.device('tablet')) {
      swiperParameter = _.extend(swiperParameter, {
        followFinger: true,
        simulateTouch: true,
        speed: 300,
        spaceBetween: 100
      })
    }

    // init the carousel and preload neighboring slides on next/prev
    prevSlide.attr({ title: gt('Previous'), 'aria-label': gt('Previous') })
    nextSlide.attr({ title: gt('Next'), 'aria-label': gt('Next') })
    carouselRoot.attr('aria-label', gt('Use left/right arrow keys to navigate and escape key to exit the viewer.'))
    carouselRoot.append(carouselInner)

    if (this.collection.length > 1) {
      // add navigation if there is more than one slide.
      carouselRoot.append(prevSlide, nextSlide)

      this.initializeAutoplayImageModeData()
      if (this.canAutoplayImages) {
        fullscreen = $('<a href="#" role="button" class="viewer-overlay-button fullscreen-button">')
          .append(createIcon('bi/arrows-fullscreen.svg'))
        carouselRoot.append(fullscreen)
        requireAutoplayUserSettings() // call every time for settings might have been changed.
      }
    }

    // append carousel to view
    this.$el.append(carouselRoot, caption)
    this.carouselRoot = carouselRoot

    // initiate swiper
    self.swiper = new Swiper(self.carouselRoot[0], swiperParameter)

    // create slides from file collection and append them to the carousel
    this.createSlides()
      .then(function () {
        if (self.disposed) return

        self.carouselRoot.removeClass('initializing')

        // appendSlide made Swiper switch to last slide, setting back to startIndex
        self.swiper.slideTo(startIndex, 0, false)

        // preload selected file and its neighbours initially
        self.loadSlide(startIndex, 'both')

        self.swiper.autoplay.stop()

        self.blendSlideCountCaption()
        self.blendNavigation()

        // focus first active slide initially
        self.focusActiveSlide()

        self.handleInitialStateForEnabledAutoplayMode()
      })
      .fail(function () {
        console.warn('DisplayerView.createSlides() - some errors occurred:', arguments)
      })

    // append bottom toolbar (used to diplay upload progress bars)
    this.$el.append($('<div class="bottom toolbar">'))

    return this
  },

  /**
   * Create a view with appropriate settings according to the loaded content.
   *
   * @param   {Backbone.Model} model        The file model to create the view for.
   * @param   {object}         [options]    Optional parameters.
   * @param   {object}         [options.el] An optional root node for the view.
   * @returns {jQuery.Promise}              A Promise that will be resolved with the rendered view.
   */
  createView (model, options) {
    const viewParams = {
      model,
      collection: this.collection,
      viewerEvents: this.viewerEvents
    }

    if (this.app) {
      viewParams.app = this.app
    }

    if (options && options.el) {
      viewParams.el = options.el
    }

    return TypesRegistry.getModelType(model).then(function success (ModelTypeView) {
      return new ModelTypeView(viewParams).render()
    }, function fail () {
      return gt('Cannot require a view type for %1$s', model.get('filename'))
    })
  },

  /**
   * Creates the Swiper slide elements.
   * For each model in the collection the model type is required asynchronously
   * and the slide content is created.
   * After all slides where successfully created, they are appended
   * to the carouselInner DOM node.
   *
   * @returns {jQuery.Promise} resolved if all slides were created successfully; or rejected in case of an error.
   */
  createSlides () {
    const self = this
    const promises = []
    let resultDef

    this.collection.each(function (model) {
      promises.push(self.createView(model))
    })

    resultDef = $.when.apply(null, promises)

    resultDef = resultDef.then(function () {
      // in case of success the arguments array contains the View instances
      self.slideViews = [].slice.call(arguments) // IE11 doesn't support Array.from()
      self.swiper.appendSlide(_.pluck(arguments, 'el'))
    })

    return resultDef
  },

  /**
   * Returns the range of neighboring slides for the given slide index depending on the given direction.
   *
   * @param   {number}    slideIndex          The slide index to create the range for.
   * @param   {number}    offset              The number of neighboring slides to add to the range (Note: prefetchDirection='both' creates a duplicate slide amount).
   * @param   {string}    [prefetchDirection] Direction of the pre-fetch: 'left', 'right' or 'both' are supported.
   * @returns {integer[]}                     slideRange
   *                                          An array with all keys for the swiper
   *                                          Example: if activeSlide is 7 with an offset of 3, the range to load would be for
   *                                          'left':  [4,5,6,7]
   *                                          'right': [7,8,9,10]
   *                                          'both':  [4,5,6,7,8,9,10]
   */
  getSlideLoadRange (slideIndex, offset, prefetchDirection) {
    let loadRange

    slideIndex = slideIndex || 0

    function getLeftRange () {
      return _.range(slideIndex, slideIndex - (offset + 1), -1).sort(function (a, b) {
        return a - b
      })
    }

    function getRightRange () {
      return _.range(slideIndex, slideIndex + offset + 1, 1)
    }

    switch (prefetchDirection) {
      case 'left':
        loadRange = getLeftRange()
        break

      case 'right':
        loadRange = getRightRange()
        break

      case 'both':
        loadRange = _.union(getLeftRange(), getRightRange())
        break

      default:
        loadRange = [slideIndex]
        break
    }

    return _(loadRange)
      .chain()
      .map(this.normalizeSlideIndex.bind(this))
      .uniq()
      .value()
  },

  /**
   * Replaces the slide content view defined by the slideViews array and the index
   * with a new view rendered from the given model.
   * Unloads and disposes the current view instance.
   * Prefetches the new view if the previous one was prefetched.
   *
   * @param   {BaseView[]}     slideViews The array of the slide content view.
   * @param   {number}         index      The index of the view to be replaced in the slideViews array.
   * @param   {Backbone.Model} model      The model to render the new view with (FilesAPI.Model)
   * @returns {jQuery.Promise}            A promise that is resolved when the new view is created.
   */
  replaceView (slideViews, index, model) {
    // the slide view instance
    const slideView = slideViews[index]
    // when called for duplicate views, there may be no instance
    if (!slideView) { return $.when() }

    const isSlideViewPrefetched = slideView.isPrefetched
    const slideNode = slideView.el
    const slideNodeAttrs = slideNode && slideNode.attributes

    // unload current slide content and dispose the view instance
    slideView.unload().dispose()

    return this.createView(model, { el: slideNode }).then(function (view) {
      if (self.disposed) { return }

      // transfer attributes to new view
      setAttributes(view.el, slideNodeAttrs)

      // prefetch new view, if old one was prefetched
      if (isSlideViewPrefetched) {
        view.prefetch({ priority: 1 })
      }

      // set new view instance
      slideViews[index] = view
    })
  },

  /**
   * Load the given slide index and additionally number of adjacent slides in the given direction.
   *
   * @param {number} slideToLoad         The index of the current active slide to be loaded.
   *
   * @param {string} [prefetchDirection] Direction of the prefetch: 'left', 'right' or 'both' are supported.
   *                                     Example: if slideToLoad is 7 with a preloadOffset of 3, the range to load would be for
   *                                     'left':  [4,5,6,7]
   *                                     'right': [7,8,9,10]
   *                                     'both':  [4,5,6,7,8,9,10]
   */
  loadSlide (slideToLoad, prefetchDirection) {
    slideToLoad = slideToLoad || 0

    const self = this
    let slidePromise = null
    const loadRange = this.getSlideLoadRange(slideToLoad, this.preloadOffset, prefetchDirection)
    const model = this.collection.at(slideToLoad)

    // check the slide to load for different version
    if (this.temporaryVersions[slideToLoad]) {
      _.without(this.loadedSlides, slideToLoad)

      if (slideToLoad in this.temporaryVersions) {
        delete this.temporaryVersions[slideToLoad]
      }

      slidePromise = this.replaceView(this.slideViews, slideToLoad, model)
    } else {
      slidePromise = $.when()
    }

    $.when(slidePromise).then(function () {
      if (self.disposed) { return }

      // prefetch data of the slides within the preload offset range
      _.each(loadRange, function (slideIndex) {
        let prefetchParam

        if (!self.isSlideLoaded(slideIndex)) {
          prefetchParam = { priority: self.getPrefetchPriority(slideIndex) }

          // prefetch original slide
          self.slideViews[slideIndex].prefetch(prefetchParam)

          self.loadedSlides.push(slideIndex)
        }
      })

      self.slideViews[slideToLoad].show()
    })
  },

  /**
   * Returns the priority for the given slide index according to the active slide index.
   * The active slide and it's direct neighbours get priority 1,
   * the more distant neighbours get priority 2, 3, 4, ...
   *
   * @param {number} index The slide index to get the prefetch priority for.
   */
  getPrefetchPriority (index) {
    const size = this.collection.length
    const diff = Math.abs(this.swiper.realIndex - index)

    return Math.max(1, diff < size / 2 ? diff : size - diff)
  },

  /**
   * Returns true if the slide has been loaded (by prefetching it's data or showing the slide).
   * Otherwise false.
   *
   * @return {boolean} returns true if the slide is loaded.
   */
  isSlideLoaded (slideIndex) {
    return _.contains(this.loadedSlides, slideIndex)
  },

  /**
   * Handles file version change events.
   *
   * @param {object} fileDesc The changed file descriptor.
   */
  onModelChangeVersion (fileDesc) {
    this.updateModelAndDisplayVersionDebounced(fileDesc)
  },

  /**
   * Updates the file model data and renders the slide content.
   *
   * @param {object} fileDesc The file descriptor to get the model from.
   */
  updateModelAndDisplayVersion (fileDesc) {
    // reload model data bypassing the cache
    FilesAPI.get(fileDesc, { cache: false }).then(function (file) {
      const model = FilesAPI.pool.get('detail').get(_.cid(file))
      this.viewerEvents.trigger('viewer:displayeditem:change', model)
      this.displayVersion(model)
    }.bind(this))
  },

  /**
   * Handles display file version events.
   * Loads the type model and renders the new slide content.
   *
   * @param {object} versionData The JSON representation of the version.
   */
  onDisplayVersion (versionData) {
    if (!versionData) {
      return
    }

    const id = versionData.id
    const folderId = versionData.folder_id
    const modified = versionData.last_modified
    const isToday = moment().isSame(moment(modified), 'day')
    const model = this.collection.find(function (m) {
      return (m.get('id') === id) && (m.get('folder_id') === folderId)
    })
    const dateString = modified ? moment(modified).format(isToday ? 'LT' : 'l LT') : '-'

    this.displayVersion(model, versionData)

    // #. information about the currently displayed file version in viewer
    // #. %1$d - version date
    this.blendCaption(gt('Version of %1$s', dateString), 5000)
  },

  /**
   * Renders the slide content for the given file version.
   * Uses the given version data if present, otherwise the version defined within the model.
   *
   * @param {FilesAPI.Model} model         The file model object.
   * @param {object}         [versionData] The JSON representation of the version to display (optional).
   */
  displayVersion (model, versionData) {
    if (!model) {
      return
    }

    const self = this
    const index = this.collection.indexOf(this.collection.get(model.cid))
    // the model to create the new view type from
    const versionModel = (versionData) ? new FilesAPI.Model(versionData) : model

    if (model.get('version') !== versionModel.get('version')) {
      this.temporaryVersions[index] = versionModel.get('version')
    }

    const slidePromise = this.replaceView(this.slideViews, index, versionModel)

    $.when(slidePromise).then(function () {
      if (self.disposed) { return }

      self.slideViews[index].show()
    })
  },

  /**
   * Blends in the passed content element in a caption for a specific duration.
   *
   * @param {string} text              Text to be displayed in the caption.
   * @param {number} [duration = 3000] Duration of the blend-in in milliseconds. Defaults to 3000 ms.
   */
  blendCaption (text, duration) {
    duration = duration || 3000

    const slideCaption = this.$el.find('.viewer-displayer-caption')
    const captionContent = $('<div class="caption-content">').text(text)

    slideCaption.empty().append(captionContent)
    window.clearTimeout(this.captionTimeoutId)
    slideCaption.show()
    this.captionTimeoutId = window.setTimeout(function () {
      slideCaption.fadeOut()
    }, duration)
  },

  /**
   * Blends in a caption with the slide number and the total slide count
   * for a specific duration. Shows nothing for only one single slide.
   *
   * @param {number} [duration = 3000] Duration of the blend-in in milliseconds. Defaults to 3000 ms.
   */
  blendSlideCountCaption (duration) {
    const slideCount = this.collection.length
    const slideIndex = this.swiper ? this.swiper.realIndex : this.collection.getStartIndex()

    if (slideCount > 1) {
      this.blendCaption(
        // #. information about position of the current item in viewer
        // #. this will only be shown for more than one item
        // #. %1$d - position of current item
        // #. %2$d - total amount of items
        // #, c-format
        gt.ngettext(
          '%1$d of %2$d item',
          '%1$d of %2$d items',
          slideCount,
          slideIndex + 1,
          slideCount
        ),
        duration
      )
    }
  },

  /**
   * Hide shown caption immediately.
   */
  hideCaption () {
    const slideCaption = this.$el.find('.viewer-displayer-caption')
    window.clearTimeout(this.captionTimeoutId)
    slideCaption.hide()
  },

  /**
   * Blends in navigation elements after user activity events like mouseover.
   */
  blendNavigation: (function () {
    let x
    let y
    return function (event) {
      // for Chrome's bug: it fires mousemove events without mouse movements
      if (event && event.type === 'mousemove') {
        if (event.clientX === x && event.clientY === y) {
          return
        }
        x = event.clientX
        y = event.clientY
      }
      if (!this.$el) {
        return
      }
      const duration = 3000
      const navigationArrows = this.$el.find('.swiper-button-control')
      const fullscreenButton = this.$el.find('.fullscreen-button')

      window.clearTimeout(this.navigationTimeoutId)
      navigationArrows.show()
      fullscreenButton.toggle(this.fullscreen)

      this.navigationTimeoutId = window.setTimeout(function () {
        const buttonsToHide = navigationArrows.add(fullscreenButton)
        _.each(buttonsToHide, function (button) {
          const $button = $(button)
          if ($button.is(':not(:hover)')) {
            $button.fadeOut()
          }
        })
      }, duration)
    }
  })(),

  /**
   * Focuses the swiper's current active slide.
   */
  focusActiveSlide () {
    this.swiper.slides.forEach(element => {
      element.removeAttribute('tabindex')
      element.setAttribute('aria-selected', 'false')
    })
    this.getActiveSlideNode().attr({ tabindex: 0, 'aria-selected': 'true' }).visibleFocus()
  },

  /**
   * Returns the active Swiper slide jQuery node.
   *
   * @returns {jQuery}
   *                   The active node.
   */
  getActiveSlideNode () {
    if (!this.swiper || !this.swiper.slides) {
      return $()
    }

    const node = this.swiper.slides[this.swiper.activeIndex]
    return (node) ? $(node) : $()
  },

  /**
   * Returns the previous Swiper slide jQuery node,
   * including a possible Swiper duplicate node.
   *
   * Note: swiper.previousIndex is not correct, if the active slide was a duplicate slide.
   * therefore we check the data-swiper-slide-index attribute.
   *
   * @returns {jQuery} The previous node.
   */
  getPreviousSlideNode () {
    if (!this.swiper || !this.swiper.slides || !_.isNumber(this.swiper.previousIndex)) {
      return $()
    }

    const node = this.swiper.slides[this.swiper.previousIndex]
    return (node) ? $(node) : $()
  },

  /**
   * Maps the given to the slide collection looping a negative index,
   * or an index the is greater that the collection length.
   *
   * @param   {number} slideIndex The slide index to normalize
   * @returns {number}            The normalized slide index.
   *                              Example with 15 slides and start at 0:
   *                              [-3,-2,-1,0,1,2,3,] => [12,13,14,0,1,2,3]
   */
  normalizeSlideIndex (slideIndex) {
    const collectionLength = this.collection.length

    if (slideIndex < 0) {
      slideIndex = slideIndex + collectionLength
      if (slideIndex < 0) {
        slideIndex = 0
      }
    } else if (slideIndex >= collectionLength) {
      slideIndex = slideIndex % collectionLength
    }

    return slideIndex
  },

  /**
   * Swiper zoom handler
   */
  setZoomLevel (zoomLevel) {
    if (!this.swiper || !this.swiper.zoom.enabled) { return }

    const currentZoomLevel = parseFloat(this.swiper.zoom.scale, 10)

    zoomLevel = Util.minMax(zoomLevel, SWIPER_MIN_ZOOM_LEVEL, SWIPER_MAX_ZOOM_LEVEL)
    if (zoomLevel === currentZoomLevel) {
      return
    }

    const self = this
    const containerClassString = '.' + SWIPER_CONTAINER_CLASS
    const containerNode = this.getActiveSlideNode().find(containerClassString)
    this.lastSwiperZoomMode = (zoomLevel > currentZoomLevel) ? 'zoom_in' : 'zoom_out'

    function handleTransitionEnd () {
      const activeElement = document.activeElement
      const activeSlideNode = self.getActiveSlideNode()

      // for Safari the focus change is needed in order to update the scroll bars
      self.getActiveSlideNode().blur()

      containerNode.off('transitionend', handleTransitionEnd)

      self.focusActiveSlide()

      _.defer(function () {
        if (!activeSlideNode.is(activeElement)) {
          activeElement.focus()
        }
      })
    }

    // workaround for Safari to update the scroll bars
    if (_.device('safari && macos')) {
      containerNode.on('transitionend', handleTransitionEnd)
    }

    if (zoomLevel === 1) {
      this.swiper.zoom.out()
    } else {
      containerNode.attr('data-swiper-zoom', String(zoomLevel))
      this.swiper.zoom.in() // is expected to work synchronous, so that the zoom attr can be removed afterwards
      containerNode.removeAttr('data-swiper-zoom')

      const img = zoomLevel > 1 ? containerNode.children('img') : null
      if (img) {
        const heightDiff = img.height() * zoomLevel - self.getActiveSlideNode().height()
        const widthDiff = img.width() * zoomLevel - self.getActiveSlideNode().width()
        if (heightDiff > 0 || widthDiff > 0) {
          const topMove = heightDiff > 0 ? (heightDiff + util.getScrollBarWidth()) / 2 : 0
          const leftMove = widthDiff > 0 ? (widthDiff + util.getScrollBarWidth()) / 2 : 0
          img.css({ transform: 'translate(' + leftMove + 'px, ' + topMove + 'px) scale(' + zoomLevel + ')' })
        }
      }
    }

    this.blendCaption(Math.round(zoomLevel * 100) + ' %')
  },

  /**
   * Swiper zoom handler
   */
  onZoomIn () {
    if (!this.swiper || !this.swiper.zoom.enabled) { return }

    const currentZoomLevel = parseFloat(this.swiper.zoom.scale, 10)
    // find next matching zoom level, but limit to maxRatio
    const nextZoomLevel = _.find(SWIPER_ZOOM_LEVELS, function (level) {
      return level > currentZoomLevel
    }) || SWIPER_MAX_ZOOM_LEVEL

    this.setZoomLevel(nextZoomLevel)
  },

  /**
   * Swiper zoom handler
   */
  onZoomOut () {
    if (!this.swiper || !this.swiper.zoom.enabled) { return }

    const currentZoomLevel = parseFloat(this.swiper.zoom.scale, 10)
    // find next matching zoom level, but limit to minRatio
    const lastIndex = _.findLastIndex(SWIPER_ZOOM_LEVELS, function (level) {
      return level < currentZoomLevel
    })

    const nextZoomLevel = SWIPER_ZOOM_LEVELS[lastIndex] || SWIPER_MIN_ZOOM_LEVEL
    this.setZoomLevel(nextZoomLevel)
  },

  /**
   * Swiper zoom handler
   */
  onToggleZoom () {
    if (!this.swiper || !this.swiper.zoom.enabled) { return }

    const currentZoomLevel = parseFloat(this.swiper.zoom.scale, 10)
    let newZoomLevel

    switch (this.lastSwiperZoomMode) {
      case 'zoom_in':
        if (currentZoomLevel > 1) {
          newZoomLevel = 1
        } else {
          newZoomLevel = SWIPER_MAX_ZOOM_LEVEL
        }
        break

      case 'zoom_out':
      default:
        if (currentZoomLevel < 1) {
          newZoomLevel = 1
        } else {
          newZoomLevel = SWIPER_MAX_ZOOM_LEVEL
        }
        break
    }

    this.setZoomLevel(newZoomLevel)
  },

  /**
   * Slide change start handler:
   * - save scroll positions of each slide while leaving it.
   * - save zoom level of each slide too
   */
  onSlideChangeStart () {
    const previousSlide = this.getPreviousSlideNode()
    const previousIndex = parseInt(previousSlide.data('swiper-slide-index'), 10)
    const activeSlideView = this.slideViews[previousIndex]
    let scrollPosition

    if (activeSlideView) {
      scrollPosition = activeSlideView.$el.scrollTop()
      if (activeSlideView.pdfDocument) {
        activeSlideView.setInitialScrollPosition(activeSlideView.model.get('id'), scrollPosition)
      }
    }
  },

  onSlideNextChangeEnd () {
    this.onSlideChangeEnd('right')
  },

  onSlidePrevChangeEnd () {
    this.onSlideChangeEnd('left')
  },

  /**
   * Handler for the slideChangeEnd event of the swiper plugin.
   * - preload neighboring slides
   * - broadcast 'viewer:displayeditem:change' event
   * - add a11y attributes
   */
  onSlideChangeEnd (preloadDirection) {
    const activeSlideNode = this.getActiveSlideNode()
    const previousSlideNode = this.getPreviousSlideNode()

    if (this.autoplayMode !== 'running') { // - only in case of autoplay is not running at all.
      this.blendSlideCountCaption() // - directly access this view's caption blend method.
      this.blendNavigation() // - directly access this view's navigation blend method.
    } else if (IS_LOOP_ONCE_ONLY && this.autoplayStopAtIndex === this.swiper.realIndex) {
      this.toggleFullscreen()
    }

    // clear zoom mode of previous slide
    this.lastSwiperZoomMode = null

    this.loadSlide(this.swiper.realIndex, preloadDirection)

    // a11y
    activeSlideNode.attr({ 'aria-selected': 'true', tabindex: 0 })
    previousSlideNode.removeAttr('tabindex').attr({ 'aria-selected': 'false' })

    // pause playback on audio and video slides
    previousSlideNode.find('audio, video').each(function () {
      this.pause()
    })

    this.viewerEvents.trigger('viewer:displayeditem:change', this.collection.at(this.swiper.realIndex))

    this.unloadDistantSlides(this.swiper.realIndex)

    this.focusActiveSlide()
  },

  /**
   * File remove handler.
   *
   * @param {Backbone.Model[]} removedFiles An array consisting of objects representing file models. Closes the viewer if the swiper is empty
   */
  onFileRemoved (removedFiles) {
    const self = this
    const activeIndex = this.swiper.realIndex
    const modelsToRemove = _.filter(removedFiles, function (file) {
      const cid = file.cid || _.cid(file)
      return !!self.collection.get(cid)
    })

    if (_.isEmpty(modelsToRemove)) {
      // none of the removed files is currently present in the Viewer collection
      return
    }

    // remove the corresponding models and all the slides
    this.collection.remove(modelsToRemove)
    this.swiper.removeAllSlides()
    this.slideViews = []
    this.loadedSlides = []
    this.temporaryVersions = {}

    if (this.collection.isEmpty()) {
      // close viewer we don't have any files to show
      this.viewerEvents.trigger('viewer:close')
      return
    }

    // recreate slides
    this.createSlides()
      .then(function success () {
        if (self.disposed) {
          return
        }

        const collectionLength = self.collection.length
        const newIndex = (activeIndex >= collectionLength) ? collectionLength - 1 : activeIndex

        self.viewerEvents.trigger('viewer:displayeditem:change', self.collection.at(newIndex))
        self.swiper.slideTo(newIndex, 0, false)
        self.loadSlide(newIndex, 'both')
      })
  },

  /**
   * Handler for starting the autoplay. If AUTOPLAY_ONLY_IMAGES is set to true a copy of the current collection
   * is saved in the object. And only images are copied into the swiper.
   */
  onAutoplayStart () {
    if (!this.swiper) { return }

    const SWIPER_AUTOPLAY = {
      autoplay: {
        delay: AUTOPLAY_PAUSE__WHILST_RUNNING,
        disableOnInteraction: false
      }
    }

    const self = this
    const imageFileModelList = Object.keys(this.imageFileRegistry).map(function (key) {
      return self.imageFileRegistry[key]
    })

    const activeFileId = self.collection.models[self.swiper.realIndex].get('id')

    if (AUTOPLAY_ONLY_IMAGES) {
      // exchange collection data
      this.collectionBackup = this.collection.clone()
      this.collection.reset(imageFileModelList)
      const activeIndex = _.findIndex(imageFileModelList, function (fileModel) {
        return (fileModel.attributes.id === activeFileId)
      })
      this.slideViews = []
      this.loadedSlides = []
      this.temporaryVersions = {}

      // remove old slides
      this.swiper.removeAllSlides()

      // add new slides
      this.createSlides()
        .then(function success () {
          if (self.disposed) return

          self.carouselRoot.removeClass('initializing')

          self.swiper.slideTo(activeIndex, 0, false)

          // load content for active slide
          self.loadSlide(activeIndex, 'both')

          if (IS_LOOP_ONCE_ONLY) {
            self.autoplayStopAtIndex = self.normalizeSlideIndex(self.swiper.realIndex)
          }

          _.extend(self.swiper.params, SWIPER_AUTOPLAY)
          self.swiper.autoplay.start()
          self.autoplayStarted = true
          self.viewerEvents.trigger('viewer:autoplay:state:changed', { autoplayStarted: self.autoplayStarted })
        })
    }
  },

  /**
   * Handler for stopping the autoplay. if AUTOPLAY_ONLY_IMAGES is set to true the backup collection inside
   * the object is restored into the swiper
   */
  onAutoplayStop () {
    if (!this.swiper) { return }

    const self = this
    this.autoplayStarted = false
    this.swiper.autoplay.stop()
    this.autoplayStopAtIndex = false
    this.viewerEvents.trigger('viewer:autoplay:state:changed', { autoplayStarted: this.autoplayStarted })

    const activeFileModel = self.collection.models[self.swiper.realIndex]

    if (AUTOPLAY_ONLY_IMAGES && this.collectionBackup.length) {
      // remove old slides
      this.swiper.removeAllSlides()

      // exchange collection data
      this.collection.reset(this.collectionBackup.models)
      const activeIndex = this.collection.indexOf(activeFileModel)
      this.collectionBackup = false
      this.slideViews = []
      this.loadedSlides = []
      this.temporaryVersions = {}

      // create new slides
      this.createSlides()
        .then(function success () {
          if (self.disposed) return

          self.carouselRoot.removeClass('initializing')

          self.swiper.slideTo(activeIndex, 0, false)

          // load content for active slide
          self.loadSlide(activeIndex, 'both')

          self.autoplayStarted = false
        })
    }
  },

  /**
   * Checks if the autoplay is already triggered
   *
   * @returns {boolean} autoplayStarted
   */
  hasAutoplayStartAlreadyBeenTriggered () {
    return this.autoplayStarted
  },

  /**
   * Handles the autoplay options
   *
   * @param {string} mode the mode to switch the autoplay states
   *                      Example: 'running', 'pausing' and 'undefined' are supported
   *                      running: show the pause icon
   *                      pausing: show the play icon
   *                      undefined: if autorun is not run yet, the mode is pausing. else it switches the current mode
   */
  handleToggleAutoplayMode (mode) {
    mode = (
      (((mode === 'running') || (mode === 'pausing')) && mode) ||

      ((this.autoplayMode === 'pausing') && 'running') ||
      ((this.autoplayMode === 'running') && 'pausing') ||

      'pausing'
    )
    if (mode === 'pausing') {
      if (this.hasAutoplayStartAlreadyBeenTriggered()) {
        if (!this.fullscreen) {
          this.onAutoplayStop()
        } else {
          this.toggleFullscreen(false)
        }
      }
    } else {
      this.toggleFullscreen(true).then(function () {
        this.onAutoplayStart()
        this.$el.focus()
      }.bind(this))
    }
    this.autoplayMode = mode
  },

  /**
   * Sets the initial options for autoplay
   */
  handleInitialStateForEnabledAutoplayMode () {
    if (this.canAutoplayImages && !this.hasAutoplayStartAlreadyBeenTriggered()) { // only in case autoplay start has not yet been triggered.
      this.handleToggleAutoplayMode('pausing')
    }
  },

  /**
   * Toggles full screen mode of the main view depending on the given state.
   * A state of 'true' starts full screen mode, 'false' exits the full screen mode and
   * 'undefined' toggles the full screen state.
   *
   * You can only call this from a user-initiated event (click, key, or touch event),
   * otherwise the browser will deny the request.
   *
   * @returns {jQuery.Promise} resolved when fullscreen transition is finished.
   */
  toggleFullscreen (state) {
    if (!BigScreen.enabled || _.device('iOS') || (_.isBoolean(state) && state === this.fullscreen)) {
      // nothing to do
      this.fullscreenPromise = $.when()
    } else {
      this.fullscreenPromise = $.Deferred()

      if (!_.isBoolean(state)) {
        BigScreen.toggle(this.carouselRoot[0])
      } else if (state) {
        BigScreen.request(this.carouselRoot[0])
      } else {
        BigScreen.exit()
      }
    }

    return this.fullscreenPromise
  },

  /**
   * Handle full screen mode error event.
   *
   * @param {DOM|null} element The element that is currently displaying in full screen or null.
   * @param {string}   reason  The reason string of the error, possible values for reason are:
   *                           not_supported: full screen is not supported at all or for this element
   *                           not_enabled: request was made from a frame that does not have the allowfullscreen attribute, or the user has disabled full screen in their browser (but it is supported)
   *                           not_allowed: the request failed, probably because it was not called from a user-initiated event
   */
  onFullScreenError (/* element, reason */) {
    this.fullscreenPromise.resolve()
  },

  /**
   * Handle full screen mode change event.
   *
   * Note: BigScreen.onchange is the only event that works correctly with current Firefox.
   *
   * @param {DOM|null} element The element that is currently displaying in full screen or null.
   */
  onChangeFullScreen (element) {
    if (this.disposed) return
    if (_.isNull(element)) {
      // exit fullscreen
      this.fullscreen = false
      this.$el.removeClass('fullscreen-mode')

      this.handleToggleAutoplayMode('pausing')
      this.$el.focus()

      // restore the sidebar to the state before full screen
      if (this.isSidebarOpen() !== this.sidebarBeforeFullscreen) {
        this.viewerEvents.trigger('viewer:toggle:sidebar')
      }
    } else if (element === this.carouselRoot[0]) {
      // enter fullscreen
      this.fullscreen = true
      this.$el.addClass('fullscreen-mode')

      // close the sidebar and remember it's state
      this.sidebarBeforeFullscreen = this.isSidebarOpen()
      if (this.sidebarBeforeFullscreen) {
        this.viewerEvents.trigger('viewer:toggle:sidebar')
      }
    }

    _.defer(function () {
      this.resolve()
    }.bind(this.fullscreenPromise))
  },

  /**
   * Returns true if the sidebar is open.
   *
   * @returns {boolean} Whether the sidebar is open.
   */
  isSidebarOpen () {
    return (this.$el.parent().find('.viewer-sidebar.open').length > 0)
  },

  /**
   * Unloads slides that are outside of a 'cached' slide range.
   * Prevents bloating the DOM of OX Viewer Elements when we encounter a folder with a lot of files.
   *
   * The cached slide range is an array of slide indices built from the current active slide index
   * plus the preload offset in both directions.
   * Example: if active slide is 7 with a preload offset of 3, the range would be: [4,5,6,7,8,9,10]
   *
   * @param  activeSlideIndex Current active swiper slide index
   */
  unloadDistantSlides (activeSlideIndex) {
    const self = this
    const cachedRange = this.getSlideLoadRange(activeSlideIndex, this.preloadOffset, 'both')
    const slidesToUnload = _.difference(self.loadedSlides, cachedRange)

    _.each(slidesToUnload, function (index) {
      self.slideViews[index].unload()
    })

    // don't remove from this.temporaryVersions because the view is not discarded

    // build intersection to assure that the (newly calculated) cachedRange array
    // doesn't override slides that have not yet been loaded.
    this.loadedSlides = _.intersection(this.loadedSlides, cachedRange)
  },

  onDispose () {
    window.clearTimeout(this.captionTimeoutId)
    window.clearTimeout(this.navigationTimeoutId)

    if (this.swiper) {
      this.swiper.removeAllSlides()
      this.swiper.destroy()
      this.swiper = null
    }

    this.captionTimeoutId = null
    this.navigationTimeoutId = null

    this.preloadOffset = null
    this.loadedSlides = null
    this.slideViews = null
    this.lastSwiperZoomMode = null
    this.carouselRoot = null
    this.temporaryVersions = null

    this.canAutoplayImages = null
    this.imageFileRegistry = null
    this.autoplayMode = null
    this.autoplayStarted = null
    this.autoplayStopAtIndex = null

    this.displayerviewMousemoveClickHandler = null
    this.sidebarBeforeFullscreen = null
    this.fullscreenPromise = null
    this.fullscreen = null
  }
})

export default DisplayerView
