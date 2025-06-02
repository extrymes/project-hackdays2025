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

import registry from '@/io.ox/core/main/registry'
import ext from '@/io.ox/core/extensions'
import * as util from '@/io.ox/contacts/util'
import contactsAPI from '@/io.ox/contacts/api'
import attachmentAPI from '@/io.ox/core/api/attachment'
import contactsModel from '@/io.ox/contacts/model'
import pViews from '@/io.ox/participants/views'
import pModel from '@/io.ox/participants/model'
import * as coreUtil from '@/io.ox/core/util'
import capabilities from '@/io.ox/core/capabilities'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import presence from '@/io.ox/switchboard/presence'

import { getHumanReadableSize } from '@/io.ox/core/strings'
import attachments from '@/io.ox/core/tk/attachments'
import postalAddress from '@/io.ox/core/locale/postal-address'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import ActionDropdownView from '@/io.ox/backbone/views/action-dropdown'
import DOMPurify from 'dompurify'
import apps from '@/io.ox/core/api/apps'
import '@/io.ox/contacts/actions'
import '@/io.ox/contacts/style.scss'
import { createIcon, createCircularButton } from '@/io.ox/core/components'
import { CategoryBadgesView } from '@/io.ox/core/categories/view'
import { getCategoriesFromModel } from '@/io.ox/core/categories/api'

import { settings } from '@/io.ox/contacts/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'

import gt from 'gettext'
import { hasFeature } from '@/io.ox/core/feature'

function hideAddressBook () {
  return !apps.get('io.ox/contacts')
}

/*
 * Extensions
 */

let INDEX = 100

ext.point('io.ox/contacts/detail').extend({
  index: (INDEX += 100),
  id: 'inline-actions',
  draw (baton) {
    if (contactsAPI.looksLikeResource(baton.data)) return
    if (hideAddressBook()) return
    (baton.popup ? baton.popup.$toolbar.empty() : this).append(
      new ToolbarView({ point: 'io.ox/contacts/links/inline', inline: true })
        .setSelection(baton.array(), { data: baton.array() })
        .$el
    )
  }
})

ext.point('io.ox/contacts/detail').extend({
  index: (INDEX += 100),
  id: 'contact-header',
  draw (baton) {
    if (baton.data.mark_as_distributionlist) return

    const $photo = dt().addClass('flex-grow')
    ext.point('io.ox/contacts/detail/photo').invoke('draw', $photo, baton)

    const $summary = dd().addClass('contact-summary flex-grow')
    ext.point('io.ox/contacts/detail/summary').invoke('draw', $summary, baton)

    const $categories = dd().addClass('contact-categories flex-grow')
    ext.point('io.ox/contacts/detail/categories').invoke('draw', $categories, baton)

    this.append(
      // we use a definition list here to get exactly the same layout
      dl().addClass('contact-header').append($photo, $summary)
    )
    if (_.device('!smartphone') && $('.io-ox-contacts-window .rightside').width() < 502) this.find('.definition-list').addClass('small')
  }
})

ext.point('io.ox/contacts/detail').extend({
  index: (INDEX += 100),
  id: 'list-header',
  draw (baton) {
    if (!baton.data.mark_as_distributionlist) return

    const count = baton.data.number_of_distribution_list
    const desc = count === 0
      ? gt('Distribution list')
    // #. %1$d is a number of members in distribution list
      : gt.ngettext('Distribution list with %1$d entry', 'Distribution list with %1$d entries', count, count)

    this.addClass('distribution-list').append(
      $('<div class="contact-header">').append(
        $('<h1 class="fullname">').text(util.getFullName(baton.data)),
        $('<h2>').text(desc)
      )
    )
  }
})

// Contact Photo
ext.point('io.ox/contacts/detail/photo').extend({
  draw (baton) {
    this.append(contactsAPI.getContactPhoto(baton.data, { size: 120 }))
  }
})

