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
import moment from '@open-xchange/moment'
import ox from '@/ox'
import PanelBaseView from '@/io.ox/core/viewer/views/sidebar/panelbaseview'
import Ext from '@/io.ox/core/extensions'
import ActionDropdownView from '@/io.ox/backbone/views/action-dropdown'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import FilesAPI from '@/io.ox/files/api'
import UserAPI from '@/io.ox/core/api/user'
import Util from '@/io.ox/core/viewer/util'
import { createButton } from '@/io.ox/core/components'
import gt from 'gettext'

const POINT = 'io.ox/core/viewer/sidebar/versions'
const Action = actionsUtil.Action
const getSortedVersions = function (versions) {
  const versionSorter = function (version1, version2) {
    // current version always on top
    if (version1.current_version) {
      return -versions.length
    } else if (version2.current_version) {
      return versions.length
    }
    return version2.last_modified - version1.last_modified
  }

  // avoid unnecessary model changes / change events
  return _.clone(versions).sort(versionSorter)
}

// Extensions for the file versions list
Ext.point(POINT + '/list').extend({
  index: 10,
  id: 'versions-list',
  draw (baton) {
    const model = baton && baton.model
    const standalone = Boolean(baton && baton.standalone)
    const isViewer = Boolean(baton && baton.isViewer)
    const viewerEvents = baton && baton.viewerEvents
    let versions = model && model.get('versions')
    const panelHeading = this.find('.sidebar-panel-heading')
    const panelBody = this.find('.sidebar-panel-body')
    let versionCounter = 1
    const isUpToDate = _.contains(_.pluck(versions, 'version'), model.get('version'))
    let tableNode
    const versionCounterSupport = !(/^(owncloud|webdav|nextcloud)$/.test(model.get('folder_id').split(':')[0]))

    function getVersionsTable () {
      const table = $('<table>').addClass('versiontable table').attr('data-latest-version', (versions.length > 0) && _.last(versions).version).append(
        $('<caption>').addClass('sr-only').text(gt('File version table, the first row represents the current version.')),
        $('<thead>').addClass('sr-only').append(
          $('<tr>').append(
            $('<th>').text(gt('File'))
          )
        )
      )

      _(getSortedVersions(versions)).each(function (version, id, versions) {
        const entryRow = $('<tr class="version">').attr('data-version-number', version.version)
        Ext.point(POINT + '/version').invoke('draw', entryRow, Ext.Baton({ data: version, viewerEvents, isViewer, standalone, latestVersion: versionCounter === versions.length, last_modified: id === 0 }))
        table.append(entryRow)
        versionCounter++
      })
      return table
    }

    if (versionCounterSupport) {
      if (!model || !_.isArray(versions)) {
        panelBody.empty()
        return
      }
    }

    const def = isUpToDate ? $.when(versions) : FilesAPI.versions.load(model.toJSON(), { cache: false, adjustVersion: !versionCounterSupport })

    return def.then(function (allVersions) {
      versions = allVersions
      tableNode = getVersionsTable()
      panelHeading.idle()
      panelBody.empty()
      panelBody.append(tableNode)
    })
  }
})

// View a specific version
Ext.point('io.ox/files/versions/links/inline/current').extend({
  id: 'display-version',
  index: 100,
  prio: 'lo',
  mobile: 'lo',
  title: gt('View this version'),
  section: 'view',
  ref: 'io.ox/files/actions/viewer/display-version'
})

Ext.point('io.ox/files/versions/links/inline/older').extend({
  id: 'display-version',
  index: 100,
  prio: 'lo',
  mobile: 'lo',
  title: gt('View this version'),
  section: 'view',
  ref: 'io.ox/files/actions/viewer/display-version'
})

Action('io.ox/files/actions/viewer/display-version', {
  capabilities: 'infostore',
  matches (baton) {
    const versionSpec = baton.first()
    if (!baton.isViewer) { return false }
    // Spreadsheet supports display of current version only
    // for external storages: current_version = true, attribute not present -> current version
    if ((versionSpec.current_version === false) && FilesAPI.isSpreadsheet(versionSpec)) { return false }
    return true
  },
  action (baton) {
    if (!baton.viewerEvents) { return }
    baton.viewerEvents.trigger('viewer:display:version', baton.data)
  }
})

