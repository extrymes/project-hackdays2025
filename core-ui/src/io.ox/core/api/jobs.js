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

import Backbone from '@/backbone'
import ox from '@/ox'
import http from '@/io.ox/core/http'
import yell from '@/io.ox/core/yell'
import $ from '@/jquery'

import gt from 'gettext'

const longRunningJobs = {}
let jobTimer
const timerInterval = 2000

// A failsafe iterator that doesn't break the iteration when one callback throws an error.
// This is important, because callbacks after a thrown error would not be invoked anymore.
// This can lead to unresolved deferreds.
function iterateCallbacksFailsafe (callbacks = [], result) {
  callbacks.forEach(cb => {
    try {
      cb(result)
    } catch (e) {
      // just catch errors to prevent that later callbacks are not invoked
      // IMPORTANT: this is normal behavior for the 'throw error' hack in files/api.js/'update()'
      if (ox.debug) { console.warn('Caught error inside callback, probably normal for quota error', e) }
    }
  })
}

const api = {
  updateJobTimer () {
    // timer is running although there are no jobs, stop it
    if (Object.keys(longRunningJobs).length === 0 && jobTimer) {
      clearInterval(jobTimer)
      jobTimer = null
      return
    }
    // there is already a jobtimer running, nothing to be done here
    if (jobTimer) return

    jobTimer = setInterval(() => {
      api.getInfo(Object.keys(longRunningJobs)).then((data = []) => {
        const doneJobs = {}
        data.forEach(job => {
          if (job.error) {
            // no such job. Remove those, to avoid creating useless requests and bloating logs.
            if (job.error.code === 'JOB-0002') delete longRunningJobs[job.error.error_params[0]]
            return
          }
          if (job.data && job.data.done) {
            doneJobs[job.data.id] = longRunningJobs[job.data.id]
            delete longRunningJobs[job.data.id]
          }
        })
        api.updateJobTimer()

        if (Object.keys(doneJobs).length === 0) return

        Object.keys(doneJobs).forEach(key => {
          const job = doneJobs[key]
          api.get(job.id).then(result => {
            if (result.error && doneJobs[job.id].failCallback.length) {
              iterateCallbacksFailsafe(doneJobs[job.id].failCallback, result)
            } else if (doneJobs[job.id].successCallback.length) {
              iterateCallbacksFailsafe(doneJobs[job.id].successCallback, result)
            }

            api.trigger(`finished:${job.id}`, result)
          },
          result => iterateCallbacksFailsafe(doneJobs[job.id].failCallback, result))
        })
      })
    }, timerInterval)
  },
  addJob (job) {
    if (!job) return

    // make sure we have arrays
    job.failCallback = [].concat(job.failCallback)
    job.successCallback = [].concat(job.successCallback)

    // if it already exists we just add the callbacks
    if (longRunningJobs[job.id]) {
      longRunningJobs[job.id].failCallback = longRunningJobs[job.id].failCallback.concat(job.failCallback)
      longRunningJobs[job.id].successCallback = longRunningJobs[job.id].successCallback.concat(job.successCallback)
      return
    }

    longRunningJobs[job.id] = job

    api.trigger(`added:${job.id}`, { job: longRunningJobs[job.id] })
    // start the timer
    api.updateJobTimer()
  },
  get (id) {
    if (!id) return Promise.resolve()

    return http.GET({
      module: 'jobs',
      params: {
        action: 'get',
        id
      }
    })
  },
  getInfo (ids = []) {
    ids = [].concat(ids)
    if (ids.length === 0) return Promise.resolve()

    http.pause()

    ids.forEach(id => {
      http.GET({
        module: 'jobs',
        params: {
          action: 'info',
          id
        }
      })
    })
    return http.resume()
  },
  enqueue (request, callback = () => yell('info', gt('This action may take some time.'))) {
    const def = $.Deferred()

    request.then((response) => {
      // if we have a long running job execute the callback and add the job to the list.
      if (response && (response.code === 'JOB-0003' || response.job)) {
        callback()
        api.addJob({
          done: false,
          id: response.job || response.data.job,
          successCallback: def.resolve,
          failCallback: def.reject
        })
        return
      }
      // no long running job? resolve right away
      def.resolve(response)
    }, def.reject)
    return def
  },
  // All functions below are currently unused by core UI and just there for completeness
  getAll () {
    return http.GET({
      module: 'jobs',
      params: {
        action: 'all'
      }
    }).done(jobs => {
      jobs.forEach(job => {
        api.addJob(Object.assign({
          // use generic fallback
          successCallback: [() => ox.trigger('refresh.all')],
          failCallback: [() => ox.trigger('refresh.all')]
        }, job))
      })
    })
  },
  cancelJob (ids = []) {
    ids = [].concat(ids)
    if (ids.length === 0) return Promise.resolve()

    return http.PUT({
      module: 'jobs',
      params: {
        action: 'cancel'
      },
      data: ids
    }).then(() => {
      ids.forEach(id => delete longRunningJobs[id])

      api.updateJobTimer()
    })
  },
  getCurrentList () { return longRunningJobs }
}

Object.assign(api, Backbone.Events)

export default api