// Contact Summary
const countryFlag = settings.get('features/countryFlag', false)
const flags = {
  US: '\uD83C\uDDFA\uD83C\uDDF8',
  GB: '\uD83C\uDDEC\uD83C\uDDE7',
  DE: '\uD83C\uDDE9\uD83C\uDDEA',
  FR: '\uD83C\uDDEB\uD83C\uDDF7',
  ES: '\uD83C\uDDEA\uD83C\uDDF8',
  IT: '\uD83C\uDDEE\uD83C\uDDF9',
  NL: '\uD83C\uDDF3\uD83C\uDDF1',
  FI: '\uD83C\uDDEB\uD83C\uDDEE',
  JP: '\uD83C\uDDEF\uD83C\uDDF5',
  AT: '\uD83C\uDDE6\uD83C\uDDF9',
  CH: '\uD83C\uDDE8\uD83C\uDDED',
  BE: '\uD83C\uDDE7\uD83C\uDDEA'
}

ext.point('io.ox/contacts/detail/summary').extend(
  {
    index: 100,
    id: 'fullname',
    draw (baton) {
      const options = { html: util.getFullNameWithFurigana(baton.data), tagName: 'h1 class="fullname"' }
      const node = coreUtil.renderPersonalName(options, baton.data)
      // a11y: headings must not be empty
      if (!node.text()) return
      this.append(node)
    }
  },
  {
    index: 110,
    id: 'flag',
    draw (baton) {
      if (!countryFlag) return
      if (_.device('smartphone')) return
      const country = baton.data.country_home || baton.data.country_business
      if (!country) return
      const flag = flags[postalAddress.getCountryCode(country)]
      if (!flag) return
      // h1.fullname maybe missing (a11y: headings must not be empty)
      this.find('h1.fullname').append($.txt(' ' + flag))
    }
  },
  {
    index: 120,
    id: 'private_flag',
    draw (baton) {
      if (_.device('smartphone') || !baton.data.private_flag) return
      this.find('h1.fullname').append(
        $('<div class="sr-only">').attr('aria-label', gt('Private contact')),
        createIcon('bi/eye-slash.svg').addClass('private-flag').attr('title', gt('Private'))
      )
    }
  },
  {
    index: 200,
    id: 'business',
    draw (baton) {
      const value = util.getSummaryBusiness(baton.data)
      if (!value) return
      // a11y: headings must not be empty
      this.append(
        $('<h2 class="business hidden-xs">').text(value)
      )
    }
  },

  {
    index: 300,
    id: 'location',
    draw (baton) {
      const value = util.getSummaryLocation(baton.data)
      if (!value) return
      // a11y: headings must not be empty
      this.append(
        $('<h2 class="location hidden-xs">').text(value)
      )
    }
  },
  {
    index: 300,
    id: 'categories',
    draw (baton, options) {
      if (!coreSettings.get('features/categories', false)) return
      const collection = getCategoriesFromModel(baton.data.categories, 'contact' + baton.data.id)
      if (collection.length === 0) return

      this.append(new CategoryBadgesView({ collection, searchable: true }).render().$el)
    }
  }
)

ext.point('io.ox/contacts/detail/summary').extend({
  index: 400,
  id: 'actions',
  draw (baton) {
    if (contactsAPI.looksLikeResource(baton.data)) return
    // const support = hasFeature('zoom') || hasFeature('jitsi')
    // if (!support) return
    const $actions = $('<div class="horizontal-action-buttons">')
    ext.point('io.ox/contacts/detail/actions').invoke('draw', $actions, baton.clone())
    if (hasFeature('presence')) {
      this.append(
        presence.getPresenceString(baton.data.email1),
        $actions
      )
    } else {
      this.append($actions)
    }
  }
})

ext.point('io.ox/contacts/detail/actions').extend(
  {
    id: 'email',
    index: 100,
    draw (baton) {
      if (!capabilities.has('webmail')) return
      this.append(
        createButton('io.ox/contacts/actions/send', 'bi/envelope.svg', gt('Email'), baton)
      )
    }
  },
  {
    id: 'call',
    index: 300,
    draw (baton) {
      const $ul = $('<ul class="dropdown-menu">')
      ext.point('io.ox/contacts/detail/actions/call').invoke('draw', $ul, baton.clone())
      // check only for visible items (not dividers, etc)
      const hasOptions = $ul.children('[role="presentation"]').length > 0
      this.append(
        $('<div class="dropdown">').append(
          createCircularButton({
            action: '',
            title: gt.pgettext('verb', 'Call'),
            disabled: !hasOptions,
            caret: hasOptions,
            icon: 'bi/telephone.svg',
            className: 'call-icon'
          }),
          $ul
        )
      )
    }
  },

  {
    id: 'invite',
    index: 400,
    draw (baton) {
      if (!capabilities.has('calendar')) return
      this.append(
        createButton('io.ox/contacts/actions/invite', 'bi/calendar-plus.svg', gt('Invite'), baton)
      )
    }
  }
)

