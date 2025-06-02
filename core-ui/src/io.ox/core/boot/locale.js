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

import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import { gt } from 'gettext'
import { changeLanguage } from '@/gettext'
import util from '@/io.ox/core/boot/util'
import meta from '@/io.ox/core/locale/meta'

let selectedLocale

export default {
  async change (locale) {
    // if the user sets a language on the login page, it will be used for the rest of the session, too
    const language = meta.deriveSupportedLanguageFromLocale(locale)
    await changeLanguage(language)
    $('html').attr('lang', language.split('_')[0])
    // get all nodes
    $('[data-i18n]').each(function () {
      const node = $(this)
      const translations = node.data('translations') || {}
      const val = translations[locale] || translations.en_US || gt(node.attr('data-i18n'))
      const hrefTranslations = node.data('href-translations') || {}
      const hrefVal = hrefTranslations[locale] || hrefTranslations.en_US || gt(node.attr('data-i18n-href'))
      const target = (node.attr('data-i18n-attr') || 'text').split(',')

      if (node.is('a') && hrefVal) target.push('anchor')

      if (ox.debug && !val && !hrefVal) console.error('No translation found for node ', node)
      _.each(target, function (el) {
        switch (el) {
          case 'value':
            node.val(val)
            break
          case 'text':
            node.text(val)
            break
          case 'label':
            node.contents().get(-1).nodeValue = val
            break
          case 'anchor':
            node.attr('href', hrefVal)
            break
          case 'html':
            node.empty().append(val)
            break
          default:
            node.attr(el, val)
            break
        }
      })
    })
    ox.locale = locale
    ox.language = language
    _.setCookie('locale', locale)
    // update error message in index.html
    document.documentElement.dispatchEvent(new Event('languageChange'))
  },

  getCurrentLocale () {
    return selectedLocale || ox.locale || 'en_US'
  },

  getSelectedLocale () {
    return selectedLocale
  },

  setDefaultLocale () {
    return this.change(meta.getValidDefaultLocale())
  },

  changeByUser (id) {
    if (!id) return
    this.change(id)
    selectedLocale = id
  },

  render (dropup) {
    const locales = meta.getSupportedLocales()
    const node = $('#io-ox-languages')
    const count = _.size(locales)
    const maxCount = 100
    const languageToTag = function (language) { return language.replace(/_/, '-') }

    // show languages if more than one
    if (count > 1) {
      util.debug('Render locales', locales)

      const changeByUser = this.changeByUser.bind(this)
      const defaultLocale = meta.getValidDefaultLocale()
      const caret = $('<span class="caret">')
      const toggle = $('<a href="#" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">').append(
        $('<span class="sr-only" data-i18n="Language:" data-i18n-attr="text">'),
        $('<span class="toggle-text">').attr('lang', languageToTag(defaultLocale)).text(meta.getLocaleName(defaultLocale)),
        dropup ? caret.css('transform', 'rotate(180deg)') : caret
      )
      const list = $('<ul id="io-ox-language-list" class="dropdown-menu" role="menu" data-i18n="Languages" data-i18n-attr="aria-label">')
      const label = $('<a href="#" role="button" class="lang-label" id="io-ox-languages-label" data-i18n="Language:" data-i18n-attr="text" aria-hidden="true" tabindex="-1">')

      // Display native select box for locales if there are up to 'maxLang' locales
      if (count < maxCount && !_.url.hash('language-select') && _.device('!smartphone')) {
        const dropdown = new Dropdown({
          $ul: list,
          $toggle: toggle,
          dropup
        })

        node.append(
          label,
          dropdown.render().$el
        )

        list.append(
          _(locales).map(function (locale) {
            return $('<li role="presentation">').append(
              $('<a href="#" role="menuitem">').attr({
                lang: languageToTag(locale.id),
                'data-value': locale.id
              })
                .text(locale.name)
            )
          })
        )

        list.on('click', 'a', function (e) {
          const node = $(e.target); const value = node.attr('data-value')
          e.preventDefault()
          changeByUser(value)
          $(e.delegateTarget).find('.toggle-text').text(meta.getLocaleName(value)).attr('lang', languageToTag(value))
        })

        label.on('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); dropdown.open() })

        // init dropdown
        // toggle.dropdown()
      } else {
        const updateWidth = function () {
          $('#language-spacer').text($('#language-select')[0].selectedOptions[0].text)
          const width = ($('#language-spacer').width() + 24) + 'px'
          $('#language-select').css('width', width)
        }

        node.append(
          $('<label for="language-select" class="lang-label" data-i18n="Languages" data-i18n-attr="text">'),
          $('<div style="display: inline-block; position: relative;">').append(
            $('<select id="language-select">')
              .on('change', function (e) {
                this.changeByUser($(e.target).val())
                updateWidth()
              }.bind(this))
              .append(
                _(locales).map(function (locale) {
                  return $('<option>').attr({
                    lang: languageToTag(locale.id),
                    'data-value': locale.id,
                    value: locale.id
                  }).text(locale.name)
                })
              )
              .val(defaultLocale),
            $('<div style="position: absolute; top: 0; left: 0; pointer-events: none;">').append(
              $('<span id="language-spacer" style="visibility: hidden; white-space: nowrap;">')
            )
          )
        )
        updateWidth()
      }
    } else {
      node.remove()
    }
  }
}
