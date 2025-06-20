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
import api from '@/io.ox/contacts/api'
import * as util from '@/io.ox/core/util'
import folderAPI from '@/io.ox/core/folder/api'
import capabilities from '@/io.ox/core/capabilities'
import ext from '@/io.ox/core/extensions'
import { createIcon } from '@/io.ox/core/components'

import '@/io.ox/participants/style.scss'
import gt from 'gettext'

const TYPE_LABELS = {
  0: gt('Unknown'),
  1: '',
  2: gt('Group'),
  3: gt('Resource'),
  4: gt('Resource group'),
  5: capabilities.has('gab') ? gt('External contact') : '',
  6: gt('Distribution list')
}
const TYPE_IMAGES = {
  0: 'default-image',
  1: 'contact-image',
  2: 'group-image',
  3: 'resource-image',
  4: 'resource-image',
  5: 'external-user-image',
  6: 'group-image'
}

export const ParticipantEntryView = Backbone.View.extend({

  tagName: 'div',

  className: 'participant-wrapper',

  events: {
    'click .remove': 'onRemove',
    keydown: 'fnKey'
  },

  options: {
    halo: false,
    closeButton: false,
    field: false,
    customize: $.noop
  },

  nodes: {},

  initialize (options) {
    this.options = $.extend({}, this.options, options || {})
    this.listenTo(this.model, 'change', function (model) {
      if (!model || !model.changed) return
      this.$el.empty()
      this.render()
      // make sure lazyload wakes up after updates (there is a debounce on it anyhow)
      $(window).trigger('resize.lazyload')
    })
    this.listenTo(this.model, 'remove', function () {
      this.remove()
    })
  },

  render () {
    this.$el.append(
      this.nodes.$img = $('<div>'),
      this.nodes.$text = $('<div class="participant-name">'),
      this.options.hideMail ? '' : $('<div class="participant-email">').append(this.nodes.$mail = this.options.halo ? $('<a>') : $('<span>')),
      this.options.hideMail ? '' : $('<div class="extra-decorator">').append(this.nodes.$extra = $('<span>')),
      $('<a href="#" class="remove" role="button">').append(
        $('<div class="icon">').append(
          createIcon('bi/trash.svg').attr('title', gt('Remove contact') + ' ' + this.model.getDisplayName()),
          $('<span class="sr-only">').text(gt('Remove contact') + ' ' + this.model.getDisplayName())
        )
      )
    ).attr({ 'data-cid': this.model.cid }).toggleClass('removable', this.options.closeButton)
    this.setCustomImage()
    this.setDisplayName()
    this.setTypeStyle()
    this.options.customize.call(this)
    ext.point('io.ox/participants/view').invoke('render', this.$el, new ext.Baton({ view: this, model: this.model }))
    this.trigger('render')
    return this
  },

  setDisplayName () {
    const options = {
      $el: this.nodes.$text
    }
    if (this.options.asHtml) {
      options.html = this.model.getDisplayName({ asHtml: true, isMail: this.options.isMail })
    } else {
      options.name = this.model.getDisplayName({ asHtml: false, isMail: this.options.isMail })
    }
    util.renderPersonalName(options, this.model.toJSON())
  },

  setCustomImage () {
    const data = this.model.toJSON()
    // fix to work with picture halo (model uses email address as id)
    if (data.type === 5) delete data.id
    api.pictureHalo(
      this.nodes.$img,
      data,
      { width: 54, height: 54 }
    )
    this.nodes.$img.attr('aria-hidden', true).addClass('avatar participant-image ' + (TYPE_IMAGES[parseInt(this.model.get('type'), 10)] || ''))
  },

  setRows (mail, extra) {
    if (!this.options.hideMail) {
      extra = extra || TYPE_LABELS[this.model.get('type')] || ''
      this.nodes.$mail.text(mail)
      this.nodes.$extra.text(extra)
      if (mail && extra) {
        this.$el.addClass('three-rows')
      }
    }
  },

  isOrganizer () {
    if (!this.options.baton) return false
    const appointment = this.options.baton.model.toJSON()
    if (!appointment.organizerId) return false
    return this.model.get('id') === appointment.organizerId
  },

  isRemovable () {
    if (!this.options.baton) return false
    const appointment = this.options.baton.model.toJSON()
    // participants can be removed unless they are organizer
    if (this.model.get('id') !== appointment.organizerId) return true
    // special case: organizer can be removed from public folders
    return folderAPI.pool.getModel(appointment.folder_id).is('public')
  },

  setTypeStyle () {
    let mail = this.model.getTarget({ strict: this.options.strict })
    let extra = null

    if (mail && this.options.field && this.model.getFieldString()) {
      mail += ' (' + this.model.getFieldString() + ')'
    }

    switch (this.model.get('type')) {
      case 1:
      case 5:
        // set organizer
        if (this.isOrganizer()) {
          extra = gt('Organizer')
          // don't remove organizer
          if (!this.isRemovable()) this.$el.removeClass('removable')
        }

        if (mail && this.options.halo) {
          this.nodes.$mail
            .attr({ href: 'mailto:' + mail, 'data-detail-popup': 'halo' })
            .data({ email1: mail })
        }
        break
      case 3:
        if (this.options.halo && !this.options.hideMail) {
          const data = this.model.toJSON()
          data.callbacks = {}
          if (this.options.baton && this.options.baton.callbacks) {
            data.callbacks = this.options.baton.callbacks
          }
          const link = $('<a href="#" data-detail-popup="resource">').data(data)
          this.nodes.$extra.replaceWith(link)
          this.nodes.$extra = link
        }
        break
                // no default
    }

    this.setRows(mail, extra)
  },

  fnKey (e) {
    // del or backspace
    if (e.which === 46 || e.which === 8) this.onRemove(e)
  },

  onRemove (e) {
    e.preventDefault()
    // remove from collection
    this.model.collection.remove(this.model)
  }
})