function createButton (action, icon, label, baton) {
  // do not change the initial baton as it is reused
  baton = baton.clone()
  baton.data = [].concat(baton.data)
  const $button = $('<button type="button" class="btn-circular">')
    .prop('disabled', true)
    .on('click', { baton }, function (e) {
      actionsUtil.invoke(action, e.data.baton)
    })
    .append(
      $('<div class="circle">').append(createIcon(icon)),
      $.txt(label)
    )
  actionsUtil.checkAction(action, baton).then(function () {
    $button.prop('disabled', false)
  })
  return $button
}

ext.point('io.ox/contacts/detail/actions/call').extend({
  id: 'phone',
  index: 300,
  draw (baton) {
    const numbers = phoneFields.map(function (field) {
      const number = baton.data[field]
      if (!number) return $()
      return $('<li role="presentation">').append(
        $('<a class="block">').attr('href', 'callto:' + number).append(
          $('<small>').text(contactsModel.fields[field]),
          $('<br>'),
          $.txt(number)
        )
      )
    })
    if (!numbers.length) return
    this.append(
      $('<li class="divider" role="separator">'),
      numbers
    )
  }
})

const phoneFields = [
  'telephone_company', 'telephone_business1', 'telephone_business2',
  'cellular_telephone1', 'cellular_telephone2',
  'telephone_home1', 'telephone_home2', 'telephone_other'
]

// Content

ext.point('io.ox/contacts/detail').extend({
  index: (INDEX += 100),
  id: 'contact-content',
  draw (baton) {
    // clearfix needed or halo design is broken
    const node = $('<article class="clearfix">').appendTo(this)
    const id = baton.data.mark_as_distributionlist
      ? 'io.ox/contacts/detail/list'
      : 'io.ox/contacts/detail/content'

    ext.point(id).invoke('draw', node, baton)
  }
})

// Distribution list members

ext.point('io.ox/contacts/detail/member').extend({
  draw (data) {
    // draw member
    this.append(
      new pViews.ParticipantEntryView({
        tagName: 'li',
        model: new pModel.Participant(data),
        halo: true,
        isMail: true,
        // forces the use of the correct mailfield (disables fallback). User is no longer misslead by the ui showing a mail address, that is not used by this distributionlist
        strict: true
      }).render().$el
    )
  }
})

ext.point('io.ox/contacts/detail/list').extend({

  draw (baton) {
    const list = _.copy(baton.data.distribution_list || [], true)
    const count = list.length
    const hash = {}; let $list
    let offset = 0
    const limit = baton.options.limit || 100
    this.append(
      count === 0 ? $('<div class="list-count">').text(gt('This list has no members yet')) : $(),
      $list = $('<ul class="member-list list-unstyled">')
    )

    if (!count) return

    // remove duplicates to fix backend bug
    const filteredList = _(list)
      .chain()
      .filter(function (member) {
        if (hash[member.display_name + '_' + member.mail]) return false
        return (hash[member.display_name + '_' + member.mail] = true)
      })

    // need the rightside div, to register the scroll handler correctly
    const $right = baton.app.right.parent()

    const onScroll = _.debounce(function (e) {
      // ignore lazy load scroll event triggered by contact images
      if (typeof e.originalEvent === 'undefined') return
      const height = $right.outerHeight()
      const scrollTop = $right[0].scrollTop
      const scrollHeight = $right[0].scrollHeight
      const bottom = scrollTop + height
      if (bottom / scrollHeight < 0.80) return
      const defer = window.requestAnimationFrame || window.setTimeout
      defer(function renderMoreItems () {
        offset = offset + limit
        render()
      })
    }, 50)

    function render () {
      if (count < offset) $right.off('scroll', onScroll)
      // force contacts?action=search into multiple
      const list = filteredList.slice(offset, offset + limit)
      list.forEach(function (member) {
        ext.point('io.ox/contacts/detail/member').invoke('draw', $list, member)
      })
    }

    render()
    $right.on('scroll', onScroll)
  }
})

