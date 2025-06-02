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
import DisposableView from '@/io.ox/backbone/views/disposable'
import ox from '@/ox'
import Events from '@/io.ox/core/event'
import ext from '@/io.ox/core/extensions'
import yell from '@/io.ox/core/yell'
import folderAPI from '@/io.ox/core/folder/api'

import '@/io.ox/core/tk/upload.scss'
import gt from 'gettext'

function isFileDND (e) {
  // Learned from: http://stackoverflow.com/questions/6848043/how-do-i-detect-a-file-is-being-dragged-rather-than-a-draggable-element-on-my-pa
  return e.originalEvent && e.originalEvent.dataTransfer && (
    !_.browser.Firefox ||
            e.type === 'dragleave'
      ? e.originalEvent.dataTransfer.dropEffect === 'none'
      : e.originalEvent.dataTransfer.dropEffect !== 'none'
  ) &&
        (_(e.originalEvent.dataTransfer.types).contains('Files') || _(e.originalEvent.dataTransfer.types).contains('application/x-moz-file'))
}

const FloatingDropzone = DisposableView.extend({

  className: 'abs dropzone-overlay',

  initialize (options) {
    this.options = _.extend({ point: '', app: undefined, scrollable: '.scrollable' }, options)
    this.actions = []

    const point = ext.point(options.point)
    point.each(function (ext) {
      if (point.isEnabled(ext.id)) this.actions.push(ext)
    }.bind(this))

    // overlay toggling based on window/document events
    this.listenToDOM(document, 'dragover', this.toggleOverlay.bind(this, true))
    this.listenToDOM(document, 'dragleave drop mouseout', this.toggleOverlay.bind(this, false))
  },

  events: {
    dragenter: 'onDragEnter',
    dragover: 'onDragOver',
    dragleave: 'onDragLeave',
    drop: 'onDrop'
  },

  toggleOverlay (state, e) {
    // always hide when mouse leaves browser
    if (e.type !== 'mouseout' && this.$el.hasClass('locked')) return
    // remove jittering cursor when dragging text for example
    if (!isFileDND(e) && !this.$el.hasClass('visible')) return
    this.$el.toggleClass('visible', state).css(this.getDimensions())
  },

  getDimensions () {
    const node = this.$el.closest(this.options.scrollable)
    const top = node.scrollTop()
    const height = node.outerHeight()
    const innerheight = node.children().outerHeight()

    return {
      top,
      bottom: Math.max(0, innerheight - height - top)
    }
  },

  show () {
    this.$('.dropzone-floating').addClass('visible')
  },

  hide () {
    this.$el.removeClass('locked')
    this.$('.dropzone-floating').removeClass('visible')
  },

  render () {
    this.$el.append(
      $('<div class="abs dropzone-floating">').append(
        _.map(this.actions, function (action) {
          return $('<div class="dropzone-floating-action dropzone">')
            .attr({ 'data-id': action.id })
            .append(
              $('<span class="dndignore">').html(action.label)
            )
        })
      )
    )
    return this
  },

  onDragEnter (e) {
    // IE11 support regarding missing pointer-events support
    const target = $(e.target).hasClass('dndignore') ? $(e.target).parent() : $(e.target)
    target.addClass('hover')
    if ($(e.target).hasClass('dropzone-overlay')) {
      if (!isFileDND(e)) return
      $(e.target).addClass('locked')
      return this.show()
    }
    if (!$(e.target).hasClass('dropzone-floating')) return

    // show?
    if (!isFileDND(e) || ($('body > .io-ox-dialog-wrapper').length > 0)) return
    this.show()
  },

  onDragLeave (e) {
    // IE11 support regarding missing pointer-events support
    const target = $(e.target).hasClass('dndignore') ? $(e.target).parent() : $(e.target)
    target.removeClass('hover')
    _.defer(function () {
      if (this.disposed) return
      // are still some hovered elements left?
      if (this.$('.hover').length || this.$el.hasClass('hover')) return
      this.hide()
    }.bind(this))
  },

  onDrop (e) {
    e = e.originalEvent || e
    const files = e.dataTransfer.files
    const id = $(e.target).closest('.dropzone-floating-action').attr('data-id')
    const action = _.findWhere(this.actions, { id }); let i

    if (!action) return this.hide()

    // Fix for Bug 26235
    if (_.browser.Chrome) {
      const items = e.dataTransfer.items
      for (i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry()
        if (entry.isDirectory) {
          yell('error', gt('Uploading folders is not supported.'))
          // removeOverlay(e);
          return false
        }
      }
    }

    // extensions that gets invoked for each single file
    if (action.action) {
      _.each(files, function (file) {
        action.action.apply(action.extension, [file].concat(this.options.app))
      }.bind(this))
    }

    // extensions that gets invoked for all singles at once
    if (action.multiple) {
      action.multiple.apply(action.extension, [files].concat(this.options.app))
    }

    this.hide()
    // Prevent regular event handling
    return false
  },

  onDragOver (e) {
    e.preventDefault()
    // Prevent regular event handling
    return false
  }

})

