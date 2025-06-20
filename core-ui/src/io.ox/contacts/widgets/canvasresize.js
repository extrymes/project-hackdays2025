/* eslint-disable license-header/header */
/* cSpell:disable */

/*
 *
 * canvasResize
 *
 * Version: 1.2.0
 * Date (d/m/y): 02/10/12
 * Update (d/m/y): 14/05/13
 * Original author: @gokercebeci
 * Licensed under the MIT license
 * - This plugin working with binaryajax.js and exif.js
 *   (It's under the MPL License http://www.nihilogic.dk/licenses/mpl-license.txt)
 * Demo: http://canvasResize.gokercebeci.com/
 *
 * - I fixed iOS6 Safari's image file rendering issue for large size image (over mega-pixel)
 *   using few functions from https://github.com/stomita/ios-imagefile-megapixel
 *   (detectSubsampling, )
 *   And fixed orientation issue by using https://github.com/jseidelin/exif-js
 *   Thanks, Shinichi Tomita and Jacob Seidelin
 *
 *
 * Modifications by David Bauer <david.bauer@open-xchange.com>
 *  - Fixed for Require.js and cleanup to make JSHINT happy
 *
 *
 */

import _ from '@/underscore'
import $ from '@/jquery'

import imageUtil from '@/io.ox/core/tk/image-util'

function newsize (w, h, W, H, C) {
  let c = C ? 'h' : ''
  if ((W && w > W) || (H && h > H)) {
    const r = w / h
    if ((r >= 1 || H === 0) && W && !C) {
      w = W
      h = (W / r) >> 0
    } else if (C && r <= (W / H)) {
      w = W
      h = (W / r) >> 0
      c = 'w'
    } else {
      w = (H * r) >> 0
      h = H
    }
  }
  return {
    width: w,
    height: h,
    cropped: c
  }
}

function createCanvas (width, height) {
  // disable offscreenCanvas on current Chrome due to
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1012036
  const badChromeVersion = typeof _ !== 'undefined' && _.browser.chrome && _.browser.chrome >= 77
  if (!badChromeVersion && self.OffscreenCanvas) return new self.OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * Detect subsampling in loaded image.
 * In iOS, larger images than 2M pixels may be subsampled in rendering.
 */
function detectSubsampling (img) {
  const iw = img.width; const ih = img.height
  // subsampling may happen over megapixel image
  if (iw * ih > 1048576) {
    const canvas = createCanvas(1, 1)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, -iw + 1, 0)
    // subsampled image becomes half smaller in rendering size.
    // check alpha channel value to confirm image is covering edge pixel or not.
    // if alpha value is 0 image is not covering, hence subsampled.
    return ctx.getImageData(0, 0, 1, 1).data[3] === 0
  }
  return false
}

/**
 * Update the orientation according to the specified rotation angle
 */
function rotate (orientation, angle) {
  const o = {
    // nothing
    1: { 90: 6, 180: 3, 270: 8 },
    // horizontal flip
    2: { 90: 7, 180: 4, 270: 5 },
    // 180 rotate left
    3: { 90: 8, 180: 1, 270: 6 },
    // vertical flip
    4: { 90: 5, 180: 2, 270: 7 },
    // vertical flip + 90 rotate right
    5: { 90: 2, 180: 7, 270: 4 },
    // 90 rotate right
    6: { 90: 3, 180: 8, 270: 1 },
    // horizontal flip + 90 rotate right
    7: { 90: 4, 180: 5, 270: 2 },
    // 90 rotate left
    8: { 90: 1, 180: 6, 270: 3 }
  }
  return o[orientation][angle] ? o[orientation][angle] : orientation
}

/**
 * Transform canvas coordination according to specified frame size and orientation
 * Orientation value is from EXIF tag
 */
function transformCoordinate (canvas, width, height, orientation) {
  switch (orientation) {
    case 5:
    case 6:
    case 7:
    case 8:
      canvas.width = height
      canvas.height = width
      break
    default:
      canvas.width = width
      canvas.height = height
  }
  const ctx = canvas.getContext('2d')
  switch (orientation) {
    case 1:
      // nothing
      break
    case 2:
      // horizontal flip
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      break
    case 3:
      // 180 rotate left
      ctx.translate(width, height)
      ctx.rotate(Math.PI)
      break
    case 4:
      // vertical flip
      ctx.translate(0, height)
      ctx.scale(1, -1)
      break
    case 5:
      // vertical flip + 90 rotate right
      ctx.rotate(0.5 * Math.PI)
      ctx.scale(1, -1)
      break
    case 6:
      // 90 rotate right
      ctx.rotate(0.5 * Math.PI)
      ctx.translate(0, -height)
      break
    case 7:
      // horizontal flip + 90 rotate right
      ctx.rotate(0.5 * Math.PI)
      ctx.translate(width, -height)
      ctx.scale(-1, 1)
      break
    case 8:
      // 90 rotate left
      ctx.rotate(-0.5 * Math.PI)
      ctx.translate(-width, 0)
      break
    default:
      break
  }
}

/**
 * Detecting vertical squash in loaded image.
 * Fixes a bug which squash image vertically while drawing into canvas for some images.
 */