function dl () {
  return $('<dl class="definition-list">')
}

function dt () {
  return $('<dt>')
}

function dd () {
  return $('<dd>')
}

function block () {
  const rows = _(arguments).compact()
  const block = $('<section class="block">')
  const $dl = dl()

  // if block empty
  if (rows.length < 1) return $()

  _.each(rows, function (row) {
    $dl.append(row)
  })

  return block.append($dl)
}

function row (id, builder) {
  const build = builder()
  if (!build) return null
  return function () {
    $(this).append(
      dt().text(contactsModel.fields[id]),
      dd().append(_.isString(build) ? $.txt(build) : build)
    )
  }
}

function simple (data, id, label) {
  const value = $.trim(data[id])
  if (!value) return null
  return function () {
    $(this).append(
      dt().text(label || contactsModel.fields[id]),
      dd().text(value)
    )
  }
}

function clickMail (e) {
  if (capabilities.has('webmail')) {
    e.preventDefault()
    // set recipient and open compose
    registry.call('io.ox/mail/compose', 'open', { to: [[e.data.display_name, e.data.email]] })
  }
}

function mail (address, name, id) {
  if (!address) return null
  return function () {
    $(this).append(
      dt().text(contactsModel.fields[id]),
      dd().append(
        $('<a>').attr('href', 'mailto:' + address).text(address)
          .on('click', { email: address, display_name: name }, clickMail)
      )
    )
  }
}

function phone (data, id, label) {
  const number = $.trim(data[id])
  if (!number) return null
  return function () {
    $(this).append(
      dt().text(label || contactsModel.fields[id]),
      dd().append(
        $('<a>').attr({
          href: _.device('smartphone') ? 'tel:' + number : 'callto:' + number,
          'aria-label': label || contactsModel.fields[id]
        }).text(number)
      )
    )
  }
}

function note (data) {
  const text = $.trim(data.note)
  if (!text) return null
  return function () {
    $(this).append(
      dt().text(contactsModel.fields.note),
      _.nltobr(text, dd().addClass('note'))
    )
  }
}

function IM (number, id) {
  number = $.trim(number)
  if (!number) return null

  const obj = {}

  if (/^skype:/.test(number)) {
    number = number.split('skype:')[1]
    return function () {
      $(this).append(
        dt().text('Skype'),
        dd().append(
          $('<a>', { href: 'callto:' + number + '?call' }).text(number)
        )
      )
    }
  }

  if (/^x-apple:/.test(number)) {
    number = number.split('x-apple:')[1]
    return function () {
      $(this).append(
        dt().text('iMessage'),
        dd().append(
          $('<a>', { href: 'imessage://' + number + '@me.com' }).text(number)
        )
      )
    }
  }

  obj[id] = number
  return simple(obj, id)
}

// data is full contact data
// type is 'business' or 'home' or 'other'
function address (data, type) {
  const text = postalAddress.format(data, type)
  if (!text) return null

  const i18n = {
    home: gt('Home address'),
    business: gt('Business address'),
    other: gt('Other address')
  }

  return function () {
    const address = $('<address>').attr('data-property', type).text($.trim(text))
    const $dd = dd().append(address)
    $(this).append(dt().text(i18n[type]), $dd)

    const query = encodeURIComponent(text.replace(/\n*/, '\n').trim().replace(/\n/g, ', '))
    const service = util.getMapService(query)
    if (service.id === 'none') return $(this)

    $dd.append(
      service.$el.append(
        createIcon('bi/box-arrow-up-right.svg').addClass('me-8'),
        $.txt(service.title)
      )
    )
  }
}

const ContactsActionDropdownView = ActionDropdownView.extend({
  tagName: 'li',
  className: 'flex-row zero-min-width pull-right'
})

