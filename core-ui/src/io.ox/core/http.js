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

// cSpell:ignore reqs

import $ from '@/jquery'
import ox from '@/ox'
import Events from '@/io.ox/core/event'
import _ from '@/underscore'
import Backbone from '@/backbone'
import ext from '@/io.ox/core/extensions'

import gt from 'gettext'

function extendColumns (defaultColumns = '', point) {
  const extendedColumns = point ? ext.point(point).invoke('columns').flatten(true).valueOf() : []
  return _(defaultColumns.split(',').concat(extendedColumns)).unique().join(',')
}

// default columns for each module
const idMapping = {
  common: {
    1: 'id',
    2: 'created_by',
    3: 'modified_by',
    4: 'creation_date',
    5: 'last_modified',
    20: 'folder_id',
    100: 'categories',
    101: 'private_flag',
    102: 'color_label',
    104: 'number_of_attachments'
  },
  mail: {
    102: 'color_label',
    600: 'id',
    601: 'folder_id',
    602: 'attachment',
    603: 'from',
    604: 'to',
    605: 'cc',
    606: 'bcc',
    607: 'subject',
    608: 'size',
    609: 'sent_date',
    610: 'received_date',
    611: 'flags',
    612: 'level',
    613: 'disp_notification_to',
    614: 'priority',
    615: 'msgref',
    651: 'flag_seen',
    652: 'account_name',
    654: 'original_id',
    655: 'original_folder_id',
    656: 'content_type',
    660: 'flagged',
    // received_date or sent_date (com.openexchange.mail.preferSentDate)
    661: 'date',
    // they both add the same property; never use simultaneously!
    662: 'text_preview',
    663: 'text_preview',
    664: 'authenticity_preview'
  },
  contacts: {
    500: 'display_name',
    501: 'first_name',
    502: 'last_name',
    503: 'second_name',
    504: 'suffix',
    505: 'title',
    506: 'street_home',
    507: 'postal_code_home',
    508: 'city_home',
    509: 'state_home',
    510: 'country_home',
    511: 'birthday',
    512: 'marital_status',
    513: 'number_of_children',
    514: 'profession',
    515: 'nickname',
    516: 'spouse_name',
    517: 'anniversary',
    518: 'note',
    519: 'department',
    520: 'position',
    521: 'employee_type',
    522: 'room_number',
    523: 'street_business',
    524: 'internal_userid', // user_id
    525: 'postal_code_business',
    526: 'city_business',
    527: 'state_business',
    528: 'country_business',
    529: 'number_of_employees',
    530: 'sales_volume',
    531: 'tax_id',
    532: 'commercial_register',
    533: 'branches',
    534: 'business_category',
    535: 'info',
    536: 'manager_name',
    537: 'assistant_name',
    538: 'street_other',
    539: 'city_other',
    540: 'postal_code_other',
    541: 'country_other',
    542: 'telephone_business1',
    543: 'telephone_business2',
    544: 'fax_business',
    545: 'telephone_callback',
    546: 'telephone_car',
    547: 'telephone_company',
    548: 'telephone_home1',
    549: 'telephone_home2',
    550: 'fax_home',
    551: 'cellular_telephone1',
    552: 'cellular_telephone2',
    553: 'telephone_other',
    554: 'fax_other',
    555: 'email1',
    556: 'email2',
    557: 'email3',
    558: 'url',
    559: 'telephone_isdn',
    560: 'telephone_pager',
    561: 'telephone_primary',
    562: 'telephone_radio',
    563: 'telephone_telex',
    564: 'telephone_ttytdd',
    565: 'instant_messenger1',
    566: 'instant_messenger2',
    567: 'telephone_ip',
    568: 'telephone_assistant',
    569: 'company',
    // '570': 'image1',
    571: 'userfield01',
    572: 'userfield02',
    573: 'userfield03',
    574: 'userfield04',
    575: 'userfield05',
    576: 'userfield06',
    577: 'userfield07',
    578: 'userfield08',
    579: 'userfield09',
    580: 'userfield10',
    581: 'userfield11',
    582: 'userfield12',
    583: 'userfield13',
    584: 'userfield14',
    585: 'userfield15',
    586: 'userfield16',
    587: 'userfield17',
    588: 'userfield18',
    589: 'userfield19',
    590: 'userfield20',
    592: 'distribution_list',
    594: 'number_of_distribution_list',
    596: 'contains_image1',
    597: 'image_last_modified',
    598: 'state_other',
    599: 'file_as',
    104: 'number_of_attachments',
    601: 'image1_content_type',
    602: 'mark_as_distributionlist',
    605: 'default_address',
    606: 'image1_url',
    607: 'sort_name',
    608: 'useCount',
    616: 'yomiFirstName',
    617: 'yomiLastName',
    618: 'yomiCompany',
    619: 'addressHome',
    620: 'addressBusiness',
    621: 'addressOther'
  },
  files: {
    23: 'meta',
    51: 'created_from',
    52: 'modified_from',
    108: 'object_permissions',
    109: 'shareable',
    700: 'title',
    701: 'url',
    702: 'filename',
    703: 'file_mimetype',
    704: 'file_size',
    705: 'version',
    706: 'description',
    707: 'locked_until',
    708: 'file_md5sum',
    709: 'version_comment',
    710: 'current_version',
    711: 'number_of_versions',
    7010: 'com.openexchange.share.extendedObjectPermissions',
    7030: 'com.openexchange.file.storage.mail.mailMetadata',
    7040: 'com.openexchange.file.sanitizedFilename'
  },
  tasks: {
    200: 'title',
    201: 'start_date',
    202: 'end_date',
    203: 'note',
    204: 'alarm',
    209: 'recurrence_type',
    212: 'days',
    213: 'day_in_month',
    214: 'month',
    215: 'internal',
    216: 'until',
    220: 'participants',
    221: 'users',
    300: 'status',
    301: 'percent_completed',
    302: 'actual_costs',
    303: 'actual_duration',
    305: 'billing_information',
    307: 'target_costs',
    308: 'target_duration',
    309: 'priority',
    312: 'currency',
    313: 'trip_meter',
    314: 'companies',
    315: 'date_completed',
    316: 'start_time',
    317: 'end_time',
    401: 'full_time'
  },
  folders: {
    // please note: Any changes inside the folders must be communicated to the MW such that
    // the rampup attribute folderList contains the correct columns and can be mapped
    1: 'id',
    2: 'created_by',
    3: 'modified_by',
    4: 'creation_date',
    5: 'last_modified',
    6: 'last_modified_utc',
    20: 'folder_id',
    23: 'meta',
    51: 'created_from',
    52: 'modified_from',
    300: 'title',
    301: 'module',
    302: 'type',
    304: 'subfolders',
    305: 'own_rights',
    306: 'permissions',
    307: 'summary',
    308: 'standard_folder',
    309: 'total',
    310: 'new',
    311: 'unread',
    312: 'deleted',
    313: 'capabilities',
    314: 'subscribed',
    315: 'subscr_subflds',
    316: 'standard_folder_type',
    317: 'supported_capabilities',
    318: 'account_id',
    319: 'folder_name',
    321: 'used_for_sync',
    3010: 'com.openexchange.publish.publicationFlag',
    3020: 'com.openexchange.subscribe.subscriptionFlag',
    3030: 'com.openexchange.folderstorage.displayName',
    // 3040 exists; around EAS; no need for it
    3050: 'com.openexchange.imap.extAccount',
    3060: 'com.openexchange.share.extendedPermissions',
    3201: 'com.openexchange.calendar.extendedProperties',
    3203: 'com.openexchange.calendar.provider',
    3220: 'com.openexchange.caldav.url',
    3204: 'com.openexchange.calendar.accountError',
    3205: 'com.openexchange.calendar.config',
    3031: 'com.openexchange.folderstorage.accountError',
    3301: 'com.openexchange.contacts.extendedProperties'
  },
  user: {
    610: 'aliases',
    611: 'timezone',
    612: 'locale',
    613: 'groups',
    614: 'contact_id',
    615: 'login_info',
    616: 'guest_created_by'
  },
  group: {
    1: 'id',
    700: 'name',
    701: 'display_name',
    702: 'members'
  },
  resource: {
  },
  account: {
    1001: 'id',
    1002: 'login',
    1003: 'password',
    1004: 'mail_url',
    1005: 'transport_url',
    1006: 'name',
    1007: 'primary_address',
    1008: 'spam_handler',
    1009: 'trash',
    1010: 'sent',
    1011: 'drafts',
    1012: 'spam',
    1013: 'confirmed_spam',
    1014: 'confirmed_ham',
    1015: 'mail_server',
    1016: 'mail_port',
    1017: 'mail_protocol',
    1018: 'mail_secure',
    1019: 'transport_server',
    1020: 'transport_port',
    1021: 'transport_protocol',
    1022: 'transport_secure',
    1023: 'transport_login',
    1024: 'transport_password',
    1025: 'unified_inbox_enabled',
    1026: 'trash_fullname',
    1027: 'sent_fullname',
    1028: 'drafts_fullname',
    1029: 'spam_fullname',
    1030: 'confirmed_spam_fullname',
    1031: 'confirmed_ham_fullname',
    1032: 'pop3_refresh_rate',
    1033: 'pop3_expunge_on_quit',
    1034: 'pop3_delete_write_through',
    1035: 'pop3_storage',
    1036: 'pop3_path',
    1037: 'personal',
    1038: 'reply_to',
    1039: 'addresses',
    1040: 'meta',
    1041: 'archive',
    1042: 'archive_fullname',
    1043: 'transport_auth',
    1044: 'mail_starttls',
    1045: 'transport_starttls',
    1046: 'root_folder',
    1047: 'mail_oauth',
    1048: 'transport_oauth',
    1049: 'mail_disabled',
    1050: 'transport_disabled',
    1051: 'secondary',
    1052: 'deactivated'
  },
  attachment: {
    1: 'id',
    2: 'created_by',
    4: 'creation_date',
    800: 'folder',
    801: 'attached',
    802: 'module',
    803: 'filename',
    804: 'file_size',
    805: 'file_mimetype',
    806: 'rtf_flag'
  },
  subscriptions: {
    id: 'id',
    folder: 'folder',
    source: 'source',
    displayName: 'displayName',
    enabled: 'enabled'
  },
  subscriptionSources: {
    id: 'id',
    displayName: 'displayName',
    icon: 'icon',
    module: 'module',
    formDescription: 'formDescription'
  }
}
// extended permissions
const idMappingExcludes = ['3060']

