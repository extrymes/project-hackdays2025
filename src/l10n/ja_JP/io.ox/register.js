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

import _ from '@/underscore'

import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import collation from '@/l10n/ja_JP/io.ox/collation'
import { settings } from '@/io.ox/core/settings'
import '@/l10n/ja_JP/io.ox/style.css'

// Edit dialog
ext.point('io.ox/contacts/edit/view').extend({
  index: 'last',
  id: 'furigana',
  render () {
    // auto-complete for furigana fields?
    if (!settings.get('features/furiganaAutoComplete', false)) return
    watchKana(
      this.$('input[name="last_name"]'),
      this.$('input[name="yomiLastName"]')
    )
    watchKana(
      this.$('input[name="first_name"]'),
      this.$('input[name="yomiFirstName"]')
    )
    watchKana(
      this.$('input[name="company"]'),
      this.$('input[name="yomiCompany"]')
    )
  }
})

function watchKana ($field, $yomiField) {
  // Because of the high interval frequency, use DOM nodes directly.
  const field = $field.get(0); const yomiField = $yomiField.get(0)

  if (!field || !yomiField) return

  // Catch kana when it is entered, before the IME converts it to kanji.
  let interval
  $field.on({
    focus () {
      interval = setInterval(intervalHandler, 200)
    },
    blur () {
      if (interval !== undefined) {
        clearInterval(interval)
        interval = undefined
      }
      $yomiField.trigger('change')
    }
  })

  /* last updated value
   * lv is not updated when inserting non-kana
   * characters, e. g. when typing the first
   * letter of a kana character using romaji.
   */
  let lv = field.value

  // length of last prefix and last suffix (boundaries of the current word in lv)
  let lp = 0; let ls = 0

  // previous value (always updated, used to wait for changes)
  let v0 = lv

  // length of the current word in yomiField
  let yl = 0

  function intervalHandler () {
    const v = field.value
    if (v === v0) return
    v0 = v

    if (!v) {
      yomiField.value = ''
      yl = 0
      lv = ''
      lp = 0
      ls = 0
      return
    }

    // compute length of unchanged prefix in p
    let p = 0; const l = v.length; const ll = lv.length
    // eslint-disable-next-line no-empty
    for (; p < l && p < ll && v.charAt(p) === lv.charAt(p); p++) {}

    // compute length of unchanged suffix in s
    let s = 0; let a = l; let b = ll
    // eslint-disable-next-line no-empty
    for (; a > p && b > p && v.charAt(--a) === lv.charAt(--b); s++) {}

    if (p + s === ll) { // if inserting (i. e. typing)
      if (p < lp || s < ls) { // if outside of the previous word
        // set new word
        lp = p
        ls = s
        yl = 0
      }
      if (getKana(v.substring(p, l - s))) { // if inserting kana
        lv = v
        // update current word in yomiField
        const kana = getKana(v.slice(lp, l - ls))
        const yv = yomiField.value
        yomiField.value = yv.slice(0, yv.length - yl) + kana
        yl = kana.length
      }
    } else { // else selecting a kanji alternative
      lv = v
      // reset current word, i. e. lp + ls = ll
      lp = lv.length // next word will probably be at the end
      ls = 0
      yl = 0
    }
  }

  function getKana (value) {
    const kana = []
    for (let i = 0; i < value.length; i++) {
      let c = value.charCodeAt(i)

      // convert hiragana to katakana
      if (c >= 0x3041 && c <= 0x309e) c += 0x60

      // copy only katakana (and hiragana "yori")
      if ((c >= 0x309f && c <= 0x30ff) || // katakana
          (c >= 0x31f0 && c <= 0x31ff) || // katakana phonetic extensions
          (c >= 0xff61 && c <= 0xff9f)) { // halfwidth katakana
        kana.push(c)
      }
    }
    return String.fromCharCode.apply(String, kana)
  }
}

// Search

ext.point('io.ox/contacts/api/search').extend({
  id: 'furigana',
  getData () {
    if (this.last_name) this.yomiLastName = this.last_name
    if (this.first_name) this.yomiFirstName = this.first_name
    if (this.company) this.yomiCompany = this.company
  }
})

// VGrid

const /* exceptions = { 0x3094: 0x3046, 0x3095: 0x304b, 0x3096: 0x3051,
            0x309f: 0x3088, 0x30f4: 0x30a6, 0x30f5: 0x30ab, 0x30f6: 0x30b1,
            0x30ff: 0x30b3, 0x31f0: 0x30af, 0x31f1: 0x30b7, 0x31f2: 0x30b9,
            0x31f3: 0x30c8, 0x31f4: 0x30cc, 0x31f5: 0x30cf, 0x31f6: 0x30d2,
            0x31f7: 0x30d5, 0x31f8: 0x30d8, 0x31f9: 0x30d8, 0x31fa: 0x30e0,
            0x31fb: 0x30e9, 0x31fc: 0x30ea, 0x31fd: 0x30eb, 0x31fe: 0x30ec,
            0x31ff: 0x30ed },
        ranges = [0x304a, 0x3054, 0x305e, 0x3069, 0x306e,
                  0x307d, 0x3082, 0x3088, 0x308d],
        */
  letters = [
    0x3042, 0x304b, 0x3055, 0x305f, 0x306a,
    0x306f, 0x307e, 0x3084, 0x3089, 0x308f
  ]
const kana = _.map(letters, function (c) { return String.fromCharCode(c) })

// add japanese labels and thumbindex only if locale is set to japanese
// this file is also loaded for other languages if the setting io.ox/contacts/features/furigana is set to true
if (ox.locale === 'ja_JP') {
  ext.point('io.ox/contacts/getLabel').extend({
    id: 'furigana',
    getLabel (data) {
      // var c = (data.sort_name || '').slice(0, 1)
      //         .toUpperCase().charCodeAt(0);
      // // special handling of kana characters
      // if (c >= 0x3040 && c < 0x3100) {
      //     c = exceptions[c] || c;

      //     // convert katakana to hiragana
      //     if (c >= 0x30a1 && c <= 0x30fe) c -= 0x60;

      //     // find the hiragana which represents the entire range
      //     c = letters[_.sortedIndex(ranges, c)];
      // }
      // return String.fromCharCode(c);

      const c = String(data.sort_name || '').substr(0, 1).toUpperCase()
      // empty? (append at end, therefore A～Z)
      if (c === '') return 'A～Z'
      // kana?
      if (collation.isKana(c)) return collation.getKanaLabel(c)
      // latin?
      if (/^[A-ZÄÖÜ]/.test(c)) return 'A～Z'
      // other!
      return 'その他'
    }
  })

  ext.point('io.ox/contacts/thumbIndex').extend({
    index: 200,
    id: 'furigana',
    getIndex (baton) {
      const keys = _(baton.labels).keys()
      // get ASCII without latin
      const hasOther = _(keys).any(function (char) { return char === 'その他' })
      // get all latin keys A-Z plus umlauts
      const hasLatin = _(keys).any(function (char) { return char === 'A～Z' })
      // add thumb index for other characters
      const otherThumb = new baton.Thumb({
        label: 'その他',
        text: 'その他',
        enabled () { return hasOther }
      })
      // add thumb index for ABC
      const abcThumb = new baton.Thumb({
        label: 'A～Z',
        text: 'A～Z',
        enabled () { return hasLatin }
      })

      baton.data = _.map(kana, baton.Thumb)

      // restrict to collapsed version, just kana, other, ABC.
      baton.data.push(otherThumb, abcThumb)
    }
  })
}
