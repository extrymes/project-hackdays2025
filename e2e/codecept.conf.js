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

require('dotenv-defaults').config()

const requiredEnvVars = ['LAUNCH_URL', 'PROVISIONING_URL', 'CONTEXT_ID']

requiredEnvVars.forEach(function notdefined (key) {
  if (process.env[key]) return
  console.error('\x1b[31m', `ERROR: Missing value for environment variable '${key}'. Please specify a '.env' file analog to '.env-example'.`)
  process.exit()
})

const helpers = {
  Puppeteer: {
    url: process.env.LAUNCH_URL,
    smartWait: 1000,
    waitForTimeout: Number(process.env.WAIT_TIMEOUT),
    browser: 'chrome',
    restart: true,
    windowSize: '1280x1024',
    uniqueScreenshotNames: true,
    timeouts: {
      script: 5000
    },
    chrome: {
      executablePath: process.env.CHROME_BIN,
      args: [
        '--disable-crash-reporter',
        '--disable-dev-shm-usage',
        '--disable-features=IsolateOrigins',
        '--disable-gpu',
        '--disable-notifications', // to disable native notification window on Mac OS,
        '--disable-print-preview',
        '--disable-setuid-sandbox',
        '--disable-site-isolation-trials',
        '--disable-web-security',
        process.env.HEADLESS === 'false' ? '' : `--headless=${process.env.HEADLESS}`,
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        `--unsafely-treat-insecure-origin-as-secure=${process.env.LAUNCH_URL}`
      ].concat((process.env.CHROME_ARGS || '').split(' '))
    },
    // set HEADLESS=false in your terminal to show chrome window
    show: process.env.HEADLESS === 'false' || 'new',
    waitForNavigation: ['domcontentloaded', 'networkidle0']
  },
  OpenXchange: {
    require: './helper',
    mxDomain: process.env.MX_DOMAIN,
    serverURL: process.env.PROVISIONING_URL,
    contextId: process.env.CONTEXT_ID,
    filestoreId: process.env.FILESTORE_ID,
    smtpServer: process.env.SMTP_SERVER,
    imapServer: process.env.IMAP_SERVER,
    loginTimeout: 30,
    admin: {
      login: process.env.E2E_ADMIN_USER,
      password: process.env.E2E_ADMIN_PW
    }
  },
  FileSystem: {},
  MockRequestHelper: {
    require: '@codeceptjs/mock-request'
  }
}

module.exports.config = {
  tests: './tests/**/*_test.js',
  timeout: 90,
  output: './output/',
  helpers,
  include: {
    I: './actor',
    users: '@open-xchange/codecept-helper/src/users.js',
    contexts: '@open-xchange/codecept-helper/src/contexts.js',
    // pageobjects
    contacts: './pageobjects/contacts',
    calendar: './pageobjects/calendar',
    mail: './pageobjects/mail',
    drive: './pageobjects/drive',
    tasks: './pageobjects/tasks',
    // fragments
    dialogs: './pageobjects/fragments/dialogs',
    autocomplete: './pageobjects/fragments/contact-autocomplete',
    contactpicker: './pageobjects/fragments/contact-picker',
    mailfilter: './pageobjects/fragments/settings-mailfilter',
    search: './pageobjects/fragments/search',
    tinymce: './pageobjects/fragments/tinymce',
    topbar: './pageobjects/fragments/topbar',
    settings: './pageobjects/fragments/settings',
    viewer: './pageobjects/fragments/viewer',
    mobileCalendar: './pageobjects/mobile/mobileCalendar',
    mobileMail: './pageobjects/mobile/mobileMail',
    mobileContacts: './pageobjects/mobile/mobileContacts'
  },
  async bootstrap () {
    // setup chai
    const chai = require('chai')
    chai.config.includeStack = true
    // setup axe matchers
    require('./axe-matchers')

    // set moment defaults
    // note: no need to require moment-timezone later on. requiring moment is enough
    const moment = require('moment')
    require('moment-timezone')
    moment.tz.setDefault('Europe/Berlin')

    const codecept = require('codeceptjs')
    const config = codecept.config.get()
    const helperConfig = config.helpers.OpenXchange

    const contexts = codecept.container.support('contexts')
    // eslint-disable-next-line
    const helper = new ((require('@open-xchange/codecept-helper')).helper)()
    const testRunContext = await contexts.create()
    if (typeof testRunContext.id !== 'undefined') helperConfig.contextId = testRunContext.id
  },
  async teardown () {
    const { contexts } = global.inject()
    // we need to run this sequentially, less stress on the MW
    for (const ctx of contexts.filter(ctx => ctx.id > 100)) {
      if (ctx.id !== 10) await ctx.remove().catch(e => console.error(e.message))
    }
  },
  reporter: 'mocha-multi',
  mocha: {
    reporterOptions: {
      'codeceptjs-cli-reporter': {
        stdout: '-'
      },
      'mocha-junit-reporter': {
        stdout: '-',
        options: {
          jenkinsMode: true,
          mochaFile: './output/junit.xml',
          attachments: false // add screenshot for a failed test
        }
      }
    }
  },
  plugins: {
    allure: { enabled: true, require: '@codeceptjs/allure-legacy' },
    testMetrics: {
      require: './plugins/testmetrics',
      url: 'https://e2e-metrics.dev.oxui.de',
      org: 'e2e',
      defaultTags: {
        client: process.env.E2E_TEST_METRICS_CLIENT || (process.env.CI && 'CI'),
        pipelineId: process.env.CI_PIPELINE_ID,
        branch: process.env.CI_COMMIT_REF_NAME,
        project: process.env.CI_PROJECT_PATH
      },
      token: process.env.E2E_TEST_METRICS_TOKEN,
      enabled: true
    },
    settingsInit: {
      require: './plugins/settingsInit',
      enabled: true
    },
    browserLogReport: {
      require: '@open-xchange/allure-browser-log-report',
      enabled: true
    },
    customizePlugin: {
      require: process.env.CUSTOMIZE_PLUGIN || '@open-xchange/codecept-helper/src/plugins/emptyModule',
      enabled: true
    },
    filterSuite: {
      enabled: !process.env.E2E_GREP && process.env.CI && (process.env.SUITE_SERVICE_URL || process.env.FILTER_SUITE),
      require: '@open-xchange/codecept-horizontal-scaler',
      suiteFilePath: process.env.FILTER_SUITE,
      filterFn: process.env.runOnly === 'true' ? () => false : undefined,
      nodePrefix: 'core-ui'
    },
    // leave this empty, we only want this plugin to be enabled on demand by a developer
    pauseOnFail: {}
  },
  rerun: {
    minSuccess: Number(process.env.MIN_SUCCESS),
    maxReruns: Number(process.env.MAX_RERUNS)
  },
  name: 'App Suite Core UI'
}
