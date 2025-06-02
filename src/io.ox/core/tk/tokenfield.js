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
import ext from '@/io.ox/core/extensions'
import Typeahead from '@/io.ox/core/tk/typeahead'
import pModel from '@/io.ox/participants/model'
import pViews from '@/io.ox/participants/views'
import http from '@/io.ox/core/http'
import * as util from '@/io.ox/core/util'
import * as contactsUtil from '@/io.ox/contacts/util'
import { createIcon } from '@/io.ox/core/components'

import '@/io.ox/core/tk/tokenfield.scss'
import '@/lib/jquery-ui.min.js'
import gt from 'gettext'

$.fn.tokenfield.Constructor.prototype.getTokensList = function (delimiter, beautify, active) {
  delimiter = delimiter || this._firstDelimiter
  beautify = (typeof beautify !== 'undefined' && beautify !== null) ? beautify : this.options.beautify

  const separator = delimiter + (beautify && delimiter !== ' ' ? ' ' : ''); const self = this
  return $.map(this.getTokens(active), function (token) {
    if (token.model) {
      const displayname = token.model.getDisplayName({ isMail: self.options.isMail })
      const email = token.model.getEmail ? token.model.getEmail() : undefined
      // make sure the displayname contains no outer quotes
      return displayname === email ? email : '"' + util.removeQuotes(displayname) + '" <' + email + '>'
    }
    return token.value
  }).join(separator)
}

$.fn.tokenfield.Constructor.prototype.setTokens = function (tokens, add, triggerChange) {
  if (!tokens) return

  if (!add) this.$wrapper.find('.token').remove()

  if (typeof triggerChange === 'undefined') {
    triggerChange = true
  }

  if (typeof tokens === 'string') {
    if (this._delimiters.length) {
      // Split at delimiter; ignore delimiters in quotes
      // delimiters are: comma, semi-colon, tab, newline
      tokens = util.getAddresses(tokens)
    } else {
      tokens = [tokens]
    }
  }

  const _self = this
  $.each(tokens, function (i, attrs) {
    _self.createToken(attrs, triggerChange)
  })

  return this.$element.get(0)
}
// totally annoying IE11/Edge Fix (who else could it be) so the dropdown stays open when clicking on the scrollbars
// see for example https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/15558714/, https://github.com/corejavascript/typeahead.js/issues/166, https://github.com/twitter/typeahead.js/issues/705
let mouseIsInDropdown = false

// needs overwrite because of bug 54034
$.fn.tokenfield.Constructor.prototype.blur = function (e) {
  const activeElement = $(document.activeElement).is('body') ? e.relatedTarget : document.activeElement
  const targetOutsideField = !this.$wrapper.is($(activeElement).closest('.tokenfield'))

  if (mouseIsInDropdown) {
    this.$input.focus()
    return
  }
  this.focused = false
  this.$wrapper.removeClass('focus')

  if ((!this.preventDeactivation && !this.$input.is(activeElement)) || targetOutsideField) {
    this.$wrapper.find('.active').removeClass('active').attr({ tabindex: -1, 'aria-selected': false })
    this.$firstActiveToken = null
  }

  if ((!this.preventCreateTokens && (this.$input.data('edit') && !this.$input.is(activeElement))) || this.options.createTokensOnBlur) {
    this.createTokensFromInput(e)
  }

  this.preventDeactivation = false
  this.preventCreateTokens = false
}

// and another overwrite. This time because of bug 61477
$.fn.tokenfield.Constructor.prototype.keypress = function (e) {
  // Comma
  if ($.inArray(e.which, this._triggerKeys) !== -1 && this.$input.is(document.activeElement)) {
    const val = this.$input.val()
    const quoting = /^"[^"]*$/.test(val)
    if (quoting) return
    if (val) {
      // if we are in edit mode, wait for the comma to actually appear in the input field. This way the token is divided correctly.
      if (this.$input.data('edit')) {
        const self = this
        this.$input.one('input', function () {
          self.createTokensFromInput(e)
        })
        return
      }
      this.createTokensFromInput(e)
    }
    return false
  }
}

const UniqPModel = pModel.Participant.extend({
  setPID () {
    UniqPModel.__super__.setPID.call(this)
    // add unique id to pid attr (allows duplicates)
    this.set('pid', this.get('pid') + '_' + _.uniqueId(), { silent: true })
  }
})

