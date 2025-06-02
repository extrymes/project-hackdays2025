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

import TreeNodeView from '@/io.ox/core/folder/node'
import ext from '@/io.ox/core/extensions'
import http from '@/io.ox/core/http'
import capabilities from '@/io.ox/core/capabilities'
import yell from '@/io.ox/core/yell'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings as configJumpSettings } from '@/io.ox/settings/configjump/settings'
import { buttonWithIcon, createIcon } from '@/io.ox/core/components'
import { st, isConfigurable } from '@/io.ox/settings/strings'

import gt from 'gettext'

async function traverseExtensionsAsync (extensions, parent, callback) {
  for (const extension of extensions) {
    await callback(extension, parent)
    if (extension.children) await traverseExtensionsAsync(extension.children, extension, callback)
  }
}

export default async function getAllExtensions () {
  const { allExtensions, old } = ext.point('io.ox/settings/pane').list()
    .reduce((acc, extension) => {
      if (extension.subgroup) acc.allExtensions.push(extension)
      else acc.old.push(extension)
      return acc
    }, { allExtensions: [], old: [] })
  const disabledPanes = coreSettings.get('disabledSettingsPanes')?.split?.(',') || []

  old.forEach(extension => {
    ext.point('io.ox/settings/pane/external').extend(_(extension).pick('id', 'title', 'ref', 'index', 'load', 'icon'))
  })

  const callback = (extension, parent) => {
    if (parent) {
      extension.subgroup = extension.subgroup || `${parent?.subgroup}/${extension.id}`
    }

    const children = ext.point(extension.subgroup)
      .list()
      .map(extension => ({ ...extension }))

    const enabled = children.filter(childExtension => !disabledPanes.includes(childExtension.id))
    const disabled = children.filter(childExtension => disabledPanes.includes(childExtension.id))

    // disable disabled extension points
    disabled.forEach(({ id }) => ext.point(extension.id).disable(id))

    if (enabled.length) extension.children = enabled
  }

  // yeah, traverse here with sideeffect to generate the tree
  await traverseExtensionsAsync(allExtensions, null, callback)

  return allExtensions
}

// ext.point('io.ox/settings/help/mapping').extend({
//   id: 'core',
//   index: 100,
//   list () {
//     Object.assign(this, {
//       'virtual/settings/appPasswords': 'ox.appsuite.user.sect.security.apppasswords.html',
//       'virtual/settings/io.ox/vacation': 'ox.appsuite.user.sect.email.send.vacationnotice.html',
//       'virtual/settings/io.ox/autoforward': 'ox.appsuite.user.sect.email.send.autoforward.html',
//       'virtual/settings/io.ox/office': { target: 'ox.documents.user.sect.firststeps.settings.html', base: 'help-documents' },
//       'virtual/settings/io.ox/core/sub': 'ox.appsuite.user.sect.contacts.folder.managesubscribed.html'
//     })
//   }
// })

ext.point('io.ox/core/foldertree/settings/modal').extend({
  id: 'standard-folders',
  index: 100,
  draw (tree) {
    const defaults = {
      headless: true,
      count: 0,
      empty: false,
      icon: 'bi/folder.svg',
      icons: true,
      indent: false,
      open: true,
      tree,
      parent: tree,
      folder: 'virtual/settings',
      className: 'folder selectable'
    }
    this.empty().append(
      tree.options.allExtensions.filter(e => !!e.subgroup).map(function (extension) {
        const id = 'virtual/settings/' + extension.id
        const folderOptions = extension.folderOptions || {}
        return new TreeNodeView({ ...defaults, ...folderOptions, model_id: id })
          .render().$el.addClass('standard-folders').attr('role', 'treeitem')
      })
    )
  }
})

ext.point('io.ox/settings/mobile/navbarFolderTree').extend(
  {
    id: 'title',
    index: 100,
    draw () {
      this.$el.append(
        // custom class to prevent NavbarView from intercepting click event
        $('<div class="navbar-action right custom">').append(renderCloseButton())
      )
    }
  }
)

