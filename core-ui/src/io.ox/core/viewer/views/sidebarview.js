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

import DisposableView from '@/io.ox/backbone/views/disposable'
import Util from '@/io.ox/core/viewer/util'
import yell from '@/io.ox/core/yell'
import FilesAPI from '@/io.ox/files/api'
import folderApi from '@/io.ox/core/folder/api'
import Dropzone from '@/io.ox/core/dropzone'
import ViewerSettings from '@/io.ox/core/viewer/settings'
import TypesUtil from '@/io.ox/core/viewer/views/types/typesutil'
import ThumbnailView from '@/io.ox/core/viewer/views/document/thumbnailview'
import FileInfoView from '@/io.ox/core/viewer/views/sidebar/fileinfoview'
import CaptureView from '@/io.ox/core/viewer/views/sidebar/captureview'
import SharesView from '@/io.ox/core/viewer/views/sidebar/sharesview'
import FileDescriptionView from '@/io.ox/core/viewer/views/sidebar/filedescriptionview'
import FileVersionsView from '@/io.ox/core/viewer/views/sidebar/fileversionsview'
import UploadNewVersionView from '@/io.ox/core/viewer/views/sidebar/uploadnewversionview'
import ext from '@/io.ox/core/extensions'
import extensions from '@/io.ox/files/common-extensions'
import { createButton, createIcon } from '@/io.ox/core/components'
import '@/io.ox/core/viewer/views/sidebar/panelbaseview'

import gt from 'gettext'

import '@/io.ox/core/viewer/views/sidebarview.scss'

ext.point('io.ox/core/viewer/views/sidebarview/detail').extend(
  {
    id: 'title',
    index: 100,
    draw (baton) {
      this.append(
        $('<div class="flex-row items-center mb-8 details-title">').append(
          $('<h1 class="flex-grow">').text(gt('Details')),
          baton.options.closable
            ? createButton({ variant: 'toolbar', icon: { name: 'bi/x-lg.svg', title: gt('Close') } })
              .attr('data-action', 'close-sidebar')
            : $()
        )
      )
    }
  },
  {
    id: 'thumbnail',
    index: 200,
    draw (baton) {
      if (baton.context.isViewer) return
      const container = $('<div class="thumbnail-container">')
      const $thumbnail = $('<div class="details-thumbnail flex-center" aria-hidden="true">')
      container.append($thumbnail)
      const preview = baton.model.supportsPreview()
      if (baton.model.isFolder()) {
        $thumbnail.append(createIcon('bi/folder.svg'))
      } else if (baton.model.isEncrypted()) {
        $thumbnail.append(createIcon('bi/lock-fill.svg'))
      } else if (preview) {
        const retina = _.device('retina')
        const width = retina ? 600 : 300
        const height = retina ? 400 : 200
        const url = baton.model.getUrl(preview, { width, height, scaleType: 'cover' })
        $thumbnail.css('background-image', `url("${url}"`)
        container.addClass('file-type-' + baton.model.getFileType())
      } else {
        const $icon = $('<div class="file-icon">')
        extensions.fileTypeIcon.call($icon, baton)
        $thumbnail.append($icon)
      }
      const type = baton.model.getFileType() === 'image' ? 'cover' : 'contain'
      container.addClass(type)
      this.append(container)

      // Prototype to toggle ratio, to be discussed if used, but keep the code for now
      // const type = baton.model.getFileType() === 'image' ? 'cover' : 'contain'
      // let layout = baton.context.thumbnailZoom === undefined ? type : baton.context.thumbnailZoom
      // container.addClass(layout)

      // this.append(container)

      // $thumbnail.on('click', () => {
      //   layout = layout === 'cover' ? 'contain' : 'cover'
      //   baton.context.thumbnailZoom = layout
      //   container.removeClass('cover contain').addClass(layout)
      // })
    }
  },
  {
    id: 'filename',
    index: 300,
    draw: (function () {
      const FileNameView = DisposableView.extend({
        className: 'flex-row',
        initialize (options) {
          this.model = options.model
          this.listenTo(FilesAPI, 'change:favorites', this.render)
          this.listenTo(this.model, 'change', this.onChange)
        },
        render () {
          if (this.disposed) return this
          const $icon = $('<div class="file-icon">')
          extensions.fileTypeIcon.call($icon, this.model)
          const file = this.model.getFileStats()
          this.$el.empty().append(
            $icon,
            $('<h2 class="filename flex-grow">').append(
              $('<span>').text(file.name),
              $('<span class="ms-4 extension">').text(file.extension)
            ),
            this.model.isFavorite()
              ? createIcon('bi/star-fill.svg').attr('title', gt('Marked as favorite')).addClass('bi-14 favorite')
              : $()
          )
          return this
        },
        onChange () {
          this.render()
        }
      })
      return function (baton) {
        this.append(new FileNameView({ model: baton.model }).render().$el)
      }
    }())
  },
  {
    id: 'general',
    index: 400,
    draw (baton) {
      const options = {
        model: baton.model,
        fixed: false,
        disableFolderInfo: !!(baton.options.opt && baton.options.opt.disableFolderInfo),
        viewerEvents: baton.context.viewerEvents,
        isViewer: baton.context.isViewer
      }
      this.append(new FileInfoView(options).render().el)
    }
  },
  {
    id: 'capture',
    index: 500,
    draw (baton) {
      this.append(new CaptureView({ model: baton.model }).render().el)
    }
  },
  {
    id: 'shares',
    index: 600,
    draw (baton) {
      if (!baton.model.isDriveItem()) return
      this.append(new SharesView({ model: baton.model }).renderExtended().el)
    }
  }
)

