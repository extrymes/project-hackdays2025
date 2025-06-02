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

// cSpell:ignore Allgemein

import ModalDialog from '@/io.ox/backbone/views/modal'
import appApi from '@/io.ox/core/api/apps'
import yell from '@/io.ox/core/yell'
import DisposableView from '@/io.ox/backbone/views/disposable'
import ext from '@/io.ox/core/extensions'
import http from '@/io.ox/core/http'
import _ from '@/underscore'
import ox from '@/ox'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import '@/plugins/core/feedback/style.scss'

import { settings } from '@/io.ox/core/settings'

import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'
import { getVersionFromConfig } from '@/io.ox/core/util'

const captions = {
  // #. 1 of 5 star rating
  1: gt.pgettext('rating', 'It\'s really bad'),
  // #. 2 of 5 star rating
  2: gt.pgettext('rating', 'I don\'t like it'),
  // #. 3 of 5 star rating
  3: gt.pgettext('rating', 'It\'s OK'),
  // #. 4 of 5 star rating
  4: gt.pgettext('rating', 'I like it'),
  // #. 5 of 5 star rating
  5: gt.pgettext('rating', 'It\'s awesome')
}
const appWhiteList = [
  'io.ox/mail',
  'io.ox/contacts',
  'io.ox/calendar',
  'io.ox/files'
]
const npsExtendedQuestions = [
  gt('What is the primary reason for your score?'),
  gt('How can we improve your experience?'),
  gt('Which features do you value or use the most?'),
  gt('What is the one thing we could do to make you happier?')
]

// we want to limit spam, so offer a way to rate limit feedback
function allowedToGiveFeedback () {
  // getSettings here for better readability later on
  // relative time stored as 3M for 3 Month etc, or absolute time stored in iso format 2014-06-20
  const timeLimit = settings.get('feedback/timeLimit', dialogMode === 'nps-v1' ? '6M' : undefined)
  // defaults is 1 if theres a limit, if not then we just allow infinite feedbacks
  const maxNumberOfFeedbacks = settings.get('feedback/maxFeedbacks', timeLimit ? 1 : undefined)
  let usedNumberOfFeedbacks = settings.get('feedback/usedFeedbacks', 0)
  // timestamp
  // we need to save the first feedback per timeslot, otherwise we could not use relative dates here (you are allowed 3 feedbacks every month etc)
  const firstFeedbackInTimeslot = settings.get('feedback/firstFeedbackTime')

  // no max number per timeslot => infinite number of feedbacks allowed
  if (!maxNumberOfFeedbacks) return true

  if (firstFeedbackInTimeslot && timeLimit) {
    let tempTime
    // absolute date
    if (timeLimit.indexOf('-') !== -1) {
      tempTime = moment(timeLimit).valueOf()
      // after specified date, need for reset?
      if (tempTime < _.now() && tempTime > firstFeedbackInTimeslot && usedNumberOfFeedbacks !== 0) {
        usedNumberOfFeedbacks = 0
        settings.set('feedback/usedFeedbacks', 0).save()
      }
      // relative date
    } else {
      // limit is stored as 3M for 3 Month etc, so we have to split the string and apply it to the time the last feedback was given
      tempTime = moment(firstFeedbackInTimeslot).add(timeLimit.substring(0, timeLimit.length - 1), timeLimit.substring(timeLimit.length - 1)).valueOf()
      // after relative time, need for reset?
      if (tempTime < _.now() && usedNumberOfFeedbacks !== 0) {
        usedNumberOfFeedbacks = 0
        settings.set('feedback/usedFeedbacks', 0).save()
      }
    }
  }

  return usedNumberOfFeedbacks < maxNumberOfFeedbacks
}

function toggleButtons (state) {
  $('#io-ox-screens .feedback-button').toggleClass('allowed', state)
  $('#topbar-help-dropdown [data-action="feedback"]').parent().toggle(state)
}

function getAppOptions (useWhitelist) {
  const currentApp = ox.ui.App.getCurrentApp()
  const apps = appApi.forLauncher()
    .filter(app => !useWhitelist || _(appWhiteList).contains(app.id))
    .map(app => $('<option>').val(app.id).text(app.get('title')))
  return { currentApp, apps }
}

