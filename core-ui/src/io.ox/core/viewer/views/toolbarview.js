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

// cSpell:ignore addtofavorites, addtoportal, sendbymail

import $ from '@/jquery'
import _ from '@/underscore'
import moment from '@open-xchange/moment'
import ox from '@/ox'

import DisposableView from '@/io.ox/backbone/views/disposable'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import Ext from '@/io.ox/core/extensions'
import extensions from '@/io.ox/files/common-extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import FilesAPI from '@/io.ox/files/api'
import HelpView from '@/io.ox/backbone/mini-views/helplink'
import DocConverterUtils from '@/io.ox/core/tk/doc-converter-utils'
import Util from '@/io.ox/core/viewer/util'
import * as FileUtils from '@/io.ox/files/util'
import { createIcon } from '@/io.ox/core/components'
import tabApi from '@/io.ox/core/api/tab'

import gt from 'gettext'
/**
 * The ToolbarView is responsible for displaying the top toolbar,
 * with all its functions buttons/widgets.
 */

// define constants
const TOOLBAR_ID = 'io.ox/core/viewer/toolbar'
const TOOLBAR_LINKS_ID = TOOLBAR_ID + '/links'
const TOOLBAR_ACTION_ID = 'io.ox/core/viewer/actions/toolbar'
const TOOLBAR_ACTION_DROPDOWN_ID = TOOLBAR_ACTION_ID + '/dropdown'
// update toolbar for these model change events
const MODEL_CHANGE_EVENTS = 'change:cid change:folder_id change:id' +
  ' change:filename change:title change:com.openexchange.file.sanitizedFilename ' +
  ' change:current_version change:number_of_versions change:version ' +
  ' change:object_permissions change:com.openexchange.share.extendedObjectPermissions change:shareable'

const FILE_VERSION_IS_UPLOADING_MSG = gt('This document cannot be viewed at the moment because a new version is being uploaded. Please wait until the upload is completed.')

// toolbar link meta object used to generate extension points later
const toolbarLinksMeta = {
  // high priority links
  filename: {
    prio: 'hi',
    mobile: 'hi',
    ref: TOOLBAR_ACTION_ID + '/rename',
    title: gt('File name'),
    customize: (function () {
      const RenameView = DisposableView.extend({
        initialize (options) {
          this.standalone = options.standalone
          this.listenTo(this.model, 'change', this.render)
          this.$el.addClass('viewer-toolbar-filename')
        },
        render () {
          const lastModified = this.model.get('last_modified')
          const isToday = moment().isSame(moment(lastModified), 'day')
          const dateString = (lastModified) ? moment(lastModified).format(isToday ? 'LT' : 'l LT') : '-'

          if (this.model.get('current_version') !== false) {
            // current version
            const filenameLabel = $('<span class="filename-label">').text(this.model.getDisplayName())
            extensions.fileTypeIcon.call(this.$el.empty(), this.model)
            this.$el.addClass('current-version').append(filenameLabel)
          } else {
            // older version
            this.$el.empty().addClass('old-version').append(
              // icon
              createIcon('bi/clock.svg'),
              // version
              $('<span class="version-label">').text(dateString + ' - ' + this.model.getDisplayName())
            )
          }

          return this
        }
      })

      return function (baton) {
        new RenameView({ el: this, model: baton.model, standalone: baton.standalone }).render()
        this.parent().addClass('align-left viewer-toolbar-filename-parent').after('<span class="viewer-toolbar-flex-spacer">')

        // check if action is available
        if (!baton.model.isFile()) return

        actionsUtil.checkAction('io.ox/files/actions/rename', baton).then(
          function yep () {
            this.attr({
              'data-original-title': gt('Rename File'),
              'data-placement': 'bottom'
            })
            this.tooltip()
          }.bind(this),
          function nope () {
            this.addClass('disabled')
          }.bind(this)
        )
      }
    }())
  },
  editplaintext: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/pencil.svg',
    title: gt('Edit'),
    section: 'edit',
    ref: 'io.ox/files/actions/editor'
  },
  zoomout: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/zoom-out.svg',
    title: gt('Zoom out'),
    section: 'zoom',
    ref: TOOLBAR_ACTION_ID + '/zoomout',
    customize () {
      this.addClass('viewer-toolbar-zoomout')
    }
  },
  zoomin: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/zoom-in.svg',
    title: gt('Zoom in'),
    section: 'zoom',
    ref: TOOLBAR_ACTION_ID + '/zoomin',
    customize () {
      this.addClass('viewer-toolbar-zoomin')
    }
  },
  zoomfitwidth: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Fit to screen width'),
    section: 'zoom',
    ref: TOOLBAR_ACTION_ID + '/zoomfitwidth',
    customize () {
      this.addClass('viewer-toolbar-fitwidth')
    }
  },
  zoomfitheight: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Fit to screen size'),
    section: 'zoom',
    ref: TOOLBAR_ACTION_ID + '/zoomfitheight',
    customize () {
      this.addClass('viewer-toolbar-fitheight')
    }
  },
  autoplaystart: {
    prio: _.device('desktop') ? 'hi' : 'lo',
    mobile: 'lo',
    icon: 'bi/play.svg',
    title: gt('Slideshow'),
    tooltip: gt('Run slideshow'),
    ref: TOOLBAR_ACTION_ID + '/autoplaystart',
    customize () {
      this.addClass('viewer-toolbar-autoplay-start')
    }
  },
  autoplaystop: {
    prio: _.device('desktop') ? 'hi' : 'lo',
    mobile: 'lo',
    icon: 'bi/stop.svg',
    title: gt('Stop slideshow'),
    ref: TOOLBAR_ACTION_ID + '/autoplaystop',
    customize () {
      this.addClass('viewer-toolbar-autoplay-stop')
    }
  }
}

