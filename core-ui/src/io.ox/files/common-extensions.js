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
import moment from '@open-xchange/moment'

import * as util from '@/io.ox/mail/util'
import strings from '@/io.ox/core/strings'
import { createIcon } from '@/io.ox/core/components'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

const iconList = {
  image: 'bi/file-earmark-image.svg',
  audio: 'bi/file-earmark-music.svg',
  video: 'bi/file-earmark-play.svg',
  doc: 'bi/file-earmark-text.svg', // same icon as txt, but different color
  xls: 'bi/ox-spreadsheet.svg',
  ppt: 'bi/ox-presentation.svg',
  pdf: 'bi/file-earmark-pdf.svg',
  zip: 'bi/file-earmark-zip.svg',
  svg: 'bi/file-earmark-image.svg',
  txt: 'bi/file-earmark-text.svg',
  guard: 'bi/file-earmark-lock.svg'
}

function getFileIcon (model) {
  const type = model.getFileType()
  const icons = _.extend(iconList, {
    folder: (_.isFunction(model.getAccountError) && model.getAccountError()) ? 'bi/exclamation-triangle.svg' : 'bi/folder-fill.svg'
  })
  const icon = icons[type] || 'bi/file-earmark.svg'
  return createIcon(icon).addClass('file-type-icon file-type-' + type)
}

function topFolderInPublicAndSharedFiles (baton) {
  const parentFolder = baton.model.get('folder_id')
  return (parentFolder === '10' || parentFolder === '15') && // is folder below My shares or Public files
    _.isFunction(baton.model.isFolder) && baton.model.isFolder()
}

function isSharedFederated (baton) {
  return baton && _.isFunction(baton.model.isSharedFederatedSync) && baton.model.isSharedFederatedSync()
}