ext.point('io.ox/core/viewer/views/sidebarview/detail').extend({
  id: 'file-description',
  index: 1000,
  draw (baton) {
    // check if supported
    if (!(baton.model.isFile() && folderApi.pool.models[baton.data.folder_id] && folderApi.pool.models[baton.data.folder_id].supports('extended_metadata'))) return
    this.append(new FileDescriptionView({ model: baton.model, viewerEvents: baton.context.viewerEvents }).render().el)
  }
})

ext.point('io.ox/core/viewer/views/sidebarview/detail').extend({
  id: 'file-versions',
  index: 2000,
  draw (baton) {
    // check if supported
    if (!(baton.model.isFile() && folderApi.pool.models[baton.data.folder_id] && folderApi.pool.models[baton.data.folder_id].can('add:version'))) return
    this.append(new FileVersionsView({ model: baton.model, viewerEvents: baton.context.viewerEvents, isViewer: baton.context.isViewer, standalone: baton.context.standalone }).render().el)
  }
})

ext.point('io.ox/core/viewer/views/sidebarview/detail').extend({
  id: 'upload-new-version',
  index: 4000,
  draw (baton) {
    // check if supported
    if (!(baton.model.isFile() && folderApi.pool.models[baton.data.folder_id] && folderApi.pool.models[baton.data.folder_id].can('add:version'))) return
    this.append(new UploadNewVersionView({ model: baton.model, app: baton.app }).render().el)
  }
})

/**
 * notifications lazy load
 */
function notify () {
  const self = this; const args = arguments
  yell.apply(self, args)
}

/**
 * The SidebarView is responsible for displaying the detail side bar.
 * This includes sections for file meta information, file description
 * and version history.
 * Triggers 'viewer:sidebar:change:state' event when thr sidebar opens / closes.
 */
