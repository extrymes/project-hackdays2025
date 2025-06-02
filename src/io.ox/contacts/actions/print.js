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
import mini from '@/io.ox/backbone/mini-views'
import print from '@/io.ox/core/print'
import ModalDialogView from '@/io.ox/backbone/views/modal'

import { settings } from '@/io.ox/contacts/settings'
import gt from 'gettext'

const map = {
  simple: () => import('@/io.ox/contacts/print'),
  details: () => import('@/io.ox/contacts/print-details')
}

ext.point('io.ox/contacts/actions/print/dialog').extend({
  id: 'preview',
  index: 100,
  render (baton) {
    let $preview; const def = new $.Deferred()
    this.$body.append(
      $('<div class="col-xs-offset-1 col-xs-6">').append(
        $preview = $('<iframe aria-hidden="true">')
          .attr({
            title: gt('Print preview'),
            src: 'print.html'
          }).on('load', def.resolve)
      ),
      $('<div class="col-xs-5">').append(
        $('<fieldset>').append(
          $('<legend class="sr-only">').attr('aria-labelledby', this.$el.attr('aria-labelledby')),
          new mini.CustomRadioView({
            model: this.model,
            name: 'list-type',
            list: [{
              value: 'simple',
              label: gt('Phone list')
            }, {
              value: 'details',
              // #. the user selects, whether to print a simple phonelist or a detailed contact list.
              label: gt.pgettext('contact-print-dialog', 'Details')
            }]
          }).render().$el
        )
      )
    )

    // add scaling info to body of iframe, as soon as iframe has been loaded
    def.done(function () {
      $preview.contents().find('body').addClass('scaled-preview')
    })

    this.listenTo(this.model, 'change:list-type', async () => {
      const loadPrinter = map[this.model.get('list-type')] || (() => import('@/io.ox/contacts/print'))
      const [{ default: print }] = await Promise.all([loadPrinter(), def])
      const options = print.getOptions(baton.view.options.list)
      const template = $preview.contents().find(options.selector).html()
      const body = $preview.contents().find('body')
      let args = await Promise.all(
        _.chain(options.selection)
          .map(function getCID (obj) {
            return _.isString(obj) ? obj : _.cid(obj)
          })
          .uniq()
          .map(async (cid, index) => {
            const obj = await options.get(_.cid(cid))
            return options.process ? options.process(obj, index, options) : obj
          })
          .value()
      )

      const all = args.length

      if (options.filter) args = args.filter(options.filter)
      if (options.sortBy) args = _(args).sortBy(options.sortBy)

      body.find('.print-wrapper').remove()
      body.prepend($('<div class="print-wrapper">' + $.trim(_.template(template)({
        data: args,
        i18n: options.i18n,
        length: args.length,
        filtered: all - args.length
      })) + '</div>'))
      // remove notes in preview
      body.find('.note').remove()
    })
  }
})

export default {
  multiple (list) {
    new ModalDialogView({
      model: new Backbone.Model({ 'list-type': settings.get('contactsPrintLayout') }),
      title: gt('Select print layout'),
      point: 'io.ox/contacts/actions/print/dialog',
      list: _(list).first(40)
    })
      .build(function () {
        this.$el.addClass('io-ox-contact-print-dialog')
      })
      .addCancelButton()
      .addButton({ label: gt('Print'), action: 'print' })
      .on('print', function () {
        const printFile = map[this.model.get('list-type')] || 'io.ox/contacts/print'
        print.request(printFile, list)
        if (this.model.get('list-type') !== settings.get('contactsPrintLayout')) {
          settings.set('contactsPrintLayout', this.model.get('list-type')).save()
        }
      })
      .on('open', function () {
        // trigger a change list on open to set the initial content of the iframe
        // must be triggered, when the iframe is already in the dom
        this.model.trigger('change:list-type')
      })
      .open()
  }
}
