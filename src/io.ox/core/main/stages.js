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
import ext from '@/io.ox/core/extensions'
import yell from '@/io.ox/core/yell'
import capabilities from '@/io.ox/core/capabilities'
import apps from '@/io.ox/core/api/apps'
import debug from '@/io.ox/core/main/debug'
import accountApi from '@/io.ox/core/api/account'
import tabApi from '@/io.ox/core/api/tab'
import calendarAPI from '@/io.ox/calendar/api'
import folderAPI from '@/io.ox/core/folder/api'
import openSettings from '@/io.ox/settings/util'

import { settings } from '@/io.ox/core/settings'
import { settings as contactsSettings } from '@/io.ox/contacts/settings'

import registry from './registry'
import gt from 'gettext'

const topbar = $('#io-ox-appcontrol')

const getAutoLaunchDetails = function (str) {
  const pair = (str || '').split(/:/); const app = pair[0]; const method = pair[1] || ''
  if (/\.\./.test(app)) {
    console.error('app names must not contain relative paths')
    return { app: undefined }
  }
  const name = app.replace(/\/main$/, '')
  return { app: apps.get(name), method, name }
}

const autoLaunchArray = function () {
  let autoStart = []

  if (settings.get('autoStart') === 'none') {
    autoStart = []
  } else {
    const favoriteAppIds = apps.forLauncher().map(app => app.get('id'))

    autoStart = _([].concat((settings.get('autoStart') || '').replace(/\/main$/, ''), favoriteAppIds))
      .chain()
      .filter(function (o) {
        if (_.isUndefined(o)) return false
        if (_.isNull(o)) return false
        // special case to start in settings (see Bug 50987)
        if (/^io.ox\/settings(\/main)?$/.test(o)) return true
        return favoriteAppIds.indexOf(o) >= 0
      })
      .first(1) // use 1 here to return an array
      .value()
  }

  return autoStart
}

/**
 * Disables the specified items in the extension point.
 */
const disableItems = function (point, ids) {
  ids.forEach(point.disable, point)
}

/**
 * Disables all but the specified items in the extension point.
 */
const filterItems = function (point, ids) {
  point.each(function (item) {
    if (ids.indexOf(item.id) < 0) {
      point.disable(item.id)
    }
  })
}

// som

