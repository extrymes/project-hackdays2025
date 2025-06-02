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

import $ from "$/jquery";
import ext from "$/io.ox/core/extensions";
import api from '@/io.ox/mail/api'

// Register the extension point for mail detail body
ext.point("io.ox/mail/detail/body").extend({
    id: "secBar",
    index: 50,
    async draw() {
        // def cid
        const cid = $('.list-item.mail-item.mail-detail.f6-target.focusable.expanded').data('cid');
        console.log('secBar draw', cid);
        const pool = api.pool.get('detail');
        const model = pool.get(cid);

        try {
            const response = await fetch('http://localhost:8000/transform_email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(model.attributes)
            });
            const data = await response.json();
            console.log('POST response:', data);
        } catch (error) {
            console.error('POST error:', error);
            this.append(errorDiv);
        }

        const button = createButton("ciao", () => {
            console.log("Button clicked");
        });
        this.append(button);
    },
});

/**
 * Creates a button element with specified text and click handler
 * @param {string} text - Button text content
 * @param {Function} onClick - Click event handler function
 * @returns {jQuery} Button element
 */
function createButton(text, onClick) {
  return $('<button class="security-button">').text(text).on("click", onClick);
}