function detectVerticalSquash (img, iw, ih) {
  const canvas = createCanvas(1, ih)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  // don't use 0,0,1,ih or you get issues with cropped images when using transparent pngs
  // see https://github.com/enyo/dropzone/issues/813
  const data = ctx.getImageData(1, 0, 1, ih).data
  // search image edge pixel position in case it is squashed vertically.
  let sy = 0
  let ey = ih
  let py = ih
  while (py > sy) {
    const alpha = data[(py - 1) * 4 + 3]
    if (alpha === 0) {
      ey = py
    } else {
      sy = py
    }
    py = (ey + sy) >> 1
  }
  const ratio = py / ih
  return ratio === 0 ? 1 : ratio
}

function extend () {
  let target = arguments[0] || {}; let a = 1; const al = arguments.length; let deep = false
  if (target.constructor === Boolean) {
    deep = target
    target = arguments[1] || {}
  }
  if (al === 1) {
    target = this
    a = 0
  }
  let prop
  for (; a < al; a++) {
    if ((prop = arguments[a]) !== null) {
      for (const i in prop) {
        if (target === prop[i]) {
          continue
        }
        if (deep && typeof prop[i] === 'object' && target[i]) {
          extend(target[i], prop[i])
        } else if (prop[i] !== undefined) {
          target[i] = prop[i]
        }
      }
    }
  }
  return target
}

const worker = new imageUtil.PromiseWorker({
  newsize,
  createCanvas,
  detectSubsampling,
  rotate,
  transformCoordinate,
  detectVerticalSquash,
  resize
})

function resize (opt, callback) {
  const img = opt.img; const options = opt.options; let orientation = options.exif || 1
  orientation = rotate(orientation, options.rotate)

  // CW or CCW ? replace width and height
  const size = (orientation >= 5 && orientation <= 8)
    ? newsize(img.height, img.width, options.width, options.height, options.crop)
    : newsize(img.width, img.height, options.width, options.height, options.crop)

  let iw = img.width; let ih = img.height
  const width = size.width; const height = size.height

  const canvas = createCanvas(300, 150)
  const ctx = canvas.getContext('2d')
  ctx.save()
  transformCoordinate(canvas, width, height, orientation)

  // over image size
  // only for safari
  if (options.isSafari && detectSubsampling(img)) {
    iw /= 2
    ih /= 2
  }
  // size of tiling canvas
  const d = 1024
  let tmpCanvas = createCanvas(d, d)
  let tmpCtx = tmpCanvas.getContext('2d')
  const vertSquashRatio = detectVerticalSquash(img, iw, ih)
  let sy = 0
  while (sy < ih) {
    const sh = sy + d > ih ? ih - sy : d
    let sx = 0
    while (sx < iw) {
      const sw = sx + d > iw ? iw - sx : d
      tmpCtx.clearRect(0, 0, d, d)
      tmpCtx.drawImage(img, -sx, -sy)
      const dx = Math.floor(sx * width / iw)
      const dw = Math.ceil(sw * width / iw)
      const dy = Math.floor(sy * height / ih / vertSquashRatio)
      const dh = Math.ceil(sh * height / ih / vertSquashRatio)
      ctx.drawImage(tmpCanvas, 0, 0, sw, sh, dx, dy, dw, dh)
      sx += d
    }
    sy += d
  }
  ctx.restore()
  tmpCanvas = tmpCtx = null

  // if rotated width and height data replacing issue
  const newcanvas = createCanvas(size.cropped === 'h' ? height : width, size.cropped === 'w' ? width : height)
  const x = size.cropped === 'h' ? (height - width) * 0.5 : 0
  const y = size.cropped === 'w' ? (width - height) * 0.5 : 0
  const newctx = newcanvas.getContext('2d')
  newctx.drawImage(canvas, x, y, width, height)

  let data; const file = options.file
  if (!newcanvas.toDataURL) {
    data = newcanvas.transferToImageBitmap()
  } else if (file.type === 'image/png') {
    data = newcanvas.toDataURL(file.type)
  } else {
    data = newcanvas.toDataURL('image/jpeg', (options.quality * 0.01))
  }

  callback(null, data)
  return data
}

const defaults = {
  width: 300,
  height: 0,
  crop: false,
  quality: 80,
  rotate: 0,
  callback: _.identity
}

export default function (file, options) {
  options = extend({ file, isSafari: _.device('safari') }, defaults, options)

  return imageUtil.getImageFromFile(file, { exif: true }).then(function (img) {
    options.exif = img.exif

    // disable webworker for imageResize on current Chrome due to
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1012036
    const badChromeVersion = _.browser.chrome && _.browser.chrome >= 77

    // do not use webworker if offscreencanvas is not available
    if (badChromeVersion || !self.OffscreenCanvas || !self.ImageBitmap) return resize({ img, options }, $.noop)

    return worker.invoke('resize', { img, options: _.omit(options, 'callback') }).then(function (data) {
      if (self.ImageBitmap && data instanceof self.ImageBitmap) {
        // can only hand over a image bitmap with resized image. need to get a dataURL (which cannot be optained from a offscreen canvas)
        const canvas = document.createElement('canvas')
        canvas.width = data.width
        canvas.height = data.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(data, 0, 0, data.width, data.height)

        if (file.type === 'image/png') {
          data = canvas.toDataURL(file.type)
        } else {
          data = canvas.toDataURL('image/jpeg', (options.quality * 0.01))
        }
      }
      return data
    }, function (err) {
      console.log(err)
    })
  })
};
/* cSpell:enable */
