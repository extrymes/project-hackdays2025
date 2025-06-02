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
import Stage from '@/io.ox/core/extPatterns/stage'

function displayFeedback () {
  let node = feedbackNode

  if (!node) return
  if (typeof node === 'function') node = node()
  if (typeof node === 'string') node = $.txt(node) // TODO: this had a gt()

  $('#io-ox-login-feedback').empty().append(
    $('<div role="alert" class="selectable-text alert alert-info">').append(
      node
    )
  )
}
let feedbackNode = null

ox.on('language', displayFeedback)

ox.on('change:document:title', function (arg) {
  const elements = [].concat(arg)
  const change = _.lfo(changeDocumentTitle)

  // skip if we don't have a session (i.e. during signin) because there is no way to get anything via user api
  if (ox.signin) return change(elements)

  Promise.all([
    import('@/io.ox/core/api/user'),
    import('@/io.ox/contacts/util')
  ]).then(function ([{ default: api }, util]) {
    api.get({ id: ox.user_id }).done(function (data) {
      const user = util.getMailFullName(data) || ox.user
      elements.push(user)
      change(elements)
    })
  })
})

async function changeDocumentTitle (elements) {
  const { default: config } = await import('@/io.ox/core/boot/config')
  document.title = document.customTitle = _.compact(_.uniq(elements)).concat((await config.server()).productName).join(' - ')
}

export function debug () {
  if (!/\bboot/.test(_.url.hash('debug'))) return
  const args = _(arguments).toArray(); const t = _.now() - ox.t0
  args.unshift('boot (' + (t / 1000).toFixed(1) + 's): ')
  console.log.apply(console, args)
}

const exports = {

  DURATION: 250,

  debug,

  debugSession: $.noop,

  setPageTitle (title) {
    ox.trigger('change:document:title', title)
    // document.title = title || '';
    $('[name="apple-mobile-web-app-title"]').attr('content', title)
  },

  feedback (type, node) {
    // feedbackType = type;
    feedbackNode = node
    displayFeedback()
  },

  cleanUp () {
    // we don't clear the password right now (see bug 36950)
    $('#io-ox-login-form')
      .off('submit')
      .find('input, button').prop('readonly', true)
  },

  gotoSignin (hash) {
    const ref = (window.location.hash || '').replace(/^#/, '')
    const path = _.url.vars(ox.serverConfig.loginLocation || ox.loginLocation)
    const glue = path.indexOf('#') > -1 ? '&' : '#'
    hash = (hash || '') + (ref ? '&ref=' + encodeURIComponent(ref) : '')
    _.url.redirect((hash ? path + glue + hash : path))
  },

  isAnonymous () {
    return _.url.hash('login_type') === 'anonymous_password'
  },

  isGuest () {
    return _.url.hash('login_type') === 'guest'
  },

  isContinue () {
    return /^(guest|message_continue)$/.test(_.url.hash('login_type'))
  },

  isGuestWithPassword () {
    return _.url.hash('login_type') === 'guest_password'
  },

  scopeCustomCss (customCss, scopeIdentifier) {
    if (!customCss) return

    customCss = customCss.replace(/([^}{]*{)/gi, function (x) {
      if (x.trim().indexOf('@') === 0) return x
      if (x.trim().indexOf(scopeIdentifier) >= 0) return x
      return x.match(/^\s*/)[0] + scopeIdentifier + ' ' + x.trim()
    })

    return customCss
  },

  fail (error, focus) {
    const self = this
    // restore form
    this.restore()

    // show error
    if (error && error.error === '0 general') {
      this.feedback('error', 'No connection to server. Please check your internet connection and retry.')
    } else if (error && error.code === 'LGI-0011') {
      // password expired
      this.feedback('error', function () {
        return [
          $('<p>').text(self.gt('Your password is expired. Please change your password to continue.')),
          // don't use a button here or it will trigger a submit event
          $('<a target="_blank" role="button" class="btn btn-primary btn">')
            .text(self.gt('Change password'))
          // error_params[0] should contain a url to password change manager or sth.
            .attr('href', error.error_params[0])
        ]
      })
    } else if (error && error.code === 'LGI-0016' && (error.error_params || []).length === 1) {
      _.url.redirect(error.error_params[0])
    } else {
      this.feedback('error', $.txt(_.formatError(error, '%1$s (%2$s)')))
    }
    // reset focus
    const id = (_.isString(focus) && focus) || (this.isAnonymous() && 'password') || 'username'
    $('#io-ox-login-' + id).focus().select()
    // event
    ox.trigger('login:fail', error)
  },

  restore () {
    // stop being busy
    $('#io-ox-login-form')
    // visual response (shake sucks on touch devices)
      .css('opacity', '')
      .find('input').prop('disabled', false)
    $('#io-ox-login-blocker').hide()
    // $('#io-ox-login-feedback').idle();
  },

  lock () {
    // be busy
    $('#io-ox-login-form')
      .css('opacity', 0.5)
      .find('input').prop('disabled', true)
    $('#io-ox-login-blocker').show()
    // $('#io-ox-login-feedback').busy().empty();
  },

  // note: this function can be overwritten at runtime when the tab api is disabled
  checkTabHandlingSupport () {
    return !ox.serverConfig.openInSingleTab &&
                !/\bsingle/.test(_.url.hash('tabmode')) && // debug: use '&tabmode=single' in url to disable
                !_.device('ie && ie <= 11') && // no old internet explorer
                !_.device('smartphone') && // no mobile
                !_.device('tablet') && // no tablet
                !_.device('touch && macos') && // no iPadOS
                !this.isStoreCredentialContext() // no tab support in iframe context at login
  },

  relogin () {
    Stage.run('io.ox/core/boot/login', {}, { methodName: 'relogin' })
  },

  // two contexts are possible, see login process
  isStoreCredentialContext () {
    const inIframe = window.self !== window.top
    return inIframe && window.name === 'store-credentials'
  }

}

//
// take care of invalid sessions
//

ox.on('relogin:required', exports.relogin)

if (/\bsession/.test(_.url.hash('debug'))) {
  exports.debugSession = function () {
    const args = _(arguments).toArray(); const t = _.now() - ox.t0
    args.unshift('session (' + (t / 1000).toFixed(1) + 's): ')
    console.log.apply(console, args)
  }
}

export default exports