const rightSide = {
  togglesidebar: {
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/info-circle.svg',
    title: gt('View details'),
    ref: TOOLBAR_ACTION_ID + '/togglesidebar',
    customize () {
      this.addClass('viewer-toolbar-togglesidebar')
    }
  },
  popoutstandalone: {
    prio: 'hi',
    icon: 'bi/box-arrow-right.svg',
    title: gt('Pop out standalone viewer'),
    ref: TOOLBAR_ACTION_ID + '/popoutstandalone',
    customize () {
      this.addClass('viewer-toolbar-popoutstandalone')
    }
  },
  help: {
    prio: 'hi',
    ref: TOOLBAR_ACTION_ID + '/help',
    customize () {
      const helpView = new HelpView({
        href: 'ox.appsuite.user.sect.drive.gui.viewer.html'
      })
      // DOCS-3078: imitate look-and-feel of other toolbar buttons
      helpView.$el.addClass('btn btn-toolbar').addActionTooltip(gt('Online help'))
      helpView.$el.find('svg').addClass('bi-18')
      this.replaceWith(helpView.render().$el)
    }
  },
  close: {
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/x-lg.svg',
    title: gt('Close'),
    tooltip: gt('Close viewer'),
    ref: TOOLBAR_ACTION_ID + '/close'
  }
}

