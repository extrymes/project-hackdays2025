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

import categories from '@/io.ox/emoji/categories'
import conversions from '@/io.ox/emoji/conversions'
import { settings } from '@/io.ox/mail/settings'

const emoji = {}

// ext.point('3rd.party/emoji/editor_css').extend({
//     id: 'unified/icons',
//     css: '3rd.party/emoji/emoji.css'
// });

function parseCollections () {
  // TODO: may be, filter the list for collections, we support in the frontend
  const e = settings.get('emoji/availableCollections', '')
  return _(e.split(','))
    .chain()
    .map(function (collection) {
      return collection.trim()
    })
    .compact()
    .value()
}

function parseUnicode (str) {
  // fix number emojis and flags (&#x doesn’t work with to large numbers)
  // may be, there is a better way to calculate the utf-8 code from the number
  if (str.length === 6) {
    return parseUnicode(str.substr(0, 2)) + parseUnicode(str.substr(2))
  }
  if (str.length === 10) {
    return parseUnicode(str.substr(0, 5)) + parseUnicode(str.substr(5))
  }

  const unicode = '&#x' + str + ';'
  // transform unicode html entity to text
  return $('<div>').html(unicode).text()
}

function escape (s) {
  return window.escape(s).replace(/%u/g, '\\u').toLowerCase()
}

// introduce Emoji class
function Emoji (opt) {
  opt = opt || {}

  // plain data API
  this.icons = []
  this.collections = parseCollections()
  this.category_map = {}

  // make settings accessible, esp. for editor plugin
  this.settings = settings

  const defaultCollection = settings.get('emoji/defaultCollection', this.collections[0])
  this.currentCollection = opt.collection || settings.get('emoji/userCollection', defaultCollection)

  this.createCategoryMap()
}

_.extend(Emoji.prototype, {

  iconInfo (unicode) {
    const mapping = emoji.EMOJI_MAP[unicode]

    if (!unicode || !mapping || !mapping[1] || !mapping[2]) return

    return {
      css: this.cssFor(unicode),
      unicode,
      desc: mapping[1],
      category: this.category_map[unicode]
    }
  },

  cssFor (unicode) {
    const icon = emoji.EMOJI_MAP[unicode]

    if (!this.category_map[unicode] || !icon) {
      return undefined
    }

    // TODO: move this to softbank emoji app
    if (this.currentCollection === 'softbank' || this.currentCollection === 'japan_carrier') {
      return 'emoji-' + this.currentCollection + ' sprite-emoji-' + icon[5][1].substring(2).toLowerCase()
    }

    return 'emoji-' + this.currentCollection + ' emoji' + icon[2]
  },

  // add to "recently used" category
  recent (unicode) {
    const recently = settings.get('emoji/recently', {})
    // encode unicode to avoid backend bug
    const key = escape(unicode)

    if (key in recently) {
      recently[key].count++
      recently[key].time = _.now()
    } else {
      recently[key] = { count: 1, time: _.now() }
    }

    settings.set('emoji/recently', recently).save()
  },

  getRecently () {
    return _(categories[this.currentCollection].meta).find(function (cat) {
      return cat.name === 'recently'
    }) || categories.recently
  },

  resetRecent () {
    settings.set('emoji/recently', {}).save()
  },

  iconsForCategory (category) {
    if (category === 'recently') {
      const recently = settings.get('emoji/recently', {})

      return _(this.icons)
        .chain()
      // get relevant icons
        .filter(function (icon) {
          // encode unicode to avoid backend bug
          const key = escape(icon.unicode)
          return key in recently && !!icon.category
        })
        .map(function (icon) {
          const key = escape(icon.unicode)
          return [icon, recently[key]]
        })
      // sort by timestamp
        .sortBy(function (array) {
          return 0 - array[1].time
        })
      // get first 40 icons (5 rows; 8 per row)
        .first(40)
      // now sort by frequency (descending order)
        .sortBy(function (array) {
          return array[1].count
        })
      // extract the icon
        .pluck(0)
        .value()
        .reverse()
    }

    return _(this.icons).filter(function (icon) {
      return icon.category === category
    })
  },

  getCategories () {
    // return copy
    return (categories[this.currentCollection].meta || []).slice()
      .filter(function (cat) {
        return cat.name !== 'recently'
      })
  },

  getDefaultCategory () {
    return (_(this.getCategories()).first() || {}).name
  },

  hasCategory (category) {
    return _(categories[this.currentCollection].meta).chain().pluck('name').indexOf(category).value() > -1
  },

  getTitle (id) {
    return categories.translations[id]
  },

  setCollection (collection) {
    if (!_(this.collections).contains(collection)) return

    this.currentCollection = collection
    settings.set('emoji/userCollection', collection).save()
    this.createCategoryMap()
  },

  getCollection () {
    return this.currentCollection
  },

  createCategoryMap () {
    const cat = categories[this.currentCollection]

    // "invert" the categories object
    this.category_map = _.object(
      _(cat).chain().values().flatten(true).value(),
      _(cat)
        .chain()
        .pairs()
        .map(function (item) {
          const category = item[0]
          return _(item[1]).map(function () {
            return category
          })
        })
        .flatten(true)
        .value()
    )

    // get icons based on emoji map
    // while keeping proper icon order
    this.icons = _(cat)
      .chain()
      .values()
      .flatten(true)
      .map(this.iconInfo, this)
      .compact()
      .value()
  }
})

