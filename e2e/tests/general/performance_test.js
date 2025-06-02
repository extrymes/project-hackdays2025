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

const container = require('codeceptjs/lib/container')
const event = require('codeceptjs/lib/event')
const { addPerformanceMeasurement, metricsClientName } = container.plugins('testMetrics')

Feature('Performance')

function reportTestRuntime (test) {
  const testInfo = {
    duration: test.steps.reduce((total, { duration }) => total + duration, 0),
    title: test.fullTitle().replace(/ \| {"run".*/, '')
  }
  addPerformanceMeasurement('testrun', [
    { name: 'duration', type: 'intField', value: testInfo.duration }
  ], { tags: { title: testInfo.title } })
}

BeforeSuite(async function ({ users }) {
  event.dispatcher.addListener(event.test.passed, reportTestRuntime)
  await users.create()
})

AfterSuite(async function ({ users }) {
  await users.removeAll()
  event.dispatcher.removeListener(event.test.passed, reportTestRuntime)
})

function fetchMetrics () {
  performance.measure('startup_mail', 'login:success', 'listview:first-content')
  performance.measure('open_calendar', 'app:launch:io.ox/calendar', 'app:ready:io.ox/calendar')
  return performance.getEntriesByType('mark').map(JSON.stringify).concat(
    performance.getEntriesByType('measure').map(JSON.stringify),
    performance.getEntriesByType('resource').map(JSON.stringify),
    performance.getEntriesByType('navigation').map(JSON.stringify)
  ).map(JSON.parse)
}

function storeMetrics (performanceEntries, tags) {
  for (const { name, duration } of performanceEntries.filter(({ entryType }) => entryType === 'measure')) {
    addPerformanceMeasurement('loading-time', [
      { name: 'duration', type: 'floatField', value: duration }
    ], { tags: Object.assign({ metric: name }, tags) })
  }

  const bootStart = performanceEntries.filter(({ name }) => name === 'boot:start')[0]
  addPerformanceMeasurement('loading-time', [
    { name: 'duration', type: 'floatField', value: bootStart.startTime }
  ], { tags: Object.assign({ metric: 'boot:start' }, tags) })

  const wantedInitiatorTypes = [
    'script',
    'link',
    'other', // serviceworker
    'navigation'
  ]
  const resourceInfo = performanceEntries
    .filter(({ initiatorType }) => wantedInitiatorTypes.includes(initiatorType))

  const bootResourceSizes = resourceInfo
    .filter(({ startTime }) => startTime < bootStart.startTime)
    .reduce((acc, val) => {
      const transferSize = acc.transferSize + val.transferSize
      const decodedBodySize = acc.decodedBodySize + val.decodedBodySize
      return {
        transferSize, decodedBodySize
      }
    }, { transferSize: 0, decodedBodySize: 0 })

  addPerformanceMeasurement('resources-size', [
    { name: 'transferSize', type: 'intField', value: bootResourceSizes.transferSize },
    { name: 'decodedBodySize', type: 'intField', value: bootResourceSizes.decodedBodySize }
  ], { tags: Object.assign({ metric: 'resources:boot' }, tags) })

  const resourceSizes = resourceInfo.reduce((acc, val) => {
    const transferSize = acc.transferSize + val.transferSize
    const decodedBodySize = acc.decodedBodySize + val.decodedBodySize
    return {
      transferSize, decodedBodySize
    }
  }, { transferSize: 0, decodedBodySize: 0 })
  addPerformanceMeasurement('resources-size', [
    { name: 'transferSize', type: 'intField', value: resourceSizes.transferSize },
    { name: 'decodedBodySize', type: 'intField', value: resourceSizes.decodedBodySize }
  ], { tags: Object.assign({ metric: 'resources:all' }, tags) })
}

const runs = new DataTable(['run'])
for (let i = 0; i < (metricsClientName ? 5 : 1); i++) runs.add([i + 1])

Data(runs).Scenario('Load Mail app and switch to Calendar with cold and warm caches', async ({ I, mail, calendar, users }) => {
  await I.haveMail({ from: users[0], to: users[0], subject: 'testmail', content: 'some content' })
  I.login('app=io.ox/mail')
  I.waitForApp()
  I.openApp('Calendar')
  I.waitForApp()

  storeMetrics(await I.executeScript(fetchMetrics), { cached: 'no' })

  I.logout()
  await I.executeScript(() => {
    performance.clearMarks()
    performance.clearMeasures()
  })

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.openApp('Calendar')
  I.waitForApp()

  storeMetrics(await I.executeScript(fetchMetrics), { cached: 'yes' })
})

Data(runs).Scenario('Load Mail app and open compose with cold and warm caches after prefetch', async ({ I, mail, users }) => {
  await I.haveMail({ from: users[0], to: users[0], subject: 'testmail', content: 'some content' })
  I.login('app=io.ox/mail')
  I.waitForApp()

  // This is on purpose to wait for prefetch
  I.wait(6)

  mail.newMail()

  let measure = await I.executeScript(() => {
    performance.measure('startup_mail_compose', 'app:launch:io.ox/mail/compose', 'app:focus:io.ox/mail/compose')
    return performance.getEntriesByType('measure').map(JSON.stringify).map(JSON.parse)
  })

  addPerformanceMeasurement('loading-time', [
    { name: 'duration', type: 'floatField', value: measure[0].duration }
  ], { tags: Object.assign({ metric: measure[0].name }, { cached: 'no' }) })

  I.logout()
  await I.executeScript(() => {
    performance.clearMarks()
    performance.clearMeasures()
  })

  I.login('app=io.ox/mail')
  I.waitForApp()

  // This is on purpose to wait for prefetch
  I.wait(6)

  mail.newMail()

  measure = await I.executeScript(() => {
    performance.measure('startup_mail_compose', 'app:launch:io.ox/mail/compose', 'app:focus:io.ox/mail/compose')
    return performance.getEntriesByType('measure').map(JSON.stringify).map(JSON.parse)
  })

  addPerformanceMeasurement('loading-time', [
    { name: 'duration', type: 'floatField', value: measure[0].duration }
  ], { tags: Object.assign({ metric: measure[0].name }, { cached: 'yes' }) })
})
