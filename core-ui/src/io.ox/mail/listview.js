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
import extensions from '@/io.ox/mail/common-extensions'
import ext from '@/io.ox/core/extensions'
import * as util from '@/io.ox/mail/util'
import api from '@/io.ox/mail/api'
import ListView from '@/io.ox/core/tk/list'
import Contextmenu from '@/io.ox/core/tk/list-contextmenu'
import folderAPI from '@/io.ox/core/folder/api'
import { settings } from '@/io.ox/mail/settings'
import '@/io.ox/mail/view-options'
import '@/io.ox/mail/style.scss'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

function fixThreadSize (data) {
  if ('threadSize' in data) return
  data.threadSize = Math.max(1, _(data.thread).reduce(function (sum, data) {
    return sum + (util.isDeleted(data) ? 0 : 1)
  }, 0))
}

// if the most recent mail in a thread is deleted remove that data and use the data of the first undeleted mail instead
function removeDeletedMailThreadData (data) {
  // most recent mail is not deleted
  if (!util.isDeleted(data)) return

  const firstUndeletedMail = _(data.thread).findWhere(function (mail) {
    return !util.isDeleted(mail)
  })
  // seems there is no undeleted mail
  if (!firstUndeletedMail) return

  data = _.extend(data, firstUndeletedMail)
}

ext.point('io.ox/mail/listview/item').extend(
  {
    id: 'default',
    index: 100,
    draw (baton) {
      // fix missing threadSize (apparently only used by tests)
      fixThreadSize(baton.data)

      removeDeletedMailThreadData(baton.data)
      if (!baton.app) {
        ext.point('io.ox/mail/listview/item/default').invoke('draw', this, baton)
        return
      }

      const layout = baton.app.props.get('layout')
      const isSmall = layout === 'horizontal' || layout === 'list'

      this.closest('.list-item').toggleClass('small', isSmall)
      ext.point('io.ox/mail/listview/item/' + (isSmall ? 'small' : 'default')).invoke('draw', this, baton)
    }
  },
  {
    id: 'a11y',
    index: 200,
    draw: extensions.a11yLabel
  }
)

/* small */

ext.point('io.ox/mail/listview/item/small').extend(
  {
    id: 'unread',
    index: 110,
    draw: extensions.unreadClass
  },
  {
    id: 'flagged',
    index: 115,
    draw: extensions.flaggedClass
  },
  {
    id: 'deleted',
    index: 120,
    draw: extensions.deleted
  },
  {
    id: 'col1',
    index: 100,
    draw (baton) {
      const column = $('<div class="list-item-column column-1">')
      extensions.unseenIndicator.call(column, baton)
      if (baton.app && baton.app.props.get('showAvatars')) extensions.avatar.call(column, baton)
      this.append(column)
    }
  },
  {
    id: 'col2',
    index: 200,
    draw (baton) {
      const column = $('<div class="list-item-column column-2">')
      extensions.paperClip.call(column, baton)
      this.append(column)
    }
  },
  {
    id: 'col3',
    index: 300,
    draw (baton) {
      const column = $('<div class="list-item-column column-3">')
      extensions.priority.call(column, baton)
      this.append(column)
    }
  },
  {
    id: 'col4',
    index: 400,
    draw (baton) {
      const column = $('<div class="list-item-column column-4">')
      ext.point('io.ox/mail/listview/item/small/col4').invoke('draw', column, baton)
      this.append(column)
    }
  },
  {
    id: 'col5',
    index: 500,
    draw (baton) {
      const column = $('<div class="list-item-column column-5">')
      extensions.answered.call(column, baton)
      if (column.children().length === 0) {
        // horizontal view: only show forwarded icon if answered flag not set
        extensions.forwarded.call(column, baton)
      }
      this.append(column)
    }
  },
  {
    id: 'col6',
    index: 600,
    draw (baton) {
      const column = $('<div class="list-item-column column-6">')
      ext.point('io.ox/mail/listview/item/small/col6').invoke('draw', column, baton)
      this.append(column)
    }
  },
  {
    id: 'col7',
    index: 700,
    draw (baton) {
      const column = $('<div class="list-item-column column-7">')
      ext.point('io.ox/mail/listview/item/small/col7').invoke('draw', column, baton)
      this.append(column)
    }
  }
)

