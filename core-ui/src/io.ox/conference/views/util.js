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

import moment from '@open-xchange/moment'

export function longerThanOneYear (rrule) {
  if (!rrule) return false
  // patterns to support
  // "FREQ=DAILY;COUNT=2"
  // "FREQ=WEEKLY;BYDAY=TH"
  // "FREQ=WEEKLY;BYDAY=TH;UNTIL=20200709T215959Z"
  // "FREQ=WEEKLY;BYDAY=TH;COUNT=2"
  // "FREQ=MONTHLY;BYMONTHDAY=2;COUNT=2"
  // "FREQ=YEARLY;BYMONTH=7;BYMONTHDAY=2;COUNT=2"
  const until = (rrule.match(/until=(\w+)/i) || [])[1]
  if (until) return moment(until).diff(moment(), 'days') >= 365
  const count = (rrule.match(/count=(\w+)/i) || [])[1]
  if (!count) return true
  if (/freq=daily/i.test(rrule) && count >= 365) return true
  if (/freq=weekly/i.test(rrule) && count >= 52) return true
  if (/freq=monthly/i.test(rrule) && count >= 12) return true
  if (/freq=yearly/i.test(rrule)) return true
  return false
}
