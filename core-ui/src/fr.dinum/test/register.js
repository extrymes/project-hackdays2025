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

import ext from "$/io.ox/core/extensions";
import api from "@/io.ox/mail/api";
import "./security-bar.css";

// Register the extension point for mail detail body
ext.point("io.ox/mail/detail/body").extend({
  id: "secBar",
  index: 1,
  async draw() {
    // Create the container for the security bar
    const securityBar = createSecBarContainer();
    this.append(securityBar);
    extendSelectText();

    // def cid
    const mailItem = document.querySelector(
      ".list-item.mail-item.mail-detail.f6-target.focusable.expanded"
    );
    const cid = mailItem ? mailItem.dataset.cid : null;
    console.log("secBar draw", cid);
    const pool = api.pool.get("detail");
    const model = pool.get(cid);

    let data = null;

    try {
      const response = await fetch("http://localhost:8000/transform_email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(model.attributes),
      });
      data = await response.json();
      console.log("POST response:", data);
    } catch (error) {
      console.error("POST error:", error);
      const errorDiv = document.createElement("div");
      errorDiv.textContent = "An error occurred";
      errorDiv.classList.add("error-message");
      this.append(errorDiv);
    }

    buildSecBar(data);
  },
});

function createSecBarContainer() {
  const container = document.createElement("div");
  container.classList.add("security-bar");
  container.id = "secBar";
  container.textContent = "SECURITY ANALYSIS: LOADING...";
  return container;
}

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
 * @returns {HTMLElement} Progress bar element
 */
function createProgressBar(score, securityLevel) {
  const progressContainer = document.createElement("div");
  progressContainer.classList.add("progress-container", securityLevel);

  const progressDot = document.createElement("div");
  progressDot.classList.add("progress-dot");
  progressDot.style.left = `${Math.max(0, Math.min(100, score))}%`;

  progressContainer.appendChild(progressDot);
  return progressContainer;
}

/**
 * Creates a dropdown component
 * @param {string} triggerText - Text for the dropdown trigger
 * @param {Array} items - Array of items to display in dropdown
 * @param {string} itemClass - CSS class for dropdown items
 * @returns {HTMLElement} Dropdown container element
 */
function createDropdown(triggerText, items, itemClass, securityLevel) {
  const container = document.createElement("div");
  container.classList.add("dropdown-container");

  const trigger = document.createElement("button");
  trigger.classList.add("dropdown-trigger", securityLevel);
  trigger.innerHTML = `${triggerText} <span class="arrow">▼</span>`;

  const content = document.createElement("div");
  content.classList.add("dropdown-content");

  items.forEach((item) => {
    const itemElement = document.createElement("div");
    itemElement.classList.add("dropdown-item", itemClass);
    itemElement.textContent = item;
    content.appendChild(itemElement);
  });

  // Toggle dropdown on trigger click - handles dropdown interaction
  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    const isActive = trigger.classList.contains("active");

    // Close all other dropdowns
    document.querySelectorAll(".dropdown-trigger").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelectorAll(".dropdown-content").forEach((dropdown) => {
      dropdown.classList.remove("show");
    });

    if (!isActive) {
      trigger.classList.add("active");
      content.classList.add("show");
    }
  });

  container.appendChild(trigger);
  container.appendChild(content);
  return container;
}

/**
 * Creates the warnings dropdown if warnings exist
 * @param {Array} warnings - Array of warning messages
 * @returns {HTMLElement|null} Warnings dropdown element or null if no warnings
 */
function createWarningsDropdown(warnings, securityLevel) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  const warningText = document.createElement("span");
  warningText.classList.add("dropdown-text");
  warningText.textContent = `Warning${warnings.length > 1 ? "s" : ""}`;

  const warningCounter = document.createElement("span");
  warningCounter.classList.add("warning-count", securityLevel);
  warningCounter.textContent = warnings.length;

  const warningTrigger = document.createElement("span");
  warningTrigger.classList.add("warning-dropdown-text", securityLevel);
  warningTrigger.appendChild(warningCounter);
  warningTrigger.appendChild(warningText);

  return createDropdown(
    warningTrigger.outerHTML,
    warnings,
    "warning",
    securityLevel
  );
}

/**
 * Creates the recommendations dropdown
 * @param {string|Array} recommendations - Recommendation message(s)
 * @returns {HTMLElement} Recommendations dropdown element
 */
function createRecommendationsDropdown(recommendations, securityLevel) {
  const recText = document.createElement("span");
  recText.classList.add("dropdown-text");
  recText.textContent = "Quoi faire?";

  // Handle both string and array recommendations
  let items;
  if (typeof recommendations === "string") {
    items = recommendations
      ? [recommendations]
      : ["Aucune recommandation disponible"];
  } else {
    items =
      recommendations && recommendations.length > 0
        ? recommendations
        : ["Aucune recommandation disponible"];
  }

  return createDropdown(
    recText.outerHTML,
    items,
    "recommendation",
    securityLevel
  );
}

function extendSelectText() {
  const selectText = document.querySelector(".user-select-text");
  selectText.classList.add("select-text");
}

/**
 * Builds the complete security bar component
 * @param {object} resp - Response object containing message with score, warnings, and recommendations
 * @returns {HTMLElement} Complete security bar element
 */
function buildSecBar(resp) {
  // Access data from resp.message instead of directly from resp
  const { score, warnings, recommendations } = resp.message || {};
  const securityLevel = getSecurityLevel(score);

  // Create main container
  const secBar = document.getElementById("secBar");
  secBar.textContent = "";
  secBar.classList.add(securityLevel.class);

  // Create index container
  const indexContainer = document.createElement("div");
  indexContainer.classList.add("index-container", securityLevel.class);

  // Security level text
  const levelText = document.createElement("span");
  levelText.classList.add("security-level", securityLevel.class);
  levelText.textContent = securityLevel.text;

  // Security level element
  const levelElement = document.createElement("span");
  levelElement.textContent = "Indice de sécurité: ";
  levelElement.appendChild(levelText);

  indexContainer.appendChild(levelElement);

  // Progress bar
  const progressBar = createProgressBar(score, securityLevel.class);

  // Warnings dropdown (only if warnings exist)
  const warningsDropdown = createWarningsDropdown(
    warnings,
    securityLevel.class
  );

  // Recommendations dropdown
  const recommendationsDropdown = createRecommendationsDropdown(
    recommendations,
    securityLevel.class
  );

  // Append all elements
  secBar.appendChild(indexContainer);
  secBar.appendChild(progressBar);

  if (warningsDropdown) {
    secBar.appendChild(warningsDropdown);
  }

  secBar.appendChild(recommendationsDropdown);

  // Close dropdowns when clicking outside - handles global click event for dropdown management
  document.addEventListener("click", function () {
    document.querySelectorAll(".dropdown-trigger").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelectorAll(".dropdown-content").forEach((dropdown) => {
      dropdown.classList.remove("show");
    });
  });

  return secBar;
}