const SidebarView = DisposableView.extend({

  className: 'viewer-sidebar',

  // the visible state of the side bar, hidden per default.
  open: false,

  events: {
    'keydown .tablink': 'onTabKeydown'
  },

  initialize (options) {
    options = options || {}

    _.extend(this, {
      viewerEvents: options.viewerEvents || _.extend({}, Backbone.Events),
      standalone: options.standalone,
      options,
      isViewer: options.isViewer
    })

    this.model = null
    this.zone = null
    this.thumbnailView = null
    this.app = options.app

    // listen to slide change and set fresh model
    this.listenTo(this.viewerEvents, 'viewer:displayeditem:change', this.setModel)

    // bind scroll handler
    this.$el.on('scroll', _.throttle(function () {
      this.onScrollHandler()
    }.bind(this), 500))
    this.initTabNavigation()
  },

  /**
   * Create and draw sidebar tabs.
   */
  initTabNavigation () {
    // build tab navigation and its panes
    const tabsList = $('<ul class="viewer-sidebar-tabs hidden">')
    const detailTabLink = $('<a class="tablink" data-tab-id="detail">').text(gt('Details'))
    const detailTab = $('<li class="viewer-sidebar-detailtab">').append(detailTabLink)
    const detailPane = $('<div class="viewer-sidebar-pane detail-pane" data-tab-id="detail">')
    const thumbnailTabLink = $('<a class="tablink selected"  data-tab-id="thumbnail">').text(gt('Thumbnails'))
    const thumbnailTab = $('<li class="viewer-sidebar-thumbnailtab">').append(thumbnailTabLink)
    const thumbnailPane = $('<div class="viewer-sidebar-pane thumbnail-pane" data-tab-id="thumbnail">')

    tabsList.append(thumbnailTab, detailTab)
    this.$el.append(tabsList)
    tabsList.on('click', '.tablink', this.onTabClicked.bind(this))
    this.$el.append(thumbnailPane, detailPane)
  },

  /**
   * Sidebar scroll handler.
   * @param {jQuery.Event} event
   */
  onScrollHandler (event) {
    if (this.disposed) return
    this.viewerEvents.trigger('viewer:sidebar:scroll', event)
  },

  /**
   * Sidebar tab click handler.
   * @param {jQuery.Event} event
   */
  onTabClicked (event) {
    const clickedTabId = $(event.target).attr('data-tab-id')
    this.activateTab(clickedTabId)
  },

  /**
   * Sidebar tab keydown handler.
   * @param {jQuery.Event} event
   */
  onTabKeydown (event) {
    event.stopPropagation()
    switch (event.which) {
      case 13: // enter
        this.onTabClicked(event)
        break
      case 32: // space
        this.onTabClicked(event)
        break
                // no default
    }
  },

  /**
   * Activates a sidebar tab and render its contents.
   *
   * @param {string}  tabId                 The tab id string to be activated. Supported: 'thumbnail' and 'detail'.
   * @param {boolean} [forceRender = false] If set to 'true' renders (again) even if content is already present.
   */
  activateTab (tabId, forceRender) {
    const tabs = this.$('.tablink')
    const panes = this.$('.viewer-sidebar-pane')
    const activatedTab = tabs.filter(`[data-tab-id="${CSS.escape(tabId)}"]`)
    const activatedPane = panes.filter(`[data-tab-id="${CSS.escape(tabId)}"]`)

    tabs.removeClass('selected')
    panes.addClass('hidden')
    activatedTab.addClass('selected')
    activatedPane.removeClass('hidden')

    // render the tab contents
    switch (tabId) {
      case 'detail':
        if (forceRender || this.$('.sidebar-panel').length === 0) {
          this.renderSections()
        }
        break
      case 'thumbnail':
        if (this.thumbnailView && (forceRender || this.$('.document-thumbnail').length === 0)) {
          this.thumbnailView.render()
        }
        break
      default: break
    }

    // save last activated tab in office standalone mode
    if (this.standalone && (this.model.isOffice() || this.model.isPDF())) {
      ViewerSettings.setSidebarActiveTab(tabId)
    }
  },

  /**
   * Toggles the side bar depending on the state.
   * A state of 'true' opens the panel, 'false' closes the panel and
   * 'undefined' toggles the side bar.
   *
   * @param {boolean} state The panel state.
   */
  toggleSidebar (state) {
    // determine current state if undefined
    this.open = _.isUndefined(state) ? !this.open : Boolean(state)
    this.$el.toggleClass('open', this.open)
    this.viewerEvents.trigger('viewer:sidebar:change:state', this.open)

    if (this.open && this.$('.sidebar-panel').length === 0) {
      this.renderSections()
    }
  },

  /**
   * Sets a new model and renders the sections accordingly.
   *
   * @param {Backbone.Model} model The new model (FilesAPI.Model)
   */
  setModel (model) {
    this.model = model || null
    this.renderSections()
  },

  /**
   * Renders the sections for file meta information, file description
   * and version history.
   */
  renderSections () {
    // render sections only if side bar is open
    if (!this.model || !this.open) return

    const detailPane = this.$('.detail-pane')
    const folder = folderApi.pool.models[this.model.get('folder_id')]
    // remove previous sections
    detailPane.empty()
    // remove dropzone handler
    if (this.zone) {
      this.zone.off()
      this.zone.remove()
      this.zone = null
    }

    // load file details
    this.loadFileDetails()
    // add dropzone for drive files if the folder supports new versions
    if (this.model.isFile() && folder && folder.can('add:version')) {
      this.zone = new Dropzone.Inplace({
        // #. %1$s is the filename of the current file
        caption: gt('Drop new version of "%1$s" here', this.model.get('filename'))
      })
      // drop handler
      this.zone.on({
        show () {
          detailPane.addClass('hidden')
        },
        hide () {
          detailPane.removeClass('hidden')
        },
        drop: this.onNewVersionDropped.bind(this)
      })
      detailPane.parent().append(this.zone.render().$el.addClass('abs'))
    }

    ext.point('io.ox/core/viewer/views/sidebarview/detail').invoke('draw', detailPane, ext.Baton({
      options: this.options,
      context: this,
      app: this.app,
      $el: detailPane,
      model: this.model,
      data: this.model.isFile() ? this.model.toJSON() : this.model.get('origData')
    }))
  },

  /**
   * Renders the sidebar container.
   *
   * @param {Backbone.Model} model The initial model (FilesAPI.Model)
   */
  render (model) {
    // a11y
    this.$el.attr({ tabindex: -1, role: 'complementary', 'aria-label': gt('Details') })
    // set device type
    Util.setDeviceClass(this.$el)
    // attach the touch handlers
    if (this.$el.enableTouch) {
      this.$el.enableTouch({ selector: null, horSwipeHandler: this.onHorizontalSwipe.bind(this) })
    }
    // initially set model
    this.model = model

    // init thumbnail view, but for popout viewer on desktop and tablets
    if (!this.thumbnailView && this.standalone && !_.device('smartphone')) {
      this.thumbnailView = new ThumbnailView({
        el: this.$('.thumbnail-pane'),
        model: this.model,
        viewerEvents: this.viewerEvents
      })
    }

    // show tab navigation in office standalone mode
    if (this.standalone && !_.device('smartphone') && TypesUtil.isDocumentType(model)) {
      this.$('.viewer-sidebar-tabs').removeClass('hidden')
      const lastActivatedTab = ViewerSettings.getSidebarActiveTab()
      this.activateTab(lastActivatedTab, true)
    } else {
      this.activateTab('detail', true)
    }
    return this
  },

  /**
   * Loads the file details, especially needed for the file description
   * and the number of versions.
   */
  loadFileDetails () {
    if (!this.model) return

    // f.e. when used to preview file attachments in mail
    if (this.options.opt && this.options.opt.disableFileDetail) return

    if (this.model.isFile()) {
      FilesAPI.get(this.model.toJSON()).done(function (file) {
        // after loading the file details we set at least an empty string as description.
        // in order to distinguish between 'the file details have been loaded but the file has no description'
        // and 'the file details have not been loaded yet so we don't know if it has a description'.
        if (!this.model) return
        if (_.isString(this.model.get('description'))) return
        const description = (file && _.isString(file.description)) ? file.description : ''
        this.model.set('description', description)
      }.bind(this))
    }
  },

  /**
   * Handles new version drop.
   *
   * @param {object[]} files An array of File objects.
   */
  onNewVersionDropped (files) {
    // check for single item drop
    if (!_.isArray(files) || files.length !== 1) {
      notify({ error: gt('Drop only a single file as new version.') })
      return
    }
    const self = this
    const fileName = _.first(files).name

    import('@/io.ox/files/upload/main').then(function ({ default: fileUpload }) {
      const data = {
        folder: self.model.get('folder_id'),
        id: self.model.get('id'),
        // If file already encrypted, update should also be encrypted
        params: FilesAPI.versions.mustEncryptNewVersion(self.model, fileName) ? { cryptoAction: 'Encrypt' } : {},
        newVersion: true
      }
      const node = self.isViewer ? self.$el.parent().find('.viewer-displayer') : self.app.getWindowNode()
      fileUpload.setWindowNode(node)
      fileUpload.offer(_.first(files), data)
    })
  },

  /**
   * Handles horizontal swipe events.
   *
   * @param {string}       phase    The current swipe phase (swipeStrictMode is true, so we only get the 'end' phase)
   * @param {jQuery.Event} event    The jQuery tracking event.
   * @param {number}       distance The swipe distance in pixel, the sign determines the swipe direction (left to right or right to left)
   */
  onHorizontalSwipe (phase, event, distance) {
    // console.info('SidebarView.onHorizontalSwipe()', 'event phase:', phase, 'distance:', distance);

    if (distance > 0) {
      this.toggleSidebar()
    }
  },

  /**
   * Destructor function of this view.
   */
  onDispose () {
    this.$el.disableTouch()
    if (this.zone) {
      this.zone.off()
      this.zone = null
    }
    this.model = null
    this.thumbnailView = null
  }
})

export default SidebarView