// a map containing App <-> Links mapping
const linksMap = {
  drive: {
    rename: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Rename'),
      section: 'edit',
      ref: 'io.ox/files/actions/rename'
    },
    editdescription: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Edit description'),
      section: 'edit',
      ref: 'io.ox/files/actions/edit-description'
    },
    download: {
      prio: 'hi',
      mobile: _.device('ios && ios < 12') ? 'lo' : 'hi', // download is active in toolbar for ios >= 12 and all other devices
      icon: 'bi/download.svg',
      title: gt('Download'),
      section: 'export',
      ref: Util.getRefByModelSource('drive')
    },
    // on smartphones the separate dropdown is broken up and the options are added to the actions dropdown
    share: {
      prio: 'hi',
      mobile: 'lo',
      icon: 'bi/share.svg',
      title: gt('Share'),
      tooltip: gt('Share / Permissions'),
      ref: 'io.ox/files/actions/share'
    },
    open: {
      prio: 'lo',
      mobile: _.device('!ios || ios >= 12') ? 'lo' : 'hi', // 'window.open button' active in toolbar for ios < 12, for all other devices located in the burger menu
      icon: _.device('ios && ios < 12') ? 'bi/download.svg' : '',
      title: gt('Open attachment'),
      section: 'export',
      ref: 'io.ox/files/actions/open'
    },
    print: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Print as PDF'),
      section: 'export',
      ref: TOOLBAR_ACTION_DROPDOWN_ID + '/print'
    },
    sendbymail: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Send by email'),
      section: 'share',
      ref: 'io.ox/files/actions/send'
    },
    addtoportal: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Add to portal'),
      section: 'share',
      ref: 'io.ox/files/actions/add-to-portal'
    },
    addtofavorites: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Add to favorites'),
      section: 'favorites',
      ref: 'io.ox/files/actions/favorites/add'
    },
    removefromfavorites: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Remove from favorites'),
      section: 'favorites',
      ref: 'io.ox/files/actions/favorites/remove'
    },
    uploadnewversion: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Upload new version'),
      section: 'import',
      ref: 'io.ox/files/actions/upload-new-version'
    },
    delete: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Delete'),
      section: 'delete',
      ref: 'io.ox/files/actions/delete'
    }
  },
  mail: {
    print: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Print as PDF'),
      ref: TOOLBAR_ACTION_DROPDOWN_ID + '/print'
    },
    downloadmailattachment: {
      prio: 'hi',
      mobile: 'lo',
      icon: 'bi/download.svg',
      title: gt('Download'),
      ref: Util.getRefByModelSource('mail')
    },
    savemailattachmenttodrive: {
      prio: 'lo',
      mobile: 'lo',
      // #. %1$s is usually "Drive" (product name; might be customized)
      title: gt('Save to %1$s', gt.pgettext('app', 'Drive')),
      ref: 'io.ox/mail/attachment/actions/save'
    }
  },
  compose: {},
  pim: {
    print: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Print as PDF'),
      ref: TOOLBAR_ACTION_DROPDOWN_ID + '/print'
    },
    downloadmailattachment: {
      prio: 'hi',
      mobile: 'lo',
      icon: 'bi/download.svg',
      title: gt('Download'),
      ref: Util.getRefByModelSource('pim')
    },
    savemailattachmenttodrive: {
      prio: 'lo',
      mobile: 'lo',
      // #. %1$s is usually "Drive" (product name; might be customized)
      title: gt('Save to %1$s', gt.pgettext('app', 'Drive')),
      ref: 'io.ox/core/tk/actions/save-attachment'
    }
  },
  guardDrive: {
    rename: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Rename'),
      section: 'edit',
      ref: 'io.ox/files/actions/rename'
    },
    editdescription: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Edit description'),
      section: 'edit',
      ref: 'io.ox/files/actions/edit-description'
    },
    download: {
      prio: 'hi',
      mobile: 'lo',
      icon: 'bi/download.svg',
      title: gt('Download'),
      section: 'export',
      ref: Util.getRefByModelSource('guardDrive')
    },
    sendbymail: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Send by email'),
      section: 'share',
      ref: 'oxguard/sendcopy'
    },
    addtoportal: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Add to portal'),
      section: 'share',
      ref: 'io.ox/files/actions/add-to-portal'
    },
    uploadnewversion: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Upload new version'),
      section: 'import',
      ref: 'io.ox/files/actions/upload-new-version'
    },
    delete: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Delete'),
      section: 'delete',
      ref: 'io.ox/files/actions/delete'
    }
  },
  guardMail: {
  }
}
// create extension points containing each sets of links for Drive, Mail, PIM and other apps
_(linksMap).each(function (appMeta, appName) {
  let index = 0
  const extId = TOOLBAR_LINKS_ID + '/' + appName
  const extPoint = Ext.point(extId)
  const completeMeta = _.extend({}, toolbarLinksMeta, appMeta, rightSide)
  _(completeMeta).each(function (extension, id) {
    extPoint.extend(_.extend({ id, index: index += 100 }, extension))
  })
})

