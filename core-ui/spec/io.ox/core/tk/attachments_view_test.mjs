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

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import $ from '@/jquery'
import Backbone from '@/backbone'

import Attachments from '@/io.ox/core/attachments/view'
import AttachmentsBackbone from '@/io.ox/core/attachments/backbone'

jest.useFakeTimers('modern')

describe('Core Attachments Views:', function () {
  it('API should provide an AttachmentList view', function () {
    expect(Attachments.List).not.toBeUndefined()
  })

  it('API should provide an Attachment view', function () {
    expect(Attachments.View).not.toBeUndefined()
  })

  it('API should provide an Attachment view rendering with preview', function () {
    expect(Attachments.Preview).not.toBeUndefined()
  })

  it('provided by the API should be extendable (Backbone views)', function () {
    expect(Attachments.List).toHaveProperty('extend')
    expect(Attachments.View).toHaveProperty('extend')
    expect(Attachments.Preview).toHaveProperty('extend')
  })

  describe('AttachmentList', function () {
    let EmptyAttachmentList
    const FileModel = Backbone.Model.extend({
      isFileAttachment: () => true
    })
    const NonFileModel = Backbone.Model.extend({
      isFileAttachment: () => false
    })

    beforeEach(function () {
      EmptyAttachmentList = Attachments.List.extend({
        collection: new AttachmentsBackbone.Collection()
      })
    })
    it('has a constructor expecting a Collection', function () {
      const createWithCollection = () => new Attachments.List({
        collection: new AttachmentsBackbone.Collection()
      })

      const createWithoutCollection = () => new Attachments.List({})

      expect(createWithoutCollection).toThrow(Error)
      expect(createWithCollection).not.toThrow(Error)
    })

    describe('has a preview mode toggle', function () {
      const Model = Backbone.Model.extend({
        isFileAttachment: () => true
      })
      const list = new Attachments.List({
        collection: new AttachmentsBackbone.Collection([new Model(), new Model()]),
        AttachmentView: Backbone.View.extend({
          tagName: 'li'
        })
      })

      list.render().onToggleDetails({ preventDefault: () => {} })
      expect(list.$el.hasClass('show-preview')).toEqual(false)
      list.onToggleMode({ preventDefault: () => {} })
      expect(list.$el.hasClass('show-preview')).toEqual(true)
    })

    it('only renders "file attachment" models', function () {
      const model = new NonFileModel({})
      let list = new EmptyAttachmentList({
        AttachmentView: new Backbone.View()
      })
      const renderMe = jest.spyOn(list.options.AttachmentView, 'render').mockReturnValue(() => { return { $el: $() } })

      list.collection.reset([model])
      list.render().onToggleDetails({ preventDefault: () => {} })
      expect(renderMe.mock.calls).toHaveLength(0)

      jest.spyOn(model, 'isFileAttachment').mockReturnValue(() => true)
      list = new EmptyAttachmentList({
        AttachmentView: Backbone.View.extend({
          render: renderMe
        })
      })
      list.collection.reset([model])
      list.render().onToggleDetails({ preventDefault: () => {} })
      // render twice, one time with preview, one time without
      expect(renderMe.mock.calls).toHaveLength(2)
    })

    it('allows to provide custom attachment views', function () {
      const model = new FileModel()
      const renderMe = jest.fn().mockReturnValue({ $el: $() })
      const list = new EmptyAttachmentList({
        AttachmentView: Backbone.View.extend({
          render: renderMe
        })
      })

      list.collection.reset([model])
      list.render().onToggleDetails({ preventDefault: () => {} })
      // render twice, one time with preview, one time without
      expect(renderMe.mock.calls).toHaveLength(2)
    })

    describe('renders', function () {
      it('with empty class for empty collections', function () {
        const list = new EmptyAttachmentList({})

        list.render()
        $('body').append(list.$el)
        expect(list.$el.hasClass('empty')).toEqual(true)
        list.remove()
      })

      it('with "closed" and empty list for collections with more than one item', function () {
        const Model = Backbone.Model.extend({
          isFileAttachment: () => true
        })
        const list = new Attachments.List({
          collection: new AttachmentsBackbone.Collection([new Model(), new Model()]),
          AttachmentView: Backbone.View.extend({})
        })

        list.render()
        expect(list.$el.hasClass('open')).toEqual(false)
        expect(list.$('ul.preview').children('li')).toHaveLength(0)
      })

      it('a default header', function () {
        const Model = Backbone.Model.extend({
          isFileAttachment: () => true
        })
        const list = new Attachments.List({
          collection: new AttachmentsBackbone.Collection([new Model()]),
          AttachmentView: Backbone.View.extend({})
        })

        list.render()
        expect(list.$('.header')).toHaveLength(1)
      })

      it('a custom header instead of default one', function () {
        const Model = Backbone.Model.extend({
          isFileAttachment: () => true
        })
        const list = new Attachments.List({
          collection: new AttachmentsBackbone.Collection([new Model()]),
          AttachmentView: Backbone.View.extend({})
        })

        list.renderHeader = () => true
        const renderMock = jest.spyOn(list, 'renderHeader')

        list.render()
        // custom header rendered
        expect(renderMock.mock.calls).toHaveLength(1)
        // default header not rendered
        expect(list.$('.header').children()).toHaveLength(0)
      })

      it('a details toggle', function () {
        const Model = Backbone.Model.extend({
          isFileAttachment: () => true
        })
        const list = new Attachments.List({
          collection: new AttachmentsBackbone.Collection([new Model()]),
          AttachmentView: Backbone.View.extend({})
        })

        list.render()
        expect(list.$('.header a.toggle-details')).toHaveLength(1)
      })

      it('a preview mode toggle', function () {
        const Model = Backbone.Model.extend({
          isFileAttachment: () => true
        })
        const list = new Attachments.List({
          collection: new AttachmentsBackbone.Collection([new Model()]),
          AttachmentView: Backbone.View.extend({})
        })

        list.render()
        expect(list.$('.header a.toggle-mode')).toHaveLength(1)
      })
    })

    it('has a details toggle', function () {
      const Model = Backbone.Model.extend({
        isFileAttachment: () => true
      })
      const list = new Attachments.List({
        collection: new AttachmentsBackbone.Collection([new Model(), new Model()]),
        AttachmentView: Backbone.View.extend({
          tagName: 'li'
        })
      })

      list.render()
      // renders closed by default
      expect(list.$el.hasClass('open')).toEqual(false)
      list.onToggleDetails({ preventDefault: () => {} })
      expect(list.$el.hasClass('open')).toEqual(true)
    })

    describe('can dynamically add/remove attachments', function () {
      it('attaches a new list item', function () {
        const Model = Backbone.Model.extend({
          isFileAttachment: () => true
        })

        const list = new Attachments.List({
          collection: new AttachmentsBackbone.Collection([new Model(), new Model()]),
          AttachmentView: Backbone.View.extend({
            tagName: 'li'
          })
        })

        list.render().onToggleDetails({ preventDefault: () => {} })
        expect(list.$el.hasClass('open')).toEqual(true)
        expect(list.$('ul.preview').children('li')).toHaveLength(2)
        list.collection.add(new Model())
        expect(list.$('ul.preview').children('li')).toHaveLength(3)
      })

      it('updates the header', function () {
        const Model = Backbone.Model.extend({
          isFileAttachment: () => true
        })
        const list = new Attachments.List({
          collection: new AttachmentsBackbone.Collection([new Model(), new Model()]),
          AttachmentView: Backbone.View.extend({
            tagName: 'li'
          })
        })

        list.render().onToggleDetails({ preventDefault: () => {} })
        list.collection.add(new Model())
        expect(list.$('.header').text()).toContain('3 attachments')
      })
    })
  })
})

describe('Core Attachment View:', function () {
  const FakeModel = Backbone.Model.extend({
    needsUpload: () => false,
    getTitle: () => 'TestTitle',
    getShortTitle: () => 'TestTitle',
    getSize: () => 65535
  })

  it('should render a li item', function () {
    const model = new FakeModel()
    model.collection = new Backbone.Collection()
    const view = new Attachments.View({ model })
    view.render()
    expect(view.$el.is('li')).toEqual(true)
  })
  it('should render the title', function () {
    const model = new FakeModel()
    model.collection = new Backbone.Collection()
    const view = new Attachments.View({ model })
    view.render()
    expect(view.$el.text()).toContain('TestTitle')
  })
})
