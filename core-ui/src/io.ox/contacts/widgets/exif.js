/* eslint-disable license-header/header */
// cSpell:disable vals

/**
 *
 * Based on EXIF Reader and Binary Ajax (http://blog.nihilogic.dk/)
 *
 * Licensed under the MPL License [http://www.nihilogic.dk/licenses/mpl-license.txt]
 *
 */

import _ from '@/underscore'

const debug = false

const TiffTags = {
  0x0112: 'Orientation'
}

function findEXIFinJPEG (file) {
  if (file.getByteAt(0) !== 0xFF || file.getByteAt(1) !== 0xD8) {
    // not a valid jpeg
    return false
  }

  let offset = 2
  const length = file.getLength()
  let marker

  while (offset < length) {
    if (file.getByteAt(offset) !== 0xFF) {
      if (debug) console.log('Not a valid marker at offset ' + offset + ', found: ' + file.getByteAt(offset))
      // not a valid marker, something is wrong
      return false
    }

    marker = file.getByteAt(offset + 1)

    // we could implement handling for other markers here,
    // but we're only looking for 0xFFE1 for EXIF data

    if (marker === 22400) {
      if (debug) console.log('Found 0xFFE1 marker')
      return readEXIFData(file, offset + 4, file.getShortAt(offset + 2, true) - 2)
    } else if (marker === 225) {
      // 0xE1 = Application-specific 1 (for EXIF)
      if (debug) console.log('Found 0xFFE1 marker')
      return readEXIFData(file, offset + 4, file.getShortAt(offset + 2, true) - 2)
    }
    offset += 2 + file.getShortAt(offset + 2, true)
  }
}

function readEXIFData (file, start) {
  if (file.getStringAt(start, 4) !== 'Exif') {
    if (debug) console.log('Not valid EXIF data! ' + file.getStringAt(start, 4))
    return false
  }

  let bigEnd
  const tiffOffset = start + 6

  // test for TIFF validity and endianness
  if (file.getShortAt(tiffOffset) === 0x4949) {
    bigEnd = false
  } else if (file.getShortAt(tiffOffset) === 0x4D4D) {
    bigEnd = true
  } else {
    if (debug) console.log('Not valid TIFF data! (no 0x4949 or 0x4D4D)')
    return false
  }

  if (file.getShortAt(tiffOffset + 2, bigEnd) !== 0x002A) {
    if (debug) console.log('Not valid TIFF data! (no 0x002A)')
    return false
  }

  if (file.getLongAt(tiffOffset + 4, bigEnd) !== 0x00000008) {
    if (debug) console.log('Not valid TIFF data! (First offset not 8)', file.getShortAt(tiffOffset + 4, bigEnd))
    return false
  }

  const tags = readTags(file, tiffOffset, tiffOffset + 8, TiffTags, bigEnd)

  return tags
}

function readTags (file, tiffStart, dirStart, strings, bigEnd) {
  const entries = file.getShortAt(dirStart, bigEnd)
  const tags = {}
  let entryOffset; let tag
  let i

  for (i = 0; i < entries; i++) {
    entryOffset = dirStart + i * 12 + 2
    tag = strings[file.getShortAt(entryOffset, bigEnd)]
    if (!tag && debug) console.log('Unknown tag: ' + file.getShortAt(entryOffset, bigEnd))
    tags[tag] = readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd)
  }
  return tags
}