function attachmentlist (label, list) {
  function dropdown (data, title) {
    const dropdown = new ContactsActionDropdownView({
      point: 'io.ox/core/tk/attachment/links',
      data,
      title: data.filename || title,
      customize () {
        const node = this
        const icon = node.find('svg')
        const text = node.text().trim()
        const size = data.file_size > 0 ? getHumanReadableSize(data.file_size, 0) : '\u00A0'
        this.addClass('attachment text-left bg-dark ml-0 zero-min-width py-8 flex-grow').text('').append(
          // no template string here because filename is user content and could cause XSS
          $('<div class="filename ellipsis flex-grow mr-4">').attr('title', text).text(text),
          $('<div class="filesize text-gray pl-4">').text(size),
          icon
        )
        // use normal size for 'All attachments'
        if (data.length) {
          dropdown.$el.removeClass('pull-right')
          node.removeClass('flex-grow')
        }
      }
    })
    dropdown.$toggle.attr('tabindex', null)
    return dropdown.$el
  }

  return function () {
    $(this).append(
      dt().text(label),
      dd().append(
        $('<ul class="attachment-list view list-unstyled">').append(function () {
          const nodes = _.map(list, dropdown)
          // if more than one attachment add "All Downloads" dropdown
          return list.length < 2 ? nodes : nodes.concat(dropdown(list, gt('All attachments')))
        })
      )
    )
  }
}

