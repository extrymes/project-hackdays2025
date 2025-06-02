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

import { describe, it } from '@jest/globals'
import { expect } from 'chai/index.mjs'
import util from '@/pe/core/whatsnew/util'
import { getNewFeatures, getAllFeatures } from '@/pe/core/whatsnew/meta'
import { joinSettingsPath } from '@/pe/core/whatsnew/main'

const features = [
  {
    version: '8.10',
    priority: 2,
    title: 'Feature A'
  },
  {
    version: '8.10',
    priority: 1,
    title: 'Feature B'
  },
  {
    version: '8.11',
    priority: 4,
    title: 'Feature D'
  },
  {
    version: '8.11',
    priority: 2,
    title: 'Feature C'
  }
]

describe('Whats new', () => {
  it('should identify identical versions correctly', () => {
    const A = '8.11'
    const B = '8.11'
    expect(util.compareVersion(A, B)).to.equal(0)
  })
  it('should compare versions correctly', () => {
    const A = '8.11'
    const B = '8.10'
    expect(util.compareVersion(A, B)).to.equal(-1)
  })
  it('should compare versions correctly', () => {
    const A = '8.10'
    const B = '8.11'
    expect(util.compareVersion(A, B)).to.equal(+1)
  })
  it('should NOT provide old features', () => {
    const result = getNewFeatures({ list: features, sinceVersion: '8.11' })
    expect(result.length).to.equal(0)
  })
  it('should provide new features', () => {
    const result = getNewFeatures({ list: features, sinceVersion: '8.10' })
    expect(result.length).to.equal(1)
  })
  it('should provide new features over multiple releases', () => {
    const result = getNewFeatures({ list: features, sinceVersion: '8.9' })
    expect(result.length).to.equal(3)
  })
  it('should provide new features in proper order', () => {
    const result = getNewFeatures({ list: features, sinceVersion: '8.9' })
    expect(result.length).to.equal(3)
    expect(result[0].title).to.equal('Feature B')
    expect(result[1].title).to.equal('Feature C')
    expect(result[2].title).to.equal('Feature A')
  })
  it('should render settings paths correctly', () => {
    const string = joinSettingsPath(['a', 'b', 'c'])
    expect(string).to.equal('a > b > c')
  })
  it('should list all features in proper order', () => {
    const result = getAllFeatures(features)
    expect(result.length).to.equal(4)
    expect(result[0].title).to.equal('Feature C')
    expect(result[1].title).to.equal('Feature D')
    expect(result[2].title).to.equal('Feature B')
    expect(result[3].title).to.equal('Feature A')
  })
})
