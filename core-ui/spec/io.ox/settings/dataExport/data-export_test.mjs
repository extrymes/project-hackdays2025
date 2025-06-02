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

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import $ from '@/jquery'
import _ from '@/underscore'
import Backbone from '@/backbone'
import moment from '@open-xchange/moment'

import pane from '@/pe/settings/personalData/settings/pane'
import { gt } from 'gettext'

const availableModules = {
  infostore: {
    enabled: true,
    includePublic: false,
    includeShared: false,
    includeTrash: true,
    includeAllVersions: false
  },
  calendar: {
    enabled: true,
    includePublic: false,
    includeShared: true,
    includeUnsubscribed: false
  },
  mail: {
    enabled: true,
    includeTrash: true,
    includePublic: false,
    includeShared: true,
    includeUnsubscribed: false
  },
  tasks: {
    enabled: false,
    includePublic: false,
    includeShared: false
  },
  contacts: {
    enabled: false,
    includePublic: true,
    includeShared: true
  },
  maxFileSize: 2147483648
}

describe('Data export (GDPR)', function () {
  describe('should', function () {
    let status, node
    beforeEach(function () {
      node = $('<div>')
      status = new Backbone.Model({ status: 'NONE' })
    })

    afterEach(function () {
      delete this.availableModulesModel
      delete this.view
    })

    it('draw all nodes and options', function () {
      this.availableModulesModel = new Backbone.Model(availableModules)
      this.view = new pane.SelectDataView({ model: this.availableModulesModel, status })

      node.append(this.view.render().$el)

      // header and containers
      expect(node.find('h2')).toHaveLength(1)

      // main and sub options
      expect(node.find('.main-option')).toHaveLength(5)
      expect(node.find('.dropdown')).toHaveLength(5)
      expect(node.find('li>a')).toHaveLength(15)

      // filesize selector
      expect(node.find('select')).toHaveLength(1)
      expect(node.find('select option')).toHaveLength(3)

      // request button
      expect(node.find('button')).toHaveLength(1)
    })

    // options may not be available due to server config, test this
    it('draw available main options', function () {
      this.availableModulesModel = new Backbone.Model(_(availableModules).pick('mail', 'contacts', 'maxFileSize'))
      this.view = new pane.SelectDataView({ model: this.availableModulesModel, status })

      node.append(this.view.render().$el)

      expect(node.find('.main-option')).toHaveLength(2)
    })

    // options may not be available due to server config, test this
    it('draw available sub options', function () {
      this.availableModulesModel = new Backbone.Model(availableModules)
      this.availableModulesModel.set('infostore', {
        enabled: true,
        includePublic: false,
        includeShared: false
      })
      this.view = new pane.SelectDataView({ model: this.availableModulesModel, status })

      node.append(this.view.render().$el)

      expect(node.find('li>a')).toHaveLength(13)
    })

    // options may not be available due to server config, test this
    it('draw available max sizes', function () {
      this.availableModulesModel = new Backbone.Model(availableModules)
      this.availableModulesModel.set('maxFileSize', 1073741824)
      this.view = new pane.SelectDataView({ model: this.availableModulesModel, status })

      node.append(this.view.render().$el)

      expect(node.find('select option')).toHaveLength(2)
    })

    it('preselect available options', function () {
      this.availableModulesModel = new Backbone.Model(availableModules)
      this.view = new pane.SelectDataView({ model: this.availableModulesModel, status })

      node.append(this.view.render().$el)

      expect(node.find('input:checkbox:checked')).toHaveLength(3)
      expect(node.find('input:checkbox:not(:checked)')).toHaveLength(2)

      expect(node.find('li>a[aria-checked="true"]')).toHaveLength(6)
      expect(node.find('li>a[aria-checked="false"]')).toHaveLength(9)
    })

    it('should create proper data for api request', function () {
      this.availableModulesModel = new Backbone.Model(availableModules)
      this.view = new pane.SelectDataView({ model: this.availableModulesModel, status })

      node.append(this.view.render().$el)
      $(node.find('li>a')[4]).trigger('click')

      expect(JSON.stringify(this.view.getDownloadConfig())).toEqual(JSON.stringify({
        infostore: {
          enabled: true,
          includePublic: false,
          includeShared: false,
          includeTrash: true,
          includeAllVersions: false
        },
        calendar: {
          enabled: true,
          includePublic: true,
          includeShared: true,
          includeUnsubscribed: false
        },
        mail: {
          enabled: true,
          includeTrash: true,
          includePublic: false,
          includeShared: true,
          includeUnsubscribed: false
        },
        tasks: {
          enabled: false,
          includePublic: false,
          includeShared: false
        },
        contacts: {
          enabled: false,
          includePublic: true,
          includeShared: true
        },
        maxFileSize: 2147483648
      }))
    })
  })

  it('should prepare api response correctly', function () {
    // strip timestamps
    expect(JSON.stringify(pane.handleApiResult([{ status: 'DONE' }, 1337]))).toEqual(JSON.stringify({ status: 'DONE' }))

    // failed, aborted status or possible errors should be treated the same as status none
    expect(JSON.stringify(pane.handleApiResult({ status: 'FAILED' }))).toEqual(JSON.stringify({ status: 'NONE' }))
    expect(JSON.stringify(pane.handleApiResult({ status: 'ABORTED' }))).toEqual(JSON.stringify({ status: 'NONE' }))
    expect(JSON.stringify(pane.handleApiResult({ code: '123', error: 'abc' }))).toEqual(JSON.stringify({ status: 'NONE' }))
  })

  describe('should correctly show status', function () {
    let node, availableModulesModel
    beforeEach(function () {
      node = $('<div>')
      availableModulesModel = new Backbone.Model(availableModules)
    })

    afterEach(function () {
      delete this.availableModulesModel
      delete this.node
      delete this.status
      delete this.view
      delete this.dlView
    })

    it('NONE', function () {
      const status = new Backbone.Model(pane.handleApiResult({ status: 'NONE' }))
      this.view = new pane.SelectDataView({ model: availableModulesModel, status })
      this.dlView = new pane.DownloadView({ model: status })

      node.append(this.dlView.render().$el,
        this.view.render().$el
      )

      // download view
      expect(node.find('.personal-data-download-view')).toHaveLength(1)
      expect(node.find('.personal-data-download-view:visible')).toHaveLength(0)

      // header and containers
      expect(node.find('h2')).toHaveLength(1)

      // main and sub options
      expect(node.find('.main-option')).toHaveLength(5)
      expect(node.find('.dropdown')).toHaveLength(5)
      expect(node.find('li>a')).toHaveLength(15)

      // filesize selector
      expect(node.find('select')).toHaveLength(1)
      expect(node.find('select option')).toHaveLength(3)

      // request button
      expect(node.find('button:first').text()).toEqual(gt('Request download'))
    })

    it('PENDING', function () {
      const status = new Backbone.Model(pane.handleApiResult({ status: 'PENDING' }))
      this.view = new pane.SelectDataView({ model: availableModulesModel, status })
      this.dlView = new pane.DownloadView({ model: status })

      node.append(
        this.dlView.render().$el,
        this.view.render().$el
      )

      // download view
      expect(node.find('.personal-data-download-view p.status').text()).toEqual(gt('Your requested archive is currently being created. Depending on the size of the requested data this may take hours or days. You will be informed via email when your download is ready.'))
      expect(node.find('button:first').text()).toEqual(gt('Cancel download request'))

      // header and containers
      expect(node.find('h2')).toHaveLength(2)
      // main and sub options
      expect(node.find('.main-option.disabled')).toHaveLength(5)
      expect(node.find('.dropdown>a.disabled')).toHaveLength(5)
      expect(node.find('li>a.disabled')).toHaveLength(15)

      // filesize selector
      expect(node.find('select:disabled')).toHaveLength(1)
      expect(node.find('select option')).toHaveLength(3)

      // request button
      expect(node.find('button:disabled:last').text()).toEqual(gt('Request download'))
    })

    it('PAUSED', function () {
      const status = new Backbone.Model(pane.handleApiResult({ status: 'PAUSED' }))
      this.view = new pane.SelectDataView({ model: availableModulesModel, status })
      this.dlView = new pane.DownloadView({ model: status })

      node.append(
        this.dlView.render().$el,
        this.view.render().$el
      )

      // download view
      expect(node.find('.personal-data-download-view p.status').text()).toEqual(gt('Your requested archive is currently being created. Depending on the size of the requested data this may take hours or days. You will be informed via email when your download is ready.'))
      expect(node.find('button:first').text()).toEqual(gt('Cancel download request'))

      // header and containers
      expect(node.find('h2')).toHaveLength(2)
      // main and sub options
      expect(node.find('.main-option.disabled')).toHaveLength(5)
      expect(node.find('.dropdown>a.disabled')).toHaveLength(5)
      expect(node.find('li>a.disabled')).toHaveLength(15)

      // filesize selector
      expect(node.find('select:disabled')).toHaveLength(1)
      expect(node.find('select option')).toHaveLength(3)

      // request button
      expect(node.find('button:disabled:last').text()).toEqual(gt('Request download'))
    })

    it('RUNNING', function () {
      const status = new Backbone.Model(pane.handleApiResult({ status: 'RUNNING' }))
      this.view = new pane.SelectDataView({ model: availableModulesModel, status })
      this.dlView = new pane.DownloadView({ model: status })

      node.append(
        this.dlView.render().$el,
        this.view.render().$el
      )

      // download view
      expect(node.find('.personal-data-download-view p.status').text()).toEqual(gt('Your requested archive is currently being created. Depending on the size of the requested data this may take hours or days. You will be informed via email when your download is ready.'))
      expect(node.find('button:first').text()).toEqual(gt('Cancel download request'))

      // header and containers
      expect(node.find('h2')).toHaveLength(2)
      // main and sub options
      expect(node.find('.main-option.disabled')).toHaveLength(5)
      expect(node.find('.dropdown>a.disabled')).toHaveLength(5)
      expect(node.find('li>a.disabled')).toHaveLength(15)

      // filesize selector
      expect(node.find('select:disabled')).toHaveLength(1)
      expect(node.find('select option')).toHaveLength(3)

      // request button
      expect(node.find('button:disabled:last').text()).toEqual(gt('Request download'))
    })

    it('DONE', function () {
      const status = new Backbone.Model(pane.handleApiResult({
        status: 'DONE',
        availableUntil: 1573202539498,
        creationTime: 1571992609115,
        id: 123,
        results: [{
          contentType: 'application/zip',
          fileInfo: 'archive-2019-10-25.zip',
          number: 1,
          taskId: '123'
        }]
      }))
      this.view = new pane.SelectDataView({ model: availableModulesModel, status })
      this.dlView = new pane.DownloadView({ model: status })

      node.append(this.dlView.render().$el,
        this.view.render().$el
      )

      // header and containers
      expect(node.find('h2')).toHaveLength(2)

      // downloads
      expect(node.find('ul.downloads')).toHaveLength(1)
      expect(node.find('ul.downloads li')).toHaveLength(1)
      expect(node.find('ul.downloads li span')).toHaveLength(1)
      expect(node.find('.personal-data-download-view p.status').text()).toEqual(gt('Your data archive from %2$s is ready for download. The download is available until %1$s.', moment(status.get('availableUntil')).format('L'), moment(status.get('creationTime')).format('L')))
      expect(node.find('ul.downloads li span').text()).toEqual('archive-2019-10-25.zip')
      expect(node.find('button').filter(function () { return $(this).text() === 'Request new download' })).toHaveLength(1)

      // main and sub options
      expect(node.find('.main-option')).toHaveLength(5)
      expect(node.find('.main-option.disabled')).toHaveLength(0)
      expect(node.find('.dropdown')).toHaveLength(5)
      expect(node.find('.dropdown>a.disabled')).toHaveLength(0)
      expect(node.find('li>a')).toHaveLength(15)
      expect(node.find('li>a.disabled')).toHaveLength(0)

      // filesize selector
      expect(node.find('select:enabled')).toHaveLength(1)
      expect(node.find('select option')).toHaveLength(3)

      // request button
      expect(node.find('button:last').text()).toEqual(gt('Request new download'))
    })

    it('FAILED', function () {
      const status = new Backbone.Model(pane.handleApiResult({ status: 'FAILED' }))
      this.view = new pane.SelectDataView({ model: availableModulesModel, status })
      this.dlView = new pane.DownloadView({ model: status })

      node.append(
        this.dlView.render().$el,
        this.view.render().$el
      )

      // download view
      expect(node.find('.personal-data-download-view')).toHaveLength(1)
      expect(node.find('.personal-data-download-view:visible')).toHaveLength(0)

      // header and containers
      expect(node.find('h2')).toHaveLength(1)

      // main and sub options
      expect(node.find('.main-option')).toHaveLength(5)
      expect(node.find('.dropdown')).toHaveLength(5)
      expect(node.find('li>a')).toHaveLength(15)

      // filesize selector
      expect(node.find('select')).toHaveLength(1)
      expect(node.find('select option')).toHaveLength(3)

      // request button
      expect(node.find('button:first').text()).toEqual(gt('Request download'))
    })

    it('ABORTED', function () {
      const status = new Backbone.Model(pane.handleApiResult({ status: 'ABORTED' }))
      this.view = new pane.SelectDataView({ model: availableModulesModel, status })
      this.dlView = new pane.DownloadView({ model: status })

      node.append(
        this.dlView.render().$el,
        this.view.render().$el
      )

      // download view
      expect(node.find('.personal-data-download-view')).toHaveLength(1)
      expect(node.find('.personal-data-download-view:visible')).toHaveLength(0)

      // header and containers
      expect(node.find('h2')).toHaveLength(1)

      // main and sub options
      expect(node.find('.main-option')).toHaveLength(5)
      expect(node.find('.dropdown')).toHaveLength(5)
      expect(node.find('li>a')).toHaveLength(15)

      // filesize selector
      expect(node.find('select')).toHaveLength(1)
      expect(node.find('select option')).toHaveLength(3)

      // request button
      expect(node.find('button:first').text()).toEqual(gt('Request download'))
    })
  })
})
