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
import Backbone from '@/backbone'
import ext from '@/io.ox/core/extensions'
import Stage from '@/io.ox/core/extPatterns/stage'
import theming from '@/io.ox/core/theming/main'
import { settings } from '@/io.ox/core/settings'

(function () {
  // exclude smartphones
  if (_.device('smartphone')) return

  //
  // This is quick & dirty code. Don't adopt this style for productive use.
  // For Internal use only! No i18n, no a11y support, latest Chrome/Firefox only!
  //

  $('body').append(
    '<div class="modal" id="customize-dialog" style="top: 72px; right: 24px; left: auto;">' +
    '  <div class="modal-dialog modal-sm" style="margin-top: 0">' +
    '    <div class="modal-content">' +
    '      <div class="modal-header">' +
    '        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
    '        <h5 class="modal-title">Branding Wizard</h5>' +
    '      </div>' +
    '      <div class="modal-body container-fluid">' +
    // Accent color
    '        <div class="row form-group">' +
    '          <div class="col-xs-12"><label>Accent color</label><br>' +
    '            <select class="form-control" size="1" data-name="accentColor">' +
    '              ' + _(theming.getColors()).map(color => `<option value="${color.h}, ${color.s}">${color.name}</option>`) +
    '            </select>' +
    '          </div>' +
    '        </div>' +
    '        <div class="row form-group">' +
    '          <div class="col-xs-6"><label>Background #1</label><br><input type="color" data-name="background1"></div>' +
    '          <div class="col-xs-6 text-right"><label>Background #2</label><br><input type="color" data-name="background2"></div>' +
    '        </div>' +
    '        <div class="row form-group">' +
    '          <div class="col-xs-12"><label>Gradient type</label><br><input type="range" min="0" max="5" data-name="backgroundGradient"></div>' +
    '        </div>' +
    '        <div class="row form-group">' +
    '          <div class="col-xs-12"><label>Translucency</label><br><input type="range" min="0" max="3" data-name="translucencyFactor"></div>' +
    '        </div>' +
    '        <div class="row form-group">' +
    '          <div class="col-xs-12"><label>Gap</label><br><input type="range" min="1" max="12" data-name="gap"></div>' +
    '        </div>' +
    '        <div class="row">' +
    '          <div class="col-xs-12"><label><input type="checkbox" data-name="brightTopbarIcons"> Bright Topbar Icons</label></div>' +
    '        </div>' +
    '        <div class="row">' +
    '          <div class="col-xs-12"><label><input type="checkbox" data-name="brightSearchBar"> Bright search bar</label></div>' +
    '        </div>' +
    '        <div class="row form-group">' +
    '          <div class="col-xs-12"><label><input type="checkbox" checked="checked" data-name="showLogo"> Show logo</label></div>' +
    '        </div>' +
    '        <div class="row form-group">' +
    '          <div class="col-xs-12"><div class="btn-group"><span class="btn btn-default btn-file">Upload logo<input type="file" class="file-input"></span><button type="button" class="btn btn-default clear-logo">&times;</button></div></div>' +
    '        </div>' +
    '        <div class="row form-group">' +
    '          <div class="col-xs-12 text-right">' +
    '            <button type="button" class="btn btn-default reset-model">Reset</button>' +
    '          </div>' +
    '        </div>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '</div>'
  )

  $('#customize-dialog').modal({ backdrop: false, keyboard: true, show: false })

  // show modal dialog
  $(document).on('click', '#io-ox-appcontrol', function (e) {
    if (!e.altKey) return
    e.preventDefault()
    $('#customize-dialog').modal('toggle')
  })

  const model = new Backbone.Model()
  const fields = $('#customize-dialog').find('select, input[data-name]')
  const defaults = {
    accentColor: '231, 48',
    background1: 'white',
    background2: 'white',
    backgroundGradient: 0,
    translucencyFactor: 1,
    gap: 1,
    brightTopbarIcons: false,
    brightSearchBar: false,
    showLogo: true,
    url: ''
  }

  function reset () {
    model.set(defaults)
  }

  function getGradient () {
    const color1 = model.get('background1') || '#fff'
    const color2 = model.get('background2') || '#fff'
    switch (model.get('backgroundGradient')) {
      case 1: return `linear-gradient(to bottom, ${color1}, ${color2})`
      case 2: return `linear-gradient(to top, ${color1}, ${color2})`
      case 3: return `linear-gradient(45deg, ${color1}, ${color2})`
      case 4: return `radial-gradient(${color1} 50%, ${color2})`
      case 5: return `radial-gradient(at 50% 100%, ${color1} 30%, ${color2})`
      default: return 'linear-gradient(0deg, var(--gray-100), white)'
    }
  }

  const updateTheme = _.debounce(function () {
    const accentColor = model.get('accentColor')
    if (accentColor) theming.setAccentColorByUser(accentColor)
    const background = getGradient()
    const gap = model.get('gap') || 1
    $('#io-ox-core').toggleClass('dark', false).css({ background })
    $('#theme-values').text(
      ':root {\n' +
      `--gap: ${gap}px;\n` +
      `--gap-radius: ${gap > 1 ? 'var(--default-radius)' : '0px'};\n` +
      `--translucency-factor: ${getTranslucency(model.get('translucencyFactor'))};\n` +
      (model.get('brightTopbarIcons') ? '--topbar-icon: white;\n' : '') +
      (model.get('brightSearchBar') ? '--topbar-search-background: white;\n' : '') +
      '}'
    )
  }, 50)

  function getTranslucency (value) {
    // pretty verbose but avoids odd floating numbers
    if (value === 0) return '0'
    if (value === 1) return '0.1'
    if (value === 2) return '0.2'
    return '0.3'
  }

  model.on('change', updateTheme)

  model.on('change:showLogo', function (model, value) {
    $('#io-ox-top-logo').css('display', value === true ? 'flex' : 'none')
  })

  model.on('change:url', function (model, value) {
    url = value
    updateLogo()
  })

  //
  // Respond to general change event. Update fields & save on server
  //
  model.on('change', function (model) {
  // update fields
    _(model.changed).each(function (value, name) {
      const field = fields.filter(`[data-name="${CSS.escape(name)}"]`)
      const current = field.val()
      if (field.attr('type') === 'checkbox') {
        field.prop('checked', value)
      } else if (current !== value) {
        field.val(value)
      }
    })
    // save
    const theme = _.extend(model.toJSON(), { title: 'Wizard', background: '', dark: false, tint: true })
    settings.set('theming/themes/custom/wizard', theme).save()
  })

  const initialize = function () {
    const theme = settings.get('theming/themes/custom/wizard', defaults)
    model.set(theme)
    updateTheme()
  }

  let url = ''

  ext.point('io.ox/core/theming/logo').extend({
    id: 'custom',
    index: 'first',
    get (baton) {
      if (!url) return false
      baton.stopPropagation()
      return { path: url }
    }
  })

  function updateLogo () {
    theming.renderLogo().then(img => {
      if (url !== '') {
        model.set('showLogo', true)
      } else {
        $('#customize-dialog input[type="file"]').val('')
      }
      img.css('maxHeight', $('#io-ox-appcontrol').height())
    })
  }

  // on change color
  fields.filter('select, [type="color"]').on('change', function () {
    model.set($(this).data('name'), $(this).val())
  })

  // on change range - use "input" event instead of change to get continuous feedback
  const sliders = ['backgroundGradient', 'translucencyFactor', 'gap']
  sliders.forEach(name => {
    fields.filter(`[data-name="${name}"]`).on('input', function () {
      const value = parseInt($(this).val(), 10)
      model.set(name, value)
    })
  })

  // on change checkbox
  const checkboxes = ['brightTopbarIcons', 'brightSearchBar', 'showLogo']
  checkboxes.forEach(name => {
    fields.filter(`[data-name="${name}"]`).on('change', function () {
      const state = $(this).prop('checked')
      model.set(name, state)
    })
  })

  // on select file
  $('#customize-dialog input[type="file"]').on('change', function () {
    let file = this.files[0]

    if (!file) return
    if (!file.type.match(/image.*/)) return

    let reader = new FileReader()
    reader.onload = function () {
      url = reader.result
      // jslobs cannot handle more that 64KB right now; let's keep some safety distance
      if (url.length <= 54 * 1024) model.set('url', url); else updateLogo()
      file = reader = null
    }
    reader.readAsDataURL(file)
  })

  $('#customize-dialog .clear-logo').on('click', function () {
    url = ''
    model.set('url', '')
    model.set('showLogo', true)
  })

  $('#customize-dialog .reset-model').on('click', function (e) {
    e.preventDefault()
    reset()
    model.clear()
    url = ''
    updateLogo()
  })
  // eslint-disable-next-line no-new
  new Stage('io.ox/core/stages', {
    id: 'customize-banner',
    before: 'curtain',
    run: initialize
  })
}())