// define actions of this ToolbarView
const Action = actionsUtil.Action

// tested: no
Action(TOOLBAR_ACTION_DROPDOWN_ID, {
  action: $.noop
})

// tested: no
Action(TOOLBAR_ACTION_DROPDOWN_ID + '/print', {
  capabilities: 'document_preview',
  collection: 'one',
  matches (baton) {
    const model = baton.model
    const meta = model.get('meta')
    const isError = meta && meta.document_conversion_error && meta.document_conversion_error.length > 0
    if (isError) return false
    if (model.isFile() && !baton.collection.has('read')) return false
    return model.isOffice() || model.isPDF() || (model.isImage() && !model.isTiff()) || model.isText()
  },
  action (baton) {
    const documentPDFUrl = DocConverterUtils.getEncodedConverterUrl(baton.context.model)
    window.open(documentPDFUrl, '_blank', 'noopener, noreferrer')
  }
})

// tested: no
Action(TOOLBAR_ACTION_ID + '/rename', {
  action: _.noop
})

// tested: no
Action(TOOLBAR_ACTION_ID + '/togglesidebar', {
  action (baton) {
    baton.context.onToggleSidebar()
  }
})

Action(TOOLBAR_ACTION_ID + '/popoutstandalone', {
  capabilities: 'infostore',
  device: '!smartphone',
  matches (baton) {
    const model = baton.model
    // no support for mail attachments and no popout for already popped out viewer
    return model.get('group') !== 'localFile' && !baton.standalone
  },
  action (baton) {
    if (!FileUtils.isFileVersionUploading(baton.data.id, FILE_VERSION_IS_UPLOADING_MSG)) {
      if (tabApi.openInTabEnabled()) {
        // the url attributes to launch the popout viewer
        const urlAttrs = { app: 'io.ox/files/detail' }

        if (baton.model.isFile()) {
          _.extend(urlAttrs, {
            id: baton.model.get('id'),
            folder: baton.model.get('folder_id')
          })

          if (baton.model.get('current_version') === false) {
            urlAttrs.version = baton.model.get('version')
          }
        } else if (baton.model.isMailAttachment()) {
          _.extend(urlAttrs, {
            id: baton.data.mail.id,
            folder: baton.data.mail.folder_id,
            attachment: baton.data.id
          })
          // Handle decrypted attachments
          if (baton.data.security && baton.data.security.decrypted) {
            _.extend(urlAttrs, {
              decrypt: true,
              cryptoAuth: baton.data.security.authentication || baton.data.auth
            })
          }
        } else if (baton.model.isPIMAttachment()) {
          _.extend(urlAttrs, {
            module: baton.data.module,
            id: baton.data.attached,
            folder: baton.data.folder,
            attachment: baton.data.id || baton.data.managedId
          })
        } else if (baton.model.isComposeAttachment()) {
          _.extend(urlAttrs, {
            space: baton.data.space,
            attachment: baton.data.id
          })
        }

        const tabUrl = tabApi.createUrl(urlAttrs)
        tabApi.openChildTab(tabUrl)
      } else {
        ox.launch(() => import('@/io.ox/files/detail/main'), baton.model.isFile() ? baton.model : { file: baton.data })
      }
    }
  }
})

Action(TOOLBAR_ACTION_ID + '/help', {
  capabilities: 'infostore',
  device: '!smartphone',
  matches (baton) {
    return !baton.standalone
  },
  // handled by HelpView
  action: $.noop
})

Action(TOOLBAR_ACTION_ID + '/close', {
  matches (baton) {
    return !baton.standalone || !tabApi.openInTabEnabled()
  },
  action (baton) {
    return baton.context.onClose(baton.e)
  }
})

// tested: no
Action(TOOLBAR_ACTION_ID + '/zoomin', {
  matches (baton) {
    const model = baton.model
    return model.isOffice() || model.isPDF() || model.isText() || model.isImage()
  },
  action (baton) {
    baton.context.onZoomIn()
  }
})