// list of error codes, which are not logged (see bug 46098)
const errorBlocklist = ['SVL-0003', 'SVL-0015', 'LGI-0006', 'MFA-0001']

// extend with commons (not all modules use common columns, e.g. folders)
$.extend(idMapping.contacts, idMapping.common)
$.extend(idMapping.calendar, idMapping.common)
$.extend(idMapping.files, idMapping.common)
// not "common" here (exception)
delete idMapping.files['101']
delete idMapping.files['104']
$.extend(idMapping.tasks, idMapping.common)
// See bug #25300
idMapping.user = $.extend({}, idMapping.contacts, idMapping.common, idMapping.user)

// new api, same fields
idMapping.addressbooks = idMapping.contacts

let that = {}

const isLoss = function (status) {
  // 400 is Bad Request which usually is a missing parameter
  if (status === 400) return false
  return (/^(0|4\d\d|5\d\d)$/).test(status)
}

const isUnreachable = function (xhr) {
  if (!xhr) return false
  // server is still reachable since abort is triggered by the ui
  if (xhr.statusText === 'abort') return false
  // browsers report a status of 0 in case of XMLHttpRequest errors
  if (xhr.status === 0) return true
  // request timeout, service unavailable, gateway timeout
  return /^(408|503|504)$/.test(xhr.status)
}

