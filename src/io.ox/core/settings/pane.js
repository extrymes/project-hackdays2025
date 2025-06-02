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
import moment from '@open-xchange/moment'
import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import * as util from '@/io.ox/core/settings/util'
import apps from '@/io.ox/core/api/apps'
import locale from '@/io.ox/core/locale'
import TimezonePicker from '@/io.ox/backbone/mini-views/timezonepicker'
import { changePassword } from '@/io.ox/settings/security/change-password'
import { st, isConfigurable } from '@/io.ox/settings/index'

import { settings } from '@/io.ox/core/settings'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import gt from 'gettext'

let INDEX = 0
const MINUTES = 60000

// this is the official point for settings
ext.point('io.ox/core/settings/detail').extend({
  index: 100,
  id: 'view',
  draw () {
    this.append(
      util.header(
        st.GENERAL,
        'ox.appsuite.user.sect.settings.commonsettings.html'
      ),
      new ExtensibleView({ point: 'io.ox/core/settings/detail/view', model: settings })
        .inject({

          showNoticeFields: ['language', 'timezone'],

          showNotice (attr) {
            return _(this.showNoticeFields).some(function (id) {
              return id === attr
            })
          },

          reloadHint: gt('Changing language or timezone requires a page reload or relogin to take effect.'),

          getLanguageOptions () {
            const isCustomized = !_.isEmpty(settings.get('localeData'))
            const current = locale.current()
            return _(locale.getSupportedLocales())
              .map(function (locale) {
                locale.name = isCustomized && locale.id === current ? locale.name + ' / ' + gt('Customized') : locale.name
                return { label: locale.name, value: locale.id }
              })
          },

          getRefreshOptions () {
            return [
              { label: gt('5 minutes'), value: 5 * MINUTES },
              { label: gt('10 minutes'), value: 10 * MINUTES },
              { label: gt('15 minutes'), value: 15 * MINUTES },
              { label: gt('30 minutes'), value: 30 * MINUTES }
            ]
          },

          propagateSettingsLanguage (val) {
            import('@/io.ox/core/api/tab').then(function ({ default: tabApi }) {
              const newSettings = {
                language: locale.deriveSupportedLanguageFromLocale(val),
                locale: val
              }
              tabApi.propagate('update-ox-object', _.extend(newSettings, { exceptWindow: tabApi.getWindowName() }))
              tabApi.updateOxObject(newSettings)
            })
          },

          propagateSettingsTheme (val) {
            import('@/io.ox/core/api/tab').then(function ({ default: tabApi }) {
              tabApi.propagate('update-ox-object', { theme: val, exceptWindow: tabApi.getWindowName() })
              tabApi.updateOxObject({ theme: val })
            })
          }

        })
        .build(function () {
          this.$el.addClass('settings-body')
        })
        .render().$el
    )
  }
})

ext.point('io.ox/core/settings/detail/view').extend(
  //
  // Events handlers
  //
  {
    id: 'onchange',
    index: INDEX += 100,
    render () {
      this.listenTo(settings, 'change', function (attr, value) {
        if (ox.tabHandlingEnabled && attr === 'theme') this.propagateSettingsTheme(value)
        if (ox.tabHandlingEnabled && attr === 'language') this.propagateSettingsLanguage(value)
        const showNotice = this.showNotice(attr)
        settings.saveAndYell(undefined, { force: !!showNotice }).then(
          async () => {
            // reload mail settings to avoid an error with MW translated mail category names. See OXUIB-2410
            await mailSettings.reload()
            if (!showNotice) return
            this.$('.reload-page').show()
          }
        )
      })
    }
  },
  {
    id: 'theme',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.THEME) return
      return util.renderExpandableSection(st.THEME, st.THEME_EXPLANATION, 'io.ox/settings/general/theme', true).call(this, baton)
    }
  },
  {
    id: 'language',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.LANGUAGE_TIMEZONE) return
      return util.renderExpandableSection(st.LANGUAGE_TIMEZONE, st.LANGUAGE_TIMEZONE_EXPLANATION, 'io.ox/settings/general/language').call(this, baton)
    }
  },
  {
    id: 'apps',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.START_APP) return
      return util.renderExpandableSection(st.START_APP, st.START_APP_EXPLANATION, 'io.ox/settings/general/apps').call(this, baton)
    }
  },
  {
    id: 'shortcuts',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.SHORTCUTS) return
      return util.renderExpandableSection(st.SHORTCUTS, st.SHORTCUTS_EXPLANATION, 'io.ox/settings/general/shortcuts').call(this, baton)
    }
  },
  {
    id: 'advanced',
    index: 10000,
    render: util.renderExpandableSection(st.GENERAL_ADVANCED, '', 'io.ox/settings/general/advanced')
  }
)

INDEX = 0
ext.point('io.ox/settings/general/theme').extend(
  //
  // Theme
  //
  {
    id: 'theme',
    index: INDEX += 100,
    async render (baton) {
      const $el = $('<div>')
      this.append($el)
      const { getInplaceDialog } = await import('@/io.ox/core/theming/dialog')
      getInplaceDialog($el)
    }
  }
)

