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

import moment from '@open-xchange/moment'
import $ from '@/jquery'
import _ from '@/underscore'
import { device } from '@/browser'

import names from '@/io.ox/contacts/names'
import * as util from '@/io.ox/core/util'
import ext from '@/io.ox/core/extensions'
import yell from '@/io.ox/core/yell'

import { settings } from '@/io.ox/contacts/settings'
import gt from 'gettext'
import Backbone from '@/backbone'

// central function to get gab id. This way we can change things easier
export const getGabId = function (isUser) {
  return isUser ? '6' : 'con://0/6'
}

settings.ready(() => {
  if (!settings.get('showDepartment')) return
  $('html').addClass('showDepartment')
  ext.point('io.ox/core/person').extend({
    index: 'last',
    id: 'department',
    draw (baton) {
      if (String(baton.data.folder_id) === getGabId() && !!baton.data.department) {
        this.append(
          $('<span class="department">').text(_.noI18n.format(' (%1$s) ', baton.data.department))
        )
      }
    }
  })
})

// helper function for birthdays without year
// calculates the difference between gregorian and julian calendar
function calculateDayDifference (time) {
  const myDay = moment.utc(time).local(true)
  let century
  if (myDay.month() < 2) {
    century = Math.floor((myDay.year() - 1) / 100)
  } else {
    century = Math.floor(myDay.year() / 100)
  }
  const tempA = Math.floor(century / 4)
  const tempB = century % 4

  // multiply result with milliseconds of a day - 86400000
  return Math.abs((3 * tempA + tempB - 2) * 864e5)
}

// variant of getFullName without title, all lowercase
export const getSortName = function (obj) {
  return names.getSortName(obj)
}

export const getFullName = function (data, formatAsHTML) {
  return names.getFullName(data, { formatAsHTML })
}

export const getMailFullName = function (data, formatAsHTML) {
  return names.getMailFullName(data, { formatAsHTML })
}

export const deriveNameParts = names.deriveNameParts

function getFuriganaFullname (data) {
  function trim (data) {
    return {
      first: $.trim(data.first_name),
      last: $.trim(data.last_name),
      company: $.trim(data.company),
      first_yomi: $.trim(data.yomiFirstName),
      last_yomi: $.trim(data.yomiLastName),
      company_yomi: $.trim(data.yomiCompany)
    }
  }

  function showFurigana (data) {
    return ['first', 'last', 'company'].reduce(function (result, name) {
      if (data[name + '_yomi'] && data[name + '_yomi'] !== data[name]) {
        if (!data[name]) data[name + '_yomi'] = ''
        return true
      }
      return result
    }, false)
  }

  function prepend (node, selector, value) {
    node.find(selector).addClass('with-furigana').prepend(
      // the nbsp is important to keep correct vertical alignment!
      $('<span class="furigana">').text(value || '\u00A0'),
      $('<br>')
    )
  }

  const array = names.getFullName(data, true)
  const node = $('<div>').html(array)
  data = trim(data)
  if (showFurigana(data)) {
    prepend(node, '.title', '')
    prepend(node, '.last_name', data.last_yomi)
    prepend(node, '.first_name', data.first_yomi)
    prepend(node, '.company', data.company_yomi)
  }
  // a11y does not like empty headings. Empty string works fine
  return node.contents().length ? node.contents() : ''
}

export const getFullNameWithFurigana = function (data) {
  if (device('ja_JP')) return getFuriganaFullname(data)
  return getFullName(data, true)
}

export const getDisplayName = function (obj) {
  if (!obj) return ''
  // use existing display name?
  if (obj.display_name) {
    return util.unescapeDisplayName(obj.display_name)
  }
  // combine last_name, and first_name
  if (obj.last_name && obj.first_name) {
    return obj.last_name + ', ' + obj.first_name
  }
  // fallback
  return obj.last_name || obj.first_name || ''
}

export const getMail = function (obj) {
  // get the first mail address (obj.mailaddress is actually for resources but they are frequently thrown in the same lists as contacts)
  return obj ? (obj.email1 || obj.email2 || obj.email3 || obj.mail || obj.email || obj.mailaddress || '').trim().toLowerCase() : ''
}

export const getJob = function (obj) {
  // combine position and company
  const list = _([obj.company, obj.position]).compact()
  return list.length ? list.join(', ') : (obj.email1 || obj.email2 || obj.email3 || '')
}

export const nameSort = function (a, b) {
  let nameA, nameB
  if (a.display_name === undefined) {
    nameA = a.mail
  } else {
    nameA = a.display_name.toLowerCase()
  }

  if (b.display_name === undefined) {
    nameB = b.mail
  } else {
    nameB = b.display_name.toLowerCase()
  }

  if (nameA < nameB) {
    return -1
  }
  if (nameA > nameB) {
    return 1
  }
  return 0
}

export const calcMailField = function (contact, selectedMail) {
  let field
  const mail = [contact.email1, contact.email2, contact.email3]
  _.each(mail, function (val, key) {
    if (selectedMail === val) {
      field = key + 1
    }
  })
  return field
}

// used to change birthdays without year(we save them as year 1) from gregorian to julian calendar (year 1 is julian, current calendar is gregorian)
export const gregorianToJulian = function (timestamp) {
  return moment.utc(timestamp - calculateDayDifference(timestamp)).valueOf()
}

// used to change birthdays without year(we save them as year 1) from julian to gregorian calendar (year 1 is julian, current calendar is gregorian)
export const julianToGregorian = function (timestamp) {
  return moment.utc(timestamp + calculateDayDifference(timestamp)).valueOf()
}