const isRetryable = (url = '') => {
  // do not retry system/action=ping calls
  return !url.match(/action=ping/)
}

// error log
const log = {

  SLOW: 1000,

  collection: Backbone ? new Backbone.Collection([]) : null,

  add (error, options) {
    if (log.collection) {
      log.collection.add(
        new Backbone.Model(error)
          .set({
            params: options.params,
            data: options.data,
            index: log.collection.length,
            timestamp: _.now(),
            url: options._url
          })
      )
    }
  }
};

// statistics
(function () {
  const list = []; const ping = []; let n = 0; let loss = 0

  log.took = function (t) {
    list.push(t)
    n++
  }

  log.loss = function () {
    loss++
  }

  log.ping = function (t) {
    ping.push(t)
  }

  log.statistics = {

    avg () {
      const sum = _(list).reduce(function (sum, num) { return sum + num }, 0)
      return Math.round(sum / n)
    },

    count () {
      return n
    },

    data () {
      return list
    },

    isLoss,

    loss () {
      return Math.round(loss / n * 100) / 100
    },

    ping () {
      return ping
    }
  }
}())

/**
 * get all columns of a module
 * @param  {string}   module name
 * @param  {boolean}  join   join array with comma separator
 * @return {string[]}        ids
 */
const getAllColumns = function (module, join) {
  // get ids
  const ids = idMapping[module] || {}
  // flatten this array
  const tmp = []; let column = ''
  for (column in ids) {
    if (idMappingExcludes.indexOf(column) === -1) {
      tmp.push(column)
    }
  }
  tmp.sort(function (a, b) {
    return a - b
  })
  return join === true ? tmp.join(',') : tmp
}

// serialize and prevent potential needless '?'
const getSerializedParams = function (o) {
  // we us $.param as functions get evaluated (in contrast to _.serialize)
  const serialized = $.param(_.omit(o.params, _.isUndefined))
  return serialized ? ('?' + serialized) : ''
}

// transform arrays to objects
const makeObject = function (data, module, columns) {
  // primitive types may be mixed with column arrays
  // e. g. deleted objects from action=updates.
  if (typeof data !== 'object') return data
  // columns set?
  columns = columns !== undefined ? columns : getAllColumns(module)
  // get ids
  const ids = idMapping[module] || {}
  const obj = {}; let i = 0; const $i = data.length; let column; let id
  // loop through data
  for (; i < $i; i++) {
    // get id
    column = columns[i]
    id = ids[column] || column
    // check for length since mighty backend might magically add unrequested columns
    if (id === undefined && i < columns.length) {
      console.error('Undefined column', data, module, columns, 'index', i)
    }
    // extend object
    obj[id] = data[i]
  }
  return obj
}

const processOptions = function (options, type) {
  // defaults
  const o = $.extend({
    module: '',
    params: {},
    data: {},
    dataType: 'json',
    appendColumns: !(type === 'GET' || type === 'UPLOAD'), // GET and UPLOAD don't need columns
    columnModule: options.module || '',
    appendSession: true,
    processData: true,
    processResponse: true,
    cursor: true
  }, options || {})
  let columns
  // store type for retry
  o.type = type
  // prepend root
  o._url = o.url || (ox.apiRoot + '/' + o.module)
  if (o.jsessionid) o._url += ';jsessionid=' + o.jsessionid
  // add session
  if (o.appendSession === true) {
    o.params.session = ox.session || 'unset'
  }
  // add columns
  if (o.appendColumns === true && o.params.columns === undefined) {
    columns = getAllColumns(o.columnModule)
    if (columns.length) {
      o.params.columns = columns.join(',')
    }
  }
  // remove white space from columns (otherwise evil to debug)
  if (o.params.columns) {
    o.params.columns = o.params.columns.replace(/\s/g, '')
  }
  // publish request before a potential use of JSON.stringify that omits undefined values
  ox.trigger('http:before:send', o)

  switch (type) {
    case 'GET':
      o._url += getSerializedParams(o)
      break
    case 'POST':
      o._url += getSerializedParams(o)
      o.original = o.data
      break
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
      o._url += '?' + _.serialize(o.params)
      o.original = o.data
      o.data = typeof o.data !== 'string' ? JSON.stringify(o.data) : o.data
      o.contentType = 'text/javascript; charset=UTF-8'
      break
    case 'UPLOAD':
      // POST with FormData object
      o._url += '?' + _.serialize(o.params)
      o.contentType = false
      o.processData = false
      o.processResponse = false
      break
      // no default
  }

  return o
}

