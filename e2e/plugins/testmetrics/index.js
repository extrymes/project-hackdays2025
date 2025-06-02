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

const { InfluxDB, Point } = require('@influxdata/influxdb-client')
const event = require('codeceptjs/lib/event')
const recorder = require('codeceptjs/lib/recorder')
const chalk = require('chalk')
const chalkTable = require('chalk-table')

function durationOf (test) {
  return test.steps.reduce((sum, step) => sum + (step.endTime - step.startTime), 0)
}

module.exports = function setupTestMetricsPlugin ({ url, org, token, defaultTags }) {
  const client = new InfluxDB({ url, token })
  const performanceRecorder = token
    ? client.getWriteApi(org, 'ui-performance', 'ms', { defaultTags })
    // no token, so just record and print collected data
    : (function () {
        const points = []
        return {
          writePoint (p) { points.push(p) },
          flush () {
            if (!points.length) return
            const options = {
              columns: [
                { field: 'measurement', name: chalk.cyan('Measurement') },
                { field: 'metric', name: chalk.cyan('Metric') },
                { field: 'duration', name: chalk.green('Duration') },
                { field: 'transferSize', name: chalk.green('Transfer size') },
                { field: 'decodedBodySize', name: chalk.green('Dec. body size') },
                { field: 'cached', name: chalk.yellow('Cached') },
                { field: 'tags', name: chalk.cyan('Tags') }
              ]
            }
            console.log(chalkTable(options, points.filter(p => p.name !== 'testrun').map(p => {
              const metric = p.tags.metric
              delete p.tags.metric
              const cached = p.tags.cached
              delete p.tags.cached
              const row = {
                measurement: p.name,
                tags: JSON.stringify(p.tags),
                cached,
                metric
              }
              for (const field of Object.keys(p.fields)) {
                row[field] = p.fields[field]
              }
              return row
            })))
            points.splice(0, points.length)
          },
          dispose () {
            return points.length
          }
        }
      })()

  const testRecorder = !!token && client.getWriteApi(org, 'e2e', 'ms', { defaultTags })

  event.dispatcher.on(event.suite.after, function recordSendMetrics () {
    recorder.add('send metrics data', async function sendMetrics () {
      await performanceRecorder.flush()
      if (testRecorder) await testRecorder.flush()
    })
  })
  event.dispatcher.on(event.all.after, function disposeInfluxClient () {
    const unwrittenPoints = performanceRecorder.dispose() + testRecorder ? testRecorder.dispose() : 0
    if (unwrittenPoints) console.warn(`Quit with ${unwrittenPoints} unwritten metrics points in queue.`)
  })

  event.dispatcher.on(event.test.after, function recordTestMetrics (test) {
    if (!testRecorder) return
    const point = new Point('run')
      .tag('feature', test.parent.title)
      .tag('scenario', test.title)
      .tag('state', test.state)

    if (process.env.CI) {
      point.tag('deployment', process.env.REPORT_PROJECT || process.env.CI_COMMIT_REF_SLUG)
    }
    try {
      point.timestamp(Date.now())
      point.intField('duration', durationOf(test))

      testRecorder.writePoint(point)
    } catch (error) {
      console.log(error)
      console.warn('Could not write test metrics')
    }
  })

  return {
    addPerformanceMeasurement (measurement, fields, { tags = {}, timestamp = Date.now() } = {}) {
      const p = new Point(measurement)
      for (const tag in tags) {
        p.tag(tag, tags[tag])
      }
      p.timestamp(timestamp)
      for (const field of fields) {
        try {
          p[field.type](field.name, field.value)
        } catch (e) {
          console.log(e)
          console.warn(`${field.type} is not a valid field type`)
        }
      }
      performanceRecorder.writePoint(p)
    },
    metricsClientName: defaultTags.client
  }
}
