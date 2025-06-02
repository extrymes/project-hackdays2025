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
import api from '@/io.ox/core/folder/api'
import ext from '@/io.ox/core/extensions'
import account from '@/io.ox/core/api/account'
import { createIcon } from '@/io.ox/core/components'
import { getMailFolderIcon } from '@/io.ox/mail/util'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

/**
 * Return the folder ID of the model.
 */
function getFolderId (model) {
  // model.get('id') is needed for the drive favorite folders
  return model.id || model.attributes?.id
}

const TreeNodeView = DisposableView.extend({

  tagName: 'li',
  className: 'folder selectable',

  // indentation in px per level
  indentation: _.device('smartphone') ? 12 : 16,

  events: {
    'click .folder-options': 'onOptions',
    'click .folder-arrow': 'onArrowClick',
    'dblclick .folder-label': 'onToggle',
    'mousedown .folder-arrow': 'onArrowMousedown',
    keydown: 'onKeydown'
  },

  addA11yDescription (str) {
    this.options.a11yDescription.push(str)
    this.options.a11yDescription = _.uniq(this.options.a11yDescription)
    this.renderTooltip()
  },

  getA11yDescription () {
    if (_.isEmpty(this.options.a11yDescription)) return ''
    return '. ' + this.options.a11yDescription.join('.')
  },

  list () {
    const o = this.options
    return api.list(o.model_id, { all: o.tree.all })
  },

  reset () {
    if (this.isReset) return this.trigger('reset')
    if (this.collection.fetched) this.onReset(); else this.list()
  },

  getFilter () {
    const o = this.options
    const context = o.filter ? this : o.tree
    const fn = o.filter || o.tree.filter
    return fn.bind(context, o.model_id)
  },

  onReset () {
    const o = this.options
    const models = this.collection.filter(this.getFilter())
    const isFavoriteRootFolder = this.model.get('id').indexOf('virtual/favorites') === 0
    const exists = {}
    // recycle existing nodes / use detach to keep events
    this.$.subfolders.children().each(function () {
      exists[$(this).attr('data-id')] = $(this).detach().data('view')
    })

    // append nodes
    this.$.subfolders.append(
      models.filter(function (model) {
        // favorites are kinda special. They may contain unsubscribed folders (we don't remove them from favorites, so they show up as favorites again when they are resubscribed)
        if (isFavoriteRootFolder) {
          return !!model.get('subscribed')
        }
        return true
      }).map(function (model) {
        return (exists[getFolderId(model)] || this.getTreeNode(model).render()).$el
      }, this)
    )

    // see bug 37373
    // This was caused by the filter method of the unified-folders extensionpoint which sets "subfolder = false" for the folder 1 model.
    // Since this folder always has subfolders this is skipped.
    if (this.folder !== '1' && this.folder !== 'default0') this.modelSetSubfolders(models.length > 0)
    this.renderEmpty()

    // trigger events
    this.$.subfolders.children().each(function () {
      const view = $(this).data('view')
      if (!view || exists[view.folder]) return
      o.tree.appear(view)
    })

    this.isReset = true
    this.trigger('reset')
  },

  onAdd (model) {
    // filter first
    if (!this.getFilter()(model)) {
      this.renderEmpty()
      return
    }
    // add
    const node = this.getTreeNode(model)
    this.$.subfolders.append(node.render().$el)
    this.options.tree.appear(node)
    this.modelSetSubfolders(true)
    this.renderEmpty()
  },

  onRemove (model) {
    this.$.subfolders.children(`[data-id="${CSS.escape(getFolderId(model))}"]`).remove()
    // we do not update models if the DOM is empty! (see bug 43754)
    this.renderEmpty()
  },

  // respond to changed id
  onChangeId (model) {
    const id = String(model.get('id'))
    const previous = String(model.previous('id'))
    const selection = this.options.tree.selection
    const selected = selection.get()
    // update other ID attributes
    if (this.folder === previous) this.folder = id
    if (this.options.model_id === previous) this.options.model_id = id
    if (this.options.contextmenu_id === previous) this.options.contextmenu_id = id
    // update DOM
    this.renderAttributes()
    // trigger selection change event
    if (previous === selected) this.options.tree.trigger('change', id)
    // close sub-folders
    this.options.open = false
    // update collection
    if (this.collection) {
      // remove old listeners
      this.stopListening(this.collection)
      this.stopListening(api, 'create:' + String(previous).replace(/\s/g, '_'))

      // change collection
      this.collection = api.pool.getCollection(id)

      // add new listeners
      this.listenTo(this.collection, {
        add: this.onAdd,
        remove: this.onRemove,
        'change:subscribed': this.onReset,
        reset: this.onReset,
        sort: this.onSort
      })
      this.listenTo(api, 'create:' + String(id).replace(/\s/g, '_'), function () {
        this.open = true
        this.onChangeSubFolders()
      })

      this.isReset = false
      this.reset()
    }
    this.onChangeSubFolders()
  },

  // re-render on any attribute change
  onChange (model) {
    if (model.changed.title !== undefined) this.renderFolderLabel()

    if (model.changed.id !== undefined) {
      this.onChangeId(model)
    }

    if (model.changed.subfolders) {
      // close if no more subfolders
      if (!model.changed.subfolders) this.open = false
      this.onChangeSubFolders()
    }

    this.repaint()
  },

  toggle (state, autoOpen) {
    // for whatever reason, this.options might be nulled (see bug 37483)
    if (this.options === null) return
    const isChange = (this.options.open !== state)
    this.options.open = state
    this.onChangeSubFolders()
    this.renderCounter()
    if (!isChange) return
    this.options.tree.trigger(state ? 'open' : 'close', this.folder, autoOpen)
  },

  // open/close folder
  onToggle (e) {
    if (e.isDefaultPrevented()) return
    e.preventDefault()
    this.toggle(!this.options.open)
  },

  isOpen () {
    return this.options.open && this.hasSubFolders()
  },

  hasArrow () {
    return this.$.arrow.find('svg').length !== 0
  },

  onArrowClick (e) {
    if (!$(e.target).closest(this.$.arrow).length || !this.hasArrow()) {
      e.preventDefault()
      return
    }
    // mobile fix (OXUIB-1046): prevents opening folder instead of only toggling
    e.stopPropagation()
    this.onToggle(e)
  },

  onArrowMousedown (e) {
    // just to avoid changing the focus (see bug 35802)
    // but only if the folder shows the arrow (see bug 36424)
    if (!$(e.target).closest(this.$.arrow).length) return
    if (!this.hasArrow()) return
    e.preventDefault()
  },

  onOptions (e) {
    e.preventDefault()
  },

  // utility functions
  hasSubFolders () {
    const isFlat = /^virtual\/flat/.test(this.folder)
    return this.options.subfolders && (isFlat || this.modelGetSubfolders() === true)
  },

  modelGetSubfolders () {
    return this.model.get(this.options.tree.all ? 'subfolders' : 'subscr_subflds')
  },

  modelSetSubfolders (value) {
    return this.model.set(this.options.tree.all ? 'subfolders' : 'subscr_subflds', value)
  },

  // respond to new sub-folders
  onChangeSubFolders () {
    // has subfolders?
    const hasSubFolders = this.hasSubFolders()
    const isOpen = this.isOpen()
    this.$.arrow.toggleClass('invisible', !hasSubFolders)
    if (hasSubFolders) {
      const icon = isOpen ? 'bi/chevron-down.svg' : 'bi/chevron-right.svg'
      this.$.arrow.empty().append(createIcon(icon).addClass('xs'))
    }
    // draw open or closed folder icon
    if (this.$.foldericon.find('svg.default').length !== 0) {
      this.$.foldericon.empty().append(isOpen ? createIcon('bi/folder2-open.svg').addClass('default') : createIcon('bi/folder.svg').addClass('default'))
    }
    // a11y
    if (hasSubFolders && !this.options.headless) this.$el.attr('aria-expanded', isOpen); else this.$el.removeAttr('aria-expanded')
    // toggle subfolder node
    this.$el.toggleClass('open', isOpen)
    // empty?
    this.renderEmpty()
    // fetch sub-folders
    if (isOpen) this.reset()
  },

  // respond to cursor left/right
  onKeydown (e) {
    // already processed or not cursor right/left, enter or space
    if (e.isDefaultPrevented() || !/^(13|32|37|39)$/.test(e.which)) return

    e.preventDefault()
    // skip cursor right, space and enter unless folder has subfolders
    if (!this.hasSubFolders() && /^(13|32|39)$/.test(e.which)) return
    const o = this.options

    // enter and space on virtual folders
    if (/^(13|32)$/.test(e.which) && this.isVirtual) this.toggle(!o.open)

    // cursor right
    else if (e.which === 39) {
      if (!o.open && e.which === 39) this.toggle(true) // open subfolders if subfolders are closed
      else this.$el.find('ul.subfolders:first > li:first-child').trigger('click') // select first subfolder if folder has subfolder and subfolders are open

      // cursor left
    } else if (e.which === 37) {
      if (o.open) this.toggle(false) // close folder with subfolders
      else if (o.indent && o.level >= 0) o.parent.$el.trigger('click') // move up one folder (parent)
    }
  },

  // get a new TreeNode instance
  getTreeNode (model) {
    const modelId = getFolderId(model)
    const o = this.options
    const level = o.headless || o.indent === false || o.section ? o.level : o.level + 1
    const namespace = o.namespace || o.folder.indexOf('virtual/favorites') === 0 ? 'favorite' : ''
    const options = { folder: modelId, icons: o.icons, level, tree: o.tree, parent: this, namespace }
    if (modelId.includes('cal://0/resource')) options.contextmenu = 'resource-folder'
    return new TreeNodeView(o.tree.getTreeNodeOptions(options, model))
  },

  functions () {
    // functions that use debounce or throttle must be defined
    // per instance, not on prototype level. otherwise all instances
    // share the inner timers (side-effects and evil debugging)

    this.onSort = _.debounce(function () {
      if (this.disposed) return

      // check
      if (!this.$) return

      const hash = {}

      // recycle existing nodes
      this.$.subfolders.children().each(function () {
        hash[$(this).attr('data-id')] = $(this)
      })

      // reinsert nodes according to order in collection
      this.$.subfolders.append(
        this.collection.map(function (model) {
          return hash[getFolderId(model)]
        })
      )
    }, 10)

    this.repaint = _.throttle(function () {
      if (this.disposed) return
      if (this.model !== null) this.render()
    }, 10)
  },

  initialize (options) {
    this.functions()

    // make sure we work with strings
    this.folder = String(options.folder)

    const o = this.options = _.extend({
      arrow: true, // show folder arrow
      count: undefined, // use custom counter
      empty: true, // show if empty, i.e. no subfolders?
      headless: false, // show folder row? root folder usually hidden
      icon: undefined, // use custom icon class
      icons: false, // show folder icons
      indent: true, // indent subfolders, i.e. increase level by 1
      level: 0, // nesting / left padding
      model_id: this.folder, // use this id to load model data and subfolders
      namespace: '', // used for unique ids for open/close state of favorites
      contextmenu_id: this.folder, // use this id for the context menu
      open: false, // state
      section: false,
      sortable: false, // sortable via alt-cursor-up/down
      subfolders: true, // load/avoid subfolders
      title: '', // custom title
      a11yDescription: [] // content for aria-description tag
    }, options)

    // also set: folder, parent, tree
    this.model = api.pool.getModel(o.model_id)
    this.noSelect = !this.model.can('read') && !/^flat\/event\/resources/.test(o.model_id)
    this.isVirtual = this.options.virtual || /^(default0\/)?virtual/.test(this.folder) || this.folder === 'cal://0/allPublic'

    this.collection = api.pool.getCollection(o.model_id, o.tree.all)
    this.isReset = false
    this.realNames = options.tree.realNames
    this.id = _.uniqueId(o.tree.id + '-node-')
    this.$ = {}

    // make accessible via DOM
    this.$el.data('view', this)

    // inherit "open"
    if (_(o.tree.open).contains((o.namespace ? o.namespace + ':' : '') + this.folder)) o.open = true
    // collection changes
    if (o.subfolders) {
      this.listenTo(this.collection, {
        add: this.onAdd,
        remove: this.onRemove,
        'change:subscribed': this.onReset,
        reset: this.onReset,
        sort: this.onSort
      })
      // respond to newly created folders
      this.listenTo(api, 'create:' + String(o.model_id).replace(/\s/g, '_'), function () {
        this.open = true
        this.onChangeSubFolders()
      })
    }

    // model changes
    this.listenTo(this.model, {
      change: this.onChange,
      'change:subfolders': this.onChangeSubFolders,
      destroy: this.destroy.bind(this)
    })

    let offset = 0
    if (o.tree.options.highlightclass === 'visible-selection-smartphone') {
      // cannot be done in css because dynamic padding-left is applied
      // using a margin would result in unclickable area and no selection background-color on the left side
      offset = 22
    }

    // draw scaffold
    this.$el
      .attr({
        id: this.id,
        'data-id': this.folder,
        'data-model': o.model_id,
        'data-contextmenu-id': o.contextmenu_id,
        'data-namespace': o.namespace,
        role: 'treeitem',
        'aria-label': this.getTitle()
      })
      .toggleClass('section', o.section)
      .append(
        this.$.selectable = $('<div class="folder-node" aria-hidden="true">').css('padding-inline-start', (o.level * this.indentation) + offset).append(
          this.$.arrow = o.arrow ? $('<div class="folder-arrow invisible">') : [],
          this.$.foldericon = $('<div class="folder-icon">'),
          this.$.label = $('<div class="folder-label truncate">').text(this.getTitle()),
          this.$.counter = $('<div class="folder-counter">'),
          this.$.buttons = $('<div class="folder-buttons">')
        ),
        // subfolders
        this.$.subfolders = $('<ul class="subfolders" role="group">')
      )

    // headless?
    if (o.headless) {
      this.$el.removeClass('selectable')
      this.$.selectable.remove()
    } else {
      this.$el.attr({
        'aria-selected': false,
        tabindex: '-1'
      })
    }

    // sortable
    if (o.sortable) this.$el.attr('data-sortable', true)

    if (this.noSelect && o.level > 0) this.$el.addClass('no-select')
    if (this.isVirtual) this.$el.addClass('virtual')

    // add contextmenu (only if 'app' is defined; should not appear in modal dialogs, for example)
    if ((!this.isVirtual || o.contextmenu) && o.tree.options.contextmenu && o.tree.app) {
      if (!this.isVirtual || _.device('smartphone') || this.model.get('id').includes('flat/event/resource')) this.renderContextControl()
      else this.renderPermanentContextControl()
    }

    // get data
    if (!this.isVirtual) api.get(o.model_id)

    // fetch subfolders if not open but "empty" is false
    // or if it's a virtual folder and we're not sure if it has subfolders
    if ((o.empty === false && o.open === false) || this.isVirtual) this.reset()

    // run through some custom callbacks
    const data = this.model.toJSON(); const baton = ext.Baton({ view: this, data })

    // allow extensions
    ext.point('io.ox/core/foldertree/node').invoke('initialize', this.$el, baton)

    // simple tree-based customize callback
    o.tree.options.customize.call(this.$el, baton)

    // simple tree-based disable callback
    if (o.tree.options.disable(data, o)) this.$el.addClass('disabled')

    // register for 'dispose' event (using inline function to make this testable via spyOn)
    this.$el.on('dispose', this.remove.bind(this))
    // needed to avoid zombie listeners
    o.tree.once('dispose', this.remove.bind(this))
  },

  getCounter () {
    // draft folder and flagged should how total instead of unread
    const type = account.getType(this.folder)
    const showTotal = type === 'drafts' || type === 'flagged'
    if (showTotal) return this.model.get('total') || 0
    if (this.options.count !== undefined) return this.options.count
    // show number of unread subfolder items only when folder is closed
    const subtotal = (!this.options.open && this.options.subfolders && this.model.get('subtotal')) || 0
    return (this.model.get('unread') || 0) + subtotal
  },

  showStatusIcon (message, event, data, overwrite) {
    const self = this

    // some events are more important, so they should be able to overwrite previous ones (Oauth account error vs associated mail account error, for example)
    if (overwrite) this.hideStatusIcon()

    if (this.$.accountLink) {
      if (message) this.$.accountLink.attr('title', message)
      return
    }

    this.$.selectable.append(
      this.$.accountLink = $('<a href="#" class="account-link">')
        .attr('data-id', this.options.model_id)
        .append(createIcon('bi/exclamation-triangle.svg'))
    )

    this.$.accountLink.on('click', function (e) {
      e.preventDefault()
      self.options.tree.trigger(event, data)
    })
    if (message) {
      this.$.accountLink.attr('title', message)
    }
  },

  hideStatusIcon () {
    if (this.$.accountLink) {
      this.$.accountLink.remove()
      this.$.accountLink = null
    }
  },

  renderCounter () {
    let value = this.getCounter()
    this.$.selectable.toggleClass('show-counter', value > 0)
    if (value > 999) value = '999+'
    this.$.counter.text(value === 0 ? '' : value)
  },

  getTitle () {
    let title = this.model.get('display_title') || this.options.title || this.model.getTitle() || ''
    // domain suffix for federated sharing
    const indicateFederatedShare = this.model.is('drive') && (this.model.get('folder_id') === '10' || this.model.get('folder_id') === '15') && this.model.is('federated-sharing')
    if (indicateFederatedShare) {
      const suffix = this.model.getAccountDisplayName()
      title = suffix ? title + ' (' + suffix + ')' : title
    }
    return (this.realNames === true ? this.model.get('folder_name') || title : title)
  },

  renderTooltip () {
    // don't overwrite custom title
    if (this.options.title && !this.model.changed.title) return
    if (!this.model.getTitle()) return
    let summary = []; let a11ySummary = []

    if (this.model.supports('count_total') || this.model.id === 'default0/virtual/flagged') {
      let data = this.model.toJSON()
      // wrong counts for unified root folder
      if (account.isUnifiedRoot(this.model.get('id'))) data = _.pick(data, 'title')
      if (_.isNumber(data.total) && data.total >= 0) {
        // #. Used for the total count of objects or mails in a folder
        summary.push(gt('Total: %1$d', data.total))
        if (data.total > 0) a11ySummary.push(gt('%1$d total', data.total))
      }
      if (_.isNumber(data.unread) && data.unread >= 0) {
        // #. Used for the count of unread mails in a folder
        summary.push(gt('Unread: %1$d', data.unread))
        if (data.unread > 0) a11ySummary.push(gt('%1$d unread', data.unread))
      }
      summary = summary.join(', ')
      a11ySummary = a11ySummary.reverse().join(', ')
    }
    // unseen folder do not have a total count, but unread count
    if (this.model.id === 'virtual/all-unseen') {
      summary = gt('Total: %1$d', this.model.get('unread') || 0)
      a11ySummary = gt('%1$d total', this.model.get('unread') || 0)
    }
    if (summary.length) summary = ' (' + summary + ')'
    if (a11ySummary.length) a11ySummary = ', ' + a11ySummary + '. '
    this.$el.attr('aria-label', this.getTitle() + a11ySummary + this.getA11yDescription())
    this.$.selectable.attr('title', this.getTitle() + summary)
  },

  renderContextControl () {
    // store contextmenu type in main node
    if (_.device('smartphone')) {
      this.$el.attr('data-contextmenu', this.options.contextmenu || 'default')
      return
    }
    this.$el.attr('aria-haspopup', true)
    const folderName = this.getTitle()
    const title = !folderName
      ? gt('Folder-specific actions')
      // #. %1$s is the name of the folder
      : gt('Actions for %1$s', folderName)
    this.$.selectable.append(
      $('<button type="button" class="btn-unstyled folder-options contextmenu-control actions" tabindex="-1" data-toggle="dropdown">')
        .append($('<div>').append(createIcon('bi/three-dots.svg')).attr({ title }))
        .attr({
          'data-contextmenu': this.options.contextmenu || 'default',
          'aria-label': title
        })
    )
  },

  renderPermanentContextControl () {
    const title = gt('Folder-specific actions')
    this.$el.attr('aria-haspopup', true)
    this.$.selectable.append(
      $('<button type="button" class="contextmenu-control" tabindex="-1" data-toggle="dropdown">')
        .append($('<div>').append(createIcon('bi/plus.svg')).attr({ title }))
        .attr({
          'data-contextmenu': this.options.contextmenu || 'default',
          'aria-label': title
        })
    )
  },

  renderFolderLabel () {
    this.options.title = this.model.getTitle()
    this.$.label.text(this.options.title)

    const title = !this.options.title
      ? gt('Folder-specific actions')
      : gt('Actions for %1$s', this.options.title)

    this.$.selectable.find('.contextmenu-control').attr({ 'aria-label': title }).find('div').attr({ title })
  },

  renderAttributes () {
    this.$el.attr({
      'data-id': this.folder,
      'data-model': this.options.model_id,
      'data-contextmenu-id': this.options.contextmenu_id,
      'data-favorite': this.options.inFavorites
    })
  },

  isEmpty () {
    return this.$.subfolders.children().length === 0
  },

  renderEmpty () {
    if (this.options.empty !== false) return
    // only show if not empty, i.e. has subfolder
    this.$el.toggleClass('empty', this.isEmpty())

    // show favorites tree node if only files exists in favorites
    if (this.model.get('id') === 'virtual/favorites/infostore') {
      this.$el.toggleClass('show-anyway', !!this.collection.length)
    }
  },

  renderIcon () {
    const o = this.options
    let icon = o.icon || (_.isString(o.icons) && o.icons)
    // section
    if (o.section) {
      this.$.foldericon.hide()
      return
    }
    if ((o.tree.module !== 'infostore' && !o.icons) || !/^(mail|infostore|notes|settings)$/.test(o.tree.module)) return
    // mail
    if (!icon && o.tree.module === 'mail') {
      icon = getMailFolderIcon(this.folder, this.model)
    }
    // special folders
    if (!icon) {
      const infostoreDefaultFolder = String(api.getDefaultFolder('infostore'))
      const attachmentView = settings.get('folder/mailattachments', {})
      const allAttachmentsFolder = String(attachmentView.all)
      switch (this.folder) {
        case 'virtual/myshares':
          icon = 'bi/share.svg'
          break
        case 'virtual/favorites/infostore':
          icon = 'bi/star.svg'
          break
        case 'virtual/files/recent':
          icon = 'bi/clock.svg'
          break
        case 'virtual/files/shares':
          icon = 'bi/share.svg'
          break
        case allAttachmentsFolder:
          icon = 'bi/paperclip.svg'
          break
        case infostoreDefaultFolder:
          icon = 'bi/person.svg'
          break
      }
    }
    // trash
    if (!icon && api.is('trash', this.model.attributes) && this.model.get('standard_folder')) {
      icon = 'bi/trash.svg'
    }
    const $icon = icon instanceof $ ? icon : createIcon(icon || 'bi/folder.svg')
    this.$.foldericon.empty().addClass('visible').append($icon)
  },

  render () {
    this.renderAttributes()
    this.renderEmpty()
    this.renderTooltip()
    this.renderCounter()
    this.renderIcon()
    this.onChangeSubFolders()
    if (this.model) {
      this.$.buttons.empty()
      ext.point('io.ox/core/foldertree/node').invoke('draw', this.$el, ext.Baton({ view: this, data: this.model.toJSON() }))
      return this
    }
  },

  destroy () {
    // get parent first
    const parent = this.options.parent
    // remove from DOM now (will trigger this.remove)
    this.$el.remove()
    // check siblings now
    if (parent.renderEmpty) parent.renderEmpty()
  },

  remove () {
    this.stopListening()
    this.collection = this.model = this.options = this.$ = null
  }
})

export default TreeNodeView