// options should contain a list of actions. The action id will be the first parameter to the event handlers
// { actions: [
//      {id: 'action1', label: 'Some cool Action' }, { id: 'action2', label: 'Some other cool action' }
// ]}
function DropZone (options) {
  const self = this
  let highlightedAction
  let dragLeaveTimer
  const removeOverlay = function () {
    $('body').removeClass('io-ox-dropzone-active')
    $overlay.detach()
    return false
  }
  const $overlay = $('<div class="abs io-ox-dropzone-multiple-overlay">').on('click', removeOverlay)

  const showOverlay = function (e) {
    if (!isFileDND(e) || ($('body > .io-ox-dialog-wrapper').length > 0)) return
    clearTimeout(dragLeaveTimer)
    $('body').addClass('io-ox-dropzone-active').append($overlay)
    return false
  }

  const nodeGenerator = function () {
    const $actionTile = $('<div class="io-ox-dropzone-action">')
    $overlay.append($actionTile)
    return $actionTile
  }

  Events.extend(this)

  _(options.actions || []).each(function (action) {
    const $actionNode = nodeGenerator()
    $actionNode.append($('<div class="dropzone">').on({
      dragenter () {
        if (highlightedAction) highlightedAction.removeClass('io-ox-dropzone-hover')
        highlightedAction = $actionNode
        $actionNode.addClass('io-ox-dropzone-hover')
      },
      dragleave (e) {
        $actionNode.removeClass('io-ox-dropzone-hover')
      },
      drop (e) {
        e = e.originalEvent || e
        const files = e.dataTransfer.files; let i

        // And the pass them on
        if (highlightedAction) highlightedAction.removeClass('io-ox-dropzone-hover')

        // Fix for Bug 26235
        if (_.browser.Chrome && _.browser.Chrome > 21) {
          const items = e.dataTransfer.items
          for (i = 0; i < items.length; i++) {
            const entry = items[i].webkitGetAsEntry()
            if (entry.isDirectory) {
              yell('error', gt('Uploading folders is not supported.'))
              removeOverlay(e)
              return false
            }
          }
        }

        if (options.actions[0].id === 'importEML') {
          for (i = 0; i < files.length; i++) {
            const validExtensions = /(\.eml)$/i
            if (!validExtensions.test(files[i].name)) {
              yell('error', gt('Mail was not imported. Only .eml files are supported.'))
              removeOverlay(e)
              return false
            }
          }
        }

        for (i = 0; i < files.length; i++) {
          if (options.actions[0].id === 'mailAttachment') {
            self.trigger('drop', files[i])
          } else {
            self.trigger('drop', action.id, files[i], action)
          }
        }
        // cause it's instanceOf FileList
        self.trigger('drop-multiple', action, $.makeArray(files))
        removeOverlay(e)
        // Prevent regular event handling
        return false
      }
    }).append($('<span class="dndignore">').html(action.label)))
  })

  let included = false

  this.remove = function () {
    if (!included) return
    included = false
    $(document).off('dragenter', showOverlay)
      .off('drop', removeOverlay)
    $overlay.off('dragenter dragover dragend dragleave drop')
  }
  this.include = function () {
    if (included) return
    included = true
    $(document).on('dragenter', showOverlay)
    $overlay.on({
      dragenter () {
        clearTimeout(dragLeaveTimer)
        // Prevent regular event handling
        return false
      },
      dragover (e) {
        clearTimeout(dragLeaveTimer)
        e.preventDefault()
        // Prevent regular event handling
        return false
      },
      dragleave (e) {
        dragLeaveTimer = setTimeout(function () {
          removeOverlay(e)
        }, 200)
        e.stopPropagation()
      },
      drop (e) {
        e.preventDefault()
        removeOverlay(e)
        return false
      }
    })
  }
}