ext.point('io.ox/mail/listview/item/small/col4').extend({
  id: 'from',
  index: 100,
  draw: extensions.from
})

ext.point('io.ox/mail/listview/item/small/col6').extend(
  {
    id: 'account',
    index: 100,
    draw: extensions.account
  },
  {
    id: 'original-folder',
    index: 150,
    draw: extensions.folder
  },
  {
    id: 'flag',
    index: 200,
    draw: extensions.flag
  },
  {
    id: 'optionalSize',
    index: 250,
    draw: extensions.size
  },
  {
    id: 'thread-size',
    index: 300,
    draw: extensions.threadSize
  },
  {
    id: 'shared-attachment',
    index: 450,
    draw: extensions.sharedattachment
  },
  {
    id: 'colorflag',
    index: 200,
    draw: extensions.colorflag
  },
  {
    id: 'pgp-encrypted',
    index: 600,
    draw: extensions.pgp.encrypted
  },
  {
    id: 'pgp-signed',
    index: 600,
    draw: extensions.pgp.signed
  },
  {
    id: 'subject',
    index: 1000,
    draw: extensions.subject
  },
  {
    id: 'text-preview',
    index: 1100,
    draw (baton) {
      this.append(
        $('<span class="text-preview inline gray">').text(baton.data.text_preview || '')
      )
    }
  }
)

ext.point('io.ox/mail/listview/item/small/col7').extend({
  id: 'date',
  index: 100,
  draw: extensions.date
})

/* default */

ext.point('io.ox/mail/listview/item/default').extend(
  {
    id: 'avatar',
    before: 'row1',
    draw (baton) {
      if (baton.app && baton.app.props.get('showAvatars')) {
        extensions.avatar.call(this, baton)
      }
    }
  },
  {
    id: 'unseen',
    before: 'row1',
    draw: extensions.unread
  },
  {
    id: 'row1',
    index: 100,
    draw (baton) {
      const row = $('<div class="list-item-row flex-row">')
      ext.point('io.ox/mail/listview/item/default/row1').invoke('draw', row, baton)
      this.append(row)
    }
  },
  {
    id: 'unread',
    index: 110,
    draw: extensions.unreadClass
  },
  {
    id: 'flagged',
    index: 115,
    draw: extensions.flaggedClass
  },
  {
    id: 'deleted',
    index: 120,
    draw: extensions.deleted
  },
  {
    id: 'row2',
    index: 200,
    draw (baton) {
      const row = $('<div class="list-item-row flex-row">')
      ext.point('io.ox/mail/listview/item/default/row2').invoke('draw', row, baton)
      this.append(row)
    }
  },
  {
    id: 'row3',
    index: 300,
    draw (baton) {
      if (!baton.app || !baton.app.useTextPreview) return
      const row = $('<div class="list-item-row">')
      ext.point('io.ox/mail/listview/item/default/row3').invoke('draw', row, baton)
      this.append(row)
    }
  }
)

ext.point('io.ox/mail/listview/item/default/row1').extend(
  {
    id: 'from',
    index: 100,
    draw: extensions.from
  },
  {
    id: 'date',
    index: 300,
    draw: extensions.date
  }
)

