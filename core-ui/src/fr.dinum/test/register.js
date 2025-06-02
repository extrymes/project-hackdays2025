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
import "./security-bar.css";

// Register the extension point for mail detail body
ext.point("io.ox/mail/detail/body").extend({
  id: "secBar",
  index: 1,
  draw() {
    const securityBar = buildSecBar(resp);
    this.append(securityBar);
  },
});

const resp = {
  score: 10,
  warnings: [
    "Suspicious sender address (am4zon-verify.com instead of amazon.com)",
    "Urgency and threatening language ('URGENT', 'temporarily suspended', 'permanently deactivated')",
    "Request for sensitive information (full name, credit card information, billing address, date of birth)",
    "Suspicious link (am4zon-verify.com instead of amazon.com)",
    "Impersonation attempt of Amazon",
    "Lookalike domain in logo image URL (https://am4zon-verify.com/logo.png)",
  ],
  recommendations: [
    "Do not click any links or provide any information.",
    "Delete the email and report it as phishing to your email provider.",
  ],
};

/**
 * Determines the security level text based on score
 * @param {number} score - Security score (0-100)
 * @returns {object} Object with level text and CSS class
 */
function getSecurityLevel(score) {
  if (score > 85) {
    return { text: "élevé", class: "eleve" };
  } else if (score < 40) {
    return { text: "critique", class: "critique" };
  } else {
    return { text: "modéré", class: "modere" };
  }
}

/**
 * Creates the gradient progress bar with positioned dot
 * @param {number} score - Security score (0-100)
 * @returns {jQuery} Progress bar element
 */
function createProgressBar(score) {
  const progressContainer = $("<div>").addClass("progress-container");
  const progressDot = $("<div>")
    .addClass("progress-dot")
    .css("left", `${Math.max(0, Math.min(100, score))}%`);

  return progressContainer.append(progressDot);
}

/**
 * Creates a dropdown component
 * @param {string} triggerText - Text for the dropdown trigger
 * @param {Array} items - Array of items to display in dropdown
 * @param {string} itemClass - CSS class for dropdown items
 * @returns {jQuery} Dropdown container element
 */
function createDropdown(triggerText, items, itemClass) {
  const container = $("<div>").addClass("dropdown-container");
  const trigger = $("<button>")
    .addClass("dropdown-trigger")
    .html(`${triggerText} <span class="arrow">▼</span>`);

  const content = $("<div>").addClass("dropdown-content");

  items.forEach((item) => {
    const itemElement = $("<div>")
      .addClass(`dropdown-item ${itemClass}`)
      .text(item);
    content.append(itemElement);
  });

  // Toggle dropdown on trigger click
  trigger.on("click", function (e) {
    e.stopPropagation();
    const isActive = trigger.hasClass("active");

    // Close all other dropdowns
    $(".dropdown-trigger").removeClass("active");
    $(".dropdown-content").removeClass("show");

    if (!isActive) {
      trigger.addClass("active");
      content.addClass("show");
    }
  });

  return container.append(trigger, content);
}

/**
 * Creates the warnings dropdown if warnings exist
 * @param {Array} warnings - Array of warning messages
 * @returns {jQuery|null} Warnings dropdown element or null if no warnings
 */
function createWarningsDropdown(warnings) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  const warningText = $("<span>")
    .addClass("dropdown-text")
    .text(`Warning${warnings.length > 1 ? "s" : ""}`);
  const warningCounter = $("<span>")
    .addClass("warning-count")
    .text(warnings.length);
  const warningTrigger = $("<span>")
    .addClass("warning-dropdown-text")
    .append(warningCounter)
    .append(warningText);

  return createDropdown(warningTrigger.prop("outerHTML"), warnings, "warning");
}

/**
 * Creates the recommendations dropdown
 * @param {Array} recommendations - Array of recommendation messages
 * @returns {jQuery} Recommendations dropdown element
 */
function createRecommendationsDropdown(recommendations) {
  const recText = $("<span>")
    .addClass("dropdown-text")
    .text("Quoi faire?")
    .prop("outerHTML");
  const items =
    recommendations && recommendations.length > 0
      ? recommendations
      : ["Aucune recommandation disponible"];

  return createDropdown(recText, items, "recommendation");
}

/**
 * Builds the complete security bar component
 * @param {object} resp - Response object containing score, warnings, and recommendations
 * @returns {jQuery} Complete security bar element
 */
function buildSecBar(resp) {
  const { score, warnings, recommendations } = resp;
  const securityLevel = getSecurityLevel(score);

  // Create main container
  const secBar = $("<div>").addClass("security-bar");

  // Create index container
  const indexContainer = $("<div>").addClass("index-container");

  // Security level text
  const levelText = $("<span>")
    .addClass(`security-level ${securityLevel.class}`)
    .text(`${securityLevel.text}`);

  // Security level element
  const levelElement = $("<span>").text("Indice de sécurité: ").add(levelText);

  indexContainer.append(levelElement);

  // Progress bar
  const progressBar = createProgressBar(score);

  // Warnings dropdown (only if warnings exist)
  const warningsDropdown = createWarningsDropdown(warnings);

  // Recommendations dropdown
  const recommendationsDropdown =
    createRecommendationsDropdown(recommendations);

  // Append all elements
  secBar.append(indexContainer, progressBar);

  if (warningsDropdown) {
    secBar.append(warningsDropdown);
  }

  secBar.append(recommendationsDropdown);

  // Close dropdowns when clicking outside
  $(document).on("click", function () {
    $(".dropdown-trigger").removeClass("active");
    $(".dropdown-content").removeClass("show");
  });

  return secBar;
}