ext.point('io.ox/core/stages').extend({
  id: 'first',
  index: 100,
  run () {
    debug('Stage "first"')
  }
}, {
  id: 'app_register',
  index: 105,
  run () {
    return Promise.all([
      import('@/io.ox/core/main/warning')
    ])
  }
}, {
  id: 'appcheck',
  index: 110,
  run (baton) {
    debug('Stage "appcheck"')
    // checks url which app to launch, needed to handle direct links
    //
    const hash = _.url.hash()
    const looksLikeDeepLink = !('!!' in hash)
    let usesDetailPage
    // fix old infostore
    if (hash.m === 'infostore') hash.m = 'files'

    // no id values with id collections 'folder.id,folder.id'
    // no virtual folder
    if (looksLikeDeepLink && hash.app && hash.folder && hash.id && hash.folder.indexOf('virtual/') !== 0 && hash.id.indexOf(',') < 0) {
      // new-school: app + folder + id
      // replace old IDs with a dot by 'folder_id SLASH id'
      let id = /^\d+\./.test(hash.id) ? hash.id.replace(/\./, '/') : hash.id
      usesDetailPage = /^io.ox\/(mail|contacts|tasks)$/.test(hash.app)

      if (hash.app === 'io.ox/calendar') {
        id = calendarAPI.cid(hash)
        hash.folder = folderAPI.getDefaultFolder('calendar')
      }

      _.url.hash({
        app: usesDetailPage ? hash.app + '/detail' : hash.app,
        folder: hash.folder,
        id,
        recurrenceId: null
      })

      baton.isDeepLink = true
    } else if (hash.m && hash.f && hash.i) {
      // old-school: module + folder + id
      usesDetailPage = /^(mail|contacts|tasks)$/.test(hash.m)

      _.url.hash({
        // special treatment for files (viewer + drive app)
        app: 'io.ox/' + (usesDetailPage ? hash.m + '/detail' : hash.m),
        folder: hash.f,
        id: hash.i
      })

      baton.isDeepLink = true
    } else if (hash.m && hash.f) {
      // just folder
      _.url.hash({
        app: 'io.ox/' + hash.m,
        folder: hash.f
      })

      baton.isDeepLink = true
    } else if (_.url.hash('app') === 'io.ox/settings') {
      // support legacy urls to settings, eg
      // https://localhost:8337/appsuite/#!!&app=io.ox/settings&folder=virtual/settings/io.ox/files
      openSettings(_.url.hash('folder'), _.url.hash('section'))
      _.url.hash({ app: null, folder: null, section: null })
      baton.isDeepLink = true
    } else if (_.url.hash('settings')) {
      openSettings(_.url.hash('settings'), _.url.hash('section'))
      baton.isDeepLink = true
    }

    // clean up
    _.url.hash({ m: null, f: null, i: null, '!!': undefined, '!': null })

    const appURL = _.url.hash('app')
    const app = appURL && getAutoLaunchDetails(appURL).app
    const deeplink = looksLikeDeepLink && app && app.get('deeplink')

    if (app && (app.get('refreshable') || deeplink)) {
      baton.autoLaunch = appURL.split(/,/)
      // no manifest for mail compose, capabilities check is sufficient
    } else {
      // clear typical parameter?
      if (app) _.url.hash({ app: null, folder: null, id: null })
      baton.autoLaunch = autoLaunchArray()
    }
  }
}, {
  id: 'autoLaunchApps',
  index: 120,
  run (baton) {
    debug('Stage "autoLaunchApps"')
    baton.autoLaunchApps = _(baton.autoLaunch).chain().map(function (m) {
      return getAutoLaunchDetails(m).app
    }).compact().value()
  }
}, {
  id: 'startLoad',
  index: 130,
  run (baton) {
    debug('Stage "startLoad"')
    function fail (type) {
      return function (e) {
        const message = (e && e.message) || ''
        console.error('core: Failed to load:', type, message, e, baton)
        throw e
      }
    }

    baton.loaded = $.when(
      Promise.all(baton.autoLaunchApps.map(app => app.load())).catch(fail('autoLaunchApps')),
      accountApi.all()
    )
  }
}, {
  id: 'secretCheck',
  index: 250,
  run () {
    debug('Stage "secretCheck"')
    if (ox.online && ox.rampup && ox.rampup.oauth) {
      const analysis = ox.rampup.oauth.secretCheck
      if (analysis && !analysis.secretWorks) {
        // Show dialog
        import('@/io.ox/keychain/secretRecoveryDialog').then(function ({ default: dialog }) { dialog.show() })
        if (ox.debug) {
          console.error('Couldn\'t decrypt accounts: ', analysis.diagnosis)
        }
      }
    }
  }
}, {
  id: 'drawDesktop',
  index: 500,
  run () {
    ext.point('io.ox/core/desktop').invoke('draw', $('#io-ox-desktop'), {})
    ox.ui.windowManager.on('empty', function (e, isEmpty, win) {
      if (isEmpty) {
        ext.point('io.ox/core/desktop').invoke('draw', $('#io-ox-desktop'), {})
        ox.ui.screens.show('desktop')
        const autoStartApp = getAutoLaunchDetails(win || settings.get('autoStart', 'io.ox/mail')).app
        if (autoStartApp) ox.launch(autoStartApp.load)
      } else {
        ox.ui.screens.show('windowmanager')
      }
    })
  }
}, {
  id: 'load',
  index: 600,
  run (baton) {
    debug('Stage "load"', baton)

    return baton.loaded
  }
}, {
  id: 'mailto',
  index: 602,
  run () {
    if (_.url.hash('mailto')) registry.call('io.ox/mail/compose', 'open')
  }
}, {
  /**
   * Popout Viewer - modify topbars if opened in a new browser tab - DOCS-1881
   */
  id: 'popoutViewer',
  index: 605,
  run () {
    // tab handling enabled in general
    if (!tabApi.openInTabEnabled()) return
    // the Popout Viewer app
    if (_.url.hash('app') !== 'io.ox/files/detail') return

    // hide controls in the top bar
    const appControlPoint = ext.point('io.ox/core/appcontrol')
    disableItems(appControlPoint, ['quicklauncher'])

    const leftSectionPoint = ext.point('io.ox/core/appcontrol/left')
    disableItems(leftSectionPoint, ['launcher'])

    // hide controls in the right section of the top bar
    const rightSectionPoint = ext.point('io.ox/core/appcontrol/right')
    disableItems(rightSectionPoint, ['refresh-mobile', 'notifications', 'settings-dropdown'])

    // hide top-level entries in the extension point
    const helpDropDownPoint = ext.point('io.ox/core/appcontrol/right/help')
    filterItems(helpDropDownPoint, ['help', 'feedback', 'divider-first', 'about'])

    // hide top-level entries in the extension point
    const settingsDropDownPoint = ext.point('io.ox/core/appcontrol/right/settings')
    filterItems(settingsDropDownPoint, [])

    // hide top-level entries in the extension point
    const accountDropDownPoint = ext.point('io.ox/core/appcontrol/right/account')
    filterItems(accountDropDownPoint, ['logout'])

    // hide all logout items (e.g. Guard) but the global logout
    const signOutsPoint = ext.point('io.ox/core/appcontrol/right/account/signouts')
    filterItems(signOutsPoint, ['logout'])
  }
}, {
  id: 'topbars',
  index: 610,
  run () {
    debug('Stage "load" > loaded.done')

    ext.point('io.ox/core/appcontrol').invoke('draw', topbar)

    if (_.device('smartphone')) {
      ext.point('io.ox/core/mobile').invoke('draw')
    }

    // help here
    if (!ext.point('io.ox/core/topbar').isEnabled('default')) {
      $('#io-ox-screens').css('top', '0px')
      topbar.hide()
    }
    // draw plugins
    ext.point('io.ox/core/plugins').invoke('draw')

    debug('Stage "load" > autoLaunch ...')

    // restore apps
    if (!tabApi.openInTabEnabled()) return ox.ui.App.restore()
    return tabApi.isParentTab() ? ox.ui.App.restore() : true
  }
}, {
  id: 'restoreLaunch',
  index: 620,
  run (baton) {
    // store hash now or restored apps might have changed url
    const hash = _.copy(_.url.hash())

    // is set false, if no autoLaunch is available.
    // for example if default app is 'none' (see Bug 51207) or app is restored (see Bug Bug 51211)
    let allUnavailable = baton.autoLaunch.length > 0
    // auto launch
    _(baton.autoLaunch)
      .chain()
      .map(getAutoLaunchDetails)
      .each(function ({ name, app, method }, index) {
        // only load first app on small devices
        if (index === 0) allUnavailable = false
        if (_.device('smartphone') && index > 0) return
        // WORKAROUND: refresh in 'edit' app created needles broken instance when at least a single intstance was restored
        if (_.device('smartphone') && apps.where({ restored: true }).length) return
        // split app/call
        let launch; const options = _(hash).pick('folder', 'id')
        // remember first started app
        options.first = true
        debug('Auto launch:', name, options)
        if (/\/detail$/.test(name) && name.indexOf('files/detail') < 0) {
          // TODO: NEEDS REFACTORING
          // This is a !temporary! workaround as we need to change how deeplinks and
          // windows are handled overall
          const mainAppName = name.replace(/\/detail/, '')
          const mainApp = apps.get(mainAppName)
          launch = ox.launch(mainApp.load, options)
          launch.then(function () {
            _.delay(function () {
              ox.launch(app.load, { cid: _.cid(options) })
            }, 1000)
          })
        } else {
          launch = ox.launch(app.load, options)
        }
        // TODO: all pretty hard-wired here; looks for better solution
        // special case: open viewer too?
        if (hash.app === 'io.ox/files' && hash.id !== undefined) {
          Promise.all([import('@/io.ox/core/viewer/main'), import('@/io.ox/files/api'), import('@/io.ox/core/folder/api')]).then(function ([{ default: Viewer }, { default: api }, { default: folderAPI }]) {
            folderAPI.get(hash.folder)
              .done(function () {
                api.get(hash).done(function (data) {
                  new Viewer().launch({ files: [data], folder: hash.folder })
                })
              })
              .fail(function (error) {
                _.url.hash('id', null)
                yell(error)
              })
          })
        }
        // explicit call?
        if (method) {
          launch.then(function (app) {
            if (_.isFunction(app[method])) {
              app[method]()
            }
          })
        }
        // non-app deeplinks
        const id = _.url.hash('reg')
        // be case insensitive
        const showFeedback = _(_.url.hash()).reduce(function (memo, value, key) {
          if (key.toLowerCase() === 'showfeedbackdialog') {
            return value
          }
          return memo
        })

        if (id && registry.get(id)) {
          // normalise args
          const list = (_.url.hash('regopt') || '').split(',')
          const data = {}; let parts
          // key:value, key:value... -> object
          _.each(list, function (str) {
            parts = str.split(':')
            data[parts[0]] = parts[1]
          })
          // call after app is ready
          launch.then(function () {
            registry.call(id, 'io.ox/onboarding/clients/wizard', { data })
          })
        }

        if (showFeedback === 'true' && capabilities.has('feedback')) {
          launch.then(function () {
            import('@/plugins/core/feedback/register').then(function ({ default: feedback }) {
              feedback.show()
            })
          })
        }

        if (contactsSettings.get('features/furigana', false)) {
          import('@/l10n/ja_JP/io.ox/register')
        }
      })
    if (allUnavailable || (ox.rampup && ox.rampup.errors)) {
      let message = _.pluck(ox.rampup.errors, 'error').join('\n\n')
      message = message || gt('The requested application is not available at this moment.')
      yell({ type: 'error', error: message, duration: -1 })
    }
  }
}, {
  id: 'curtain',
  index: 700,
  run () {
    debug('Stage "curtain"')

    const def = $.Deferred()
    $('#background-loader').idle().fadeOut(250, def.resolve)
    return def
  }
}, {
  id: 'ready',
  index: 1000000000000,
  run () {
    debug('DONE!')
    ox.trigger('core:ready')
  }
})

const exports = {
  // temporary code to get translations for bug 58204
  restore (n) {
    // do not use "gt.ngettext" for plural without count
    const sentence1 = (n === 1)
    // #. %1$s is placeholder for the product name like "App Suite"
      ? gt('The below item was open last time you exited %1$s.', ox.serverConfig.productName)
    // #. %1$s is placeholder for the product name like "App Suite"
      : gt('The below items were open last time you exited %1$s.', ox.serverConfig.productName)

    const sentence2 = gt('Please click "Continue" if you\'d like to continue editing.')

    // do not use "gt.ngettext" for plural without count
    const sentence3 = (n === 1)
    // #. sentence is meant for a single item
      ? gt('If you do not wish to keep the item, please click on the trash icon.')
    // #. sentence is meant for multiple items (n>1)
      : gt('If you do not wish to keep an item, please click on the trash icon.')

    return sentence1 + ' ' + sentence2 + ' ' + sentence3
  }
}

export default exports