const sanitize = function (data, module, columns) {
  // not array or no columns given?
  // typically from "action=get" (already sanitized)
  if (!_.isArray(data) || !columns) return data
  // POST/PUT - sanitize data
  let i = 0; const $l = data.length; const sanitized = []; let obj
  const columnList = columns.split(',')
  for (; i < $l; i++) {
    obj = data[i]
    sanitized.push(_.isArray(obj) ? makeObject(obj, module, columnList) : obj)
  }
  return sanitized
}

const processResponse = function (deferred, response, o) {
  // no response?
  if (!response) {
    deferred.reject(response)
    return
  }

  // server error?
  const hasData = 'data' in response
  const isWarning = response.category === 13 && hasData
  const isError = 'error' in response && !isWarning

  if (isError) {
    // forward all errors to respond to special codes
    ox.trigger('http:error:' + response.code, response, o)
    ox.trigger('http:error', response, o)

    // session expired?
    const isSessionError = (/^SES-/i).test(response.code)
    const isLogin = o.module === 'login' && o.data && /^(login|autologin|store|tokens)$/.test(o.data.action)

    if (isSessionError && !isLogin && !o.failOnError) {
      // login dialog
      ox.session = ''
      ox.trigger('relogin:required', o, deferred, response)
      return
    }
    if (that.isDisconnected() && !o.force) {
      disconnectedQueue.push({ deferred, options: o })
      return
    }

    // genereal error
    deferred.reject(response)
    return
  }

  if (isWarning) {
    ox.trigger('http:warning', response)
  }

  // success
  if (o.dataType === 'json' && o.processResponse === true) {
    // variables
    let data = []; let timestamp
    // response? (logout e.g. hasn't any)
    if (response) {
      // multiple?
      if (o.module === 'multiple') {
        let i = 0; const $l = response.length; let tmp
        for (; i < $l; i++) {
          if (response[i]) {
            // time
            timestamp = response[i].timestamp !== undefined ? response[i].timestamp : _.now()
            // data/error handling
            if (_.isEmpty(response[i])) {
              // jslob case
              data.push({ data: response[i], timestamp })
            } else if (response[i].data !== undefined) {
              // data
              let module = o.data[i].columnModule ? o.data[i].columnModule : o.data[i].module
              // handling for GET requests
              if (typeof o.data === 'string') {
                o.data = JSON.parse(o.data)
                module = o.data[i].module
              }

              // handle errors within multiple
              if (response[i].error !== undefined && response[i].category !== 13) {
                data.push({ error: response[i], timestamp })
              } else {
                // handle warnings within multiple
                if (response[i].category === 13) {
                  console.warn('http.js: warning inside multiple')
                }
                tmp = sanitize(response[i].data, module, o.data[i].columns)
                data.push({ data: tmp, timestamp })
              }
            } else {
              // error
              data.push({ error: response[i], timestamp })
            }
          }
        }
        deferred.resolve(data)
      } else {
        const columns = o.params.columns || (o.processResponse === true ? getAllColumns(o.columnModule, true) : '')
        data = sanitize(response.data, o.columnModule, columns)
        if (o.module === 'mail' && o.type === 'GET' && response.warnings) {
          // inject warning for mail get
          data.warnings = response.warnings
        }
        timestamp = response.timestamp !== undefined ? response.timestamp : _.now()
        deferred.resolve(data, timestamp)
      }
    }
  } else {
    // e.g. plain text
    deferred.resolve(response)
  }
}

// internal queue
let paused = false
let queue = []
// slow mode
const slow = _.url.hash('slow') !== undefined
// fail mode
const fail = _.url.hash('fail') !== undefined || ox.fail !== undefined

let disconnected = false
let disconnectedQueue = []

