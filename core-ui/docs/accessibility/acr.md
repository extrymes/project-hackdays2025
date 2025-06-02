---
title: Accessibility Conformance Report
---
# Accessibility Conformance Report

Based on VPAT® 2.4 WCAG 2.1, Revised Section 508 and EN 301 549 Edition

## Name of Product/Version
Open-Xchange App Suite UI 8.15.0

## Report Dates and Version
- Report Date: 2023-07-27
- Last Modified Date: 2023-07-27
- Version: open-xchange app suite ui-8.15.0

## Product Description
OX App Suite is an easy-to-use email, communication, and collaboration platform, and provides access to a wide range of white-labeled applications.

## Contact Information
### Author Information



- Email: info@open-xchange.com


### Vendor Information

- Company: Open-Xchange AG

- Email: info@open-xchange.com



## Notes
This report describes the core components of App Suite&#x27;s web user interface: Login, Mail, Portal, Address Book, Chat, Calendar, Tasks, Drive and Settings. Documents and any user content (e.g. HTML mails) is not covered by this report, as we cannot modify user content. App Suite is available as a wide-label application, and supports customer customizations and plugins that can alter appearance, content and functionality; these customizations and plugins are not covered by this document. App Suite supports a range of end-user configurable themes and accent colors, however, this document only covers the default theme and accent color, unless stated otherwise. We use the term &#x27;App Suite UI&#x27; to describe the parts of App Suite that are covered by this report, with the aforementioned exceptions.

## Evaluation Methods
Use of automated tools like WAVE and Accessibility Insights. Manual keyboard only testing. Some testing with JAWS, NVDA and VoiceOver.

## Applicable Standards/Guidelines
This report covers the degree of conformance for the following accessibility standard/guidelines:

| Standard/Guideline | Included In Report |
| --- | --- |
| [Web Content Accessibility Guidelines 2.1](https://www.w3.org/TR/WCAG21/) | <ul><li>Table 1: Success Criteria, Level A</li><li>Table 2: Success Criteria, Level AA</li><li>Table 3: Success Criteria, Level AAA</li></ul> |
| [Revised Section 508 standards published January 18, 2017 and corrected January 22, 2018](https://www.access-board.gov/ict/) | <ul><li>Chapter 3: Functional Performance Criteria (FPC)</li><li>Chapter 4: Hardware</li><li>Chapter 5: Software</li><li>Chapter 6: Support Documentation and Services</li></ul> |
| [EN 301 549 V3.2.1 (2021-03) HARMONISED EUROPEAN STANDARD Accessibility requirements for ICT products and services](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility) | <ul><li>Chapter 4: Functional performance</li><li>Chapter 5: Generic Requirements</li><li>Chapter 6: ITC with Two-Way Voice Communication</li><li>Chapter 7: ICT with Video Capabilities</li><li>Chapter 8: Hardware</li><li>Chapter 9: Web</li><li>Chapter 10: Non-web Documents</li><li>Chapter 11: Software</li><li>Chapter 12: Documentation and Support Services</li><li>Chapter 13: ICT Providing Relay or Emergency Service Access</li></ul> |

## Terms
The terms used in the Conformance Level information are defined as follows:
- **Supports**: The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation.
- **Partially Supports**: Some functionality of the product does not meet the criterion.
- **Does Not Support**: The majority of product functionality does not meet the criterion.
- **Not Applicable**: The criterion is not relevant to the product.
- **Not Evaluated**: The product has not been evaluated against the criterion. This can be used only in WCAG 2.x Level AAA.

## WCAG 2.1 Report

### Table 1: Success Criteria, Level A


Conformance to the 30 criteria listed below is distributed as follows:

- 21 supported
- 3 partially supported
- 1 not supported
- 5 not applicable

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| [1.1.1 Non-text Content](https://www.w3.org/TR/WCAG21/#non-text-content) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: All non-text controls have a label that describe their purpose. App Suite does not contain time-base media, tests, sensory content, or captchas. Decorative non-text content is implemented so that it can be ignored by assistive technology.</li> </ul> |
| [1.2.1 Audio-only and Video-only (Prerecorded)](https://www.w3.org/TR/WCAG21/#audio-only-and-video-only-prerecorded) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain audio or video content, outside of user content (e.g. media embedded in HTML mails, or mail-attached media).</li> </ul> |
| [1.2.2 Captions (Prerecorded)](https://www.w3.org/TR/WCAG21/#captions-prerecorded) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain audio or video content, outside of user content (e.g. media embedded in HTML mails, or mail-attached media).</li> </ul> |
| [1.2.3 Audio Description or Media Alternative (Prerecorded)](https://www.w3.org/TR/WCAG21/#audio-description-or-media-alternative-prerecorded) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain audio or video content, outside of user content (e.g. media embedded in HTML mails, or mail-attached media)</li> </ul> |
| [1.3.1 Info and Relationships](https://www.w3.org/TR/WCAG21/#info-and-relationships) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: Information, structure and relationships conveyed through presentation can be programmatically determined or are available in text. However, understanding and operating calendar in week or day view might be challenging for non-sighted users.</li> </ul> |
| [1.3.2 Meaningful Sequence](https://www.w3.org/TR/WCAG21/#meaningful-sequence) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Content in App Suite UI is in a meaningful sequence.</li> </ul> |
| [1.3.3 Sensory Characteristics](https://www.w3.org/TR/WCAG21/#sensory-characteristics) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Instructions to understand and operate App Suite UI content does not contain rely on sensory characteristics such as shape, color, size, visual location, orientation, or sound.</li> </ul> |
| [1.4.1 Use of Color](https://www.w3.org/TR/WCAG21/#use-of-color) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: App Suite UI generally does not use color as the only visual means of conveying information; however, calendar appointments can be user-configured to a specific color without additional non-color based differentiation.</li> </ul> |
| [1.4.2 Audio Control](https://www.w3.org/TR/WCAG21/#audio-control) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain audio that plays longer than 3 seconds. </li> </ul> |
| [2.1.1 Keyboard](https://www.w3.org/TR/WCAG21/#keyboard) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: All functionality of App Suite UI is operable through a keyboard interface.</li> </ul> |
| [2.1.2 No Keyboard Trap](https://www.w3.org/TR/WCAG21/#no-keyboard-trap) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suites UI only traps the keyboard for modal dialogs that have clear methods of returning to the main content, eg. the escape key and dismiss/accept buttons.</li> </ul> |
| [2.1.4 Character Key Shortcuts](https://www.w3.org/TR/WCAG21/#character-key-shortcuts) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: App Suite UI contains at least one one-character shortcut and has no method to disable or reconfigure shortcuts.</li> </ul> |
| [2.2.1 Timing Adjustable](https://www.w3.org/TR/WCAG21/#timing-adjustable) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not contain time-based limit, except for an optional, user-configurable, session timeout.</li> </ul> |
| [2.2.2 Pause, Stop, Hide](https://www.w3.org/TR/WCAG21/#pause-stop-hide) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not contain elements that automatically move, blink, or scroll. Notifications and email list views do however auto-update, which is essential for the proper and expected function of App Suite.</li> </ul> |
| [2.3.1 Three Flashes or Below Threshold](https://www.w3.org/TR/WCAG21/#three-flashes-or-below-threshold) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not contain flashing elements.</li> </ul> |
| [2.4.1 Bypass Blocks](https://www.w3.org/TR/WCAG21/#bypass-blocks) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI contains both skip links and landmarks to assist in keyboard navigation.</li> </ul> |
| [2.4.2 Page Titled](https://www.w3.org/TR/WCAG21/#page-titled) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI provides descriptive page titles.</li> </ul> |
| [2.4.3 Focus Order](https://www.w3.org/TR/WCAG21/#focus-order) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI manages focus or tab order of elements in a consistent, logical order. Focus is trapped in dialogs and modals, and should return to the element that opened the dialog or modal, when appropriate.</li> </ul> |
| [2.4.4 Link Purpose (In Context)](https://www.w3.org/TR/WCAG21/#link-purpose-in-context) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Links are labeled and meaningful.</li> </ul> |
| [2.5.1 Pointer Gestures](https://www.w3.org/TR/WCAG21/#pointer-gestures) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not contain functionality that relies solely on multipoint or path-based gestures.</li> </ul> |
| [2.5.2 Pointer Cancellation](https://www.w3.org/TR/WCAG21/#pointer-cancellation) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: All drag-and-drop actions in App Suite UI can be aborted by returning the item to its initial position or moving outside the target area.</li> </ul> |
| [2.5.3 Label in Name](https://www.w3.org/TR/WCAG21/#label-in-name) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: User interface components that include text will mostly start with the same accessible name as the label, except in rare cases where more context is provided to the accessible label.</li> </ul> |
| [2.5.4 Motion Actuation](https://www.w3.org/TR/WCAG21/#motion-actuation) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain functions triggered by motion.</li> </ul> |
| [3.1.1 Language of Page](https://www.w3.org/TR/WCAG21/#language-of-page) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI sets the (user configurable) page language as an attribute on the HTML element.</li> </ul> |
| [3.2.1 On Focus](https://www.w3.org/TR/WCAG21/#on-focus) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not contain elements that change context on focus.</li> </ul> |
| [3.2.2 On Input](https://www.w3.org/TR/WCAG21/#on-input) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not contain elements that change context on input.</li> </ul> |
| [3.3.1 Error Identification](https://www.w3.org/TR/WCAG21/#error-identification) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Form errors mostly identified; however, sometimes errors are indicated with alerts, or not at all. Additionally, not all errors are explicitly associated with the respective fields or are not phrased explicit enough.</li> </ul> |
| [3.3.2 Labels or Instructions](https://www.w3.org/TR/WCAG21/#labels-or-instructions) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: All form controls in App Suite UI are labeled, and contain additional instructions for screen reader users where appropriate. However, required form field might not always be labeled sufficiently.</li> </ul> |
| [4.1.1 Parsing](https://www.w3.org/TR/WCAG21/#parsing) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI might contain elements that are not nested according to their specification.</li> </ul> |
| [4.1.2 Name, Role, Value](https://www.w3.org/TR/WCAG21/#name-role-value) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: All form controls are labeled, either with an explicit label element or an aria-label property, where appropriate.</li> </ul> |


### Table 2: Success Criteria, Level AA


Conformance to the 20 criteria listed below is distributed as follows:

- 13 supported
- 1 partially supported
- 4 not supported
- 2 not applicable

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| [1.2.4 Captions (Live)](https://www.w3.org/TR/WCAG21/#captions-live) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain media to be captioned.</li> </ul> |
| [1.2.5 Audio Description (Prerecorded)](https://www.w3.org/TR/WCAG21/#audio-description-prerecorded) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain Audio.</li> </ul> |
| [1.3.4 Orientation](https://www.w3.org/TR/WCAG21/#orientation) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not restrict to a particular display orientation.</li> </ul> |
| [1.3.5 Identify Input Purpose](https://www.w3.org/TR/WCAG21/#identify-input-purpose) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: App Suite UI does not contain Audio.</li> </ul> |
| [1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG21/#visual-audio-contrast-contrast) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Elements in App Suite UI have sufficient color contrast in both the default and dark theme.</li> </ul> |
| [1.4.4 Resize text](https://www.w3.org/TR/WCAG21/#visual-audio-contrast-scale) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI scales up to 200% without loss of functionality or information, both full as well as text-only zoom.</li> </ul> |
| [1.4.5 Images of Text](https://www.w3.org/TR/WCAG21/#visual-audio-contrast-text-presentation) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not use images of text.</li> </ul> |
| [1.4.10 Reflow](https://www.w3.org/TR/WCAG21/#reflow) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: App Suite UI cannot reflow to 320 by 256px.</li> </ul> |
| [1.4.11 Non-text Contrast](https://www.w3.org/TR/WCAG21/#non-text-contrast) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: User Interface Components and Graphical Objects have a contrast of at least 3:1 in the default theme.</li> </ul> |
| [1.4.12 Text Spacing](https://www.w3.org/TR/WCAG21/#text-spacing) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: Setting line height to 1.5 times the font size can lead to loss of content or functionality.</li> </ul> |
| [1.4.13 Content on Hover or Focus](https://www.w3.org/TR/WCAG21/#content-on-hover-or-focus) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Content that is only visible on hover or focus does not obscure or replace other content, is hoverable, and is persistent.</li> </ul> |
| [2.4.5 Multiple Ways](https://www.w3.org/TR/WCAG21/#multiple-ways) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: There are multiple ways to locate content in App Suite UI. </li> </ul> |
| [2.4.6 Headings and Labels](https://www.w3.org/TR/WCAG21/#headings-and-labels) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI uses descriptive Headings and Labels.</li> </ul> |
| [2.4.7 Focus Visible](https://www.w3.org/TR/WCAG21/#focus-visible) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Elements in App Suite UI have a visible keyboard focus indicator.</li> </ul> |
| [3.1.2 Language of Parts](https://www.w3.org/TR/WCAG21/#language-of-parts) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: User content in App Suite UI can contain any human language, which cannot be programmatically determine.</li> </ul> |
| [3.2.3 Consistent Navigation](https://www.w3.org/TR/WCAG21/#consistent-navigation) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Navigation mechanisms in App Suite UI are consistent throughout the application.</li> </ul> |
| [3.2.4 Consistent Identification](https://www.w3.org/TR/WCAG21/#consistent-identification) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Components that have the same functionality are identified consistently in App Suite UI.</li> </ul> |
| [3.3.3 Error Suggestion](https://www.w3.org/TR/WCAG21/#error-suggestion) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: App Suite UI automatically detect input errors and suggests corrections where feasible; however, not all suggestions are phrased clearly, and some autocomplete helpers might be inaccessible to some users.</li> </ul> |
| [3.3.4 Error Prevention (Legal, Financial, Data)](https://www.w3.org/TR/WCAG21/#error-prevention-legal-financial-data) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Since App Suite UI includes Email and Chat functionality it is entirely feasible to cause legal commitments outside the control of App Suite. Due to the technical limitations of email, these actions cannot be reversed, checked, nor confirmed through App Suite UI. However, sending emails can be undone in a user-configurable time interval.</li> </ul> |
| [4.1.3 Status Messages](https://www.w3.org/TR/WCAG21/#status-messages) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI implements accessible status messages which can be presented by assistive technologies without receiving focus.</li> </ul> |


### Table 3: Success Criteria, Level AAA


Conformance to the 28 criteria listed below is distributed as follows:

- 10 supported
- 6 partially supported
- 7 not supported
- 5 not applicable

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| [1.2.6 Sign Language (Prerecorded)](https://www.w3.org/TR/WCAG21/#sign-language-prerecorded) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain prerecorded media.</li> </ul> |
| [1.2.7 Extended Audio Description (Prerecorded)](https://www.w3.org/TR/WCAG21/#extended-audio-description-prerecorded) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain prerecorded media.</li> </ul> |
| [1.2.8 Media Alternative (Prerecorded)](https://www.w3.org/TR/WCAG21/#media-alternative-prerecorded) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain prerecorded media.</li> </ul> |
| [1.2.9 Audio-only (Live)](https://www.w3.org/TR/WCAG21/#audio-only-live) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain live media.</li> </ul> |
| [1.3.6 Identify Purpose](https://www.w3.org/TR/WCAG21/#identify-purpose) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: In App Suite UI, the purpose of User Interface Components, icons and regions can be programmatically determined.</li> </ul> |
| [1.4.6 Contrast (Enhanced)](https://www.w3.org/TR/WCAG21/#contrast-enhanced) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: Most if not all text has an contrast ratio of 7:1 (or 4.5:1) in the default and dark theme.</li> </ul> |
| [1.4.7 Low or No Background Audio](https://www.w3.org/TR/WCAG21/#low-or-no-background-audio) | <ul><li>**Web**: Not Applicable</li> </ul> | <ul><li>**Web**: App Suite UI does not contain prerecorded audio.</li> </ul> |
| [1.4.8 Visual Presentation](https://www.w3.org/TR/WCAG21/#visual-presentation) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: While content can be resized up to 200 percent without horizontal scrolling, Text is not justified, the width might be more that 80 characters, and line spacing might be less than space-and-a-half. Also, while Theming is available, foreground and background colors cannot be freely selected by the user.</li> </ul> |
| [1.4.9 Images of Text (No Exception)](https://www.w3.org/TR/WCAG21/#images-of-text-no-exception) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI only uses Images of text for pure presentation, or where a particular presentation is essential.</li> </ul> |
| [2.1.3 Keyboard (No Exception)](https://www.w3.org/TR/WCAG21/#keyboard-no-exception) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: All functionality in App Suite is operable through a keyboard interface without requiring specific timings for individual keystrokes.</li> </ul> |
| [2.2.3 No Timing](https://www.w3.org/TR/WCAG21/#no-timing) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite does not use timing, except for a user configurable logout timer, that is not active by default.</li> </ul> |
| [2.2.4 Interruptions](https://www.w3.org/TR/WCAG21/#interruptions) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: Interruptions (Notifications) can be postponed and automatic display of notifications is user-configurable. However, some content (eg. lists of new emails) will auto-update.</li> </ul> |
| [2.2.5 Re-authenticating](https://www.w3.org/TR/WCAG21/#re-authenticating) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: When users are automatically logged out, some data is preserved (eg. Mails are saved as Drafts) while other data is lost (unsaved appointments are lost).</li> </ul> |
| [2.2.6 Timeouts](https://www.w3.org/TR/WCAG21/#timeouts) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: Automatic log-out is user configurable, and most data is auto-saved. However, users are not additionally warned.</li> </ul> |
| [2.3.2 Three Flashes](https://www.w3.org/TR/WCAG21/#three-flashes) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not flash.</li> </ul> |
| [2.3.3 Animation from Interactions](https://www.w3.org/TR/WCAG21/#animation-from-interactions) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Motion animations in App Suite UI are disabled or reduced for users that prefer reduced motion.</li> </ul> |
| [2.4.8 Location](https://www.w3.org/TR/WCAG21/#location) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: App Suite UI does not provide any mechanism that resembles a breadcrumb trail.</li> </ul> |
| [2.4.9 Link Purpose (Link Only)](https://www.w3.org/TR/WCAG21/#link-purpose-link-only) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: The purpose of links in App Suite is identified from link text alone.</li> </ul> |
| [2.4.10 Section Headings](https://www.w3.org/TR/WCAG21/#section-headings) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: Section headings are used to organize the content.</li> </ul> |
| [2.5.5 Target Size](https://www.w3.org/TR/WCAG21/#target-size) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: Some targets are smaller than 44 by 44 CSS pixels.</li> </ul> |
| [2.5.6 Concurrent Input Mechanisms](https://www.w3.org/TR/WCAG21/#concurrent-input-mechanisms) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not restrict the input method.</li> </ul> |
| [3.1.3 Unusual Words](https://www.w3.org/TR/WCAG21/#unusual-words) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: App Suite UI does not provide a mechanism to identify specific definitions of words or phrases.</li> </ul> |
| [3.1.4 Abbreviations](https://www.w3.org/TR/WCAG21/#abbreviations) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: App Suite UI does not provide a mechanism to link to definitions of abbreviations, nor does it provide a glossary.</li> </ul> |
| [3.1.5 Reading Level](https://www.w3.org/TR/WCAG21/#reading-level) | <ul><li>**Web**: Supports</li> </ul> | <ul><li>**Web**: App Suite UI should not require a reading ability more advanced then the lower secondary education level. This excludes user-content, which may require any reading level.</li> </ul> |
| [3.1.6 Pronunciation](https://www.w3.org/TR/WCAG21/#pronunciation) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: App Suite UI does not provide a mechanism to identify pronunciation.</li> </ul> |
| [3.2.5 Change on Request](https://www.w3.org/TR/WCAG21/#change-on-request) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: App Suite UI does not change context without user request; however, some elements, such as email lists, may auto-update without a method of deactivating this behavior.</li> </ul> |
| [3.3.5 Help](https://www.w3.org/TR/WCAG21/#help) | <ul><li>**Web**: Does Not Support</li> </ul> | <ul><li>**Web**: While App Suite provides a comprehensive help system, form-level help is currently not available.</li> </ul> |
| [3.3.6 Error Prevention (All)](https://www.w3.org/TR/WCAG21/#error-prevention-all) | <ul><li>**Web**: Partially Supports</li> </ul> | <ul><li>**Web**: In App Suite UI, some actions a reversible, such as setting an appointment in calendar, while other actions, such as sending an email, are irreversible by nature. App Suite UI tries to check input data as far as possible, and requests user confirmation where appropriate.</li> </ul> |

## Revised Section 508 Report

### Chapter 3: Functional Performance Criteria (FPC)


Conformance to the 9 criteria listed below is distributed as follows:

- 8 supported
- 1 partially supported
- 0 not supported
- 0 not applicable

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| [302.1 Without Vision](https://www.access-board.gov/ict/#302.1) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI can be operated without vision with assistive technologies.</li> </ul> |
| [302.2 With Limited Vision](https://www.access-board.gov/ict/#302.2) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI can scale up to 200% both </li> </ul> |
| [302.3 Without Perception of Color](https://www.access-board.gov/ict/#302.3) | <ul><li>Partially Supports</li> </ul> | <ul><li>App Suite can be operated without perception of color, as color is not used alone to indicate selection or focus. However, links are identified by color alone. Also, Calendars are identified by color alone, but the colors are configurable.</li> </ul> |
| [302.4 Without Hearing](https://www.access-board.gov/ict/#302.4) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI does not use sound.</li> </ul> |
| [302.5 With Limited Hearing](https://www.access-board.gov/ict/#302.5) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI does not use sound.</li> </ul> |
| [302.6 Without Speech](https://www.access-board.gov/ict/#302.6) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI does not use vocal input.</li> </ul> |
| [302.7 With Limited Manipulation](https://www.access-board.gov/ict/#302.7) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI can be operated with limited manipulation by using a keyboard interface</li> </ul> |
| [302.8 With Limited Reach and Strength](https://www.access-board.gov/ict/#302.8) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI is operable with limited reach and strength.</li> </ul> |
| [302.9 With Limited Language, Cognitive, and Learning Abilities](https://www.access-board.gov/ict/#302.9) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI uses text descriptions and icons where appropriate and uses the clearest, simplest language available.</li> </ul> |


### Chapter 4: Hardware

Notes: not-applicable


### Chapter 5: Software

Notes: App Suite UI does not have access to platform accessibility services and does not include components that have access to platform accessibility services and conforms to WCAG Level A and WCAG Level AA. App Suite UI is therefore exempt from conforming to 502 or 503. Since App Suite UI is not an authoring tool, 504 is not applicable.


### Chapter 6: Support Documentation and Services


Conformance to the 5 criteria listed below is distributed as follows:

- 2 supported
- 0 partially supported
- 0 not supported
- 3 not applicable

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| [602.2 Accessibility and Compatibility Features](https://www.access-board.gov/ict/#602.2) | <ul><li>Not Applicable</li> </ul> | <ul><li>Both Chapters 4 and 5 are not-applicable</li> </ul> |
| [602.3 Electronic Support Documentation](https://www.access-board.gov/ict/#602.3) | <ul><li>Supports</li> </ul> | <ul><li>See WCAG 2.x section</li> </ul> |
| [602.4 Alternate Formats for Non-Electronic Support Documentation](https://www.access-board.gov/ict/#602.4) | <ul><li>Not Applicable</li> </ul> | <ul><li>Documentation is only available in electronic format.</li> </ul> |
| [603.2 Information on Accessibility and Compatibility Features](https://www.access-board.gov/ict/#603.2) | <ul><li>Not Applicable</li> </ul> | <ul><li>See 602.2</li> </ul> |
| [603.3 Accommodation of Communication Needs](https://www.access-board.gov/ict/#603.3) | <ul><li>Supports</li> </ul> | <ul><li>Support is available via web and email.</li> </ul> |

## EN 301 549 V3.2.1 (2021-03)

### Chapter 4: Functional performance


Conformance to the 11 criteria listed below is distributed as follows:

- 11 supported
- 0 partially supported
- 0 not supported
- 0 not applicable

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| [4.2.1 Usage without vision](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#usage-without-vision) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI is fully usable without vision through text-to-speech assistive technology and keyboard interfaces.</li> </ul> |
| [4.2.2 Usage with limited vision](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#usage-with-limited-vision) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI can scale at least 200% both full and text-only zoom to help users with limited vision.</li> </ul> |
| [4.2.3 Usage without perception of colour](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#usage-without-perception-of-colour) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI does not rely on color alone or colors are user-configurable.</li> </ul> |
| [4.2.4 Usage without hearing](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#usage-without-hearing) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI does not rely on hearing.</li> </ul> |
| [4.2.5 Usage with limited hearing](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#usage-with-limited-hearing) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI does not rely on hearing.</li> </ul> |
| [4.2.6 Usage with no or limited vocal capability](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#usage-with-no-or-limited-vocal-capability) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI does not rely on vocal capability.</li> </ul> |
| [4.2.7 Usage with limited manipulation or strength](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#usage-with-limited-manipulation-or-strength) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI is operable with limited manipulation or strength through touch, pointer or keyboard interfaces.</li> </ul> |
| [4.2.8 Usage with limited reach](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#usage-with-limited-reach) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI is operable with limited reach through touch, pointer or keyboard interfaces.</li> </ul> |
| [4.2.9 Minimize photosensitive seizure triggers](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#minimize-photosensitive-seizure-triggers) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI does not flash or contain elements that are likely to trigger photosensitive seizures.</li> </ul> |
| [4.2.10 Usage with limited cognition, language or learning](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#usage-with-limited-cognition-language-or-learning) | <ul><li>Supports</li> </ul> | <ul><li>App Suite UI uses text descriptions and icons where appropriate and uses the clearest, simplest language available.</li> </ul> |
| [4.2.11 Privacy](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#privacy) | <ul><li>Supports</li> </ul> | <ul><li>Features provided for accessibility do not compromise privacy.</li> </ul> |


### Chapter 5: Generic Requirements


Conformance to the 9 criteria listed below is distributed as follows:

- 2 supported
- 0 partially supported
- 0 not supported
- 7 not applicable

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| [5.1 Closed functionality](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#closed-functionality) | <ul><li>Not Applicable</li> </ul> | <ul><li>5.1.2.2-5.1.6.2 are not applicable for this App Suite UI.</li> </ul> |
| [5.2 Activation of accessibility features](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#activation-of-accessibility-features) | <ul><li>Supports</li> </ul> | <ul><li>All accessibility features in App Suite UI are activated by default and do not need to be activated.</li> </ul> |
| [5.3 Biometrics](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#biometrics) | <ul><li>Not Applicable</li> </ul> | <ul><li>App Suite UI does not use biological characteristics.</li> </ul> |
| [5.4 Preservation of accessibility information during conversion](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#preservation-of-accessibility-information-during-conversion) | <ul><li>Supports</li> </ul> | <ul><li>Content created and processed in App Suite UI preserves information provided for accessibility.</li> </ul> |
| [5.5 Operable parts](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#operable-parts) | <ul><li>Not Applicable</li> </ul> | <ul><li>App Suite UI does not have operable parts.</li> </ul> |
| [5.6 Locking or toggle controls](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#locking-or-toggle-controls) | <ul><li>Not Applicable</li> </ul> | <ul><li>App Suite UI does not have locking or toggle controls.</li> </ul> |
| [5.7 Key repeat](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#key-repeat) | <ul><li>Not Applicable</li> </ul> | <ul><li>App Suite UI relies on platform software to supply key repeat functionality.</li> </ul> |
| [5.8 Double-strike key acceptance](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#double-strike-key-acceptance) | <ul><li>Not Applicable</li> </ul> | <ul><li>App Suite UI does not provide a keyboard or keypad.</li> </ul> |
| [5.9 Simultaneous user actions](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#simultaneous-user-actions) | <ul><li>Not Applicable</li> </ul> | <ul><li>App Suite UI does not require simultaneous user actions.</li> </ul> |


### Chapter 6: ITC with Two-Way Voice Communication

Notes: Not applicable.


### Chapter 7: ICT with Video Capabilities

Notes: Not applicable.


### Chapter 8: Hardware

Notes: Not applicable.


### Chapter 9: Web

Notes: see WCAG 2.x section


### Chapter 10: Non-web Documents

Notes: Not applicable.


### Chapter 11: Software

Notes: Not applicable.


### Chapter 12: Documentation and Support Services


Conformance to the 5 criteria listed below is distributed as follows:

- 2 supported
- 0 partially supported
- 1 not supported
- 0 not applicable

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| [12.1.1 Accessibility and compatibility features](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#accessibility-and-compatibility-features) | <ul><li>Does Not Support</li> </ul> | <ul><li>App Suite UI supports established accessibility features used by the users assistive technology and is therefor not further documented.</li> </ul> |
| [12.1.2 Accessible documentation](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#accessible-documentation) | <ul><li>Supports</li> </ul> | <ul><li>See information in WCAG 2.x section</li> </ul> |
| [12.2.2 Information on accessibility and compatibility features](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#information-on-accessibility-and-compatibility-features) | <ul><li>Not Evaluated</li> </ul> | <ul><li>Open-Xchange and its partners offer free or paid support that is able to offer information or support regarding accessibility and compatibility features.</li> </ul> |
| [12.2.3 Effective communication](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#effective-communication) | <ul><li>Not Evaluated</li> </ul> | <ul><li>Open-XChange and its partners offer free or paid support over multiple channels (mail, chat, phone)</li> </ul> |
| [12.2.4 Accessible documentation](https://www.etsi.org/human-factors-accessibility/en-301-549-v3-the-harmonized-european-standard-for-ict-accessibility#accessible-documentation) | <ul><li>Supports</li> </ul> | <ul><li>See information in WCAG 2.x section</li> </ul> |


### Chapter 13: ICT Providing Relay or Emergency Service Access

Notes: Not applicable.


## Legal Disclaimer (Open-Xchange AG)
The information herein is provided in good faith based on the analysis of the web application at the time of the review and does not represent a legally-binding claim. Please contact us to report any accessibility errors or conformance claim errors for re-evaluation and correction, if necessary.




## Copyright

[OpenACR](https://github.com/GSA/openacr) is a format maintained by the [GSA](https://gsa.gov/). The content is the responsibility of the author.

This content is licensed under a [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/legalcode).
