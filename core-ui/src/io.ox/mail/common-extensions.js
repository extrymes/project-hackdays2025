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

// cSpell:ignore Lesebestätigung

import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import moment from '@open-xchange/moment'
import ext from '@/io.ox/core/extensions'
import * as util from '@/io.ox/mail/util'
import api from '@/io.ox/mail/api'
import account from '@/io.ox/core/api/account'
import strings from '@/io.ox/core/strings'
import folderAPI from '@/io.ox/core/folder/api'
import yell from '@/io.ox/core/yell'
import contactsAPI from '@/io.ox/contacts/api'
import * as contactsUtil from '@/io.ox/contacts/util'
import flagPicker from '@/io.ox/core/tk/flag-picker'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import attachment from '@/io.ox/core/attachments/view'
import ActionDropdownView from '@/io.ox/backbone/views/action-dropdown'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import svg from '@/io.ox/core/svg'
import { createIcon } from '@/io.ox/core/components'

import { settings } from '@/io.ox/mail/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import gt from 'gettext'

// little helper
function isSearchResult (baton) {
  if (!baton.app?.listView?.loader) return
  return baton.app.listView.loader.mode === 'search'
}

function pictureHalo (node, data, baton) {
  // authenticity
  const maildata = baton.data.thread ? baton.data.thread[0] || baton.data : baton.data
  const status = util.authenticity('image', maildata)
  const isSpam = account.is('spam', baton.data.folder_id)

  if (status || isSpam) return node.text('!')

  // add initials
  const initials = getInitials(data)
  const color = contactsUtil.getInitialsColor(initials)
  node.append(svg.circleAvatar(initials)).addClass('initials ' + color)
  const address = _.isArray(data) ? data && data[0] && data[0][1] : data

  return contactsAPI.pictureHalo(
    node,
    { email: address },
    { width: 40, height: 40, effect: 'fadeIn', fallback: false }
  )
}

function getInitials (from) {
  if (!_.isArray(from) || !from.length) return ''
  const name = util.getDisplayName(from[0])
  return contactsUtil.getInitials({ display_name: name })
}

