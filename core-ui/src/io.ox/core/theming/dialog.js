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
import gt from 'gettext'
import theming from '@/io.ox/core/theming/main'
import ModalDialog from '@/io.ox/backbone/views/modal'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import * as settingsUtil from '@/io.ox/core/settings/util'
import { settings } from '@/io.ox/core/settings'

const extensions = {
  accentColors () {
    const { id: currentColorId = null } = theming.getCurrentAccentColor()
    this.$body.append(
      $('<form class="theming-form theming-form-accent-colors">')
        .on('change', this.handleAccentColorChange.bind(this))
        .append(
          $('<fieldset>')
            .prop('disabled', !theming.isChangingAccentColorAllowed())
            .append(
              $('<legend>').append(
                $(`<h${this.level ?? 2} class="first-header">`).text(gt('Accent colors'))
              ),
              $('<ul>').append(
                Object.entries(theming.getColors()).map(([id, color]) => {
                  const hs = `${color.h}, ${color.s}`
                  const hsl = `hsl(${hs}%, 50%)`
                  return $('<li>').append(
                    $('<input type="radio" name="theme-accent-color">')
                      .attr('id', 'theme-accent-color-' + id)
                      .prop('checked', currentColorId === id)
                      .val(id),
                    $('<label>')
                      .attr('for', 'theme-accent-color-' + id)
                      .attr('aria-label', color.name)
                      .append(
                        $('<span class="btn btn-default card card-circle" aria-hidden="true">')
                          // hide title value in a aria-hidden field to avoid screen readers
                          // reading both aria-label and title ("purple purple" etc)
                          .attr({ title: color.name })
                          .css('background-color', hsl)
                      )
                  )
                })
              ))
        )
    )
  },
  themes () {
    const { themes, groups } = theming.getThemes()
    const currentTheme = theming.getCurrentTheme()
    this.$body.append(
      $('<div class="theming-form flex items-baseline">').append(
        $(`<h${this.level ?? 2} class="theming-form-background-title me-8">`).text(gt('Backgrounds')),
        $('<span class="text-xxs theming-form theming-form-darkmode-hint">').text(this.getDarkModeHint())
      ),
      $('<form class="theming-form theming-form-themes">')
        .on('change', this.handleThemeChange.bind(this))
        .append(
          Object.entries(groups).map(([groupId, group]) =>
            $('<fieldset>')
              .append(
                $('<legend class="text-sm">').append(
                  $('<span class="sr-only">').text(`${gt('Backgrounds')} :`),
                  $('<span class="text-medium">').text(group)
                ),
                $('<ul>').append(
                  Object.entries(themes)
                    .filter(([id, theme]) => id !== 'wizard')
                    .filter(([id, theme]) => theme.group === groupId)
                    .map(([id, theme]) =>
                      $('<li class="card-container">').append(
                        $('<input type="radio" name="theme">')
                          .attr('id', 'theme-' + id)
                          .prop('checked', currentTheme.id === id)
                          .val(id),
                        $('<label>')
                          .attr('for', 'theme-' + id)
                          .append(
                            $('<span class="btn btn-default card">')
                              .css('background', theme.backgroundPreview || theme.background || 'none'),
                            $('<div class="card-caption truncate font-normal">').text(theme.title)
                          )
                      )
                    )
                ))
          )
        )
    )
  }
}

const injections = {
  getDarkModeHint () {
    const darkmode = settings.get('theming/autoDarkMode')
    return darkmode ? `(${gt('only sets accent colors in darkmode')})` : ''
  },
  handleDarkmodeChange () {
    const currentTheme = theming.getCurrentTheme()
    const id = this.temporalThemeId || currentTheme.id
    this.handleThemeChange({ originalEvent: { target: { value: id } } })
    this.$body.find('.theming-form-darkmode-hint').text(this.getDarkModeHint())
  },
  handleAccentColorChange (event) {
    const color = event.originalEvent.target.value
    theming.setAccentColorByUser(color)
    this.trigger('change')
  },
  handleThemeChange (event) {
    const themeId = event.originalEvent.target.value
    theming.setTheme(themeId)
    theming.setAccentColorFromTheme(themeId)
    this.temporalThemeId = themeId
    this.$body.find('.theming-form-accent-colors fieldset')
      .prop('disabled', !theming.isChangingAccentColorAllowed())
    this.syncColorTheme()
    this.trigger('change')
  },
  syncColorTheme () {
    // make sure ui reflects current accent color and theme (background)
    const { id: color = null } = theming.getCurrentAccentColor()
    $('input[name=theme-accent-color]:checked').prop('checked', false)
    $(`input[name=theme-accent-color][value="${CSS.escape(color)}"]`).prop('checked', true)
  }
}

export function getModalDialog () {
  const previous = { autoDarkMode: settings.get('theming/autoDarkMode') }
  const dialog = new ModalDialog({
    backdrop: false,
    title: gt('Choose a theme'),
    point: 'io.ox/core/theming/dialog',
    width: '648px'
  })

  dialog
    .extend({
      initialize () {
        this.$body.css({ 'padding-right': '8px', 'max-height': 'calc(50vh)' })
      },
      footer () {
        this.addCancelButton()
        this.addButton({ label: gt('Apply'), action: 'apply' })
        this.$footer.prepend(
          settingsUtil.checkbox('theming/autoDarkMode', gt('Auto dark mode'), settings)
            .attr('title', gt('Automatically switch to dark mode if this computer uses dark mode'))
            .addClass('pull-left')
            .on('change', this.handleDarkmodeChange.bind(this))
        )
      }
    })
    .extend(extensions)
    .inject(injections)
    .on('apply', function () {
      theming.saveCurrent()
    })
    .on('cancel', function () {
      theming.restoreCurrent()
      settings.set('theming/autoDarkMode', previous.autoDarkMode)
    })

  return dialog
}

export function getInplaceDialog (el) {
  const view = new ExtensibleView({ el: $(el).get(0), point: 'io.ox/core/theming/inplace-dialog' })
    .extend(extensions)
    .inject(injections)
    .build(function () {
      this.$el.addClass('theme-dialog')
      this.$body = this.$el
      this.level = 3
    })
    .on('change', function () {
      theming.saveCurrent()
    })
    .render()
  return view
}