// tested: no
Action(TOOLBAR_ACTION_ID + '/zoomout', {
  matches (baton) {
    const model = baton.model
    return model.isOffice() || model.isPDF() || model.isText() || model.isImage()
  },
  action (baton) {
    baton.context.onZoomOut()
  }
})

// tested: no
Action(TOOLBAR_ACTION_ID + '/zoomfitwidth', {
  matches (baton) {
    const model = baton.model
    return (model.isOffice() || model.isPDF() || model.isText()) && baton.standalone
  },
  action (baton) {
    baton.context.viewerEvents.trigger('viewer:zoom:fitwidth')
  }
})

// tested: no
Action(TOOLBAR_ACTION_ID + '/zoomfitheight', {
  matches (baton) {
    const model = baton.model
    return (model.isOffice() || model.isPDF() || model.isText()) && baton.standalone
  },
  action (baton) {
    baton.context.viewerEvents.trigger('viewer:zoom:fitheight')
  }
})

// tested: no
Action(TOOLBAR_ACTION_ID + '/autoplaystart', {
  matches (baton) {
    return supportsAutoPlay(baton, false)
  },
  action (baton) {
    baton.context.onAutoplayStart()
  }
})

// tested: no align
Action(TOOLBAR_ACTION_ID + '/autoplaystop', {
  matches (baton) {
    return supportsAutoPlay(baton, true)
  },
  action (baton) {
    baton.context.onAutoplayStop()
  }
})

function supportsAutoPlay (baton, started) {
  if (baton.standalone) return false
  if (baton.context.autoplayStarted !== started) return false
  if (!baton.model.isImage()) return false
  return imageCount(baton.model) >= 2
}

function imageCount (model) {
  if (!model.collection) { return 0 }

  return model.collection.reduce(function (memo, model) {
    return (model.isImage() ? memo + 1 : memo)
  }, 0)
}