function renderCloseButton () {
  return buttonWithIcon({ className: 'btn btn-toolbar', icon: createIcon('bi/x-lg.svg').addClass('bi-20'), title: gt('Close'), ariaLabel: gt('Close') })
    .attr('data-action', 'close')
}

ext.point('io.ox/settings/mobile/navbar').extend(
  {
    id: 'back-button',
    index: 100,
    draw () {
      this.$el.append(
        $('<div class="navbar-action left">').append(
          $('<a>').append(createIcon('bi/chevron-left.svg'), gt('Back'))
        )
      )
    }
  },

  {
    id: 'help-button',
    index: 400,
    draw (baton) {
      this.$el.append(
        // custom class to prevent NavbarView from intercepting click event
        $('<div class="navbar-action right custom">').append(renderCloseButton())
      )
    }
  }
)

// Create extensions for the config jump pages
Object.keys(configJumpSettings.get()).forEach(function (id) {
  const declaration = configJumpSettings.get(id)
  if (declaration.requires && !capabilities.has(declaration.requires)) return

  // try to get a translated title
  const title = declaration['title_' + ox.language] || /* #, dynamic */gt(declaration.title) || ''

  ext.point('io.ox/settings/pane/' + (declaration.group || 'tools')).extend(Object.assign({
    id,
    ref: 'io.ox/configjump/' + id,
    loadSettingPane: false
  }, declaration, { title }))

  ext.point('io.ox/configjump/' + id + '/settings/detail').extend({
    id: 'iframe',
    index: 100,
    draw () {
      const $node = this
      $node.css({ height: '100%' })
      const fillUpURL = $.Deferred()

      if (declaration.url.indexOf('[token]') > 0) {
        // Grab token
        $node.busy()
        http.GET({
          module: 'token',
          params: {
            action: 'acquireToken'
          }
        }).done(function (resp) {
          fillUpURL.resolve(declaration.url.replace('[token]', resp.token))
        }).fail(yell)
      } else {
        fillUpURL.resolve(declaration.url)
      }

      fillUpURL.done(function (url) {
        $node.idle()
        $node.append($('<iframe>', { src: url, frameborder: 0 }).css({
          width: '100%',
          minHeight: '90%'
        }))
      })
    }
  })
})

ext.point('io.ox/settings/pane').extend({
  id: 'general',
  index: 100,
  subgroup: 'io.ox/settings/pane/general'
})

ext.point('io.ox/settings/pane/general').extend({
  title: st.GENERAL,
  index: 100,
  id: 'io.ox/core',
  icon: 'bi/gear.svg',
  load: () => import('@/io.ox/core/settings/pane.js')
})

ext.point('io.ox/settings/pane/general').extend({
  id: 'notifications',
  title: st.NOTIFICATIONS,
  ref: 'io.ox/settings/notifications',
  index: 200,
  icon: 'bi/bell.svg',
  load: () => import('@/io.ox/settings/notifications/pane.js')
})

// security group
ext.point('io.ox/settings/pane/general').extend({
  id: 'security',
  title: gt('Security'),
  ref: 'io.ox/settings/security',
  index: 300,
  icon: 'bi/shield.svg',
  load: () => import('@/io.ox/settings/security/settings/pane.js')
})

if ((coreSettings.get('security/manageCertificates') && !coreSettings.get('security/acceptUntrustedCertificates')) && !capabilities.has('guest')) {
  ext.point('io.ox/settings/pane/general/security').extend({
    id: 'certificates',
    title: gt('Certificates'),
    ref: 'io.ox/settings/security/certificates',
    index: 150
  })
}

if (isConfigurable.ACCOUNTS) {
  ext.point('io.ox/settings/pane/general').extend({
    title: st.ACCOUNTS,
    index: 400,
    id: 'io.ox/settings/accounts',
    icon: 'bi/collection.svg',
    load: () => import('@/io.ox/settings/accounts/settings/pane.js')
  })
}

ext.point('io.ox/settings/pane').extend({
  id: 'tools',
  index: 400,
  subgroup: 'io.ox/settings/pane/tools'
})

ext.point('io.ox/settings/pane').extend({
  id: 'external',
  index: 500,
  subgroup: 'io.ox/settings/pane/external'
})