// Open a specific version in Popout Viewer
Ext.point('io.ox/files/versions/links/inline/current').extend({
  id: 'open-version-in-popout-viewer',
  index: 120,
  prio: 'lo',
  mobile: 'lo',
  title: gt('Open in pop out viewer'),
  section: 'view',
  ref: 'io.ox/files/actions/viewer/popout-version'
})

Ext.point('io.ox/files/versions/links/inline/older').extend({
  id: 'open-version-in-popout-viewer',
  index: 120,
  prio: 'lo',
  mobile: 'lo',
  title: gt('Open in pop out viewer'),
  section: 'view',
  ref: 'io.ox/files/actions/viewer/popout-version'
})

Action('io.ox/files/actions/viewer/popout-version', {
  capabilities: 'infostore',
  device: '!smartphone',
  matches (baton) {
    const versionSpec = baton.first()
    if (!baton.isViewer) { return false }
    if (baton.standalone) { return false }
    // Spreadsheet supports display of current version only
    // for external storages: current_version = true, attribute not present -> current version
    if ((versionSpec.current_version === false) && FilesAPI.isSpreadsheet(versionSpec)) { return false }
    return true
  },
  action (baton) {
    actionsUtil.invoke('io.ox/core/viewer/actions/toolbar/popoutstandalone', Ext.Baton({
      data: baton.data,
      model: new FilesAPI.Model(baton.data),
      isViewer: baton.isViewer,
      openedBy: baton.openedBy,
      standalone: baton.standalone
    }))
  }
})

// Extensions for the version detail table
Ext.point(POINT + '/version').extend({
  index: 10,
  id: 'filename',
  draw (baton) {
    // for external storages: current_version = true, attribute not present -> current version
    const isCurrentVersion = baton.data.current_version !== false
    const versionPoint = isCurrentVersion ? 'io.ox/files/versions/links/inline/current' : 'io.ox/files/versions/links/inline/older'

    if (isCurrentVersion) {
      // fix for the files action edit it needs the model
      baton.models = [FilesAPI.pool.get('detail').get(_.cid(baton.data))]
    }

    const $toggle = createButton({ variant: 'toolbar', icon: { name: 'bi/three-dots.svg', title: gt('Actions') } })
      .addClass('dropdown-toggle')
      .attr('data-toggle', 'dropdown')
    const dropdown = new ActionDropdownView({ point: versionPoint, $toggle, caret: false })
      .setSelection([baton.data], _(baton).pick('data', 'isViewer', 'viewerEvents', 'latestVersion', 'standalone', 'models'))
    dropdown.$menu.addClass('dropdown-menu-right')
    const filename = baton.data['com.openexchange.file.sanitizedFilename'] || baton.data.filename
    this.toggleClass('current', isCurrentVersion).append(
      $('<td class="version-content flex-row">').append(
        $('<div class="version-data flex-grow">').toggleClass('current-version', isCurrentVersion).append(
          $('<div class="truncate version-filename">').text(filename)
        ),
        dropdown.$el.addClass('dropup')
      )
    )
  }
})

// User name
Ext.point(POINT + '/version').extend({
  id: 'created_by',
  index: 20,
  draw (baton) {
    const $node = $('<div class="version-detail version-createdby truncate">')
    this.find('td:last .version-data').append($node)

    UserAPI.getName(baton.data.created_by)
      .done(function (name) {
        Util.setClippedLabel($node, name)
      })
      .fail(function (err) {
        console.warn('UserAPI.getName() error ', err)
        $node.text(gt('unknown'))
      })
  }
})

// Modification date
Ext.point(POINT + '/version').extend({
  id: 'last_modified_and_size',
  index: 30,
  draw (baton) {
    const isToday = moment().isSame(moment(baton.data.last_modified), 'day')
    const dateString = (baton.data.last_modified) ? moment(baton.data.last_modified).format(isToday ? 'LT' : 'l LT') : '-'
    const size = (_.isNumber(baton.data.file_size)) ? _.filesize(baton.data.file_size) : '-'
    this.find('td:last .version-data').append(
      $('<div class="version-detail version-modified">').text(dateString + ' \u00b7 ' + size)
    )
  }
})