ext.point('io.ox/mail/listview/item/default/row2').extend(
  {
    id: 'subject',
    index: 100,
    draw (baton) {
      extensions.subject.call(this, baton)
      const node = this.find('.flags')
      extensions.answered.call(node, baton)
      extensions.forwarded.call(node, baton)
    }
  },
  {
    id: 'paper-clip',
    index: 200,
    draw: extensions.paperClip
  },
  {
    id: 'shared-attachment',
    index: 210,
    draw: extensions.sharedattachment
  },
  {
    id: 'pgp-encrypted',
    index: 300,
    draw: extensions.pgp.encrypted
  },
  {
    id: 'pgp-signed',
    index: 310,
    draw: extensions.pgp.signed
  },
  {
    id: 'colorflag',
    index: 400,
    draw: extensions.colorflag
  },
  {
    id: 'flag',
    index: 410,
    draw: extensions.flag
  },
  {
    id: 'priority',
    index: 500,
    draw: extensions.priority
  },
  {
    id: 'thread-size',
    index: 600,
    draw: extensions.threadSize
  },
  {
    id: 'optionalSize',
    index: 700,
    draw: extensions.size
  },
  {
    id: 'account',
    index: 800,
    draw: extensions.account
  },
  {
    id: 'original-folder',
    index: 900,
    draw: extensions.folder
  }
)

ext.point('io.ox/mail/listview/item/default/row3').extend(
  {
    id: 'text-preview',
    index: 100,
    draw (baton) {
      this.append(
        $('<div class="text-preview multiline gray">').text(baton.data.text_preview || '')
      )
    }
  }
)

ext.point('io.ox/mail/listview/notification/empty').extend({
  id: 'default',
  index: 100,
  draw: extensions.empty
})

ext.point('io.ox/mail/listview/notification/error').extend({
  id: 'default',
  index: 100,
  draw (baton) {
    function retry (e) {
      e.data.baton.listView.load()
    }

    this.append(
      createIcon('bi/exclamation-diamond.svg'),
      $.txt(gt('Error: Failed to load messages')),
      $('<button type="button" class="btn btn-link">')
        .text(gt('Retry'))
        .on('click', { baton }, retry)
    )
    // trigger event to count a user facing error
    ox.trigger('yell:error', baton.error)
  }
})