INDEX = 0
ext.point('io.ox/settings/general/language').extend(
  //
  // Hint on reload
  //
  {
    id: 'hint',
    index: INDEX += 100,
    render ({ view }) {
      this.append(
        $('<div class="settings-hint reload-page">').hide().append(
          $('<div class="mb-16">').text(view.reloadHint),
          $('<div>').append(
            $('<button type="button" class="btn btn-primary" data-action="reload">')
              .text(gt('Reload page'))
              .on('click', () => { location.reload() })
          )
        )
      )
    }
  },
  //
  // Language
  //
  {
    id: 'language',
    index: INDEX += 100,
    render ({ view, model }) {
      if (!isConfigurable.LANGUAGE) return

      const $select = util.compactSelect('language', st.LANGUAGE, model, view.getLanguageOptions())
      const selectView = $select.find('select').data('view')

      selectView.listenTo(model, 'change:language', function (language) {
        _.setCookie('locale', language)
      })

      selectView.listenTo(ox, 'change:locale:data', function () {
        this.$el.siblings('.locale-example').text(getExample())
        this.setOptions(view.getLanguageOptions())
      })

      this.append(
        $('<div class="pseudo-fieldset">').append(
          $select.addClass('legendary-label'),
          $('<label>').text(gt('Example formats based on current language')),
          $('<div class="locale-example mb-8" style="white-space: pre">').text(getExample()),
          $('<button role="button" class="btn btn-default" id="regional-settings">')
            .text(st.CUSTOM_LOCALE + ' ...')
            .on('click', editLocale)
        )
      )

      function getExample () {
        return moment().month(0).date(29).hour(9).minute(0).format('dddd, L LT') + '   ' +
          locale.getDefaultNumberFormat() + '\n' +
          gt('First day of the week: %1$s', locale.getFirstDayOfWeek())
      }

      function editLocale (e) {
        e.preventDefault()
        import('@/io.ox/core/settings/editLocale').then(function ({ default: dialog }) {
          dialog.open()
        })
      }
    }
  },
  //
  // Timezone
  //
  {
    id: 'timezone',
    index: INDEX += 100,
    render ({ model }) {
      if (!isConfigurable.TIMEZONE) return
      this.append(
        $('<div class="pseudo-fieldset">').append(
          $('<div class="row mt-24">').append(
            $('<div class="col-md-6 legendary-label">').append(
              $('<label for="settings-timezone">').text(st.TIMEZONE),
              new TimezonePicker({
                name: 'timezone',
                model,
                id: 'settings-timezone',
                showFavorites: true
              }).render().$el
            )
          )
        )
      )
    }
  }
)

INDEX = 0
ext.point('io.ox/settings/general/apps').extend(
  //
  // Auto start
  //
  {
    id: 'autoStart',
    index: INDEX += 100,
    render ({ model }) {
      this.append(
        $('<div class="pseudo-fieldset">').append(
          // #. Start with (application)
          util.compactSelect('autoStart', st.START_WITH, model, apps.getAvailableApps())
        )
      )
    }
  },
  //
  // Quick launch bar
  //
  {
    id: 'quicklaunch',
    index: INDEX += 100,
    render ({ model }) {
      this.append(
        $('<div class="pseudo-fieldset">').append(
          $('<button type="button" class="btn btn-default mt-32" data-action="configure-quick-launchers">')
            .text(st.QUICK_LAUNCH_BAR + ' ...')
            .on('click', async () => {
              const { default: quickLauncherDialog } = await import('@/io.ox/core/settings/dialogs/quickLauncherDialog')
              quickLauncherDialog.openDialog()
            })
        )
      )
    }
  }
)

INDEX = 0
ext.point('io.ox/settings/general/advanced').extend(
  //
  // Refresh Interval
  //
  {
    id: 'refreshInterval',
    index: INDEX += 100,
    render ({ view, model }) {
      if (!isConfigurable.REFRESH) return
      this.append(
        // #. Reload data every (x minutes)
        util.compactSelect('refreshInterval', st.REFRESH, model, view.getRefreshOptions())
      )
    }
  },
  {
    id: 'buttons',
    index: INDEX += 100,
    render (baton) {
      const $group = $('<div class="form-group">')
      ext.point('io.ox/settings/general/advanced/buttons').invoke('render', $group, baton)
      if ($group.children().length > 0) this.append($group)
    }
  }
)

INDEX = 0
ext.point('io.ox/settings/general/advanced/buttons').extend(
  {
    id: 'password',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.CHANGE_PASSWORD) return
      this.append(
        $('<button type="button" class="btn btn-default me-16" data-action="edit-password">')
          .text(st.CHANGE_PASSWORD + ' ...')
          .on('click', async () => {
            await changePassword()
          })
      )
    }
  },
  {
    id: 'categories',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.MANAGE_CATEGORIES) return
      this.append(
        $('<button type="button" class="btn btn-default me-16" data-name="categories">')
          .text(st.MANAGE_CATEGORIES + ' ...')
          .on('click', async () => {
            const categories = await import('@/io.ox/core/categories/view')
            categories.openManageCategoryModal({ previousFocus: this.$toggle })
          })
      )
    }
  },
  {
    id: 'deputy',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.MANAGE_DEPUTIES) return
      this.append(
        $('<button type="button" class="btn btn-default me-16" data-action="manage-deputies">')
          .text(st.MANAGE_DEPUTIES + ' ...')
          .on('click', async () => {
            const { default: dialog } = await import('@/io.ox/core/deputy/dialog')
            dialog.open()
          })
      )
    }
  }
)