// Version comment
Ext.point(POINT + '/version').extend({
  id: 'comment',
  index: 50,
  draw (baton) {
    if (!_.isEmpty(baton.data.version_comment)) {
      const $node = $('<div class="version-detail version-comment">')
      Util.setClippedLabel($node, baton.data.version_comment)
      this.find('td:last .version-data').append($node)
    }
  }
})

// since a file change redraws the entire view
// we need to track the open/close state manually
const open = {}

/**
 * The FileVersionsView is intended as a sub view of the SidebarView and
 * is responsible for displaying the history of file versions.
 */
const FileVersionsView = PanelBaseView.extend({

  className: 'viewer-fileversions',

  initialize (options) {
    PanelBaseView.prototype.initialize.apply(this, arguments)

    _.extend(this, {
      isViewer: Boolean(options && options.isViewer),
      viewerEvents: (options && options.viewerEvents) || _.extend({}, Backbone.Events),
      standalone: Boolean(options && options.standalone)
    })

    // initially hide the panel
    this.$el.hide()

    // use current version, if possible
    const currentVersion = FilesAPI.pool.get('detail').get(_.cid(this.model.toJSON()))
    this.model = currentVersion || this.model

    // attach event handlers
    this.$el.on({
      open: this.onOpen.bind(this),
      close: this.onClose.bind(this)
    })
    this.listenTo(this.model, 'change:number_of_versions change:versions', this.render)
    this.listenTo(this.model, 'change:versions change:current_version change:number_of_versions change:version change:com.openexchange.file.sanitizedFilename', this.renderVersions)
  },

  onOpen () {
    const header = this.$('.sidebar-panel-heading').busy()
    // remember
    open[this.model.cid] = true
    // loading versions will trigger 'change:version' which in turn renders the version list
    FilesAPI.versions.load(this.model.toJSON(), { cache: false })
      .always($.proxy(header.idle, header))
      .done($.proxy(this.renderVersionsAsNeeded, this))
      .fail(function (error) {
        if (ox.debug) console.error('FilesAPI.versions.load()', 'error', error)
      })
  },

  onClose () {
    delete open[this.model.cid]
  },

  render () {
    if (!this.model) return this
    const count = this.model.get('versions')
      ? this.model.get('versions').length
      : this.model.get('number_of_versions')
    this.setPanelHeader(gt('Versions'), count, 'version-count')
    // show the versions panel only if we have at least 2 versions
    this.$el.toggle(count > 1)
    this.togglePanel(count > 1 && !!open[this.model.cid])
    return this
  },

  /**
   * Render the version list
   */
  renderVersions () {
    if (!this.model || !open[this.model.cid]) return this
    const expectedVersionOrder = _(getSortedVersions(this.model.get('versions') || [])).pluck('version')
    const actualVersionOrder = this.$el.find('.version').map(function (index, node) { return node.getAttribute('data-version-number') }).get()

    // if we already show the versionlist in exactly that order and length, we have nothing to do => avoid flickering because of needless redraw
    if (JSON.stringify(expectedVersionOrder) === JSON.stringify(actualVersionOrder)) return
    Ext.point(POINT + '/list').invoke('draw', this.$el, Ext.Baton({ model: this.model, data: this.model.toJSON(), viewerEvents: this.viewerEvents, isViewer: this.isViewer, standalone: this.standalone }))
  },

  renderVersionsAsNeeded () {
    // might be disposed meanwhile
    if (!this.$el) return
    // in case FilesAPI.versions.load will not indirectly triggers a 'change:version'
    // f.e. when a new office document is created and the model
    // is up-to-date when toggling versions pane
    const node = this.$('table.versiontable')
    const model = this.model
    // is empty
    if (!node.length) return this.renderVersions()
    // missing versions
    const versions = model.get('versions') || []
    if (!versions.length) return this.renderVersions()
    // added and removed same number of versions
    if (node.find('tr.version').length !== versions.length) return this.renderVersions()
    // has difference in version count
    if (node.attr('data-latest-version') !== _.last(versions).version) return this.renderVersions()
  },

  /**
   * Destructor function of this view.
   */
  onDispose () {
    this.model = null
  }
})

export default FileVersionsView