const extensions = {

  a11yLabel (baton) {
    const data = baton.data
    const size = api.threads.size(data)
    const fromlist = data.from || [['', '']]
    const parts = []

    if (util.isUnseen(data)) parts.push(gt('Unread'))
    if (util.isFlagged(data)) parts.push(gt('Flagged'))
    // #. Color is used as a noun
    // #. %1$s - color name, used to describe a mail that has a color flag
    if (baton.data.color_label && settings.get('features/flag/color')) parts.push(gt('Color %1$s', flagPicker.colorName(baton.data.color_label)))
    parts.push(util.getDisplayName(fromlist[0]), data.subject, util.getTime(data.date))
    if (size > 1) {
      // although "size" is greater than 1, "gt.ngettext" must be used to produce correct plural forms for some languages!
      parts.push(gt.ngettext('Thread contains %1$d message', 'Thread contains %1$d messages', size, size))
    }
    if (data.attachment) parts.push(gt('has attachments'))

    const a11yLabel = parts.join(', ') + '.'

    this.attr({
      'aria-hidden': true
    })
      .parent().attr({
        // escape that a bit; firefox has a severe XSS issue (see bug 31065)
        'aria-label': a11yLabel.replace(/["<]/g, function (match) {
          if (match === '"') return '&quot'
          if (match === '<') return '&lt;'
          return match
        })
      })
  },

  authenticity (baton) {
    const status = util.authenticity('box', baton && baton.model.toJSON())
    if (!status) return

    const section = $('<section class="authenticity">')
    const data = baton.data
    const from = data.from || []
    const mails = _.chain(from).map(function (item) {
      return String(item[1] || '').toLowerCase()
    }).compact().value().join(', ')

    section.append(
      $('<div>')
        .addClass('message ' + status.toLowerCase())
        .append(
          $('<b>').text(/(fail|suspicious)/.test(status) ? gt('Warning:') + ' ' : gt('Note:') + ' '),
          $.txt(util.getAuthenticityMessage(status, mails))
        )
    )

    this.append(section)
  },

  // show picture of sender or first recipient
  avatar (baton) {
    const node = $('<div class="avatar" aria-hidden="true">')

    // exception: always show sender in threaded messages, except if its your own mail in "Sent items" then use recipients data
    // there is no app when this is used in the halo view
    const data = baton.app?.isThreaded()
      ? baton.data.thread.filter(mail => !account.is('sent|drafts', mail.folder_id))[0]
      : baton.data

    // show initials of first recipient in "Sent items" and "Drafts"
    const searchResultFromSentOrDraft = isSearchResult(baton) && account.is('sent|drafts', data.original_folder_id)
    let addresses = (searchResultFromSentOrDraft || account.is('sent|drafts', data.folder_id) ? data.to : data.from) || []

    // if draft without recipient, use own initials
    const isDraft = account.is('drafts', data.folder_id) || account.is('drafts', data.original_folder_id)
    if (isDraft && !addresses.length) addresses = baton.data.from

    this.append(pictureHalo(node, addresses, baton))
  },

  senderPicture (baton) {
    // shows picture of sender see Bug 41023
    const addresses = baton.data.from
    const node = $('<div class="avatar" aria-hidden="true">')

    this.append(
      pictureHalo(node, addresses, baton)
    )
  },

  date (baton, options) {
    const data = baton.data; const t = data.date
    const exactDates = settings.get('exactDates', false)
    options = _.extend({ fulldate: exactDates, smart: !exactDates }, options)
    if (!_.isNumber(t)) return
    this.append(
      $('<time class="date gray">')
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

  from (baton) {
    const opt = { folder: baton.data.folder_id, field: 'from', showDisplayName: true }

    // there is no app when this is used in the halo view
    const isThreaded = baton.app?.isThreaded()
    const data = isThreaded ? baton.data.thread.filter(mail => !account.is('sent|drafts', mail.folder_id))[0] : baton.data

    // push options through fromPipeline
    _.each(extensions.fromPipeline, function (fn) { fn.call(this, baton, opt) })
    this.append(
      $('<div class="from flex-grow">').attr('title', opt.mailAddress).append(
        $('<span class="flags">'),
        util.getFrom(data, _.pick(opt, 'field', 'reorderDisplayName', 'showDisplayName', 'unescapeDisplayName'))
      )
    )
  },

  fromDetail (baton) {
    const $el = $('<div class="from">')
    const data = baton.data
    const from = util.getDeputy(data) || data.from || []
    const status = util.authenticity('icon', data)

    // from is special as we need to consider the "sender" header
    // plus making the mail address visible (see bug 56407)

    _(from).each(function (item) {
      const email = String(item[1] || '').toLowerCase()
      const name = util.getDisplayName(item)
      let $container
      if (!email) return
      $el.append(
        // Safari: tabindex attribute is needed to focus element and restore that focus when popup gets closed, see OXUIB-1843
        $container = $('<a href="#" role="button" data-detail-popup="halo" tabindex="0">')
          .data({ email, email1: email })
          .append($('<span class="sr-only">').text(gt('From:')))
          .append($('<span class="person-link person-from ellipsis">').text(name))
          .addClass((name === email && status) ? 'authenticity-sender ' + status : '')
      )

      // don't show email address on smartphones if status is pass or it's myself
      const skipEmail = _.device('smartphone') && !!name && (status === 'pass' || account.is('sent', data.folder_id))
      const showEmailAddress = name !== email && !skipEmail

      if (showEmailAddress) {
        $container.append(
          $('<span class="address">')
            .text('<' + email + '>')
            .addClass(status ? 'authenticity-sender ' + status : '')
        )
      }

      if (status) {
        $container.append(
          $('<span data-toggle="popover" data-container="body" class="authenticity">').attr('aria-label', util.getAuthenticityMessage(status, email)).popover({
            placement: _.device('smartphone') ? 'auto' : 'right',
            trigger: 'focus hover',
            content: util.getAuthenticityMessage(status, email)
          })
            .append(
              createIcon((function () {
                if (/(pass|trusted)/.test(status)) return 'bi/check.svg'
                if (/(fail|suspicious)/.test(status)) return 'bi/exclamation-triangle.svg'
                return 'bi/question.svg'
              }())).addClass(status ? 'authenticity-icon-' + status : '')
            )
        )
      }

      // save space on mobile by showing address only for suspicious mails
      if (_.device('smartphone') && name.indexOf('@') > -1) $el.addClass('show-address')
    })

    $el.append('<div class="spacer">')

    this.append($el)
  },

  fromPipeline: {
    // field: from vs. to
    field (baton, opt) {
      if (baton.data.threadSize > 1) return
      if (account.is('sent|drafts', opt.folder)) opt.field = 'to'
    },
    // field: from vs. to
    fieldSearch (baton, opt) {
      if (!isSearchResult(baton)) return
      opt.field = account.is('sent|drafts', baton.data.original_folder_id) ? 'to' : 'from'
    },
    // showDisplayName, reorderDisplayName and unescapeDisplayName
    displayName (baton, opt) {
      opt.reorderDisplayName = opt.unescapeDisplayName = (baton.options.sort !== 'from-to')
      if (baton.options.sort !== 'from-to') return
      // get folder data to check capabilities:
      // if bit 4096 is set, the server sorts by display name; if unset, it sorts by local part.
      const capabilities = folderAPI.pool.getModel(opt.folder).get('capabilities') || 0
      opt.showDisplayName = !!(capabilities & 4096)
    },
    // mailAddress
    address (baton, opt) {
      opt.mailAddress = util.getFrom(baton.data, { field: opt.field, showDisplayName: false }).text()
    }
  },

  size (baton) {
    // show size if option is enabled or sorting by size
    if (baton.app && (baton.app.props.get('sort') !== 608 && !settings.get('alwaysShowSize'))) return

    const data = baton.data
    if (!_.isNumber(data.size)) return
    const size = util.threadFileSize(data.thread || [data])
    this.append(
      $('<span class="size gray">').text(strings.fileSize(size, 1))
    )
  },

  unreadClass (baton) {
    const isUnseen = util.isUnseen(baton.data)
    this.closest('.list-item').toggleClass('unread', isUnseen)
  },

  deleted (baton) {
    this.parent().toggleClass('deleted', util.isDeleted(baton.data))
  },

  colorflag (baton) {
    if (!settings.flagByColor) return
    const isThreaded = (baton.options.threaded || baton.app?.isThreaded()) && !!baton.data.thread
    const colors = util.getColors(isThreaded ? baton.data.thread : [baton.data])
    this.append(
      colors.map(color => createIcon('bi/flag-fill.svg').addClass('color-flag flag_' + color))
    )
  },

  flag (baton) {
    if (!settings.flagByStar) return
    if (!util.isFlagged(baton.data)) return
    this.append($('<span class="flag">').append(
      extensions.flagIcon.call(this).attr('title', gt('Flagged'))
    ))
  },

  flagIcon () {
    // icon is set via css
    return createIcon('bi/star-fill.svg')
  },

  // list view
  flaggedClass (baton) {
    if (!settings.flagByStar) return
    this.closest('.list-item').toggleClass('flagged', util.isFlagged(baton.data))
  },

  flagToggle: (function () {
    function makeAccessible (data, index, node) {
      const label = util.isFlagged(data) ? gt('Flagged') : gt('Not flagged')
      $(node).attr('aria-label', label).find('.fa').attr('title', label)
    }

    function update (e) {
      e.preventDefault()
      const data = e.data.model.toJSON()
      // toggle 'flagged' bit
      if (util.isFlagged(data)) api.flag(data, false); else api.flag(data, true)
    }

    function toggle (view, model) {
      const toggleElement = view.$('a.flag.io-ox-action-link')
      makeAccessible(model.toJSON(), undefined, toggleElement)
    }

    return function (baton) {
      if (!settings.flagByStar) return
      if (util.isEmbedded(baton.data)) return
      const self = this

      baton.view.listenTo(baton.view.model, 'change:flags', _.partial(toggle, baton.view))

      folderAPI.get(baton.data.folder_id).done(function (data) {
        // see if the user is allowed to modify the flag status - always allows for unified folder
        if (!folderAPI.can('write', data) || folderAPI.is('unifiedfolder', data)) return
        self.on('click', { model: baton.view.model }, update).append(
          $('<a href="#" role="button" class="flag io-ox-action-link" data-action="flag">')
            .append(extensions.flagIcon.call(this))
            .each(_.partial(makeAccessible, baton.data))
        )
      })
    }
  }()),

  threadSize (baton) {
    // only consider thread-size if app is in thread-mode
    const isThreaded = baton.app?.isThreaded()
    // seems that threaded option is used for tests only
    if (!isThreaded && !baton.options.threaded) return

    const size = api.threads.size(baton.data)
    if (size <= 1) return

    this.append(
      $('<div class="thread-size" aria-hidden="true">').append(
        $('<span class="number drag-count">').text(size)
      )
    )
  },

  paperClip (baton) {
    if (!baton.data.attachment) return
    this.append(createIcon('bi/paperclip.svg').addClass('has-attachments'))
  },

  sharedattachment () {
    // the extra header has an performance impact, see (https://jira.open-xchange.com/browse/DOP-2955)
    /* if (!baton.model || !_.has(baton.model.get('headers'), 'X-Open-Xchange-Share-URL')) return
    this.append(
      createIcon('bi/cloud-download.svg').addClass('bi-12 is-shared-attachment')
    ) */
  },

  pgp: {
    encrypted (baton) {
      // simple check for encrypted mail
      if (!/^multipart\/encrypted/.test(baton.data.content_type) &&
        !(baton.model.get('security') && baton.model.get('security').decrypted)) return
      this.append(createIcon('bi/lock.svg').addClass('encrypted'))
    },
    signed (baton) {
      // simple check for signed mail
      if (!/^multipart\/signed/.test(baton.data.content_type) &&
        !(baton.model.get('security') && baton.model.get('security').signatures)) return
      this.append(createIcon('bi/pencil-square.svg').addClass('signed'))
    }
  },

  priority (baton) {
    const node = util.getPriority(baton.data)
    if (!node.length) return
    this.append(
      $('<span class="priority" aria-hidden="true">').append(node)
    )
  },

  unseenIndicator () {
    return createIcon('bi/circle-fill.svg').addClass('seen-unseen-indicator').appendTo(this)
  },

  unread (baton) {
    const isUnseen = util.isUnseen(baton.data)
    if (isUnseen) extensions.unseenIndicator.call(this).attr('title', gt('Unread'))
  },

  answered (baton) {
    const data = baton.data
    const cid = _.cid(data)
    const thread = api.threads.get(cid)
    const isAnswered = util.isAnswered(thread, data)
    if (isAnswered) this.append(createIcon('bi/reply.svg').addClass('icon-answered'))
  },

  forwarded (baton) {
    const data = baton.data
    const cid = _.cid(data)
    const thread = api.threads.get(cid)
    const isForwarded = util.isForwarded(thread, data)
    if (isForwarded) this.append(createIcon('bi/forward.svg').addClass('icon-forwarded'))
  },

  subject (baton) {
    const data = baton.data
    const keepPrefix = baton.data.threadSize === 1
    const subject = util.getSubject(data, keepPrefix)

    this.append(
      $('<div class="subject flex-grow" role="presentation">').append(
        $('<span class="flags" role="presentation">'),
        $('<span class="drag-title" role="presentation">').text(subject).attr('title', subject)
      )
    )
  },

  // a11y: set title attribute on outer list item
  title (baton) {
    const subject = util.getSubject(baton.data)
    this.closest('.list-item').attr('title', subject)
  },

  // used in unified inbox
  account (baton) {
    if (!account.isUnifiedFolder(baton.data.folder_id)) return
    this.append(
      $('<span class="account-name">').text(baton.data.account_name || '')
    )
  },

  // empty message for list view
  empty (baton) {
    const isSearch = !!baton.app?.props.get('searching')
    const file = isSearch ? 'empty-search' : 'empty-folder'
    this.attr('role', 'option').empty().append(
      $.svg({ src: `themes/default/illustrations/${file}.svg`, width: 200, height: 96, role: 'presentation' })
        .addClass('illustration'),
      $('<div>').text(
        isSearch ? gt('No search results') : gt('This folder is empty')
      )
    )
  },

  // add original folder as label to search result items
  folder (baton) {
    // missing data
    if (!baton.data.original_folder_id) return
    const folder = baton.app?.folder?.get()
    const isUnseenFolder = folder === 'virtual/all-unseen'
    const isFlaggedFolder = folder === api.allFlaggedMessagesFolder
    // apply only for search results and for unseen folder
    if (!isSearchResult(baton) && !isUnseenFolder && !isFlaggedFolder) return
    this.append($('<span class="original-folder">').append(folderAPI.getTextNode(baton.data.original_folder_id)))
  },

  recipients: (function () {
    const showAllRecipients = function (e) {
      e.preventDefault()
      $(this).parent().children().show()
      $(this).hide()
    }

    return function (baton) {
      const data = { ...baton.data }
      // figure out if 'to' just contains myself - might be a mailing list, for example
      const showCC = data.cc && data.cc.length > 0
      const showTO = data.to && data.to.length > 0
      const showBCC = data.bcc && data.bcc.length > 0
      const showReplyTo = data.reply_to && data.reply_to.length > 0
      const show = showTO || showCC || showBCC || showReplyTo
      const container = $('<div class="recipients">')

      // fix broken layout when mail has only 'to' and 'attachments'
      if (!show) return this.append(container.append($.txt('\u00A0')))

      if (showTO) {
        container.append(
          // TO
          $('<span class="io-ox-label">').append(
            $.txt(gt('To')),
            $.txt('\u00A0\u00A0')
          ),
          util.serializeList(data, 'to'),
          $.txt(' \u00A0 ')
        )
      }
      if (showCC) {
        container.append(
          // CC
          $('<span class="io-ox-label">').append(
            $.txt(gt.pgettext('CC', 'Copy')),
            '\u00A0\u00A0'
          ),
          util.serializeList(data, 'cc'),
          $.txt(' \u00A0 ')
        )
      }
      if (showBCC) {
        container.append(
          // BCC
          $('<span class="io-ox-label">').append(
            $.txt(gt('Blind copy')),
            '\u00A0\u00A0'
          ),
          util.serializeList(data, 'bcc'),
          $.txt(' \u00A0 ')
        )
      }
      if (showReplyTo) {
        container.append(
          // BCC
          $('<span class="io-ox-label">').append(
            $.txt(gt('Reply To')),
            '\u00A0\u00A0'
          ),
          util.serializeList(data, 'reply_to'),
          $.txt(' \u00A0 ')
        )
      }

      this.append(container)

      const items = container.find('.person-link')
      if (items.length > 3) {
        container.children().slice(4).hide()
        container.append(
          // #. %1$d - number of other recipients (names will be shown if string is clicked)
          $('<a role="button" href="#" class="show-all-recipients">').text(gt('and %1$d others', items.length - 2))
            .on('click', showAllRecipients)
        )
      }
    }
  }()),

  attachmentList: (function attachmentList () {
    let CustomAttachmentView
    const renderContent = function () {
      const title = this.model.getShortTitle().split(/\.(?=[^.]+$)/)
      const data = this.model.toJSON()

      // eslint-disable-next-line no-new
      new ActionDropdownView({
        backdrop: true,
        caret: false,
        data,
        el: this.$('.filename'),
        point: 'io.ox/mail/attachment/links',
        title: this.model.getShortTitle(),
        list: this.model.collection.toJSON()
      })

      // support ellipsis: replace button text with div
      this.$el.find('button').attr('data-filename', this.model.getShortTitle()).empty().append(
        $('<div class="filename">').append(
          $('<span class="base">').text(title[0] + '.'),
          $('<span class="extension">').text(title[1])
        )
      )

      this.$el.find('button')[0].addEventListener('focus', event => {
        this.$el.focus()
      })

      const url = api.getUrl(data, 'download')
      const contentType = (this.model.get('content_type') || 'unknown').split(/;/)[0]

      this.$el.attr({
        title: this.model.getTitle(),
        draggable: true,
        'data-downloadurl': contentType + ':' + this.model.getTitle().replace(/:/g, '') + ':' + ox.abs + url
      })
        .on('dragstart', function (e) {
          $(this).css({ display: 'inline-block' })
          e.originalEvent.dataTransfer.setData('DownloadURL', this.dataset.downloadurl)
        })

      // previews for documents etc have a different style
      if (contentType && !(/^image\//).test(contentType)) this.$el.addClass('no-image')
    }

    return function (baton) {
      if (baton.attachments.length === 0) return $.when()
      // ensure there's a model when reading headers
      const headers = baton.model ? baton.model.get('headers') : baton.data.headers || {}
      // hide attachments for our own share invitations
      if (headers['X-Open-Xchange-Share-Type']) this.hide()

      const $el = this

      _.once(function () {
        CustomAttachmentView = attachment.View.extend({
          renderContent
        })
      })()

      const list = baton.attachments.map(function (m) {
        m.group = 'mail'
        return m
      })
      const collection = new attachment.Collection(list)
      const reuse = !!$el.data('view')
      const view = $el.data('view') || new attachment.List({
        AttachmentView: CustomAttachmentView,
        collection,
        el: $el,
        mode: settings.get('attachments/layout/detail/' + _.display(), 'list')
      })
      view.openByDefault = settings.get('attachments/layout/detail/open', view.openByDefault)

      view.$header.empty()
      view.render()

      // add attachment actions
      const toolbarView = new ToolbarView({
        el: view.$header.find('.links')[0],
        inline: true,
        simple: true,
        dropdown: false,
        strict: false,
        point: 'io.ox/mail/attachment/links'
      })

      view.renderInlineLinks = function () {
        const models = this.getValidModels()
        if (!models.length) return
        toolbarView.setSelection(_(models).pluck('id'), { data: _(models).invoke('toJSON') })
      }

      view.listenTo(view.collection, 'add remove reset', view.renderInlineLinks)
      view.listenTo(baton.model, 'change:imipMail', view.renderInlineLinks)
      view.listenTo(baton.model, 'change:sharingMail', view.renderInlineLinks)
      view.renderInlineLinks()

      if (!reuse) {
        view.$el.on('click', 'li.attachment', function (e) {
          const node = $(e.currentTarget)
          const clickTarget = $(e.target); let id; let data

          // skip if click was on the dropdown
          if (clickTarget.hasClass('dropdown-toggle')) return
          if (clickTarget.closest('.dropdown-toggle').length) return

          // get data
          id = node.attr('data-id')
          data = collection.get(id).toJSON()

          // start viewer in general (see bug 65016)
          id = node.attr('data-id')
          data = collection.get(id).toJSON()
          const baton = ext.Baton({ simple: true, data, list, restoreFocus: clickTarget, openedBy: 'io.ox/mail/details' })
          actionsUtil.invoke('io.ox/mail/attachment/actions/view', baton)
        })

        view.on('change:layout', function (mode) {
          settings.set('attachments/layout/detail/' + _.display(), mode).save()
        })
      }

      // A11y: Fixup roles
      view.$el.find('[role="toolbar"]').find('a[role="menuitem"]').attr('role', 'button')
      return view
    }
  }()),

  flagPicker (baton) {
    if (!settings.flagByColor) return
    flagPicker.draw(this, baton)
  },

  unreadIndicator (baton) {
    if (util.isEmbedded(baton.data)) return
    const self = this

    folderAPI.get(baton.data.folder_id).done(function (data) {
      // see if the user is allowed to modify the read/unread status
      // always allows for unified folder
      const showUnreadIndicator = folderAPI.can('write', data) || folderAPI.is('unifiedfolder', data)
      if (!showUnreadIndicator) return
      self.append(
        $('<span class="unread-toggle">')
          .attr('aria-label', gt('Marked as unread'))
          .append(createIcon('bi/circle.svg'))
      )
    })
  },

  unreadToggle: (function () {
    function makeAccessible (data, index, node) {
      const label = util.isUnseen(data) ? gt('Mark as read') : gt('Mark as unread')
      $(node).attr({ 'aria-label': label })
        .find('.fa').attr('title', label)
    }

    function update (e) {
      e.preventDefault()
      const data = e.data.model.toJSON()
      // toggle 'unseen' bit
      if (util.isUnseen(data)) api.markRead(data); else api.markUnread(data)
    }

    function toggle (view, model) {
      const toggleElement = view.$('a.unread-toggle')
      makeAccessible(model.toJSON(), undefined, toggleElement)
    }

    return function (baton) {
      if (util.isEmbedded(baton.data)) return
      const self = this

      baton.view.listenTo(baton.view.model, 'change:flags', _.partial(toggle, baton.view))

      folderAPI.get(baton.data.folder_id).done(function (data) {
        // see if the user is allowed to modify the read/unread status
        // always allows for unified folder
        const showUnreadToggle = folderAPI.can('write', data) || folderAPI.is('unifiedfolder', data)
        if (!showUnreadToggle) return
        self.append(
          $('<a href="#" role="button" class="unread-toggle io-ox-action-link" data-action="unread-toggle">')
            .append(createIcon('bi/circle.svg'), createIcon('bi/circle-fill.svg'))
            .each(_.partial(makeAccessible, baton.data))
            .on('click', { model: baton.view.model }, update)
        )
      })
    }
  }()),

  disabledLinks: (function () {
    function disableExt (view, point, ext) {
      view.options.disable = view.options.disable || {}
      const value = view.options.disable[point]
      if (_.isString(value)) view.options.disable[point] = [].concat(value)
      view.options.disable[point] = (view.options.disable[point] || []).concat(ext)
    }

    function loadLinks (e) {
      e.preventDefault()
      const view = e.data.view
      view.trigger('load')
      view.$el.find('.disabled-links').remove()
      disableExt(view, 'io.ox/mail/detail/source', 'disable-links')
      disableExt(view, 'io.ox/mail/detail/content-general', 'disable-links')
      disableExt(view, 'io.ox/mail/detail/notifications', 'disabled-links')
      view.redraw()
    }

    function draw () {
      // hint: initially hidden unless article has content-links class
      this.append(
        $('<div class="notification-item disabled-links">').append(
          $('<button type="button" class="btn btn-default btn-sm">').text(gt('Enable Links')),
          $('<div class="comment">').text(gt('Links have been disabled to protect you against potential spam')),
          $('<button type="button" class="close">').attr('title', gt('Close'))
            .append(createIcon('bi/x.svg'))
        )
      )
    }

    return function (baton) {
      // malicious mails are filtered by middleware already
      if (!util.authenticity('block', baton.data) || util.isMalicious(baton.data)) return
      draw.call(this, baton.model)
      this.on('click', '.disabled-links > .btn-default', { view: baton.view }, loadLinks)
      this.on('click', '.disabled-links > .close', function (e) {
        $(e.target).closest('.disabled-links').remove()
      })
    }
  }()),

  externalImages: (function () {
    function loadImages (e, threadViewModel) {
      e.preventDefault()
      const view = e.data.view
      view.trigger('load')
      view.$el.find('.external-images').remove()
      // get unmodified mail
      api.getUnmodified(view.model.pick('id', 'folder', 'folder_id', 'parent', 'security')).done(function (data) {
        view.trigger('load:done')
        view.model.set(data)
        // helps toolbars with checking if external images should be sanitized in mail compose or not
        if (threadViewModel) threadViewModel.hasBlockedExternalImages = false
      })
      return false
    }

    function draw (model) {
      const modified = model.get('modified') || 0
      const from = model.get('from') || []
      const email = Array.isArray(from[0]) ? from[0][1] : gt('Unknown sender')
      const isConfigurable = coreSettings.isConfigurable('features/trusted/user')
      const url = 'api/mail?' + $.param({
        action: 'get',
        view: 'document',
        forceImages: true,
        folder: model.get('folder_id'),
        id: model.get('id'),
        session: ox.session
      })
      switch (modified) {
        case 0:
          // nothing to do, return here and remove potential button
          return this.find('.external-images').remove()
        case 1:
          // external images were blocked, show button and info
          this.append(
            $('<div class="notification-item external-images">').append(
              $('<button type="button" class="btn btn-default btn-sm">').text(gt('Show images')),
              $('<div class="comment">').append(
                $('<div class="bold">').text(gt('External images are not shown to avoid potential tracking')),
                isConfigurable && $('<a href="#" class="always-show-images-from">').text(gt('Always show images from %s', email))
              ),
              $(`<button type="button" class="close" title="${gt('Close')}">`)
                .append(createIcon('bi/x.svg'))
            ))
          break

        case 2:
          // external images with http src were rewritten to https, show info
          this.append(
            $('<div class="notification-item external-images">').append(
              $('<div class="comment">').append(
                $('<div>').text(gt('External images in this email use an insecure connection. Those images were automatically adjusted to enforce a secure connection (https). Some images might not be shown.')),
                $('<a>').attr('href', url).attr('target', '_blank').text(gt('Open original email in new browser tab.'))
              ),
              $(`<button type="button" class="close" title="${gt('Close')}">`)
                .append(createIcon('bi/x.svg'))
            ))
      }
    }

    return function (baton) {
      const threadViewModel = baton.view.options.threadview ? baton.view.options.threadview.collection.get(baton.model.id) : false
      // helps toolbars with checking if external images should be sanitized in mail compose or not
      if (threadViewModel) threadViewModel.hasBlockedExternalImages = baton.model.get('modified') === 1

      draw.call(this, baton.model)

      function showImages (e) {
        ext.point('io.ox/mail/externalImages')
          .cascade(this, baton)
          .then(() => { loadImages(e, threadViewModel) })
      }
      function close (e) {
        $(e.target).closest('.external-images').remove()
      }
      function allwaysShowImages (e) {
        e.preventDefault()
        const email = baton.model.get('from')[0][1]
        const trustedMails = settings.get('features/trusted/user', '') + '\n' + email
        settings.set('features/trusted/user', trustedMails.trim()).save()
        showImages(e)
      }

      this.on('click', '.external-images > .btn-default', { view: baton.view }, showImages)
      this.on('click', '.external-images > .close', close)
      this.on('click', '.external-images .always-show-images-from', { view: baton.view }, allwaysShowImages)

      baton.view.listenTo(baton.model, 'change:modified', draw.bind(this))
    }
  }()),

  phishing: (function () {
    const headers = _(settings.get('phishing/headers', ['phishing-test']))

    function draw (model) {
      // avoid duplicates
      if (this.find('.phishing').length) return

      _(model.get('headers')).find(function (value, name) {
        if (headers.contains(name)) {
          this.append(
            $('<div class="alert alert-error phishing">')
              .text(gt('Warning: This message might be a phishing or scam mail'))
          )
          return true
        }
        return false
      }, this)
    }

    return function (baton) {
      draw.call(this, baton.model)
      baton.view.listenTo(baton.model, 'change:headers', draw.bind(this))
    }
  }()),

  plainTextFallback: (function () {
    function draw (model) {
      // avoid duplicates
      if (this.find('.warnings').length) return

      if (model.get('warnings')) {
        this.append(
          $('<div class="alert alert-error warnings">')
            .text(model.get('warnings').error)
        )
      }
    }

    return function (baton) {
      draw.call(this, baton.model)
      baton.view.listenTo(baton.model, 'change:warnings', draw.bind(this))
    }
  }()),

  dispositionNotification: (function () {
    const skip = {}

    function returnReceipt (e) {
      e.preventDefault()
      const view = e.data.view
      const obj = _.cid(view.model.cid)
      view.model.set('disp_notification_to', '')
      skip[view.model.cid] = true
      api.ack({ folder: obj.folder_id, id: obj.id, to: e.data.model.get('to') }).done(function () {
        yell(
          'success',
          // #. read receipt; German "Lesebestätigung"
          gt('A read receipt has been sent')
        )
      })
    }

    function cancel (e) {
      e.preventDefault()
      // add to skip hash
      const view = e.data.view
      skip[view.model.cid] = true
    }

    function draw (model) {
      this.find('.disposition-notification').remove()

      // skip? (canceled or already returned)
      if (skip[model.cid]) return
      // has proper attribute? (only available if message was unseen on fetch)
      if (!util.hasUnsentReadReceipt(model.toJSON())) return
      // user does not ignore this feature?
      if (!settings.get('sendDispositionNotification', false)) return
      // is not in drafts folder?
      if (account.is('drafts', model.get('folder_id'))) return

      this.append(
        $('<div class="alert alert-info disposition-notification notification-item">').append(
          // #. Respond to a read receipt request; German "Lesebestätigung senden"
          $('<button type="button" class="btn btn-primary btn-sm">').text(gt('Send a read receipt')),
          $('<div class="comment">').text(gt('The sender wants to get notified when you have read this email')),
          $('<button type="button" class="close" data-dismiss="alert">').attr('title', gt('Close'))
            .append(createIcon('bi/x.svg'))
        )
      )
    }

    return function (baton) {
      draw.call(this, baton.model)
      this.on('click', '.disposition-notification .btn', { view: baton.view, model: baton.model }, returnReceipt)
      this.on('click', '.disposition-notification .close', { view: baton.view, model: baton.model }, cancel)
      baton.view.listenTo(baton.model, 'change:disp_notification_to', draw.bind(this))
    }
  }())
}

export default extensions