const Tokenfield = Typeahead.extend({

  className: 'test',

  events: {
    dispose: 'dispose'
  },

  initialize (options) {
    const self = this

    options = _.extend({}, {
      // defines tokendata
      harmonize (data) {
        return _(data).map(function (m) {
          const model = new UniqPModel(m)
          return {
            value: model.getTarget({ fallback: true }),
            // fallback when firstname and lastname are empty strings
            label: model.getDisplayName({ isMail: options.isMail }).trim() || model.getEmail(),
            model
          }
        })
      },
      // autoselect also when enter was hit before dropdown was drawn
      delayedautoselect: false,
      // tokenfield default
      allowEditing: true,
      createTokensOnBlur: true,
      // dnd sort
      dnd: true,
      // no html by default
      html: false,
      // don't call init function in typeahead view
      init: false,
      // activate to prevent creation of an participant model in tokenfield:create handler
      customDefaultModel: false,
      extPoint: 'io.ox/core/tk/tokenfield',
      leftAligned: false
    }, options)

    if (!ext.point(options.extPoint + '/autoCompleteItem').has('view')) {
      ext.point(options.extPoint + '/autoCompleteItem').extend({
        id: 'view',
        index: 100,
        draw (data) {
          const view = new pViews.ParticipantEntryView({
            model: data.model,
            closeButton: false,
            halo: false,
            isMail: options.isMail
          })
          this.append(view.render().$el)
        }
      })
    }

    ext.point(options.extPoint + '/tokenfield/customize').invoke('customize', this, options)

    // call super constructor
    Typeahead.prototype.initialize.call(this, options)
    const Participants = Backbone.Collection.extend({
      model: UniqPModel
    })

    // initialize collection
    this.collection = options.collection || new Participants()

    // update comparator function
    this.collection.comparator = function (model) {
      return model.index || null
    }

    // lock for redraw action
    this.redrawLock = false

    // 100 to be not perceivable for the user (see bugs 49951, 50412)
    this.listenTo(this.collection, 'reset change:display_name', _.throttle(self.redrawTokens.bind(self), 100))
  },

  dispose () {
    // clean up tokenfield
    this.$el.tokenfield('destroy')
    this.stopListening()
    this.collection = null
    this.api = null
  },

  register () {
    const self = this
    // register custom event when token is clicked
    this.$wrapper.on('click mousedown', '.token', function (e) {
      // create new event set attrs property like it's used in the non-custom events
      const evt = $.extend(true, {}, e, {
        type: 'tokenfield:clickedtoken',
        attrs: $(e.currentTarget).data().attrs,
        originalEvent: e
      })
      self.$el.tokenfield().trigger(evt)
    })

    // delayed autoselect
    if (this.options.delayedautoselect) {
      // use hash to 'connect' enter click and query string
      self.autoselect = {}
      self.model.on('change:query', function (model, query) {
        // trigger delayed enter click after dropdown was drawn
        if (self.autoselect[query]) {
          // trigger enter key press event
          self.input.trigger(
            $.Event('keydown', { keyCode: 13, which: 13 })
          )
          // remove from hash
          delete self.autoselect[query]
        }
      })
    }

    // aria live: reset message
    const tokenfield = this.$el.parent()
    tokenfield.find('.token-input').on('typeahead:close typeahead:closed', function () {
      self.$el.trigger('aria-live-update', '')
    })
    // aria live: set message
    this.on('typeahead-custom:dropdown-rendered', function (dropdown) {
      const numberOfResults = dropdown.find('.tt-suggestions').children().length
      let message

      if (numberOfResults === 0) message = gt('No autocomplete entries found')
      if (!message) {
        // #. %1$d is the number of search results in the autocomplete field
        // #, c-format
        message = gt.ngettext('%1$d autocomplete entry found', '%1$d autocomplete entries found', numberOfResults, numberOfResults)
      }

      self.$el.trigger('aria-live-update', message)
    })

    this.$el.tokenfield().on({
      'tokenfield:createtoken' (e) {
        if (self.redrawLock) return
        // prevent creation of default model
        if (self.options.customDefaultModel && !e.attrs.model) {
          e.preventDefault()
          return false
        }

        // edit
        const inputData = self.getInput().data()
        let newAttrs
        if (inputData.edit === true) {
          // edit mode
          newAttrs = /^"(.*?)"\s*(<\s*(.*?)\s*>)?$/.exec(e.attrs.value)
          if (_.isArray(newAttrs)) {
            // this is a mail address
            e.attrs.label = util.removeQuotes(newAttrs[1])
          } else {
            newAttrs = ['', e.attrs.value, '', e.attrs.value]
          }
          /**
           * TODO: review
           * model values aren't updated so consumers
           * have to use label/value not the model
           * wouldn't it be more robust we create a new model instead
           */
          // save new token data to model
          e.attrs.model = inputData.editModel.set('token', {
            label: newAttrs[1],
            value: newAttrs[3]
          })
          // save cid to token value
          e.attrs.value = e.attrs.model.cid
          // stop edit mode (see bug 47182)
          inputData.edit = false
          return
        }

        // if we don't have a model already, check if the topmost suggestion fits to our current input
        const topSuggestion = self.hiddenapi.dropdown.getDatumForTopSuggestion()
        if (!e.attrs.model && topSuggestion && e.attrs.value === topSuggestion.value && topSuggestion.raw && topSuggestion.raw.model) {
          e.attrs.model = topSuggestion.raw.model
          e.attrs.label = e.attrs.model.getDisplayName({ isMail: self.options.isMail })
        }

        // create model for unknown participants
        if (!e.attrs.model) {
          newAttrs = /^"(.*?)"\s*(<\s*(.*?)\s*>)?$/.exec(e.attrs.value)
          if (_.isArray(newAttrs)) {
            // this is a mail address
            e.attrs.label = util.removeQuotes(newAttrs[1])
            e.attrs.value = newAttrs[3]
          } else {
            newAttrs = ['', e.attrs.value, '', e.attrs.value]
          }
          // add external participant
          e.attrs.model = new UniqPModel({
            type: 5,
            display_name: newAttrs[1],
            email1: newAttrs[3]
          })
        }

        // distribution lists
        if (e.attrs.model.has('distribution_list')) {
          // create a model/token for every member with an email address
          // bundle and delay the pModel fetch calls
          http.pause()

          contactsUtil.validateDistributionList(e.attrs.model.get('distribution_list'))

          const models = _.chain(e.attrs.model.get('distribution_list'))
            .filter(function (m) {
              return !!m.mail
            })
            .map(function (m) {
              m.type = 5
              const model = new UniqPModel({
                type: 5,
                display_name: m.display_name,
                email1: m.mail
              })
              return model.set('token', {
                label: m.display_name,
                value: m.mail
              }, { silent: true })
            })
            .value()

          const name = e.attrs.model.get('display_name')
          const members = _(models).map(function (m) { return [m.get('token').label + ', ' + m.get('token').value] })

          self.$el.trigger('aria-live-update',
            members.length === 1
              ? gt('Added distribution list %s with %s member. The only member of the distribution list is %s.', name, members.length, members.join(', '))
              : gt('Added distribution list %s with %s members. Members of the distribution list are %s.', name, members.length, members.join(', '))
          )

          self.collection.add(models)
          self.redrawTokens()
          // clean input
          self.input.data('ttTypeahead').input.$input.val('')

          http.resume()
          return false
        }

        // groups
        if (e.attrs.value === 'group') {
          (async () => {
            const { default: userAPI } = await import('@/io.ox/core/api/user')
            const users = await userAPI.getList(e.attrs.model.get('members'))
            const models = users
              .filter(u => u.email1 || u.email2 || u.email3)
              .map(u => {
                const model = new UniqPModel(u)
                return model.set('token', {
                  label: u.display_name,
                  value: u.email1 || u.email2 || u.email3
                })
              })

            const name = e.attrs.model.get('display_name')
            const members = models.map(m => [m.get('token').label + ', ' + m.get('token').value])
            self.$el.trigger('aria-live-update',
              members.length === 1
                ? gt('Added group %s with %s member. The only member of the group is %s.', name, members.length, members.join(', '))
                : gt('Added group %s with %s members. Members of the group are %s.', name, members.length, members.join(', '))
            )

            self.collection.add(models)
            self.redrawTokens()
            // clean input
            self.input.data('ttTypeahead').input.$input.val('')
          })()
          return false
        }

        // create token data
        e.attrs.model.set('token', {
          label: e.attrs.label,
          value: e.attrs.value
        }, { silent: true })
        e.attrs.value = e.attrs.model.cid
        let message
        if (e.attrs.model.get('display_name')) {
          if (e.attrs.model.value && e.attrs.model.value !== e.attrs.model.get('display_name')) {
            // #. %1$s is the display name of an added user or mail recipient
            // #. %2$s is the email address of the user or mail recipient
            message = gt('Added %1$s, %2$s.', e.attrs.model.get('display_name'), e.attrs.model.value)
          } else {
            // #. %1$s is the display name of an added user or mail recipient
            message = gt('Added %1$s.', e.attrs.model.get('display_name'))
          }
        } else if (e.attrs.model.get('name') && e.attrs.model.get('detail')) {
          // #. %1$s is the added search query
          // #. %2$s is the context of the added search query
          message = gt('Added %1$s, %2$s.', e.attrs.model.get('name'), e.attrs.model.get('detail'))
        } else if (e.attrs.model.get('name')) {
          // #. %1$s is the added search query
          message = gt('Added %1$s.', e.attrs.model.get('name'))
        }

        if (message) self.$el.trigger('aria-live-update', message)
        // add model to the collection and save cid to the token
        self.collection.add(e.attrs.model)
      },
      'tokenfield:createdtoken' (e) {
        if (e.attrs) {
          const model = e.attrs.model || self.getModelByCID(e.attrs.value)
          const node = $(e.relatedTarget)
          const label = node.find('.token-label')
          const token = model.get('token')
          const hasLabel = token.label && token.label !== token.value
          const title = hasLabel ? token.label + ' ' + token.value : token.value
          const removeButton = node.find('.close')

          // remove wrongly calculated max-width
          if (label.css('max-width') === '0px') label.css('max-width', 'none')

          if (self.options.dnd) node.attr('draggable', true)
          // mouse hover tooltip / a11y title
          label.attr({ 'aria-hidden': true, title })
          // #. Variable will be an contact or email address in a tokenfield. Text is used for screenreaders to provide a hint how to delete the token
          node.attr({
            'aria-label': title,
            'aria-describedby': self.descriptionId
          })

          // add proper tooltip and a11y to the remove button
          // no font awesome here, preserve default remove button style
          removeButton.text('').append(createIcon('bi/x.svg').attr('title', gt('Remove')))

          // customize token
          ext.point(self.options.extPoint + '/token').invoke('draw', e.relatedTarget, model, e, self.getInput())
        }
      },
      'tokenfield:edittoken' (e) {
        if (e.attrs && e.attrs.model) {
          const token = e.attrs.model.get('token')
          // save cid to input
          self.getInput().data('editModel', e.attrs.model)
          // build edit string
          e.attrs.value = token.label
          if (token.value !== token.label) {
            // token.label might have quotes, so we need to clean up again
            e.attrs.value = token.label ? '"' + util.removeQuotes(token.label) + '" <' + token.value + '>' : token.value
          }
          self.getInput().one('blur', function () {
            // see if there is a token with the cid
            const tokens = self.$el.parent().find('.token')
            const cid = self.getInput().data().editModel.cid
            let found = false
            for (let i = 0; i < tokens.length; i++) {
              if ($(tokens[i]).data('attrs').value === cid) {
                found = true
                return
              }
            }
            // user tries to remove token by clearing the token in editmode
            // token was removed but it's still in the collection, so we need to remove it correctly
            if (!found) {
              self.collection.remove(self.getModelByCID(cid))
            }
          })
        }
      },
      'tokenfield:removetoken' (e) {
        _([].concat(e.attrs)).each(function (el) {
          const model = self.getModelByCID(el.value)
          if (!model) return

          let message
          if (model.get('display_name')) {
            if (model.value && model.value !== model.get('display_name')) {
              // #. %1$s is the display name of a removed user or mail recipient
              // #. %2$s is the email address of the user or mail recipient
              message = gt('Removed %1$s, %2$s.', model.get('display_name'), model.value)
            } else {
              // #. %1$s is the display name of a removed user or mail recipient
              message = gt('Removed %1$s.', model.get('display_name'))
            }
          } else if (model.get('name') && model.get('detail')) {
            // #. %1$s is the removed search query
            // #. %2$s is the context of the removed search query
            message = gt('Removed %1$s, %2$s.', model.get('name'), model.get('detail'))
          } else if (model.get('name')) {
            // #. %1$s is the removed search query
            message = gt('Removed %1$s.', model.get('name'))
          }

          if (message) self.$el.trigger('aria-live-update', message)

          self.collection.remove(model)
        })
      }
    })
  },

  render () {
    const o = this.options; const self = this

    this.$el
      .addClass('tokenfield')
      .tokenfield({
        createTokensOnBlur: o.createTokensOnBlur,
        minLength: o.minLength,
        delimiter: _.isUndefined(o.delimiter) ? undefined : o.delimiter,
        allowEditing: o.allowEditing,
        typeahead: self.typeaheadOptions,
        html: this.options.html || false,
        inputType: this.options.inputtype || 'text',
        isMail: o.isMail,
        minWidth: 0
      })

    this.$wrapper = this.$el.closest('div.tokenfield').prepend(
      $('<div class="sr-only">').attr('id', this.descriptionId = _.uniqueId('instructions-')).text(gt('Press spacebar to grab and re-order. Press backspace to delete.')),
      this.$live = $('<div class="sr-only" aria-live="assertive">')
    )

    this.$wrapper.attr('role', 'application') // Bug OXUIB-277, navigation with screen reader broken

    this.register()

    // save original typeahead input
    this.input = $(this.$el).data('bs.tokenfield').$input
    // call typehead render
    Typeahead.prototype.render.call({
      $el: this.input,
      model: this.model,
      options: this.options
    })

    // add non-public api;
    this.hiddenapi = this.input.data('ttTypeahead')

    // debug: force dropdown to stay open
    // this.hiddenapi.dropdown.close = $.noop;
    // this.hiddenapi.dropdown.empty = $.noop;

    _.extend(this.hiddenapi.dropdown, {
      onDropdownMouseEnter () {
        mouseIsInDropdown = true
      },
      onDropdownMouseLeave () {
        mouseIsInDropdown = false
      }
    })

    // calculate position for typeahead dropdown (tt-dropdown-menu)
    if (_.device('smartphone') || o.leftAligned) {
      // non-public api of typeahead
      this.hiddenapi.dropdown._show = function () {
        let width = 'auto'; let left = 0
        if (_.device('smartphone')) {
          left = self.input.offset().left * -1
          width = window.innerWidth
        } else if (o.leftAligned) {
          left = self.input.position().left
          left = Math.round(left) * -1 + 17
        }
        this.$menu.css({ left, width }).show()
      }
    }

    // custom callback function
    this.hiddenapi.input._callbacks.enterKeyed.sync[0] = function onEnterKeyed (type, $e) {
      const cursorDatum = this.dropdown.getDatumForCursor()
      const topSuggestionDatum = this.dropdown.getDatumForTopSuggestion()
      const hint = this.input.getHint()

      // if the hint is not empty the user is just hovering over the cursorDatum and has not really selected it. Use topSuggestion (the hint value) instead.See Bug 48542
      if (cursorDatum && _.isEmpty(hint)) {
        this._select(cursorDatum)
        $e.preventDefault()
      } else if (this.autoselect && topSuggestionDatum) {
        this._select(topSuggestionDatum)
        $e.preventDefault()
      }
    }.bind(this.hiddenapi)

    // workaround: select suggestion by space key
    this.hiddenapi.input.$input.on('keydown', function (e) {
      const isSuggestionSelected = !!this.hiddenapi.dropdown.getDatumForCursor()
      if (e.which !== 32 || !isSuggestionSelected) return
      this.hiddenapi._onEnterKeyed('ox.spaceKeyed', e)
    }.bind(this))

    // workaround: register handler for delayed autoselect
    if (this.options.delayedautoselect) {
      this.input.on('keydown', function (e) {
        const enter = e.which === 13
        const space = e.which === 32
        const validquery = !!self.input.val() && self.input.val().length >= o.minLength
        const runningrequest = self.model.get('query') !== self.input.val()
        const automated = e.which === 38 || e.which === 40
        // clear dropdown when query changes
        if (runningrequest && !enter && !space && !automated) {
          self.hiddenapi.dropdown.empty()
          self.hiddenapi.dropdown.close()
        }
        // flag query string when enter was hit before dropdown was drawn
        if (enter && validquery && runningrequest) {
          self.autoselect[self.input.val()] = true
        }
      })
    }

    this.$el.parent().addClass(this.options.className)

    if (this.options.dnd) this.dragAndDropSupport()

    this.$wrapper.on('copy', function (e) {
      // value might contain more than one id so split
      const values = e.target.value.split(', ')

      // copy actual email address instead of model cid to clipboard
      let result = ''
      _(values).each(function (value) {
        const model = self.collection.get(value)
        if (model) {
          result = result + (result === '' ? '' : ', ') + model.value
        }
      })

      if (result !== '') {
        e.originalEvent.clipboardData.setData('text/plain', result)
        e.preventDefault()
      }
    })

    this.getInput().on('focus blur updateWidth', function (e) {
      const tokenfield = self.$el.data('bs.tokenfield')
      tokenfield.options.minWidth = e.type === 'focus' ? 1 : 0
      tokenfield.update()
    })

    return this
  },

  dragAndDropSupport: (function () {
    let sourceView; let targetView; let draggedItems; let direction; let lastX; let currentModel
    const events = _.extend({}, Backbone.Events)
    let targetChanged = false

    return function () {
      const self = this
      const tokenfield = this.$wrapper
        .on('dragover', function (e) {
          if (!draggedItems) return
          e.preventDefault()
          if (targetView !== self) {
            const prevView = targetView
            targetView = self
            if (prevView) prevView.$wrapper.removeClass('drophover')
            if (targetView) targetView.$wrapper.addClass('drophover')
            if (prevView && targetView) {
              // only move item from one view to the other if previous exists to prevent the item to be attached to the view it was already in at the beginning
              targetView.$wrapper.find('.tokenfield, .token').last().after(draggedItems)
              targetChanged = true
            }
          }

          if (lastX < e.screenX) direction = 'right'
          else if (lastX > e.screenX) direction = 'left'
          lastX = e.screenX
        })
        .delegate('> .token', {
          dragstart () {
            const current = $(this)
            sourceView = targetView = self
            // allows multi d&d, but is disabled until currently buggy tokenfields are overworked
            // draggedItems = tokenfield.find('.active');
            draggedItems = current
            tokenfield.addClass('drophover')
            events.trigger('dragstart')
            // needs opacity != 1, otherwise chrome will have white background behind border radius
            draggedItems.css('opacity', '0.999').not(current).css('visibility', 'hidden')
            // TODO: Check if edge still needs this
            if (draggedItems.length > 1 && !_.browser.edge) {
              current.append(
                $('<span class="drag-counter badge">').text(draggedItems.length)
              )
            }
            // defer the visibility settings, as the browsers will create a snapshot of the dragged item right after this
            _.defer(function () {
              if (!draggedItems) return
              current.css('visibility', 'hidden')
              draggedItems.attr('aria-grabbed', true)
              draggedItems.not(current).hide()
            })
            currentModel = current.data().attrs.model
          },
          dragenter () {
            const target = $(this)
            if (!target.is('[aria-dropeffect="move"]')) return
            // insert element immediately, if dragged from one tokenfield to another
            if (!target.parent().is(draggedItems.parent()) || targetChanged) {
              target.before(draggedItems)
              targetChanged = false
            } else if (draggedItems.first().index() < target.index()) {
              // only allow index change if mouse moves in the correct direction. prevents flickering and issues with different sized items
              if (draggedItems.offset().top < target.offset().top || direction === 'right') {
                target.after(draggedItems)
              }
            } else if (draggedItems.offset().top > target.offset().top || direction === 'left') {
              target.before(draggedItems)
            }
          },
          'dragend stop' () {
            targetView = self
            const models = draggedItems.map(function () {
              return $(this).data().attrs.model
            }).toArray()
            const cids = models.map(function (model) { return model.cid })

            if (sourceView !== targetView) {
              // move models from one tokenfield to another
              sourceView.collection.remove(models)
              targetView.collection.add(models)
              sourceView.resort()
            }
            targetView.resort()
            targetView.$wrapper.removeClass('drophover')
            draggedItems.css('visibility', '').attr('aria-grabbed', false).show()
            events.trigger('dragend')

            // reapply focus and active classes
            targetView.$wrapper.find('> .token').each(function () {
              const $this = $(this)
              const value = $this.data('attrs').value
              if (cids.indexOf(value) >= 0) $this.addClass('active')
              if (value === currentModel.cid) $this.focus()
            })
            draggedItems = null
            sourceView = null
          }
        })

      this.listenTo(events, {
        dragstart () {
          tokenfield.find('.token:not(.active)').attr('aria-dropeffect', 'move')
        },
        dragend () {
          tokenfield.find('.token').removeAttr('aria-dropeffect')
        }
      })

      // Keyboard support

      let preventCleanup = false
      let initialIndex

      function announce (action, token, index, length) {
        let msg
        switch (action) {
          case 'grab':
            msg = gt('%1$s, grabbed. Current position in list: %2$s of %3$s. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.', token.data('attrs').label, index, length)
            break
          case 'move':
            msg = gt('%1$s. New position in list: %2$s of %3$s', token.data('attrs').label, index, length)
            break
          case 'drop':
            msg = gt('%1$s, dropped. Final position in list: %2$s of %3$s', token.data('attrs').label, index, length)
            break
          case 'cancel':
            msg = gt('%1$s, dropped. Re-order canceled.', token.data('attrs').label)
          // no default
        }
        self.$live.text(msg)
      }

      function cleanup () {
        const prevent = preventCleanup
        preventCleanup = false
        if (prevent) return
        self.resort()
        self.$wrapper.find('.token')
          .off('keydown', moveListener)
          .off('blur', cleanup)
          .removeClass('grabbed')
          .attr('aria-grabbed', false)
      }

      function moveListener (e) {
        const target = $(e.target); const tokens = self.$wrapper.find('> .token')
        switch (e.which) {
          case 8: // backspace
          case 27: // escape
          case 46: // delete
            if (e.which === 27) e.stopImmediatePropagation()
            if (initialIndex === tokens.length - 1) tokens.last().after(target)
            else tokens.eq(initialIndex).before(target)
            target.focus()
            announce('cancel', target)
            preventCleanup = false
            return cleanup()
          case 32: // spacebar
            e.preventDefault()
            e.stopPropagation()
            announce('drop', target, tokens.index(target) + 1, tokens.length)
            preventCleanup = false
            return cleanup()
          case 37: // left arrow
          case 38: { // up arrow
            e.stopImmediatePropagation()
            preventCleanup = true
            const prev = target.prev('.token')
            if (prev.length) {
              prev.insertAfter(target)
              announce('move', target, tokens.index(target), tokens.length)
            }
            target.focus()
            break
          }
          case 39: // right arrow
          case 40: { // down arrow
            e.stopImmediatePropagation()
            preventCleanup = true
            const next = target.next('.token')
            if (next.length) {
              next.insertBefore(target)
              announce('move', target, tokens.index(target) + 2, tokens.length)
            }
            target.focus()
            break
          }
          // no default
        }
      }

      this.$wrapper.delegate('.token.active', 'keydown', function (e) {
        const target = $(e.target)
        if (e.which === 32) {
          e.preventDefault()
          preventCleanup = false
          target
            .on('blur', cleanup)
            .on('keydown', moveListener)
            .addClass('grabbed')
            .attr('aria-grabbed', true)
          // make sure that this listener is executed first and can prevent propagation
          const keydown = $._data(e.target, 'events').keydown
          keydown.unshift(keydown.pop())

          const tokens = self.$wrapper.find('> .token')
          initialIndex = tokens.index(target)
          announce('grab', target, initialIndex + 1, tokens.length)
        }
      })
    }
  }()),

  getModelByCID (cid) {
    return this.collection.get({ cid })
  },

  redrawTokens () {
    const tokens = []; const self = this
    this.redrawLock = true
    this.collection.each(function (model) {
      tokens.push({
        label: model.getDisplayName({ isMail: self.options.isMail }),
        value: model.cid,
        model
      })
    })
    // keep focus and active classes
    const focusedValue = $.contains(this.$wrapper.get(0), document.activeElement) && ($(document.activeElement).data('attrs') || {}).value
    const activeValues = this.$wrapper.find('> .token.active').toArray().map(function (el) {
      return $(el).data('attrs').value
    })
    // reset token triggers a redraw
    this.$el.tokenfield('setTokens', tokens, false)
    // reapply focus and active classes
    this.$wrapper.find('> .token').each(function () {
      const $this = $(this)
      const value = $this.data('attrs').value
      if (activeValues.indexOf(value) >= 0) $this.addClass('active')
      if (value === focusedValue) $this.focus()
    })
    this.redrawLock = false
  },

  resort () {
    const col = this.collection
    _(this.$el.tokenfield('getTokens')).each(function (token, index) {
      if (col.get({ cid: token.value })) {
        col.get({ cid: token.value }).index = index
      }
    })
    col.sort()
    this.redrawTokens()
  },

  getInput () {
    return this.input
  },

  setFocus () {
    const tokenfield = this.$el.parent()
    tokenfield.find('.token-input').focus()
  }
})

export default Tokenfield
