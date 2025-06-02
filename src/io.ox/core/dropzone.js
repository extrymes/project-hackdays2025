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
import Backbone from '@/backbone'
import ox from '@/ox'
import yell from '@/io.ox/core/yell'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

const EVENTS = 'dragenter dragover dragleave drop'

// iframe overlay during dnd
const toggleDndMask = _.throttle(function (state) {
  const active = $('html').hasClass('dndmask-enabled')

  if (active === state) return

  $('html').toggleClass('dndmask-enabled', state)
  if (!state) return $('.dndmask').remove()

  $('iframe:visible').each(function () {
    const id = _.uniqueId('overlay-')
    const iframe = $(this)
      .attr('data-overlay', id)
      .before(
        // overlay
        $('<div id="' + id + '" class="dndmask" style="background: yellow">')
          .on(EVENTS, function (e) {
            const event = $.Event(e.type, { offsetX: e.offsetX, offsetY: e.offsetY })
            $('body', iframe.contents()).trigger(event)
          })
      )
  })
}, 100)
ox.on('drag:start', _.partial(toggleDndMask, true))
ox.on('drag:stop', _.partial(toggleDndMask, false))

// Backbone Dropzone
const InplaceDropzone = Backbone.View.extend({

  className: 'inplace-dropzone',

  events: {
    drop: 'onDrop',
    'dragenter .dropzone-overlay': 'onDragenter',
    'dragover .dropzone-overlay': 'onDragover',
    'dragleave .dropzone-overlay': 'onDragleave'
  },

  onLeave (e) {
    if (!this.leaving) return
    ox.trigger('drag:stop', this.cid)
    this.hide(e)
  },

  onDrag (e) {
    if (!this.$el.parent().is(':visible')) return
    if (!this.isSupported()) return
    switch (e.type) {
      case 'dragenter':
      case 'dragover':
        ox.trigger('drag:start', this.cid)
        this.stop(e)
        this.leaving = false
        if (!this.checked) this.checked = true; else return
        if (!this.isValid(e)) return
        if (!this.visible) this.show()
        return false
      case 'dragleave':
        this.leaving = true
        clearTimeout(this.timeout)
        this.timeout = setTimeout(this.onLeave.bind(this), 100, e)
        break
      case 'drop':
        ox.trigger('drag:stop', this.cid)
        this.stop(e)
        this.hide()
        return false
                // no default
    }
  },

  isSupported: _.constant(true),

  stop (e) {
    e.preventDefault()
    e.stopPropagation()
  },

  show () {
    // show dropzone
    this.visible = true
    this.$el.show()
    this.trigger('show')
    $(window).trigger('resize')
  },

  hide () {
    // hide dropzone
    this.visible = this.checked = false
    this.$el.hide().removeClass('dragover')
    this.trigger('hide')
  },

  initialize (options) {
    this.options = options
    this.checked = false
    this.visible = false
    this.leaving = false
    this.timeout = -1
    this.eventTarget = options.eventTarget
    this.folderSupport = options && options.folderSupport

    this.onDrag = this.onDrag.bind(this)
    $(document).on(EVENTS, this.onDrag)
    // firefox does not fire dragleave correct when leaving the window.
    // it also does not fire mouseevents while dragging (so mouseout does not work either)
    // use mouseenter to remove the dropzones when entering the window and nothing is dragged
    if (_.device('firefox')) {
      this.onMouseenter = this.onMouseenter.bind(this)
      $(document).on('mouseenter', this.onMouseenter)
    }

    if (this.eventTarget) {
      // check if event target is inside a different document (e.g. iframe)
      this.eventTargetDocument = this.eventTarget.prop('nodeName') === '#document' ? this.eventTarget.get(0) : this.eventTarget.prop('ownerDocument')
      if (this.eventTargetDocument !== document) $(this.eventTargetDocument).on(EVENTS, this.onDrag)

      this.onDrop = this.onDrop.bind(this)
      this.onDragenter = this.onDragenter.bind(this)
      this.onDragover = this.onDragover.bind(this)
      this.onDragleave = this.onDragleave.bind(this)
      this.eventTarget
        .on('drop', this.onDrop)
        .on('dragenter', this.onDragenter)
        .on('dragover', this.onDragover)
        .on('dragleave', this.onDragleave)
    }

    this.$el.on('dispose', function (e) { this.dispose(e) }.bind(this))
  },

  isValid (e) {
    if (!_.isFunction(this.isEnabled)) return this.isFile(e)
    return this.isEnabled(e) && this.isFile(e)
  },

  // overwrite for custom checks
  isEnabled: true,

  isFile (e) {
    const dt = e.originalEvent?.dataTransfer
    if (!dt) return false
    return _(dt.types).contains('Files') || _(dt.types).contains('application/x-moz-file')
  },

  filterDirectories (dataTransfer) {
    const def = new $.Deferred()
    const files = _(dataTransfer.files).toArray()

    // special handling for newer chrome, firefox or edge
    // check if items element is there (also needed for the e2e dropzone helper to work)
    if (dataTransfer.items && ((_.browser.Chrome && _.browser.Chrome > 21) || (_.browser.firefox && _.browser.firefox >= 50) || _.browser.edge)) {
      const items = dataTransfer.items

      def.resolve(_(files).filter(function (file, index) {
        const entry = items[index].webkitGetAsEntry()
        if (entry.isDirectory) return false

        return true
      }))
    } else {
      $.when.apply(this, _(files).map(function (file) {
        // a directory has no type and has small size
        if (!file.type && file.size <= 16384) {
          const loadFile = new $.Deferred()

          // try to read the file. if it is a folder, the result will contain an error
          const reader = new window.FileReader()
          reader.onloadend = function () {
            loadFile.resolve(reader.error)
          }
          reader.readAsDataURL(file)

          return loadFile
        }

        return $.when()
      })).done(function () {
        const args = arguments
        def.resolve(_(files).filter(function (file, index) {
          return !args[index]
        }))
      })
    }

    return def
  },

  getFiles (e) {
    const dataTransfer = e.originalEvent.dataTransfer
    const numFiles = dataTransfer.files.length // required for safari, which removes the files from that array while processing
    const filter = this.options.filter

    return this.filterDirectories(dataTransfer).then(function (files) {
      // numFiles !== null detects, when an image from inside appsuite (e.g. compose window) is dragged onto the dropzone
      if ((!files.length || numFiles !== files.length) && numFiles !== 0) {
        // #. 'display area' is the name used in the appsuite help/documentation for a zone where items can be dropped at a drag & drop operation
        yell('error', gt('Uploading folders is not supported in this display area.'))
      }

      // no regex?
      if (!_.isRegExp(filter)) return files
      // apply regex to filter valid files
      return _(files).filter(function (file) {
        return filter.test(file.name)
      })
    })
  },

  getFilesAndFolders (e) {
    const dataTransfer = e.originalEvent.dataTransfer
    const allEntriesAccumulator = []
    const droppedItems = dataTransfer.items

    // Chrome does only read 100 entries per readEntries call,
    // repeat until the buffer is empty
    function directoryItemReader (item) {
      const dirReader = item.createReader()
      const readerDef = $.Deferred()
      let allItems = []
      function readEntries () {
        // readEntries returns void, must use callbacks
        dirReader.readEntries(
          function (items) {
            if (items.length) {
              allItems = allItems.concat(items)
              // next round
              readEntries()
            } else {
              // done
              readerDef.resolve(allItems)
            }
            // error callback
          }, function (err) {
            readerDef.reject(err)
          }
        )
      }
      readEntries()
      return readerDef
    }

    function traverseTreeAndAccumulateItems (item, path) {
      // just configuration, see comment further below
      const supportEmptyFolderUpload = false
      const traverseDef = $.Deferred()

      if (item.isFile) {
        item.file(function (file) {
          allEntriesAccumulator.push({ // obj structure file
            file,
            fullPath: item.fullPath,
            preventFileUpload: false,
            isEmptyFolder: false
          })
          traverseDef.resolve()
        })
      } else if (item.isDirectory) {
        directoryItemReader(item).then(
          function (entries) {
            const entriesPromises = []
            const folderIsEmpty = entries.length === 0
            // Uploading empty folders is currently disabled. But keep the code to change it easily.
            // Reason: Uploading folders via filepicker currently (2020) doesn't support uploading empty folders,
            // so better have one consistent behavior for folder upload for the user.
            if (folderIsEmpty && supportEmptyFolderUpload) {
              allEntriesAccumulator.push({ // obj structure for empty folder
                file: {},
                fullPath: item.fullPath,
                preventFileUpload: true,
                isEmptyFolder: true
              })
              traverseDef.resolve()
            } else {
              entries.forEach(function (entry) {
                entriesPromises.push(traverseTreeAndAccumulateItems(entry, path + item.name + '/'))
              })
            }

            $.when.apply($, entriesPromises).then(function () {
              traverseDef.resolve() // hint: finished with all containing items for this folder
            }, function (err) {
              traverseDef.reject(err)
            })
          },

          function (err) {
            traverseDef.reject(err)
          }
        )
      }

      return traverseDef
    }

    const traverseAllEntriesPromises = _.map(droppedItems, function (droppedItem) {
      return traverseTreeAndAccumulateItems(droppedItem.webkitGetAsEntry(), '')
    })

    return $.when.apply($, traverseAllEntriesPromises)
      .then(
        function () {
          return allEntriesAccumulator
        }
      )
  },

  onDragenter (e) {
    // highlight dropzone
    $(e.currentTarget).parent().addClass('dragover')
  },

  onDragover (e) {
    // takes care of drop effect
    if (e.originalEvent) e.originalEvent.dataTransfer.dropEffect = 'copy'
  },

  onDragleave (e) {
    // remove highlight
    $(e.currentTarget).parent().removeClass('dragover')
  },

  // firefox only. Firefox has the strange behavior of only triggering this when no file is dragged
  // so it can be used to clear the dropzones (firefox does not trigger the dragleave event on window leave)
  onMouseenter (e) {
    if (!this.visible) return
    const from = e.relatedTarget || e.toElement
    if (!from) {
      _.delay(function () {
        this.leaving = true
        clearTimeout(this.timeout)
        this.onLeave(e)
      }.bind(this), 50)
    }
  },

  // while we can ignore document's drop event, we need this one
  // to detect that a file was dropped over the dropzone
  onDrop (e) {
    const self = this
    const def = self.folderSupport ? this.getFilesAndFolders(e) : this.getFiles(e)
    // final event when a file was dropped over the dropzone
    def.then(function success (items) {
      // this.getFiles(e).then(function success(files) {
      // call proper event
      self.trigger(items.length > 0 ? 'drop' : 'invalid', items, e)
    }, function fail () {
      self.trigger('invalid', [], e)
    })
  },

  render () {
    this.$el.hide().append(
      $('<div class="abs dropzone-caption">').text(this.options.caption || ''),
      $('<div class="abs dropzone-dragover">').append(createIcon('bi/check-lg.svg')),
      $('<div class="abs dropzone-overlay">')
    )

    return this
  },

  dispose () {
    this.stopListening()
    $(document).off(EVENTS, this.onDrag)
    if (_.device('firefox')) {
      $(document).off('mouseenter', this.onMouseenter)
    }
    if (this.eventTarget) {
      if (this.eventTargetDocument !== document) $(this.eventTargetDocument).off(EVENTS, this.onDrag)

      this.eventTarget
        .off('drop', this.onDrop)
        .off('dragenter', this.onDragenter)
        .off('dragover', this.onDragover)
        .off('dragleave', this.onDragleave)
    }
  }
})

// avoid any native drop
$(document).on('dragover drop', false)

export default {
  Inplace: InplaceDropzone
}