const UserContainer = Backbone.View.extend({

  tagName: 'div',

  className: 'participantsrow col-xs-12',

  initialize (options) {
    this.options = _.extend({
      empty: gt('This list has no participants yet')
    }, options)
    this.listenTo(this.collection, 'add', function (model) {
      this.renderLabel()
      this.renderEmptyLabel()
      this.renderParticipant(model)
    })
    this.listenTo(this.collection, 'remove', function () {
      this.renderLabel()
      this.renderEmptyLabel()
    })
    this.listenTo(this.collection, 'reset', function () {
      this.$ul.empty()
      this.renderAll()
    })
    this.$empty = $('<li>').text(this.options.empty)
    // duck typing
    if (this.options.baton) return
    this.isDistributionList = this.options.baton.model.has('mark_as_distributionlist')
  },

  render () {
    this.$el.append(
      $('<fieldset>').append(
        $('<legend>').addClass(this.options.labelClass || ''),
        this.$ul = $('<ul class="list-unstyled">')
      )
    )
    this.renderAll()
    return this
  },

  renderLabel () {
    const count = this.collection.length
    const label = this.options.label || (this.isDistributionList ? gt('Members (%1$d)', count) : gt('Participants (%1$d)', count))
    this.$('fieldset > legend').text(label)
  },

  renderParticipant (participant) {
    const view = new ParticipantEntryView({
      tagName: 'li',
      model: participant,
      baton: this.options.baton,
      halo: this.options.halo !== undefined ? this.options.halo : true,
      closeButton: true,
      hideMail: this.options.hideMail,
      asHtml: this.options.asHtml,
      isMail: this.options.isMail,
      strict: this.options.strict
    })

    view.on('render', function () {
      this.collection.trigger('render')
    }.bind(this))

    view.render().$el.addClass(this.options.entryClass || 'col-xs-12 col-sm-6')

    // bring organizer up
    if (participant.get('id') === this.options.baton.model.get('organizerId')) {
      this.$ul.prepend(view.$el)
    } else {
      this.$ul.append(view.$el)
    }
  },

  renderAll () {
    const self = this
    this.renderLabel()
    this.renderEmptyLabel()
    this.collection.each(function (model) {
      self.renderParticipant(model)
    })
    return this
  },

  renderEmptyLabel () {
    if (this.options.noEmptyLabel) {
      return
    }
    if (this.collection.length === 0) {
      this.$ul.append(this.$empty)
    } else {
      this.$empty.remove()
    }
    return this.$ul.toggleClass('empty', this.collection.length === 0)
  }

})

export default {
  ParticipantEntryView,
  UserContainer
}
