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

const { I } = inject()

function getPageTitle (page) {
  if (page === 'General') return 'core'
  if (page === 'Drive') return 'files'
  if (page === 'Download personal data') return 'personaldata'
  if (page === 'Accounts') return 'io.ox/settings/accounts'
  return page.toLocaleLowerCase()
}

module.exports = {
  /**
   * Opens a new settings page in the virtual settings editor.
   *
   * @async
   * @param {string} [page='general'] - The name of the settings page to open.
   * @param {string} [section=''] - The name of the settings section to open.
   */
  open (page = '', section = '') {
    page = getPageTitle(page)

    I.executeScript(async (page) => {
      const { default: ox } = await import(String(new URL('ox.js', location.href)))

      if (!page) page = ox.ui.App.getCurrentApp().get('id')
      page = ox.ui.App.getByCid(`io.ox/${page}`) ? `io.ox/${page}` : page
      page = page === 'core' ? 'io.ox/core' : page
      const { default: openSettings } = await import(String(new URL('io.ox/settings/util.js', location.href)))
      await openSettings(`virtual/settings/${page}`)
    }, page)
    I.waitForApp()
    if (section) return this.expandSection(section)
  },

  close () {
    I.waitForElement('.settings-detail-pane .close-settings')
    I.waitForClickable('.settings-detail-pane .close-settings')
    I.click('.settings-detail-pane .close-settings')
    I.waitForDetached('.settings-detail-pane')
  },

  expandSection (title) {
    const locator = locate('summary').withText(title).inside('.settings-detail-pane .expandable-section').as(`Expandable section "${title}"`)
    I.waitForText(title, 5, '.settings-detail-pane')
    I.waitForElement(locator)
    I.click(locator)

    // wait for expanded section
    const expanded = locate('summary').withText(title).inside('.settings-detail-pane .expandable-section[open]').as(`Expandable section "${title}" (expanded)`)
    I.waitForElement(expanded)
  }
}
