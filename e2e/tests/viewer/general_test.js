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

const { expect } = require('chai')
const assert = require('node:assert')

Feature('Viewer')

Before(async ({ users }) => {
  await users.create()
  await users[0].context.hasCapability('document_preview')
})

After(async ({ users }) => { await users.removeAll() })

// Viewer:        The viewer has different layers for the content (canvas, text-layer).
//                Just checking the existence of text via CodeceptJS has limited informative value.
//                You have to test how the these layer interact and also the layout for a real e2e test.
//
// Poositions:    All positions are in device coordinates. Add a pause() before the point you want
//                to update and messure inside the browser window.
//
// Clipboard:     Text copied from the PDF contains line breaks and similar symbols. Make sure to escape
//                text strings correctly when you want to update them.
Scenario('Check content and interactive elements of a pdf document', async function ({ I, drive, viewer }) {
  const folder = await I.grabDefaultFolder('infostore')
  await I.haveFile(folder, 'media/files/generic/text_document_viewer_test_v1.pdf')

  I.login('app=io.ox/files')
  I.waitForApp()

  drive.selectFile('text_document_viewer_test_v1.pdf')
  I.clickToolbar('~View')

  I.waitForElement('.io-ox-viewer')
  I.waitForText('START_PAGE_1', 5)
  I.waitForText('START_PAGE_2', 5)

  // 1) verify a 100% congruent text and canvas layer so that text selection and displayed content matches
  const textBoxPage1 = await I.grabElementBoundingRect('.document-page[data-page="1"] .text-wrapper')
  const canvasBoxPage1 = await I.grabElementBoundingRect('.document-page[data-page="1"] canvas')
  const textBoxPage2 = await I.grabElementBoundingRect('.document-page[data-page="2"] .text-wrapper')
  const canvasBoxPage2 = await I.grabElementBoundingRect('.document-page[data-page="2"] canvas')
  assert.deepEqual(textBoxPage1, canvasBoxPage1, 'Page1: canvas and text-wrapper must be congruent with each other')
  assert.deepEqual(textBoxPage2, canvasBoxPage2, 'Page2: canvas and text-wrapper must be congruent with each other')
  expect(textBoxPage1.height).to.be.equal(1123, 'The height of the pdf is different than expected. The viewer might show the pdf with a new zoom factor. In this case all following positions must probably be updated.')
  expect(textBoxPage1.width).to.be.equal(794, 'The width of the pdf is different than expected. The viewer might show the pdf with a new zoom factor. In this case all following positions must probably be updated.')

  // 2) verify positions of "page start markers" in device coordinates to check layout & to verify the correct text-layer position below the canvas
  expect(await viewer.grabScrollPosition()).to.be.equal(0, 'PDF should not be scrolled initially')
  // check the text at the given position in the text-layer
  expect(await viewer.grabTextAtPoint(225, 168)).to.be.equal('START_PAGE_1\n', 'Text is not at the expected viewport position. If the text appears to be correct, be aware that the log might not show non-printable characters like line breaks.')
  // scroll down by exactly the pdf page height
  viewer.scrollTo(0, textBoxPage1.height)
  // START_PAGE_2 must be at the same device coordinates as START_PAGE_1
  expect(await viewer.grabTextAtPoint(225, 168)).to.be.equal('START_PAGE_2\n', 'Text is not at the expected viewport position. If the text appears to be correct, be aware that the log might not show non-printable characters like line breaks.')

  // 3) verify pdf content via clipboard
  viewer.setBrowserSelection('START_PAGE_1\n', 'START_PAGE_2\n', '.text-wrapper')
  I.copyToClipboard()
  const clipboardContentReference = 'START_PAGE_1\nTable of contents\nHeadline1\t...............................................................................................................................\t1\nHeadline2\t............................................................................................................................\t1\nHeadline3\t........................................................................................................................\t1\nHeadline1_page_2\t.................................................................................................................\t2\nHeadline1\nHeadline2\nHeadline3\nThis is a normal text.\nThis text has a comment.\nexternal web link:\topen-xchange.com​\nSTART_PAGE_2\n'
  expect(await I.getClipboardContent()).to.be.equal(clipboardContentReference, 'Clipboard has not the expected content. If the text appears to be correct, be aware that the log might not show non-printable characters like line breaks.')

  // 4) verify working internal link, clicking the link should scroll to the correct position
  viewer.scrollTo(0, 0)
  // it's the position of "Headline1_page_2" in table of contents
  viewer.clickAtPosition(200, 334)
  expect(await viewer.grabScrollPosition()).to.be.equal(1143, 'Scroll position is not as expected after clicking the last entry "Headline1_page_2" in table of contents')

  // 5) verify comment layer
  I.scrollTo('.textAnnotation')
  I.moveCursorTo('.textAnnotation')
  I.waitForText('This_is_a_test_comment.')

  // 6) verify working external link
  I.click('a[title="https://open-xchange.com/"]')
  I.retry(5).switchToNextTab()
  I.waitInUrl('open-xchange.com', 5)
})