const StarRatingView = DisposableView.extend({

  className: 'star-rating rating-view',
  name: 'simple-star-rating-v1',

  events: {
    'change input': 'onChange',
    'mouseenter label': 'onHover',
    'mouseleave label': 'onHover'
  },

  initialize (options) {
    this.options = _.extend({ hover: true }, options)
    this.value = 0
    this.$el.attr('tabindex', -1)
  },

  render () {
    this.$el.append(
      _.range(1, 6).map(function (i) {
        return $('<label>').append(
          $('<input type="radio" name="star-rating" class="sr-only">').val(i)
            .attr('title', gt('%1$d of 5 stars', i) + '. ' + captions[i]),
          createIcon('bi/star-fill.svg').addClass('star')
        )
      }),
      $('<caption aria-hidden="true">').text('\u00a0')
    )

    return this
  },

  renderRating (value) {
    this.$('.star').each(function (index) {
      $(this).toggleClass('checked', index < value)
    })

    this.$('caption').text(captions[value] || '\u00a0')
  },

  getValue () {
    return this.value
  },

  setValue (value) {
    if (value < 1 || value > 5) return
    this.value = value
    this.renderRating(value)
  },

  onChange () {
    const value = this.$('input:checked').val() || 1
    this.setValue(value)
  },

  onHover (e) {
    if (!this.options.hover) return
    const value = e.type === 'mouseenter' ? $(e.currentTarget).find('input').val() : this.value
    this.renderRating(value)
  }
})

const ModuleRatingView = StarRatingView.extend({
  name: 'star-rating-v1',
  render (popupBody) {
    const apps = getAppOptions(true)

    if (settings.get('feedback/showModuleSelect', true)) {
      const preSelect = apps.apps.filter(function (app) {
        return app.val() === apps.currentApp.id
      })
      // #. used in feedback dialog for general feedback. Would be "Allgemein" in German for example
      apps.apps.unshift($('<option>').val('general').text(gt('General')))
      popupBody.append(
        this.appSelect = $('<select class="feedback-select-box form-control">').append(apps.apps)
      )
      this.appSelect.val((preSelect.length > 0 && preSelect[0].val()) || apps.apps[0].val())
    } else if (apps.currentApp) {
      popupBody.append(
        $('<div class="form-control">').text(apps.currentApp.get('title')),
        this.appSelect = $('<div aria-hidden="true">').val(apps.currentApp.get('name')).hide()
      )
    } else {
      popupBody.append(
        // #. used in feedback dialog for general feedback. Would be "Allgemein" in German for example
        $('<div class="form-control">').text(gt('General')),
        this.appSelect = $('<div aria-hidden="true">').val('general').hide()
      )
    }

    ModuleRatingView.__super__.render.call(this)
    return this
  }
})

const NpsRatingView = StarRatingView.extend({

  className: 'nps-rating rating-view',
  name: 'nps-rating-v1',

  initialize () {
    // call super constructor
    StarRatingView.prototype.initialize.apply(this, arguments)
    // use value outside the range or the initial hover is set to 0 instead of nothing
    this.value = -1
  },

  render () {
    this.$el.append(
      $('<div class="score-wrapper">').append(
        _.range(0, 11).map(function (i) {
          return $('<label>').append(
            $('<input type="radio" name="nps-rating" class="sr-only">').val(i)
              .attr('title', gt('%1$d of 10 points.', i)),
            $('<span class="score" aria-hidden="true">').text(i)
          )
        })
      ),
      $('<div class="caption-wrapper">').append(
        $('<caption>').text(gt('Not likely at all')),
        $('<caption>').text(gt('Very likely'))
      )
    )

    return this
  },

  renderRating (value) {
    const parsedValue = parseInt(value, 10)
    this.$('.score').each(function (index) {
      $(this).toggleClass('checked', index === parsedValue)
    })
  },

  setValue (value) {
    value = parseInt(value, 10)
    if (value < 0 || value > 11) return
    this.value = value
    this.renderRating(value)
  }
})

let feedbackService

ext.point('plugins/core/feedback').extend({
  id: 'api',
  index: 100,
  initialize () {
    feedbackService = {
      sendFeedback (data) {
        if (!data) return $.when()
        const type = settings.get('feedback/mode', 'star-rating-v1')
        return http.PUT({
          module: 'userfeedback',
          params: {
            action: 'store',
            // stars is a legacy type, map this to star-rating-v1
            // if 'feedback/mode' is really set to stars, this means someone has forcefully overwritten the default config, backend will usually not send this (only nps-v1 and star-rating-v1 is valid).
            type: (type === 'stars' ? 'star-rating-v1' : type)
          },
          data
        })
      }
    }
  }
})

// for custom dev
ext.point('plugins/core/feedback').extend({
  id: 'process',
  index: 200,
  process: $.noop
})

const modes = {
  'nps-v1': {
    RatingView: NpsRatingView,
    // #. %1$s is the product name, for example 'OX App Suite'
    title: gt('How likely are you to recommend %1$s to a friend or colleague?', ox.serverConfig.productName)
  },
  stars: {
    RatingView: StarRatingView,
    title: gt('Please rate this product')
  },
  'star-rating-v1': {
    RatingView: ModuleRatingView,
    title: gt('Please rate the following application:')
  }
}
// url parameter for testing purpose only
let dialogMode = _.url.hash('feedbackMode') || settings.get('feedback/mode', 'star-rating-v1')

