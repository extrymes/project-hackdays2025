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
import $ from '@/jquery'
import moment from '@open-xchange/moment'

import miniViews from '@/io.ox/backbone/mini-views/common'

import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings as calendarSettings } from '@/io.ox/calendar/settings'
import { settings as settingOptions } from '@/io.ox/core/settingOptions/settings'
import gt from 'gettext'

const TimezonePicker = miniViews.SelectView.extend({

  initialize (options) {
    options = options || {}
    if (options.showFavorites && calendarSettings.get('favoriteTimezones')) {
      options.favorites = _(calendarSettings.get('favoriteTimezones')).map(function (favorite) {
        return { label: getTimezoneData(favorite, true).label, value: favorite }
      })
    }
    options.list = getTimezones()
    miniViews.SelectView.prototype.initialize.call(this, options)
  },

  render () {
    this.$el.attr({ name: this.name })
    if (this.id) this.$el.attr({ id: this.id })
    _.defer(function () {
      // favorites
      if (this.options.favorites) {
        this.$el.append(
          this.renderOptions(this.options.favorites, $('<optgroup>').attr('label', gt('Favorites')))
        )
      }
      // system timezone
      const systemTimezone = getSystemTimeZone()
      if (systemTimezone && _(this.options.list).findWhere({ value: systemTimezone })) {
        this.$el.append(
          this.renderOptions(
            [getTimezoneData(systemTimezone, true)],
            $('<optgroup>').attr('label', gt('Local system timezone'))
          )
        )
      }
      // all timezones
      this.renderGroups()
      this.update()
    }.bind(this))
    return this
  },

  renderGroups () {
    this.$el.append(
      _(regionList)
        .chain()
        .map(function (region) {
          const list = _(this.options.list)
            .filter(function (zone) { return zone.region === region })
          if (!list.length) return $()
          return this.renderOptions(list, $('<optgroup>').attr('label', regions[region]))
        }, this)
        .flatten()
        .value()
    )
  },

  renderOptions (list, parent) {
    return parent.append(
      _(list).map(function (option) {
        return $('<option>').attr({ value: option.value }).text(option.label)
      }, this)
    )
  }
})

//
// Utility functions
//

const getTimezones = _.memoize(function () {
  return getAvailableTimezones().map(getTimezoneData).sort((a, b) => {
    const locationA = a.value.split('/').pop()
    const locationB = b.value.split('/').pop()
    if (locationA < locationB) return -1
    if (locationA > locationB) return 1
    return 0
  })
})

