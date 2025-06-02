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

// cSpell:ignore dakuten, handakuten

import _ from '@/underscore'

// helper for half width katakana
// I really don't know who came up with this encoding style
const dakuten = 'ﾞ ゙ ゛'.split(' ')
const handakuten = 'ﾟ ﾟ ゜'.split(' ')
// only katakana that can have dakuten or handakuten
const halfWidthKana = 'ｳ ｴ ｵ ｶ ｷ ｸ ｹ ｺ ｻ ｼ ｽ ｾ ｿ ﾀ ﾁ ﾂ ｯ ﾃ ﾄ ﾊ ﾋ ﾌ ﾍ ﾎ ﾜ ｦ'.split(' ')
// delimiter for concatenating lastName, firstName
const sortDelimiter = '_'

// raw alphabet data ( super fragile stuff, don't change order etc )
// see http://en.wikipedia.org/wiki/Goj%C5%ABon
// or http://en.wikipedia.org/wiki/Japanese_writing_system#Collation
// and for half width kana https://en.wikipedia.org/wiki/Half-width_kana
const tableau = [
  // Hiragana, Hiragana small, Katakana, Katakana half-width, , Katakana small, Hiragana with dakuten, Katakana with dakuten, Hiragana with handakuten, Katakana with handakuten
  [
    'あ ぁ ア ｱ ァ', // a
    'い ぃ イ ｲ ィ', // i
    'う ぅ ウ ｳ ゥ ゔ ヴ ｳﾞ', // u, vu
    'え ぇ エ ｴ ェ', // e
    'お ぉ オ ｵ ォ' // o
  ], [
    'か ゕ カ ｶ ヵ が ガ ｶﾞ', // ka, ga
    'き キ ｷ ぎ ギ ｷﾞ', // ki, gi
    'く ク ｸ ㇰ ぐ グ ㇰﾞ', // ku, gu
    'け ゖ ケ ｹ ヶ げ ゲ ｹﾞ', // ke, ge
    'こ コ ｺ ご ゴ ｺﾞ' // ko, go
  ], [
    'さ サ ｻ ざ ザ ｻﾞ', // sa, za
    'し シ ｼ ㇱ じ ジ ｼﾞ', // shi, ji
    'す ス ｽ ㇲ ず ズ ｽﾞ', // su ,zu
    'せ セ ｾ ぜ ゼ ｾﾞ', // se, ze
    'そ ソ ｿ ぞ ゾ ｿﾞ' // so, zo
  ], [
    'た タ ﾀ だ ダ ﾀﾞ', // ta, da
    'ち チ ﾁ ぢ ヂ ﾁﾞ', // chi, ji
    'つ っ ツ ﾂ ッ ｯ づ ヅ ﾂﾞ ｯﾞ', // tsu, zu ( note: there is a small half-width katakana character for tsu)
    'て テ ﾃ で デ ﾃﾞ', // te, de
    'と ト ﾄ ㇳ ど ド ﾄﾞ' // to, do
  ], [
    'な ナ ﾅ', // na
    'に ニ ﾆ', // ni
    'ぬ ヌ ﾇ ㇴ', // nu
    'ね ネ ﾈ', // ne
    'の ノ ﾉ' // no
  ], [
    'は ハ ﾊ ㇵ ば バ ﾊﾞ ぱ パ ﾊﾟ', // ha, ba, pa
    'ひ ヒ ﾋ ㇶ び ビ ﾋﾞ ぴ ピ ﾋﾟ', // hi, bi, pi
    'ふ フ ﾌ ㇷ ぶ ブ ﾌﾞ ぷ プ ﾌﾟ', // fu , bu, pi
    'へ ヘ ﾍ ㇸ べ ベ ﾍﾞ ぺ ペ ﾍﾟ', // he, be, pe
    'ほ ホ ﾎ ㇹ ぼ ボ ﾎﾞ ぽ ポ ﾎﾟ' // ho, bo, po
  ], [
    'ま マ ﾏ', // ma
    'み ミ ﾐ', // mi
    'む ム ﾑ ㇺ', // mu
    'め メ ﾒ', // me
    'も モ ﾓ' // mo
  ], [
    // ('yi' and 'ye' do not exist)
    'や ゃ ヤ ﾔ ャ', // ya
    'ゆ ゅ ユ ﾕ ュ', // yu
    'よ ょ ヨ ﾖ ョ' // yo
  ], [
    'ら ラ ﾗ ㇻ', // ra
    'り リ ﾘ ㇼ', // ri
    'る ル ﾙ ㇽ', // ru
    'れ レ ﾚ ㇾ', // re
    'ろ ロ ﾛ ㇿ' // ro
  ], [
    // ('wi' and 'we' are nearly obsolete. 'wu' does not exist. 'n' is an additional kana)
    'わ ゎ ワ ﾜ ヮ ヷ ﾜﾞ', // wa, va
    'ゐ ヰ ヸ', // wi
    'ゑ ヱ ヹ', // we
    'を ヲ ｦ ヺ', // wo
    'ん ン ﾝ' // n
  ]
]
const hash = {}
const label = {} // first column of all rows
let position = 0
const index = []
const isABC = /^[a-zäöü]/i

// put spaces (full-width and half-width) in the first.
hash[' '] = position
hash['　'] = position++