const extensions = {

  ariaLabel (baton) {
    const parts = []
    // filename, last modified, and size
    parts.push(baton.data.filename || baton.data.title)
    if (baton.model.isFolder()) parts.push(gt('Folder'))
    parts.push(gt('modified') + ' ' + moment(baton.data.last_modified).format('LLL'))
    parts.push(gt('size') + ' ' + strings.fileSize(baton.data.file_size || 0, 1))
    this.closest('li').attr('aria-label', parts.join(', ') + '.')
  },

  date (baton, options) {
    const data = baton.data; const t = data.last_modified
    if (!_.isNumber(t)) return
    this.append(
      $('<time class="date">')
        .attr('datetime', moment(t).toISOString())
        .text(util.getDateTime(t, options))
    )
  },

  smartdate (baton) {
    extensions.date.call(this, baton, { fulldate: false, smart: true })
  },

  fulldate (baton) {
    extensions.date.call(this, baton, { fulldate: true, smart: false })
  },

  compactdate (baton) {
    extensions.date.call(this, baton, { fulldate: false, smart: false })
  },

  getFilename (baton, ellipsis) {
    let
      filename = baton.model.getDisplayName()
    let isWrapFilename = false
    let hostNameSuffix

    // add suffix for locked files
    if (baton.model && _.isFunction(baton.model.isLocked) && baton.model.isLocked()) {
      filename += ' (' + gt('Locked') + ')'
    }

    // hostname suffix for federated share
    if (topFolderInPublicAndSharedFiles(baton) && isSharedFederated(baton)) {
      hostNameSuffix = baton.model.getAccountDisplayNameSync()
      filename = hostNameSuffix ? filename + ' (' + hostNameSuffix + ')' : filename
    }

    // fix long names, but never suppress the extension when a hostName is used or it will look wrong
    if (ellipsis) {
      // entries with host name need a different ellipses config to work well
      if (hostNameSuffix) { _.extend(ellipsis, { suppressExtension: false, optimizeWordbreak: false }) }

      filename = _.ellipsis(filename, ellipsis)

      if (ellipsis.optimizeWordbreak !== true) {
        isWrapFilename = true
      }
    } else {
      isWrapFilename = true
    }
    if (isWrapFilename) {
      // make underscore wrap as well
      filename = filename.replace(/_/g, '_\u200B')
    }
    return filename
  },

  filename (baton, ellipsis) {
    this.append(
      $('<div class="filename">').text(
        extensions.getFilename(baton, ellipsis)
      )
    )
  },

  filenameTooltip (baton) {
    let title = baton.data['com.openexchange.file.sanitizedFilename'] || baton.data.filename || baton.data.title || ''
    const target = this.children('.filename')
    // let title = _.breakWord(filename)

    // hostname suffix for federated share
    if (topFolderInPublicAndSharedFiles(baton) && isSharedFederated(baton)) {
      const hostNameSuffix = baton.model.getAccountDisplayNameSync()
      title = hostNameSuffix ? title + ' (' + hostNameSuffix + ')' : title
    }

    target.attr('title', title)
    /*
     * The Tooltip object uses the value provided through the options or the data-original-title attribute value.
     * The only alternative is an explicit Tooltip object destruction before recreation (including cumbersome timeout because of async function).
     * The repeated initialization by invoking parent.tooltip() is necessary to not loose the tooltip feature when switching view layouts.
     * See bug 62650 and 64518 for further information.
     */
    // parent.attr('data-original-title', title).tooltip('hide')
    // parent.tooltip({ // http://getbootstrap.com/javascript/#tooltips // https://codepen.io/jasondavis/pen/mlnEe
    //   title: title,
    //   trigger: 'hover', // click | hover | focus | manual. You may pass multiple triggers; separate them with a space.
    //   // placement: 'right auto',                // top | bottom | left | right | auto.
    //   placement: 'bottom auto', // top | bottom | left | right | auto.
    //   animation: true, // false
    //   // delay: { 'show': 400, 'hide': 50000 },
    //   delay: { show: 400 },
    //   container: parent,

    //   // Bug-55575: Dropdown indicator shown when hovering over folder symbol
    //   viewport: { selector: '.io-ox-files-main .list-view-control.toolbar-top-visible', padding: 16 } // viewport: '#viewport' or { "selector": "#viewport", "padding": 0 } // or callback function
    // }).on('dispose', function () {
    //   $(this).parent().tooltip('destroy')
    // })
  },

  mailSubject (baton, ellipsis) {
    if (!_.has(baton.data, 'com.openexchange.file.storage.mail.mailMetadata')) return
    const data = baton.data['com.openexchange.file.storage.mail.mailMetadata']
    let subject = util.getSubject(data.subject || '')
    // fix long names
    if (ellipsis) subject = _.ellipsis(subject, ellipsis)
    // make underscore wrap as well
    subject = subject.replace(/_/g, '_\u200B')
    this.append(
      $('<div class="subject">').text(subject)
    )
  },

  mailFrom (baton, ellipsis) {
    if (!_.has(baton.data, 'com.openexchange.file.storage.mail.mailMetadata')) return
    const data = baton.data['com.openexchange.file.storage.mail.mailMetadata']
    const attachmentView = settings.get('folder/mailattachments', {})
    let from = (baton.app.folder.get() === attachmentView.sent) ? data.to[0] : data.from[0]
    from = util.getDisplayName(from)
    // fix long names
    if (ellipsis) from = _.ellipsis(from, ellipsis)
    // make underscore wrap as well
    from = from.replace(/_/g, '_\u200B')
    this.append(
      $('<div class="from">').text(from)
    )
  },

  size (baton) {
    const size = baton.data.file_size
    this.append(
      $('<span class="size">').text(
        _.isNumber(size) ? strings.fileSize(size, 1) : '\u2014'
      )
    )
  },

  locked (baton) {
    if (baton.model && baton.model.isLocked) {
      this.toggleClass('locked', baton.model.isLocked())
    }
  },

  fileTypeClass (baton) {
    const type = baton.model.getFileType()
    const listItem = this.closest('.list-item')
    if (listItem[0]) {
      listItem[0].className = listItem[0].className.replace(/file-type-\w*/gi, '')
    }
    listItem.addClass('file-type-' + type)
  },

  // arg could be baton or model
  fileTypeIcon (arg) {
    this.append(getFileIcon(arg.model || arg))
  },

  //
  // Thumbnail including the concept of retries
  //

  thumbnail: (function () {
    let model

    function load () {
      // 1x1 dummy or final image? css scaling must be ignored, DOCS-3918.
      if (this.naturalWidth > 1 && this.naturalHeight > 1) finalize.call(this); else reload.call(this)
    }

    function finalize () {
      const img = $(this); const url = img.attr('src')
      // set as background image
      img.parent().css('background-image', 'url(' + url + ')')
      // remove dummy image
      img.remove()
    }

    function reload () {
      let img = $(this)
      const retry = img.data('retry') + 1
      const url = String(img.attr('src') || '').replace(/&retry=\d+/, '') + '&retry=' + retry
      // 3 6 12 seconds
      const wait = Math.pow(2, retry - 1) * 3000
      // stop trying after three retries
      if (retry > 3) return
      setTimeout(function () {
        img.off('load.lazyload error.lazyload').on({ 'load.lazyload': load, 'error.lazyload': error }).attr('src', url).data('retry', retry)
        img = null
      }, wait)
    }

    function renderFallBackIcon () {
      return $('<span class="file-icon">').append(
        model.isEncrypted()
          ? createIcon('bi/lock-fill.svg').addClass('file-type-icon')
          : getFileIcon(model)
      )
    }

    function error () {
      // fallback to default
      $(this).parent().addClass('default-icon').append(renderFallBackIcon())
      $(this).remove()
    }

    return function (baton) {
      model = baton.model

      // // Folder
      if (baton.model.isFolder()) return

      // File with preview
      const preview = baton.model.supportsPreview()
      if (preview) {
        const retina = _.device('retina')
        const width = retina ? 400 : 200
        const height = retina ? 300 : 150
        const url = baton.model.getUrl(preview, { width, height, scaleType: 'cover' })
        const img = $('<img class="dummy-image invisible">').data('retry', 0)

        // fix URL - would be cool if we had just one call for thumbnails ...
        img.attr('data-original', url.replace(/format=preview_image/, 'format=thumbnail_image'))

        // use lazyload
        img.on({ 'load.lazyload': load, 'error.lazyload': error }).lazyload()

        return this.append(
          $('<div class="icon-thumbnail">').append(img)
        )
      }
      // Fallback
      this.append(
        $('<div class="icon-thumbnail default-icon">').append(renderFallBackIcon())
      )
    }
  }())
}

export default extensions