function getAvailableTimezones () {
  const serverSide = settingOptions.get('availableTimeZones', {})
  const current = coreSettings.get('timezone')
  return _(moment.tz.names()).filter(function (name) {
    // we can only offer timezones that are defined both server-side and client-side
    if (!serverSide[name]) return false
    // always include current timezone
    if (name === current) return true
    // Drop DEPRECATED zones
    // cp. https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
    if (/^Australia\/(ACT|LHI|North|NSW|Queensland|South|Tasmania|Victoria|West)$/.test(name)) return false
    if (/^(Brazil|Canada|Chile|Mexico|US)\//.test(name)) return false
    if (/^(CET|CST6CDT|Cuba|EET|Egypt|Eire|EST|EST5EDT|GB|GB-Eire|GMT+0|GMT0|GMT-0|Greenwich|Hongkong|HST)$/.test(name)) return false
    if (/^(Iceland|Iran|Israel|Jamaica|Japan|Kwajalein|Libya|MET|MST|MST7MDT|Navajo|NZ|NZ-CHAT)$/.test(name)) return false
    if (/^(Poland|Portugal|PRC|PST8PDT|ROC|ROK|Singapore|Turkey|UCT|Universal|WET|W-SU|Zulu)$/.test(name)) return false
    if (/^Etc\/(Greenwich|UCT|Universal|Zulu)$/.test(name)) return false
    // Drop ALIAS zones
    if (coreSettings.get('timezones/includeAlias', false)) return true
    // Africa
    if (/^Africa\/(Addis_Ababa|Asmara|Bamako|Bangui|Banjul|Blantyre|Brazzaville|Bujumbura|Conakry|Dakar)$/.test(name)) return false
    if (/^Africa\/(Dar_es_Salaam|Djibouti|Douala|Freetown|Gaborone|Harare|Kampala|Kigali|Kinshasa|Libreville)$/.test(name)) return false
    if (/^Africa\/(Lome|Luanda|Lubumbashi|Lusaka|Malabo|Maseru|Mbabane|Mogadishu|Niamey|Nouakchott|Ouagadougou|Porto-Novo|Sao_Tome|Timbuktu)$/.test(name)) return false
    // America
    if (/^America\/(Anguilla|Antigua|Argentina\/ComodRivadavia|Aruba|Atka|Buenos_Aires|Cayman|Cordoba|Dominica)$/.test(name)) return false
    if (/^America\/(Fort_Wayne|Grenada|Guadeloupe|Indianapolis|Jujuy|Knox_IN|Kralendijk|Louisville|Lower_Princes)$/.test(name)) return false
    if (/^America\/(Marigot|Mendoza|Montreal|Montserrat|Porto_Acre|Rosario|Santa_Isabel|Shiprock|St_Barthelemy|St_Kitts|St_Lucia|St_Thomas|St_Vincent|Tortola|Virgin)$/.test(name)) return false
    // Antarctica & Arctic
    if (/^Antarctica\/(McMurdo|South_Pole)$/.test(name)) return false
    if (/^Arctic\/Longyearbyen$/.test(name)) return false
    // Asia
    if (/^Asia\/(Aden|Ashkhabad|Bahrain|Calcutta|Chongqing|Chungking|Dacca|Istanbul|Kashgar|Kathmandu)$/.test(name)) return false
    if (/^Asia\/(Kuwait|Macao|Muscat|Phnom_Penh|Rangoon|Saigon|Tel_Aviv|Thimbu|Ujung_Pandang|Ulan_Bator|Vientiane)$/.test(name)) return false
    // Atlantic Ocean
    if (/^Asia\/(Faeroe|St_Helena)$/.test(name)) return false
    // Australia
    if (/^Australia\/(Canberra|Yancowinna)$/.test(name)) return false
    // Europe
    if (/^Europe\/(Belfast|Bratislava|Busingen|Guernsey|Isle_of_Man|Jersey|Ljubljana|Mariehamn|Podgorica|San_Marino|Sarajevo|Skopje|Tiraspol|Vaduz|Vatican|Zagreb)$/.test(name)) return false
    // Indian Ocean
    if (/^Indian\/(Antananarivo|Comoro|Mayotte)$/.test(name)) return false
    // Pacific Ocean
    if (/^Pacific\/(Johnston|Midway|Ponape|Saipan|Samoa|Truk|Yap)$/.test(name)) return false
    // otherwise
    return true
  })
}

function getTimezoneData (name, longFormat) {
  const tz = moment.tz(name)
  const offset = tz.format('Z')
  const abbr = tz.zoneAbbr()
  let label = name.replace(/_/g, ' ')
  // label / display name
  label = label.replace(/^(\w+)\//, longFormat === true ? replaceRegion : '')
  label += ` (${offset})`
  if (/^\w+$/.test(abbr) && abbr !== label) label += ` ${abbr}`
  // return data
  return { label, value: name, region: getRegion(name), offset, sort: tz.utcOffset() }
}

function getRegion (name) {
  const region = name.split('/')[0]
  if (/^(America|Atlantic|Europe|Africa|Indian|Asia|Australia|Pacific|Arctic|Antarctica)$/.test(region)) return region
  return 'Other'
}

function replaceRegion (all, region) {
  return (regions[region] || region) + '/'
}

function getSystemTimeZone () {
  let tz
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  } finally { _.noop() }
  return tz || ''
}

//
// Regions and their translations
//

const regions = {
  // #. Timezone region
  America: gt('America'),
  // #. Timezone region / Atlantic Ocean
  Atlantic: gt('Atlantic'),
  // #. Timezone region
  Europe: gt('Europe'),
  // #. Timezone region
  Africa: gt('Africa'),
  // #. Timezone region / Indian Ocean
  Indian: gt('Indian Ocean'),
  // #. Timezone region
  Asia: gt('Asia'),
  // #. Timezone region
  Australia: gt('Australia'),
  // #. Timezone region / Pacific Ocean
  Pacific: gt('Pacific'),
  // #. Timezone region
  Antarctica: gt('Antarctica'),
  // #. Timezone region
  Other: gt('Other')
}

let regionList = coreSettings.get('timezones/regions')
regionList = _.isString(regionList) ? regionList.split(',') : _(regions).keys()

// tweak order of regions
const region = getSystemTimeZone().split('/')[0]
if (_(regionList).contains(region)) regionList = [region].concat(_(regionList).without(region))

// expose to debug/test
TimezonePicker.util = {
  getTimezones,
  getAvailableTimezones,
  regionList
}

export default TimezonePicker