// construct some meta data we need for sorting
_(tableau).each(function (row) {
  index.push(row[0][0])
  // kana with same sound have the same sort position
  _(row).each(function (sound) {
    _(sound.split(' ')).each(function (char) {
      hash[char] = position
      label[char] = row[0][0]
    })
    position++
  })
})
const keys = _(label).keys()

// dakuten and handakuten are written after the katakana they belong to, if the katakana is a half width katakana. (think of umlauts with the dots after the character)
const isHalfWidthWithDakutenOrHandakuten = function (char, sortName) {
  if (char && sortName && halfWidthKana.indexOf(char) !== -1) {
    // see if the next letter is a dakuten or handakuten
    if (sortName[1] && dakuten.indexOf(sortName[1]) !== -1) {
      char = char + dakuten[0]
    }
    if (sortName[1] && handakuten.indexOf(sortName[1]) !== -1) {
      char = char + handakuten[0]
    }
  }
  return char
}

// the sorter
// order is: Kana, Other, Latin, Empty
// prefer is used if 2 names sound the same but use different kana (think of capital vs lower case letters)
const sorter = function (a, b, prefer) {
  /* eslint no-nested-ternary: 0 */
  const aSortName = a.sort_name
  const bSortName = b.sort_name
  // store the full length sort name so we can check if the whole sort name was empty
  const aFullSortName = a.fullSortName || aSortName
  const bFullSortName = b.fullSortName || bSortName

  a = a.sort_name[0]
  b = b.sort_name[0]

  // only relevant on first run
  if (aFullSortName === aSortName && bFullSortName === bSortName) {
    // empty last
    if ((a === undefined) && (b === undefined)) return 0
    if (a === undefined) return +1
    if (b === undefined) return -1

    // starting with delimiter counts as other so it comes after the kana
    if (a !== b && a === sortDelimiter && b in hash) return +1
    if (a !== b && b === sortDelimiter && a in hash) return -1
  }

  // check which is shorter
  if ((a === undefined) && (b === undefined)) return prefer || 0
  if (b === undefined || (b === sortDelimiter && a !== sortDelimiter && a !== undefined)) return +1
  if (a === undefined || (a === sortDelimiter && b !== sortDelimiter && b !== undefined)) return -1

  // sortDelimiter (usually '_') is between different parts of the sortName:yomi_last_name yomi_first_name, last_name firstName, email. If we already have a preference stop here
  if (prefer && (a === sortDelimiter || b === sortDelimiter)) return prefer

  // kana (first)
  if (a in hash && b in hash) {
    const tempA = a
    const tempB = b

    // see if this is a half width katakana
    a = isHalfWidthWithDakutenOrHandakuten(a, aSortName)
    b = isHalfWidthWithDakutenOrHandakuten(b, bSortName)

    // same kana sound? check the next
    if (hash[a] === hash[b]) {
      // same sound but different kana
      // set a preference which is used to determine a sort position if the name sounds exactly the same
      if (prefer === undefined && a !== b) {
        prefer = _(keys).indexOf(a) < _(keys).indexOf(b) ? -1 : 1
      }
      a = { sort_name: aSortName.slice(tempA === a ? 1 : 2), fullSortName: aFullSortName }
      b = { sort_name: bSortName.slice(tempB === b ? 1 : 2), fullSortName: bFullSortName }

      return sorter(a, b, prefer)
    }
    return (hash[a] - hash[b]) === 0 ? prefer || 0 : (hash[a] - hash[b])
  }

  // one kana the other is not
  if (a in hash) return -1
  if (b in hash) return +1

  // case-insensitive
  a = a.toUpperCase()
  b = b.toUpperCase()

  // same letter? check the next
  if (a === b) {
    a = { sort_name: aSortName.slice(1), fullSortName: aFullSortName }
    b = { sort_name: bSortName.slice(1), fullSortName: bFullSortName }
    return sorter(a, b, prefer)
  }
  let result
  // other (second: not kana / not latin)
  if (!isABC.test(a) && !isABC.test(b)) {
    result = a < b ? -1 : (a > b ? +1 : 0)
    return result === 0 ? prefer || 0 : result
  }
  if (!isABC.test(a)) return -1
  if (!isABC.test(b)) return +1

  // latin (third)
  result = a < b ? -1 : (a > b ? +1 : 0)
  return result === 0 ? prefer || 0 : result
}

// use when mail addresses should be used while sorting. Add them as mail attribute to a and b
// sorts names first like the standard sorter, checks mail addresses if names are different
const sorterWithMail = function (a, b) {
  if (a && a.email && b && b.email && a.sort_name_without_mail && b.sort_name_without_mail) {
    const sort = sorter({ sort_name: a.sort_name_without_mail }, { sort_name: b.sort_name_without_mail })

    if (sort !== 0) return sort

    return sorter({ sort_name: a.email }, { sort_name: b.email })
  }
  return sorter(a, b)
}

export default {

  sorter,
  sorterWithMail,
  index,

  // just checks if getKanaLabel() would be successful
  isKana (char) {
    return label[char] !== undefined
  },

  // actually looks in the tableau and returns the first char per row
  getKanaLabel (char) {
    return label[char] || ''
  }
}
