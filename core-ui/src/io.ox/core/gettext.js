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

// custom dictionary
const custom = { '*': {} }
// To allow custom dictionaries, core plugins may not call gettext functions
// during initialization.
let enabled = ox.signin; const enableDef = $.Deferred()
if (enabled) enableDef.resolve()

// optionally expand format parameters, add translation markers for debug mode
const format = _.url.hash('debug-i18n')
  ? function (pattern, args) {
    if (args.length) {
      args = args.map(function (arg) { return _.isString(arg) ? _.noI18n.fix(arg) : arg })
      pattern = _.printf(pattern, args)
    }
    return '\u200b' + pattern + '\u200c'
  }
  : function printf (pattern, args) {
    return args.length ? _.printf(pattern, args) : pattern
  }

function gt (id, po) {
  /* eslint no-new-func: 0 */
  po.plural = new Function('n', 'return ' + po.plural + ';')

  // returns an entry from the database
  function get (context, text) {
    // assert(enabled, 'Early gettext call: ' + JSON.stringify(text) + '. This string cannot be replaced by custom translations.')
    const key = context ? context + '\x00' + text : text
    if (key in custom['*']) return custom['*'][key]
    if (id in custom && key in custom[id]) return custom[id][key]
    return po.dictionary[key]
  }

  // returns an entry of a plural form from the database
  function nget (context, singular, plural, count) {
    const translation = get(context, singular + '\x01' + plural)
    if (translation) return translation[Number(po.plural(Number(count)))]
    return (Number(count) !== 1) ? plural : singular
  }

  // the "gettext" function returned for the passed language
  function gettext (text /* , ...args */) {
    const str = get('', text) || text
    return format(str, _.rest(arguments))
  }

  gettext.gettext = function (/* text, ...args */) {
    return gettext.apply(null, arguments)
  }

  gettext.pgettext = function (context, text /* , ...args */) {
    const str = get(context, text) || text
    return format(str, _.rest(arguments, 2))
  }

  gettext.ngettext = function (singular, plural, count /* , ...args */) {
    const str = nget('', singular, plural, count)
    return format(str, _.rest(arguments, 3))
  }

  gettext.npgettext = function (context, singular, plural, count /* , ...args */) {
    const str = nget(context, singular, plural, count)
    return format(str, _.rest(arguments, 4))
  }

  gettext.getDictionary = function () {
    return po.dictionary
  }

  // backwards compatibility: export `noI18n` through the gettext function
  gettext.noI18n = _.noI18n

  return gettext
}

// probably we can clean that up here since we now have "ox.language/locale" right from the start
const lang = new $.Deferred()

gt.setLanguage = function (language) {
  return lang.resolve(language)
}

gt.language = lang.promise()

// add custom translation
gt.addTranslation = function (dictionary, key, value) {
  if (!custom[dictionary]) custom[dictionary] = {}
  if (_.isString(key)) {
    custom[dictionary][key] = value
  } else {
    _(key).each(function (value, key) {
      custom[dictionary][key] = value
    })
  }
  return this
}

gt.enable = function () {
  enabled = true
  enableDef.resolve()
}

gt.enabled = enableDef.promise()

// DOM debugging
if (_.url.hash('debug-i18n')) {
  (function () {
    function isTranslated (text) {
      return (/^(\u200b[^\u200b\u200c]*\u200c|\s*)$/).test(text)
    }

    function isDoubleTranslated (text) {
      return (/^\u200b\u200b.+\u200c\u200c$/).test(text)
    }

    function debugAttr (e) {
      if (e.originalEvent.attrName in { title: 1, value: 1 }) {
        verify(e.originalEvent.newValue, e.target)
      }
    }

    function debugData (e) {
      verify(e.originalEvent.newValue, e.target)
    }

    function debugNode (e) {
      if (e.target.tagName in { SCRIPT: 1, STYLE: 1 }) return
      debug(e.target)
      function debug (node) {
        if (node.nodeType === 3) {
          verify(node.data, node.parentNode)
        } else if (node.nodeType === 1) {
          _.each(node.childNodes, debug)
        }
      }
    }

    function verify (s, node) {
      if (isTranslated(s) || $(node).closest('.noI18n').length) return
      console.error(isDoubleTranslated(s) ? 'Double translated string' : 'Untranslated string', s, encodeURIComponent(s), node)
      $(node).css('backgroundColor', 'rgba(255, 192, 0, 0.5)')
    }

    try {
      $(document).on('DOMAttrModified', debugAttr)
        .on('DOMCharacterDataModified', debugData)
        .on('DOMNodeInserted', debugNode)
    } catch (e) {
      console.error(e)
    }
  }())
}

export default {
  setLanguage: gt.setLanguage,
  enable: gt.enable,
  pgettext: gt('io.ox/core', {})
}
