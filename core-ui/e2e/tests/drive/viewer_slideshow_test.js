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

Feature('Drive > File viewer > Slide show')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C110272][C110274] Show all images just once / Changing the autoplay pause', async ({ I, drive, settings }) => {
  const myFiles = await I.grabDefaultFolder('infostore')
  const pictureFolder = await I.haveFolder({ title: 'myPictures', module: 'infostore', parent: myFiles })

  await Promise.all([
    I.haveFile(pictureFolder, 'media/images/100x100.png'),
    I.haveFile(pictureFolder, 'media/images/ox_logo.png')
  ])

  I.login('app=io.ox/files')

  drive.selectFile('myPictures')
  I.doubleClick('~myPictures')

  I.waitNumberOfVisibleElements('.list-view > .list-item', 2)

  // change settings
  settings.open('', 'Advanced settings')
  I.waitForVisible('#settings-autoplayPause')
  I.selectOption('#settings-autoplayPause', '3 seconds') // setting minimum time

  I.checkOption('Show all images just once')

  settings.close()
  drive.selectFile('100x100.png')
  I.clickToolbar('~View')

  // the image is shown in the viewer
  I.waitForVisible('.viewer-displayer-image[alt="100x100.png"]', 10)

  // starting the slide show
  I.waitForVisible('.viewer-toolbar-autoplay-start')
  I.click('.viewer-toolbar-autoplay-start')

  I.waitForInvisible('.viewer-toolbar-autoplay-start')

  I.wait(1)
  I.seeElement('.swiper-slide.swiper-slide-active img[alt="100x100.png"]')
  I.seeElement('.swiper-slide:not(.swiper-slide-active) img[alt="ox_logo.png"]')
  I.dontSeeElement('.viewer-toolbar-autoplay-start') // slide show mode
  I.wait(3)
  I.seeElement('.swiper-slide:not(.swiper-slide-active) img[alt="100x100.png"]')
  I.seeElement('.swiper-slide.swiper-slide-active img[alt="ox_logo.png"]')
  I.dontSeeElement('.viewer-toolbar-autoplay-start') // slide show mode

  I.wait(3) // slide show must be terminated
  // TODO: slide show is terminated and can be started again
  // I.waitForVisible('.viewer-toolbar-autoplay-start', 8)

  // close the viewer
  I.pressKey('Escape')

  // the image is shown in the viewer again or drive opens
  I.waitForApp()
})

Scenario('[C110273] Repeat slideshow', async ({ I, drive, dialogs, settings }) => {
  const myFiles = await I.grabDefaultFolder('infostore')
  const pictureFolder = await I.haveFolder({ title: 'myPictures', module: 'infostore', parent: myFiles })

  await Promise.all([
    I.haveFile(pictureFolder, 'media/images/ox_logo.png'),
    I.haveFile(pictureFolder, 'media/images/100x100.png')
  ])

  I.login('app=io.ox/files')

  drive.selectFile('myPictures')
  I.doubleClick('~myPictures')

  I.waitNumberOfVisibleElements('.list-view > .list-item', 2)

  // change settings
  settings.open()
  settings.expandSection('Advanced settings')
  I.waitForVisible('#settings-autoplayPause')
  I.selectOption('#settings-autoplayPause', '3 seconds') // setting minimum time

  settings.close()
  drive.selectFile('ox_logo.png')
  I.clickToolbar('~View')

  // the image is shown in the viewer
  I.waitForElement('.viewer-displayer-image[alt="ox_logo.png"]', 10)

  // starting the slide show
  I.waitForVisible('.viewer-toolbar-autoplay-start')
  I.click('.viewer-toolbar-autoplay-start')

  I.wait(1)
  I.seeElement('.swiper-slide.swiper-slide-active img[alt="ox_logo.png"]')
  I.seeElement('.swiper-slide:not(.swiper-slide-active) img[alt="100x100.png"]')
  I.dontSeeElement('.viewer-toolbar-autoplay-start') // slide show mode
  I.wait(3)
  I.seeElement('.swiper-slide:not(.swiper-slide-active) img[alt="ox_logo.png"]')
  I.seeElement('.swiper-slide.swiper-slide-active img[alt="100x100.png"]')
  I.dontSeeElement('.viewer-toolbar-autoplay-start') // slide show mode
  // endlessly -> the first image is shown again
  I.wait(3)
  I.waitForElement('.swiper-slide.swiper-slide-active img[alt="ox_logo.png"]')
  I.seeElement('.swiper-slide:not(.swiper-slide-active) img[alt="100x100.png"]')
  I.dontSeeElement('.viewer-toolbar-autoplay-start') // slide show mode

  // stop the slide show
  I.pressKey('Escape')

  // the image is shown in the viewer again or drive opens
  I.waitForApp()
})