export const hasYearOfBirth = function (birthday) {
  // Year 1 and year 1604 are  special for birthdays without year
  return birthday.year() > 1 && birthday.year() !== 1604
}

// little helper to get birthdays
// @birthday is either a timestamp or a momentJS instance
export const getBirthday = function (birthday, withAge) {
  // ensure instance of moment
  birthday = moment.utc(birthday)
  // return full date if year of birth is defined
  if (hasYearOfBirth(birthday)) {
    return birthday.format('l') +
      // #. %1$d is age in years (number)
      (withAge ? ' (' + gt('Age: %1$d', moment().diff(birthday, 'years')) + ')' : '')
  }
  // get localized format without the year otherwise
  return birthday.formatCLDR('Md')
}

export const getSummaryBusiness = function (data) {
  const array = [data.position, data.company, data.department]
  // pretty sure we don't **really** need the company when we are in
  // global address book; let's see which bug report will come around.
  if (String(data.folder_id) === getGabId()) array.splice(1, 1)
  return array.map($.trim).filter(Boolean).join(', ')
}

export const getSummaryLocation = function (data) {
  const list = data.city_business ? [data.city_business, data.country_business] : [data.city_home, data.country_home]
  return list.map($.trim).filter(Boolean).join(', ')
}

// @arg is either a string (image1_url) or an object with image1_url
export const getImage = function (arg, options) {
  if (_.isObject(arg)) arg = arg.image1_url
  if (!arg) return ''

  options = _.extend({ width: 40, height: 40, scaleType: 'cover' }, options)

  // use double size for retina displays
  if (device('retina')) {
    options.width *= 2
    options.height *= 2
  }

  let url = arg.replace(/^https?:\/\/[^/]+/i, '')
  url = util.replacePrefix(url)

  return util.getShardingRoot(url + '&' + $.param(options))
}

export const getInitials = (function () {
  const regFirst = /^.*?([a-z0-9\xC0-\xFF])/i
  const regLast = /\s.*?([a-z0-9\xC0-\xFF])\S*$/i

  function first (str) {
    const match = regFirst.exec(str)
    return ((match && match[1]) || '')
  }

  function last (str) {
    const match = regLast.exec(str)
    return ((match && match[1]) || '')
  }

  function get (obj) {
    const firstName = $.trim(obj.first_name)
    const lastName = $.trim(obj.last_name)
    const displayName = $.trim(obj.display_name)

    // yep, both first()
    if (firstName && lastName) return first(firstName) + first(lastName)
    if (displayName) return first(displayName) + last(displayName)

    // again, first() only
    if (lastName) return first(lastName)
    if (firstName) return first(firstName)

    // try mail address (email without a number is used by chat, for example)
    const email = $.trim(obj.email1 || obj.email2 || obj.email3 || obj.email)
    if (email) return first(email)

    return ''
  }

  return function (obj) {
    return get(obj).toUpperCase()
  }
}())

export const getInitialsColor = function () {
  return ''
  // const colors = ['shade1', 'shade2', 'shade3', 'shade4', 'shade5']
  // const modulo = colors.length
  // return function (initials) {
  //   if (!initials) return colors[0]
  //   return colors[initials[0].charCodeAt() % modulo]
  // }
}

// checks if every member of the distributionlist has a valid mail address and triggers a yell if that's not the case
export const validateDistributionList = function (dist) {
  // array of objects
  // array of contact models
  if (!dist || !_.isArray(dist) || !dist.length) return
  const omittedContacts = []

  dist = _(dist).filter(function (member) {
    member = member.attributes || member
    const mail = member.mail || member[member.field]
    if (!mail) omittedContacts.push(member)
    return !!member.mail
  })
  if (omittedContacts.length) {
    if (omittedContacts.length === 1) {
      // #. '%1$s contact's display name
      yell('warning', gt('%1$s could not be added as the contact has no valid email field.', omittedContacts[0].display_name))
      return
    }
    yell('warning', gt('Some contacts could not be added as they have no valid email field.'))
  }
  return dist
}

export const checkDuplicateMails = function (newAdditions, participantCollection, options = { yell: true }) {
  function getParticipantMail (participant) {
    if (participant instanceof Backbone.Model) participant = participant.toJSON()
    return participant.field && participant[participant.field] ? participant[participant.field] : getMail(participant)
  }

  if (!Array.isArray(newAdditions)) newAdditions = [newAdditions]

  const mailAddresses = participantCollection.map(getParticipantMail)
  const validAdditions = newAdditions.filter(participant => {
    return !mailAddresses.includes(getParticipantMail(participant))
  })
  if (options.yell && newAdditions.length !== validAdditions.length) yell('warning', gt('Some contacts could not be added because their email address is already in the list.'))
  return validAdditions
}

const services = {
  google: { title: gt('Google Maps'), url: 'https://www.google.com/maps?q=' },
  osm: { title: gt('Open Street Map'), url: 'https://www.openstreetmap.org/search?query=' },
  apple: { title: gt('Apple Maps'), url: 'https://maps.apple.com/?q=' }
}

export const getMapService = function (query = '') {
  let id = settings.get('mapService', 'google')
  // Apple Maps only works on iOS and macOS
  if (id === 'apple' && !_.device('ios || macos')) id = 'none'
  const service = services[id]
  if (!service) id = 'none'
  const url = service?.url ?? ''
  return {
    id,
    // #. %1$s is a map service, like "Google Maps"
    title: gt('Open in %1$s', service?.title),
    url,
    $el: $('<a class="maps-service" target="_blank" rel="noopener">')
      .attr('href', url + query)
  }
}