// make sure dialogMode is valid
if (_(_(modes).keys()).indexOf(dialogMode) === -1) {
  dialogMode = 'star-rating-v1'
}

function sendFeedback (data) {
  return feedbackService ? feedbackService.sendFeedback(data) : $.when()
}

const feedback = {
  // not really used but helps with unit tests
  allowedToGiveFeedback,

  show () {
    const options = {
      async: true,
      enter: 'send',
      point: 'plugins/core/feedback',
      title: gt('We appreciate your feedback')
    }

    // nps view needs more space
    if (dialogMode === 'nps-v1') {
      options.width = 580
    }
    new ModalDialog(options)
      .extend({
        title () {
          this.$body.append(
            $('<div class="feedback-welcome-text">').text(modes[dialogMode].title)
          )
        },
        ratingView () {
          this.ratingView = new modes[dialogMode].RatingView({ hover: settings.get('feedback/showHover', true) })

          this.$body.addClass(dialogMode + '-feedback-view').append(this.ratingView.render(this.$body).$el)
        },
        comment () {
          if (dialogMode === 'nps-v1' && !settings.get('feedback/showQuestion', false)) return

          const guid = _.uniqueId('feedback-note-')
          // prepare for index out of bounds
          const text = dialogMode === 'nps-v1' ? npsExtendedQuestions[settings.get('feedback/questionIndex') || 0] || gt('What is the primary reason for your score?') : gt('Comments and suggestions')

          this.$body.append(
            $('<label>').attr('for', guid).text(text),
            $('<textarea class="feedback-note form-control" rows="5">').attr('id', guid)
          )
        },
        infotext () {
          // without comment field infotext makes no sense
          if (dialogMode === 'nps-v1') return
          this.$body.append(
            $('<div>').text(
              gt('Please note that support requests cannot be handled via the feedback form. If you have questions or problems please contact our support directly.')
            )
          )
        },
        supportlink () {
          if (settings.get('feedback/supportlink', '') === '') return
          this.$body.append(
            $('<a>').attr('href', settings.get('feedback/supportlink', ''))
          )
        }

      })
      .addCancelButton()
      .addButton({ action: 'send', label: gt('Send') })
      .on('send', function () {
        const isNps = dialogMode === 'nps-v1'
        const rating = this.ratingView.getValue()

        if ((isNps && rating === -1) || (!isNps && rating === 0)) {
          yell('error', gt('Please select a rating.'))
          this.idle()
          return
        }

        const currentApp = getAppOptions().currentApp
        let found = false
        const OS = ['iOS', 'macOS', 'Android', 'Windows', 'Windows8']
        let data = {
          // feedback
          score: rating,
          app: this.ratingView.appSelect ? this.ratingView.appSelect.val() : 'general',
          entry_point: (currentApp ? currentApp.get('name') : 'general'),
          comment: this.$('.feedback-note').val() || '',
          // system info
          operating_system: 'Other',
          browser: 'Other',
          browser_version: 'Unknown',
          user_agent: window.navigator.userAgent,
          screen_resolution: screen.width + 'x' + screen.height,
          language: ox.language,
          client_version: getVersionFromConfig()
        }

        if (isNps) { ox.trigger('feedback:nps', rating) }

        if (isNps && settings.get('feedback/showQuestion', false)) {
          // looks strange but works for index out of bounds and not set at all
          data.questionId = npsExtendedQuestions[settings.get('feedback/questionIndex') || 0] ? settings.get('feedback/questionIndex') || 0 : 0
        }

        _(_.browser).each(function (val, key) {
          if (val && _(OS).indexOf(key) !== -1) {
            data.operating_system = key
          }
          if (!found && _.isNumber(val)) {
            // distinguish correctly between IE and edge
            // TODO: can be removed when edge is no longer recognized as IE with higher version
            if (key === 'IE' && _.browser.edge) {
              data.browser = 'Edge'
              // round to one decimal place
              data.browser_version = parseInt(_.browser.Edge * 10, 10) / 10
            } else {
              data.browser = key
              data.browser_version = val
            }
            found = true
          }
        })

        // Add additional version information for some OS
        switch (data.operating_system) {
          case 'macOS':
            if (!navigator.userAgent.match(/Mac OS X (\d+_?)*/)) break
            data.operating_system = navigator.userAgent.match(/Mac OS X (\d+_?)*/)[0]
            break
          case 'iOS':
            if (!navigator.userAgent.match(/iPhone OS (\d+_?)*/)) break
            data.operating_system = navigator.userAgent.match(/iPhone OS (\d+_?)*/)[0]
            break
          case 'Android':
            data.operating_system = 'Android ' + _.browser.Android
            break
          case 'Windows':
            if (navigator.userAgent.match(/Windows NT 5\.1/)) {
              data.operating_system = 'Windows XP'
              break
            }
            if (navigator.userAgent.match(/Windows NT 6\.0/)) {
              data.operating_system = 'Windows Vista'
              break
            }
            if (navigator.userAgent.match(/Windows NT 6\.1/)) {
              data.operating_system = 'Windows 7'
              break
            }
            if (navigator.userAgent.match(/Windows NT 6\.2/)) {
              data.operating_system = 'Windows 8'
              break
            }
            if (navigator.userAgent.match(/Windows NT 6\.3/)) {
              data.operating_system = 'Windows 8.1'
              break
            }
            if (navigator.userAgent.match(/Windows NT [10.0|6.4]?/)) {
              data.operating_system = 'Windows 10'
              break
            }
            break
          case 'Other':
            // maybe a linux system
            if (!navigator.userAgent.match(/Linux/)) break
            data.operating_system = 'Linux'
            break
          // no default
        }

        const baton = ext.Baton.ensure(data)
        ext.point('plugins/core/feedback').invoke('process', this, baton)
        data = baton.data
        sendFeedback(data)
          .done(function () {
            // update settings
            settings.set('feedback/usedFeedbacks', settings.get('feedback/usedFeedbacks', 0) + 1).save()
            if (settings.get('feedback/usedFeedbacks', 0) === 1) settings.set('feedback/firstFeedbackTime', _.now()).save()

            if (!allowedToGiveFeedback()) toggleButtons(false)
            // #. popup info message
            yell('success', gt('Thank you for your feedback'))
          })
          .fail(function () {
            // #. popup error message
            yell('error', gt('Feedback could not be sent'))
          })
        this.close()
      })
      .open()
  },

  drawButton () {
    let button
    const position = settings.get('feedback/position', 'right')
    const node = $('<div role="region" class="feedback-button">').attr('aria-label', gt('Feedback')).addClass('feedback-' + position).append(
      button = $('<button type="button">').text(gt('Feedback')).on('click', this.show)
    )
    $('#io-ox-screens').append(node)
    if (position === 'right') {
      // temporary inline style so width calculation is correct
      node.css('display', 'block')
      node.css('bottom', button.width() + 128 + 'px')
      node.css('display', '')
    }
  }
}
function getButton () {
  return $('<button data-action="feedback" role="menuitem" tabindex="-1">').text(gt('Give feedback'))
    .on('click', function (e) {
      e.preventDefault()
      feedback.show()
    })
}
function getLink () {
  return $('<a data-action="feedback" role="menuitem" tabindex="-1" href="#">').text(gt('Give feedback'))
    .on('click', function (e) {
      e.preventDefault()
      feedback.show()
    })
}
function addDropdownEntry () {
  const currentSetting = settings.get('feedback/show', 'both')
  if (currentSetting === 'both' || currentSetting === 'topbar') {
    this.append(
      getLink()
    )
    this.$ul.find('[data-action="feedback"]').parent().toggle(allowedToGiveFeedback())
  }
}
ext.point('io.ox/core/appcontrol/right/help').extend({
  id: 'feedback',
  index: 150,
  extend () {
    if (_.device('smartphone')) return
    addDropdownEntry.apply(this, arguments)
  }
})
ext.point('io.ox/core/appcontrol/right/account').extend({
  id: 'feedback',
  index: 240,
  extend () {
    if (!_.device('smartphone')) return
    addDropdownEntry.apply(this, arguments)
  }
})

ext.point('io.ox/core/plugins').extend({
  id: 'feedback',
  draw () {
    if (_.device('smartphone')) return
    const currentSetting = settings.get('feedback/show', 'both')
    if (!(currentSetting === 'both' || currentSetting === 'side')) return
    // feedback.drawButton()
    toggleButtons(allowedToGiveFeedback())
  }
})

ext.point('io.ox/core/appcontrol/sideview').extend({
  id: 'feedback',
  index: 120,
  draw () {
    if (_.device('smartphone')) return
    this.$el.append($('<li role="presentation">').append(getButton().addClass('btn btn-toolbar mb-4')))
  }
}, {
  id: 'feedback-mobile',
  index: 400,
  draw () {
    if (!_.device('smartphone')) return
    const link = getButton()
    const linkText = link.text()
    link.empty().append(
      createIcon('bi/chat-square-text.svg').addClass('bi-24 mr-16 align-middle'),
      $('<span>').text(linkText)
    )
    this.$el.append($('<li role="presentation">').append(link.addClass('btn btn-toolbar mb-4')))
  }
})

// update on refresh should work
ox.on('refresh^', function () {
  toggleButtons(allowedToGiveFeedback())
})

ext.point('plugins/core/feedback').invoke('initialize', this)

export default feedback
