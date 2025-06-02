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

const Helper = require('@open-xchange/codecept-helper').helper
const { util } = require('@open-xchange/codecept-helper')
const output = require('codeceptjs/lib/output')
const chai = require('chai')
const chaiSubset = require('chai-subset')
chai.use(chaiSubset)
const { expect } = chai

function delay (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

async function retryPromise (fn, timeout = 5, retryDelay = 300) {
  const start = Date.now()
  const retry = async () => {
    if (Date.now() - start > timeout * 1000) return Promise.reject(new Error('Timed out'))
    await delay(retryDelay)
    return fn().catch(retry)
  }
  return retry()
}

class MyHelper extends Helper {
  async haveLockedFile (data, options) {
    const { httpClient, session } = await util.getSessionForUser(options)
    const response = await httpClient.put('/api/files', data, {
      params: {
        action: 'lock',
        id: data.id,
        folder: data.folder_id,
        session
      }
    })
    return response.data
  }

  // TODO: Can be removed as soon as this is fixed in codecept
  async pressKeys (key) {
    if (this.helpers.WebDriver) {
      return this.helpers.WebDriver.pressKey(key)
    }
    if (this.helpers.Puppeteer) {
      return [...key].forEach(k => this.helpers.Puppeteer.pressKey(k))
    }
  }

  // implementation based on https://github.com/puppeteer/puppeteer/issues/1376
  // helper for dropzones, works with single file(string) or multiple files(array of strings)
  async dropFiles (filePath, dropZoneSelector) {
    const { page } = this.helpers.Puppeteer

    // prepare temp file input
    await page.evaluate(function (filePath, dropZoneSelector) {
      document.body.appendChild(Object.assign(
        document.createElement('input'),
        {
          id: 'temp-dropzone-helper',
          type: 'file',
          multiple: 'multiple',
          onchange: e => {
            // use file input to create a fake drop event on the dropzone
            document.querySelector(dropZoneSelector).dispatchEvent(Object.assign(
              new Event('drop'),
              { dataTransfer: { files: e.target.files } }
            ))
          }
        }
      ))
    }, filePath, dropZoneSelector)

    // upload file
    const fileInput = await page.$('#temp-dropzone-helper')
    // string = single file, array = multiple files
    if (typeof filePath === 'string') {
      await fileInput.uploadFile(filePath)
    } else {
      await fileInput.uploadFile.apply(fileInput, filePath)
    }

    // cleanup
    await page.evaluate(function () {
      document.getElementById('temp-dropzone-helper').remove()
    })
  }

  /*
     * Overwrite native puppeteer d&d, because it does not work for every case
     * Maybe this is going to be fixed in the future by puppeteer, then this can be removed.
     * Note that this does not work on macOS, as there the "page.mouse.move" will always move the cursor to the screen position of the users mouse
     */
  async dragAndDrop (srcSelector, targetSelector) {
    const wdio = this.helpers.WebDriver
    if (wdio) return wdio.dragAndDrop.apply(wdio, arguments)

    const helper = this.helpers.Puppeteer
    const { page } = helper
    const [src] = await helper._locate(srcSelector)
    const [target] = await helper._locate(targetSelector)
    const srcBB = await src.boundingBox()
    const targetBB = await target.boundingBox()

    const startX = srcBB.x + srcBB.width / 2
    const startY = srcBB.y + srcBB.height / 2
    const endX = targetBB.x + targetBB.width / 2
    const endY = targetBB.y + targetBB.height / 2
    await page.waitForTimeout(200)
    await page.mouse.move(startX, startY)
    await page.waitForTimeout(50)
    await page.mouse.down()
    await page.waitForTimeout(50)
    await page.evaluate(async (ss, X, Y) => {
      ss.dispatchEvent(new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        screenX: X,
        screenY: Y,
        clientX: X,
        clientY: Y,
        dataTransfer: new DataTransfer()
      }))
    }, src, startX, startY)
    await page.waitForTimeout(50)
    await page.mouse.move(endX, endY)
    await page.waitForTimeout(50)
    await page.evaluate(async (ts, X, Y) => {
      ts.dispatchEvent(new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        screenX: X,
        screenY: Y,
        clientX: X,
        clientY: Y,
        dataTransfer: new DataTransfer()
      }))
      ts.dispatchEvent(new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        screenX: X,
        screenY: Y,
        clientX: X,
        clientY: Y,
        dataTransfer: new DataTransfer()
      }))
    }, target, endX, endY)
    await page.waitForTimeout(50)
    await page.mouse.up()
    await page.waitForTimeout(50)
    await page.evaluate(async (ss, X, Y) => {
      ss.dispatchEvent(new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        screenX: X,
        screenY: Y,
        clientX: X,
        clientY: Y,
        dataTransfer: new DataTransfer()
      }))
      ss.dispatchEvent(new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        screenX: X,
        screenY: Y,
        clientX: X,
        clientY: Y,
        dataTransfer: new DataTransfer()
      }))
    }, src, endX, endY)
  }

  // When we need to click slower than puppeteer
  // Click on target with mouse down and release after delay
  async slowClick (targetSelector, delay = 100) {
    const helper = this.helpers.Puppeteer
    const { page } = helper

    const [target] = await helper._locate(targetSelector)
    const targetBB = await target.boundingBox()

    const targetX = targetBB.x + targetBB.width / 2
    const targetY = targetBB.y + targetBB.height / 2

    await page.mouse.move(targetX, targetY)
    await page.mouse.down()
    await page.waitForTimeout(delay)
    await page.mouse.up()
  }

  /**
   * @param {object} options
   * @param {object} [options.user]                 a user object as returned by provisioning helper, default is the "first" user
   * @param {object} [options.additionalAccount]    an additional user that will be provisioned as the external account
   * @param {string} [options.extension]            optional extension added to the mail address ("ext" will be translated to: $user.primary+ext@mailDomain)
   * @param {string} [options.name]                 name of the account
   * @param {string} [options.transport_auth]       transport authentication, default: 'none'
   */
  async haveMailAccount ({ user, additionalAccount, extension, name, transport_auth: transportAuth }) {
    if (!user) user = inject().users[0]
    if (!additionalAccount) additionalAccount = user
    if (!transportAuth) transportAuth = 'none'

    const { httpClient, session } = await util.getSessionForUser({ user })
    const mailDomain = additionalAccount.get('primaryEmail').replace(/.*@/, '')
    const imapServer = additionalAccount.get('imapServer') === 'localhost' ? mailDomain : additionalAccount.get('imapServer')
    const smtpServer = additionalAccount.get('smtpServer') === 'localhost' ? mailDomain : additionalAccount.get('smtpServer')

    const account = {
      name,
      primary_address: `${additionalAccount.get('primaryEmail').replace(/@.*/, '')}${extension ? '-' + extension : ''}@${mailDomain}`,
      login: additionalAccount.get('imapLogin'),
      password: additionalAccount.get('password'),
      mail_url: `${additionalAccount.get('imapSchema')}${imapServer}:${additionalAccount.get('imapPort')}`,
      transport_url: `${additionalAccount.get('smtpSchema')}${smtpServer}:${additionalAccount.get('smtpPort')}`,
      transport_auth: transportAuth
    }
    const response = await httpClient.put('/api/account', account, {
      params: {
        action: 'new',
        session
      }
    })
    return response.data
  }

  /**
   * @param {object} obj
   * @param {number} timeout
   * @param {object} options
   * @returns
   */
  async waitForSetting (obj, timeout = 5, options = {}) {
    const { httpClient, session } = await util.getSessionForUser(options)
    const [moduleName] = Object.keys(obj)

    async function checkSetting () {
      const data = await httpClient.get('/api/jslob', {
        params: {
          id: moduleName,
          action: 'get',
          session
        }
      }).then(function (res) {
        if (res.data.error) throw new Error(res.data.error)
        return res.data.data
      })
      expect(data.tree).to.containSubset(obj[moduleName])
    }

    const startTime = Date.now()

    return retryPromise(checkSetting, timeout).finally(() =>
      output.say(`Waiting for settings to be saved took ${(Date.now() - startTime) / 1000} seconds`)
    )
  }

  async waitForCapability (capability, timeout = 10, options = { shouldBe: true }) {
    const { httpClient, session } = await util.getSessionForUser(options)

    async function checkCapability () {
      const data = await httpClient.get('/api/capabilities', {
        params: {
          action: 'get',
          id: capability,
          session
        }
      }).then(function (res) {
        if (options.shouldBe && Object.keys(res.data).length === 0) throw new Error(res.data.error)
        else if (!options.shouldBe && Object.keys(res.data).length !== 0) throw new Error(res.data.error)
        return res.data
      })
      return data
    }

    const startTime = Date.now()
    // We wait 2500ms to make sure that the cache was invalidated in the meantime
    return retryPromise(checkCapability, timeout, 1000).finally(() =>
      output.say(`Waiting for capability to be saved took ${(Date.now() - startTime) / 1000} seconds`)
    )
  }

  async waitForApp () {
    const { Puppeteer } = this.helpers

    await Puppeteer.waitForInvisible('#background-loader.busy', 30)
    await Puppeteer.waitForVisible({ css: 'html.complete' }, 10)
  }

  async copyToClipboard () {
    const helper = this.helpers.Puppeteer
    const { page } = helper
    await page.evaluate(async () => { document.execCommand('copy') })
  }

  async getClipboardContent () {
    const helper = this.helpers.Puppeteer
    const { page, browser, config } = helper
    // make sure the browser is focused, might have lost the focus due to executing steps manually with 'pause()'
    await page.bringToFront()
    // reading the clipboard requires correct permissions
    await browser.defaultBrowserContext().overridePermissions(config.url, ['clipboard-read'])
    return await page.evaluate(async () => { return navigator.clipboard.readText() })
  }
}

module.exports = MyHelper