const ajax = (function () {
  // helps consolidating identical requests
  const requests = {}

  /**
   * write response to console
   * @example
   * ox.extract = {
   *      enabled: true,
   *      matcher: [
   *          { module: 'files', action: 'versions' }
   *      ]
   *  };
   */
  function extract (obj, resp) {
    if (ox.extract && ox.extract.enabled) {
      _.each([].concat(ox.extract.matcher || []), function (target) {
        if (obj.module === target.module &&
            obj.params.action === target.action) {
          // write to console
          console.groupCollapsed('extract: (module: "' + target.module + '", action: "' + target.action + '") ' + (obj.params.id || ''))
          console.log(JSON.stringify(resp, undefined, 4))
          console.groupEnd()
          // store in array
          ox.extract.output = ox.extract.output || []
          ox.extract.output.unshift(JSON.stringify(resp, undefined, 4))
        }
      })
    }
  }

  function lowLevelSend (r) {
    const fixPost = r.o.fixPost && r.xhr.type === 'POST'
    const ajaxOptions = _.extend({}, r.xhr, { dataType: fixPost ? 'text' : r.xhr.dataType })

    // extend xhr to support upload/progress notifications
    const xhr = $.ajaxSettings.xhr()
    if (xhr.upload) {
      ajaxOptions.xhr = function () { return xhr }
      xhr.upload.addEventListener('progress', function (e) {
        if (r && r.def && r.def.notify) {
          r.def.notify(e)
        }
      }, false)
    }

    const t0 = _.now()
    const ajax = $.ajax(ajaxOptions)

    // add an 'abort()' method to the Deferred and all Promises it creates
    const abortFunc = function () { ajax.abort() }
    const promiseFunc = _.bind(r.def.promise, r.def)

    _.extend(r.def, {
      abort: abortFunc,
      promise () {
        return _.extend(promiseFunc(), { abort: abortFunc })
      }
    })

    // log errors
    r.def.fail(function (error) {
      const took = _.now() - t0
      log.took(took)

      // regard 404 and 503 as loss
      const status = (error.xhr && error.xhr.status) || 200
      if (isLoss(status)) log.loss()

      // translate 503 error message cause mw isn't able at that time
      if (status === 503 && error && error.error === '503 Server shutting down...') {
        // #. server message for a special 503 mw response (service unavailable)
        error.error = gt('Server shutting down.')
      }

      if (isUnreachable(error.xhr)) {
        that.trigger('unreachable')
        ox.trigger('connection:down', error, r.o)
      } else {
        that.trigger('reachable')
        ox.trigger('connection:online connection:up')
      }
      if (error.code && errorBlocklist.indexOf(error.code) >= 0) return
      error = _.extend({ status, took }, error)
      log.add(error, r.o)
    })

    ajax.then(function (response) {
      if (fixPost) {
        // Extract the JSON text
        const matches = /\((\{.*?\})\)/.exec(response)
        return matches && matches[1] ? JSON.parse(matches[1]) : JSON.parse(response)
      }
      return response
    })
      .done(function (response) {
        that.trigger('reachable')
        ox.trigger('connection:online connection:up')

        // write response to console
        if (ox.debug) {
          extract(r.o, response)
        }

        // slow?
        const took = _.now() - t0
        log.took(took)
        if (took > log.SLOW) {
          log.add({ error: 'Took: ' + (Math.round(took / 100) / 10) + 's', status: 200, took }, r.o)
        }
        // trigger event first since HTTP layer finishes work
        that.trigger('stop done', r.xhr)
        // process response
        if (r.o.processData) {
          processResponse(r.def, response, r.o, r.o.type)
        } else if (r.xhr.dataType === 'json' && response.error !== undefined && response.category !== 13) {
          // error handling if JSON (e.g. for UPLOAD)
          response.folder = r.o.data.folder
          ox.trigger('http:error:' + response.code, response, r.o)
          ox.trigger('http:error', response, r.o)
          r.def.reject(response)
        } else if (_.isArray(response.data)) {
          // Skip Warnings (category: 13)
          response.data = response.data.map(o => o.category === 13 ? undefined : o)
          r.def.resolve(response)
        } else {
          r.def.resolve(response)
        }
        r = null
      })
      .fail(function (xhr, textStatus, errorThrown) {
        if (isLoss(xhr.status) && isRetryable(r.xhr.url)) {
          // automatic retry
          if (r.retries < 3) {
            r.retries++
            return retryRequest(r)
          }
        }
        that.trigger('stop fail', r.xhr)
        let message = xhr.status !== 0 ? xhr.status + ' ' : ''
        message += errorThrown || (navigator.onLine ? that.messages.generic : that.messages.offline)
        r.def.reject({ xhr, error: message, code: navigator.onLine ? 'NOSERVER' : 'OFFLINE' })
        r = null
      })
  }

  // retry API requests that failed with 4xx or 5xx with increasing backoff
  const retryRequest = function (r) {
    const retries = r.retries
    const delays = {
      1: 1500,
      2: 3000,
      3: 5000
    }
    // add some jitter to randomize retry times up to 0.5s
    const jitter = Math.floor(Math.random() * 500) + 100

    function sendDelayed (r, ms) {
      if (ox.debug) console.log(`Automatic retry #${retries} of request ${r.xhr.url.split('&')[0]}`)
      setTimeout(() => lowLevelSend(r), ms)
    }

    sendDelayed(r, delays[retries] + jitter)
  }
  //
  // limitedSend allows limiting the number of parallel requests
  // Actually the browser should do that but apparently some have
  // problems dealing with large timeouts
  //
  const limitedSend = (function () {
    let pending = 0; const queue = []

    return function (request) {
      if (!ox.serverConfig.maxConnections) return send(request)
      if (belowLimit()) send(request); else queue.push(request)
    }

    function belowLimit () {
      return pending < ox.serverConfig.maxConnections
    }

    function send (request) {
      pending++
      request.def.always(tick)
      lowLevelSend(request)
    }

    function tick () {
      pending--
      if (belowLimit() && queue.length > 0) send(queue.shift())
    }
  }())

  // to avoid bugs based on passing objects by reference
  function clone (data) {
    // null, undefined, empty string, numeric zero
    if (!data) return data
    return JSON.parse(JSON.stringify(data))
  }

  function isConcurrent (r) {
    let hash

    // look for concurrent identical GET/PUT requests
    if (r.o.type !== 'GET' && r.o.type !== 'PUT') return

    // get hash value - we just use stringify here (xhr contains payload for unique PUT requests)
    try { hash = JSON.stringify(r.xhr) } catch (e) { if (ox.debug) console.error(e) }

    if (r.o.consolidate !== false && hash && _.isArray(requests[hash])) {
      if (r.o.consolidate === 'reject') {
        r.def.reject({ error: 'request is already pending and consolidate parameter is set to reject', code: 'UI_CONSREJECT' })
        return
      }

      // enqueue callbacks
      requests[hash].push(r)
      r = hash = null
      return true
    }

    // init queue
    requests[hash] = []
    // create new request
    r.def.always(function () {
      // success or failure?
      const success = r.def.state() === 'resolved'
      // at first, remove request from hash (see bug 37113)
      const reqs = requests[hash]
      delete requests[hash]
      if (!reqs || !reqs.length) return
      // now resolve all callbacks
      const args = _(arguments).map(clone)
      _(reqs).each(function (r) {
        r.def[success ? 'resolve' : 'reject'].apply(r.def, args)
        that.trigger('stop ' + (success ? 'done' : 'fail'), r.xhr)
      })
      r = hash = null
    })
  }

  function send (r) {
    if (!isConcurrent(r)) limitedSend(r)
  }

  return function (o, type) {
    // process options
    o = processOptions(o, type)

    // vars
    let r; const def = $.Deferred()

    // allowlisting sessionless actions (config, login, autologin)
    if (!o.params.session && o.appendSession !== false) {
      // check allowlist
      const allowlist = ['login#*', 'capabilities#*', 'apps/manifests#*', 'files#document', 'office#getFile']
      const found = _.find(allowlist, function (moduleAction) {
        const e = moduleAction.split('#')
        return (o.module === e[0] && (e[1] === '*' || o.params.action === e[1]))
      })
      if (!found) {
        ox.trigger('relogin:required', o, def, {})
        return def
      }
    }

    // If http disconnected and the call isn't being forced, add to queue
    if (disconnected === true && !o.force) {
      disconnectedQueue.push({ deferred: def, options: o })
      return def
    }

    // build request object
    r = {
      def,
      o,
      retries: 0, // track retries
      xhr: {
        // type (GET, POST, PUT, ...)
        type: type === 'UPLOAD' ? 'POST' : type,
        // url
        url: o._url,
        // data
        data: o.data,
        dataType: o.dataType,
        processData: o.processData,
        contentType: o.contentType !== undefined ? o.contentType : 'application/x-www-form-urlencoded',
        beforeSend: o.beforeSend
      }
    }
    // paused?
    if (paused === true) {
      if (!isConcurrent(r)) queue.push({ deferred: def, options: o })
      return def
    }
    // use timeout?
    if (typeof o.timeout === 'number') {
      r.xhr.timeout = o.timeout
    }
    // continuation
    function cont () {
      if ((ox.fail || fail) && o.module !== 'login' && Math.random() < Number(ox.fail || _.url.hash('fail') || 0)) {
        // simulate broken connection
        console.error('HTTP fail', r.o._url, r.xhr)
        r.def.reject({ error: '0 simulated fail' })
        that.trigger('stop fail', r.xhr)
      } else {
        send(r)
      }
      r = o = null
    }
    that.trigger('start', r.xhr, o)
    if (slow && Number(_.url.hash('slow'))) {
      // simulate slow connection
      setTimeout(cont, 250 * Number(_.url.hash('slow')) + (Math.random() * 500 >> 0))
    } else {
      cont()
    }
    return def
  }
}())