// And this is the duck type compatible version for browsers which don't support
// the File API. You can define this DropZone but will never hear back.
function DisabledDropZone () {
  this.enabled = false
  this.bind = $.noop
  this.unbind = $.noop
  this.remove = $.noop
  this.include = $.noop
  // Maybe add some more
}

// Next we'll need a file upload queue
// This will simply store files and drain the queue by uploading one file after another
// Events:
// "start" - When a file is being uploaded.
// "stop" - When an upload is through.
// If the delegate implements "start" and "stop" methods, those will be called as well
// The delegate must implement a "progress" method, that is called to really process the file. It is expected to return
// a promise or deferred, to tell us when we are done with a file
function FileProcessingQueue (delegate) {
  if (!delegate) {
    console.warn('No delegate supplied to file processing queue.')
  } else if (!delegate.progress) {
    console.warn('The delegate to a queue should implement a "progress" method!')
  }

  delegate = _.extend({
    start: $.noop,
    stop: $.noop,
    changed: $.noop,
    progress () { return $.when() },
    type: false
  }, delegate || {})

  Events.extend(this)

  let files = []
  let position = 0
  let processing = false

  this.next = function () {
    if (processing) {
      return
    }
    // done?
    if (files.length === 0 || files.length <= position) {
      return this.stop()
    }
    processing = true
    const self = this
    // start?
    if (position === 0) {
      this.start()
    }
    // progress! (using always() here to keep things going even on error)
    this.progress().always(function (data) {
      if (data && data.error) {
        // only handle quota exceed or too many requests error
        // OX-0023 and OX-0507 is special quota exceed error of hidrive (see Bug 51091)
        if (/^(FLS-0024|OX-0023|OX-0507)$/.test(data.code) || (data.error_params && data.error_params.length && /^429 /.test(data.error_params[0]))) {
          self.stop()
          return
        }
      }
      processing = false
      position++
      self.queueChanged()
    })
  }

  // returned deferred resolves or get's rejected with a list of error messages
  // TODO: unit test
  this.validateFiles = function (newFiles, options) {
    if (!options.folder || (delegate && delegate.type === 'importEML')) return $.when([])
    return folderAPI.get(options.folder).then(function (folder) {
      // no quota check
      if (!folderAPI.is('infostore', folder)) return $.when([])
      // quota check
      return import('@/io.ox/core/api/quota').then(({ default: quotaAPI }) => {
        return quotaAPI.checkQuota(folder, newFiles)
      })
    }).then(function (errors) {
      if (errors.length === 0) return []
      return import('@/io.ox/core/tk/upload-problems').then(function ({ default: Problems }) {
        // show dialog and return rejected deferred with error list when dialog get's closed
        return Problems.report(newFiles, errors)
      })
    }, function (err) {
      yell(err)
      return $.Deferred().reject([err])
    })
  }

  this.offer = function (file, options) {
    const self = this
    const newFiles = [].concat(file)
    this.validateFiles(newFiles, options).then(function () {
      self.fillQueue(file, options)
      self.queueChanged()
    })
  }

  this.fillQueue = function (file, options) {
    const newFiles = [].concat(file)
    _(newFiles).each(function (file) {
      files.push({ file, options })
    })
  }

  this.length = 0

  this.remove = function (index) {
    files.splice(index, 1)

    // if current file is removed, decrement position
    if (index === position) {
      position--
    }
  }

  this.queueChanged = function () {
    this.length = files.length
    delegate.changed(files[position], position, files)
    this.trigger('changed', files[position], position, files)
    this.next()
  }

  this.dump = function () {
    console.info('this', this, 'file', files[position], 'position', position, 'files', files)
  }

  this.start = function () {
    // disable autologout -> bug 29389
    ox.autoLogout.stop()
    delegate.start(files[position], position, files)
    this.trigger('start', files[position], position, files)
  }

  this.progress = function () {
    const def = delegate.progress(files[position], position, files)
    this.trigger('progress', def, files[position], position, files)
    return def
  }

  this.stop = function () {
    // reenable autologout -> bug 29389
    ox.autoLogout.start()
    delegate.stop(files[position], position, files)
    this.trigger('stop', files[position], position, files)
    files = []
    position = 0
    processing = false
  }
}

export default {

  dnd: {
    enabled: _.device('!touch'),
    createDropZone (options) {
      options = options || {}
      if (!this.enabled) {
        return new DisabledDropZone(options.node)
      }
      return new DropZone(options)
    },
    FloatingDropzone
  },

  createQueue (delegate) {
    return new FileProcessingQueue(delegate)
  }
}
