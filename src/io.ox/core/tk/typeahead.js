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
import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import AutocompleteAPI from '@/io.ox/core/api/autocomplete'

import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/contacts/settings'

// https://github.com/twitter/typeahead.js

function customEvent (state, data) {
  this.model.set({
    source: state
  })
  return data
}

const Typeahead = Backbone.View.extend({

  el: '<input type="text" class="form-control">',

  options: {
    apiOptions: {
      contacts: false,
      users: false,
      groups: false,
      resources: false,
      distributionlists: false
    },
    source (query) {
      return this.api.search(query)
    },
    click: $.noop,
    // Select first element on result callback
    autoselect: true,
    // Typeahead will not show a hint
    hint: true,
    // [dropdown|dropup]
    direction: 'dropdown',
    // Filter items
    reduce: _.identity,
    // harmonize returned data from 'source'
    harmonize: _.identity,
    // call typeahead function in render method
    init: true,
    extPoint: 'io.ox/core/tk/typeahead'
  },

  initialize (o) {
    const self = this

    // model to unify/repair listening for different event based states
    this.model = new Backbone.Model({
      // [idle|requesting|processing|finished]
      source: 'idle',
      // [undefined|STRING]
      query: undefined,
      // [closed|open]
      dropdown: 'closed'
    })

    if (o.apiOptions) {
      // limit per autocomplete/search api
      const limit = o.apiOptions.limit !== undefined ? o.apiOptions.limit : coreSettings.get('autocompleteApiLimit', 50)
      o.apiOptions.limit = limit

      // overall limit
      if (!o.maxResults) {
        // Max limit for draw operation in dropdown depending on used apis
        o.maxResults = coreSettings.get('autocompleteDrawLimit', limit * _(o.apiOptions).filter(function (val) { return val === true }).length)
      }
    } else {
      o.maxResults = coreSettings.get('autocompleteDrawLimit', 25)
    }

    // use a clone instead of shared default-options-object
    o = this.options = $.extend({}, this.options, o || {})

    this.api = new AutocompleteAPI(_.extend({
      // only pass to autocomplete api if non default extPoint
      extPoint: /^io\.ox\/core\/tk\/(typeahead|tokenfield)$/.test(o.extPoint) ? undefined : o.extPoint
    }, o.apiOptions))

    this.listenTo(ox, 'refresh^', function () {
      this.api.cache = {}
    })

    // called with lfo
    this.process = function (query, callback, data) {
      $.when(data)
        .then(customEvent.bind(self, 'processing'))
        .then(o.reduce)
        .then(function (data) {
          if (o.maxResults) { data = data.slice(0, o.maxResults) }
          // order
          return o.placement === 'top' ? data.reverse() : data
        })
        .then(o.harmonize)
        .then(customEvent.bind(self, 'finished'))
        .then(customEvent.bind(self, 'idle'))
        .then(callback)
    }

    this.typeaheadOptions = [{
      autoselect: o.autoselect,
      // The minimum character length needed before suggestions start getting rendered
      minLength: Math.max(1, settings.get('search/minimumQueryLength', 2)), // Highlight found query characters in bold
      highlight: true,
      hint: o.hint
    }, {
      source (query, callback) {
        customEvent.call(self, 'requesting')
        // process response via lfo
        o.source.call(self, query).then(_.lfo(self.process, query, callback))
        // workaround: hack to get a reliable info about open/close state
        if (!self.registered) {
          const dateset = this
          // only way to get dateset reference and listen for 'rendered' event
          // hint: used for 'delayedautoselect' option in core/tk/tokenfield
          dateset.onSync('rendered', function () {
            const container = dateset.$el.closest('.twitter-typeahead')
            container.toggleClass('dropup', o.direction === 'dropup')

            const dropdown = container.find('.tt-dropdown-menu')
            const emptyAction = dropdown.find('.tt-dataset-0').is(':empty')
            const query = dropdown.find('span.info').attr('data-query')
            if (!emptyAction) {
              self.model.set('query', query)
            }
            if (dropdown.is(':visible')) {
              self.model.set('dropdown', 'opened')
            }
            if (query) self.trigger('typeahead-custom:dropdown-rendered', dropdown)
          })
          self.registered = true
        }
      },
      templates: {
        suggestion: o.suggestion || function (result) {
          const node = $('<div class="autocomplete-item">')
          ext.point(o.extPoint + '/autoCompleteItem').invoke('draw', node, result, o)
          return node
        },
        header (data) {
          // workaround: add a hidden info node that stores query
          return $('<span class="info hidden">').attr('data-query', data.query)
        }
      }
    }]

    ext.point(o.extPoint + '/typeahead/customize').invoke('customize', this)
  },

  // hint: called with custom context via prototype
  render () {
    const o = this.options
    const self = this

    this.$el.attr({
      placeholder: this.options.placeholder,
      'aria-label': this.options.ariaLabel
    })
      .on({
        // dirty hack to get a reliable info about open/close state
        'typeahead:closed' () {
          const dropdown = self.$el.closest('.twitter-typeahead').find('.tt-dropdown-menu')
          if (!dropdown.is(':visible')) {
            self.model.set('dropdown', 'closed')
          }
        },
        'typeahead:selected typeahead:autocompleted' (e, item) {
          o.click.call(this, e, item)
          self.$el.trigger('select', item)
          self.$el.typeahead('val', '')
        }
      })

    // a11y support
    this.$el.on({
      'typeahead:cursorchanged' () {
        const id = self.$el.closest('.twitter-typeahead').find('.tt-cursor').attr('id')
        self.$el.attr('aria-activedescendant', id)
      }
    })

    this.model.on('change:dropdown', function (model, status) {
      if (status === 'closed') return self.$el.removeAttr('aria-activedescendant')

      const dropdown = self.$el.closest('.twitter-typeahead').find('.tt-dropdown-menu')
      const container = $('<div class="tt-suggestions" role="listbox">')
      const suggestions = dropdown.find('.tt-suggestions').children()
      // use container with proper nodetype (div) and add role/id
      container.append(
        suggestions.each(function () {
          $(this).attr({ id: _.uniqueId('option_'), role: 'option' })
        })
      )
      dropdown.find('.tt-suggestions').replaceWith(container)
      dropdown.scrollTop(0)
    })

    if (this.options.init) {
      this.$el.typeahead.apply(this.$el, this.typeaheadOptions)

      // custom callback function
      this.$el.data('ttTypeahead').input._callbacks.enterKeyed.sync[0] = function onEnterKeyed (type, $e) {
        const cursorDatum = this.dropdown.getDatumForCursor()
        const topSuggestionDatum = this.dropdown.getDatumForTopSuggestion()
        const hint = this.input.getHint()

        // if the hint is not empty the user is just hovering over the cursorDatum and has not really selected it. Use topSuggestion (the hint value) instead.See Bug 48542
        if (cursorDatum && _.isEmpty(hint)) {
          this._select(cursorDatum)
          $e.preventDefault()
        } else if (topSuggestionDatum) {
          // select top suggestion when a) autoselect is true, b) there's a hint, c) if input equals the suggestion
          if (this.autoselect || !_.isEmpty(hint) || topSuggestionDatum.value === $e.currentTarget.value) {
            this._select(topSuggestionDatum)
            $e.preventDefault()
          }
        }
      }.bind(this.$el.data('ttTypeahead'))
    }
    // for debug purpose (keeps dropdown open)
    if (ox.debug && ox.debug_typeahead) {
      this.$el.data('ttTypeahead').dropdown.close = $.noop
      this.$el.data('ttTypeahead').dropdown.empty = $.noop
    }
    // ignore mouse events when dropdown gets programatically scrolled (see bug 55757 and 62955)

    function hasMouseMoved (e) {
      if (!e || !e.originalEvent) return true
      const x = e.originalEvent.movementX
      const y = e.originalEvent.movementY
      if (x !== 0 || y !== 0) return true
    }

    const dropdown = _.extend(this.$el.data('ttTypeahead').dropdown, {
      _onSuggestionMouseEnter (e) {
        if (!hasMouseMoved(e)) return
        this._removeCursor()
        this._setCursor($(e.currentTarget), true)
      },
      _onSuggestionMouseLeave (e) {
        if (!hasMouseMoved(e)) return
        this._removeCursor()
      }
    })

    if (this.options.keepInComposeWindow) {
      _.extend(dropdown, {
        _show () {
          this.$menu.css({ left: 0, display: 'block' })
          // correct position to prevent the dropdown from showing up outside the borders
          this.$menu.css('left', Math.min(0, (this.$menu.closest('.io-ox-mail-compose').offset().left + this.$menu.closest('.io-ox-mail-compose').outerWidth()) - (this.$menu.offset().left + this.$menu.outerWidth() + 15)))
        }
      })
    }

    dropdown.$menu.off('mouseenter.tt mouseleave.tt')
      .on('mouseenter.tt mousemove.tt', '.tt-suggestion', dropdown._onSuggestionMouseEnter.bind(dropdown))
      .on('mouseleave.tt', '.tt-suggestion', dropdown._onSuggestionMouseLeave.bind(dropdown))

    return this
  }

})

export default Typeahead
