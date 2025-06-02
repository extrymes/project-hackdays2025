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

import CollectionLoader from '@/io.ox/core/api/collection-loader'
import Pool from '@/io.ox/core/api/collection-pool'

function fetch (params) {
  const result = [{ id: 10 }, { id: 20 }, { id: 30 }, { id: 40 }, { id: 50 }, { id: 60 }]
  return $.Deferred().resolve(
    result.slice.apply(result, params.limit.split(','))
  )
}

function fetchAlternative () {
  return $.Deferred().resolve(
    [{ id: 70 }, { id: 20 }, { id: 40 }, { id: 50 }, { id: 80 }]
  )
}
describe('Core Collection', function () {
  describe('loader', function () {
    let loader

    beforeEach(function () {
      loader = new CollectionLoader({
        PRIMARY_PAGE_SIZE: 3,
        SECONDARY_PAGE_SIZE: 3,
        getQueryParams: function () {
          return {
            folder: 'default0/INBOX'
          }
        }
      })
      loader.fetch = fetch
    })

    describe('cid()', function () {
      it('is a function', function () {
        expect(loader.cid).toBeInstanceOf(Function)
      })

      it('handles missing parameters correctly', function () {
        expect(loader.cid()).toEqual('default')
      })

      it('handles empty object correctly', function () {
        expect(loader.cid({})).toEqual('default')
      })

      it('returns correct composite ID', function () {
        expect(loader.cid({ a: 1, b: 2 })).toEqual('a=1&b=2')
      })
    })

    describe('addIndex()', function () {
      it('is a function', function () {
        expect(loader.addIndex).toBeInstanceOf(Function)
      })

      it('injects index property', function () {
        const data = [{ a: 10 }]
        loader.addIndex(0, {}, data)
        expect(data).toStrictEqual([{ a: 10, index: 0 }])
      })

      it('calls each()', function () {
        const data = [{ a: 10 }]
        loader.each = function (obj) { obj.test = true }
        loader.addIndex(0, {}, data)
        expect(data).toStrictEqual([{ a: 10, index: 0, test: true }])
      })
    })

    describe('Instance', function () {
      it('returns a collection', function () {
        expect(loader.getDefaultCollection()).toBeInstanceOf(Backbone.Collection)
        expect(loader.getCollection()).toBeInstanceOf(Backbone.Collection)
      })

      it('has a load method that returns a collection', function () {
        const collection = loader.load()
        expect(collection).toBeInstanceOf(Backbone.Collection)
      })

      it('has a load method that loads initial data', function (done) {
        const collection = loader.load()
        collection.once('load', function () {
          expect(this.pluck('id')).toStrictEqual([10, 20, 30])
          expect(this.pluck('index')).toStrictEqual([0, 1, 2])
          done()
        })
      })

      it('has a paginate method that loads more data', function (done) {
        loader.load().once('load', function () {
          expect(this.pluck('id')).toStrictEqual([10, 20, 30])
          expect(this.pluck('index')).toStrictEqual([0, 1, 2])
          loader.paginate().once('paginate', function () {
            expect(this.pluck('id')).toStrictEqual([10, 20, 30, 40, 50, 60])
            expect(this.pluck('index')).toStrictEqual([0, 1, 2, 3, 4, 5])
            done()
          })
        })
      })

      it('has a reload method that reloads data', function (done) {
        loader.load().once('load', function () {
          loader.fetch = fetchAlternative
          loader.reload().once('reload', function () {
            expect(this.pluck('id')).toStrictEqual([70, 20, 40, 50, 80])
            expect(this.pluck('index')).toStrictEqual([0, 1, 2, 3, 4])
            done()
          })
        })
      })
    })
  })
  describe('Pool', function () {
    let pool
    beforeEach(function () {
      pool = Pool.create('collection_spec')
    })
    afterEach(function () {
      pool.get('collection_spec').reset()
    })

    describe('add()', function () {
      it('should add a new element to the pool', function () {
        const obj = {
          id: '1337',
          folder_id: '1338'
        }
        const collection = pool.get('detail')
        expect(collection.get(_.cid(obj))).toBeUndefined()
        const c = pool.add('detail', obj)
        expect(c).toBeInstanceOf(Object)
        expect(collection.get(_.cid(obj))).toBeInstanceOf(Object)
      })
    })
  })
})