ext.point('io.ox/contacts/detail/content')

  .extend({
    id: 'personal',
    index: 200,
    draw (baton) {
      const data = baton.data

      this.append(
        block(
          simple(data, 'title'),
          simple(data, 'nickname'),
          simple(data, 'second_name'),
          simple(data, 'suffix'),
          row('birthday', function () {
            // check if null, undefined, empty string
            // 0 is valid (1.1.1970)
            if (!_.isNumber(baton.data.birthday)) return
            return util.getBirthday(baton.data.birthday, true)
          }),
          row('anniversary', function () {
            // check if null, undefined, empty string
            // 0 is valid (1.1.1970)
            if (_.isNumber(baton.data.anniversary)) {
              // use same mechanic as with birthdays
              return util.getBirthday(baton.data.anniversary)
            }
          }),
          // --- rare ---
          simple(data, 'marital_status'),
          simple(data, 'number_of_children'),
          row('url', function () {
            let url = $.trim(baton.data.url)
            if (!url) return
            if (!/^https?:\/\//i.test(url)) url = 'http://' + url
            const node = $('<a target="_blank" rel="noopener">').attr('href', encodeURI(decodeURI(url))).text(url)
            return DOMPurify.sanitize(node.get(0), { ALLOW_TAGS: ['a'], ADD_ATTR: ['target'], RETURN_DOM_FRAGMENT: true })
          }),
          simple(data, 'spouse_name')
        )
          .attr('data-block', 'personal')
      )
    }
  })

  .extend({
    id: 'job',
    index: 300,
    draw (baton) {
      const data = baton.data

      this.append(
        block(
          simple(data, 'company'),
          simple(data, 'department'),
          simple(data, 'position'),
          simple(data, 'profession'),
          simple(data, 'manager_name'),
          simple(data, 'room_number'),
          simple(data, 'assistant_name'),
          // --- rare ---
          simple(data, 'employee_type'),
          simple(data, 'number_of_employees'),
          simple(data, 'sales_volume'),
          simple(data, 'tax_id'),
          simple(data, 'commercial_register'),
          simple(data, 'branches'),
          simple(data, 'business_category'),
          simple(data, 'info')
        )
          .attr('data-block', 'job')
      )
    }
  })

  .extend({
    id: 'communication',
    index: 400,
    draw (baton) {
      const data = baton.data
      const fullname = util.getFullName(data)
      const addresses = _([data.email1, data.email2, data.email3])
        .chain()
        .map(function (address) {
          return $.trim(address).toLowerCase()
        })
        .value()

      this.append(
        block(
          mail(addresses[0], fullname, 'email1'),
          mail(addresses[1], fullname, 'email2'),
          mail(addresses[2], fullname, 'email3'),
          IM(data.instant_messenger1, 'instant_messenger1'),
          IM(data.instant_messenger2, 'instant_messenger2'),
          phone(data, 'cellular_telephone1'),
          phone(data, 'cellular_telephone2'),
          phone(data, 'telephone_business1'),
          phone(data, 'telephone_business2'),
          phone(data, 'telephone_home1'),
          phone(data, 'telephone_home2'),
          phone(data, 'telephone_company'),
          phone(data, 'telephone_other'),
          simple(data, 'fax_business'),
          simple(data, 'fax_home'),
          simple(data, 'fax_other'),
          // --- rare ---
          phone(data, 'telephone_car'),
          phone(data, 'telephone_isdn'),
          phone(data, 'telephone_pager'),
          phone(data, 'telephone_primary'),
          phone(data, 'telephone_radio'),
          phone(data, 'telephone_telex'),
          phone(data, 'telephone_ttytdd'),
          phone(data, 'telephone_ip'),
          phone(data, 'telephone_assistant'),
          phone(data, 'telephone_callback')
        )
          .attr('data-block', 'communication')
      )
    }
  })

  .extend({
    id: 'home-address',
    index: 600,
    draw (baton) {
      this.append(
        block(
          address(baton.data, 'home')
        )
          .attr('data-block', 'home-address')
      )
    }
  })

  .extend({
    id: 'business-address',
    index: 700,
    draw (baton) {
      this.append(
        block(
          address(baton.data, 'business')
        )
          .attr('data-block', 'business-address')
      )
    }
  })

  .extend({
    id: 'other-address',
    index: 800,
    draw (baton) {
      this.append(
        block(
          address(baton.data, 'other')
        )
          .attr('data-block', 'other-address')
      )
    }
  })

  .extend({
    id: 'misc',
    index: 900,
    draw (baton) {
      const data = baton.data

      this.append(
        block(
          note(data, 'note'),
          // looks stupid but actually easier to read and not much shorter than any smart-ass solution
          simple(data, 'userfield01'),
          simple(data, 'userfield02'),
          simple(data, 'userfield03'),
          simple(data, 'userfield04'),
          simple(data, 'userfield05'),
          simple(data, 'userfield06'),
          simple(data, 'userfield07'),
          simple(data, 'userfield08'),
          simple(data, 'userfield09'),
          simple(data, 'userfield10'),
          simple(data, 'userfield11'),
          simple(data, 'userfield12'),
          simple(data, 'userfield13'),
          simple(data, 'userfield14'),
          simple(data, 'userfield15'),
          simple(data, 'userfield16'),
          simple(data, 'userfield17'),
          simple(data, 'userfield18'),
          simple(data, 'userfield19'),
          simple(data, 'userfield20')
        )
          .attr('data-block', 'misc')
      )
    }
  })

  .extend({
    id: 'attachments',
    index: 1000,
    draw (baton) {
      // TODO: add proper contact model update after attachment api calls
      if (!baton.data.number_of_attachments) return
      if (baton.data.mark_as_distributionlist) return

      const section = $('<section class="block hidden">')
      const hashKey = contactsAPI.getAttachmentsHashKey(baton.data)

      if (attachmentAPI.isPending(hashKey)) {
        const progressview = new attachments.ProgressView({ cid: _.ecid(baton.data) })
        return this.append(progressview.render().$el).show()
      }

      function get () {
        // this request might take a while; not cached
        attachmentAPI.getAll({ folder_id: baton.data.folder_id, id: baton.data.id, module: 7 }).then(success, fail)
      }

      function success (list) {
        if (!list.length) return section.remove()
        list.forEach(attachment => {
          // cut off prefix con://0/ because document converter can only handle old folder ids atm
          attachment.folder = attachment.folder.split('/')
          // just take the last part
          attachment.folder = attachment.folder[attachment.folder.length - 1]
        })

        section.replaceWith(
          block(
            attachmentlist(gt('Attachments'), list)
          )
            .addClass('contains-dropdown')
            .attr('data-block', 'attachments')
        )
      }

      function fail () {
        section.show().append(
          $.fail(gt('Could not load attachments for this contact.'), get)
        )
      }

      get()

      this.append(section)
    }
  })

function redraw (e, data) {
  const baton = e.data.baton
  // use old baton with new data(keep disabled extensionpoints)
  baton.data = data
  $(this).replaceWith(e.data.view.draw(baton))
}

export default {

  draw (baton) {
    if (!baton) return $('<div>')
    try {
      // make sure we have a baton
      baton = ext.Baton.ensure(baton)
      const node = $.createViewContainer(baton.data, contactsAPI)
        .on('redraw', { view: this, data: baton.data, baton }, redraw)
        .addClass('contact-detail view')
        .attr({ role: 'region', 'aria-label': gt('Contact Details') })
      ext.point('io.ox/contacts/detail').invoke('draw', node, baton)
      return node
    } catch (e) {
      console.error('io.ox/contacts/view-detail:draw()', e)
    }
  }
}