export default _.extend({

  getInstance (opt) {
    return new Emoji(opt)
  },

  // HTML related API
  unifiedToImageTag (text, options) {
    let pos
    let oldpos = -1
    const searchText = '<span class="emoji'
    const self = this

    options = options || {}

    if (options.forceEmojiIcons !== true && _.device('emoji')) {
      return text
    }

    text = emoji.unifiedToHTML(text)
    const isFalsyString = function (item) {
      return item.trim()
    }
    const cssFromCollection = function (unicode) {
      return function (c) {
        return self.getInstance({ collection: c }).cssFor(unicode)
      }
    }
    const createImageTag = function (css, unicode) {
      return $('<div>').append(
        $('<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="emoji ' + css + '">')
          .attr({
            'data-emoji-unicode': unicode,
            'data-mce-resize': 'false',
            alt: unicode
          })
      ).html()
    }

    while (text.indexOf(searchText, oldpos + 1) >= 0 && oldpos < text.indexOf(searchText, oldpos + 1)) {
      pos = text.indexOf(searchText, oldpos + 1)
      oldpos = pos

      let endpos = text.indexOf('>', pos) + 1
      const node = $('<div>').append(
        text.slice(pos, endpos)
      )
      // parse unicode number
      const unicode = parseUnicode(_.find(node.find('span').attr('class').split('emoji'), isFalsyString))
      let css = null
      const defaultCollection = self.getInstance()

      if (!unicode) {
        continue
      }

      if (!settings.get('emoji/overrideUserCollection', false)) {
        css = defaultCollection.cssFor(unicode)
      }
      css = css || defaultCollection.collections.map(cssFromCollection(unicode))
        .filter(_.isString)[0]

      if (text.substr(endpos, 7) === '</span>') {
        endpos += 7
      }
      const regex = new RegExp(text.slice(pos, endpos) + '(?=[^<]*?>)', 'g')
      text = text
      // Replace with unicode character if match is not in content (but within a html tag) (See Bugs: 36796 and 49981)
        .replace(regex, unicode)
      // Replace with unicode character again if match is in content
        .replace(text.slice(pos, endpos), createImageTag(css, unicode))
    }

    return text
  },

  imageTagsToUnified (html) {
    const node = $('<div>').append(html)

    node.find('img[data-emoji-unicode]').each(function () {
      $(this).replaceWith($(this).attr('data-emoji-unicode'))
    })

    return node.html()
  },

  imageTagsToPUA (text) {
    let pos
    let oldpos = -1

    while (text.indexOf('<img ', oldpos + 1) >= 0 && oldpos < text.indexOf('<img ', oldpos + 1)) {
      pos = text.indexOf('<img ', oldpos + 1)
      oldpos = pos

      const node = $('<div>').append(
        text.slice(pos, text.indexOf('>', pos) + 1)
      )
      let unicode = node.find('img').attr('data-emoji-unicode')

      if (!unicode) {
        continue
      }
      const info = emoji.EMOJI_MAP[unicode]
      let converted

      if (info && info[5] && info[5][0] !== '-') {
        converted = info[5][0]
      }
      // convert to PUA or leave as is
      unicode = converted || unicode
      text = text.replace(node.html(), unicode)
    }

    return text
  },

  converterFor (options, defaultFormat) {
    const self = this
    defaultFormat = defaultFormat || 'html'

    options = _.extend({
      from: 'unified',
      to: 'unified'
    }, options)

    if (options.from === options.to) {
      return _.identity
    } else if (options.from === 'unified' && options.to === 'pua') {
      return function (text, format) {
        return self.imageTagsToPUA(self.unifiedToImageTag(text, {
          forceEmojiIcons: true
        }), format || defaultFormat)
      }
    } else if (options.from === 'all' && options.to === 'unified') {
      return function (text) {
        text = text || ''
        text = self.softbankToUnified(text)
        text = self.jisToUnified(text)
        return text
      }
    }
  },

  sendEncoding () {
    return settings.get('emoji/sendEncoding', 'unified')
  }
}, conversions, emoji)
