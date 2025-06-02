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

import gt from 'gettext'

const constants = {
  // Buttons
  LostButton: gt('I lost my device'),
  OKButton: gt('Next'),
  CancelButton: gt('Cancel'),
  AuthenticationTitle: gt('2-step verification'),
  ReAuthenticationTitle: gt('Reauthentication required for this action'),
  SelectDeviceTitle: gt('Select 2-step verification Method'),
  // MF Devices
  U2F: 'U2F',
  U2F_ICON: 'bi/cpu.svg',
  SMS: 'SMS',
  SMS_ICON: 'bi/phone.svg',
  TOTP: 'TOTP',
  TOTP_ICON: 'bi/key.svg',
  BACKUP: 'BACKUP_STRING',
  BACKUP_ICON: 'bi/file-text.svg',
  // others
  YUBIKEY_ICON: 'bi/person-badge.svg'
}

export default constants
