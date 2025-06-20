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

import { describe, it, expect } from '@jest/globals'

import imageResize from '@/io.ox/mail/compose/resize'
import { settings } from '@/io.ox/mail/settings'

const maxSize = settings.get('features/imageResize/maxSize', 10 * 1024 * 1024)
const minDimension = settings.get('features/imageResize/imageSizeThreshold', 1024)

function getMockFile (obj) {
  return {
    type: obj.type || 'image/jpg',
    size: obj.size || maxSize - 1,
    _dimensions: {
      width: obj.width || 1024 + 1,
      height: obj.height || 1024 + 1
    }
  }
}

describe('Mail Compose image resize', function () {
  describe('getTargetDimensions', function () {
    it('should get the correct target sizes for horizontal images', function () {
      const file = getMockFile({ width: 2048, height: 1024 })
      const resultDimensions = imageResize.getTargetDimensions(file, 1024)
      expect(resultDimensions.width).toEqual(1024)
      expect(resultDimensions.height).toEqual(512)
    })

    it('should get the correct target sizes for vertical images', function () {
      const file = getMockFile({ width: 1024, height: 2048 })
      const resultDimensions = imageResize.getTargetDimensions(file, 1024)
      expect(resultDimensions.width).toEqual(512)
      expect(resultDimensions.height).toEqual(1024)
    })

    it('should get the correct target sizes for cubic images', function () {
      const file = getMockFile({ width: 2048, height: 2048 })
      const resultDimensions = imageResize.getTargetDimensions(file, 1024)
      expect(resultDimensions.width).toEqual(1024)
      expect(resultDimensions.height).toEqual(1024)
    })
  })

  describe('resizeRecommended', function () {
    it('should be false for images within the thresholds', function () {
      const file = getMockFile({
        width: minDimension,
        height: minDimension
      })
      expect(imageResize.resizeRecommended(file)).toEqual(false)
    })
    it('should be true for images with too big width', function () {
      const file = getMockFile({
        width: minDimension + 1,
        height: minDimension
      })
      expect(imageResize.resizeRecommended(file)).toEqual(true)
    })
    it('should be true for images with too big height', function () {
      const file = getMockFile({
        width: minDimension,
        height: minDimension + 1
      })
      expect(imageResize.resizeRecommended(file)).toEqual(true)
    })
    it('should be true for images with too big filesize', function () {
      const file = getMockFile({
        size: maxSize + 1,
        width: minDimension + 1,
        height: minDimension
      })
      expect(imageResize.resizeRecommended(file)).toEqual(false)
    })
  })

  describe('matches', function () {
    describe('type criteria properly', function () {
      it('for jpegs', function () {
        const jpgFile = getMockFile({ type: 'image/jpg' })
        const jpegFile = getMockFile({ type: 'image/jpeg' })
        expect(imageResize.matches('type', jpgFile)).toEqual(true)
        expect(imageResize.matches('type', jpegFile)).toEqual(true)
      })
      it('for pngs', function () {
        const pngFile = getMockFile({ type: 'image/png' })
        expect(imageResize.matches('type', pngFile)).toEqual(true)
      })
      it('for gifs', function () {
        const gifFile = getMockFile({ type: 'image/gif' })
        expect(imageResize.matches('type', gifFile)).toEqual(false)
      })
      it('for other types', function () {
        const tiffFile = getMockFile({ type: 'image/tiff' })
        const applicationFile = { type: 'application/someApp' }
        expect(imageResize.matches('type', tiffFile)).toEqual(false)
        expect(imageResize.matches('type', applicationFile)).toEqual(false)
      })
    })

    describe('size criteria properly', function () {
      it('for medium files', function () {
        expect(imageResize.matches('size', getMockFile({ size: maxSize / 2 }))).toEqual(true)
        expect(imageResize.matches('size', getMockFile({ size: maxSize }))).toEqual(true)
      })
      it('for large files', function () {
        expect(imageResize.matches('size', getMockFile({ size: maxSize + 1 }))).toEqual(false)
      })
    })

    describe('dimensions criteria properly', function () {
      it('for small files', function () {
        const file = getMockFile({ width: minDimension, height: minDimension })
        expect(imageResize.matches('dimensions', file)).toEqual(false)
      })
      it('for medium files', function () {
        const landscape = getMockFile({ width: minDimension + 1, height: minDimension })
        const portrait = getMockFile({ width: minDimension, height: minDimension + 1 })
        expect(imageResize.matches('dimensions', landscape)).toEqual(true)
        expect(imageResize.matches('dimensions', portrait)).toEqual(true)
      })
      it('for upscaling targets', function () {
        const landscape = getMockFile({ width: minDimension + 1, height: minDimension })
        expect(imageResize.matches('dimensions', landscape, { target: minDimension })).toEqual(true)
        expect(imageResize.matches('dimensions', landscape, { target: minDimension + 100 })).toEqual(false)
      })
    })
  })
})