function readTagValue (file, entryOffset, tiffStart, dirStart, bigEnd) {
  const type = file.getShortAt(entryOffset + 2, bigEnd)
  const numValues = file.getLongAt(entryOffset + 4, bigEnd)
  const valueOffset = file.getLongAt(entryOffset + 8, bigEnd) + tiffStart
  let offset
  let vals
  let n

  switch (type) {
    case 1:
      // byte, 8-bit unsigned int
      // falls through
    case 7:
      // undefined, 8-bit byte, value depending on field
      if (numValues === 1) {
        return file.getByteAt(entryOffset + 8, bigEnd)
      }
      offset = numValues > 4 ? valueOffset : (entryOffset + 8)
      vals = []
      for (n = 0; n < numValues; n++) {
        vals[n] = file.getByteAt(offset + n)
      }
      return vals
    case 2:
      // ascii, 8-bit byte
      offset = numValues > 4 ? valueOffset : (entryOffset + 8)
      return file.getStringAt(offset, numValues - 1)
    case 3:
      // short, 16 bit int
      if (numValues === 1) {
        return file.getShortAt(entryOffset + 8, bigEnd)
      }
      offset = numValues > 2 ? valueOffset : (entryOffset + 8)
      vals = []
      for (n = 0; n < numValues; n++) {
        vals[n] = file.getShortAt(offset + 2 * n, bigEnd)
      }
      return vals
    case 4:
      // long, 32 bit int
      if (numValues === 1) {
        return file.getLongAt(entryOffset + 8, bigEnd)
      }
      vals = []
      for (n = 0; n < numValues; n++) {
        vals[n] = file.getLongAt(valueOffset + 4 * n, bigEnd)
      }
      return vals
    case 5: { // rational = two long values, first is numerator, second is denominator
      if (numValues === 1) {
        return file.getLongAt(valueOffset, bigEnd) / file.getLongAt(valueOffset + 4, bigEnd)
      }
      const aVals = []
      for (n = 0; n < numValues; n++) {
        aVals[n] = file.getLongAt(valueOffset + 8 * n, bigEnd) / file.getLongAt(valueOffset + 4 + 8 * n, bigEnd)
      }
      return aVals
    }
    case 9:
      // slong, 32 bit signed int
      if (numValues === 1) {
        return file.getSLongAt(entryOffset + 8, bigEnd)
      }
      vals = []
      for (n = 0; n < numValues; n++) {
        vals[n] = file.getSLongAt(valueOffset + 4 * n, bigEnd)
      }
      return vals
    case 10:
      // signed rational, two SLongs, first is numerator, second is denominator
      if (numValues === 1) {
        return file.getSLongAt(valueOffset, bigEnd) / file.getSLongAt(valueOffset + 4, bigEnd)
      }
      vals = []
      for (n = 0; n < numValues; n++) {
        vals[n] = file.getSLongAt(valueOffset + 8 * n, bigEnd) / file.getSLongAt(valueOffset + 4 + 8 * n, bigEnd)
      }
      return vals
            // no default
  }
}

const BinaryFile = function (strData, iDataOffset, iDataLength) {
  let data = strData
  const dataOffset = iDataOffset || 0
  let dataLength = 0

  this.getRawData = function () {
    return data
  }

  if (typeof strData === 'string') {
    dataLength = iDataLength || data.length

    this.getByteAt = function (iOffset) {
      return data.charCodeAt(iOffset + dataOffset) & 0xFF
    }

    this.getBytesAt = function (iOffset, iLength) {
      const aBytes = []

      for (let i = 0; i < iLength; i++) {
        aBytes[i] = data.charCodeAt((iOffset + i) + dataOffset) & 0xFF
      }

      return aBytes
    }
  }

  this.getLength = function () { return dataLength }

  this.getSByteAt = function (iOffset) {
    const iByte = this.getByteAt(iOffset)
    if (iByte > 127) {
      return iByte - 256
    }
    return iByte
  }

  this.getShortAt = function (iOffset, bBigEndian) {
    let iShort = bBigEndian
      ? (this.getByteAt(iOffset) << 8) + this.getByteAt(iOffset + 1)
      : (this.getByteAt(iOffset + 1) << 8) + this.getByteAt(iOffset)
    if (iShort < 0) iShort += 65536
    return iShort
  }
  this.getSShortAt = function (iOffset, bBigEndian) {
    const iUShort = this.getShortAt(iOffset, bBigEndian)
    if (iUShort > 32767) {
      return iUShort - 65536
    }
    return iUShort
  }
  this.getLongAt = function (iOffset, bBigEndian) {
    const iByte1 = this.getByteAt(iOffset)
    const iByte2 = this.getByteAt(iOffset + 1)
    const iByte3 = this.getByteAt(iOffset + 2)
    const iByte4 = this.getByteAt(iOffset + 3)

    let iLong = bBigEndian
      ? (((((iByte1 << 8) + iByte2) << 8) + iByte3) << 8) + iByte4
      : (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1
    if (iLong < 0) iLong += 4294967296
    return iLong
  }
  this.getSLongAt = function (iOffset, bBigEndian) {
    const iULong = this.getLongAt(iOffset, bBigEndian)
    if (iULong > 2147483647) {
      return iULong - 4294967296
    }
    return iULong
  }

  this.getStringAt = function (iOffset, iLength) {
    const aStr = []

    const aBytes = this.getBytesAt(iOffset, iLength)
    for (let j = 0; j < iLength; j++) {
      aStr[j] = String.fromCharCode(aBytes[j])
    }
    return aStr.join('')
  }

  this.getCharAt = function (iOffset) {
    return String.fromCharCode(this.getByteAt(iOffset))
  }
  this.toBase64 = function () {
    return window.btoa(data)
  }
  this.fromBase64 = function (strBase64) {
    data = window.atob(strBase64)
  }
}

function getOrientation (b64) {
  const bin = atob(b64.split(',')[1])
  const exif = findEXIFinJPEG(new BinaryFile(bin))
  if (_.isObject(exif) && exif.Orientation) {
    return exif.Orientation
  }
}

export default {
  getOrientation
}