const wait = (function () {
  const ready = $.when()
  let block = $.Deferred()

  function release () {
    block.resolve()
    block = $.Deferred()
  }

  function wait (def) {
    if (!def) return wait.pending === 0 ? ready : block.promise()
    wait.pending++
    return def.always(function () {
      wait.pending--
      if (wait.pending === 0) release()
    })
  }

  wait.pending = 0
  return wait
}())

that = {

  /**
   * Send a GET request
   * @param   {object}          options        Request options
   * @param   {string}          options.module Module, e.g. folder, mail, calendar etc.
   * @param   {object}          options.params URL parameters
   * @returns {jQuery.Deferred}
   * @example
   * http.GET({ module: "mail", params: { action: "all", folder: "default0/INBOX" }});
   */
  GET (options) {
    return ajax(options, 'GET')
  },

  /**
   * Send a POST request
   * @param   {object}          options        Request options
   * @param   {string}          options.module Module, e.g. folder, mail, calendar etc.
   * @param   {object}          options.params URL parameters
   * @returns {jQuery.Deferred}
   */
  POST (options) {
    return ajax(options, 'POST')
  },

  /**
   * Send a PATCH request
   * @param   {object}          options        Request options
   * @param   {string}          options.module Module, e.g. folder, mail, calendar etc.
   * @param   {object}          options.params URL parameters
   * @returns {jQuery.Deferred}
   */
  PATCH (options) {
    return ajax(options, 'PATCH')
  },

  /**
   * Send a PUT request
   * @param   {object}          options        Request options
   * @param   {string}          options.module Module, e.g. folder, mail, calendar etc.
   * @param   {object}          options.params URL parameters
   * @returns {jQuery.Deferred}
   */
  PUT (options) {
    return ajax(options, 'PUT')
  },

  /**
   * Send a DELETE request
   * @param   {object}          options        Request options
   * @param   {string}          options.module Module, e.g. folder, mail, calendar etc.
   * @param   {object}          options.params URL parameters
   * @returns {jQuery.Deferred}
   */
  DELETE (options) {
    return ajax(options, 'DELETE')
  },

  /**
   * Send a POST request using a FormData object
   * @param   {object}          options        Request options
   * @param   {string}          options.module Module, e.g. folder, mail, calendar etc.
   * @param   {object}          options.params URL parameters
   * @returns {jQuery.Deferred}
   */
  UPLOAD (options) {
    return ajax(options, 'UPLOAD')
  },

  FORM (options) {
    options = _.extend({
      module: 'files',
      action: 'new',
      data: {},
      params: {},
      form: $(),
      field: 'json'
    }, options)

    const name = 'formpost_' + _.now()
    const callback = 'callback_' + options.action
    const callbackOld = 'callback_' + options.module
    let def = $.Deferred()
    let data = JSON.stringify(options.data)
    const url = ox.apiRoot + '/' + options.module + '?action=' + options.action + '&session=' + ox.session
    let form = options.form

    $('#tmp').append(
      $('<iframe>', { name, id: name, height: 1, width: 1, src: 'blank.html' })
    )

    window[callback] = function (response) {
      // skip warnings
      if (_.isArray(response.data)) {
        // Skip Warnings (category: 13)
        response.data = response.data.map(o => o.category === 13 ? undefined : o)
      }
      def[(response && response.error ? 'reject' : 'resolve')](response)
      window[callback] = data = form = def = null
      $('#' + name).remove()
    }
    // fallback for some old modules (e.g. import)
    window[callbackOld] = window[callback]

    if (form.find(`input[name="${CSS.escape(options.field)}"]`).length) {
      form.find(`input[name="${CSS.escape(options.field)}"]`).val(data)
    } else {
      form.append(
        $('<input type="hidden" name="' + options.field + '">').val(data)
      )
    }

    form.prop({
      method: 'post',
      enctype: 'multipart/form-data',
      encoding: 'multipart/form-data',
      action: url + '&' + _.serialize(options.params),
      target: name
    })

    form.submit()

    return def
  },

  // simple utility function to wait for other requests
  wait,

  /**
   * Get all columns of a module
   * @param   {string}   module Module name
   * @returns {string[]}        All columns
   */
  getAllColumns,

  /**
   * Returns the column mapping of a module
   * @param   {string} module The module name.
   * @returns {object}        A map from numeric column IDs to the corresponding field names.
   */
  getColumnMapping (module) {
    return _.clone(idMapping[module] || {})
  },

  getRequestLengthLimit () {
    // default to the value from apache documentation
    return ox.serverConfig.limitRequestLine || 8190
  },

  /**
   * Transform objects with array-based columns into key-value-based columns
   * @param   {object[]} data    Data
   * @param   {string}   module  Module name
   * @param   {string[]} columns Columns
   * @returns {object}           Transformed object
   */
  makeObject,

  /**
   * Simplify objects in array for list requests
   * @param   {object[]} list
   * @returns {object[]}      list
   */
  simplify (list) {
    let i = 0; let item = null; const tmp = new Array(list.length)
    for (; (item = list[i]); i++) {
      if (typeof item === 'object') {
        tmp[i] = { id: item.id }
        // look for folder(_id) - e.g. groups/users don't have one
        if ('folder' in item || 'folder_id' in item) {
          tmp[i].folder = item.folder || item.folder_id
        }
        // calendar support:
        if ('recurrence_position' in item) {
          tmp[i].recurrence_position = item.recurrence_position
        }
      } else {
        // just integers for example
        tmp[i] = item
      }
    }
    return tmp
  },

  /**
   * Fixes order of list requests (temp. fixes backend bug)
   * @param  {object[]}        ids
   * @param  {jQuery.Deferred} deferred
   * @return {jQuery.Deferred}          resolve returns array
   */
  fixList (ids, deferred) {
    return deferred.then(function (data) {
      // simplify
      ids = that.simplify(ids)
      // build hash (uses folder_id!)
      let i; let obj; let hash = {}; const tmp = new Array(data.length); let key
      // use internal_userid?
      const useInternalUserId = _(ids).reduce(function (memo, obj) {
        return memo && _.isNumber(obj)
      }, true)
      for (i = 0; (obj = data[i]); i++) {
        key = useInternalUserId ? (obj.internal_userid || obj.user_id || obj.id) : _.cid(obj)
        hash[key] = obj
      }
      // fix order (uses folder!)
      for (i = 0; (obj = ids[i]); i++) {
        key = useInternalUserId ? obj : _.cid(obj)
        tmp[i] = hash[key]
      }
      hash = obj = ids = null
      return tmp
    })
  },

  /**
   * Retry request
   */
  retry (request) {
    // get type
    const type = (request.type || 'GET').toUpperCase()
    // avoid consolidating requests
    request.consolidate = false
    return this[type](request)
  },

  /**
   * Collect requests
   */
  pause () {
    paused = true
    this.trigger('paused')
  },

  isPaused () {
    return paused
  },

  // Shut down http service due to some other required action.  Queue requests
  disconnect () {
    that.trigger('disconnect')
    disconnected = true
  },

  isDisconnected () {
    return disconnected
  },

  // Resume http service, executing pending requests as individual requests
  reconnect () {
    disconnected = false
    const pending = disconnectedQueue.slice().map(function (req) {
      req.options.consolidate = false
      return ajax(req.options, req.options.type)
        .then(req.deferred.resolve, req.deferred.reject)
    })

    $.when.apply(null, pending).always(function () {
      that.trigger('reconnect')
    })

    disconnectedQueue = []
  },
  // Wipe the disconnect queue and resume
  resetDisconnect (resp, { filter, silent } = {}) {
    const filterFn = typeof filter === 'function' ? filter : () => true

    const pending = disconnectedQueue.filter(filterFn).map(function (req) {
      if (silent) return req
      req.deferred.reject(resp)
      return req.deferred
    })

    disconnectedQueue = disconnectedQueue.filter(req => !filterFn(req))
    $.when.apply(null, pending).always(that.reconnect)
  },

  /**
   * Resume HTTP API. Send all queued requests as one multiple
   */
  resume (options) {
    options = options || {}
    const def = $.Deferred()
    const q = queue.slice()
    if (paused === true) {
      // create multiple request
      let i = 0; const $l = q.length; let req; let o; const tmp = []
      for (; i < $l; i++) {
        // get request
        req = q[i].options
        // remove session
        delete req.params.session
        // build request
        o = $.extend(req.params, { module: req.module, data: req.original })
        // action?
        if (req.params.action !== undefined) {
          o.action = req.params.action
        }
        // add
        tmp.push(o)
      }
      // clear queue & remove "paused" flag
      queue = []
      paused = false
      this.trigger('resumed')
      // send PUT
      if (tmp.length > 0) {
        this.PUT({
          module: 'multiple',
          continue: true,
          data: tmp,
          appendColumns: false,
          consolidate: options.consolidate
        })
          .done(function (data) {
            // orchestrate callbacks and their data
            for (let i = 0, $l = q.length, item; i < $l; i++) {
              item = data[i]
              if (_.isObject(item) && 'data' in item && 'timestamp' in item) {
                q[i].deferred.resolve(item.data, item.timestamp)
              } else if (item === undefined || item === null) {
                // sometimes the server just sends "null" in a multiple request
                q[i].deferred.reject({ error: gt('Server did not send a response'), code: '0000' })
              } else if (item.error) {
                q[i].deferred.reject(item.error)
              } else {
                q[i].deferred.resolve(item)
              }
            }
            // continuation
            def.resolve(data)
          })
          .fail(function (error) {
            _(q).each(function (item) {
              item.deferred.reject(error)
            })
            // continuation
            def.reject(error)
          })
      } else {
        // continuation
        def.resolve([])
      }
    } else {
      def.resolve([])
    }
    return def
  },

  getColumn (module, column) {
    if (!module) return idMapping
    const columns = idMapping[module] || {}
    return column ? columns[column] : columns
  },

  // send server ping
  ping () {
    const t0 = _.now()
    return this.GET({
      module: 'system',
      params: {
        action: 'ping',
        timestamp: _.now()
      }
    })
      .then(function () {
        const took = _.now() - t0
        log.ping(took)
        return took
      })
  },

  /**
   * returns failed calls
   * @return { backbone.collection }
   */
  log () {
    return log.collection
  },

  statistics: log.statistics,

  messages: {
    // translation will be injected by http_error.js
    generic: 'An unknown error occurred',
    noserver: 'An unknown error occurred',
    offline: 'Cannot connect to server. Please check your connection.'
  },

  // helper to unify columns for mail API and boot/load
  defaultColumns: {

    mail: (function () {
      const generic = extendColumns('102,600,601,602,603,604,605,606,607,608,609,610,611,614,652,656,661', 'io.ox/mail/api/defaultColumns/generic')
      // 661 (text_preview) and 664 (authenticity_preview) might be added during boot process (see core/boot/load.js)
      const all = extendColumns(generic, 'io.ox/mail/api/defaultColumns/all')
      // virtual folders need 654 (original_id 654) and 655 (original_folder_id)
      const unseen = extendColumns(generic + ',654,655', 'io.ox/mail/api/defaultColumns/unseen')
      const flagged = extendColumns(generic + ',654,655', 'io.ox/mail/api/defaultColumns/flagged')
      const search = extendColumns(generic + ',654,655', 'io.ox/mail/api/defaultColumns/search')
      return { generic, unseen, flagged, all, search }
    }())
  }
}

Events.extend(that)

export default that
