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
import moment from '@open-xchange/moment'

import ox from '@/ox'
import http from '@/io.ox/core/http'
import util from '@/io.ox/core/boot/util'
import { deepExtend } from '@/io.ox/core/util'
import locale from '@/io.ox/core/boot/locale'
import { gt } from 'gettext'
import support from '@/io.ox/core/boot/support'
import login from '@/io.ox/core/boot/login/standard'
import manifests from '@/io.ox/core/manifests'
import config from '@/io.ox/core/boot/config'
import { getSVGLogo } from '@/io.ox/core/theming/util'
/*
 * url params/values (all optional)
 * ================================
 *
 * login_type:      [ 'guest' | 'guest_password' | 'anonymous_password' ]
 * login_name:      [ something ]
 *
 * status:          [ 'reset_password' | 'invalid_request' ]
 *
 * message_type:    [ 'INFO' | 'ERROR' ]
 * message:         [ something ]
 *
 * forgot-password: [ something ]
 * share:           [ something ]
 * confirm:         [ something ]
 * autologout:      [ something ]
 */

export default async function () {
  let bindLogin = true
  const [sc] = await Promise.all([
    config.server()
  ])

  util.debug('Show form ...')

  function displayMessageContinue () {
    loadLoginLayout({ hideTitle: true, addClass: 'login-type-message' })
    hideFormElements('.username, .password, .options')
  }

  function displayContinue (data) {
    $('#io-ox-login-button').attr('data-i18n', 'Continue').text(gt('Continue'))
    $('#io-ox-login-restoremail, #io-ox-login-username').val(data.login_name || '').prop('readonly', true)
    $('#io-ox-login-password').val('')
  }

  function displayMessageOnly () {
    loadLoginLayout({ hideTitle: true, addClass: 'login-type-message' })
    hideFormElements()
  }

  function hideFormElements (elements) {
    // hide all other inputs
    $('#io-ox-login-form div.row')
      .filter(elements || '.username, .password, .options, .button')
      .hide()
  }

  function resetPassword () {
    loadLoginLayout({ altTitle: gt('Reset password'), newPassword: true, showAlert: true })

    $('#io-ox-login-form').attr({
      action: '/appsuite/api/share/reset/password',
      method: 'post',
      target: '_self'
    }).append(
      $('<input type="hidden" name="share">').val(_.url.hash('share')),
      $('<input type="hidden" name="confirm">').val(_.url.hash('confirm'))
    ).submit(function (e) {
      const pass1 = $.trim($('#io-ox-login-password').val())
      const pass2 = $.trim($('#io-ox-retype-password').val())
      if (pass1.length === 0 || pass2.length === 0) {
        e.preventDefault()
        return util.fail({ error: gt('Please enter your new password.'), code: 'UI-0003' }, 'password')
      }
      if (pass1 !== pass2) {
        e.preventDefault()
        return util.fail({ error: gt('Please enter the same password.'), code: 'UI-0004' }, 'password')
      }
    })
    // remove unused fields
    $('#io-ox-login-form div.row.username').remove()
    $('#io-ox-login-store').remove()
    $('#io-ox-forgot-password').remove()
    // show retype
    $('#io-ox-login-form div.row.password-retype').show()
    // i18n
    $('#io-ox-login-button')
      .attr('data-i18n', 'Set password')
      .text(gt('Set password'))
    bindLogin = false
  }

  function guestLogin () {
    loadLoginLayout({ showAlert: true })

    const loginName = _.url.hash('login_name')
    $('.row.username').hide()
    if (!_.isEmpty(loginName)) {
      $('#io-ox-login-restoremail, #io-ox-login-username').val(loginName).prop('readonly', true)
    }
    $('#io-ox-forgot-password, #io-ox-backtosignin').find('a').click(function (e) {
      e.preventDefault()
      $('#io-ox-resetpassword-button').attr({ 'data-i18n': 'Next' }).text(gt('Next'))
      // If restore email is already populated and readOnly, submit the form
      if ($('#io-ox-login-restoremail, #io-ox-login-username').prop('readOnly')) {
        $('#io-ox-password-forget-form').submit()
      } else {
        $('#io-ox-password-forget-form, #io-ox-login-form').toggle()
      }
    })
    $('#io-ox-password-forget-form').append(
      $('<input type="hidden" name="share">').val(_.url.hash('share'))
    )
  }

  function anonymousLogin () {
    loadLoginLayout({ showAlert: true })

    $('.row.username').hide()
    $('#io-ox-forgot-password').remove()
  }

  function defaultLogin () {
    loadLoginLayout({ showAlert: true })

    // remove form for sharing
    $('#io-ox-password-forget-form').remove()

    if (!sc.forgotPassword) {
      // either not configured or guest user
      $('#io-ox-forgot-password').remove()
      $('#io-ox-login-store').toggleClass('col-sm-6 col-sm-12')
    } else {
      $('#io-ox-forgot-password').find('a').attr('href', sc.forgotPassword)
    }
  }

  function removeUnusedLines (strings, ...args) {
    args = args.map(a => (_.isUndefined(a) ? 'uniqueReplacementForUndefinedValues' : a))
    return _.zip(strings, args).flat().filter(Boolean).join('')
  }

  function generateCss (lc) {
    lc.loginBox = !['left', 'right'].includes(lc.loginBox) ? 'center' : lc.loginBox
    lc.backgroundImage = !_.device('smartphone') && lc.backgroundImage

    return removeUnusedLines`
      #io-ox-login-container { background: ${lc.backgroundColor}; }
      #io-ox-login-background-image { background: ${lc.backgroundImage}; }
      #io-ox-login-header { background: linear-gradient(rgba(0,0,0,${lc.topVignette?.transparency}),rgba(0,0,0,0)); }
      #io-ox-login-header, #io-ox-login-header #io-ox-languages #io-ox-languages-label { color: ${lc.header?.textColor}; }
      #io-ox-login-header a, #io-ox-login-header .toggle-text, #io-ox-login-header .caret { color: ${lc.header?.linkColor}; }
      #login-title-mobile { color: ${lc.header?.textColor} !important; }
      #box-form-header { color: ${lc.form?.header?.textColor}; }
      #box-form-header { background: ${lc.form?.header?.bgColor}; }
      #box-form-body *:not(button,.toggle,svg,svg>path) { color: ${lc.form?.textColor}; }
      #box-form-body .checkbox.custom input:checked + .toggle { background-color: ${lc.form?.button?.bgColor}; color: ${lc.form?.button?.textColor}; }
      #box-form-body .checkbox.custom input:focus + .toggle { border-color: ${lc.form?.button?.bgColor}; box-shadow: 0 0 0 0.25rem ${lc.form?.button?.bgColor}40; }
      #box-form-body { color: ${lc.form?.textColor}; }
      #box-form #box-form-body a { color: ${lc.form?.linkColor}; }
      #box-form button, #io-ox-login-button { background-color: ${lc.form?.button?.bgColor}; border-color: ${lc.form?.button?.bgColor}; }
      #box-form button, #io-ox-login-button { border-color: ${lc.form?.button?.borderColor}; }
      #box-form button, #io-ox-login-button { color: ${lc.form?.button?.textColor}; }
      #io-ox-login-footer { background: ${lc.footer?.bgColor}; }
      #io-ox-login-footer, #io-ox-login-footer #io-ox-languages .lang-label { color: ${lc.footer?.textColor}; }
      #io-ox-login-footer a, #io-ox-login-footer .toggle-text, #io-ox-login-footer #language-select, #io-ox-login-footer .caret { color: ${lc.footer?.linkColor}; }
      #io-ox-login-content { justify-content: ${lc.loginBox}; }`
      .split('\n').filter(line => !line.includes('uniqueReplacementForUndefinedValues')).join('\n')
  }

  function loadLoginLayout (options) {
    const lc = getLoginConfiguration(options)

    // apply login screen specific classes
    if (_.device('smartphone')) {
      $('#io-ox-login-username,#io-ox-login-password,#io-ox-retype-password,#io-ox-login-restoremail').each(function () {
        const text = $(`label[for="${this.id}"]`).attr('data-i18n')
        $(this).attr({
          'data-i18n-attr': 'placeholder',
          'data-i18n': text,
          placeholder: gt(text)
        })
      })
    }
    $('#io-ox-login-screen').addClass(lc.addClass)

    const toolbar = $('#io-ox-login-toolbar')
    const content = $('#io-ox-login-content')
    const footer = $('#io-ox-login-footer')

    const standardNodes = {
      $logo: $('<img class="login-logo" alt="Logo">').attr('src', lc.logo),
      $language: $('<span id="io-ox-languages" class="mx-16">'),
      $spacer: $('<div class="composition-element login-spacer">'),
      $privacy: $('<span>').append(
        $('<a>').attr({ target: '_blank', href: lc.footer.privacy, 'data-i18n': 'Privacy Policy' }).data('href-translations', getTranslations(lc.footer.$privacy)).text(gt('Privacy Policy'))),
      $imprint: $('<span>').append(
        $('<a>').attr({ target: '_blank', href: lc.footer.imprint, 'data-i18n': 'Imprint' }).data('href-translations', getTranslations(lc.footer.$imprint)).text(gt('Imprint'))),
      $copyright: $('<span>').text((lc.footer.copyright || sc.copyright).replace(/\(c\)/g, '\u00A9').replace(/\$year/g, moment().year())),
      $version: $('<span>').text(sc.version || ox.version)
    }

    if (!lc.logo) {
      const filename = ox.serverConfig.useOXLogo ? 'ox_logo.svg' : 'logo-dynamic.svg'
      getSVGLogo('./themes/default/' + filename).then(logo => {
        $('.login-logo').replaceWith($(logo).addClass('login-logo default'))
      })
    }

    function getNodes (bucket) {
      return bucket.sorting.split(',').map(function (str) {
        if (standardNodes[str]) return standardNodes[str].clone(true, true)
        if (!str.length) return undefined
        return $('<div class="composition-element">').append(
          str.match(/(\$[a-zA-Z]+|[^$]+)/g).map(function (match) {
            if (standardNodes[match]) return standardNodes[match].clone(true, true)
            if (bucket[match]) return $('<span data-i18n>').data('translations', getTranslations(bucket[match]))
            return $('<span>').text(match)
          })
        )
      })
    }

    function getTranslations (o) {
      return _.isObject(o) ? o : { en_US: o }
    }

    // header and toolbar
    toolbar.append(getNodes(lc.header))
    if (_.device('smartphone')) toolbar.append($('<div id="login-title-mobile">').text(lc.header.title))

    // teaser and boxposition
    const teaser = $('<div id="io-ox-login-teaser" class="col-sm-6" data-i18n-attr="html" data-i18n>').data('translations', getTranslations(lc.teaser))
    if (lc.loginBox === 'left' && !_.device('smartphone')) {
      content.append(teaser)
    } else if (lc.loginBox === 'right' && !_.device('smartphone')) {
      content.prepend(teaser)
    }

    // form
    $('#box-form-header').text(lc.header.title).attr({ 'data-i18n': '', 'data-i18n-attr': 'text' }).data('translations', getTranslations(lc.header.title))
    if (lc.altTitle) $('#login-title').attr({ 'data-i18n': lc.altTitle }).text(lc.altTitle)
    else if (!lc.hideTitle) $('#login-title').attr({ 'data-i18n': 'Sign in' }).text(gt('Sign in'))
    else $('#login-title').remove()
    $('#io-ox-login-button').attr({ 'data-i18n': 'Sign in' }).text(gt('Sign in'))
    if (lc.newPassword) $('#io-ox-login-password').val('')
    if (lc.informationMessage) $('#io-ox-information-message').attr({ 'data-i18n': '', 'data-i18n-attr': 'html' }).data('translations', getTranslations(lc.informationMessage))

    // alert info
    if (options.showAlert) $('#io-ox-login-feedback').addClass('alert-highlight')

    // footer
    footer.append(getNodes(lc.footer))
    if (_.device('smartphone')) {
      toolbar.find('#io-ox-languages').remove()
      footer.prepend(standardNodes.$language)
    }

    const localeIsDropUp = lc.header.sorting.indexOf('$language') === -1
    locale.render(localeIsDropUp)

    // apply styles from server configuration (login page)
    $('head').append($('<style data-src="login-page-configuration" type="text/css">').text(util.scopeCustomCss(generateCss(lc), '#io-ox-login-screen')))

    // apply custom css
    $('head').append($('<style data-src="login-page-configuration-custom" type="text/css">').text(util.scopeCustomCss(lc.customCss, '#io-ox-login-screen')))
  }

  function getLoginConfiguration (options) {
    const lc = deepExtend({}, getDefaultConfiguration(), sc.loginPage, _.device('smartphone') && sc.loginPage?.mobile, options)
    lc.header.title = (lc.form && lc.form.header && lc.form.header.title) || sc.productName
    return lc
  }

  function getDefaultConfiguration () {
    return {
      header: {
        sorting: '$logo,$spacer,$language'
      },
      footer: {
        sorting: '$spacer,$copyright,Version $version,$privacy,$imprint,$spacer',
        $privacy: 'https://www.open-xchange.com/privacy/',
        $imprint: 'https://www.open-xchange.com/legal/',
        copyright: '(c) $year OX Software GmbH'
      }
    }
  }

  const loginType = _.url.hash('login_type')
  const loginLocation = ox.serverConfig.loginLocation
  let showContinue = false

  switch (loginType) {
    case 'guest':
    case 'message_continue':
      displayMessageContinue()
      showContinue = true
      break

    // show guest login
    case 'guest_password':
      guestLogin()
      break

    // show anonymous login
    case 'anonymous_password':
      anonymousLogin()
      break

    case 'reset_password':
      resetPassword()
      break

    case 'message':
      displayMessageOnly()
      break

    default:
      // at this point we know that a "normal" (i.e. non-guest) login is required
      // therefore we finally check if a custom login location is set
      if (loginLocation && loginLocation !== '') return util.gotoSignin()
      defaultLogin()
      break
  }

  const redeem = function (lang) {
    http.GET({
      module: 'share/redeem/token',
      params: { token: _.url.hash('token'), language: lang },
      appendSession: false,
      processResponse: false
    }).done(function (data) {
      if (data.message_type === 'ERROR') {
        util.feedback('error', data.message)
      } else {
        $('#io-ox-login-help').text(data.message)
      }
      if (showContinue) displayContinue(data)
    })
      .fail(function (e) {
        util.feedback('error', e.error)
        if (showContinue) hideFormElements()
      })
  }

  // handle message params
  if (_.url.hash('token')) {
    ox.on('language', redeem)
  }

  // set language select to link color defined by the given configuration
  const lc = getLoginConfiguration()

  // update header
  $('#io-ox-login-header-prefix').text(`${sc.pageHeaderPrefix || '\u00A0'} `).removeAttr('aria-hidden')
  $('#io-ox-login-header-label').text(sc.pageHeader || '\u00A0').removeAttr('aria-hidden')

  // update footer
  const revision = 'revision' in sc ? sc.revision : `Rev${ox.revision}`
  const footer = [sc.copyright, sc.version && `Version: ${sc.version}`, revision, sc.buildDate].filter(Boolean).join(' ')
  $('#io-ox-copyright').text(footer.replace(/\(c\)/i, '\u00A9'))

  // check/uncheck?
  const box = $('#io-ox-login-store-box')
  const cookie = _.getCookie('staySignedIn')

  if (cookie !== undefined) {
    box.prop('checked', cookie === 'true')
  } else if ('staySignedIn' in sc) {
    box.prop('checked', !!sc.staySignedIn)
  }
  box.on('change', function () {
    _.setCookie('staySignedIn', $(this).prop('checked'))
  })

  // update productname in password reset dialog
  $('#io-ox-password-forget-form .help-block').text(
    // #. %1$s is the product name, e.g. OX App Suite
    gt('Please enter your email address associated with %1$s. You will receive an email that contains a link to reset your password.', lc.header.title)
  )

  util.debug('Set default locale')

  return Promise.all([
    manifests.manager.loadPluginsFor('signin'),
    locale.setDefaultLocale()
  ])
    .finally(function () {
      // autologout message
      if (_.url.hash('autologout')) {
        util.feedback('info', function () {
          return $.txt(gt('You have been automatically signed out'))
        })
      }

      // handle browser support
      support()

      util.debug('Fade in ...')

      if ($('#showstopper').is(':visible')) return

      $('#background-loader').fadeOut(util.DURATION, function () {
        // show login dialog
        $('#io-ox-login-blocker').on('mousedown', false)
        if (bindLogin) $('#io-ox-login-form').on('submit', login)
        $('#io-ox-login-username').prop('disabled', false)
        // focus password or username
        $($('#io-ox-login-username').is(':hidden') ? '#io-ox-login-password' : '#io-ox-login-username').focus().select()
      })
    })
};