// define the Backbone view
const ViewerToolbarView = DisposableView.extend({

  className: 'viewer-toolbar',

  events: {
    'click a[data-action="io.ox/core/viewer/actions/toolbar/rename"]': 'onRename',
    'keydown a[data-action="io.ox/core/viewer/actions/toolbar/rename"]': 'onRename'
  },

  initialize (options) {
    _.extend(this, options)
    // rerender on slide change
    this.listenTo(this.viewerEvents, 'viewer:displayeditem:change', this.render)
    // show current page on the navigation page box
    this.listenTo(this.viewerEvents, 'viewer:document:loaded', this.onDocumentLoaded)
    this.listenTo(this.viewerEvents, 'viewer:document:pagechange', this.onPageChange)
    // listen to autoplay events
    this.listenTo(this.viewerEvents, 'viewer:autoplay:state:changed', this.onAutoplayRunningStateChanged)
    // listen to version display events
    this.listenTo(this.viewerEvents, 'viewer:display:version', this.onDisplayTempVersion.bind(this))
    // listen to added/removed favorites
    this.listenTo(FilesAPI, 'favorite:add favorite:remove', this.onFavoritesChange)
    // give toolbar a standalone class if its in one
    this.$el.toggleClass('standalone', this.standalone)
    // the current autoplay state
    this.autoplayStarted = false

    // create a debounced version of the render function
    this.renderDebounced = _.debounce(this.render.bind(this), 100)
    // create a debounced version of the toolbar update function
    this.updateToolbarDebounced = _.debounce(this.updateToolbar.bind(this), 100)

    this.toolbar = new ToolbarView({ point: null, el: this.el, align: 'right', strict: false })
  },

  /**
   * Document load success handler. Renders the page navigation in the toolbar.
   */
  onDocumentLoaded () {
    if (this.standalone && !_.device('smartphone')) {
      this.renderPageNavigation()
    }
  },

  /**
   * Page change handler:
   * - updates page number in the page input control
   *
   * @param {number} pageNumber
   * @param {number} pageTotal
   */
  onPageChange (pageNumber, pageTotal) {
    const pageInput = this.$('.viewer-toolbar-page')
    const pageTotalDisplay = this.$('.viewer-toolbar-page-total')
    if (pageTotal) {
      pageTotalDisplay.text(gt('of %1$d', pageTotal))
      pageInput.attr('data-page-total', pageTotal)
    }
    pageInput.val(pageNumber).attr('data-page-number', pageNumber).trigger('change', { preventPageScroll: true })
  },

  /**
   * Close the viewer.
   */
  onClose (event) {
    event.preventDefault()
    event.stopPropagation()
    this.viewerEvents.trigger('viewer:close')
  },

  /**
   * Toggles the visibility of the sidebar.
   */
  onToggleSidebar () {
    this.viewerEvents.trigger('viewer:toggle:sidebar')
  },

  /**
   * Handler for the file rename event.
   * Invokes the file rename action on SPACE key, ENTER key or a mouse double click.
   *
   * @param {jQuery.Event} event
   */
  onRename (e) {
    if (!(e.which === 32 || e.which === 13 || e.type === 'click')) return
    e.preventDefault()
    if (!this.model.isFile()) return

    actionsUtil.invoke('io.ox/files/actions/rename', Ext.Baton({ data: this.model.toJSON(), isViewer: true }))
  },

  /**
   * Publishes zoom-in event to the MainView event aggregator.
   */
  onZoomIn () {
    if (this.model.isImage()) {
      this.viewerEvents.trigger('viewer:zoom:in:swiper')
    } else {
      this.viewerEvents.trigger('viewer:zoom:in')
    }
  },

  /**
   * Publishes zoom-out event to the MainView event aggregator.
   */
  onZoomOut () {
    if (this.model.isImage()) {
      this.viewerEvents.trigger('viewer:zoom:out:swiper')
    } else {
      this.viewerEvents.trigger('viewer:zoom:out')
    }
  },

  /**
   * Model change handler that re-renders the toolbar
   * @param {object} changedModel an object with changed model attributes.
   */
  onModelChange (changedModel) {
    // ignore events that require no render
    if (changedModel.changed.description && (this.model.previous('description') !== changedModel.get('description'))) {
      return
    }
    this.renderDebounced(changedModel)
  },

  /**
   * Listener for added/removed favorites. Re-renders the toolbar
   * @param {object} file the file descriptor.
   */
  onFavoritesChange (file) {
    if (this.model && this.model.cid === _.cid(file)) {
      this.updateToolbarDebounced()
    }
  },

  /**
   * Handles display temporary file version events.
   *
   * @param {object} versionData The JSON representation of the version.
   */
  onDisplayTempVersion (versionData) {
    if (!versionData) { return }

    this.model = new FilesAPI.Model(versionData)
    this.updateToolbar()
  },

  /**
   * Handles when autoplay is started or stopped
   *
   * @param {object} state
   */
  onAutoplayRunningStateChanged (state) {
    if (!state) { return }

    this.autoplayStarted = state.autoplayStarted
    this.updateToolbarDebounced()
  },

  /**
   * Publishes autoplay event to the MainView event aggregator.
   */
  onAutoplayStart () {
    this.viewerEvents.trigger('viewer:autoplay:toggle', 'running')
  },

  /**
   * Publishes autoplay event to the MainView event aggregator.
   */
  onAutoplayStop () {
    this.viewerEvents.trigger('viewer:autoplay:toggle', 'pausing')
  },

  /**
   * Renders this DisplayerView with the supplied model.
   *
   * @param   {object}        model
   *                                The file model object.
   * @returns {Backbone.View}       ToolbarView instance
   *                                this view object itself.
   */
  render (model) {
    // remove listener from previous model
    if (this.model) { this.stopListening(this.model, MODEL_CHANGE_EVENTS, this.onModelChange) }

    if (!model) {
      console.error('Core.Viewer.ToolbarView.render(): no file to render')
      return this
    }

    const appName = model.get('source')

    // add CSS device class to $el for smartphones or tablets
    Util.setDeviceClass(this.$el)

    // save current data as view model
    this.model = model

    // update inner toolbar
    this.toolbar.setPoint(TOOLBAR_LINKS_ID + '/' + appName)
    this.updateToolbar()

    // add listener for new model
    this.listenTo(this.model, MODEL_CHANGE_EVENTS, this.onModelChange)

    return this
  },

  /**
   * Update inner toolbar.
   */
  updateToolbar () {
    if (this.disposed) return
    if (!this.model) { return }

    const isDriveFile = this.model.isFile()
    const modelJson = this.model.toJSON()

    this.toolbar.setSelection([modelJson], function () {
      return {
        context: this,
        data: isDriveFile ? modelJson : this.model.get('origData'),
        model: this.model,
        models: isDriveFile ? [this.model] : null,
        openedBy: this.openedBy,
        standalone: this.standalone,
        isViewer: true
      }
    }.bind(this))
  },

  /**
   * Renders the document page navigation controls.
   */
  renderPageNavigation () {
    const prevBtn = $('<a class="btn btn-toolbar" role="button">')
      .attr({ 'aria-label': gt('Previous page'), title: gt('Previous page') })
      .append(createIcon('bi/arrow-up.svg'))
    const prevGroup = $('<li role="presentation" class="viewer-toolbar-navigation">').append(prevBtn)
    const nextBtn = $('<a class="btn btn-toolbar" role="button">')
      .attr({ 'aria-label': gt('Next page'), title: gt('Next page') })
      .append(createIcon('bi/arrow-down.svg'))
    const nextGroup = $('<li role="presentation" class="viewer-toolbar-navigation">').append(nextBtn)
    const pageInput = $('<input type="text" class="form-control viewer-toolbar-page" role="textbox">')
    const totalPage = $('<div class="viewer-toolbar-page-total">')
    const pageGroup = $('<li role="presentation" class="viewer-toolbar-navigation">').append(pageInput, totalPage)
    const self = this

    function setButtonState ($btn, state) {
      if (state) {
        $btn.removeClass('disabled').removeAttr('aria-disabled')
      } else {
        $btn.addClass('disabled').attr('aria-disabled', true)
      }
    }
    function onPrevPage () {
      self.viewerEvents.trigger('viewer:document:previous')
    }
    function onNextPage () {
      self.viewerEvents.trigger('viewer:document:next')
    }
    function onInputKeydown (e) {
      e.stopPropagation()
      if (e.which === 13 || e.which === 27) {
        self.$el.parent().focus()
      }
    }
    function onInputChange (event, options) {
      options = _.extend({ preventPageScroll: false }, options)
      let newValue = parseInt($(this).val(), 10)
      const oldValue = parseInt($(this).attr('data-page-number'), 10)
      const pageTotal = parseInt($(this).attr('data-page-total'), 10)
      if (isNaN(newValue)) {
        $(this).val(oldValue)
        return
      }
      if (newValue <= 0) {
        $(this).val(1)
        newValue = 1
      }
      if (newValue > pageTotal) {
        $(this).val(pageTotal)
        newValue = pageTotal
      }
      setButtonState(prevBtn, newValue > 1)
      setButtonState(nextBtn, newValue < pageTotal)
      $(this).attr('data-page-number', newValue)
      if (!options.preventPageScroll) {
        self.viewerEvents.trigger('viewer:document:scrolltopage', newValue)
      }
    }
    function onClick () {
      $(this).select()
    }

    pageInput.on('keydown', onInputKeydown).on('change', onInputChange).on('click', onClick)
    prevBtn.on('click', onPrevPage)
    nextBtn.on('click', onNextPage)
    this.$('.viewer-toolbar-flex-spacer').after(prevGroup, nextGroup, pageGroup, '<span class="viewer-toolbar-flex-spacer">')
  },

  /**
   * Destructor of this view
   */
  onDispose () {
    this.stopListening(FilesAPI)
    this.model = null
  }

})

export default ViewerToolbarView