Scenario('Check viewer zoom', async function ({ I, drive, users }) {
  const folder = await I.grabDefaultFolder('infostore')
  await Promise.all([
    I.haveFile(folder, 'media/files/generic/pdf_document_1.pdf'),
    users[0].context.hasCapability('document_preview')
  ])
  I.login('app=io.ox/files')
  I.waitForApp()

  drive.selectFile('pdf_document_1.pdf')
  I.clickToolbar('~View')
  I.waitForElement('.io-ox-viewer .document-page')

  // initial zoom for the given test window size
  I.seeCssPropertiesOnElements('.document-page', { width: '794px' })
  I.seeCssPropertiesOnElements('.document-page', { height: '1123px' })

  I.click('~Zoom in')
  I.waitForText('125 %', 5)
  // needs retry because the browser needs a moment to scale
  I.retry(3).seeCssPropertiesOnElements('.document-page', { width: '993px' })
  I.retry(3).seeCssPropertiesOnElements('.document-page', { height: '1404px' })

  I.click('~Zoom in')
  I.waitForText('150 %', 5)
  I.retry(3).seeCssPropertiesOnElements('.document-page', { width: '1191px' })
  I.retry(3).seeCssPropertiesOnElements('.document-page', { height: '1684px' })

  I.click('~Zoom out')
  I.waitForText('125 %', 5)
  I.retry(3).seeCssPropertiesOnElements('.document-page', { width: '993px' })
  I.retry(3).seeCssPropertiesOnElements('.document-page', { height: '1404px' })

  I.click('~Zoom out')
  I.waitForText('100 %', 5)
  I.retry(3).seeCssPropertiesOnElements('.document-page', { width: '794px' })
  I.retry(3).seeCssPropertiesOnElements('.document-page', { height: '1123px' })

  I.click('~Zoom out')
  I.waitForText('75 %', 5)
  I.retry(3).seeCssPropertiesOnElements('.document-page', { width: '596px' })
  I.retry(3).seeCssPropertiesOnElements('.document-page', { height: '842px' })
})

Scenario('Check swiper carousel', async function ({ I, drive, users }) {
  const folder = await I.grabDefaultFolder('infostore')

  await Promise.all([
    I.haveFile(folder, 'media/files/generic/pdf_document_1.pdf'),
    I.haveFile(folder, 'media/files/generic/pdf_document_2.pdf'),
    I.haveFile(folder, 'media/files/generic/pdf_document_3.pdf'),
    users[0].context.hasCapability('document_preview')
  ])

  I.login('app=io.ox/files')
  I.waitForApp()

  // 1) select single file
  drive.selectFile('pdf_document_1.pdf')
  I.clickToolbar('~View')
  I.waitForText('pdf_document_1.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-1-608048216047687', 5, '.io-ox-viewer .swiper-slide-active')
  I.waitForText('1 of 3 items', 5)

  // test forward loop, test via keyboard and mouse
  I.pressKey('ArrowRight')
  I.waitForText('2 of 3 items', 5)
  I.waitForText('pdf_document_2.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-2-592871146255686', 5, '.io-ox-viewer .swiper-slide-active')
  I.click('~Next')
  I.waitForText('3 of 3 items', 5)
  I.waitForText('pdf_document_3.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-3-17686886748919695', 5, '.io-ox-viewer .swiper-slide-active')
  I.click('~Next')
  I.waitForText('1 of 3 items', 5)
  I.waitForText('pdf_document_1.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-1-608048216047687', 5, '.io-ox-viewer .swiper-slide-active')

  // test backwards loop, test via keyboard and mouse
  I.pressKey('ArrowLeft')
  I.waitForText('3 of 3 items', 5)
  I.waitForText('pdf_document_3.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-3-17686886748919695', 5, '.io-ox-viewer .swiper-slide-active')
  I.click('~Previous')
  I.waitForText('2 of 3 items', 5)
  I.waitForText('pdf_document_2.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-2-592871146255686', 5, '.io-ox-viewer .swiper-slide-active')
  I.click('~Previous')
  I.waitForText('1 of 3 items', 5)
  I.waitForText('pdf_document_1.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-1-608048216047687', 5, '.io-ox-viewer .swiper-slide-active')
  I.pressKey('Escape')

  // 2) loop is limited to selected files if more than one file is selected
  I.pressKeyDown('CommandOrControl')
  drive.selectFile('pdf_document_3.pdf')
  I.pressKeyUp('CommandOrControl')
  I.clickToolbar('~View')
  I.waitForElement('.io-ox-viewer')
  I.waitForText('pdf_document_1.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-1-608048216047687', 5, '.io-ox-viewer .swiper-slide-active')
  I.waitForText('1 of 2 items', 5)

  I.click('~Next')
  I.waitForText('2 of 2 items', 5)
  I.waitForText('pdf_document_3.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-3-17686886748919695', 5, '.io-ox-viewer .swiper-slide-active')

  I.click('~Next')
  I.waitForText('1 of 2 items', 5)
  I.waitForText('pdf_document_1.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-1-608048216047687', 5, '.io-ox-viewer .swiper-slide-active')

  I.click('~Previous')
  I.waitForText('2 of 2 items', 5)
  I.waitForText('pdf_document_3.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-3-17686886748919695', 5, '.io-ox-viewer .swiper-slide-active')

  I.click('~Previous')
  I.waitForText('1 of 2 items', 5)
  I.waitForText('pdf_document_1.pdf', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('doc-1-608048216047687', 5, '.io-ox-viewer .swiper-slide-active')
})
