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

Feature('Mail Compose')

Before(async ({ users }) => {
  await Promise.all([
    users.create(), // The user running the test
    users.create(), // 1st member of distributionlist
    users.create(), // 2nd member of distributionlist
    users.create() // another user, addressed individually
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C85622] Address Book Popup', async ({ I, users, mail }) => {
  I.login('app=io.ox/mail')
  // Create distributionlist
  const distributionList = [
    { display_name: users[1].get('display_name'), mail: users[1].get('primaryEmail'), mail_field: 0 },
    { display_name: users[2].get('display_name'), mail: users[2].get('primaryEmail'), mail_field: 0 }
  ]
  await I.executeScript(async function (distributionList, done) {
    const { settings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    const { default: api } = await import(String(new URL('io.ox/contacts/api.js', location.href)))
    return api.create({
      mark_as_distributionlist: true,
      folder_id: settings.get('folder/contacts'),
      display_name: 'Erisian Disciples',
      distribution_list: distributionList
    })
  }, distributionList)

  mail.newMail()
  // Enter everything but the last letter of the display name of user 3 in the To field
  // To make the autocomplete dropdown appear
  const displayName = users[3].get('display_name')
  const partialName = displayName.substring(0, displayName.length - 1)
  I.fillField('To', partialName)
  I.waitForText(displayName, 5, '.tt-suggestion')
  // Click on the entry to add it to the To: field
  I.click(displayName, '.tt-suggestion')

  // Now let's do the same thing for the distribution list
  I.fillField('To', 'Erisian')
  // distribution lists somehow need a more specific selector :/
  I.waitForText('Erisian Disciples', 5, '.tt-suggestion .participant-name')
  I.click('Erisian Disciples', '.tt-suggestion .participant-name')

  // Verify we see the given_name + sur_name combination for users[3]
  I.see(users[3].get('given_name') + ' ' + users[3].get('sur_name'), '.tokenfield')
  // The display names of users[1] and users[2] (because that's how they were saved in the d-list)
  I.see(users[1].get('display_name'), '.tokenfield')
  I.see(users[2].get('display_name'), '.tokenfield')

  // Compose an email and send it
  I.fillField('Subject', 'Hail Eris! All Hail Discordia!')
  mail.send()
  // Verify the mail arrived at the other accounts
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForText('Hail Eris! All Hail Discordia!', 5)
  I.logout()

  I.login('app=io.ox/mail', { user: users[2] })
  I.waitForText('Hail Eris! All Hail Discordia!', 5)
  I.logout()

  I.login('app=io.ox/mail', { user: users[3] })
  I.waitForText('Hail Eris! All Hail Discordia!', 5)
})