const MailListView = ListView.extend(Contextmenu).extend({

  ref: 'io.ox/mail/listview',

  initialize (options) {
    ListView.prototype.initialize.call(this, options)
    this.$el.addClass('mail-item')
    this.on('collection:load', this.lookForUnseenMessage)
    this.$el.on('click mousedown', '.selectable .seen-unseen-indicator', this.markRead.bind(this))

    // recent mails for tracking "recent attachments" on new mail composition
    this.recentMails = []
    this.on('selection:change', ([selection]) => {
      if (!selection) return
      const limit = 3
      const thread = api.threads.get(selection)

      this.recentMails = this.recentMails.filter(recentMail => !(recentMail.id === thread[0].id && recentMail.folder === thread[0].folder_id))
      if (thread[0] && thread[0].attachment) this.recentMails.push({ id: thread[0].id, folder: thread[0].folder_id })
      if (this.recentMails.length > limit) this.recentMails.shift()
    })

    // track some states
    if (options && options.app) {
      const props = options.app.props
      _.extend(this.options, props.pick('thread', 'sort'))
      this.listenTo(props, 'change:sort', function (model, value) {
        this.options.sort = value
      })
    }

    this.$el.on('scrollend', this.fetchTextPreview.bind(this))
    this.on('collection:load collection:reload', this.fetchTextPreview)
    if (this.selection) {
      this.selection.resolve = function () {
        return api.resolve(this.get(), this.view.app.isThreaded())
      }
    }
  },

  fetchTextPreview () {
    if (!this.app) return
    if (!this.app.useTextPreview()) return

    const top = this.el.scrollTop
    const bottom = top + this.el.offsetHeight
    const itemHeight = this.getItems().outerHeight()
    const start = Math.floor(0, top / itemHeight)
    const stop = Math.ceil(bottom / itemHeight)
    let models = this.collection.slice(start, stop)
    const ids = []

    // get models inside viewport that have no text preview yet
    models = _(models).filter(function (model) {
      const data = _(api.threads.get(model.cid)).first()
      const lacksPreview = data && !data.text_preview
      // no need to request models that actually have no preview again and again (empty mails)
      if (lacksPreview && !model.hasNoPreview) ids.push(_(data).pick('id', 'folder_id'))
      return lacksPreview
    })

    if (!ids.length) return

    api.fetchTextPreview(ids).done(function (hash) {
      _(models).each(function (model) {
        const msg = _(api.threads.get(model.cid)).first(); const cid = _.cid(msg)
        model.set('text_preview', hash[cid])
        // if a model has no preview mark it in the model, so we don't request it again all the time someone scrolls
        // don't mark it as part of the attributes to avoid triggering change events and reloading stuff (refresh does still work)
        if (hash[cid] === '') model.hasNoPreview = true
      })
    })
  },

  lookForUnseenMessage () {
    if (!this.collection.length) return

    // let's take the first folder_id we see
    const folderId = this.collection.at(0).get('folder_id')

    // run over entre collection to get number of unseen messages
    const unseen = this.collection.reduce(function (sum, model) {
      return sum + util.isUnseen(model.get('flags')) ? 1 : 0
    }, 0)

    // use this number only to set the minimum (there might be more due to pagination)
    folderAPI.setUnseenMinimum(folderId, unseen)
  },

  markRead (e) {
    const cid = $(e.currentTarget).closest('.selectable').data('cid')
    const thread = api.threads.get(cid)
    const isUnseen = _(thread).reduce(function (memo, item) {
      return memo || util.isUnseen(item)
    }, false)

    if (isUnseen) {
      api.markRead(thread)
    } else {
      api.markUnread(thread)
    }

    e.preventDefault()
    e.stopPropagation()
  },

  reprocessThread (model) {
    // get full thread objects (instead of cids)
    const threadlist = api.threads.get(model.cid)

    // return to avoid runtime errors if we have no thread data (see OXUI-304)
    if (!threadlist.length) return

    // return if thread is up to date
    if (!model.get('thread') || threadlist.length === model.get('thread').length) return

    // remove head property to avoid accidentally using old date when processThreadMessage
    _.each(threadlist, function (item) {
      delete item.head
    })

    // generate updated data object (similar to server response structure)
    const obj = _.extend(model.toJSON(), threadlist[0], {
      thread: threadlist,
      threadSize: threadlist.length
    })

    // do the thread hokey-pokey-dance
    api.processThreadMessage(obj)

    // update model silently
    model.set(obj, { silent: true })
  },

  map (model) {
    // only used when in thread mode
    if (!(this.app && this.app.isThreaded())) return model.toJSON()

    // in case thread property has changed (e.g. latest mail of thread deleted)
    this.reprocessThread(model)

    // use head data for list view
    const data = api.threads.head(model.toJSON())
    // get thread with recent data
    const thread = api.threads.get(model.cid)

    // get unseen flag for entire thread
    const unseen = _(thread).reduce(function (memo, obj) {
      return memo || util.isUnseen(obj)
    }, false)
    data.flags = unseen ? data.flags & ~32 : data.flags | 32
    // get flagged flag for entire thread
    const flagged = settings.flagByStar && _(thread).reduce((memo, item) => {
      return memo || util.isFlagged(item)
    }, false)
    data.flags = flagged ? data.flags | 8 : data.flags & ~8
    // get color_label for entire thread
    const color = settings.flagByColor && _(thread).reduce((memo, item) => {
      return memo || util.getColor(item)
    }, 0)
    data.color_label = color || 0
    data.thread = _.isArray(data.thread)
      ? thread.map((entry, index) => _(entry).pick(_(data.thread[index]).keys()))
      : [Object.assign({}, data)]
    // set subject to first message in thread so a Thread has a constant subject
    data.subject = api.threads.subject(data) || data.subject || ''
    // done
    return data
  },

  getCompositeKey (model) {
    // seems that threaded option is used for tests only
    return this.options.threaded ? 'thread.' + model.cid : model.cid
  },

  getContextMenuData (selection) {
    return this.app.getContextualData(selection)
  }
})

export default MailListView
