# App Suite UI

All notable changes to this project will be documented in this file.

## [Unreleased]

## [8.18.1] - 2023-10-12

### Fixed

- [`OXUIB-2469`](https://jira.open-xchange.com/browse/OXUIB-2469): Missing personal data download link [`c1e5e67`](https://gitlab.open-xchange.com/frontend/ui/commit/c1e5e6742c9f5faa0a195581e790852353ba82c4)
- [`OXUIB-2576`](https://jira.open-xchange.com/browse/OXUIB-2576): Reply button is disabled in mail threads (conversations) [`2604245`](https://gitlab.open-xchange.com/frontend/ui/commit/2604245b0542aef14cfb5115eaf9f89cfb50f943)

## [8.18.0] - 2023-09-29

### Added

- [`OXUI-990`](https://jira.open-xchange.com/browse/OXUI-990): Comprehensive keyboard shortcut support [`a9ca930`](https://gitlab.open-xchange.com/frontend/ui/commit/a9ca930fe6a62985b26be1d2e3ebf1fd9d2c457f)
  - Users can now use keyboard shortcuts to perform common actions and
    Navigate App Suite, greatly enhancing usability for power and keyboard users
  - Added a dialog to list keyboard shortcuts
  - Users can select a shortcut profile that matches similar apps, use the
    Default App Suite shortcuts, or disable shortcuts entirely
  - Improved and streamlined existing keyboard support
  - Removed non-configurable character key shortcuts in accordance with
    Web Content Accessibility Guidelines (WCAG)
- [`OXUI-998`](https://jira.open-xchange.com/browse/OXUI-998): Improve visibility of default user avatars in dark mode [`8f58c00`](https://gitlab.open-xchange.com/frontend/ui/commit/8f58c00efcbbbf39da16e43b722959e3abc10a3c)
- [`OXUI-1275`](https://jira.open-xchange.com/browse/OXUI-1275): Consume mail and calendar events from switchboards websocket [`6d4d61c`](https://gitlab.open-xchange.com/frontend/ui/commit/6d4d61cf11a4bbe9d5772abd53fcf81535c40574)
    - Add event handlers for ox:mail:new and ox:calender:updates to switchboard socket
    - Log switchboard websocket events to websocketlog
- **Breaking change:** [`OXUI-1300`](https://jira.open-xchange.com/browse/OXUI-1300): New mail compose design and implement collapsable windows on mobile devices [`994b4ef`](https://gitlab.open-xchange.com/frontend/ui/commit/994b4ef6dae08f887e9ac8f57169ff4e5c7bb467)
    - Buttons for attachments, guard an options (mail actions) are now located at the top and displayed as icon buttons.
    - If a user has multiple mail accounts the sender field will always get displayed.
    - Windows can be collapsed by tapping the appropiate icon.
      - Collapsed windows can be found in the app launcher from where they can get reopened.
    - Apply collapsable window type to appointments, contacts, tasks, notes, and help.

### Deprecated

- `Tumblr portal plugin`, pending remove with 8.20 [`01e8269`](https://gitlab.open-xchange.com/frontend/ui/commit/01e8269f12546b728a853f0627f0bc361a1c67f6)
- Pending removals for 8.20 [`a1a8953`](https://gitlab.open-xchange.com/frontend/ui/commit/a1a8953721b6eeb4ced7ed939a20e34d45ef278a)
  - `Backbone.DisposableView`. Use `io.ox/backbone/views/disposable` instead.
  - `Concat` of `folderAPI.virtual`. Use `this.concat` instead.
  - `GetAddressesCollection` of `mail/sender.js`. Use `collection` instead.
  - `GetConference` of `switchboard/api.js`. Use `getConference` from `io.ox/conference/util` instead
  - `GetPrimaryAddress` of `mail/sender.js`. Use `accountAPI.getPrimaryAddress` instead.
  - `GetSender` of `mail/util.js`. Use `sender.js` instead.
  - `GetTextNode` from `api/group.js`. Use `getName` instead.
  - `GetURLTemplate` of `simple-wizard/register.js`. Use `wizard.settings.url` instead.
  - `IsImplicitlyCancelled`. Use `isImplicitlyCanceled` instead.
  - `UpdateSenderList` of `mail/compose/extensions.js`. Use `renderDropdown` instead.
  - `V` of `whatsnew/util.js`
  - Support for `className` as part of `options` parameter for `createIcon`. Use `icon.addClass` instead.
  - Options parameter `vgrid` at `folder/actions/move.js`
- Remove support for `io.ox/mail/settings/compose/register.js` [`b0ff770`](https://gitlab.open-xchange.com/frontend/ui/commit/b0ff7705e1be5015024e6fd81147c0a3e182dd36)
- Remove support for `io.ox/mail/settings/signatures/register.js` [`c69d4c6`](https://gitlab.open-xchange.com/frontend/ui/commit/c69d4c616789112775ce0dc866e4c132871a2070)

### Removed

- **Breaking change:** [`OXUI-1296`](https://jira.open-xchange.com/browse/OXUI-1296): Remove premium-area from folder view [`49ea2d6`](https://gitlab.open-xchange.com/frontend/ui/commit/49ea2d636a9ec748f8047345ba28d6e7eb443bde)

### Fixed

- [`DOCS-5050`](https://jira.open-xchange.com/browse/DOCS-5050): Some PDF annotations look broken in viewer [`40a2437`](https://gitlab.open-xchange.com/frontend/ui/commit/40a24375b1417e15a6c859cbe2b03e29bfa25297)
- [`OXUIB-2478`](https://jira.open-xchange.com/browse/OXUIB-2478): No way to customize "Join conference" button for new conference types [`db39561`](https://gitlab.open-xchange.com/frontend/ui/commit/db39561baedf875cdbda4091e80327a004b30fec)
- [`OXUIB-2492`](https://jira.open-xchange.com/browse/OXUIB-2492): Missing list view controls in calendar [`d21323c`](https://gitlab.open-xchange.com/frontend/ui/commit/d21323c3310b2b6e520ae9ba3c760a4549488995)
- [`OXUIB-2507`](https://jira.open-xchange.com/browse/OXUIB-2507): Updating allowlist for external images in emails needs a UI refresh [`6b111bb`](https://gitlab.open-xchange.com/frontend/ui/commit/6b111bb9ed85f727e85a96186d6f5770393d6d42)
- [`OXUIB-2537`](https://jira.open-xchange.com/browse/OXUIB-2537): Long calendar names cause horizontal scrollbar in new appointment dialog [`f60bcb4`](https://gitlab.open-xchange.com/frontend/ui/commit/f60bcb461744d9a50fcb3d99a24e45dae60f3491)
- [`OXUIB-2542`](https://jira.open-xchange.com/browse/OXUIB-2542): Typos in frontend.pot [`97743bc`](https://gitlab.open-xchange.com/frontend/ui/commit/97743bcd877ff38d29858a060e56548c5af2d4b9)
- [`OXUIB-2544`](https://jira.open-xchange.com/browse/OXUIB-2544): 1 Message Shows in pt_BR but not en_US [`99dd2d0`](https://gitlab.open-xchange.com/frontend/ui/commit/99dd2d0834236ef5ff265b28440d94f0a5aac05e)
- [`OXUIB-2546`](https://jira.open-xchange.com/browse/OXUIB-2546): Toggle switch labels missing [`23ac7c1`](https://gitlab.open-xchange.com/frontend/ui/commit/23ac7c104b110db9502ad3a8946aa4c65baafad3)
- [`OXUIB-2547`](https://jira.open-xchange.com/browse/OXUIB-2547): Unread folder is preselected silently when searching [`b2fe0b7`](https://gitlab.open-xchange.com/frontend/ui/commit/b2fe0b7d49f34a54ad0a096a754bba757a2f61c8)
- [`OXUIB-2553`](https://jira.open-xchange.com/browse/OXUIB-2553): Portal inbox widget is empty [`107bbcd`](https://gitlab.open-xchange.com/frontend/ui/commit/107bbcd9053d59d2ba189a900729f7b17b624ad2)
- Early cache invalidation in service worker [`0ed57e4`](https://gitlab.open-xchange.com/frontend/ui/commit/0ed57e4b4d0504bb9edb21bda5c6c5051bfd4951)
- Use existing paths for status probes of Deployment [`36d8aa6`](https://gitlab.open-xchange.com/frontend/ui/commit/36d8aa6bd23eca666a66e87e36f75ccf85eb6a74)


## [8.17.0] - 2023-09-01

### Added

- [`OXUI-558`](https://jira.open-xchange.com/browse/OXUI-558): Drag and drop support for ICS files [`4d1f2d6`](https://gitlab.open-xchange.com/frontend/ui/commit/4d1f2d689143bee6f6aaf077d542414267884d75)
- [`OXUI-1210`](https://jira.open-xchange.com/browse/OXUI-1210): Dedicated app launcher for mobile devices [`ac549e3`](https://gitlab.open-xchange.com/frontend/ui/commit/ac549e3a812e4afe81c2b7738f2623caa3d03723)
- [`OXUI-1286`](https://jira.open-xchange.com/browse/OXUI-1286): Global config switch to disable Provider Edition [`5d68cee`](https://gitlab.open-xchange.com/frontend/ui/commit/5d68cee4a2f1f62cd94c7da9f8e01571ad2d0584)
  - New feature toggle based on as-config entry `edition: "pe"`

### Changed

- [`OXUI-1257`](https://jira.open-xchange.com/browse/OXUI-1257): Notifications: Improve Focus Handling [`bc5cc40`](https://gitlab.open-xchange.com/frontend/ui/commit/bc5cc40655ad833dba8bbd70dfb88dc4e315f1e6)
- [`OXUI-1278`](https://jira.open-xchange.com/browse/OXUI-1278): Remove websocket dependency for Zoom authorization [`9a5d9c2`](https://gitlab.open-xchange.com/frontend/ui/commit/9a5d9c29164a2a48f3c1c920786c72a061766460)
    - Add origin to zoom oauth callback url for cross window communication
    - Needs voice and video service &gt;= 1.2.0
- [`OXUIB-2379`](https://jira.open-xchange.com/browse/OXUIB-2379): Replace clipboard.js with native navigator.clipboard [`1b774f9`](https://gitlab.open-xchange.com/frontend/ui/commit/1b774f97816a1f160d7714c5ae67185d72b106cc), [`158e930`](https://gitlab.open-xchange.com/frontend/ui/commit/158e93059466a74c6dad8d19772600cbf37ad163)
- [`OXUIB-2474`](https://jira.open-xchange.com/browse/OXUIB-2474): Remove markup when copying from mail detail header [`8449f87`](https://gitlab.open-xchange.com/frontend/ui/commit/8449f87841a5e03617d244cbfeaafc6b5ef261dc)
- Build target is now es2022 [`b20f3c3`](https://gitlab.open-xchange.com/frontend/ui/commit/b20f3c35fbdbbeb6bd80dd7eb08e5b38d984bf3b)
  For more information see: https://caniuse.com/?search=es2022 (Feature support list)
  This also drops support for Browsers older than the following:

  Chrome &lt; 94
  Firefox &lt; 93
  Safari &lt; 16
  Edge &lt; 94

### Deprecated

- `GetCategories`, `getCategoriesForPIM`, `addCategory`, `removeCategory` and `saveCategorySettings` [`538f63a`](https://gitlab.open-xchange.com/frontend/ui/commit/538f63a61da621bd690703eb696ebd90cd07abe3)

### Removed

- **Breaking change:** Dependency clipboard.js [`06c31d8`](https://gitlab.open-xchange.com/frontend/ui/commit/06c31d8351f54c5dd2f082fc67e2ffbbcaf2c770)
- **Breaking change:** Removals for 8.17 [`e628b5c`](https://gitlab.open-xchange.com/frontend/ui/commit/e628b5c9b37c4763a53da4d343e2f4ace714b800)
- IE 11 Support Fragments and obsolete css vendor prefixes [`641e654`](https://gitlab.open-xchange.com/frontend/ui/commit/641e654001e223ff29bc64d8e0aacc9638bc664b)
- Pending removals for 8.19 [`33b228e`](https://gitlab.open-xchange.com/frontend/ui/commit/33b228e549105d6dcff0fef990bcf8ab3dfb4c42)
  - Remove all declarations in unused `io.ox/contacts/widgets/pictureUpload.scss`

### Fixed

- [`DOCS-4964`](https://jira.open-xchange.com/browse/DOCS-4964): Alignment issue and missing label in upload new version dialog [`cafc0c2`](https://gitlab.open-xchange.com/frontend/ui/commit/cafc0c2fe95baaff6f69244dc22fe7da67f3afdd)
- [`DOCS-5021`](https://jira.open-xchange.com/browse/DOCS-5021): Repair "New email" dialog when used inside documents application [`a251419`](https://gitlab.open-xchange.com/frontend/ui/commit/a251419cf52472356c37f2d796816e21dbd040f2)
- [`OXIUB-2494`](https://jira.open-xchange.com/browse/OXIUB-2494): Html-Element should not have scroll overflow enabled [`1f09cde`](https://gitlab.open-xchange.com/frontend/ui/commit/1f09cdeb7d1f29ac0a2849bcbbdb932ca4044a82)
- [`OXUIB-2402`](https://jira.open-xchange.com/browse/OXUIB-2402): Baton.clone() breaks Baton.preventDefault() [`3ccfcfa`](https://gitlab.open-xchange.com/frontend/ui/commit/3ccfcfa97a65aaeae097ab14aafa05e682d874c1)
- [`OXUIB-2476`](https://jira.open-xchange.com/browse/OXUIB-2476): Other occurrences vanish if the organizer changes the confirmation state of a series [`9e41f70`](https://gitlab.open-xchange.com/frontend/ui/commit/9e41f700d2c60351a7e79f56a94ff9b9cc2bb316)
- [`OXUIB-2477`](https://jira.open-xchange.com/browse/OXUIB-2477): Disabled state of actions with icons not reliable set in all cases [`ed5290f`](https://gitlab.open-xchange.com/frontend/ui/commit/ed5290f4ded70216a32151f65017ca736d6c91ac)
- [`OXUIB-2480`](https://jira.open-xchange.com/browse/OXUIB-2480): Action buttons in contact detail [`4ef9549`](https://gitlab.open-xchange.com/frontend/ui/commit/4ef95490088bdc5094e31927e9952e0c13291265)
    - Moved action buttons extension points to contact detail view
- [`OXUIB-2482`](https://jira.open-xchange.com/browse/OXUIB-2482): Icons of Actions in Dropdowns are not replaced by the text title on mobile [`6603db2`](https://gitlab.open-xchange.com/frontend/ui/commit/6603db2392ef650e5550eacd636a73e1988d4ca5)
- [`OXUIB-2490`](https://jira.open-xchange.com/browse/OXUIB-2490): Logo too small [`1d103b6`](https://gitlab.open-xchange.com/frontend/ui/commit/1d103b669601f9a4d626ec484e42999cfbf2bfbe)
- [`OXUIB-2493`](https://jira.open-xchange.com/browse/OXUIB-2493): Contact picker icon not visible [`2e82bb0`](https://gitlab.open-xchange.com/frontend/ui/commit/2e82bb0ea1d956c3e58168d0865e2886f6a709b1)
- [`OXUIB-2495`](https://jira.open-xchange.com/browse/OXUIB-2495): Mark:invite:confirmed event details [`fcebdc7`](https://gitlab.open-xchange.com/frontend/ui/commit/fcebdc764663d363836c467e230d93c6af3b3ad3)
- [`OXUIB-2501`](https://jira.open-xchange.com/browse/OXUIB-2501): App launcher menu too small [`2cf903c`](https://gitlab.open-xchange.com/frontend/ui/commit/2cf903c7323da69acb47a8799bc451c6be5992c2)
- [`OXUIB-2506`](https://jira.open-xchange.com/browse/OXUIB-2506): Deleting a resource results in two HTTP delete requests [`37d540c`](https://gitlab.open-xchange.com/frontend/ui/commit/37d540cc9ae13f938792da0878124e24b2b30f46)
- [`OXUIB-2514`](https://jira.open-xchange.com/browse/OXUIB-2514): Error when accessing shared calendar [`40a318f`](https://gitlab.open-xchange.com/frontend/ui/commit/40a318fab262012cbf3089e22fb55eb0efc85a5a)
- [`OXUIB-2522`](https://jira.open-xchange.com/browse/OXUIB-2522): Enterprise picker defaults to descending sort order [`b3b6ab7`](https://gitlab.open-xchange.com/frontend/ui/commit/b3b6ab7b2dff901b5c21b81acb938cf043ee541f)
- [`OXUIB-2523`](https://jira.open-xchange.com/browse/OXUIB-2523): Text in calendar module cut off [`bc2b9ba`](https://gitlab.open-xchange.com/frontend/ui/commit/bc2b9bac95cd5e2682b0a23862d33dbc245524ee)

## [8.16.0] - 2023-08-04

### Added

- [`OXUI-1303`](https://jira.open-xchange.com/browse/OXUI-1303): Add a prompt to the delete actions for Signatures and Templates [`793aed5`](https://gitlab.open-xchange.com/frontend/ui/commit/793aed517794a4b4d802471e3b66d2a1466d962e)
- Support EN 301 549 accessibility statement in accessibility conformance report [`0dc5f64`](https://gitlab.open-xchange.com/frontend/ui/commit/0dc5f641746982832af41fe162cc9a21d54da43d, [`7174443`](https://gitlab.open-xchange.com/frontend/ui/commit/7174443fda18bfb7d91752cd4a9f9ddf2287dfae)
- Support linked settings in whatsnew [`7f6c395`](https://gitlab.open-xchange.com/frontend/ui/commit/7f6c3957a7e8a9b3d4881af3871858abff9032ca)

### Changed

- [`OXUI-1102`](https://jira.open-xchange.com/browse/OXUI-1102): Label `'Click to add photo'` to `Update Photo` in edit contact/user edit dialog [`025ff15`](https://gitlab.open-xchange.com/frontend/ui/commit/025ff1586d0bd03c0f2b779afd05d3ee87e21fb8)
- [`OXUI-1224`](https://jira.open-xchange.com/browse/OXUI-1224): Redesign of modal dialogs for mobile devices [`19fe509`](https://gitlab.open-xchange.com/frontend/ui/commit/19fe509a81b8ebe591ee0cd228fb7f491458fac7)
- [`OXUI-1288`](https://jira.open-xchange.com/browse/OXUI-1288): Re-render only changed items in notification area [`3278293`](https://gitlab.open-xchange.com/frontend/ui/commit/3278293128361004acfcf602f9de966f87d29298)
- **Breaking change:** [`OXUI-1297`](https://jira.open-xchange.com/browse/OXUI-1297): As a user I can easily navigate and search settings [`11daf42`](https://gitlab.open-xchange.com/frontend/ui/commit/11daf42be372cf8dd3e6275dd32fa3df58a8885f)
  - Restructured overall navigation
  - Relocated settings that were at the wrong place
  - Moved important settings upwards, less important or advanced into "Advanced settings" section
  - Changed wording to avoid jargon and make settings more accessible for average users
- **Breaking change:** [`OXUIB-1688`](https://jira.open-xchange.com/browse/OXUIB-1688): switch from a tags to button tags in Launcher [`99943bb`](https://gitlab.open-xchange.com/frontend/ui/commit/99943bb01ac04d6ee156b1c977bd4a74c124be63)
  - \<a> in the launcher menu are now \<buttons>
- [`OXUIB-2366`](https://jira.open-xchange.com/browse/OXUIB-2366): A "Discard draft" within mail compose should bypasses the trash in all cases [`55a9dd6`](https://gitlab.open-xchange.com/frontend/ui/commit/55a9dd64bba8555bb8a365030de101022089b2f1)
- Change default text for AI-specific consent dialog [`f3d28cf`](https://gitlab.open-xchange.com/frontend/ui/commit/f3d28cf93a0710b6a7ccc80bc6f88e3292e32f76)
- Changed dirty evaluation for readability [`2fb557e`](https://gitlab.open-xchange.com/frontend/ui/commit/2fb557e620daf910ec8be163594af7485ffbb36b)
- Increase timeout for ai-service http client to 2m [`9b81575`](https://gitlab.open-xchange.com/frontend/ui/commit/9b815751ee7f25df463cbb545f619bdec12c1fdc)
- Translation updates [`2f9913c`](https://gitlab.open-xchange.com/frontend/ui/commit/2f9913ca84979ab955b395d0d78c3f84f9426bf5)


### Removed
- **Breaking change:** [`OXUI-1304`](https://jira.open-xchange.com/browse/OXUI-1304): Twitter integration [`6bbf533`](https://gitlab.open-xchange.com/frontend/ui/commit/6bbf533db430bca7e1c0c2933e073cbbd2af7348)
- Documentation for outdated settings index [`a802aa0`](https://gitlab.open-xchange.com/frontend/ui/commit/a802aa071b246572403e9bfc82bc50ee4bf4cc5d)
- Pending removals for 8.18 [`60c9cb7`](https://gitlab.open-xchange.com/frontend/ui/commit/60c9cb7a3d32bfb8406769551c70262c47075c60)
  - Remove selector `grid` for datepickers grid style rule. Use class `grid-datepicker` instead.
  - Remove legacy mail API
  - Remove extension point `io.ox/mail/compose/recipientActionLinkMobile`
  - Disabled support for `action.requires` in `io.ox/backbone/views/actions/util`. Use `action.matches` instead.
  - Disabled extension `description` of `io.ox/contacts/detail/content`, pending remove with 8.18. Use resources view in `src/plugins/administration/resources/settings/view-detail.js` instead.
  - Disabled loading of settings module without default data.
  - Disabled `api.TabHandling` reference in `io.ox/core/api/tab`. Use named exports instead.

### Fixed

- [`DOCS-4951`](https://jira.open-xchange.com/browse/DOCS-4951): Missing margin in file details [`86b078f`](https://gitlab.open-xchange.com/frontend/ui/commit/86b078fb625eb16fc194e40eae44aaaf4c312fcc)
- [`OXUIB-2300`](https://jira.open-xchange.com/browse/OXUIB-2300): Print view does not allow asynchronous customization [`881db76`](https://gitlab.open-xchange.com/frontend/ui/commit/881db76ae7a5e088c1fafa71b9fd406c092a44bf)
- [`OXUIB-2401`](https://jira.open-xchange.com/browse/OXUIB-2401): OX Display breaks notification area and app control [`e4fa984`](https://gitlab.open-xchange.com/frontend/ui/commit/e4fa9846ef1c3099d104e0525d8c60f7ab02421f)
- [`OXUIB-2406`](https://jira.open-xchange.com/browse/OXUIB-2406): File type icon in drive list view exhibits incorrect color after losing focus [`781fd37`](https://gitlab.open-xchange.com/frontend/ui/commit/781fd37d02d4c8f27c3d9b3a9f733216a6dd372d)
- [`OXUIB-2440`](https://jira.open-xchange.com/browse/OXUIB-2440): Appointment popup closes after user clicks magnifier in attachment viewer [`47c5eaa`](https://gitlab.open-xchange.com/frontend/ui/commit/47c5eaa1322b2265dc7eb0dd6a4df559d4d245d0)
- [`OXUIB-2450`](https://jira.open-xchange.com/browse/OXUIB-2450): Search token not correctly positioned [`a085fd1`](https://gitlab.open-xchange.com/frontend/ui/commit/a085fd167b6e9e1bd5ea82daf30962acfeee0f8d)
- [`OXUIB-2451`](https://jira.open-xchange.com/browse/OXUIB-2451): Accessibility: Header Tag (&lt;h1&gt;) in Footer of Mail Floating Window [`b2fc734`](https://gitlab.open-xchange.com/frontend/ui/commit/b2fc734285fa2669bbfc694d084de4267bcb26cb)
- [`OXUIB-2453`](https://jira.open-xchange.com/browse/OXUIB-2453): Unable to update password to ical feed [`05a8f69`](https://gitlab.open-xchange.com/frontend/ui/commit/05a8f69a9090a0a42e8eeb20e5ae18ee3dfdeea3)
- [`OXUIB-2455`](https://jira.open-xchange.com/browse/OXUIB-2455): Problems during oauth account removal [`d3fbf3d`](https://gitlab.open-xchange.com/frontend/ui/commit/d3fbf3d03912d1e0b1c1ea7944330a388e3eb825)
- [`OXUIB-2456`](https://jira.open-xchange.com/browse/OXUIB-2456): Portal plugin provisioning incompatible with older versions [`4f3a418`](https://gitlab.open-xchange.com/frontend/ui/commit/4f3a41854fbd4fcaa1020b63aad538fa400141ce)
- [`OXUIB-2462`](https://jira.open-xchange.com/browse/OXUIB-2462): Mobile swipe buttons in mail list may break when simultaneously scrolling the list [`77f7150`](https://gitlab.open-xchange.com/frontend/ui/commit/77f7150fab873bc0a1b9ca8e3acc2869058c02ae)
- [`OXUIB-2466`](https://jira.open-xchange.com/browse/OXUIB-2466): Calendar phone number detection breaks links in longer descriptions [`6f6d996`](https://gitlab.open-xchange.com/frontend/ui/commit/6f6d996b461738c9d050644d306a89ae97bf6f5a)
- [`OXUIB-2470`](https://jira.open-xchange.com/browse/OXUIB-2470): OX Display's bottom leaderboard ad blocks mobile toolbar [`ae7e753`](https://gitlab.open-xchange.com/frontend/ui/commit/ae7e753cf467e7114f205406374c1df02218d063)
- [`OXUIB-2471`](https://jira.open-xchange.com/browse/OXUIB-2471): Mail automatically checked in alternative selection mode [`130d596`](https://gitlab.open-xchange.com/frontend/ui/commit/130d596f319df11a66a99a9f865b42101b2fb874)
- [`OXUIB-2477`](https://jira.open-xchange.com/browse/OXUIB-2477): Disabled state of actions with icons not reliable set in all cases [`a6f89a2`](https://gitlab.open-xchange.com/frontend/ui/commit/a6f89a2b1e4901afd4953398c74961ad49fdc4cd)
- Generate content for plain-text mails using ai-service [`3429dac`](https://gitlab.open-xchange.com/frontend/ui/commit/3429daca2e0e4c7275bbedfcf23e806e30a88605)

## [8.15.0] - 2023-07-07

### Added

- [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Create a dedicated path for code not released under AGPL [`12433f9`](https://gitlab.open-xchange.com/frontend/ui/commit/12433f9551dbc00bf1a6b35a6cfff641f746a361)
- [`OXUI-1115`](https://jira.open-xchange.com/browse/OXUI-1115): As a user I can add attachments from an existing mail to a new mail [`81a9138`](https://gitlab.open-xchange.com/frontend/ui/commit/81a9138932bd9a4bbc162203115d9d39d2cb8a92)
  - A new dropdown menu in the compose window consolidates all attachment types (e.g. local, drive, from mail)
  - Users can now easily add attachments from existing mails by selecting a mail with attachments, which will be displayed in the new attachments dropdown
  - If no mail is selected, attachments from recently selected mails will be offered in the dropdown
  - Additionally, users can right-click on a mail in the list view and use the new "New email with attachment" action to create a new mail with a copy of its attachments
- Added [`OXUI-1277`](https://jira.open-xchange.com/browse/OXUI-1277): As a user I see an mail unread indicator at the App icon in the system tray [`2df19bd`](https://gitlab.open-xchange.com/frontend/ui/commit/2df19bd9978f75945fdadd093f28cdd295b4e9bc)
- [`OXUI-1284`](https://jira.open-xchange.com/browse/OXUI-1284): As a user I can easily add predefined text snippets when writing a new mail [`da53beb`](https://gitlab.open-xchange.com/frontend/ui/commit/da53beb23db2257309563672c1bab6de6f38a36d)
  - Templates can be inserted from mail compose
  - Templates can be managed via new Settings page
- Polyfill for TextDecodeStream [`b793a42`](https://gitlab.open-xchange.com/frontend/ui/commit/b793a42f3dedde2b5ac4da7b61e923b013a261cf)

### Changed

- **Breaking change:** [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Move Portal app + portal plugins into src/pe folder [`b2db606`](https://gitlab.open-xchange.com/frontend/ui/commit/b2db606c575f66d691d80a77b707bec568ed8dcb)
  - In code replace: @/io.ox/portal =&gt; @/pe/portal
  - In code replace: @/plugins/portal =&gt; @/pe/portal/plugins
  - When porting, please go through every occurrence of `io.ox/portal` and check wether this is a
      File reference (replace with pe/portal) or just a reference to some extension point or jslob key (leave as is).
      If in doubt, try it out.
  - `plugin` keys in JSLob values have been renamed from `plugins/portal/${type}/register` to `pe/portal/plugins/${type}/register`
    - This will automatically be assumed if no plugin with the old path is found in manifest file - no migration needed
  - Keys for JSLobs did *not* change
  - Plugins are still registered under `"namespace": "portal"`
  - Extension points did *not* change
  - Paths can stay as is, only references to core modules/plugins need to be adjusted
- **Breaking change:** [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Move upsell related code into pe/ directory [`449ac6b`](https://gitlab.open-xchange.com/frontend/ui/commit/449ac6bb7dccea566113f5362831f3b9d85d088d)
  - @/io.ox/backbone/mini-views/upsell =&gt; @/pe/backbone/mini-views/upsell
  - @/plugins/upsell =&gt; @/pe/upsell/plugins
  - @/io.ox/core/upsell still exists with a minimal API to do checks for upsell.
      Those checks are basically stubs, though. The "real thing" will be injected
      During runtime.
- **Breaking change:** [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Move Zoom plugin to pe/ directory [`f0a6cf9`](https://gitlab.open-xchange.com/frontend/ui/commit/f0a6cf9a8247e7a1dc84a81eba4580acc13b5236)
  - In code replace: @/io.ox/zoom =&gt; @/pe/zoom
  - Keys for JSLobs did *not* change
  - **Caution** the settings module was moved to `@/io.ox/conference/zoom-settings` and still released
      Under AGPL, as it's needed for the feature toggle
- **Breaking change:** [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Move changePassword function into separate module [`4f14439`](https://gitlab.open-xchange.com/frontend/ui/commit/4f14439db0ad301d0eed16e2a378b1fc984165a4)
  - It's now possible to import changePassword directly: `import { changePassword } from '@/io.ox/settings/security/change-password'`
- **Breaking change:** [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Move GDPR export related code into pe/ directory [`f9f12ab`](https://gitlab.open-xchange.com/frontend/ui/commit/f9f12ab2db4338ed95ee246fa991e100e7685ec6)
- **Breaking change:** [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Move OpenAI plugin to pe/ directory [`15ae91a`](https://gitlab.open-xchange.com/frontend/ui/commit/15ae91a6c38672e2f1923aa5310ea7eed6e625e8)
  - In code replace: @/io.ox/openai =&gt; @/pe/openai
  - Keys for JSLobs did *not* change
- **Breaking change:** [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Move Whats New feature to pe/ directory [`c7f0f5a`](https://gitlab.open-xchange.com/frontend/ui/commit/c7f0f5abd45dc44169d89aabd63bda92f6e70f80)
  - In code replace: @/io.ox/core/whatsnew =&gt; @/pe/core/whatsnew
  - No extension point changes
  - Should be straight forward to migrate
- **Breaking change:** [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Move Xing Halo plugin to pe/ directory [`2a91acd`](https://gitlab.open-xchange.com/frontend/ui/commit/2a91acd38548d38fa627370039182ec8c597144a)
- **Breaking change:** [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Move quota related code into pe/ directory [`fdf5d3e`](https://gitlab.open-xchange.com/frontend/ui/commit/fdf5d3ece0ff00426745567dc81b9c38fc04bb97)
  - Replace in source: @/io.ox/backbone/mini-views/quota =&gt; @/pe/backbone/mini-views/quota
- [`ASP-197`](https://jira.open-xchange.com/browse/ASP-197): Quicklaunch and autostart settings for Apps [`f10b1c9`](https://gitlab.open-xchange.com/frontend/ui/commit/f10b1c98c09aa4f09e598f1c0c60cb5373762300)
  - This is changed in a backwards compatible way
  - ids are now supported (and preferred) in both configs:
    - io.ox/core//autoStart=io.ox/mail
    - io.ox/core//apps/quickLaunch=io.ox/mail,io.ox/calendar,io.ox/files
- **Breaking change:** [`OXUI-1216`](https://jira.open-xchange.com/browse/OXUI-1216): Attachment lists in mail adjusted to match PIM attachments [`cc8100c`](https://gitlab.open-xchange.com/frontend/ui/commit/cc8100c5f9a54806bca2227c44345944ff9ec876)
    - Class "inline-items" is replaced by "attachment-list"
    - Class "item" is replaced by "attachment"
    - Class "remove" is replaced by "remove-attachment"
    - Filename is now located in ".file&gt;.filename"
    - Filesize is now located in ".file&gt;.filesize
- Changed dropdown title to match current AI model [`16a52db`](https://gitlab.open-xchange.com/frontend/ui/commit/16a52dbd2b83a5254c19ff35094e14e3ad6b5666)

### Removed

- **Breaking change:** File `plugins/administration/resources/settings/edit`. Update import to `plugins/administration/resources/settings/view-edit.js` [`9bfa959`](https://gitlab.open-xchange.com/frontend/ui/commit/9bfa959b2990b98d17e7c3eb619adbf217d27e3a)
- `GetGroup` in `io.ox/mail/compose/util` [`c2841d8`](https://gitlab.open-xchange.com/frontend/ui/commit/c2841d803655fc256743fe63e71bd94ed6fff437)
- Named export of `Collection` in `io.ox/participants/model` was removed. Please use `ParticipantsCollection` instead. [`14a2291`](https://gitlab.open-xchange.com/frontend/ui/commit/14a2291a3c06d0b2e9aefba22fe45aa0fd2a35ea)
- Named export of `Model` in `io.ox/participants/model` was removed. Please use `ParticipantModel` instead. [`6ee2b85`](https://gitlab.open-xchange.com/frontend/ui/commit/6ee2b858d1e343f64590d4c952decb3b43329765)
- Pending removals for 8.17 [`5d13b0b`](https://gitlab.open-xchange.com/frontend/ui/commit/5d13b0b8cc631b083d1ecf7b2e25d0bb8a1a6207)
  - Disabled `io.ox/backbone/disposable`. Use `io.ox/backbone/views/disposable` instead.
  - Disabled `gettext.format`. Instead parameters can be passed directly.
  - Disabled `ox.manifests`. Use `io.ox/core/manifests` instead.
  - Disabled `ox.withPluginsFor`. Use `io.ox/core/manifests` instead
  - Disabled `ox.isDisabled` in `io.ox/core/manifests`.
  - Disabled module `io.ox/core/tk/dropdown`. Use node module `@open-xchange/bootstrap` instead.
  - Disabled `isWhiteListed` in `io.ox/mail/util`. Use `allowlistRegex` of `io.ox/core/capabilities` instead.
  - Disabled `action` property of type string in `io.ox/backbone/views/actions/util`.
  - Disabled `api.whitelistRegex` in `io.ox/core/capabilities`. Use `api.allowlistRegex` instead.
- Style for `.mail-detail .recipient-actions` [`a7837a7`](https://gitlab.open-xchange.com/frontend/ui/commit/a7837a7e447f1b708028eaadc5feb82f33cf2beb)

### Fixed

- [`DOCS-4839`](https://jira.open-xchange.com/browse/DOCS-4839): Move the folder via folder tree creates typeError [`78a236e`](https://gitlab.open-xchange.com/frontend/ui/commit/78a236e5872a9d6c7341b2f97d5fc69d86cf7654)
- [`DOCS-4848`](https://jira.open-xchange.com/browse/DOCS-4848): Prevent repeated call of spreadsheetview.onDispose [`92cc183`](https://gitlab.open-xchange.com/frontend/ui/commit/92cc183509067fffd9893b3a35dc5e4086918fa9)
- [`DOCS-4925`](https://jira.open-xchange.com/browse/DOCS-4925): List view checkbox has wrong contrast [`2c4d5ea`](https://gitlab.open-xchange.com/frontend/ui/commit/2c4d5ea6e94b95d39793625e3bd351af725c9d86)
- [`DOCS-4960`](https://jira.open-xchange.com/browse/DOCS-4960): Closing spreadsheet in edit mode fails when spreadsheet ... [`c7c637d`](https://gitlab.open-xchange.com/frontend/ui/commit/c7c637d36c32ca43a673aab3ea5c7b5365066158)
- [`OXUIB-1794`](https://jira.open-xchange.com/browse/OXUIB-1794): Certain E-Mails lack padding [`363b959`](https://gitlab.open-xchange.com/frontend/ui/commit/363b95967eebc67a843944dfc57b0192e44ec092)
- [`OXUIB-2148`](https://jira.open-xchange.com/browse/OXUIB-2148): Printing a short mail always creates two pages in print preview [`b93d447`](https://gitlab.open-xchange.com/frontend/ui/commit/b93d447b8e99e3f785f58152c56228e687bbbbbe)
- [`OXUIB-2355`](https://jira.open-xchange.com/browse/OXUIB-2355): Adding MP4 files as mail attachment crashes Safari [`5e9c8b3`](https://gitlab.open-xchange.com/frontend/ui/commit/5e9c8b3bfb42ebb90b0aa0f8938ed86982ba84a1)
- [`OXUIB-2356`](https://jira.open-xchange.com/browse/OXUIB-2356): Long name overflows "Edit personal data" view on mobiles [`fa5e85d`](https://gitlab.open-xchange.com/frontend/ui/commit/fa5e85d50764d3ae049e10f5d7b0052e0ab1c4a7)
- [`OXUIB-2358`](https://jira.open-xchange.com/browse/OXUIB-2358): Add support for calendar deep links in list layout [`fab5428`](https://gitlab.open-xchange.com/frontend/ui/commit/fab54282faf82b32ac4fc233357a5887713ad7ac)
- [`OXUIB-2363`](https://jira.open-xchange.com/browse/OXUIB-2363): Broken "Add from Drive" modal on mobiles [`ce9835b`](https://gitlab.open-xchange.com/frontend/ui/commit/ce9835bc7e28f00e6bf6064fbbc0e294f22e7e60)
- [`OXUIB-2369`](https://jira.open-xchange.com/browse/OXUIB-2369): Leaderboard ad prevents closing of notification area on mobiles [`e031ccd`](https://gitlab.open-xchange.com/frontend/ui/commit/e031ccd53a60f516e400d558ae1316baf64b3854)
- [`OXUIB-2390`](https://jira.open-xchange.com/browse/OXUIB-2390): Cache invalidation not working properly [`a82632b`](https://gitlab.open-xchange.com/frontend/ui/commit/a82632be880e5d385a13814eeb210835598c6241)
  - Root cause: missing app root when requesting invalidation with dependencies
  - Solution: inject app root into file list and handle accordingly
- [`OXUIB-2398`](https://jira.open-xchange.com/browse/OXUIB-2398): Entries overflow in appointment widget [`9f565e1`](https://gitlab.open-xchange.com/frontend/ui/commit/9f565e1366c5df2ead3d7e831b28c26f75b8c0a8)
- [`OXUIB-2399`](https://jira.open-xchange.com/browse/OXUIB-2399): Changes made to recurring appointments in week view are not reflected correctly in month view [`8876ebf`](https://gitlab.open-xchange.com/frontend/ui/commit/8876ebfa1bf6926ab2e6a2d6e095917305c5cb9c)
- [`OXUIB-2403`](https://jira.open-xchange.com/browse/OXUIB-2403): Mail content not shown if mail css is not properly commented out [`8d07ee2`](https://gitlab.open-xchange.com/frontend/ui/commit/8d07ee24109f70fd5d1cc540f89d5ee59921b262)
- [`OXUIB-2404`](https://jira.open-xchange.com/browse/OXUIB-2404): Delete accounts immediately [`c7ec8e8`](https://gitlab.open-xchange.com/frontend/ui/commit/c7ec8e862ca1485fc3683e1efa1b2f613d63651c)
- [`OXUIB-2405`](https://jira.open-xchange.com/browse/OXUIB-2405): Calendar: Links with dates display wrong in appointment details [`3cba5ff`](https://gitlab.open-xchange.com/frontend/ui/commit/3cba5ff63d2ac19c9f29d8b7fdb245b4d31d728a)
- [`OXUIB-2410`](https://jira.open-xchange.com/browse/OXUIB-2410): After changing language saving mail settings fails because of category translation [`43730fa`](https://gitlab.open-xchange.com/frontend/ui/commit/43730fa888ad4976f490988f05b50ad3c9970fd4)
- [`OXUIB-2412`](https://jira.open-xchange.com/browse/OXUIB-2412): Onboarding shows mailCalendarAddressbook without checking for Calendar or Addressbook caps [`e69b5c1`](https://gitlab.open-xchange.com/frontend/ui/commit/e69b5c1dad5a40a89d70d67b2237ca5764043a03)
- [`OXUIB-2416`](https://jira.open-xchange.com/browse/OXUIB-2416): Undo Send not responding to guard error messages correctly [`d73397f`](https://gitlab.open-xchange.com/frontend/ui/commit/d73397f1304797bfd28a0dbfb4471ebc8d648487)
- [`OXUIB-2417`](https://jira.open-xchange.com/browse/OXUIB-2417): Overdue task notifications are disappearing after update [`9f531d8`](https://gitlab.open-xchange.com/frontend/ui/commit/9f531d8bca6d742364a21b511ed483b3684d2f4a)
- [`OXUIB-2419`](https://jira.open-xchange.com/browse/OXUIB-2419): In calendar list view: focused selected item color hardcoded [`0bdcc91`](https://gitlab.open-xchange.com/frontend/ui/commit/0bdcc9158e24312cf9efc8bdfba338de70520606)
- [`OXUIB-2421`](https://jira.open-xchange.com/browse/OXUIB-2421): Mobile dropdowns are not properly disposed [`3240bbf`](https://gitlab.open-xchange.com/frontend/ui/commit/3240bbf306e35bb7c610fb8369795260c2ee430c)
- [`OXUIB-2427`](https://jira.open-xchange.com/browse/OXUIB-2427): Handle logout during mail send [`a765d1c`](https://gitlab.open-xchange.com/frontend/ui/commit/a765d1c7c237aaaf026ee26e7ca7c21223959d91)
- [`OXUIB-2441`](https://jira.open-xchange.com/browse/OXUIB-2441): Confirmation buttons of resource booking requests in notification area not working [`e9bf2bf`](https://gitlab.open-xchange.com/frontend/ui/commit/e9bf2bfd3985e0449fe8e7c42ab224a3b36e7249)

## [8.14.0] - 2023-06-09

### Added

- [`OXUI-1090`](https://jira.open-xchange.com/browse/OXUI-1090): Implement improved appointment exception check [`41a037e`](https://gitlab.open-xchange.com/frontend/ui/commit/41a037e107638fa8998d48933c4dbb17844b1870)
- [`OXUI-1129`](https://jira.open-xchange.com/browse/OXUI-1129): As a user I can select a reply-to address [`8232b23`](https://gitlab.open-xchange.com/frontend/ui/commit/8232b23b0483cf931b5d4c61dadc63927aeb1743)
  - Users can now add one or more `reply-to` addresses when composing an email.
  - Users can add a `reply-to` address to an email account that will be used as the default
  - Users can now see a `reply-to` address in the email detail view
- [`OXUI-1139`](https://jira.open-xchange.com/browse/OXUI-1139): As a user I want to hide my free&busy data for other users [`3e664a4`](https://gitlab.open-xchange.com/frontend/ui/commit/3e664a4e0c711781449485790ed24bb2361d33f6)
  - Add new section 'Free/busy visibility' in calendar settings to define who can see the users availability in the free time planner
- [`OXUI-1212`](https://jira.open-xchange.com/browse/OXUI-1212): As an admin I can block mail filter actions from being applied directly [`7b51fe7`](https://gitlab.open-xchange.com/frontend/ui/commit/7b51fe77a63e0abdb592987cdb837a076a4dc825)
- [`OXUI-1223`](https://jira.open-xchange.com/browse/OXUI-1223): As a user I see update information ideally for each release [`f88e3e0`](https://gitlab.open-xchange.com/frontend/ui/commit/f88e3e0fad3f7eb95a9fcf08f300cd0a92b777dc)
- Translations for portal upsell buttons [`ffd2a64`](https://gitlab.open-xchange.com/frontend/ui/commit/ffd2a645e9359f13698029c83b1d82112c836c16)
- [`OXUIB-2395`](https://jira.open-xchange.com/browse/OXUIB-2395): Enable What's new dialog for new accounts [`de4d128`](https://gitlab.open-xchange.com/frontend/ui/commit/de4d128557ba06b70e5c79a2f10da46beabb162b)
  - It was not possible to configure What's New showing up for "new" users
  - Some customers wanted to show the dialog to users migrated from other systems
  - Those customers can now provide a base line version that is used as a default for the last seen version of a user, making the dialog show up for new users
- As a user I get an indication in my calendar views that certain appointments are implicitly canceled because all other attendees have declined [`6113dbc`](https://gitlab.open-xchange.com/frontend/ui/commit/6113dbc8064e447d702e0933bd3b81d66ba357c0)
- Extended logging for possible code loading issues [`90fb7ad`](https://gitlab.open-xchange.com/frontend/ui/commit/90fb7ad027f631d1016a1d77c8a4acf679e0db69)

### Changed

- [`OXUI-1248`](https://jira.open-xchange.com/browse/OXUI-1248): Use JWT for authentication at ai-service [`5853a17`](https://gitlab.open-xchange.com/frontend/ui/commit/5853a1786e94068643c8ee8342d62edfae22460e)
- [`OXUI-1260`](https://jira.open-xchange.com/browse/OXUI-1260): Use improved phone number detection in descriptions (appointments, tasks, resources) [`3e5ec60`](https://gitlab.open-xchange.com/frontend/ui/commit/3e5ec607aa1133270b97dd37ea1f8c1706ea4e4c)
- [`OXUI-1262`](https://jira.open-xchange.com/browse/OXUI-1262): Respect reduced motion system setting [`9fa55ba`](https://gitlab.open-xchange.com/frontend/ui/commit/9fa55ba66b75146c4be651861f2cad2f5bd034ee)
  - Observe prefers-reduce-motion media query to lower barriers to users with vestibular and attention deficit disorders
  - Remove unused animate.css library
  - Disable spinning update animation for users that prefer reduced motion
  - Replace motion animations for floating windows and notification panel for users that prefer reduced motion
  - Introduce fadeIn and fadeOut as drop-in replacements for $.fadein/out to improve smoothness of animations on modern hardware
- [`OXUI-1274`](https://jira.open-xchange.com/browse/OXUI-1274): Feature `presence` defaults to false [`55cfe66`](https://gitlab.open-xchange.com/frontend/ui/commit/55cfe66ca2a6cc998164abf5f172ef9edf01146a)
- Improve toggling behavior of recipient fields during mobile mail composition [`dd6e63e`](https://gitlab.open-xchange.com/frontend/ui/commit/dd6e63eb1a6b6ab706dbb19d0c2a8d0f532b9b94)
  - If some fields are currently hidden, tapping the button will display all fields.
  - If all fields are currently shown and some fields are empty (such as CC, BCC, Reply To) or unchanged (such as the sender field), tapping the button will hide those fields
- Make consent dialog and list of supported languages for AI integration configurable. Also add feedback links to AI-generated content in mail detail view as well as the corresponding dialog [`fa85c92`](https://gitlab.open-xchange.com/frontend/ui/commit/fa85c9218a434f5fd3d4ce7a0a9f6f6128417ef7)
  - The consent dialog can be configured using the following pattern:
    `io.ox/core//customStrings/$id/$language=$customTranslation`
  - If a language is not defined, the fallback will first be the English (en) custom string
  - The following elements are supported: `ai.consent.title, ai.consent.text, ai.consent.checkbox, ai.consent.button`
  - The text (ai.consent.text) can link to OpenAI when using `%$1s` (as known from translations) as placeholder for the link
  - The list of supported languages can be configured by `io.ox/core//ai/supportedLanguages` (space or comma separated values)
  - Supported values are en, es, de, fr, it, nl, pt, ja
  - The feedback URL can be configured using the standard pattern for features
    Example: `io.ox/core//features/.feedback/openai=$url`

### Deprecated

- Class `grid` for datepicker will be removed with 8.16. Pleas use class `grid-datepicker` instead. [`01b09a7`](https://gitlab.open-xchange.com/frontend/ui/commit/01b09a7f38cf240805934dc00832745ff03aa332)
- Extension point `io.ox/mail/compose/boot/preserve-mobile-signature` [`4a0be4f`](https://gitlab.open-xchange.com/frontend/ui/commit/4a0be4fcb1b3e40d061cdc80f7912452f7fba4e5)
- Obsolete/unused SCSS file `io.ox/contacts/widgets/pictureUpload.scss` [`7ebf290`](https://gitlab.open-xchange.com/frontend/ui/commit/7ebf290600f0241fbfb7deb4184eb28d02caf2e5)
- Starting from version 8.16, settings modules without a default-data function will no longer be supported. [`bc19495`](https://gitlab.open-xchange.com/frontend/ui/commit/bc194954767ba5c9a652dae4d4592bded9fafbfb)
- Support for `action.requires` will be removed with 8.16. Please use `action.matches` instead. [`e395485`](https://gitlab.open-xchange.com/frontend/ui/commit/e3954859a6bf9e4218cf6001891588dc0468b012)

### Removed

- **Breaking change:**  Extension point `io.ox/mail/compose/recipientActionLinkMobile` [`5469d1d`](https://gitlab.open-xchange.com/frontend/ui/commit/5469d1d796c8a864091e479974297a88bf0f3683)
- **Breaking change:** `api.TabHandling` in `io.ox/core/api/tab.js` [`d185d0a`](https://gitlab.open-xchange.com/frontend/ui/commit/d185d0a871edcf936b3aa38a8f0b15960318726a)
- **Breaking change:** Legacy API references of old mail API endpoints at `io.ox/mail/api` [`a8b3213`](https://gitlab.open-xchange.com/frontend/ui/commit/a8b3213780a0e78aeed5ea32d640136ec0bfafed)

### Fixed

- [`OXUIB-1003`](https://jira.open-xchange.com/browse/OXUIB-1003): Unexpected "Conflicts detected" popup [`945e03c`](https://gitlab.open-xchange.com/frontend/ui/commit/945e03ccafc365694ba9318c3bc9e5fb36a75e31)
- [`OXUIB-2313`](https://jira.open-xchange.com/browse/OXUIB-2313): Appointment details still visible after deleting [`2f13cb4`](https://gitlab.open-xchange.com/frontend/ui/commit/2f13cb4c02f92ec816b09b757cdbf9a17c39538b)
- [`OXUIB-2338`](https://jira.open-xchange.com/browse/OXUIB-2338): Calendar breaks with many appointments in month view [`300ffc6`](https://gitlab.open-xchange.com/frontend/ui/commit/300ffc6808771917fdb4bf345a6145c68cb64751)
- [`OXUIB-2342`](https://jira.open-xchange.com/browse/OXUIB-2342): ExtendColumns mechanism to retrieve extra columns does not work [`fb6e757`](https://gitlab.open-xchange.com/frontend/ui/commit/fb6e7572007e92e85a34fb318ed7ec3b4b624d0d)
- [`OXUIB-2348`](https://jira.open-xchange.com/browse/OXUIB-2348):Unable to save meeting attendees as distribution list [`2977565`](https://gitlab.open-xchange.com/frontend/ui/commit/297756505113d7840ac1ac9cee9ad1af5a161e5e)
  - Root cause: MW is not able to resolve user contacts without gab capability.
  - Solution: Change distribution list members from gab to mail + display name format if gab capability is missing.
- [`OXUIB-2353`](https://jira.open-xchange.com/browse/OXUIB-2353): Dynamic theme SVG logo does not work cross-domain [`5554b87`](https://gitlab.open-xchange.com/frontend/ui/commit/5554b87f00a770115c58d6099f63001fc11c3ce7)
- [`OXUIB-2357`](https://jira.open-xchange.com/browse/OXUIB-2357): Sender notice overflows on mobiles [`5253305`](https://gitlab.open-xchange.com/frontend/ui/commit/525330543d91200114e590cda01437d69fffd8c6)
- [`OXUIB-2364`](https://jira.open-xchange.com/browse/OXUIB-2364): Upsell portal widget not clickable if imageURL is defined [`d6878c0`](https://gitlab.open-xchange.com/frontend/ui/commit/d6878c0e0e4aa86742be40e44a15519cb511b063)
- [`OXUIB-2370`](https://jira.open-xchange.com/browse/OXUIB-2370): Multiple addresses in mailto: link gets parsed into one token [`3c92211`](https://gitlab.open-xchange.com/frontend/ui/commit/3c92211580e6abe1c01faa48299f632bc301cb5c)
- [`OXUIB-2371`](https://jira.open-xchange.com/browse/OXUIB-2371): Unable to sort contact list descending [`3abcf5c`](https://gitlab.open-xchange.com/frontend/ui/commit/3abcf5c86efd3e3f3a285a7cf442fe3bbe7e1671), [`5208319`](https://gitlab.open-xchange.com/frontend/ui/commit/520831950b7d60606bc4fc36daec3c2b714036ed)
- [`OXUIB-2375`](https://jira.open-xchange.com/browse/OXUIB-2375): Appointments over multiple days not displayed correctly in mobile month view [`daf6ea2`](https://gitlab.open-xchange.com/frontend/ui/commit/daf6ea2b87d646211109a2d9af45318199dc706e)
- [`OXUIB-2380`](https://jira.open-xchange.com/browse/OXUIB-2380): Layout issues for error states for accounts and subscriptions in settings [`8c4fa5a`](https://gitlab.open-xchange.com/frontend/ui/commit/8c4fa5a15a328bb81ee5b7e6b1a9419c9eb1c180), [`d486589`](https://gitlab.open-xchange.com/frontend/ui/commit/d4865899d06689c6288da80f81b2bed3392c9d28), [`638f170`](https://gitlab.open-xchange.com/frontend/ui/commit/638f1702bcaa42f1d4fc2802368fe98833405c4e)
- [`OXUIB-2382`](https://jira.open-xchange.com/browse/OXUIB-2382): Mini calendar not centered any more [`5fa6b81`](https://gitlab.open-xchange.com/frontend/ui/commit/5fa6b81f00369854d9f33d864ecb50c1cd14740f), [`ce17fd7`](https://gitlab.open-xchange.com/frontend/ui/commit/ce17fd721128489f8db7d375c40d6d366f60528a)
- [`OXUIB-2390`](https://jira.open-xchange.com/browse/OXUIB-2390): Broken error handling when loading mail compose editor [`07b2cfe`](https://gitlab.open-xchange.com/frontend/ui/commit/07b2cfe2052fab74d5ba0b39b9efd99961438f64)
  - Root cause: javascript file extracted from bundle using wrong encoding
  - Solution: explicitly use utf-8 encoding for content in bundle files
  - A workaround to gracefully handle code loading exceptions will also improve error handling in the future
- [`OXUIB-2392`](https://jira.open-xchange.com/browse/OXUIB-2392): Appointments wrongly added to all my public appointments calendar [`1e2b05d`](https://gitlab.open-xchange.com/frontend/ui/commit/1e2b05db347733850c217e7baf220d86b60e9a2f)
- [`OXUIB-2409`](https://jira.open-xchange.com/browse/OXUIB-2409): Accept/Deny dialog does not open in mails for exceptions in external series [`16acd74`](https://gitlab.open-xchange.com/frontend/ui/commit/16acd743b817e91296c2b6f30a3ff74f2aa6558a)
- Fix path issues with vite 3.3.1 and case sensitive file systems [`0dee8ce`](https://gitlab.open-xchange.com/frontend/ui/commit/0dee8ce5b7257651ed739212b1d885ee5ada41b1), [`ed799ea`](https://gitlab.open-xchange.com/frontend/ui/commit/ed799ea1f6e130cf1e96b6ff86e9eb098ce69512)

### Security

- [`OXUIB-2365`](https://jira.open-xchange.com/browse/OXUIB-2365): XSS in PIM attachments preview [`6a28d12`](https://gitlab.open-xchange.com/frontend/ui/commit/6a28d12133f1ed094703319db90d9e275178ca3e)
  - Root cause: User content was used in a template string
  - Solution: Use jQuery to escape user content and prevent code execution


## [8.13.0] - 2023-05-04

### Added

- **Breaking change:** [`OXUI-1077`](https://jira.open-xchange.com/browse/OXUI-1077): As a user I can create managed resources [`ee0feaa`](https://gitlab.open-xchange.com/frontend/ui/commit/ee0feaa182d840c32ab92e4250b11f68837725f9)
- [`OXUI-1107`](https://jira.open-xchange.com/browse/OXUI-1107): As a user I can undo mail sending for a certain amount of time [`f11db57`](https://gitlab.open-xchange.com/frontend/ui/commit/f11db57bfbbbd5e405cd065b765bd3706b0cc619)
- [`OXUI-1116`](https://jira.open-xchange.com/browse/OXUI-1116): As a booking delegate for a resource I can administer resources that get booked [`9060967`](https://gitlab.open-xchange.com/frontend/ui/commit/90609674e09dbf7fc44e2f970d3a4d32bc4864b7)
- [`OXUI-1160`](https://jira.open-xchange.com/browse/OXUI-1160): As an admin I can disable editing real names for mail accounts [`ff195bb`](https://gitlab.open-xchange.com/frontend/ui/commit/ff195bba2584c94c891bb1dbb5b31dd4d2fdb878)
  - It is configurable whether a user can change its account name or not. If the setting is set to 'false' the input field in account settings will be disabled and in mail compose the dropdown option 'Edit names' won't be available.
- [`OXUI-1174`](https://jira.open-xchange.com/browse/OXUI-1174): Port deputy e2e tests to 8.x [`b7987c7`](https://gitlab.open-xchange.com/frontend/ui/commit/b7987c7e9f4436e8f336f0720377a3dfc73a7c5a)
- Add e2e test and prevent trees in modals to handle escape events [`6b13e44`](https://gitlab.open-xchange.com/frontend/ui/commit/6b13e446d5b78b07ef42da894cc7cf19b597f742)
- Add managed resources to whats new dialog [`da85116`](https://gitlab.open-xchange.com/frontend/ui/commit/da851162d9368447bb8b37a620992ef20ecff6ab)
- Exported logout function [`9e18fee`](https://gitlab.open-xchange.com/frontend/ui/commit/9e18fee2070a878d7274fb222e96f47c26ce19dc)
- Typeahead view support for `dropup`  specified by option `direction` (default: dropdown) [`1f92a8d`](https://gitlab.open-xchange.com/frontend/ui/commit/1f92a8dafaeb9eaf636a47c4a46f1cbdbc1846df)

### Changed

- [`DOCS-4805`](https://jira.open-xchange.com/browse/DOCS-4805): PDF viewer: show error details from server [`d6c4b4d`](https://gitlab.open-xchange.com/frontend/ui/commit/d6c4b4dae4c871825316e3e826fc4292c8fb673c)
- **Breaking change:** Overwrite `getAll` of resources API with an "actual" `getAll` that uses search [`b3fb154`](https://gitlab.open-xchange.com/frontend/ui/commit/b3fb1546df5951a47a8e0454bb35dc6d9d703976)
- Allow detail-popup do be appended to different container like modal dialog [`d88ced0`](https://gitlab.open-xchange.com/frontend/ui/commit/d88ced06255282e065b1b44b1b782fe0cadabd42)
- Disable switchboard features if no switchboard host is set [`de5af30`](https://gitlab.open-xchange.com/frontend/ui/commit/de5af30b3d5facf1b6c715e26b31e7f4f66d6673)
- List view selections `singleBehavior` returns false for check `isRange` [`151672e`](https://gitlab.open-xchange.com/frontend/ui/commit/151672ebaa71a0ee5c72f2c57cd6039db6cb9356)

### Deprecated

- File `plugins/administration/resources/settings/edit.js` [`0139f53`](https://gitlab.open-xchange.com/frontend/ui/commit/0139f53daeeba53d2d0f6f8cd4e8081124c7c417)
- Named exports `Model` and `Collection` of participant/model.js [`26201af`](https://gitlab.open-xchange.com/frontend/ui/commit/26201afcf8fcdfb5391a5e3512a4434a0cb8ccf9)
- Obsolete and unused module `io.ox/core/tk/dropdown` [`09a8651`](https://gitlab.open-xchange.com/frontend/ui/commit/09a865104f81626e6521bdb216db681fd0544877)

### Removed

- **Breaking change:** Deprecated and unused file `io.ox/settings/accounts/email/model.js` [`cfb05a9`](https://gitlab.open-xchange.com/frontend/ui/commit/cfb05a932e41ae1bff9672f16618723006ae234c)
- **Breaking change:** Deprecated and unused file `io.ox/settings/accounts/settings/defaults.js` [`7e8399d`](https://gitlab.open-xchange.com/frontend/ui/commit/7e8399d600b44b97ee92607a23783d6527d54c16)
- **Breaking change:** Functionality for deprecated function `getGroup` in `io.ox/mail/compose/util` [`7427f95`](https://gitlab.open-xchange.com/frontend/ui/commit/7427f9591eddae300ac392ec338098e97c52889a)
- Blankshield library [`796daf6`](https://gitlab.open-xchange.com/frontend/ui/commit/796daf6bf2264c940cfdce7f285f70b849d042e0)

### Fixed

- [`DOCS-4816`](https://jira.open-xchange.com/browse/DOCS-4816): Selection is lost after deleting a folder in drive list [`c26c09a`](https://gitlab.open-xchange.com/frontend/ui/commit/c26c09a98020a9de2eee5a076265a5d7e5e9ef02)
- [`OXUI-1083`](https://jira.open-xchange.com/browse/OXUI-1083): Usability improvements around external images [`11ef6c6`](https://gitlab.open-xchange.com/frontend/ui/commit/11ef6c65ba91147bb8558bba4463ccfa61a5acf5)
- [`OXUI-1239`](https://jira.open-xchange.com/browse/OXUI-1239): Drive layout breaks when changing from list to icon view after uploading a file [`e99d262`](https://gitlab.open-xchange.com/frontend/ui/commit/e99d262222f76bbef6970b50a4787d80f7c3178b)
- [`OXUI-1241`](https://jira.open-xchange.com/browse/OXUI-1241): Cannot open properties [`2f25935`](https://gitlab.open-xchange.com/frontend/ui/commit/2f25935d5d9b812392946024cc20c191a6b173cb)
- [`OXUIB-1943`](https://jira.open-xchange.com/browse/OXUIB-1943): Chrome treats App Suite as insecure when displaying external images in mails loaded via http [`d3981e7`](https://gitlab.open-xchange.com/frontend/ui/commit/d3981e781f6e89e485b3f2d73bb0fb23afc609d0)
- [`OXUIB-2205`](https://jira.open-xchange.com/browse/OXUIB-2205): Unread count in draft folder not always up to date [`3c58600`](https://gitlab.open-xchange.com/frontend/ui/commit/3c58600e93b57bcbbffb363f093da25885f1496a)
- [`OXUIB-2301`](https://jira.open-xchange.com/browse/OXUIB-2301): No file upload for Firefox browser under Android [`d964b40`](https://gitlab.open-xchange.com/frontend/ui/commit/d964b40db0861943a3e6f90460aefd4fcd1c2877)
- [`OXUIB-2302`](https://jira.open-xchange.com/browse/OXUIB-2302): Follow-up appointments are missing attributes [`8c07cc7`](https://gitlab.open-xchange.com/frontend/ui/commit/8c07cc7959cb1eae7496f3d79cff4c04e3fb7892)
- [`OXUIB-2308`](https://jira.open-xchange.com/browse/OXUIB-2308): Year view can't be selected anymore after selecting a specific date in year view [`808f15d`](https://gitlab.open-xchange.com/frontend/ui/commit/808f15d5eeb8dd7691243f87d2d5b87228a7c88e)
- [`OXUIB-2312`](https://jira.open-xchange.com/browse/OXUIB-2312): 'Recent files' not loaded in file picker for attachments [`986c275`](https://gitlab.open-xchange.com/frontend/ui/commit/986c275f58138f3f13d70f592e498d8da30738c1)
- [`OXUIB-2315`](https://jira.open-xchange.com/browse/OXUIB-2315): E-Mail - No refresh triggered when user clicks 'Accept' on meeting invitation for a series [`e3abcaf`](https://gitlab.open-xchange.com/frontend/ui/commit/e3abcaff6e5b5c5360f6558bc6fbc978882aafab)
- [`OXUIB-2318`](https://jira.open-xchange.com/browse/OXUIB-2318): Option to download folder or create file available despite permission not given [`86308e1`](https://gitlab.open-xchange.com/frontend/ui/commit/86308e19c4193175742985a755a18ed0795dadcf)
- [`OXUIB-2320`](https://jira.open-xchange.com/browse/OXUIB-2320): File gets unchecked after closing viewer even though toolbar options remain [`d89e633`](https://gitlab.open-xchange.com/frontend/ui/commit/d89e63342aa522219337656f6a02913c2c5a341c)
- [`OXUIB-2321`](https://jira.open-xchange.com/browse/OXUIB-2321): When adding a new favorite timezone, letters typed on keyboard don't jump to select entry [`aedf0d6`](https://gitlab.open-xchange.com/frontend/ui/commit/aedf0d65997da4b1833cb55ac206f0ee8c1084ab)
- [`OXUIB-2326`](https://jira.open-xchange.com/browse/OXUIB-2326): Doubled calendar controls after date change [`a279169`](https://gitlab.open-xchange.com/frontend/ui/commit/a279169eacfd8c8d18c0119fe77f09d337ef6967)
- [`OXUIB-2330`](https://jira.open-xchange.com/browse/OXUIB-2330): Icon broken for Google Mail accounts in settings [`c46e220`](https://gitlab.open-xchange.com/frontend/ui/commit/c46e22085e0896cf624aaf86c700657c54e42697)
- [`OXUIB-2340`](https://jira.open-xchange.com/browse/OXUIB-2340): Broken horizontal layout in mail on iPad [`eebbc80`](https://gitlab.open-xchange.com/frontend/ui/commit/eebbc803fe377846ebe5af95fa0c93f75603cb45)
- [`OXUIB-2343`](https://jira.open-xchange.com/browse/OXUIB-2343): Calendar not selected via deep link of mail invitation [`57812b7`](https://gitlab.open-xchange.com/frontend/ui/commit/57812b7b9d4d580a5f8e730de8a9506eb9ad20c5)
- [`OXUIB-2347`](https://jira.open-xchange.com/browse/OXUIB-2347): Address book picker mouse hover style broken for dark mode [`eef73c2`](https://gitlab.open-xchange.com/frontend/ui/commit/eef73c28e647dec312286c759404633ddd566c14)
- Adding quota mini views synchronously [`c4ae6e7`](https://gitlab.open-xchange.com/frontend/ui/commit/c4ae6e7c31cb0145a514163b27f9401a8e5ea6b5)
- Invalid session parameter can break login flow [`0b4cd4e`](https://gitlab.open-xchange.com/frontend/ui/commit/0b4cd4ecb27e88762980430b24e1b69fd8368775)
- Login page configuration link color is not applied in #form-box-body [`93609f6`](https://gitlab.open-xchange.com/frontend/ui/commit/93609f61eb8dfbebd1d7db7f05d0c04cfbcb1540)
- New day not updating calendar year view [`94c9c19`](https://gitlab.open-xchange.com/frontend/ui/commit/94c9c19b6df62d54463dc5a4f343cb789d13e7ae)

## [8.12.0] - 2023-04-06

### Added

- [`OXUI-962`](https://jira.open-xchange.com/browse/OXUI-962): Improve keyboard navigation in settings dropdown [`eaebbfd`](https://gitlab.open-xchange.com/frontend/ui/commit/eaebbfdc68fab02fa123f45e1612b232fe1c2f96)
- Improve keyboard handling in calendar toolbars ([`OXUI-1100`](https://jira.open-xchange.com/browse/OXUI-1100), [`OXUI-1099`](https://jira.open-xchange.com/browse/OXUI-1099)) [`d63908a`](https://gitlab.open-xchange.com/frontend/ui/commit/d63908a430cf08f9d9cf45eb686453abf26ec743)
- [`OXUI-1146`](https://jira.open-xchange.com/browse/OXUI-1146): Features for mobile mail compose [`3e9b3ae`](https://gitlab.open-xchange.com/frontend/ui/commit/3e9b3aec9ea4cba70ed27ee59309347971b4bc2b), [`70a4943`](https://gitlab.open-xchange.com/frontend/ui/commit/70a49434176d21534b970e236fee33253643ffa1)
    - Signature selection
    - Contact picker in address fields
    - Selecting own sender address
    - Save status in bottom toolbar
- [`OXUI-1193`](https://jira.open-xchange.com/browse/OXUI-1193): Retry mechanism for JWT fetch from switchboard [`71d5675`](https://gitlab.open-xchange.com/frontend/ui/commit/71d56759197b03d98d3855504ec80f9330c96321)
- [`OXUI-1211`](https://jira.open-xchange.com/browse/OXUI-1211): New inline help references [`7b4e789`](https://gitlab.open-xchange.com/frontend/ui/commit/7b4e7895b237140b111cc7c788b6217a343c6849)
- [`OXUIB-2245`](https://jira.open-xchange.com/browse/OXUIB-2245): Validation for tinymce toolbars [`b801226`](https://gitlab.open-xchange.com/frontend/ui/commit/b80122660a0f1f4534d947276a551b896645dcea)
- Add support to recognize join links for Microsoft Teams meetings [`6b1665f`](https://gitlab.open-xchange.com/frontend/ui/commit/6b1665f1b397c1b456e16e00dc09d01f39efa8db)
- Request Web App Manifest [`f81c706`](https://gitlab.open-xchange.com/frontend/ui/commit/f81c706b9752010a2a71dc3ec32e4a72e247f593)
  - If configured, this will enable users to install App Suite as (web) application
- Support for slots in ListControlView via `addToSlot` [`66ca31b`](https://gitlab.open-xchange.com/frontend/ui/commit/66ca31bc19e4dc544322aa765e6fb36704ba1bc1)

### Changed

- **Breaking change:** [`OXUI-1158`](https://jira.open-xchange.com/browse/OXUI-1158): JWT should be retrieved from Switchboard via http instead of websocket [`9f3b3ed`](https://gitlab.open-xchange.com/frontend/ui/commit/9f3b3edd0f4ed85efab0d6d65fbf3625704ee045)
    - Switchboard: JWT is now retrieved via http instead of websocket
    - Switchboard: JWT is now used to authenticate the websocket.
    - Presence has now a feature toggle under 'io.ox/core//features/presence' which is true by default
    - Disabling the presence feature will also disable switchboards websocket and zoom integration
- Fixup alignment issues in settings [`7c48f95`](https://gitlab.open-xchange.com/frontend/ui/commit/7c48f955557fd6b79d1cc6c5547fc720e323adbf)
- Move help button to settings header [`1393582`](https://gitlab.open-xchange.com/frontend/ui/commit/1393582205c4536fc4c2a9534e7f167eaf070617)

### Deprecated

- Extension point `io.ox/mail/compose/recipientActionLinkMobile` [`2156395`](https://gitlab.open-xchange.com/frontend/ui/commit/21563955e06d1730e92d618b6db0b9b92c83b4bf)
    - Please use `io.ox/mail/compose/recipientActionsMobile` instead
- Included legacy api references of old mail api endpoints at `io.ox/mail/api` [`3c72fec`](https://gitlab.open-xchange.com/frontend/ui/commit/3c72fec6995628bb1778e0e6ac8c14f7857e5418)
- IsWhiteListed function (mail/util.js)  and whitelistRegex (core/capabilities.js) [`b6b20bb`](https://gitlab.open-xchange.com/frontend/ui/commit/b6b20bb5013c640560b0b9a8374babe9d760dc40)
- Unused style for `.mail-detail .recipient-actions` [`92ece13`](https://gitlab.open-xchange.com/frontend/ui/commit/92ece138d9b2a5d02563f50fc425ab81365e9aae)

### Removed

- Deprecated device specific translation for more generic one in `connect your device` [`d77f1e8`](https://gitlab.open-xchange.com/frontend/ui/commit/d77f1e8a38c3ad168ae6d92c9dc0ca92c7f7e30e)
- Deprecated registry shortcuts `mail-compose` and `client-onboarding` [`62a7f57`](https://gitlab.open-xchange.com/frontend/ui/commit/62a7f579fc07b77e8fd530d2092a614e3e202857)
- Deprecated `io.ox/core/tk/dialogs`. Please use `io.ox/backbone/views/modal` instead. [`56ae7d1`](https://gitlab.open-xchange.com/frontend/ui/commit/56ae7d167d5d37d78119223adb0de5d7f3322cf2)
- Deprecated `io.ox/core/extPatterns/actions.js` [`95064e9`](https://gitlab.open-xchange.com/frontend/ui/commit/95064e9f434d31dd615e603cfb2b41ac2afcb24c)
- Deprecated `io.ox/core/extPatterns/links.js` [`2e0f742`](https://gitlab.open-xchange.com/frontend/ui/commit/2e0f74284005d538ca42f1b9ecd801558de79c7e)

### Fixed

- [`DOCS-4548`](https://jira.open-xchange.com/browse/DOCS-4548): In the 'Sharing options' it seems that the invitation expires after one day [`5d0e3d2`](https://gitlab.open-xchange.com/frontend/ui/commit/5d0e3d2c8b5acc513839bfd9fef84d8764aa883a)
- [`OXUIB-2065`](https://jira.open-xchange.com/browse/OXUIB-2065): Runtime error if vacationDomains configured in vacation rule [`ac370f0`](https://gitlab.open-xchange.com/frontend/ui/commit/ac370f095a27722665fd5da16ee022bb554a14b4)
- [`OXUIB-2200`](https://jira.open-xchange.com/browse/OXUIB-2200): Mail category name can be left empty [`c6159be`](https://gitlab.open-xchange.com/frontend/ui/commit/c6159be5967049c75c1d71e00aa53a499ee95b62)
- [`OXUIB-2212`](https://jira.open-xchange.com/browse/OXUIB-2212): Add autocomplete hint for which fields are searched in [`b2f4599`](https://gitlab.open-xchange.com/frontend/ui/commit/b2f45991d6397ff01c0db20c762558261e43269f)
- [`OXUIB-2214`](https://jira.open-xchange.com/browse/OXUIB-2214): Settings for 2-step verification look broken in mobile view [`031a5f7`](https://gitlab.open-xchange.com/frontend/ui/commit/031a5f7624720760caaf66e45c367f4787763018)
- [`OXUIB-2215`](https://jira.open-xchange.com/browse/OXUIB-2215): Unconfirmed appointments with category color cannot be recognized as unconfirmed [`a6d91ab`](https://gitlab.open-xchange.com/frontend/ui/commit/a6d91ab3660afd78b1fc16bfcea534319588ae06)
- [`OXUIB-2220`](https://jira.open-xchange.com/browse/OXUIB-2220): Resizebar can't be dragged when vacation notice is shown [`430582f`](https://gitlab.open-xchange.com/frontend/ui/commit/430582f7b0d8d43c3a3fcb4d0dbe8c8f40c7e3c9)
- [`OXUIB-2228`](https://jira.open-xchange.com/browse/OXUIB-2228): Move/Copy dialog in Drive does not scroll horizontally for long folder paths [`f1538f8`](https://gitlab.open-xchange.com/frontend/ui/commit/f1538f8bdde4b6ef54a35e556ac8f9726af4b4ce)
- [`OXUIB-2236`](https://jira.open-xchange.com/browse/OXUIB-2236): Broken dark mode in default notification settings [`3c211ae`](https://gitlab.open-xchange.com/frontend/ui/commit/3c211ae10c7d05b104fb574de870ac886807cee2)
- [`OXUIB-2246`](https://jira.open-xchange.com/browse/OXUIB-2246): Wrong relative date in birthday reminder [`e64be3f`](https://gitlab.open-xchange.com/frontend/ui/commit/e64be3f5cc70fc8f608bd12bf913c022a07ea64a)
- [`OXUIB-2247`](https://jira.open-xchange.com/browse/OXUIB-2247): "PasswordViewToggle" dark mode, disabled style and focus style [`7c94e69`](https://gitlab.open-xchange.com/frontend/ui/commit/7c94e69c1fb5fcf9afede14041fbed42b83fe26f)
- [`OXUIB-2248`](https://jira.open-xchange.com/browse/OXUIB-2248): Mobile: Unnecessary padding on Portal [`53c75d7`](https://gitlab.open-xchange.com/frontend/ui/commit/53c75d7bb8a5eecb73b06ba80aecee3bd4c184b8)
- [`OXUIB-2251`](https://jira.open-xchange.com/browse/OXUIB-2251): Removed inline image remains in the viewer by mail compose [`0a38156`](https://gitlab.open-xchange.com/frontend/ui/commit/0a38156405ba775c9ecc4a2be95b97d219219952)
- [`OXUIB-2253`](https://jira.open-xchange.com/browse/OXUIB-2253): Calendar appointments set to 00:00 when 2FA enabled [`25b2783`](https://gitlab.open-xchange.com/frontend/ui/commit/25b2783df85597b0e6feede9c7dea5f9389c0948)
- [`OXUIB-2254`](https://jira.open-xchange.com/browse/OXUIB-2254): Wrong tab handling in right top bar [`7178a25`](https://gitlab.open-xchange.com/frontend/ui/commit/7178a25a5850f3198dd96008877eb9acec173bb1)
- [`OXUIB-2260`](https://jira.open-xchange.com/browse/OXUIB-2260): Cannot identify selected mail folder in sidebar (with some themes) [`e81832f`](https://gitlab.open-xchange.com/frontend/ui/commit/e81832ffbf12661479ae301b83286f0da0d4664b)
- [`OXUIB-2264`](https://jira.open-xchange.com/browse/OXUIB-2264): Error while creating appointment in other calendar [`88e661e`](https://gitlab.open-xchange.com/frontend/ui/commit/88e661ea8ff8717961550d7860fb5d61a24d960f)
- [`OXUIB-2269`](https://jira.open-xchange.com/browse/OXUIB-2269): Missing 'Empty trash' option in context menu for Drive folders [`9a653d2`](https://gitlab.open-xchange.com/frontend/ui/commit/9a653d2cc434b73f8873959638d42f7463ae0a3a)
- [`OXUIB-2273`](https://jira.open-xchange.com/browse/OXUIB-2273): Mark as read delay working inconsistently [`254208a`](https://gitlab.open-xchange.com/frontend/ui/commit/254208a2bee8561d82736f208c1f9e01874d75db)
- [`OXUIB-2274`](https://jira.open-xchange.com/browse/OXUIB-2274): Misaligned action "Find a free time ..." in calendar [`6062794`](https://gitlab.open-xchange.com/frontend/ui/commit/6062794dbd70b3e4f8c187216dd84c592db8edbb)
- [`OXUIB-2279`](https://jira.open-xchange.com/browse/OXUIB-2279): Missing ellipsis/broken width calculation for drive folder breadcrumb [`03bc55e`](https://gitlab.open-xchange.com/frontend/ui/commit/03bc55e09b4cea973b0758049f0eaafe09efdfbd)
- [`OXUIB-2280`](https://jira.open-xchange.com/browse/OXUIB-2280): Detailed search for email on mobile device is broken [`00630d0`](https://gitlab.open-xchange.com/frontend/ui/commit/00630d0bc7392663801787db0f44aa4ba90f6ec1)
- [`OXUIB-2293`](https://jira.open-xchange.com/browse/OXUIB-2293): Preview of audio files attached to emails doesn't open [`06fe95b`](https://gitlab.open-xchange.com/frontend/ui/commit/06fe95b041e390e17f5e88f087e26d3252b8c5ef)
- [`OXUIB-2294`](https://jira.open-xchange.com/browse/OXUIB-2294): Insert image dialogs in OX Documents broken [`1dc8b6e`](https://gitlab.open-xchange.com/frontend/ui/commit/1dc8b6efd235d6d72df2bb111480fe78c0d7ecc0)
- [`OXUIB-2296`](https://jira.open-xchange.com/browse/OXUIB-2296): Missing space between name of distribution list and label „Distribution list“ [`4e5cb9f`](https://gitlab.open-xchange.com/frontend/ui/commit/4e5cb9fc4dd4cd0e813a1b1fbbae598a409d964c)
- [`OXUIB-2297`](https://jira.open-xchange.com/browse/OXUIB-2297): Edit appointment savepoint not removable [`8d31853`](https://gitlab.open-xchange.com/frontend/ui/commit/8d3185319e594365444b73d8824aa5b32786e925)
- [`OXUIB-2304`](https://jira.open-xchange.com/browse/OXUIB-2304): Percent character is cut off in scheduling view for zoom value 1000% [`bcc2bf9`](https://gitlab.open-xchange.com/frontend/ui/commit/bcc2bf935c8d23c3ab2ae6e581bf24cd0671ad4e)
- [`OXUIB-2305`](https://jira.open-xchange.com/browse/OXUIB-2305): Prevent linking halo view if user has no contact capability [`65619c8`](https://gitlab.open-xchange.com/frontend/ui/commit/65619c84bc7fc039fef705b25785258e093f91c6)
- [`OXUIB-2307`](https://jira.open-xchange.com/browse/OXUIB-2307): Storage space information displayed untranslated on German mail tab [`6e5ff9b`](https://gitlab.open-xchange.com/frontend/ui/commit/6e5ff9b70d757cf3e29abc6e9008f96bbabee9d4)
- [`OXUIB-2310`](https://jira.open-xchange.com/browse/OXUIB-2310): Search should close notification view on mobile [`fb0b4dc`](https://gitlab.open-xchange.com/frontend/ui/commit/fb0b4dcfb12b5c02d65b3d235fe913191566ac49)
- Join links that contained invalid trailing characters [`c15f2d2`](https://gitlab.open-xchange.com/frontend/ui/commit/c15f2d28d0cfa011b05644ac09795b64c7b87d45)
- Missing PGP icon on mobile mail detail [`171a392`](https://gitlab.open-xchange.com/frontend/ui/commit/171a3929c8fcc690243f93a7534b73130c1fa7bc)
- Removing non-functional split/merge button from mobile calendar [`d6ef2d2`](https://gitlab.open-xchange.com/frontend/ui/commit/d6ef2d2d1b802efe9dea451e59495fc4514147eb)
- Spacing of settings folder tree form greedy CSS rule [`65cd0f7`](https://gitlab.open-xchange.com/frontend/ui/commit/65cd0f7c386ca3490cb6aa2f756ce5a0de045884)

### Security

- [`OXUIB-2283`](https://jira.open-xchange.com/browse/OXUIB-2283): XSS using app passwords "lastDevice" property [`3dbbb77`](https://gitlab.open-xchange.com/frontend/ui/commit/3dbbb77aeec98eba9076778b4bb1617c0c83534e)

## [8.11.0] - 2023-03-10

### Added

- [`ASP-156`](https://jira.open-xchange.com/browse/ASP-156): As a user I can search for contacts based on the note field [`bbc290a`](https://gitlab.open-xchange.com/frontend/ui/commit/bbc290afa80646e8da5be93a76bbdd5df397c188)
- [`OXUI-1132`](https://jira.open-xchange.com/browse/OXUI-1132): Actions in mobile mail detail view [`d9c2255`](https://gitlab.open-xchange.com/frontend/ui/commit/d9c22552ed23a91f25d2f930a553d46ea3dade3d)
- [`OXUI-1135`](https://jira.open-xchange.com/browse/OXUI-1135): As a user I can mark appointment participants as optional [`23b0d62`](https://gitlab.open-xchange.com/frontend/ui/commit/23b0d624da38bc80247a3fe06dae9d2cc37807e5)
  - While creating or editing an appointment it's now possible to mark participants as optional
  - Those optional participants will also be shown as such in the appointment detail view
    If a count quota is set and 90% of it are used, the count quota is shown in
    the folder view.
- [`OXUI-1142`](https://jira.open-xchange.com/browse/OXUI-1142): Count quota for mail [`30e5571`](https://gitlab.open-xchange.com/frontend/ui/commit/30e5571e6d82102296572add07974c348ffe5f16)
- [`OXUI-1147`](https://jira.open-xchange.com/browse/OXUI-1147): Text formatting for mobile mail compose [`1f9682a`](https://gitlab.open-xchange.com/frontend/ui/commit/1f9682aa78d528d1509081bf7650d56bb7ea0df9)
- [`OXUI-1148`](https://jira.open-xchange.com/browse/OXUI-1148): Mobile settings features [`463f5b2`](https://gitlab.open-xchange.com/frontend/ui/commit/463f5b2526e24f6c79152893a61c125dc7913079)
    - Signature settings from desktop version (non-default mobile signatures are
      preserved)
    - Add mail account function (Settings-&gt;Accounts)
    - Mail filter settings (without editing functionality for the rules
      themselves)
    - IMAP subscriptions (Settings-&gt;Mail)
- [`OXUI-1172`](https://jira.open-xchange.com/browse/OXUI-1172): As a user I can configure when unread emails get marked as read [`da03dce`](https://gitlab.open-xchange.com/frontend/ui/commit/da03dceb6c3f276efb7c041af3220cb013ff8cb1)
- [`OXUI-1180`](https://jira.open-xchange.com/browse/OXUI-1180): As a user I have more flexibility when creating an email reminder [`63bc676`](https://gitlab.open-xchange.com/frontend/ui/commit/63bc676df807d89a36e170a153934c2aeec67ad1)
- As a user I can see a comprehensive list of changes in Whats New [`e1e01e8`](https://gitlab.open-xchange.com/frontend/ui/commit/e1e01e877ac28a9858f07363b4f9df4b97ba4148)

### Changed

- Change storage location of url.key from cookie to jslob [`d5b3ef7`](https://gitlab.open-xchange.com/frontend/ui/commit/d5b3ef7d49a9a9be9ce3479e0482ce586fd51243)
- [`OXUI-1149`](https://jira.open-xchange.com/browse/OXUI-1149): mobile calendar behavior [`083a638`](https://gitlab.open-xchange.com/frontend/ui/commit/083a6386218b95a4fc5d8e799ddfbd3fe9203613)
- Change appointment colors for better distinction [`ee0969a`](https://gitlab.open-xchange.com/frontend/ui/commit/ee0969a9fcaf7e66ee06293b56809c313afb786f)
- Change getViewOptions so that mail folders inherit sort options from parent folders [`085afed`](https://gitlab.open-xchange.com/frontend/ui/commit/085afed9876e4383d732ced503f4612c49a80b8b)
- Change that certain features can be loaded immediately when setting delay to zero [`c78bbaa`](https://gitlab.open-xchange.com/frontend/ui/commit/c78bbaabb96451b0b1d7f8aacdc6db739b16611b)
- Meeting countdown is available as a feature by default [`cbb200b`](https://gitlab.open-xchange.com/frontend/ui/commit/cbb200b7f9178964f429510035237c81f8408825)
- The option "Participants can make changes" (edit appointment) is disabled if the only attendee is the organizer [`d69bd43`](https://gitlab.open-xchange.com/frontend/ui/commit/d69bd437d337a0d76b702fe4a64cb9fbc94f3323)

### Deprecated

- Unused/empty module `io.ox/settings/accounts/email/model` [`a5326c0`](https://gitlab.open-xchange.com/frontend/ui/commit/a5326c0edba5511b561c8a6ed0675751a27b9c66)
- Unused/empty module `io.ox/settings/accounts/settings/defaults` [`ead4753`](https://gitlab.open-xchange.com/frontend/ui/commit/ead47531d29b92b20b49b9447189530e8d388649)
- Unused object 'api.TabHandling' and wrapper function for 'api.createUrl' [`015193b`](https://gitlab.open-xchange.com/frontend/ui/commit/015193b3dd82ce190b811033f98a3de559ac7552)
- Unused `getGroup` from mail/compose/util.js [`0229f19`](https://gitlab.open-xchange.com/frontend/ui/commit/0229f194c8697978379fb7b6794c12d4cf62120e)

### Fixed

- [`OXUI-1159`](https://jira.open-xchange.com/browse/OXUI-1159): Topbar logo alignment for all possible cases [`9aff571`](https://gitlab.open-xchange.com/frontend/ui/commit/9aff5710dd839e7b44c3b2c15921e58347a47241)
    - Logo is now properly aligned with the sidebar
    - If no other action is configured, a click on the topbar logo now opens the default app
- [`OXUI-1186`](https://jira.open-xchange.com/browse/OXUI-1186): What's New dialog for mobile devices [`9566462`](https://gitlab.open-xchange.com/frontend/ui/commit/9566462ca9807f544984fbf7ed424a150716157b)
- [`OXUIB-2107`](https://jira.open-xchange.com/browse/OXUIB-2107): isValidMailAddress does not properly validate domain part [`dde6937`](https://gitlab.open-xchange.com/frontend/ui/commit/dde69372cf3bd0964a3dfa6447cc6989f446b97f)
  - Validation is now by default more strict about domain names
  - Added some toggles to adjust domain validation:
    - validation/emailAddress/idn (default: true) to allow international domain names
    - validation/emailAddress/puny (default: true) to allow punycode syntax
    - validation/emailAddress/fallback (default: false) for a simple TLD check
    - validation/emailAddress/ip (default: true) to toggle IP addresses as valid domain part
    - validation/emailAddress/dotless (default: false) to allow domains like localhost
- [`OXUIB-2175`](https://jira.open-xchange.com/browse/OXUIB-2175): Empty categories shown for some contacts (2) [`ffdfec9`](https://gitlab.open-xchange.com/frontend/ui/commit/ffdfec96af3680789ebf6579fad5a25cf35bea57)
- [`OXUIB-2175`](https://jira.open-xchange.com/browse/OXUIB-2175): Empty categories shown for some contacts [`e57a484`](https://gitlab.open-xchange.com/frontend/ui/commit/e57a4847d0a47bb307d5988e3b754ff6599ad718)
- [`OXUIB-2191`](https://jira.open-xchange.com/browse/OXUIB-2191): Sharing dialog instantly resizes on first show [`6c26e1f`](https://gitlab.open-xchange.com/frontend/ui/commit/6c26e1fb4162c832e221cc670ccd374632675a35)
- [`OXUIB-2193`](https://jira.open-xchange.com/browse/OXUIB-2193): "Move task" dialog uses wrong text color for active selection [`0439a6b`](https://gitlab.open-xchange.com/frontend/ui/commit/0439a6b7f8f1f70bb2b9a709270fcf8be9200108)
- [`OXUIB-2194`](https://jira.open-xchange.com/browse/OXUIB-2194): Appointments are not updated when Calendar is in search mode [`2c2cd2e`](https://gitlab.open-xchange.com/frontend/ui/commit/2c2cd2e63745ba4806ebf004e5fab7d975639b67)
- [`OXUIB-2195`](https://jira.open-xchange.com/browse/OXUIB-2195): Copy link does not work in "Call" dialog [`ce1daec`](https://gitlab.open-xchange.com/frontend/ui/commit/ce1daec58166ddae089ddc92db2a7abce3d4d31d)
- [`OXUIB-2197`](https://jira.open-xchange.com/browse/OXUIB-2197): Vacation notice is overlapping the info box in list view [`ae26ecd`](https://gitlab.open-xchange.com/frontend/ui/commit/ae26ecd2450383c63c4740222cd77623b5943d9f)
- [`OXUIB-2198`](https://jira.open-xchange.com/browse/OXUIB-2198): Empty RSS widgets can be added to portal [`f088a44`](https://gitlab.open-xchange.com/frontend/ui/commit/f088a449184e392a16049d9221ad3a68b76181fb)
- [`OXUIB-2202`](https://jira.open-xchange.com/browse/OXUIB-2202): Mail compose attachment section always shows scrolling indicator [`0359112`](https://gitlab.open-xchange.com/frontend/ui/commit/0359112fb2c359704cec8eb1aadc4913f3a43bd2)
- [`OXUIB-2203`](https://jira.open-xchange.com/browse/OXUIB-2203): Planning view opened from appointment create should not offer "save as distribution list" [`d865fb8`](https://gitlab.open-xchange.com/frontend/ui/commit/d865fb8528dbf1fed27653db9217c8f9d6cdb9ea)
- [`OXUIB-2204`](https://jira.open-xchange.com/browse/OXUIB-2204): GDPR export download button causes js error [`31e77f1`](https://gitlab.open-xchange.com/frontend/ui/commit/31e77f192c1f15e0898d4428c63c121d7a48af82)
- [`OXUIB-2208`](https://jira.open-xchange.com/browse/OXUIB-2208): Process subsequent icon not updating in mail filter settings [`2f77dcc`](https://gitlab.open-xchange.com/frontend/ui/commit/2f77dcc07bf51168b906be632a61b479c5cc0787)
- [`OXUIB-2211`](https://jira.open-xchange.com/browse/OXUIB-2211): Calendar categories feature missing / search not intuitive [`18202d3`](https://gitlab.open-xchange.com/frontend/ui/commit/18202d3e511a205b0e5cf65d7b06e17fe4847c4b)
- [`OXUIB-2213`](https://jira.open-xchange.com/browse/OXUIB-2213): Calendar week incorrect for planning view [`9b6e1cd`](https://gitlab.open-xchange.com/frontend/ui/commit/9b6e1cda9355711d3b8a9e6032fc6a656aab4193)
- [`OXUIB-2216`](https://jira.open-xchange.com/browse/OXUIB-2216): Undefined version sent with user feedback [`e3e8f9e`](https://gitlab.open-xchange.com/frontend/ui/commit/e3e8f9eb1e3313332b951ca0350daba3ad700d74)
- [`OXUIB-2219`](https://jira.open-xchange.com/browse/OXUIB-2219): Attendee is not recognized as organizer if URI differs but entity is identical [`cf96186`](https://gitlab.open-xchange.com/frontend/ui/commit/cf96186ab42a1a5af7eaf9f1ea2fb7c1fcec0525)
- [`OXUIB-2226`](https://jira.open-xchange.com/browse/OXUIB-2226): Mail search broken for virtual folder "Unread" [`8ca4105`](https://gitlab.open-xchange.com/frontend/ui/commit/8ca41056d7d2afc5cd6a5eb03c887137f34a650b)
- [`OXUIB-2231`](https://jira.open-xchange.com/browse/OXUIB-2231): Folder tree 'standard-folders' first render contains styled placeholder list element [`5fa44d2`](https://gitlab.open-xchange.com/frontend/ui/commit/5fa44d2bf5b226e1cdeeef9393d6122037226352)
- [`OXUIB-2232`](https://jira.open-xchange.com/browse/OXUIB-2232): Age calculation wrong in notification area [`7a06a2e`](https://gitlab.open-xchange.com/frontend/ui/commit/7a06a2eec68e0b3785996805cdeb3d477d03dc52)
- [`OXUIB-2233`](https://jira.open-xchange.com/browse/OXUIB-2233): Remote resources are loaded in print view on multi selection [`cda5eb7`](https://gitlab.open-xchange.com/frontend/ui/commit/cda5eb7f74905708916b1cda322e6dade822bde6)
- [`OXUIB-2238`](https://jira.open-xchange.com/browse/OXUIB-2238): Participant column is not aligned with timeline [`839b88d`](https://gitlab.open-xchange.com/frontend/ui/commit/839b88d90b21271e85fb3fc869b768e6e66ee55c)
- [`OXUIB-2247`](https://jira.open-xchange.com/browse/OXUIB-2247): "PasswordViewToggle" component behavior and look [`6eb88e9`](https://gitlab.open-xchange.com/frontend/ui/commit/6eb88e94f4ce31c60487cc585b4d1183e1dff675)
- [`OXUIB-2256`](https://jira.open-xchange.com/browse/OXUIB-2256):  Broken subscription icon-button in folder tree [`da9f5ea`](https://gitlab.open-xchange.com/frontend/ui/commit/da9f5ea1ce5c9d6d86f14d4dd9c09a3107f5765b)
- Added missing ox.root to logging URL [`ee9efb8`](https://gitlab.open-xchange.com/frontend/ui/commit/ee9efb879e7cd1f93809f4da67461395bbcaf037)
- Image loading for categories in search dropdown [`2feb5fa`](https://gitlab.open-xchange.com/frontend/ui/commit/2feb5fa2eb5fb0acd60d10c84e65fd62ac8b0dab)
- Layout issues in WhatsNew/Updates dialog on mobile [`f3a5d4c`](https://gitlab.open-xchange.com/frontend/ui/commit/f3a5d4c60ddb55e23826ca7504b65c04e4c3c245)


## [8.10.0] - 2023-02-10

### Added

- [`OXUI-1122`](https://jira.open-xchange.com/browse/OXUI-1122): Users might not understand how to simply search for words [`550c845`](https://gitlab.open-xchange.com/frontend/ui/commit/550c845723ab23cfd7d9bda4b2dc2dd2b200e7e2)
  - A default row in the suggestion dropdown adds a "contains" suggestion
  - The action does the same as just hitting enter in the search field without using any filter
- [`OXUI-1137`](https://jira.open-xchange.com/browse/OXUI-1137): As a user I see the relative time until an appointment starts [`4d3305d`](https://gitlab.open-xchange.com/frontend/ui/commit/4d3305d798c9cae37b4cb89c901da487f94b463a)
- Show maps icon in appointment location to open map services like Google or Apple maps [`7bf58d5`](https://gitlab.open-xchange.com/frontend/ui/commit/7bf58d549c96278644a1872a539b348dee3461b2)
- [`OXUI-1123`](https://jira.open-xchange.com/browse/OXUI-1123) - Online Help supports feature toggles [`5de654b`](https://gitlab.open-xchange.com/frontend/ui/commit/5de654bdec82e0199d5a3e80f0ab7ad098fafbe2)
- [`OXUI-1121`](https://jira.open-xchange.com/browse/OXUI-1121): UI retries failing HTTP request automatically [`f6f99f7`](https://gitlab.open-xchange.com/frontend/ui/commit/f6f99f72e8af25eb98c5544443d1369a40f1dba4)
  - If the user has a shaky connection or the server has some hickups, UI instantly reported a missing connection
  - Requests will now be retried up to 3 times with a increasing delay of some seconds
- Simple logging for missing configuration during boot [`7f6cf10`](https://gitlab.open-xchange.com/frontend/ui/commit/7f6cf10aaf09fab76af42c3d88a0bb1f504149a2)
- [`OXUI-1126`](https://jira.open-xchange.com/browse/OXUI-1126): Connect device wizard option 'Email, Contacts & Calendar' for iOS and macOS to get a profile that contains all data for all three clients [`538100bb`](https://gitlab.open-xchange.com/frontend/ui/commit/538100bbf4714e9f2a270ebc20746512ae0c1cea)

### Changed

- **Breaking change:** Simplify createIcon [`e36ca7a`](https://gitlab.open-xchange.com/frontend/ui/commit/e36ca7ac4cebf56885a01fbc387205ebb012f61c)
  - Deprecate options parameter, as it's simply not needed
  - Add 'load' event to the icon element
- Sort appointment participants by confirmation status first, name second [`c7d58f4`](https://gitlab.open-xchange.com/frontend/ui/commit/c7d58f42be4f30c89764cd2c0c78b501b24dcf7e)
- Change mail categories towards a cleaner appearance [`35fa915`](https://gitlab.open-xchange.com/frontend/ui/commit/35fa915bff8b62c0fb8caf224947ca857661f6fc)
- **Breaking change:** [`OXUI-1024`](https://jira.open-xchange.com/browse/OXUI-1024): Upgrade socket-io client to v4.5.4 [`acc78c7`](https://gitlab.open-xchange.com/frontend/ui/commit/acc78c78c5e415a28771698a9b1a16bfce8d3771)
- Reflect user's current status in confirmation buttons (accept, maybe, decline) in appointment detail views [`be64de5`](https://gitlab.open-xchange.com/frontend/ui/commit/be64de543e0499374c714810be94ea62d82d6ff6)
- Update focus styles to conform to upcoming WCAG 2.2 [`5bbcbc6`](https://gitlab.open-xchange.com/frontend/ui/commit/5bbcbc66042dc1b180251dd2fc647aaaf6be3dfc)
- [`OXUI-1140`](https://jira.open-xchange.com/browse/OXUI-1140): Ask for mailto registration at most once in a week [`4a43732`](https://gitlab.open-xchange.com/frontend/ui/commit/4a43732f850caee0256871d65659f793791f697e)
- Use os-specific icons in "Connect your device" wizard [`0ef55fa`](https://gitlab.open-xchange.com/frontend/ui/commit/0ef55fa720cb610fec6ba49f606c3d917f036af0)
- Use light gray for os-specific icons in "Connect your device" wizard [`8111bce`](https://gitlab.open-xchange.com/frontend/ui/commit/8111bcea19bf38934614b4a1b6c75e7a9fe096ea)

### Deprecated

- Options parameter in createIcon function [`cf5fb20`](https://gitlab.open-xchange.com/frontend/ui/commit/cf5fb20797fe4bcd08bea628f32b95857717268a)
- Instances based on `apiFactory` always provide a `search` method [`8aac721`](https://gitlab.open-xchange.com/frontend/ui/commit/8aac721058cef083b231be876d0d99b0eb94593e)

### Removed

- **Breaking change:** Deprecated `EditableAttachmentList`. Please use `mini-views/attachments` instead [`0e669bd`](https://gitlab.open-xchange.com/frontend/ui/commit/0e669bd5ee08cae3cbc8a8b0d4cdcd6020d5f3cb)
- **Breaking change:** Deprecated `io.ox/core/notifications.js` [`6ac60db`](https://gitlab.open-xchange.com/frontend/ui/commit/6ac60db4ba2ac6222d54929fa3c35c8867df73e8)

### Fixed

- [`OXUIB-1569`](https://jira.open-xchange.com/browse/OXUIB-1569): Autocomplete sometimes not showing desired contacts [`0b1f706`](https://gitlab.open-xchange.com/frontend/ui/commit/0b1f706e535efa9da408e0d9498edf89def38f70)
- [`OXUIB-2033`](https://jira.open-xchange.com/browse/OXUIB-2033): XSS at Tumblr portal widget due to missing content sanitization [`1de2ede`](https://gitlab.open-xchange.com/frontend/ui/commit/1de2edeeed18dec73d4ada72913e228fdfa77815)
- [`OXUIB-2127`](https://jira.open-xchange.com/browse/OXUIB-2127): Error when editing group members [`731c2cf`](https://gitlab.open-xchange.com/frontend/ui/commit/731c2cf43d48302d0c3c0675493bfdc03e5f5947)
- [`OXUIB-2136`](https://jira.open-xchange.com/browse/OXUIB-2136): Mail sender and avatar is sometimes wrong [`eb56e73`](https://gitlab.open-xchange.com/frontend/ui/commit/eb56e73dbd3b5edc641d428ff51dae5672308ed0)
- [`OXUIB-2137`](https://jira.open-xchange.com/browse/OXUIB-2137): Different due dates for the same task [`f365877`](https://gitlab.open-xchange.com/frontend/ui/commit/f3658772dea64a234bf056ac3b54ab0cfacc0356)
- [`OXUIB-2139`](https://jira.open-xchange.com/browse/OXUIB-2139): Deep links for appointments don't cover recurrence [`6e3b384`](https://gitlab.open-xchange.com/frontend/ui/commit/6e3b3840d33f0c14ead96ceea80df115881aebad)
- [`OXUIB-2143`](https://jira.open-xchange.com/browse/OXUIB-2143): Screen flashes in dark mode during ox.load [`71440d4`](https://gitlab.open-xchange.com/frontend/ui/commit/71440d401bbc0d9913384ba7b2b9608aa31dbe05)
- [`OXUIB-2145`](https://jira.open-xchange.com/browse/OXUIB-2145): Tokenfield length and offset get wrong calculated [`7fdf704`](https://gitlab.open-xchange.com/frontend/ui/commit/7fdf70427348d0e6ea31ca174d5fa240978a8b7e)
- [`OXUIB-2146`](https://jira.open-xchange.com/browse/OXUIB-2146): Calendar-edit: Dropzone has wrong z-index after a resource got added [`7539fb4`](https://gitlab.open-xchange.com/frontend/ui/commit/7539fb4cc1c362c3c5107563e04cb084aae99172)
- [`OXUIB-2148`](https://jira.open-xchange.com/browse/OXUIB-2148): Printing a short mail always creates two pages in print preview [`2921ae5`](https://gitlab.open-xchange.com/frontend/ui/commit/2921ae5f04027a790617250d60347c55e7b15618)
- [`OXUIB-2149`](https://jira.open-xchange.com/browse/OXUIB-2149): Add from drive shown for PIM objects without infostore capability [`b83f614`](https://gitlab.open-xchange.com/frontend/ui/commit/b83f614a84f77dfa7587273c41a3d1648217bfcb)
- [`OXUIB-2150`](https://jira.open-xchange.com/browse/OXUIB-2150): Mailfilter allows too many catchall redirect addresses [`f770520`](https://gitlab.open-xchange.com/frontend/ui/commit/f770520de6b397a042182abccffdc8d3fb7b3f71)
- [`OXUIB-2155`](https://jira.open-xchange.com/browse/OXUIB-2155): Refresh interval in settings has strange location [`b1c7e49`](https://gitlab.open-xchange.com/frontend/ui/commit/b1c7e493937c5ca2420059ee86c6d92b88658795)
- [`OXUIB-2156`](https://jira.open-xchange.com/browse/OXUIB-2156): getLanguage() on login page ignores chosen language [`802c1e1`](https://gitlab.open-xchange.com/frontend/ui/commit/802c1e1a8ea8982a1a3cd32d7889c3f027b0e30d)
- [`OXUIB-2157`](https://jira.open-xchange.com/browse/OXUIB-2157): Email body not fully shown sometimes [`83ea53a`](https://gitlab.open-xchange.com/frontend/ui/commit/83ea53a6d6affcaac316951fbb107d1166f92ec8)
- [`OXUIB-2159`](https://jira.open-xchange.com/browse/OXUIB-2159): Unread indicator not rendered when App Suite gets started in another app than Mail [`8ca76da`](https://gitlab.open-xchange.com/frontend/ui/commit/8ca76da8ab4e257329c1ceff900d12fffda6aa71)
- [`OXUIB-2160`](https://jira.open-xchange.com/browse/OXUIB-2160): Missing auto-select of first list-view item when using keyboard [`0385b3b`](https://gitlab.open-xchange.com/frontend/ui/commit/0385b3b7c9238a93d9b96f7b25e9e7449abd020a)
- [`OXUIB-2161`](https://jira.open-xchange.com/browse/OXUIB-2161): Mail tokens overlap further inputs if there isn’t enough space [`8e6823b`](https://gitlab.open-xchange.com/frontend/ui/commit/8e6823b990b0be9684fc09e2945b15f81e201d9c)
- [`OXUIB-2164`](https://jira.open-xchange.com/browse/OXUIB-2164): Irregular sorting display within Drive folders [`f721613`](https://gitlab.open-xchange.com/frontend/ui/commit/f7216133647a139caa62eb1d7a73245c76f8b45b)
- [`OXUIB-2167`](https://jira.open-xchange.com/browse/OXUIB-2167): Guard mails can not be printed [`a91524b`](https://gitlab.open-xchange.com/frontend/ui/commit/a91524bb1fe0ba32750a075328ad247b840f5f3d)
- [`OXUIB-2169`](https://jira.open-xchange.com/browse/OXUIB-2169): Broken overflow in advanced search [`addc462`](https://gitlab.open-xchange.com/frontend/ui/commit/addc462270a3f11a17f1c931e8b3fc51811aa084)
- [`OXUIB-2170`](https://jira.open-xchange.com/browse/OXUIB-2170): Label "Languages" is invisible on mobile login page [`1d71cce`](https://gitlab.open-xchange.com/frontend/ui/commit/1d71cce1a3f005030151fac493309b3e1097dd97)
- [`OXUIB-2171`](https://jira.open-xchange.com/browse/OXUIB-2171): Runtime error when canceling closing appointment dialog by hitting escape [`88b92c7`](https://gitlab.open-xchange.com/frontend/ui/commit/88b92c70e35b0ea1f67928f723e7235ba1efdb29)
- [`OXUIB-2173`](https://jira.open-xchange.com/browse/OXUIB-2173): Errors in halo view [`8434a48`](https://gitlab.open-xchange.com/frontend/ui/commit/8434a483e2d25fcf2184966796ef2e7d898cc1e8)
- [`OXUIB-2174`](https://jira.open-xchange.com/browse/OXUIB-2174): Appointment opens unexpectedly in mobile calendar list view [`06b7098`](https://gitlab.open-xchange.com/frontend/ui/commit/06b7098973bfc838b00c023c9f55553932b1b652)
- [`OXUIB-2180`](https://jira.open-xchange.com/browse/OXUIB-2180): Cut off letter "g" in messages when using Firefox [`675a997`](https://gitlab.open-xchange.com/frontend/ui/commit/675a997b1febe9bd9bcf7e5c02c64689744514cc)
- [`OXUIB-2189`](https://jira.open-xchange.com/browse/OXUIB-2189): Missing translation on login error without credentials [`90a08cb`](https://gitlab.open-xchange.com/frontend/ui/commit/90a08cbc3730e3c0b5ad2773d24573dfdc530c70)
- [`OXUIB-2190`](https://jira.open-xchange.com/browse/OXUIB-2190): Using quotes in folder names breaks during rename [`3b5ba78`](https://gitlab.open-xchange.com/frontend/ui/commit/3b5ba784bff933ff2037df6af3d2f1cf7cf78309)
- Restore focus of onboarding dialog [`ca9f6a2`](https://gitlab.open-xchange.com/frontend/ui/commit/ca9f6a2acf46b68da01f65116faa903509e1558a)

## [8.9.0] - 2023-01-13

### Added

- [`OXUI-1040`](https://jira.open-xchange.com/browse/OXUI-1040): As a user I can see resources in my calendar views [`3a0eecd`](https://gitlab.open-xchange.com/frontend/ui/commit/3a0eecd986e6ad6c3c4a9b11b52a1173ba2f2a1f)
  - Users can add resource calendars, which represent a booking plan of a given resource
  - Users can organize those resource calendars in resource calendar groups
  - New resource calendars are added to a general resource group called `Resources` by default
  - Selected resources in a resource calendar group get added as participants when creating a new appointment
  - New Setting:
    - `io.ox/core//features/resourceCalendars` as feature toggle. Defaults to `false`.
- [`OXUI-1096`](https://jira.open-xchange.com/browse/OXUI-1096): Close Help window on esc [`b486df9`](https://gitlab.open-xchange.com/frontend/ui/commit/b486df9be203e9807b364c668290e8204856f19d)
- Illustration for boot error message [`459c113`](https://gitlab.open-xchange.com/frontend/ui/commit/459c11322b7769f91a6927d6f663b7f4e967a500)
- Translations for 8.9 [`9888fff`](https://gitlab.open-xchange.com/frontend/ui/commit/9888fff62ec1346c3f81d5d9d5abf8d9bfc8343a)

### Removed

- Jest mock plugins / Vite and @esbuild-plugins/node-modules-polyfill [`d450c38`](https://gitlab.open-xchange.com/frontend/ui/commit/d450c38a913c13e3e6169b7a5b557d73d7559432)
- Vite HTML Plugin [`f124ca6`](https://gitlab.open-xchange.com/frontend/ui/commit/f124ca6e3177ddbf994b635fdc15cdd1f3b190b6)
- Unused http-proxy module [`6d18a5a`](https://gitlab.open-xchange.com/frontend/ui/commit/6d18a5a750cf31066f8d85372d22c70a7f7c6649)
- Deprecated and unused `$.icon` [`8fdf9de`](https://gitlab.open-xchange.com/frontend/ui/commit/8fdf9def0c0af916e326bd551f3baa563515b297)
- Deprecated event `backendError` of `ExtendedModel` [`c10c04b`](https://gitlab.open-xchange.com/frontend/ui/commit/c10c04bba398d9dcef80a330fc7f46b0e2bde85f)
- Deprecated default export of `core/api/sub.js` [`4ab8654`](https://gitlab.open-xchange.com/frontend/ui/commit/4ab8654202bb82731a32a7036040cb3cb00f7ebf)
- Deprecated second param `xhr` used when rejecting jQueries deferred objects on failing ajax calls via `http.js` [`0d749bd`](https://gitlab.open-xchange.com/frontend/ui/commit/0d749bd3c7a1d3c9621396712036858b9cec6509)

### Fixed

- [`OXUIB-1235`](https://jira.open-xchange.com/browse/OXUIB-1235): Repeatedly adding the same attachments from current compose dialog (all attachments) throws error [`bc20d90`](https://gitlab.open-xchange.com/frontend/ui/commit/bc20d903d7b00a15a8aba53c9dc9cbe1ad2a05a8)
- [`OXUIB-1934`](https://jira.open-xchange.com/browse/OXUIB-1934): For accessibility reasons a page should contain a level-one heading. Enable axe-core rule 'page-has-heading-one' [`ba34a58`](https://gitlab.open-xchange.com/frontend/ui/commit/ba34a5833eb49148d8d29a201d0a0065f7f5b543)
- [`OXUIB-2077`](https://jira.open-xchange.com/browse/OXUIB-2077): Overwrite core translations for certain dictionaries [`57ccb92`](https://gitlab.open-xchange.com/frontend/ui/commit/57ccb92053139b225c2be236f99c1355e28728d0)
- [`OXUIB-2089`](https://jira.open-xchange.com/browse/OXUIB-2089): Show error message when uploaded avatar image is too large or malformed [`3e48685`](https://gitlab.open-xchange.com/frontend/ui/commit/3e4868500df711c884debb130f6223a727a534d2)
- [`OXUIB-2091`](https://jira.open-xchange.com/browse/OXUIB-2091): Unread counter of virtual/all-unseen folder is empty [`8669431`](https://gitlab.open-xchange.com/frontend/ui/commit/8669431ddb0bae8d427554c342792b9cb4a02961)
- [`OXUIB-2104`](https://jira.open-xchange.com/browse/OXUIB-2104): Update banner always appears again on updates [`f482942`](https://gitlab.open-xchange.com/frontend/ui/commit/f4829420cb0883a80001279db87dcf2e2bd3f4e7)
- [`OXUIB-2110`](https://jira.open-xchange.com/browse/OXUIB-2110): Search bar is drawn multiple times when quickly switching apps before app is loaded completely [`b8f129e`](https://gitlab.open-xchange.com/frontend/ui/commit/b8f129e326ba253f6bfa739704ba39e5756b5efa)
- [`OXUIB-2111`](https://jira.open-xchange.com/browse/OXUIB-2111): Top right bar is not shown when using an iPad in portrait mode [`1da058c`](https://gitlab.open-xchange.com/frontend/ui/commit/1da058c6c139afe29dfc624f8d2e28be97c55f04)
- [`OXUIB-2112`](https://jira.open-xchange.com/browse/OXUIB-2112): In the Address Book app contact icons disappear from distribution lists [`2282044`](https://gitlab.open-xchange.com/frontend/ui/commit/228204453765513679d52ee0852ef904dbd42494)
- [`OXUIB-2113`](https://jira.open-xchange.com/browse/OXUIB-2113): Preview of video files attached to emails doesn't open [`c629f56`](https://gitlab.open-xchange.com/frontend/ui/commit/c629f5667cca626806113642c9b53973f8a56c01)
- [`OXUIB-2115`](https://jira.open-xchange.com/browse/OXUIB-2115): Selecting text in compose jumping to wrong anchor [`51412b3`](https://gitlab.open-xchange.com/frontend/ui/commit/51412b3c31d36fa28bc3dc612be9fa0b52725524)
- [`OXUIB-2116`](https://jira.open-xchange.com/browse/OXUIB-2116): Theme configuration: defaultAccent does not accept fractional values [`b9d766a`](https://gitlab.open-xchange.com/frontend/ui/commit/b9d766aa2be48d55c745755308e5100995ca6132)
- [`OXUIB-2117`](https://jira.open-xchange.com/browse/OXUIB-2117): Scrolling in search results breaks layout [`2bfaf2f`](https://gitlab.open-xchange.com/frontend/ui/commit/2bfaf2f51b56910276ee932d98198abfd98e4ce8)
- [`OXUIB-2121`](https://jira.open-xchange.com/browse/OXUIB-2121): Incorrect calendar week displayed when selecting specific day in mini calendar [`b81e939`](https://gitlab.open-xchange.com/frontend/ui/commit/b81e939ca1d4f44e58a029f01e90fdd5ef56274e)
- [`OXUIB-2122`](https://jira.open-xchange.com/browse/OXUIB-2122): Solarized theme: Broken visible selection for non-focused list items [`6b750a5`](https://gitlab.open-xchange.com/frontend/ui/commit/6b750a56466a44bad5075c7560b2cc8517eb1d2e)
- [`OXUIB-2123`](https://jira.open-xchange.com/browse/OXUIB-2123): Notification areas red dot for birthday is shown again after refresh [`c50b3a7`](https://gitlab.open-xchange.com/frontend/ui/commit/c50b3a7ca361c4a21dd0cd09af5b64816fe2798e)
- [`OXUIB-2125`](https://jira.open-xchange.com/browse/OXUIB-2125): UI doesn't ask me anymore whether I want to change the series or just the appointment [`63a46bc`](https://gitlab.open-xchange.com/frontend/ui/commit/63a46bcf61a3404860b4229970ac544d2101262e)
- [`OXUIB-2126`](https://jira.open-xchange.com/browse/OXUIB-2126): Sorting by folder name in Drive is not working in public files [`dd1eccf`](https://gitlab.open-xchange.com/frontend/ui/commit/dd1eccff828e92cb3930556ab606fc0819714723)
- [`OXUIB-2129`](https://jira.open-xchange.com/browse/OXUIB-2129): Unclear wording in inbox categories configuration dialog [`8803adb`](https://gitlab.open-xchange.com/frontend/ui/commit/8803adbd99faa240d94d5051cbcb2955e7b8ec23)
- [`OXUIB-2130`](https://jira.open-xchange.com/browse/OXUIB-2130): Remote resources are loaded in print view [`8bbfa0a`](https://gitlab.open-xchange.com/frontend/ui/commit/8bbfa0a448b69fe5bd80d4fe972e11bfd0df35ae)
- [`OXUIB-2134`](https://jira.open-xchange.com/browse/OXUIB-2134): Auto-complete doesn't behave as expected when using quotes during search [`b96c7e9`](https://gitlab.open-xchange.com/frontend/ui/commit/b96c7e91461567ba6e4c6d5f8ee0d8f286430193) [`d83602e`](https://gitlab.open-xchange.com/frontend/ui/commit/d83602eaafa549e52913cf7db978d105fd11ed54)
- [`OXUIB-2135`](https://jira.open-xchange.com/browse/OXUIB-2135): Appointment disappears after removing recurrence rule of the series [`fea3b55`](https://gitlab.open-xchange.com/frontend/ui/commit/fea3b55e441078916d9f04c5d313df6a5369520c)
- [`OXUIB-2140`](https://jira.open-xchange.com/browse/OXUIB-2140): Missing actions for multi-selected mails on mobile [`b48367e`](https://gitlab.open-xchange.com/frontend/ui/commit/b48367e20fc88c371190f6f8770ca6b4fb1b219e)
- [`OXUIB-2142`](https://jira.open-xchange.com/browse/OXUIB-2142): Moving an appointment causes it to keep the color on dark-theme toggle [`cb3624b`](https://gitlab.open-xchange.com/frontend/ui/commit/cb3624b3ff61b94a82719a73870771b3f1441009)
- Alignment of trash icon in subscriptions settings pane [`491081d`](https://gitlab.open-xchange.com/frontend/ui/commit/491081dd90232bf2e02dfa82d3faf55bcc64b47e)
- Broken OIDC logout url [`f9b97c4`](https://gitlab.open-xchange.com/frontend/ui/commit/f9b97c4e645310f8d5d522e7e0dc700b3d5edc69)
- Label color in resource settings pane [`f00a9db`](https://gitlab.open-xchange.com/frontend/ui/commit/f00a9db32ce3a418c8f19258133dec27fac03b21)
- Missing save request for core settings when user toggles are changed [`668466c`](https://gitlab.open-xchange.com/frontend/ui/commit/668466c4940a8a3c83e53eecd1256bee1dadd030)
- Translation: Verb to noun for entry call [`475d2df`](https://gitlab.open-xchange.com/frontend/ui/commit/475d2df5a465fb8352d028a172de211366682a4f)


## [8.8.0] - 2022-12-16

### Added

- [`OXUI-812`](https://jira.open-xchange.com/browse/OXUI-812): Address book picker supports resources [`61787f8`](https://gitlab.open-xchange.com/frontend/ui/commit/61787f84496d9a94a67333eaed95ee102f907489)
- [`OXUI-1022`](https://jira.open-xchange.com/browse/OXUI-1022): As a user I can attach files from Drive to PIM objects [`9a8f606b`](https://gitlab.open-xchange.com/frontend/ui/commit/9a8f606bc971e8e6dbb211735d3d16bd24508621)
  - Users can also add drive files to appointments, contacts and tasks
  - A new component for attachments was introduced
  - Attachments share the same look and feel
- [`OXUI-1041`](https://jira.open-xchange.com/browse/OXUI-1041): As a user I can assign categories to PIM objects [`c325168`](https://gitlab.open-xchange.com/frontend/ui/commit/c325168ea9977037fe35b2ad147fc2b188148d11)
  - Users can add multiple categories (with color, name and icon) to appointments, contacts, and tasks
  - Users can search appointments, contacts and tasks by category
  - Users can create, modify, and delete categories, which are saved as a user setting
  - Admins can predefine a list of categories (names, icons and colors) that are shared with all users and cannot be edited or deleted
  - New setting:
    - `io.ox/core//categories/predefined` for administrators to set immutable categories for all users
    - `io.ox/core//categories/userCategories` for end users to save user-configured categories
    - `io.ox/core//features/categories` for turning the feature on and off
- [`OXUI-1058`](https://jira.open-xchange.com/browse/OXUI-1058): Use session storage for session id to speed up login and boot [`d1a25b3`](https://gitlab.open-xchange.com/frontend/ui/commit/d1a25b3ca0fb9475186a1ac9c230a35877aa69de)
- [`OXUI-1070`](https://jira.open-xchange.com/browse/OXUI-1070): Preload mail compose bundle [`7cc934a`](https://gitlab.open-xchange.com/frontend/ui/commit/7cc934a8c88a800cf7973acaf11526205acd36a1)
- [`OXUI-1072`](https://jira.open-xchange.com/browse/OXUI-1072): Preload bundled core code to improve load performance [`c17c1df`](https://gitlab.open-xchange.com/frontend/ui/commit/c17c1df0e4c494bafefb748f3570b25bf9c327b6)
- Add basic unit tests for conference utils [`6082a2d`](https://gitlab.open-xchange.com/frontend/ui/commit/6082a2d3ed3a64623a0a4ded2e7e013a8d63417e)
- [`OXUI-1091`](https://jira.open-xchange.com/browse/OXUI-1091): As a user I get a strong visual reminder on upcoming and starting meetings [`61194bc`](https://gitlab.open-xchange.com/frontend/ui/commit/61194bcbb00a207e87cf4f731b7dfe58c96e61db)
  - This feature helps not to forget the next meeting
  - It's a very prominent top-most popup with a countdown that points at the next meeting or that you're late to the current one
  - It's independent of other reminder concepts

### Changed

- Use consistent labels across apps for subscriptions [`7b753d2`](https://gitlab.open-xchange.com/frontend/ui/commit/7b753d217e1fb4137822f4c91b4a3fc26b89e12e)
- Use more differentiated max-height for modal dialogs [`58c02b0`](https://gitlab.open-xchange.com/frontend/ui/commit/58c02b00a502271cbba5e4ea1e3b7cb99f1ad4c0)
- Use simple section titles in subscription dialog [`96bad97`](https://gitlab.open-xchange.com/frontend/ui/commit/96bad9722681300c48e1ff30a8ed02feabb4eacd)

### Deprecated

- `gettext.format` as it will be removed with 8.10. [`00145b0`](https://gitlab.open-xchange.com/frontend/ui/commit/00145b04a86fdc3f8b612b28a82e38ff4dd03544)
- `io.ox/backbone/disposable` as it will be removed with 8.10 [`18ba496`](https://gitlab.open-xchange.com/frontend/ui/commit/18ba496ac7d9946d99dc8a72c8a69b5ec190cd18)
- `io.ox/core/tk/dialogs` as it will be removed in future release [`7ca4dc0`](https://gitlab.open-xchange.com/frontend/ui/commit/7ca4dc0d16b44068275cbf9a9d9c06e7c900f2d3)
- `ox.manifests` as it will be removed with 8.10. [`805f54f`](https://gitlab.open-xchange.com/frontend/ui/commit/805f54fa5cf52b93afffebae2a44cb08e4b97bfc)
- `ox.withPluginsFor` as it will be removed with 8.10. [`fdbcb3d`](https://gitlab.open-xchange.com/frontend/ui/commit/fdbcb3d3ac82028e405e48ee9067a2095ca1d4ff)
- Action property `action` of type string (reference) as it will be removed with 8.10. [`18f6668`](https://gitlab.open-xchange.com/frontend/ui/commit/18f66686917abb0add2b48afdd22f49fbb2d186d)
- Action property `requires` as it will be removed with 8.10 [`38eb26f`](https://gitlab.open-xchange.com/frontend/ui/commit/38eb26fe5fcf777ad299389248bdf37a87121a9d)
- Manifest manager `isDisabled` function [`66fa3bb`](https://gitlab.open-xchange.com/frontend/ui/commit/66fa3bb3481647b1398d46d9757cf6fa08bf4710)
- Settings modules that defined defaults via a `defaults.js`. Support will be removed with 8.10. [`c2c7e4e`](https://gitlab.open-xchange.com/frontend/ui/commit/c2c7e4e6e55533bdda3b5434a2fb170d1b28aa42)
- Support for registry key `client-onboarding` as it will be removed with 8.10 [`a28b323`](https://gitlab.open-xchange.com/frontend/ui/commit/a28b323b75f3edbb8fcdeeeb7ff49cc30b86a2b4)
- Support for registry key `mail-compose` as it will be removed with 8.10 [`fff082d`](https://gitlab.open-xchange.com/frontend/ui/commit/fff082d9f890a2f524d1da86102a00204e854138)
- Unused `EditableAttachmentList` [`ce256d8`](https://gitlab.open-xchange.com/frontend/ui/commit/ce256d802156ee898fdd4ee2edd79f58e0a56477)

### Removed

- `.io-ox-signature-import` for deprecated signature import [`faf3336`](https://gitlab.open-xchange.com/frontend/ui/commit/faf333682f8dd58593ec9467f9931f81a013872e)
- `contacts/view-form.js` and `contacts/view-form.scss` [`dc8f42c`](https://gitlab.open-xchange.com/frontend/ui/commit/dc8f42c372bb8f33a6c0f6e1e17dc38f2e96a50f)
- `createOldWay` function from attachmentAPI [`0c2e463`](https://gitlab.open-xchange.com/frontend/ui/commit/0c2e463af35f62b752971e0fd389257510834c47)
- `wrapperClass` of fileUploadWidget [`1e3c5b2`](https://gitlab.open-xchange.com/frontend/ui/commit/1e3c5b260f57f7ab1da9f18d53610c130a395dc5)
- Icon dimensions specified by t-shirt size classes (`xs,sm,m,l,xl`) [`2efd81b`](https://gitlab.open-xchange.com/frontend/ui/commit/2efd81b47d609f0ab4a1338c9ac1ca52474de864)
- IE/LegacyEdge support for `permissions` [`fdc0f79`](https://gitlab.open-xchange.com/frontend/ui/commit/fdc0f79ae68086eb7585e9c781d8b9aed4e28385)
- Setting feature `Import  signatures` [`e87148f`](https://gitlab.open-xchange.com/frontend/ui/commit/e87148ffdac89c541b5e3479dbacb705b77f1057)
- Setting `io.ox/calendar//separateExternalParticipantList` [`8d9b004`](https://gitlab.open-xchange.com/frontend/ui/commit/8d9b004451047672361c4f875cf7644caa99a2a8)

### Fixed

- Mail search in attached files was offered although server does not announce its support [`1425be5`](https://gitlab.open-xchange.com/frontend/ui/commit/1425be56b212c6dda0a9153874f032dc7ab3e70e)
  - Also added a new config option to define support independent of capability `SEARCH=X-MIMEPART`
  - `io.ox/mail//search/supports/mimepart=true` (default is false)
- [`DOCS-4576`](https://jira.open-xchange.com/browse/DOCS-4576): Share dialog can be stuck in busy mode on error [`fddde82`](https://gitlab.open-xchange.com/frontend/ui/commit/fddde82b6adb72b4186de91fc4ff68ee77327288)
- [`DOCS-4598`](https://jira.open-xchange.com/browse/DOCS-4598): Print as PDF does not work in OX Documents [`29b73cb`](https://gitlab.open-xchange.com/frontend/ui/commit/29b73cbbabbd2bd78bab3ed0cef84896c6f5883e)
- [`OXUIB-1569`](https://jira.open-xchange.com/browse/OXUIB-1569): Date format in Swedish is broken [`d7e6dc6`](https://gitlab.open-xchange.com/frontend/ui/commit/d7e6dc67990bf0b571c4746830c57ad4bf9c2f01)
- [`OXUIB-1942`](https://jira.open-xchange.com/browse/OXUIB-1942): Chrome's autofill for guard password field also fills search field [`e09e3e4`](https://gitlab.open-xchange.com/frontend/ui/commit/e09e3e4e1bf94696d7c605baa40e04ed0e3a7d9d)
- [`OXUIB-1954`](https://jira.open-xchange.com/browse/OXUIB-1954): Search dropdown draws filters before a search is triggered by the user [`5256aca`](https://gitlab.open-xchange.com/frontend/ui/commit/5256aca3d91ceaf14aa04ecdfd2e153aa5d64706)
  - Draw search filters only on submitting search
  - Consider state of dropdown when applying filters
- [`OXUIB-1985`](https://jira.open-xchange.com/browse/OXUIB-1985): Deleting folder in App Suite primary account results in error message of broken external account [`fb04c87`](https://gitlab.open-xchange.com/frontend/ui/commit/fb04c8766b2b683e4f1aae4c447b6eaa88274c2f)
- [`OXUIB-1996`](https://jira.open-xchange.com/browse/OXUIB-1996), [`OXUIB-1997`](https://jira.open-xchange.com/browse/OXUIB-1997), [`OXUIB-1998`](https://jira.open-xchange.com/browse/OXUIB-1998): Finnish translation fixes [`e44bb27`](https://gitlab.open-xchange.com/frontend/ui/commit/e44bb27b30b738d8563cfcd1e9ece7405217ff1b)
- [`OXUIB-2004`](https://jira.open-xchange.com/browse/OXUIB-2004): Every time the UI is opened, the reload-banner appears [`748dac7`](https://gitlab.open-xchange.com/frontend/ui/commit/748dac7f8ad1131e511d0c866da5e3608b354c76)
- [`OXUIB-2010`](https://jira.open-xchange.com/browse/OXUIB-2010): Incomplete support for side panel-related CSS variables [`c28b12d`](https://gitlab.open-xchange.com/frontend/ui/commit/c28b12d00d3b6c59602caaefe3238b938f6e6a3a)
- [`OXUIB-2039`](https://jira.open-xchange.com/browse/OXUIB-2039) Large logos cause issues in top bar on mobile devices [`3b4b41e`](https://gitlab.open-xchange.com/frontend/ui/commit/3b4b41e4989fb95d7f80120ae5a2290b9890c32a)
- [`OXUIB-2040`](https://jira.open-xchange.com/browse/OXUIB-2040): `ShareView` in Viewer throws TypeError for PIM attachments [`ceab262`](https://gitlab.open-xchange.com/frontend/ui/commit/ceab262b6ef2bbef4f8596f16edbaa3ad9a993ab)
- [`OXUIB-2043`](https://jira.open-xchange.com/browse/OXUIB-2043): Pagination broken in share/permission dialog [`5bf14ea`](https://gitlab.open-xchange.com/frontend/ui/commit/5bf14ead0ad144bc955073f7c66fe31fadc8c915)
- [`OXUIB-2048`](https://jira.open-xchange.com/browse/OXUIB-2048): Unexpected (save point) warning message when changing your contact picture [`d1f9240`](https://gitlab.open-xchange.com/frontend/ui/commit/d1f924006392bc762f0a32f1cdce2efbd01389a7)
- [`OXUIB-2049`](https://jira.open-xchange.com/browse/OXUIB-2049): Appointment time picker not scrolled to time [`7ef3abb`](https://gitlab.open-xchange.com/frontend/ui/commit/7ef3abb3ddec963a850e5dd1cc7ac05ce68d66e7)
- [`OXUIB-2052`](https://jira.open-xchange.com/browse/OXUIB-2052): Insufficient color contrast in list view selected hover [`64ac726`](https://gitlab.open-xchange.com/frontend/ui/commit/64ac726980b91189c1b03cad7379ed9d1e187f24)
- [`OXUIB-2053`](https://jira.open-xchange.com/browse/OXUIB-2053): Dragging appointment might cause wrong rendering [`fc2c09e`](https://gitlab.open-xchange.com/frontend/ui/commit/fc2c09e83fb51945f1376c967aa733294e54b75e)
- [`OXUIB-2054`](https://jira.open-xchange.com/browse/OXUIB-2054): Move button for shared contact should not be shown [`bf9a306`](https://gitlab.open-xchange.com/frontend/ui/commit/bf9a306e745e762acd10682dee77e85e865e29d0)
- [`OXUIB-2058`](https://jira.open-xchange.com/browse/OXUIB-2058): Inconsistent default value for search/minimumQueryLength [`592dfd4`](https://gitlab.open-xchange.com/frontend/ui/commit/592dfd4346718997046854abbf00ee7b5af0c4c2)
- [`OXUIB-2059`](https://jira.open-xchange.com/browse/OXUIB-2059): No contacts anymore after error in "all" action for one folder [`54e849b`](https://gitlab.open-xchange.com/frontend/ui/commit/54e849b142ae5545f30eb4be9e611ebe2d8bccbb)
- [`OXUIB-2061`](https://jira.open-xchange.com/browse/OXUIB-2061): 'Give feedback' text is cut off in french on mobile [`a09f667`](https://gitlab.open-xchange.com/frontend/ui/commit/a09f667091c8882c4d497b49c4700bae496f670e)
- [`OXUIB-2064`](https://jira.open-xchange.com/browse/OXUIB-2064): Original image size not reduced to small/medium/large in Firefox [`39cf0ca`](https://gitlab.open-xchange.com/frontend/ui/commit/39cf0ca528e72a497a38190652c9df42bd01779c)
- [`OXUIB-2066`](https://jira.open-xchange.com/browse/OXUIB-2066): E-Mail statistics sometimes empty [`4a8791e`](https://gitlab.open-xchange.com/frontend/ui/commit/4a8791ebdd5ebddea8c6c45383447054ca3e3162)
- [`OXUIB-2069`](https://jira.open-xchange.com/browse/OXUIB-2069): Editing personal data has no immediate effect [`0df0910`](https://gitlab.open-xchange.com/frontend/ui/commit/0df09108609bb35f9cceb4978c56ebaff6dd029c)
- [`OXUIB-2075`](https://jira.open-xchange.com/browse/OXUIB-2075): Number of mails in flagged folder not automatically shown [`c6c6e56`](https://gitlab.open-xchange.com/frontend/ui/commit/c6c6e560b4c72bb669694fd15cb5b1214c5c3459)
- [`OXUIB-2076`](https://jira.open-xchange.com/browse/OXUIB-2076): Rework of extended about dialog [`cae149b`](https://gitlab.open-xchange.com/frontend/ui/commit/cae149bac844c46a5f9120782c5d53b0daed7ab6)
- [`OXUIB-2078`](https://jira.open-xchange.com/browse/OXUIB-2078): Wrong task progress bar is moving by deleting or marking other tasks as „done“ [`4e7ad24`](https://gitlab.open-xchange.com/frontend/ui/commit/4e7ad240c6ad566879f52cfd90a83d11a127de7f)
- [`OXUIB-2090`](https://jira.open-xchange.com/browse/OXUIB-2090): Injection of CSS imports missing in bundles [`e77b8aa`](https://gitlab.open-xchange.com/frontend/ui/commit/e77b8aaf11b12a03a3c901778bd5cd03a50fcd77)
- [`OXUIB-2092`](https://jira.open-xchange.com/browse/OXUIB-2092): Incorrect time displays in recently changed files widget on Portal in some cases [`8dc3f87`](https://gitlab.open-xchange.com/frontend/ui/commit/8dc3f87a7280cb035ff6c077dc35772d33121edb)
- [`OXUIB-2093`](https://jira.open-xchange.com/browse/OXUIB-2093): Search autocomplete does not close [`92ccf62`](https://gitlab.open-xchange.com/frontend/ui/commit/92ccf62022d798a4f18f993cd8080f8086e47b9d)
- [`OXUIB-2096`](https://jira.open-xchange.com/browse/OXUIB-2096): Connection security shows 'None' in UI for internal account even if connection is secure [`ed5e260`](https://gitlab.open-xchange.com/frontend/ui/commit/ed5e2606f1e135f82e541112896cd14cd98ee090)
- [`OXUIB-2098`](https://jira.open-xchange.com/browse/OXUIB-2098): Connect your device - calendar and address book missing for windows [`b6031c8`](https://gitlab.open-xchange.com/frontend/ui/commit/b6031c8f20297c62d249e8de2618c0680c096ed1)
- [`OXUIB-2099`](https://jira.open-xchange.com/browse/OXUIB-2099): Forward and reply indicators are barely visible in selected mails [`c64ec35`](https://gitlab.open-xchange.com/frontend/ui/commit/c64ec352d4bfad9866ec6d8117a3a72686d970bb)
- [`OXUIB-2100`](https://jira.open-xchange.com/browse/OXUIB-2100): Account sometimes not shown in settings [`0154002`](https://gitlab.open-xchange.com/frontend/ui/commit/015400269f5dec615371c22c2f3c920399e577f8)
- [`OXUIB-2105`](https://jira.open-xchange.com/browse/OXUIB-2105): Signature assignment wrong if signature gets edited [`bd76a4d`](https://gitlab.open-xchange.com/frontend/ui/commit/bd76a4d2c25d6dddcb01ba58da2f721661204281)
- Disable subscription toggle in section 'hidden' [`2e055bb`](https://gitlab.open-xchange.com/frontend/ui/commit/2e055bb2a01c050fecf4624b96a3c1a06240e890)
- Incorrectly extracted join links in case location ends with url and description is not empty [`0a938b6`](https://gitlab.open-xchange.com/frontend/ui/commit/0a938b66c40b270c144dc9505e8335cc086e5584)
- Selection colors in Solarized theme [`e962bff`](https://gitlab.open-xchange.com/frontend/ui/commit/e962bff91b6dc09facf4b6a7455ddcb610cd243c)
- Use correct tooltip in subscription dialog for toggle action [`ba26b23`](https://gitlab.open-xchange.com/frontend/ui/commit/ba26b2352271343050476be9687d213287b5ff6c)
- Use custom product name for Drive consistently [`f5ef45c`](https://gitlab.open-xchange.com/frontend/ui/commit/f5ef45c60923f0dcba7328ccbe3df5faf3d4db30)



## [8.7.0] - 2022-11-11

### Added

- [`OXUI-1026`](https://jira.open-xchange.com/browse/OXUI-1026): Disable SMTP setup and usage for external mail accounts [`cc11942`](https://gitlab.open-xchange.com/frontend/ui/commit/cc119427c9cade5dcb8d3b55922cf4e96c63d93b)
- Introduced first iteration of a tool to detect missing bug fixes in branches [`d5c624b`](https://gitlab.open-xchange.com/frontend/ui/commit/d5c624bd398e33311576afaf259cb60ed3960fee)
- Updated currencies list for Task module [`0e2f5a4`](https://gitlab.open-xchange.com/frontend/ui/commit/0e2f5a48ec4fa046b6edd36c43d6d20dcb52656e)


### Changed

- Add `xhr` to the response object when rejecting deferred in `http.js` [`b335379`](https://gitlab.open-xchange.com/frontend/ui/commit/b33537929f8e34fa55563863a97e5e6606b4a2a2)
- Improve message when more than one `eml` gets imported [`1925267`](https://gitlab.open-xchange.com/frontend/ui/commit/1925267a0e472db8111825ac596d0c760c15503b)
- [`OXUIB-2018`](https://jira.open-xchange.com/browse/OXUIB-2018): Consistent dialog for changing appointment organizer [`e77a62b`](https://gitlab.open-xchange.com/frontend/ui/commit/e77a62b97f1c147ac3fdb7cdfe359450371300b5)

### Deprecated

- Unused `io.ox/core/tk/dialogs` [`23310a1`](https://gitlab.open-xchange.com/frontend/ui/commit/23310a1f31ee9556f598b35c13a0aaed65c9ee72)
- Unused event `backendError` [`533acf6`](https://gitlab.open-xchange.com/frontend/ui/commit/533acf63bd0cc251e568d7601a28d86704c09f62)
- Unused `$.icon` [`5597548`](https://gitlab.open-xchange.com/frontend/ui/commit/5597548d838cf48feea3a168c472a778ce0f26a2)
- Second param `xhr` used when rejecting jQueries deferreds on failing ajax calls via `http.js` [`37c2ea5`](https://gitlab.open-xchange.com/frontend/ui/commit/37c2ea511fabe4c2197f744da01379f8142529ca)
- Unused `io.ox/core/extPatterns/actions.js` [`1deb360`](https://gitlab.open-xchange.com/frontend/ui/commit/1deb360616651233b42aa63aba6ab5514152395e)
- Unused `io.ox/core/extPatterns/links.js` [`99c3f56`](https://gitlab.open-xchange.com/frontend/ui/commit/99c3f567dd7e593c1a25c9af7a5a2c53c3952f9e)
- Unused `io.ox/core/notifications.js` and it's `yell` method. Please use `io.ox/core/yell` directly. [`ff421d6`](https://gitlab.open-xchange.com/frontend/ui/commit/ff421d691204266150cd0efb7e31012283a65b47)
- Direct access to `subscriptions` and `sources` in `core/api/sub.js` [`8286a43`](https://gitlab.open-xchange.com/frontend/ui/commit/8286a432ef9f3e0cf69492e52451d27866ad45e7)

### Removed

- Deprecated and unused `getSmartTime` from `mail/util.js` [`8d725c7`](https://gitlab.open-xchange.com/frontend/ui/commit/8d725c7ead32791e4e3cae709a0d77f1304266bd)
- Deprecated flag picker class `flag-preview` (use class `color-flag` instead) [`a7e29f7`](https://gitlab.open-xchange.com/frontend/ui/commit/a7e29f71bd11992c06e02079dd5b6e2e88f6568e)
- Deprecated and unused `getInitialDefaultSender` from `mail/util.js` [`4c12ace`](https://gitlab.open-xchange.com/frontend/ui/commit/4c12acee24637a1853024c1c41fc7a1f996bc55a)
- Deprecated and unused `dirty` fallback when called without state param [`598f08c`](https://gitlab.open-xchange.com/frontend/ui/commit/598f08ce1da29754ff4ad3cc492ea8218cc077fc)
- Deprecated unused property `ox.base` [`855e8a1`](https://gitlab.open-xchange.com/frontend/ui/commit/855e8a19a10dcd9647303e1c4ff27bd34f6a4cca)

### Fixed

- [`OXUIB-1699`](https://jira.open-xchange.com/browse/OXUIB-1699): Missing ellipsis for some strings in account settings [`eb3a0e0`](https://gitlab.open-xchange.com/frontend/ui/commit/eb3a0e09740983edd69aab12af966b6c650391e1)
- [`OXUIB-1868`](https://jira.open-xchange.com/browse/OXUIB-1868): Camera usage sometimes not suspended after assigning photo to new contact [`adaceff`](https://gitlab.open-xchange.com/frontend/ui/commit/adaceff0cdd787df56bdfa958f0544ae53d7ede6)
- [`OXUIB-1915`](https://jira.open-xchange.com/browse/OXUIB-1915): [A11y] Dark Mode: low contrast action items in contact dialog [`be6d795`](https://gitlab.open-xchange.com/frontend/ui/commit/be6d79596c148e1542c5904f2ddc97af2d654a03)
- [`OXUIB-1921`](https://jira.open-xchange.com/browse/OXUIB-1921): [A11y] Dark mode: periodic update of portal widget causes flickering [`bda122d`](https://gitlab.open-xchange.com/frontend/ui/commit/bda122d134ef40b272c2030390f3a44d792416ae)
- [`OXUIB-1925`](https://jira.open-xchange.com/browse/OXUIB-1925): Chat: Name in Chatlist "disappears" on hover and default icon misaligned [`96f6fe8`](https://gitlab.open-xchange.com/frontend/ui/commit/96f6fe84f4f5d593f3170211c3b4117c442e124d)
- [`OXUIB-1929`](https://jira.open-xchange.com/browse/OXUIB-1929): Mail compose opens "Save draft" dialog if adding a file fails [`8b122aa`](https://gitlab.open-xchange.com/frontend/ui/commit/8b122aa721b2bc5a1ddbda8a55f4a1fb463eecc5)
- [`OXUIB-1942`](https://jira.open-xchange.com/browse/OXUIB-1942): Chromes autofill credentials for guard-password-field also fills search field [`394dd5b`](https://gitlab.open-xchange.com/frontend/ui/commit/394dd5bc3e48c18f93ccf1a58e7d45583419aaa3)
- [`OXUIB-1946`](https://jira.open-xchange.com/browse/OXUIB-1946): Delete dial-in information for zoom meetings only [`9d6070f`](https://gitlab.open-xchange.com/frontend/ui/commit/9d6070f06b2a8d19f17b6f810e429f82c03686ff)
- [`OXUIB-1950`](https://jira.open-xchange.com/browse/OXUIB-1950): The calendar detail-view does not open [`397a940`](https://gitlab.open-xchange.com/frontend/ui/commit/397a940c1e4d42c87b2493aa68b11c8aff9258e7)
- [`OXUIB-1951`](https://jira.open-xchange.com/browse/OXUIB-1951): Unwanted appearance during mail import [`1d4704d`](https://gitlab.open-xchange.com/frontend/ui/commit/1d4704d179413d22d19b584b785a7e7be2a87324)
- [`OXUIB-1953`](https://jira.open-xchange.com/browse/OXUIB-1953): Emptying the folder keeps old counts [`8a9725a`](https://gitlab.open-xchange.com/frontend/ui/commit/8a9725a3d443e20038310519318fe8d787db280f)
- [`OXUIB-1958`](https://jira.open-xchange.com/browse/OXUIB-1958): Insert/Edit Links does not respect dark mode [`30f868c`](https://gitlab.open-xchange.com/frontend/ui/commit/30f868c795e19153cb60ed12d6aba16c3fcf3380)
- [`OXUIB-1959`](https://jira.open-xchange.com/browse/OXUIB-1959): [A11y] Edit mail more options: almost imperceivable focus style [`a8cafeb`](https://gitlab.open-xchange.com/frontend/ui/commit/a8cafeb235cef2ca798b3fc706495bd29f7e5220)
- [`OXUIB-1962`](https://jira.open-xchange.com/browse/OXUIB-1962): Detail views in planning view broken [`c6d7b06`](https://gitlab.open-xchange.com/frontend/ui/commit/c6d7b0600da6eac734152cab80d1c44bf947acb9)
- [`OXUIB-1964`](https://jira.open-xchange.com/browse/OXUIB-1964): Cannot search for some settings [`b2e2f39`](https://gitlab.open-xchange.com/frontend/ui/commit/b2e2f39765e45795f0b1578a0c0208eb6c3e2dd0)
- [`OXUIB-1965`](https://jira.open-xchange.com/browse/OXUIB-1965) Settings search highlights are off when scrollbar is apparent [`0c28c04`](https://gitlab.open-xchange.com/frontend/ui/commit/0c28c04a628f2f304139996c2fd30c15b16b9ba4)
- [`OXUIB-1966`](https://jira.open-xchange.com/browse/OXUIB-1966): Permissions dialog is available for external and secondary accounts but does nothing [`1d673de`](https://gitlab.open-xchange.com/frontend/ui/commit/1d673deda261bec6ab21fd8955d5eabbb82ba40d)
- [`OXUIB-1969`](https://jira.open-xchange.com/browse/OXUIB-1969): Calendar layout issues [`34cd711`](https://gitlab.open-xchange.com/frontend/ui/commit/34cd711c7dd46ec6e4e444423dccace631145a66)
- [`OXUIB-1972`](https://jira.open-xchange.com/browse/OXUIB-1972): Dragging/Resizing an appointment can not be canceled via ESC [`10e6aa4`](https://gitlab.open-xchange.com/frontend/ui/commit/10e6aa4ea1c348ceca1fb89bbee851006c952e00)
- [`OXUIB-1980`](https://jira.open-xchange.com/browse/OXUIB-1980): Move folder not working in Drive [`2572016`](https://gitlab.open-xchange.com/frontend/ui/commit/2572016f71a5c2652698e0ea6e21dd04a6d7778b)
- [`OXUIB-1981`](https://jira.open-xchange.com/browse/OXUIB-1981): "File has been moved" popup after moving a folder [`f5fea8c`](https://gitlab.open-xchange.com/frontend/ui/commit/f5fea8c1f1ca7d2dade1a19228f4beada14380fd)
- [`OXUIB-1986`](https://jira.open-xchange.com/browse/OXUIB-1986): Background color of selected mail does not update when window in background [`478d598`](https://gitlab.open-xchange.com/frontend/ui/commit/478d5985b8ce868916a9f7502e85f49e081756eb)
- [`OXUIB-1990`](https://jira.open-xchange.com/browse/OXUIB-1990): Search doesn't support search queries with explicit quotes [`38ab977`](https://gitlab.open-xchange.com/frontend/ui/commit/38ab9774965ec6f26d760b59cded1a741b10e903)
- [`OXUIB-1991`](https://jira.open-xchange.com/browse/OXUIB-1991): Searching for an email address will not search in mail body [`b0fbe9f`](https://gitlab.open-xchange.com/frontend/ui/commit/b0fbe9f9af7fce1fb3c0d7dd84d776e710c96cbc)
- [`OXUIB-1993`](https://jira.open-xchange.com/browse/OXUIB-1993): Mobile calendar edit view is too small [`5e1e500`](https://gitlab.open-xchange.com/frontend/ui/commit/5e1e500952fb1d5a574f205a16515ccc4d2dcb0e)
- [`OXUIB-1994`](https://jira.open-xchange.com/browse/OXUIB-1994): External account icons missing in subscription dialog [`ea1fec5`](https://gitlab.open-xchange.com/frontend/ui/commit/ea1fec54e719bc99a006fe0161bd2cafda035a1c)
- [`OXUIB-1995`](https://jira.open-xchange.com/browse/OXUIB-1995): Check for availability of subscriptions inconsistent or missing [`b01f7ad`](https://gitlab.open-xchange.com/frontend/ui/commit/b01f7add1e0df6104f3855cbe6f8a763bfb6718f)
- [`OXUIB-2000`](https://jira.open-xchange.com/browse/OXUIB-2000): Contact subscription action shown with no available providers (improvement) [`3428568`](https://gitlab.open-xchange.com/frontend/ui/commit/342856887a2cbe13d2708bcc6af54de77345387d)
- [`OXUIB-2000`](https://jira.open-xchange.com/browse/OXUIB-2000): Contact subscription action shown with no available providers [`1887154`](https://gitlab.open-xchange.com/frontend/ui/commit/1887154bdb81ef8c6e76f5746875a60f550ccf96)
- [`OXUIB-2002`](https://jira.open-xchange.com/browse/OXUIB-2002): 2Factor Authentication dialog not fully localized [`3e3b934`](https://gitlab.open-xchange.com/frontend/ui/commit/3e3b934f13e853f4df17afee0a8b540737c6c034)
- [`OXUIB-2006`](https://jira.open-xchange.com/browse/OXUIB-2006): Broken mail GET call issued from notifications checkNew() function [`44f80ec`](https://gitlab.open-xchange.com/frontend/ui/commit/44f80ec80b4d13aa31d4544bbdbcbbd29aa9fdeb)
- [`OXUIB-2007`](https://jira.open-xchange.com/browse/OXUIB-2007): Mail search might be slow due to certain fields and number of fetched items [`599ff35`](https://gitlab.open-xchange.com/frontend/ui/commit/599ff35ddc80c85296a49b13705d27f160858da4)
- [`OXUIB-2008`](https://jira.open-xchange.com/browse/OXUIB-2008): Email uploads are extremely slow / preview hangs as well [`d5a5564`](https://gitlab.open-xchange.com/frontend/ui/commit/d5a5564d4f5a52929f2f96e8b9c4a10901c13900)
- [`OXUIB-2009`](https://jira.open-xchange.com/browse/OXUIB-2009): Some mail columns possibly slow down mail requests [`dee0259`](https://gitlab.open-xchange.com/frontend/ui/commit/dee025948e6753d50800ce001b13bffcd022f16b)
- [`OXUIB-2011`](https://jira.open-xchange.com/browse/OXUIB-2011): Two logos appear [`8b28749`](https://gitlab.open-xchange.com/frontend/ui/commit/8b287495e62fd5bc1a5d2054eb52fdd1899585d4)
- [`OXUIB-2013`](https://jira.open-xchange.com/browse/OXUIB-2013): Tooltip missing for flagged folder [`d87a0c0`](https://gitlab.open-xchange.com/frontend/ui/commit/d87a0c07eb68093dcc376b0f0e8aa8340bf73f29)
- [`OXUIB-2014`](https://jira.open-xchange.com/browse/OXUIB-2014): Last row in calendar month view halfway missing [`f413043`](https://gitlab.open-xchange.com/frontend/ui/commit/f413043aabad0ec1eda58d55cbf8ca1b4f1eb286)
- [`OXUIB-2015`](https://jira.open-xchange.com/browse/OXUIB-2015): Email with long subject opened in Inbox Widget in Portal App is displayed incorrectly [`a296a10`](https://gitlab.open-xchange.com/frontend/ui/commit/a296a10f138a9fdcb7e6bd403c81eb347b8d92c8)
- [`OXUIB-2016`](https://jira.open-xchange.com/browse/OXUIB-2016): Mobile: Mail folder tree does not close when selecting flagged folder [`6c509fa`](https://gitlab.open-xchange.com/frontend/ui/commit/6c509fa29468ddf5b501a6503df9b2c0f2726643)
- [`OXUIB-2017`](https://jira.open-xchange.com/browse/OXUIB-2017): Search in address book broken depending on current language [`cf3c0b9`](https://gitlab.open-xchange.com/frontend/ui/commit/cf3c0b9e2dcc21c7860afdbf34817783865d1916)
- [`OXUIB-2023`](https://jira.open-xchange.com/browse/OXUIB-2023): JS error with invitation mails for deleted appointments [`858c5d3`](https://gitlab.open-xchange.com/frontend/ui/commit/858c5d3675352138e862f38f1a0c6e7622172ee2)
- [`OXUIB-2025`](https://jira.open-xchange.com/browse/OXUIB-2025): Default search does not find attachments by name [`dd656e6`](https://gitlab.open-xchange.com/frontend/ui/commit/dd656e63a2be62e019b7a882a2cb2a65f96d9b02)
  - Default search did not include attachment names for performance reasons
  - With version 8.7 middleware adds support to search for 'text'
  - Added a version-based feature toggle to add attachments to the default search combining with 'text' for good performance
  - Changed getMiddlewareVersion to return numbers instead of strings ('10' &gt; '7' will fail otherwise)
  - Also added a more convenient isMiddlewareMinVersion(major, minor)
  - Introduced a few new settings:
    - io.ox/mail//search/default/fields. Default=to,cc,bcc,subject,content
    - io.ox/mail//search/default/includeAttachments. Default=true. Requires MW 8.7. and also depends on mail server capability SEARCH=X-MIMEPART
- [`OXUIB-2026`](https://jira.open-xchange.com/browse/OXUIB-2026): Message `Server unreachable` caused by http status code 500 [`fef8907`](https://gitlab.open-xchange.com/frontend/ui/commit/fef8907410681ba9198349c2499a2393a0076b16)
- [`OXUIB-2027`](https://jira.open-xchange.com/browse/OXUIB-2027): Organizer initially not visible when appointment has many participants [`b196c38`](https://gitlab.open-xchange.com/frontend/ui/commit/b196c38cd73a464bdb1a0f2de5c270d8ae5ea737)
- [`OXUIB-2029`](https://jira.open-xchange.com/browse/OXUIB-2029): Contact default search uses a few fields only [`961ce97`](https://gitlab.open-xchange.com/frontend/ui/commit/961ce972ee9ceb83ce4392d0ecd2490035bf6869)
- [`OXUIB-2046`](https://jira.open-xchange.com/browse/OXUIB-2046): Unexpected feature list in "What's new" dialog [`daf63a4`](https://gitlab.open-xchange.com/frontend/ui/commit/daf63a45d0bb88bebd2e44948f89251d4e8a4e8b)
- Broken sync handler of subscription model [`f25b266`](https://gitlab.open-xchange.com/frontend/ui/commit/f25b266508d7da1d2a906e6a4030aeeda8c5137b)
- Show message in subscription dialog when no services are available [`0e13a0c`](https://gitlab.open-xchange.com/frontend/ui/commit/0e13a0c1c5904e7ebc5465f7ed3d9b5166c1ac8e)
- Subject in mail header has wrong font size [`2f114ff`](https://gitlab.open-xchange.com/frontend/ui/commit/2f114ff5115af6ef4d2868c45b80f840b663817b)

### Security

- [`OXUIB-2033`](https://jira.open-xchange.com/browse/OXUIB-2033): XSS at Tumblr portal widget due to missing content sanitization [`7574020`](https://gitlab.open-xchange.com/frontend/ui/commit/75740204f9cb8d42e784a1c855e3d5d8d771af98)


## [8.6.0] - 2022-10-14

### Added

- Alias support for default signatures [`8b7b081`](https://gitlab.open-xchange.com/frontend/ui/commit/8b7b081c123907c399310d8e606ae362ca7ad8fc)
- E2E tests for Group and Resource editor [`7fe12cc`](https://gitlab.open-xchange.com/frontend/ui/commit/7fe12cc3911246c2ea4a4f17102f9126cc9d6eb7)
- export methods to manage open modals and floating windows [`8a0195a`](https://gitlab.open-xchange.com/frontend/ui/commit/8a0195a6396d96cda5efd11f629e442a6577745d)
- [`OXUI-1011`](https://jira.open-xchange.com/browse/OXUI-1011): New icons for several core Apps and App launcher [`76e5283`](https://gitlab.open-xchange.com/frontend/ui/commit/76e5283dfb3b361fb43fe179a2fd428a2e58a3ca)
- [`OXUI-1056`](https://jira.open-xchange.com/browse/OXUI-1056): Measure App Suite performance [`cfad575`](https://gitlab.open-xchange.com/frontend/ui/commit/cfad57537a6f81b1cbf99aba1ad236be7abe200d)
  - introduce marking points using performance API in the browser
  - collect measurements from those marking points using simple e2e test
  - send metrics to metrics service
  - report test duration to metrics service

### Deprecated

- Signature import from OX6 [`a4d2f8c`](https://gitlab.open-xchange.com/frontend/ui/commit/a4d2f8ceae95c70684d61c4198a116f5f193fb5a)
- Unused `contacts/edit/view-form.js` and `contacts/edit/view-form.scss` [`e47e858`](https://gitlab.open-xchange.com/frontend/ui/commit/e47e8585a21bc52d48ed7785be250c15859db0e2)

### Fixed

- [`OXUIB-449`](https://jira.open-xchange.com/browse/OXUIB-449): Language drop-up in footer of login page broke with 7.10.4 [`421e397`](https://gitlab.open-xchange.com/frontend/ui/commit/421e397593a334e3cf7f04a78e4b5351bc440ff9)
- [`OXUIB-1089`](https://jira.open-xchange.com/browse/OXUIB-1089): Missing drivemail auto switch when using drives "send by email" [`6134288`](https://gitlab.open-xchange.com/frontend/ui/commit/6134288fcce86b8288a0f9297bafd886afa74c3a)
- [`OXUIB-1490`](https://jira.open-xchange.com/browse/OXUIB-1490): Menu in detail view called from Portal Inbox widget not aligned [`102abdf`](https://gitlab.open-xchange.com/frontend/ui/commit/102abdf3e5f1c1a29af05e472fbadc4e19d79778)
- [`OXUIB-1676`](https://jira.open-xchange.com/browse/OXUIB-1676): Calendar actions are not always rendered in list view (2) [`5e59733`](https://gitlab.open-xchange.com/frontend/ui/commit/5e597335a566a23062316e8473894965c37a2993)
- [`OXUIB-1714`](https://jira.open-xchange.com/browse/OXUIB-1714): Unexpected and inconsistent success message shown when updating external account [`3c9f2f0`](https://gitlab.open-xchange.com/frontend/ui/commit/3c9f2f0dd2cf4d9537b5262f93aee147c0ce1db4)
- [`OXUIB-1735`](https://jira.open-xchange.com/browse/OXUIB-1735) Reopen: Folders not supplied in request body for chronos?action=advancedSearch [`065891d`](https://gitlab.open-xchange.com/frontend/ui/commit/065891d7be9f872b5b66516f32526202463e6607)
- [`OXUIB-1783`](https://jira.open-xchange.com/browse/OXUIB-1783): Managing autoforward does not allow to remove target address [`c46fddb`](https://gitlab.open-xchange.com/frontend/ui/commit/c46fddbccd3c2b4f2feef5e718204aa51ba2e250)
- [`OXUIB-1786`](https://jira.open-xchange.com/browse/OXUIB-1786): Reply to mailing list misleading [`ee52a17`](https://gitlab.open-xchange.com/frontend/ui/commit/ee52a17a6ad9b95e2e5d88bfa3abf13d0d73259e)
- [`OXUIB-1800`](https://jira.open-xchange.com/browse/OXUIB-1800): Search autocomplete broken when mouse is used to select suggestion [`20022af`](https://gitlab.open-xchange.com/frontend/ui/commit/20022af9efad821a52dd6932efbe6f51b300e5d9), [`d4ae763`](https://gitlab.open-xchange.com/frontend/ui/commit/d4ae7636290797d82fd278031e393f4a5afcd2c7)
- [`OXUIB-1820`](https://jira.open-xchange.com/browse/OXUIB-1820): Notification area has no auto-open option [`26997fd`](https://gitlab.open-xchange.com/frontend/ui/commit/26997fdca08da33f8b725e36c10f35213bb08ad5)
  - add new setting io.ox/core//autoOpenNewReminders, boolean, defaults to false
- [`OXUIB-1827`](https://jira.open-xchange.com/browse/OXUIB-1827): Mail not displayed - content is only visible via view source or as forwarded mail [`0ffbe53`](https://gitlab.open-xchange.com/frontend/ui/commit/0ffbe538cb1c5e73b3388e9320d6b8d594024229), [`7967868`](https://gitlab.open-xchange.com/frontend/ui/commit/796786887d29380f4170feacc78d7072422a328a)
- [`OXUIB-1835`](https://jira.open-xchange.com/browse/OXUIB-1835): Style of multiple selection gets displayed wrong on 'select all' [`7cdcb74`](https://gitlab.open-xchange.com/frontend/ui/commit/7cdcb74ea21f47c846b5c4783b04b0443c92a0c9)
- [`OXUIB-1841`](https://jira.open-xchange.com/browse/OXUIB-1841): Focus ring cut off in chat [`2a00758`](https://gitlab.open-xchange.com/frontend/ui/commit/2a00758f3198abfdfef510a894182236dd0fb2e4)
- [`OXUIB-1849`](https://jira.open-xchange.com/browse/OXUIB-1849): Removing outdated conference links [`c119da6`](https://gitlab.open-xchange.com/frontend/ui/commit/c119da60d5d78e14e030de50d92a946fb6110288)
- [`OXUIB-1852`](https://jira.open-xchange.com/browse/OXUIB-1852): Calendar jumps to wrong week after page reload [`ebe031c`](https://gitlab.open-xchange.com/frontend/ui/commit/ebe031c015ebcc4f23aeee32ab0392dda98b6609)
- [`OXUIB-1865`](https://jira.open-xchange.com/browse/OXUIB-1865): copy sha button in about dialog broken [`1eef444`](https://gitlab.open-xchange.com/frontend/ui/commit/1eef444bf75c7482ea4f2125a73fe190a64e1223)
- [`OXUIB-1869`](https://jira.open-xchange.com/browse/OXUIB-1869): Can not remove image from new contact [`ec2b612`](https://gitlab.open-xchange.com/frontend/ui/commit/ec2b612224c3797766c67def66d92a067a8feb13)
- [`OXUIB-1879`](https://jira.open-xchange.com/browse/OXUIB-1879): Calendar entry not in selected color as created [`f3e5232`](https://gitlab.open-xchange.com/frontend/ui/commit/f3e5232b0d83964f988a7ee7bee1dd8223b9dac2)
- [`OXUIB-1885`](https://jira.open-xchange.com/browse/OXUIB-1885): Folder 'confirmed_spam' not listed in folder tree [`668352b`](https://gitlab.open-xchange.com/frontend/ui/commit/668352be7aa33a251dfde6529c3aa9795570ab4e)
- [`OXUIB-1892`](https://jira.open-xchange.com/browse/OXUIB-1892): Color flag order dropdown changed sind a while (unknown since when) [`d1b49ee`](https://gitlab.open-xchange.com/frontend/ui/commit/d1b49ee9b9ed67fe9dada5e5f83ee09ed1c5c07c)
- [`OXUIB-1894`](https://jira.open-xchange.com/browse/OXUIB-1894): 'Show this calendar only' is not highlighted anymore [`5a55781`](https://gitlab.open-xchange.com/frontend/ui/commit/5a55781d02d766f5a36e91da4407547956e0a7b5)
- [`OXUIB-1895`](https://jira.open-xchange.com/browse/OXUIB-1895): JS error with appointment direct links [`1be5fb1`](https://gitlab.open-xchange.com/frontend/ui/commit/1be5fb1376ec17ba61f878e575973a8cf4702fee)
- [`OXUIB-1898`](https://jira.open-xchange.com/browse/OXUIB-1898): Groups and Resources missing / settings [`1a61b21`](https://gitlab.open-xchange.com/frontend/ui/commit/1a61b21f90c3131bf40983af9fe2a0aa9417629d)
- [`OXUIB-1899`](https://jira.open-xchange.com/browse/OXUIB-1899): Notification view is drawn during boot even it was never opened [`bddc78f`](https://gitlab.open-xchange.com/frontend/ui/commit/bddc78f8ffaf81c9003551f02544b04644b3c53b)
- [`OXUIB-1902`](https://jira.open-xchange.com/browse/OXUIB-1902): Mail search in combination with inbox categories is confusing [`7264741`](https://gitlab.open-xchange.com/frontend/ui/commit/7264741321a3b13e34e835c558b365307f27fb42), [`b198848`](https://gitlab.open-xchange.com/frontend/ui/commit/b198848faafeb0b11bc39eba16dc6aaab848f59c)
- [`OXUIB-1905`](https://jira.open-xchange.com/browse/OXUIB-1905): Contact Popup: Avatar alignment breaks on narrow screens [`67e18a1`](https://gitlab.open-xchange.com/frontend/ui/commit/67e18a1396a00bc9f7e25e01a421b5945479e05c)
- [`OXUIB-1906`](https://jira.open-xchange.com/browse/OXUIB-1906): Device wizard not extensible [`9cb47fb`](https://gitlab.open-xchange.com/frontend/ui/commit/9cb47fb71a8a39b1bb678bc90246a21a14d15e55)
- [`OXUIB-1910`](https://jira.open-xchange.com/browse/OXUIB-1910): Sometimes appointments in calender week view are not drawn at full width [`00155e5`](https://gitlab.open-xchange.com/frontend/ui/commit/00155e57731dd774127a41e832a0ee508ef7c19e)
- [`OXUIB-1911`](https://jira.open-xchange.com/browse/OXUIB-1911): Dark mode: Low-contrast links in html emails [`531c7b9`](https://gitlab.open-xchange.com/frontend/ui/commit/531c7b9e2bad19d37d2c653b7b60c601aa800a2c)
- [`OXUIB-1913`](https://jira.open-xchange.com/browse/OXUIB-1913): Dark mode settings drop down: almost imperceivable focus style [`9a3f865`](https://gitlab.open-xchange.com/frontend/ui/commit/9a3f8654e60c910241e9a8bb5c722ffb4a45cc8b)
- [`OXUIB-1914`](https://jira.open-xchange.com/browse/OXUIB-1914): Number of unread mails doubled when collapsing "Appsuite" [`456fee9`](https://gitlab.open-xchange.com/frontend/ui/commit/456fee93b6e76a9e86066d146b4f0e0956adcc23)
- [`OXUIB-1920`](https://jira.open-xchange.com/browse/OXUIB-1920): Unclosable Dialogs [`f4132a3`](https://gitlab.open-xchange.com/frontend/ui/commit/f4132a314dd2dde0fd1015826396ca3ad8594709)
  - Never ending focus loop caused Ui to become unresponsive
- [`OXUIB-1923`](https://jira.open-xchange.com/browse/OXUIB-1923): Check for possible missing attachments too greedy [`cf3ff60`](https://gitlab.open-xchange.com/frontend/ui/commit/cf3ff60d84a2b874e5c53ca093bbb0ee58d82729)
- [`OXUIB-1927`](https://jira.open-xchange.com/browse/OXUIB-1927): Missing error handling for Jitsi Service [`cca971e`](https://gitlab.open-xchange.com/frontend/ui/commit/cca971e1217c51fe979a1e013f635f0d4bf0e1da)
- [`OXUIB-1928`](https://jira.open-xchange.com/browse/OXUIB-1928): Clicking on "Add from Drive" in mail compose clears URL hash [`b59c2ce`](https://gitlab.open-xchange.com/frontend/ui/commit/b59c2cef2aa2ad481576a3516ede94460b0cf51c)
- [`OXUIB-1930`](https://jira.open-xchange.com/browse/OXUIB-1930): Improve injection of configurable product name for Jitsi in some strings [`1aa9f9d`](https://gitlab.open-xchange.com/frontend/ui/commit/1aa9f9dc6433684b35b168fb4ab0ea265a1c1236)
- [`OXUIB-1931`](https://jira.open-xchange.com/browse/OXUIB-1931): Jitsi settings appear while not enabled [`8471ec2`](https://gitlab.open-xchange.com/frontend/ui/commit/8471ec200d28deaedc0cea270ef892ffa4622679)
- [`OXUIB-1936`](https://jira.open-xchange.com/browse/OXUIB-1936): Tooltip missing for unread folder [`31e7983`](https://gitlab.open-xchange.com/frontend/ui/commit/31e798363edda44e4ac2c570d53ffaa562c38aa1)
- [`OXUIB-1938`](https://jira.open-xchange.com/browse/OXUIB-1938): "My Folder" name missing after account name change [`f895aef`](https://gitlab.open-xchange.com/frontend/ui/commit/f895aef5c849d265912e1b0911a542647c9b213f)
- [`OXUIB-1944`](https://jira.open-xchange.com/browse/OXUIB-1944): Overflow issue with many Inbox Categories [`460e4d6`](https://gitlab.open-xchange.com/frontend/ui/commit/460e4d65dbbd515a262e1b1491d3bd4abdb70a97)
- [`OXUIB-1947`](https://jira.open-xchange.com/browse/OXUIB-1947): Mail search does not search in the selected folder "all" after folder change [`dee844f`](https://gitlab.open-xchange.com/frontend/ui/commit/dee844f01637a6880ef17d5ba566c03f4d5321ce)
- [`OXUIB-1948`](https://jira.open-xchange.com/browse/OXUIB-1948): Mail size of selected mail has low contrast [`22795c4`](https://gitlab.open-xchange.com/frontend/ui/commit/22795c4ab0c8d7743bfb7c8a2013b5373fecf090)
- [`OXUIB-1960`](https://jira.open-xchange.com/browse/OXUIB-1960): Endless loop of "update available" banner [`3c83378`](https://gitlab.open-xchange.com/frontend/ui/commit/3c8337849df41d1cd4de18571c60185f578d4847)
- [`OXUIB-1977`](https://jira.open-xchange.com/browse/OXUIB-1977): Drive "send by email" is broken [`8fd1273`](https://gitlab.open-xchange.com/frontend/ui/commit/8fd1273d67e6a831cd3ef1e905d89f72a35ffaaf)
- Accessibility
  - Aria roles in launcher [`c23c309`](https://gitlab.open-xchange.com/frontend/ui/commit/c23c30993a6f4b4e02644a3f6c2e8675de68d576)
  - Color contrast in twitter poral widget [`efd042e`](https://gitlab.open-xchange.com/frontend/ui/commit/efd042e6a7de21bd60ae30e1515e2b11b664f101)
  - Improve contrast for guided tours in dark mode [`c4570bc`](https://gitlab.open-xchange.com/frontend/ui/commit/c4570bcaa343a59c2d72490e356a93f64ff10073)
  - Upgrade AXE core accessibility tool to latest version and fix new issues [`408a5c6`](https://gitlab.open-xchange.com/frontend/ui/commit/408a5c6e4521a79253e19ea1eacb772e3a4af866)
- Interaction of wizards and modals [`8d8b1dd`](https://gitlab.open-xchange.com/frontend/ui/commit/8d8b1dd2254d71f75a1869c012f80b867bcc5467)
- Help button in settings not always clickable [`9cd9f6f`](https://gitlab.open-xchange.com/frontend/ui/commit/9cd9f6f72420e05070f48cd7491aa9af7c16bd79)
- Use ox.version on login page if server config version isn't set [`dba8572`](https://gitlab.open-xchange.com/frontend/ui/commit/dba857274a40397c172b65d990ea9661a521e38a)
- Vertical alignment of checkboxes in "Change IMAP subscription" dialog [`b7931fc`](https://gitlab.open-xchange.com/frontend/ui/commit/b7931fc3c66a74f79554c1245c90281c7ea188da)


## [8.5.0] - 2022-09-09

### Added
- [`OXUI-955`](https://jira.open-xchange.com/browse/OXUI-955) / [`OXUI-898`](https://jira.open-xchange.com/browse/OXUI-898): Integrate Jitsi Reservation Manager and Zoom in "Voice & Video" micro service
  - Moved all Voice & Video related integrations from Switchboard to a new "Voice & Video Service"
  - Refactored frontend code to reflect those changes
  - Integrated new Jitsi Reservation Manager api
  - Move switchboard jwt token getter from chat to switchboard api [`b3ff6b6`](https://gitlab.open-xchange.com/frontend/ui/commit/b3ff6b610434dba5781adf02efae4d54a1a04e19)
  - "Voice & Video" Settings (see removed section for removed switchboard settings)
    - `io.ox/core//brand: "brandname"`
    - `io.ox/jitsi//autoCopyToLocation: "true"`
    - `io.ox/jitsi//enabled: "true"`
    - `io.ox/jitsi//host: "voice-video-service.hostname.tld"`
    - `io.ox/jitsi//productName: "Jitsi"`
    - `io.ox/zoom//addMeetingPassword: "true"`
    - `io.ox/zoom//autoCopyToDescription: "false"`
    - `io.ox/zoom//autoCopyToLocation: "true"`
    - `io.ox/zoom//enabled: "true"`
    - `io.ox/zoom//host: "voice-video-service.hostname.tld"`

### Changed

- Refactoring of SCSS variables and some styles [`a0d8843`](https://gitlab.open-xchange.com/frontend/ui/commit/a0d884339b11d2480628db59a7745d7c0f7d3746)
  - Flag picker: rename css class `flag-example` to `flag-preview`
  - Chat: using --link for .btn-action
  - Replace sass variable `$green` with `$green-500`
  - Replace sass variable `$red` with `$red-500`
  - Replace sass variable `$gray` with `$gray-700`
  - Remove sass variables `$link-accent-color`, `$link-disabled-color`, `$dark-silver`, `$light-silver`, `$green-light`, `$silver`,  `$blue-dark`,  `$blue-light`, `$gray`, `$blue`, `$yellow`, `$orange`, `$pink`, `$purple`, `$appointment-private` (see core@ac8f618e), `$weekview-footer-height` (see core@c343044e)
- Specify icon dimension by pixel based class names (`bi-12, bi-13, ...`) instead of deprecated t-shirt sizes (`xs, sm, ...`) [`b36ce4b`](https://gitlab.open-xchange.com/frontend/ui/commit/b36ce4bf44f680bc4d0da2bd64756f3f9311ea7e)
- Using variable for global address book name in settings [`8b9dc51`](https://gitlab.open-xchange.com/frontend/ui/commit/8b9dc51e2b236c3fe45ef69a08bd80daa8612be7)

### Deprecated

- Mail util function `getSmartDate` will be removed with 8.7 [`e3fe80d`](https://gitlab.open-xchange.com/frontend/ui/commit/e3fe80df1b426fe0d0b3fcb2d6e41f3d9d3b4168)
- Icon dimensions specified by t-shirt size classes (`xs,sm,m,l,xl`) will be removed with 8.7 (use `bi-xx` pixel based classes instead) [`88c6ef5`](https://gitlab.open-xchange.com/frontend/ui/commit/88c6ef5fc7388275993f08212858657426881914)
- Mail util function `getInitialDefaultSender` will be removed with 8.7 [`2dbf715`](https://gitlab.open-xchange.com/frontend/ui/commit/2dbf715691b817bb9c3f58ac9e1dcd24439522ad)
- Unused property `ox.base` will be removed with 8.7 [`227d0cc`](https://gitlab.open-xchange.com/frontend/ui/commit/227d0cc84d6e2ed6e2db129c845e4927225ccc32)
- MailComposeView method `dirty` will be removed with 8.7 (use method `isDirty` instead) [`c333720`](https://gitlab.open-xchange.com/frontend/ui/commit/c333720bd70c619303f07a477d965245162a6326)
- Flag picker class `flag-preview` will be removed with 8.7 (use class `color-flag` instead) [`ea31dfd`](https://gitlab.open-xchange.com/frontend/ui/commit/ea31dfdaac0747ffc1b3ee1d774c28e1c0384645)

### Removed
- Switchboard Settings:
  - `io.ox/switchboard//zoom/enabled`
  - `io.ox/switchboard//jitsi/enabled`
  - `io.ox/switchboard//jitsi/host`
- Checkbox for auto dark mode in settings drop down [`8caadec`](https://gitlab.open-xchange.com/frontend/ui/commit/8caadec90db59f33f0cf33ee570353af73dd29aa)
- Deprecated method `storeSavePoints` of `ox.ui.App` [`4b61241`](https://gitlab.open-xchange.com/frontend/ui/commit/4b61241b7a0076d68e37005439d1e6e5a049845c)
- Deprecated method `customizeNode` of `extension` [`c3d96a6`](https://gitlab.open-xchange.com/frontend/ui/commit/c3d96a6ff7a01f4ca50d1854312bc3e9ae87f87a)

### Fixed
- [`DOCS-4560`](https://jira.open-xchange.com/browse/DOCS-4560): Error when downloading My shares [`4e1040c`](https://gitlab.open-xchange.com/frontend/ui/commit/4e1040cce57986979f880b5758ddbe329ee03664)
- [`OXUIB-1497`](https://jira.open-xchange.com/browse/OXUIB-1497): Drive: Search doesn't find moved files [`3ec5546`](https://gitlab.open-xchange.com/frontend/ui/commit/3ec5546051c8049bba43adad1caebd46de66a3c3)
- [`OXUIB-1636`](https://jira.open-xchange.com/browse/OXUIB-1636): Mobile: iFrame for Trusted Identity Upsell dialog too big on smartphone [`8ea4f03`](https://gitlab.open-xchange.com/frontend/ui/commit/8ea4f0352f4a3607b80d1eb571e440aa35b9a118)
- [`OXUIB-1690`](https://jira.open-xchange.com/browse/OXUIB-1690): Search: After removing 'Type' from search you'll get an "Error: Failed to load files" [`0451e2d`](https://gitlab.open-xchange.com/frontend/ui/commit/0451e2dabf6f0c4d1cd4a268a6e76f8ac06e913f)
- [`OXUIB-1720`](https://jira.open-xchange.com/browse/OXUIB-1720): XING widget reloading before login [`c1f348f`](https://gitlab.open-xchange.com/frontend/ui/commit/c1f348f2837fb57ec33ed15670e1f34eecb6f14f)
- [`OXUIB-1722`](https://jira.open-xchange.com/browse/OXUIB-1722): Calendar list view: new event is not visible in list if refresh happens during editing [`e3fdaef`](https://gitlab.open-xchange.com/frontend/ui/commit/e3fdaef063364d87a7dc535c386b3cf18f42befd)
- [`OXUIB-1726`](https://jira.open-xchange.com/browse/OXUIB-1726): Migrate from old setting io.ox/calendar//viewView to io.ox/calendar//layout [`3a3164e`](https://gitlab.open-xchange.com/frontend/ui/commit/3a3164e42f0cc2b74b66ce4e37c0b3885ef9696e)
- [`OXUIB-1784`](https://jira.open-xchange.com/browse/OXUIB-1784): Configured dynamic theming linkColor not applied to classic toolbar icons [`6d146fd`](https://gitlab.open-xchange.com/frontend/ui/commit/6d146fda6c6fa73cf59a909c0ed49ceeb8e75070) [`885fd3a`](https://gitlab.open-xchange.com/frontend/ui/commit/885fd3a51cb9820b10ca4d0a49ac481d7e75e8db)
- [`OXUIB-1787`](https://jira.open-xchange.com/browse/OXUIB-1787): Mailfilter Settings loads data during render [`c9f03df`](https://gitlab.open-xchange.com/frontend/ui/commit/c9f03dfc6112bfd9bfe35a622711d8a1a6aae684)
- [`OXUIB-1794`](https://jira.open-xchange.com/browse/OXUIB-1794): Certain E-Mails lack padding [`7a22313`](https://gitlab.open-xchange.com/frontend/ui/commit/7a22313c28efa8cc700963048df7869cb60a8e30)
- [`OXUIB-1796`](https://jira.open-xchange.com/browse/OXUIB-1796): Deleting appointment-deny-comment not possible [`8e7d3e1`](https://gitlab.open-xchange.com/frontend/ui/commit/8e7d3e198352c51fa7aa5971749e3de74836987a)
- [`OXUIB-1798`](https://jira.open-xchange.com/browse/OXUIB-1798): Version check in "What's new" dialog not working correctly [`8c933f3`](https://gitlab.open-xchange.com/frontend/ui/commit/8c933f344d612c1964f2ee1ae0e7390326ee0533)
- [`OXUIB-1799`](https://jira.open-xchange.com/browse/OXUIB-1799): Visual issues in notification area [`88f6536`](https://gitlab.open-xchange.com/frontend/ui/commit/88f653628ec7ec7fcb6374766663b5346198fcdb)
- [`OXUIB-1804`](https://jira.open-xchange.com/browse/OXUIB-1804): Manifest manager must be robust against failing plugins [`e292c3f`](https://gitlab.open-xchange.com/frontend/ui/commit/e292c3f54c40f49b6e44856621a2a4525bd3e3bc)
- [`OXUIB-1807`](https://jira.open-xchange.com/browse/OXUIB-1807): Deduplication of email address when adding a contact to a distribution list does not work (sometimes) [`2450845`](https://gitlab.open-xchange.com/frontend/ui/commit/24508456639ee93568ac7bf7d1cb91d1dbedaaf9)
- [`OXUIB-1808`](https://jira.open-xchange.com/browse/OXUIB-1808): Settings do not start when a settings pane is disabled [`02a80d5`](https://gitlab.open-xchange.com/frontend/ui/commit/02a80d5f2f25ffb15b01f78a7deae840642675a0)
- [`OXUIB-1810`](https://jira.open-xchange.com/browse/OXUIB-1810): Opening the Inline Help in Drive shows a wrong help page [`da011ce`](https://gitlab.open-xchange.com/frontend/ui/commit/da011ce6b0cfff51d234020f14364312dfa8806f)
- [`OXUIB-1811`](https://jira.open-xchange.com/browse/OXUIB-1811): CSS prefer-color-scheme gets ignored on body tag [`38f8395`](https://gitlab.open-xchange.com/frontend/ui/commit/38f83958b59642f6aa0bf7294ad9e9857160f12b)
- [`OXUIB-1815`](https://jira.open-xchange.com/browse/OXUIB-1815): Setting `io.ox/core//logoAction` doesn't work for internal Apps [`203a2e3`](https://gitlab.open-xchange.com/frontend/ui/commit/203a2e3f589acb9345aadf0a875aa8b30d8d0655)
- [`OXUIB-1816`](https://jira.open-xchange.com/browse/OXUIB-1816): Button "My contact data" in settings doesn't work [`49ffe8e`](https://gitlab.open-xchange.com/frontend/ui/commit/49ffe8e7a2b7e6edbcd15a2a68659b4101e91b63)
- [`OXUIB-1824`](https://jira.open-xchange.com/browse/OXUIB-1824): Missing labels on optgroup in contact picker [`c211457`](https://gitlab.open-xchange.com/frontend/ui/commit/c211457871e1a2ac84520424a8bbf7859928aabb)
- [`OXUIB-1826`](https://jira.open-xchange.com/browse/OXUIB-1826): Selected unseen emails have bad style [`546ff9e`](https://gitlab.open-xchange.com/frontend/ui/commit/546ff9ef68f05087ca8164ebdbdd323e3359c7a2) [`4f164b1`](https://gitlab.open-xchange.com/frontend/ui/commit/4f164b126a676413fd03b1d89c256d4651cd62e4)
- [`OXUIB-1827`](https://jira.open-xchange.com/browse/OXUIB-1827): Mail not displayed - content is only visible via view source or as forwarded mail [`2da85fe`](https://gitlab.open-xchange.com/frontend/ui/commit/2da85fec4e6e8ac108e2d974c6afaa93831f24f5)
- [`OXUIB-1830`](https://jira.open-xchange.com/browse/OXUIB-1830): Sharing options are present for users without "Share Links" and "Invite Guests" capabilities [`6b25beb`](https://gitlab.open-xchange.com/frontend/ui/commit/6b25beb37cf9b14344820ad1bf3094940573e0e6)
- [`OXUIB-1834`](https://jira.open-xchange.com/browse/OXUIB-1834): Mobile View: Remove buttons on Edit personal data are not correct aligned [`2d738d4`](https://gitlab.open-xchange.com/frontend/ui/commit/2d738d4999f508095d5ed643b1283c26adb2574c)
- [`OXUIB-1836`](https://jira.open-xchange.com/browse/OXUIB-1836), [`OXUIB-1874`](https://jira.open-xchange.com/browse/OXUIB-1874): Wrong colors for focus styles in tasks, chat and core [`12813255`](https://gitlab.open-xchange.com/frontend/ui/commit/1281325521f16aab4af2eb0a4d8d4f7d61e40280)
- [`OXUIB-1837`](https://jira.open-xchange.com/browse/OXUIB-1837): Calendar unresponsive after changes [`cc00285`](https://gitlab.open-xchange.com/frontend/ui/commit/cc002854f36e7b1b5db2bfadc42d2805d05f793a)
- [`OXUIB-1838`](https://jira.open-xchange.com/browse/OXUIB-1838): Settings unnecessarily cut off [`1e1f61b`](https://gitlab.open-xchange.com/frontend/ui/commit/1e1f61b52ebed2f69ef4efbe114ca74a780427cb)
- [`OXUIB-1840`](https://jira.open-xchange.com/browse/OXUIB-1840): [Safari] Cannot change appointment color [`94e50cc`](https://gitlab.open-xchange.com/frontend/ui/commit/94e50cc167ad7362c6b3c0a54303a4322513181f)
- [`OXUIB-1841`](https://jira.open-xchange.com/browse/OXUIB-1841): Focus ring cut off in chat [`63b3cd0`](https://gitlab.open-xchange.com/frontend/ui/commit/63b3cd0f67319168ace2497af8193a5ea39d8fc6)
- [`OXUIB-1843`](https://jira.open-xchange.com/browse/OXUIB-1843): Blue box appears after opening and closing contact details [`dc1ae3a`](https://gitlab.open-xchange.com/frontend/ui/commit/dc1ae3a13418979828eeb0c144d92614575af404)
- [`OXUIB-1845`](https://jira.open-xchange.com/browse/OXUIB-1845): Birthday entries cause issues with translations [`3bf4009`](https://gitlab.open-xchange.com/frontend/ui/commit/3bf40095ba299d357b45389ec0eb4ef9eddd1cc0)
- [`OXUIB-1846`](https://jira.open-xchange.com/browse/OXUIB-1846): Update banner always shown with cold cache [`bcd99ee`](https://gitlab.open-xchange.com/frontend/ui/commit/bcd99eedb0a89e87e4ed0adaeb324d5b2969bc82)
- [`OXUIB-1858`](https://jira.open-xchange.com/browse/OXUIB-1858): RSS feed not displayed when done via yaml [`eb30da2`](https://gitlab.open-xchange.com/frontend/ui/commit/eb30da273ef08b86073063dd8ecbf647046401a7) [`2f17593`](https://gitlab.open-xchange.com/frontend/ui/commit/2f17593662970e93922845a120619380d3395b6a)
- [`OXUIB-1859`](https://jira.open-xchange.com/browse/OXUIB-1859): Popup menu in "create filter" for mail looks misaligned [`5bba37b`](https://gitlab.open-xchange.com/frontend/ui/commit/5bba37b13eab5f3f3a79386f1c2097e142a3f5d0)
- [`OXUIB-1860`](https://jira.open-xchange.com/browse/OXUIB-1860): Not enough space below top bar [`5f6a11f`](https://gitlab.open-xchange.com/frontend/ui/commit/5f6a11f2a53052a829ceb64076eabb8d4ca51d2d)
- [`OXUIB-1873`](https://jira.open-xchange.com/browse/OXUIB-1873): Connect your device modal vanishes / breaks appsuite [`46e35ac`](https://gitlab.open-xchange.com/frontend/ui/commit/46e35acc08cc6053e45108ba89b3c8e1cf8004c2)
- [`OXUIB-1875`](https://jira.open-xchange.com/browse/OXUIB-1875): Global address book referenced in settings [`c81f00a`](https://gitlab.open-xchange.com/frontend/ui/commit/c81f00a4793e3c29d54270945120aa0cd4001268) [`c33ed81`](https://gitlab.open-xchange.com/frontend/ui/commit/c33ed81585fc3a3ec57bee5db9731bebb2d3ed32)
- [`OXUIB-1876`](https://jira.open-xchange.com/browse/OXUIB-1876): Mail compose does not start after adding Gmail account [`62bb954`](https://gitlab.open-xchange.com/frontend/ui/commit/62bb95424ba97ad5e4d41850168160c88c83a83e)
- [`OXUIB-1880`](https://jira.open-xchange.com/browse/OXUIB-1880): Apps on mobile device open in background if reminder notification is open [`535b4d3`](https://gitlab.open-xchange.com/frontend/ui/commit/535b4d333d54aa9d5dd3f373f1c7c4594e786b5a)
- [`OXUIB-1881`](https://jira.open-xchange.com/browse/OXUIB-1881): Connect your device uses wrong user info [`6f2fa39`](https://gitlab.open-xchange.com/frontend/ui/commit/6f2fa3922b484c703615c322c398610cc83b288a)
- [`OXUIB-1888`](https://jira.open-xchange.com/browse/OXUIB-1888): Focus drops on changing reminders of appointment [`4933c49`](https://gitlab.open-xchange.com/frontend/ui/commit/4933c497a1068e88e467c5e0aadd9c5583053ea9)
- [`OXUIB-1893`](https://jira.open-xchange.com/browse/OXUIB-1893): Missing colors in mail flag picker [`e9cb298`](https://gitlab.open-xchange.com/frontend/ui/commit/e9cb2983ed296a1d147c6e1ec591501a68f69e0d)
- Additional check in "What's New" to prevent possible empty feature dialog [`c942375`](https://gitlab.open-xchange.com/frontend/ui/commit/c942375748624801433b835ba054014681330e94)
- Broken "follow up" calendar action when called from list views toolbar [`7a0499a`](https://gitlab.open-xchange.com/frontend/ui/commit/7a0499a238f266c5e890a54a5552d382a7bf43e5)
- Translation comments for birthdays [`a5f00da`](https://gitlab.open-xchange.com/frontend/ui/commit/a5f00da19f597499bdff2c81cca4f98f908f0049)
- Flag-picker in mail and settings [`2845f60`](https://gitlab.open-xchange.com/frontend/ui/commit/2845f605467190a56c31ad7aa066e73f1de8dd1f)
- Keyboard support of attachments in task/contacts detail view [`fcbd6d6`](https://gitlab.open-xchange.com/frontend/ui/commit/fcbd6d694090c062cd2bf9b623139efa09c24d76)
- Slow cache operations in Chrome due to missing cache separation [`d5a8827`](https://gitlab.open-xchange.com/frontend/ui/commit/d5a8827e63e0add978eeafea3caa82e1d555baa8)

### Security

- [`OXUIB-1795`](https://jira.open-xchange.com/browse/OXUIB-1795): XSS using "upsell" triggers [`90b3df2`](https://gitlab.open-xchange.com/frontend/ui/commit/90b3df23ebf2cb6b6b2920d9f669359eb3008fc4)

## [8.4.0] - 2022-07-29

### Added

- Latest translations [`ba3e25d`](https://gitlab.open-xchange.com/frontend/ui/commit/ba3e25d0b182cc6c3b3457bf38096b51596e72f5)
- [`OXUI-999`](https://jira.open-xchange.com/browse/OXUI-999): As a user the settings app is shown as a modal dialog [`2453b48`](https://gitlab.open-xchange.com/frontend/ui/commit/2453b48decd0e39a22fff6f5be895c67d0e1a9f8)
  - Additional streamlining of the settings pages
  - Remove the "Add my contact data..." buttons from settings
- [`OXUI-994`](https://jira.open-xchange.com/browse/OXUI-994): UI-Redesign: Notification area overhaul [`c627875`](https://gitlab.open-xchange.com/frontend/ui/commit/c627875714d6c20bc245c41a0aa3d70bd021ef8b)
  - New design and positioning for notification area (sticky to the right, full height)
  - Streamlined notification styles
  - Introduced collapsible notification categories
  - Introduced optional birthday notifications
- [`OXUI-995`](https://jira.open-xchange.com/browse/OXUI-995): As a user I can configure a default signature for all my mail accounts [`e9fea9c`](https://gitlab.open-xchange.com/frontend/ui/commit/e9fea9c8b2915c6d4797cc5d7455bcc57d2e6cad)
- [`OXUI-986`](https://jira.open-xchange.com/browse/OXUI-986): As a user I can search in settings [`a3cd1b8`](https://gitlab.open-xchange.com/frontend/ui/commit/a3cd1b8d6b53c2e1750c7ac44a25af2e7be863de)
- [`OXUIB-1001`](https://jira.open-xchange.com/browse/OXUIB-1001): As a user the connect your device Wizard makes the Drive-App setup easier [`106f25f`](https://gitlab.open-xchange.com/frontend/ui/commit/106f25f501f36a42b090df7dab945b60789f5a1f)
- [`OXUI-980`](https://jira.open-xchange.com/browse/OXUI-980): Custom translations for certain dictionaries [`cd617af`](https://gitlab.open-xchange.com/frontend/ui/commit/cd617afb8c23c9e580f96bff9a9dd92dec57c0a7)
- Added global setting to enable or disable Upsell [`4817b6e`](https://gitlab.open-xchange.com/frontend/ui/commit/4817b6e5bc523eb492222cb8fb402678baec6a02)
  - introduced setting io.ox/core//upsell/activated (default: false)
  - This setting enables or disables Upsell globally without changing the rest of the config
- [`OXUI-1035`](https://jira.open-xchange.com/browse/OXUI-1035): Update "What's new" dialog [`3b9547a`](https://gitlab.open-xchange.com/frontend/ui/commit/3b9547a6fd21d35f20ed01c5248b0fc45754e314)
  - Added 8.4 features to the dialog including new illustrations
    - New notification center
    - Search in settings
    - Per account default signatures
- Check for bad logo size combinations in dynamic-theme [`cc550e8`](https://gitlab.open-xchange.com/frontend/ui/commit/cc550e806129c909b2131b40dcae6c4df222e563)

### Changed

- New default value (false) for setting io.ox/calendar//deleteInvitationMailAfterAction [`4b41301`](https://gitlab.open-xchange.com/frontend/ui/commit/4b413015de7e0fd4032d99747b9162d071bcd57c)
  - The former default "true" always moved all invitation mails to the trash after taking any action from the invitation mail
    - This often confuses users as they are searching for the invitation mail later to change their decision
  - The setting should only be turned on by advanced users manually

### Removed

- **Breaking change:** Calendar url parameter `perspective` [`e72f06c`](https://gitlab.open-xchange.com/frontend/ui/commit/e72f06cf40fdcbc8682d0c33fcf5b3b89a118b1c)
- **Breaking change:** ox.ui.Perspective [`dd0f01a`](https://gitlab.open-xchange.com/frontend/ui/commit/dd0f01a1ec635d029ed6e188edd7a91bbdea9859)

### Fixed

- Several Upsell issues [`1c3bc13`](https://gitlab.open-xchange.com/frontend/ui/commit/1c3bc1382dd7bfe5cffde6c0efb5c6d0d45a1d49)
  - Moved upsell views from folder tree below primary action buttons to ensure working a11y and increase visibility of Upsell view
  - Changed styling of Upsell views accross modules
  - Portal widget for upsell is always protected by default and can not be changed by the user
  - Added missing config for Upsell demo to show the upgrade button and the portal widget again
- [`OXUIB-843`](https://jira.open-xchange.com/browse/OXUIB-843): Improve focus switch after onclick action [`a67175b`](https://gitlab.open-xchange.com/frontend/ui/commit/a67175b79604e0481287f4121cc5a308da53f98f)
- [`OXUIB-1001`](https://jira.open-xchange.com/browse/OXUIB-1001): Unexpected "Apply to subfolders" option when sharing mail folders [`c157c34`](https://gitlab.open-xchange.com/frontend/ui/commit/c157c3487710274113c72b59ed238bb921f806ba)
- [`OXUIB-1171`](https://jira.open-xchange.com/browse/OXUIB-1171): Preview of attached eml: "color flag" button active, but does nothing [`63fa573`](https://gitlab.open-xchange.com/frontend/ui/commit/63fa573b038b26e2659d1161ffebd8db14df9c11)
- [`OXUIB-1212`](https://jira.open-xchange.com/browse/OXUIB-1212): Calendar list view is missing actions [`8902d14`](https://gitlab.open-xchange.com/frontend/ui/commit/8902d14190a719a5bf37244111f366cf2cf284f8)
- [`OXUIB-1561`](https://jira.open-xchange.com/browse/OXUIB-1561): Folder tree resize does not work in one direction [`c103534`](https://gitlab.open-xchange.com/frontend/ui/commit/c10353477a8d34d2d7f01b494ddde761a7f56ac7)
- [`OXUIB-1562`](https://jira.open-xchange.com/browse/OXUIB-1562): Account dropdown icon in top bar looks wrong when hovering [`e3350ed`](https://gitlab.open-xchange.com/frontend/ui/commit/e3350edba8dadd367f70a6ab20066936eaeeaa6a)
- [`OXUIB-1609`](https://jira.open-xchange.com/browse/OXUIB-1609): -using password- can be chosen and mail can be sent even without giving a password at all [`bf7856e`](https://gitlab.open-xchange.com/frontend/ui/commit/bf7856e14092491d2540b2185532e6e7850f44cd)
- [`OXUIB-1658`](https://jira.open-xchange.com/browse/OXUIB-1658): Detailed views in Portal app are not correct aligned in mobile view [`7d56774`](https://gitlab.open-xchange.com/frontend/ui/commit/7d567749f660178b134016c85be66bbf62ceb302)
- [`OXUIB-1663`](https://jira.open-xchange.com/browse/OXUIB-1663): Wrong icon for outgoing calls in call history [`47641a5`](https://gitlab.open-xchange.com/frontend/ui/commit/47641a570e35faaa6863e87be186a291c9ca4f59)
- [`OXUIB-1676`](https://jira.open-xchange.com/browse/OXUIB-1676): Calendar actions are not always rendered in list view [`e4193b0`](https://gitlab.open-xchange.com/frontend/ui/commit/e4193b02ca9d747414b0cbb4d1a1411367e31a73)
- [`OXUIB-1677`](https://jira.open-xchange.com/browse/OXUIB-1677): Calendar appointments are rendered twice in list view [`1e7ba2b`](https://gitlab.open-xchange.com/frontend/ui/commit/1e7ba2b7fd1fe1f92ed70533f1281b55f7af28ed)
- [`OXUIB-1695`](https://jira.open-xchange.com/browse/OXUIB-1695): Help translation for ca_ES missing [`dad5f73`](https://gitlab.open-xchange.com/frontend/ui/commit/dad5f7388662056f2a20801847ee33fa291f517e)
- [`OXUIB-1700`](https://jira.open-xchange.com/browse/OXUIB-1700): Titles/hints does not appear on mouseover for quick launch icons [`42b3dd5`](https://gitlab.open-xchange.com/frontend/ui/commit/42b3dd55c004ce9311d9affbb97559a9db9121a9)
- [`OXUIB-1704`](https://jira.open-xchange.com/browse/OXUIB-1704): Cut off entries in App switcher [`daabef1`](https://gitlab.open-xchange.com/frontend/ui/commit/daabef1ebc1a1cd436507529f37fcc6d8557615e)
- [`OXUIB-1708`](https://jira.open-xchange.com/browse/OXUIB-1708): Long names breaking user halo [`a409108`](https://gitlab.open-xchange.com/frontend/ui/commit/a40910872523ec11e47ae684265d3012b4a38203)
- [`OXUIB-1714`](https://jira.open-xchange.com/browse/OXUIB-1714): Unexpected and inconsistent success message shown when updating external account [`8987af4`](https://gitlab.open-xchange.com/frontend/ui/commit/8987af4acee2520bb055d316248f317cfb306fea)
- [`OXUIB-1717`](https://jira.open-xchange.com/browse/OXUIB-1717): mail from sent mail folder are also archived when archiving from INBOX while in conversation view [`a820604`](https://gitlab.open-xchange.com/frontend/ui/commit/a8206041d50568c83652220bf278f17123f14420)
- [`OXUIB-1721`](https://jira.open-xchange.com/browse/OXUIB-1721): too wide mobile account editing modal [`e1f8e16`](https://gitlab.open-xchange.com/frontend/ui/commit/e1f8e1671b88f4f40e7365399ea570a58438413d)
- [`OXUIB-1723`](https://jira.open-xchange.com/browse/OXUIB-1723): Inconsistent usage of colors on login page when moving header and footer elements [`f480099`](https://gitlab.open-xchange.com/frontend/ui/commit/f4800991fb13c5a3710de2138e8624878548c537)
- [`OXUIB-1727`](https://jira.open-xchange.com/browse/OXUIB-1727): Misleading tooltip on mail compose window [`c721724`](https://gitlab.open-xchange.com/frontend/ui/commit/c72172476f8d4a02177f64bc79d94474645ef7e6)
- [`OXUIB-1728`](https://jira.open-xchange.com/browse/OXUIB-1728): Contact: Disabled actions don't look disabled [`e6d727b`](https://gitlab.open-xchange.com/frontend/ui/commit/e6d727b7fb8c4f450c26cb0a43b905a8a07cc5a6)
- [`OXUIB-1729`](https://jira.open-xchange.com/browse/OXUIB-1729): GDPR Export in 1GB packages not possible directly after an export with 512MB package size [`d1eac49`](https://gitlab.open-xchange.com/frontend/ui/commit/d1eac4903b889f3286ae312e5982429a8ddf017a)
- [`OXUIB-1733`](https://jira.open-xchange.com/browse/OXUIB-1733): Initials in dropdown menu do not update [`6fd0b45`](https://gitlab.open-xchange.com/frontend/ui/commit/6fd0b452d38772fd62b20f66e47b266a9d6c88f1)
- [`OXUIB-1734`](https://jira.open-xchange.com/browse/OXUIB-1734): size of mails, color flags and stars displayed in front of the subject with no space [`6be256c`](https://gitlab.open-xchange.com/frontend/ui/commit/6be256ce9932c4e8b160a0e2fba6692e8d0d63ec)
- [`OXUIB-1735`](https://jira.open-xchange.com/browse/OXUIB-1735): Folders not supplied in request body for chronos?action=advancedSearch [`6fea4b5`](https://gitlab.open-xchange.com/frontend/ui/commit/6fea4b59a764d1944f8692c806ef8137dd869922)
- [`OXUIB-1742`](https://jira.open-xchange.com/browse/OXUIB-1742): Save auto darkmode settings to jslob [`f7b172a`](https://gitlab.open-xchange.com/frontend/ui/commit/f7b172af70248492e2c6a738f4c3dc1079a47d37)
- [`OXUIB-1743`](https://jira.open-xchange.com/browse/OXUIB-1743): Malformed layout in mail listviews when "alternative" selection mode is used [`1e0f12d`](https://gitlab.open-xchange.com/frontend/ui/commit/1e0f12db2515c9d75c3efba637b2db278cd1668a)
- [`OXUIB-1744`](https://jira.open-xchange.com/browse/OXUIB-1744): General term "element" is used in listview and grid [`d2bd94b`](https://gitlab.open-xchange.com/frontend/ui/commit/d2bd94b68941ef197ee5e9878a2ca309b0470bf7)
- [`OXUIB-1748`](https://jira.open-xchange.com/browse/OXUIB-1748): Mail items listed under "Chat History" not consistent [`b82ac6e`](https://gitlab.open-xchange.com/frontend/ui/commit/b82ac6ef8a8da308b0728c77396e534bbe051407)
- [`OXUIB-1749`](https://jira.open-xchange.com/browse/OXUIB-1749): Misaligned 'Edit' button in account settings [`a9aa81d`](https://gitlab.open-xchange.com/frontend/ui/commit/a9aa81d75b10b4b70eb8b99273a5126d110e9caf)
- [`OXUIB-1750`](https://jira.open-xchange.com/browse/OXUIB-1750): Changing Account name is not always reflected in UI [`e48bcb1`](https://gitlab.open-xchange.com/frontend/ui/commit/e48bcb101c807df061a76664ec44daeaa6766d7b)
- [`OXUIB-1751`](https://jira.open-xchange.com/browse/OXUIB-1751): Missing address books within the contact-picker dialog [`1a48b39`](https://gitlab.open-xchange.com/frontend/ui/commit/1a48b39bc7b4a7add06810fac8cfce8d833dda3f)
- [`OXUIB-1754`](https://jira.open-xchange.com/browse/OXUIB-1754): Wrong icons size in email account dialog [`30cbf6f`](https://gitlab.open-xchange.com/frontend/ui/commit/30cbf6fc23556541a425c423d3d290da9da99437)
- [`OXUIB-1755`](https://jira.open-xchange.com/browse/OXUIB-1755): Cannot copy manual configuration from -Connect your device- Safari only [`e3cde1e`](https://gitlab.open-xchange.com/frontend/ui/commit/e3cde1e11fa7d2a7b204d214b9f4a91112fed529)
- [`OXUIB-1757`](https://jira.open-xchange.com/browse/OXUIB-1757): Mapping of help translation changed for some english speaking languages (British vs. US) [`f4a5d96`](https://gitlab.open-xchange.com/frontend/ui/commit/f4a5d961c17bf88689fff01a304ed878581cd855)
- [`OXUIB-1758`](https://jira.open-xchange.com/browse/OXUIB-1758): Missing topbar logo on mobile [`b06b84d`](https://gitlab.open-xchange.com/frontend/ui/commit/b06b84d988e6dc0e359939693054fd1c4c345c75)
- [`OXUIB-1760`](https://jira.open-xchange.com/browse/OXUIB-1760): Changing IMAP subscriptions not reflected in UI [`2d4ebc9`](https://gitlab.open-xchange.com/frontend/ui/commit/2d4ebc9d4993a31a8ddbd56c4a5713daca938957)
- [`OXUIB-1762`](https://jira.open-xchange.com/browse/OXUIB-1762): Account name gets not updated in account settings page [`bf98309`](https://gitlab.open-xchange.com/frontend/ui/commit/bf983099b0a4aa75a61752977f328f8b58c47cde)
- [`OXUIB-1765`](https://jira.open-xchange.com/browse/OXUIB-1765): Toggle password icon in Drive Mail options off-centered [`6fa380c`](https://gitlab.open-xchange.com/frontend/ui/commit/6fa380cad1795003aa747793356e2678f590a46b)
- [`OXUIB-1770`](https://jira.open-xchange.com/browse/OXUIB-1770): I cannot search for mail addresses that are not in the auto-complete [`f5a3583`](https://gitlab.open-xchange.com/frontend/ui/commit/f5a358385cbdbf345efb8a374303619b610f8c94)
- [`OXUIB-1772`](https://jira.open-xchange.com/browse/OXUIB-1772): Virus warning dialog layout issue [`cd598e7`](https://gitlab.open-xchange.com/frontend/ui/commit/cd598e7b620ff3ee3848f6fb1ce3302a6f6cd96b)
- [`OXUIB-1778`](https://jira.open-xchange.com/browse/OXUIB-1778): Dragging an attachment to a Task triggers Expand form or Collapse form [`924dd75`](https://gitlab.open-xchange.com/frontend/ui/commit/924dd75705b70a0388245910845923ac70649743)
- [`OXUIB-1779`](https://jira.open-xchange.com/browse/OXUIB-1779): Settings Dropdown in Mail App not aligned correctly [`6f5e524`](https://gitlab.open-xchange.com/frontend/ui/commit/6f5e52442689c2223fd30e9685d7f78583a8d831)
- [`OXUIB-1781`](https://jira.open-xchange.com/browse/OXUIB-1781): No "Continue" button on login screen for revoked share [`8b7068a`](https://gitlab.open-xchange.com/frontend/ui/commit/8b7068a1f5f9163f546a56345c8897c5ad27f222)
- [`OXUIB-1793`](https://jira.open-xchange.com/browse/OXUIB-1793): Delete mails using keyboard not working [`88e57d6`](https://gitlab.open-xchange.com/frontend/ui/commit/88e57d67fdf97e7e8432c072f7de2263fa97b1f5)
- **Breaking change:** [`OXUIB-1726`](https://jira.open-xchange.com/browse/OXUIB-1726): Store calendar layout only after explicit user interaction [`18f504d`](https://gitlab.open-xchange.com/frontend/ui/commit/18f504d513f3cc1a416aa395eff8bdfa773e2e10)
  - use calendar setting as model for view dropdown
  - reflect any changes of the setting to app.props
  - fix visible view dropdown when search result is shown
  - drop settting `io.ox/calendar//viewView` in favor of meaningful `io.ox/calendar//layout`

### Security

- [`OXUIB-1731`](https://jira.open-xchange.com/browse/OXUIB-1731): XSS with print templates when using plain-text mail [`8bc4590`](https://gitlab.open-xchange.com/frontend/ui/commit/8bc45904db4ae23416ba13ba36e8b6a5dbdd3803)
- [`OXUIB-1732`](https://jira.open-xchange.com/browse/OXUIB-1732): XSS at address picker when not using "fullname" [`c95f3d3`](https://gitlab.open-xchange.com/frontend/ui/commit/c95f3d3872792b2293e16c879c8d1a1be8516579)
- [`OXUIB-1785`](https://jira.open-xchange.com/browse/OXUIB-1785): XSS using "capabilities" evaluation and checks [`9bc3771`](https://gitlab.open-xchange.com/frontend/ui/commit/9bc37714d49fdf0cab00ab1ebab1d269b5b79586)

## [8.3.0] - 2022-06-20

### Added

- [`OXUI-930`](https://jira.open-xchange.com/browse/OXUI-930) Dark mode support for mobile devices [`427c66b`](https://gitlab.open-xchange.com/frontend/ui/commit/427c66b3ccb9ee90c23ebeb51b73102c2a42c710)

### Changed

- [`OXUIB-1515`](https://jira.open-xchange.com/browse/OXUIB-1515): Adjust order of mail actions [`020177d`](https://gitlab.open-xchange.com/frontend/ui/commit/020177d1b851fb2879f00ce501293bbc6c70162b)
- Use "All address books" as label in address book picker [`91b9701`](https://gitlab.open-xchange.com/frontend/ui/commit/91b9701c66a2007956310654a8b4de65f958394d)

### Deprecated

- Deprecation warning when using notification.yell [`f31b84c`](https://gitlab.open-xchange.com/frontend/ui/commit/f31b84cac783a1df586be10c0b11ff0eb4bd86e5)

### Removed

- `ox.root` from code [`d80545e`](https://gitlab.open-xchange.com/frontend/ui/commit/d80545ee3f8795cce4d852f8e4c1f874e4092f26)
- Obsolete special subject handling for multiple nested mails [`eaefbf8`](https://gitlab.open-xchange.com/frontend/ui/commit/eaefbf8eb447b15c647ad03238d78d6b72857ec7)
- Presentational svg from accessibility tree [`54b1c4e`](https://gitlab.open-xchange.com/frontend/ui/commit/54b1c4e623ce129b49fc329b452209092eb1809a)
- Useless "Right click for more options." [`eb4aea4`](https://gitlab.open-xchange.com/frontend/ui/commit/eb4aea4a392e8cccb8953829c1f82006a055ea47)

### Fixed

- [`DOCS-2673`](https://jira.open-xchange.com/browse/DOCS-2673): Uploaded items not visible when list pagination limit is exceed [`d6b5d16`](https://gitlab.open-xchange.com/frontend/ui/commit/d6b5d162c4cabccb77792ab6c26ad4e8ab5e2683)
- [`DOCS-4461`](https://jira.open-xchange.com/browse/DOCS-4461): Filter for file types not available [`9816467`](https://gitlab.open-xchange.com/frontend/ui/commit/98164670cb9f112904ef70fb77674de20798213e)
- [`DOCS-4475`](https://jira.open-xchange.com/browse/DOCS-4475): Uploading 10000 files in Drive does not work [`c4457ef`](https://gitlab.open-xchange.com/frontend/ui/commit/c4457ef5a0e3ee4c3f0d6b5f9b038923a02cab2c)
- [`DOCS-4502`](https://jira.open-xchange.com/browse/DOCS-4502): Misleading wording in search dialog Type filter for text documents [`079d84d`](https://gitlab.open-xchange.com/frontend/ui/commit/079d84d9a8a5103ffc6c94009cd7db1f4460b6cb)
- [`DOCS-4511`](https://jira.open-xchange.com/browse/DOCS-4511): Entries in Primary button are not checked on refresh [`e43b50c`](https://gitlab.open-xchange.com/frontend/ui/commit/e43b50ccdf33e6b004e0b5db3725e4b0d98a2316)
- [`DOCS-4519`](https://jira.open-xchange.com/browse/DOCS-4519): Small devices - text not readable on selected and disabled folder items [`1f3b835`](https://gitlab.open-xchange.com/frontend/ui/commit/1f3b8359cc783c36ba41b8e8bf1b0e7f99649c63)
- [`DOCS-4521`](https://jira.open-xchange.com/browse/DOCS-4521): Showing all images inside a folder in the slide show [`532c8e1`](https://gitlab.open-xchange.com/frontend/ui/commit/532c8e1b8ec9a44b498da441c9f9a829672c2998)
- [`OXUIB-1065`](https://jira.open-xchange.com/browse/OXUIB-1065): Different order for displayed contact field than in edit mode [`d2f0e67`](https://gitlab.open-xchange.com/frontend/ui/commit/d2f0e67923893824913f42b9b23bfb4e3241c909)
- [`OXUIB-1095`](https://jira.open-xchange.com/browse/OXUIB-1095): File attachment multiplies after send [`68d2528`](https://gitlab.open-xchange.com/frontend/ui/commit/68d2528180f53be1c9ee68b72e831dda465c10af)
- [`OXUIB-1202`](https://jira.open-xchange.com/browse/OXUIB-1202): Preview images in the Mail Compose dialog are sometimes rotated and mirrored [`b8874ce`](https://gitlab.open-xchange.com/frontend/ui/commit/b8874ce711243d541dad4c099c9207b2caf695c1)
- [`OXUIB-1212`](https://jira.open-xchange.com/browse/OXUIB-1212): Calendar list view is missing actions [`2097d0a`](https://gitlab.open-xchange.com/frontend/ui/commit/2097d0aa4f4b43235349aa47fa28aa00e7266032)
- [`OXUIB-1266`](https://jira.open-xchange.com/browse/OXUIB-1266): Mail compose is not opened in case of an over quota mailbox [`5c33425`](https://gitlab.open-xchange.com/frontend/ui/commit/5c334251c121bdd79eb8b6cee323dc1beb6c83cc)
- [`OXUIB-1319`](https://jira.open-xchange.com/browse/OXUIB-1319): Cannot return to search results after opening a folder [`ce50a40`](https://gitlab.open-xchange.com/frontend/ui/commit/ce50a40aec43d05ac1600fd4278ff92a93ee1c62)
- [`OXUIB-1379`](https://jira.open-xchange.com/browse/OXUIB-1379): Forwarding an email drops the timezone notification in "Date" identifier [`a91a721`](https://gitlab.open-xchange.com/frontend/ui/commit/a91a7216ae130f7e1c2f150b60e6952def55c5de)
- [`OXUIB-1384`](https://jira.open-xchange.com/browse/OXUIB-1384) Drive Mail: Download Button flashing up while browsing through the folder tree [`c63edca`](https://gitlab.open-xchange.com/frontend/ui/commit/c63edca8c3e032acd19ef737f69061c62312e35b)
- [`OXUIB-1384`](https://jira.open-xchange.com/browse/OXUIB-1384): Drive Mail: Download Button flashing up while browsing through the folder tree [`d8c6c6f`](https://gitlab.open-xchange.com/frontend/ui/commit/d8c6c6f80a18d8637fe611ab1190f2eb1ff89cc4)
- [`OXUIB-1417`](https://jira.open-xchange.com/browse/OXUIB-1417): Date and time format preview not matching values in selection [`f2c7788`](https://gitlab.open-xchange.com/frontend/ui/commit/f2c77888366f6f7098d914462eef2d5327ecbfd6)
- [`OXUIB-1459`](https://jira.open-xchange.com/browse/OXUIB-1459): Add auto dark mode checkbox to theme quick selector [`090845a`](https://gitlab.open-xchange.com/frontend/ui/commit/090845a2cdee830e5aca2becbc5cc356907d66e0)
- [`OXUIB-1507`](https://jira.open-xchange.com/browse/OXUIB-1507): `error` when cancelling appointment discard dialog [`5499c1c`](https://gitlab.open-xchange.com/frontend/ui/commit/5499c1c4525883e6390a8ad7220ed9fa242d48e8)
- [`OXUIB-1515`](https://jira.open-xchange.com/browse/OXUIB-1515): 'Reply all' should be available in mail header actions [`77b99c2`](https://gitlab.open-xchange.com/frontend/ui/commit/77b99c2f464b8c8a8892ed804bddd578c7dc4701)
- [`OXUIB-1538`](https://jira.open-xchange.com/browse/OXUIB-1538): Mail viewer lacks horizontal scroll bars for wide content [`405796d`](https://gitlab.open-xchange.com/frontend/ui/commit/405796dd55212bf9a3d5752ac902c5af5d666645)
- [`OXUIB-1539`](https://jira.open-xchange.com/browse/OXUIB-1539): Inconsistent display of contents of virtual folders in mail [`8f9be0d`](https://gitlab.open-xchange.com/frontend/ui/commit/8f9be0d19f0e80abe65a498f483d8ea0014ae347)
- [`OXUIB-1551`](https://jira.open-xchange.com/browse/OXUIB-1551): Drive lists invisible files as possible attachments [`8db7906`](https://gitlab.open-xchange.com/frontend/ui/commit/8db7906c0cb9e65dd577dd9ef2715ae1a4c5d262)
- [`OXUIB-1556`](https://jira.open-xchange.com/browse/OXUIB-1556): Use contact picker to select participants in search [`5e8be8f`](https://gitlab.open-xchange.com/frontend/ui/commit/5e8be8ffac44eb8c542c64a9b22ff5a08ea71e32)
- [`OXUIB-1561`](https://jira.open-xchange.com/browse/OXUIB-1561): Folder tree resize doesn't work in one direction [`4779519`](https://gitlab.open-xchange.com/frontend/ui/commit/4779519df24cd94042be903e467e486f6e8a30dc)
- [`OXUIB-1574`](https://jira.open-xchange.com/browse/OXUIB-1574): Disable statistics option for virtual mail folders [`21372ba`](https://gitlab.open-xchange.com/frontend/ui/commit/21372ba2e35764a6a93bb8f75fe5b8c1290d4e78)
- [`OXUIB-1578`](https://jira.open-xchange.com/browse/OXUIB-1578): SAML authentication randomly failing [`1086e2e`](https://gitlab.open-xchange.com/frontend/ui/commit/1086e2ed71b8a0a14529185f4c5eee7e4ddcb2c8)
- [`OXUIB-1587`](https://jira.open-xchange.com/browse/OXUIB-1587): Reminder cannot be set and missing details in shared calendars for users with no access to them [`58dc91a`](https://gitlab.open-xchange.com/frontend/ui/commit/58dc91a883e163918095ccfba704cc36884f5ed8)
- [`OXUIB-1593`](https://jira.open-xchange.com/browse/OXUIB-1593): Color issue on mobile login page if explicitly configured [`1f9f101`](https://gitlab.open-xchange.com/frontend/ui/commit/1f9f1018f0b117ce9025909fe62d6f5f918cb024)
- [`OXUIB-1597`](https://jira.open-xchange.com/browse/OXUIB-1597): Unexpected white space in mail compose text only mode - 2 [`41142f1`](https://gitlab.open-xchange.com/frontend/ui/commit/41142f123f7b9bb3c899c913515791c903eb999d)
- [`OXUIB-1597`](https://jira.open-xchange.com/browse/OXUIB-1597): Unexpected white space in mail compose text only mode [`2e46719`](https://gitlab.open-xchange.com/frontend/ui/commit/2e46719cf16d77330f54dc23c260d41170057f34)
- [`OXUIB-1598`](https://jira.open-xchange.com/browse/OXUIB-1598): Attachments text not correctly vertically aligned with other elements [`dec9d85`](https://gitlab.open-xchange.com/frontend/ui/commit/dec9d85a281573092fa60e13d72c80e31c10f54c)
- [`OXUIB-1602`](https://jira.open-xchange.com/browse/OXUIB-1602): Missing back button after reload in settings [`0762948`](https://gitlab.open-xchange.com/frontend/ui/commit/076294820b5d283f2924504b23f05b3ea3a57c42)
- [`OXUIB-1604`](https://jira.open-xchange.com/browse/OXUIB-1604): Application specific passwords setup has wrong preselection [`0fc7d32`](https://gitlab.open-xchange.com/frontend/ui/commit/0fc7d32ad7e4382da4e53dc9df9e8fa18b146fc3)
- [`OXUIB-1605`](https://jira.open-xchange.com/browse/OXUIB-1605): Weak visibility of color picker in dark mode [`8e0472e`](https://gitlab.open-xchange.com/frontend/ui/commit/8e0472e044d02f680cd797438b70bed00142eb7b)
- [`OXUIB-1608`](https://jira.open-xchange.com/browse/OXUIB-1608): Lines for identifying half hours in calendar are brighter than those for hours in dark mode [`6986f0c`](https://gitlab.open-xchange.com/frontend/ui/commit/6986f0c239071b6e7469214b116ed5b37881df94)
- [`OXUIB-1610`](https://jira.open-xchange.com/browse/OXUIB-1610): Mail action icons are falsely rendered on mobile device (portal inbox widget) [`9f31ef5`](https://gitlab.open-xchange.com/frontend/ui/commit/9f31ef587da746a2293b12bd3ad69fd6409a6477)
- [`OXUIB-1614`](https://jira.open-xchange.com/browse/OXUIB-1614): Broken participants view in mobile tasks [`d1eb315`](https://gitlab.open-xchange.com/frontend/ui/commit/d1eb315b9d80518e363acf0d356fc3564f4593d4)
- [`OXUIB-1622`](https://jira.open-xchange.com/browse/OXUIB-1622): Cut off App Store/Google Play logo in Get OX drive portal widget [`551e40f`](https://gitlab.open-xchange.com/frontend/ui/commit/551e40ff6a9e01c449f7ad5868878233db254040)
- [`OXUIB-1623`](https://jira.open-xchange.com/browse/OXUIB-1623): Platform badges not visible in OX drive portal widget popup [`b85466c`](https://gitlab.open-xchange.com/frontend/ui/commit/b85466c043d2f2f45f5749916ecd50a311185731)
- [`OXUIB-1625`](https://jira.open-xchange.com/browse/OXUIB-1625): Very dark text/icons in dark mode [`4f08e47`](https://gitlab.open-xchange.com/frontend/ui/commit/4f08e478c984d5fef907d59a4e77b3690e9c7930)
- [`OXUIB-1627`](https://jira.open-xchange.com/browse/OXUIB-1627): Closing an appointment invitation opens it [`57b7191`](https://gitlab.open-xchange.com/frontend/ui/commit/57b7191b45eb04974431674f4c941299a3397fee)
- [`OXUIB-1628`](https://jira.open-xchange.com/browse/OXUIB-1628): Quick launch icons in the topbar do not get "active" class [`990eab9`](https://gitlab.open-xchange.com/frontend/ui/commit/990eab9f6b1ce2a70efd59fe40bad0859dd49c5a)
- [`OXUIB-1634`](https://jira.open-xchange.com/browse/OXUIB-1634): Scheduling savepoint blocks UI loading [`ca3adba`](https://gitlab.open-xchange.com/frontend/ui/commit/ca3adba8d4cb62f7cedb2eb7eb093e05abff1ae2)
- [`OXUIB-1641`](https://jira.open-xchange.com/browse/OXUIB-1641): Broken address book on narrow viewports [`9966644`](https://gitlab.open-xchange.com/frontend/ui/commit/99666444366e59d5d71a2851657f8e61c437833e)
- [`OXUIB-1646`](https://jira.open-xchange.com/browse/OXUIB-1646): White title "Upgrade your account" on light-grey background badly visible [`ec44505`](https://gitlab.open-xchange.com/frontend/ui/commit/ec44505f3cba41bebebd4f8467714de15c566093)
- [`OXUIB-1661`](https://jira.open-xchange.com/browse/OXUIB-1661): Usability issues with checkboxes [`431fcf9`](https://gitlab.open-xchange.com/frontend/ui/commit/431fcf90e35a9c136ae8bc6be5287c872942ee8c)
- [`OXUIB-1665`](https://jira.open-xchange.com/browse/OXUIB-1665): Mobile - "re:" and "fwd:" removed from Subject in the mail view [`7e215c7`](https://gitlab.open-xchange.com/frontend/ui/commit/7e215c7973ee614e243aaaf52387cdfc6334c97b)
- [`OXUIB-1667`](https://jira.open-xchange.com/browse/OXUIB-1667): Other Address missing when printing a contact with print layout [`25cdee5`](https://gitlab.open-xchange.com/frontend/ui/commit/25cdee5a66712688b08e0e7e92c45faa60a5c82a)
- [`OXUIB-1669`](https://jira.open-xchange.com/browse/OXUIB-1669): Missing `ConferenceSelectView` on mobile devices [`4d9f1a1`](https://gitlab.open-xchange.com/frontend/ui/commit/4d9f1a151d9fb5ddbb84225e1146435a998318ab)
- [`OXUIB-1673`](https://jira.open-xchange.com/browse/OXUIB-1673): No try-catch in map iteratee function when calling extension points [`8bc3863`](https://gitlab.open-xchange.com/frontend/ui/commit/8bc38631571bec42095740743788ece8bf477cf9)
- [`OXUIB-1678`](https://jira.open-xchange.com/browse/OXUIB-1678): XSS sanitization bypass for HTML snippets [`f178c58`](https://gitlab.open-xchange.com/frontend/ui/commit/f178c5854e23219f0c10d2d2b7aae81242a82eb8)
- [`OXUIB-1682`](https://jira.open-xchange.com/browse/OXUIB-1682): Remove display block from the sidepanel for small screens [`52da6b8`](https://gitlab.open-xchange.com/frontend/ui/commit/52da6b8b5d0724cc0bec924731f785cae1501300)
- [`OXUIB-1696`](https://jira.open-xchange.com/browse/OXUIB-1696): left-aligned close button in twitter widget [`70c750f`](https://gitlab.open-xchange.com/frontend/ui/commit/70c750fd861381228c5af56c18180fa0993f5d54)
- [`OXUIB-1697`](https://jira.open-xchange.com/browse/OXUIB-1697): Off-centered icons in connect-your-device-widget [`389e64f`](https://gitlab.open-xchange.com/frontend/ui/commit/389e64f468a393a43cead03647d9e3e8d6b3b720)
- [`OXUIB-1698`](https://jira.open-xchange.com/browse/OXUIB-1698): XING widget styling issues [`883bed6`](https://gitlab.open-xchange.com/frontend/ui/commit/883bed64caa4ae0d29983dca84f9359d7a5c1915)
- [`OXUIB-1701`](https://jira.open-xchange.com/browse/OXUIB-1701): Canceling lasso appointment creation with ESC [`4963570`](https://gitlab.open-xchange.com/frontend/ui/commit/4963570103f7196d557009e6a9ed8b0ad645bedb)
- [`OXUIB-987`](https://jira.open-xchange.com/browse/OXUIB-987): Tabbing into header toolbar after changing window size [`62b5214`](https://gitlab.open-xchange.com/frontend/ui/commit/62b5214ee2557822a608f9ec376e026ba8a2e73d)
- Change avatar icon size [`0b4cc44`](https://gitlab.open-xchange.com/frontend/ui/commit/0b4cc44606c47562f19a19be89563bf3634eaf98)
- Click handler of mail account settings to open mail folder again [`d42d0d6`](https://gitlab.open-xchange.com/frontend/ui/commit/d42d0d65d3a20da5742a9240f1c692f434b145ef)
- Constant "Unknown device" items in active session settings page [`c3a3709`](https://gitlab.open-xchange.com/frontend/ui/commit/c3a37095a9857b15a8b11317c50276754531d41f)
- Current button background in dark theme [`d847c0c`](https://gitlab.open-xchange.com/frontend/ui/commit/d847c0cc35217b7414d9e52168fecdfdec3f0479)
- Current folder background in dark theme [`aa2e6d6`](https://gitlab.open-xchange.com/frontend/ui/commit/aa2e6d6de93d5092d5689e3f6bea359a2b3f49a1)
- Import of `yell` [`c2ef97d`](https://gitlab.open-xchange.com/frontend/ui/commit/c2ef97d27cb2611e0c3fadacdc161072162cd9a6)
- Redis prefix was not resolved [`be1edef`](https://gitlab.open-xchange.com/frontend/ui/commit/be1edef9af82586689a778d7cafd191161c80b69)

## [8.2.0] - 2022-04-29

### Changed

- Method and property shorthand syntax for object literals [`1f311a5`](https://gitlab.open-xchange.com/frontend/ui/commit/1f311a5ba783b63265e0df50e98cf1fcede97280)
- Serve assets for /themes/default from core-ui pod [`676f14b`](https://gitlab.open-xchange.com/frontend/ui/commit/676f14b8572f713ed73773970b90605cbbf09ebb)

### Removed

- Removed workaround for [`OXUIB-1528`](https://jira.open-xchange.com/browse/OXUIB-1528) [`3924f07`](https://gitlab.open-xchange.com/frontend/ui/commit/3924f0756b15ced02cb296e62e8b00daf1a79873)

### Fixed

- [`DOCS-3151`](https://jira.open-xchange.com/browse/DOCS-3151): Show busy screen while loading permissions [`f83403d`](https://gitlab.open-xchange.com/frontend/ui/commit/f83403ddde973fce659cbfa00893c7eb3c4c8823)
- [`OXUIB-768`](https://jira.open-xchange.com/browse/OXUIB-768): Follow-up appointments: purging old conference data [`d646695`](https://gitlab.open-xchange.com/frontend/ui/commit/d64669545c2eadfac9d8f008335f671f92e3c17c)
- [`OXUIB-1565`](https://jira.open-xchange.com/browse/OXUIB-1565): Open and close of message in draft folder creates another message in the draft folder [`80a5996`](https://gitlab.open-xchange.com/frontend/ui/commit/80a5996ff0940a3ccbc65902ccbf7a121da966ae)
- [`OXUIB-1531`](https://jira.open-xchange.com/browse/OXUIB-1531): Reply to a sent message during search replies to sender (i.e. you) [`f78b16d`](https://gitlab.open-xchange.com/frontend/ui/commit/f78b16d251930786921debb707a46663d5b52d3e)
- [`OXUIB-1485`](https://jira.open-xchange.com/browse/OXUIB-1485): Distribution list is not shown in mail compose [`e787cba`](https://gitlab.open-xchange.com/frontend/ui/commit/e787cbada0bf241f500d2ce6c96aa599ccfbaa46)
- [`DOCS-4353`](https://jira.open-xchange.com/browse/DOCS-4353): Safari: missing target highlight during DND in Drive [`a885def`](https://gitlab.open-xchange.com/frontend/ui/commit/a885defdc85a02343dd31f8c013050f826fe68f8)
- [`OXUIB-1580`](https://jira.open-xchange.com/browse/OXUIB-1580): Sender address pill too high [`1cd9edb`](https://gitlab.open-xchange.com/frontend/ui/commit/1cd9edb45f29b5b4d18399cf01adfeb06ba07d0b)
- [`DOCS-4437`](https://jira.open-xchange.com/browse/DOCS-4437): Missing theme support for DND zones [`8d9c59e`](https://gitlab.open-xchange.com/frontend/ui/commit/8d9c59e1f09a67a51c356d5120766dad6c521ff9)
- [`OXUIB-1547`](https://jira.open-xchange.com/browse/OXUIB-1547): Date in calendar icon does not update [`7e0183a`](https://gitlab.open-xchange.com/frontend/ui/commit/7e0183ab8263f277dd1582a4db657546ed813e5d)
- Fix issue if main multifactor method not enabled and user has backup.  Was causing loop. [`9e941c0`](https://gitlab.open-xchange.com/frontend/ui/commit/9e941c00eab63421c7e1234265686ab95029f9f8)
- [`OXUIB-1525`](https://jira.open-xchange.com/browse/OXUIB-1525): Dav sync button clickable for subscribed shared task folder [`1678b98`](https://gitlab.open-xchange.com/frontend/ui/commit/1678b980735a90a45931a6cc9c44e3871536c588)
- "checkFileReferences" for error cases on firefox [`e23b4f1`](https://gitlab.open-xchange.com/frontend/ui/commit/e23b4f1423d2eb48bd515786504a88559d954cec)
- [`OXUIB-1532`](https://jira.open-xchange.com/browse/OXUIB-1532): Visible Gap at Bottom of Mail Compose View [`829a460`](https://gitlab.open-xchange.com/frontend/ui/commit/829a460b04aada3858c96cf20c31cede6ab7ce82)
- [`OXUIB-1296`](https://jira.open-xchange.com/browse/OXUIB-1296): High resolution images are deleted when trying to add them to the email body [`6d906e7`](https://gitlab.open-xchange.com/frontend/ui/commit/6d906e726839c5086d151263bf808ead1138a4f5), [`e0c3195`](https://gitlab.open-xchange.com/frontend/ui/commit/e0c3195a84acb7961fb6abafde2ecc2e468db963)
- [`OXUIB-889`](https://jira.open-xchange.com/browse/OXUIB-889): File storage removed from cache once a (sub)folder get's deleted [`8f144e7`](https://gitlab.open-xchange.com/frontend/ui/commit/8f144e7b407e88c7eb1a638fe4435b107759b27f)
- Prevent focus from being trapped in modal dialog when tinymce plugin is opened [`227e241`](https://gitlab.open-xchange.com/frontend/ui/commit/227e241777e9ec3df19e1ce745bc4c916415f2e2)
- [`DOCS-4438`](https://jira.open-xchange.com/browse/DOCS-4438): Dropzone in File details is too big in dark mode [`b55381b`](https://gitlab.open-xchange.com/frontend/ui/commit/b55381b5dac12c7a28a32b3896d4be42c6e76add)
- [`OXUIB-1546`](https://jira.open-xchange.com/browse/OXUIB-1546): Missing participants view in appointment conflict dialog [`42419b3`](https://gitlab.open-xchange.com/frontend/ui/commit/42419b36921a43f5810fcc6f7707408dc4d31fad)
- [`OXUIB-1474`](https://jira.open-xchange.com/browse/OXUIB-1474): Race condition when toggling mail filter rules [`d8e4802`](https://gitlab.open-xchange.com/frontend/ui/commit/d8e48020efaafce2044aa1bfb882234bf612f7e2)
- Fix order of deputy permissions [`aabe0d8`](https://gitlab.open-xchange.com/frontend/ui/commit/aabe0d82075815313a4da9730bee5b4226ed7b58)
- [`OXUIB-1101`](https://jira.open-xchange.com/browse/OXUIB-1101): Password reset error message on wrong password always in english [`350f52e`](https://gitlab.open-xchange.com/frontend/ui/commit/350f52e27ff000052010cbbc523916fcf9ecee43)
- [`DOCS-4403`](https://jira.open-xchange.com/browse/DOCS-4403): Missing theme for file upload bar [`a3aa275`](https://gitlab.open-xchange.com/frontend/ui/commit/a3aa275dab7d485973cb8e322df1c771847339de)
- [`OXUIB-1507`](https://jira.open-xchange.com/browse/OXUIB-1507): Js error when cancelling appointment discard dialog [`1536fe5`](https://gitlab.open-xchange.com/frontend/ui/commit/1536fe5b6ccac6156854e8b70e5d032f35710bc7)
- [`OXUIB-1545`](https://jira.open-xchange.com/browse/OXUIB-1545): Mail composer: Hide tooltip for inactive button [`0af28b7`](https://gitlab.open-xchange.com/frontend/ui/commit/0af28b7f09d62b3ca6ef694403633fc601673d86)
- [`OXUIB-1500`](https://jira.open-xchange.com/browse/OXUIB-1500): Breadcrumb disable option does not work codewise [`2b68132`](https://gitlab.open-xchange.com/frontend/ui/commit/2b68132a9c54d27bbd9b433b0010e71071cd386d)
- [`OXUIB-1522`](https://jira.open-xchange.com/browse/OXUIB-1522): Edit recurrence window gives warning message even when the occurrence is positive. [`f2e6c26`](https://gitlab.open-xchange.com/frontend/ui/commit/f2e6c26b49c7c55c842d58cfd5f4906494e99e67)
- [`OXUIB-1572`](https://jira.open-xchange.com/browse/OXUIB-1572): Disabling "validateMailAddresses" partially not working anymore [`6213301`](https://gitlab.open-xchange.com/frontend/ui/commit/6213301d39ff346593c3924cbace89aed8108fc8)
- [`OXUI-1541`](https://jira.open-xchange.com/browse/OXUI-1541): Typo in size abbreviation and missing comments on some strings [`bf52393`](https://gitlab.open-xchange.com/frontend/ui/commit/bf52393586a4d7f0f4cb95734c89a98679c88858)
- [`OXUIB-1326`](https://jira.open-xchange.com/browse/OXUIB-1326): Wrong Appointment Color in Dialog [`e0af367`](https://gitlab.open-xchange.com/frontend/ui/commit/e0af3678f365b3e240183e1dc00f90731f046758)
- [`OXUIB-1567`](https://jira.open-xchange.com/browse/OXUIB-1567): "Analyze" action is not triggered for "Federated Sharing"-E-Mail. [`8e9c099`](https://gitlab.open-xchange.com/frontend/ui/commit/8e9c09943b14673e8182c0a33e327bfbd50dd3b0)
- [`OXUIB-1552`](https://jira.open-xchange.com/browse/OXUIB-1552): Mobile: Wrong selection marker when attaching file from Drive to mail [`af45d59`](https://gitlab.open-xchange.com/frontend/ui/commit/af45d597bf2a79d7c97429557bc46fcf738cd186)
- [`DOCS-4395`](https://jira.open-xchange.com/browse/DOCS-4395): Context menu for file versions is hard to recognize [`8d5c723`](https://gitlab.open-xchange.com/frontend/ui/commit/8d5c72316318d694bca2bd66d39501839120ce19)
- [`OXUIB-1480`](https://jira.open-xchange.com/browse/OXUIB-1480): [A11y] Focusable element in folder node [`64f5e2c`](https://gitlab.open-xchange.com/frontend/ui/commit/64f5e2cc8875952be814e9e016a5953ec926b9f0)
- [`DOCS-3880`](https://jira.open-xchange.com/browse/DOCS-3880): File description text can be outside the viewport for huge words [`9749840`](https://gitlab.open-xchange.com/frontend/ui/commit/9749840c9f78ff3dcdf78c128f7df6f555fde96b)

## [8.1.4] - 2022-04-28

### Fixed

- [`OXUIB-1581`](https://jira.open-xchange.com/browse/OXUIB-1581): App Icons are missing [`8a7285b`](https://gitlab.open-xchange.com/frontend/ui/commit/8a7285b464389873c97b585e5123e5b9481333cd)
- [`OXUIB-1584`](https://jira.open-xchange.com/browse/OXUIB-1584): Dynamic theme logo size is used only for 'white' theme [`a46bd17`](https://gitlab.open-xchange.com/frontend/ui/commit/a46bd17b96f97af59c263bdeecbcf6a60e9592d9)
- [`OXUIB-1588`](https://jira.open-xchange.com/browse/OXUIB-1588): Add favorite timezones button has no text [`7d2b036`](https://gitlab.open-xchange.com/frontend/ui/commit/7d2b036259d6387c7c437c42bee53a5a8854f57b)
- [`OXUIB-1591`](https://jira.open-xchange.com/browse/OXUIB-1591): Two search fields in UI [`9037cf3`](https://gitlab.open-xchange.com/frontend/ui/commit/9037cf37e5093b93410986e1fcdaf0af3a75c9ba)
- [`OXUIB-1592`](https://jira.open-xchange.com/browse/OXUIB-1592): Add mail account flow is broken [`d3e78a6`](https://gitlab.open-xchange.com/frontend/ui/commit/d3e78a6b8dce96e39f438ab6bc58809dfe2ca5b7)
- [`OXUIB-1594`](https://jira.open-xchange.com/browse/OXUIB-1594): Not sending/receiving shared drive service emails [`873f25a`](https://gitlab.open-xchange.com/frontend/ui/commit/873f25a2f0f34e89debbff1aa9166e813aa51bab)
- [`OXUIB-1600`](https://jira.open-xchange.com/browse/OXUIB-1600): Textarea for editing signatures as source code uneditable [`6033a29`](https://gitlab.open-xchange.com/frontend/ui/commit/6033a297faa1d0d2f5a479249da0de1649dc3743)

## [8.1.3] - 2022-04-26

### Added

- Added [`OXUI-991`](https://jira.open-xchange.com/browse/OXUI-991): Add a config switch to enable the Upsell Demo [`2c5fdfe`](https://gitlab.open-xchange.com/frontend/ui/commit/2c5fdfe979ef75f05bca92938ba98e5ed5ee8f51)

### Fixed

- [`OXUIB-1537`](https://jira.open-xchange.com/browse/OXUIB-1537): Not able to cancel the conflict popup on a series exception [`3c0a68c`](https://gitlab.open-xchange.com/frontend/ui/commit/3c0a68c68aaeb17bb0613ec61ace9a58bda2f302)
- [`OXUIB-1577`](https://jira.open-xchange.com/browse/OXUIB-1577): Various issues with task notifications [`7c86992`](https://gitlab.open-xchange.com/frontend/ui/commit/7c86992ca66f63b82b9358030834f3042b77d759)
- [`OXUIB-1586`](https://jira.open-xchange.com/browse/OXUIB-1586): Error message creating contact with file [`b53e268`](https://gitlab.open-xchange.com/frontend/ui/commit/b53e268709ea06c169f21944458082fba6aab106)
- [`OXUIB-1582`](https://jira.open-xchange.com/browse/OXUIB-1582): Zoom o-auth callback was missing scheme part in url [`5e0bd3f`](https://gitlab.open-xchange.com/frontend/ui/commit/5e0bd3fda71c0305cb4b80ea9212296834ea0724)

## [8.1.2] - 2022-04-12

### Added

- Autochangelog [`996716d`](https://gitlab.open-xchange.com/frontend/ui/commit/996716dccd6c6dac7b014c07fa615acb802f42ad)

### Fixed

- Fix vulnerability of moment 2.29.1 by using 2.29.2 [`a9fe179`](https://gitlab.open-xchange.com/frontend/ui/commit/a9fe17969b2751b5674f8e04be1ba686abc71265)
- Regression with checkbox on login page due to changed markup and CSS [`6efcc5f`](https://gitlab.open-xchange.com/frontend/ui/commit/6efcc5fe0b84d4e6f8a3ffceba37552d314808fc)
- Fix hanging mail compose with broken deputies [`bb97069`](https://gitlab.open-xchange.com/frontend/ui/commit/bb9706927627c2807417e911b151d723dedc5dc0)

## [8.1.1] - 2022-04-04

### Fixed

- [`OXUIB-1529`](https://jira.open-xchange.com/browse/OXUIB-1529): Custom theme not loaded
- [`OXUIB-1523`](https://jira.open-xchange.com/browse/OXUIB-1523): AdvancedSearch: Showing more than 100 results does not work
- [`OXUIB-1414`](https://jira.open-xchange.com/browse/OXUIB-1414): Radio button for confirmation state not vertically centered
- Change order of appearance of upsell demo code (might have a race condition)
- Missing busy animation on login screen

## [8.1.0] - 2022-03-28

### Added

- [`OXUI-933`](https://jira.open-xchange.com/browse/OXUI-933): Port changes for switchboard/conferences to 8.0

### Changed
- Refactored logo handling
  - Move all theming settings from io.ox/core//themes to io.ox/core//theming, e.g.
    - io.ox/core//theming/logo
    - io.ox/core//theming/allowlist
    - io.ox/core//theming/blocklist
    - io.ox/core//theming/themes/...
  - Calculate color contrast of mainColor against white background in dynamic theme and adjust the (accent color) luminance shift accordingly so that we eventually get a color contrast of 4.5:1 (or better).
  - Refactored logo handling. Dynamic theming still wins over anything else. Otherwise:
    - serverConfig.useOXLogo -> use the old default logo (only considers "height"; see below)
    - io.ox/core//theming/logo/name -> filename of custom logo
    - io.ox/core//theming/logo/dark -> filename of custom logo for dark mode
    - io.ox/core//theming/logo/height -> define CSS height, e.g. "24px" or "100%"
    - io.ox/core//theming/logo/base -> different base path used instead of "./themes/$theme"
      $theme is taken directly from io.ox/core//theme (not ox.theme)
    - On smartphones it is also checked whether the following settings are set:
      - io.ox/core//theming/logo/smartphone/name
      - io.ox/core//theming/logo/smartphone/dark
      - io.ox/core//theming/logo/smartphone/height
    - if no custom logo is defined, "./themes/default/logo-dynamic.svg" is used
  - Removed logo from about dialog for now (unclear how this might look if custom logos are involved)
- Replaced old search API in Drive by advancedSearch API
- Login page configuration

### Fixed
- [`OXUIB-1354`](https://jira.open-xchange.com/browse/OXUIB-1354): Recurrence string overflows calendar edit dialog
- [`OXUIB-1369`](https://jira.open-xchange.com/browse/OXUIB-1369): Reload now bar blocks draft message edit window
- [`OXUIB-1416`](https://jira.open-xchange.com/browse/OXUIB-1416): Misaligned notification dot for chat
- [`OXUIB-1442`](https://jira.open-xchange.com/browse/OXUIB-1442): Grouping mails by conversation in "Unread" folder broken
- [`OXUIB-1452`](https://jira.open-xchange.com/browse/OXUIB-1452): Calendar shows wrong calculated information for created "All day" appointment
- [`OXUIB-1454`](https://jira.open-xchange.com/browse/OXUIB-1454): Drive viewer not showing files
- [`OXUIB-1463`](https://jira.open-xchange.com/browse/OXUIB-1463): Unread folder not translated
- [`OXUIB-1479`](https://jira.open-xchange.com/browse/OXUIB-1479): Edit contact data: incorrect reaction on too long data (e.g. profession)
- [`OXUIB-1484`](https://jira.open-xchange.com/browse/OXUIB-1484): Sticky hover on OX logo
- [`OXUIB-1486`](https://jira.open-xchange.com/browse/OXUIB-1486): Unable to open calendar folder context menu for iCalendar feeds
- [`OXUIB-1489`](https://jira.open-xchange.com/browse/OXUIB-1489): Columns From and Subject in Drive misaligned
- [`OXUIB-1504`](https://jira.open-xchange.com/browse/OXUIB-1504): When moving mail to another folder during search the target folder cannot be accessed right away
- [`DOCS-4172`](https://jira.open-xchange.com/browse/DOCS-4172): Show share folder conflicts
- [`DOCS-4281`](https://jira.open-xchange.com/browse/DOCS-4281): Fixed path to PDFjs resources
- [`DOCS-4320`](https://jira.open-xchange.com/browse/DOCS-4320): Fixed tooltips in Drive list view
- [`DOCS-4321`](https://jira.open-xchange.com/browse/DOCS-4321): File icon of viewer rename button should be outside of the button
- [`DOCS-4335`](https://jira.open-xchange.com/browse/DOCS-4335): File list could be wrong with changed file read permissions on parent folder
- [`DOCS-4356`](https://jira.open-xchange.com/browse/DOCS-4356): Viewing old versions in Viewer has some styling issues
- Icon position and dark mode in distribution list
- Visual selection glitches in list view and vgrid (border-radius issues)
- Display of color flags in mail list view; especially for threads

## [8.0.236411] - 2022-03-11

### Fixed
- Reapplied fix for [`OXUIB-1445`](https://jira.open-xchange.com/browse/OXUIB-1445). Some edits were missing, probably due to different order of cherry-picks

## [8.0.236410] - 2022-03-11

### Added
- [`OXUI-933`](https://jira.open-xchange.com/browse/OXUI-933): Port changes for switchboard/conferences to 8.0
- Add e2e tests for [`OXUIB-1355`](https://jira.open-xchange.com/browse/OXUIB-1355)

### Fixed
- [`OXUIB-1315`](https://jira.open-xchange.com/browse/OXUIB-1315): After picture preview icon folder-up moves up on mobile
- [`OXUIB-1394`](https://jira.open-xchange.com/browse/OXUIB-1394): Inconsistent naming in contacts
- [`OXUIB-1407`](https://jira.open-xchange.com/browse/OXUIB-1407): Text in vgrid-options dropdown for tasks cut off
- [`OXUIB-1409`](https://jira.open-xchange.com/browse/OXUIB-1409): Selecting folders breaks mail search
- [`OXUIB-1412`](https://jira.open-xchange.com/browse/OXUIB-1412): 'Group by conversation' for mail has no display whether it's on or not
- [`OXUIB-1413`](https://jira.open-xchange.com/browse/OXUIB-1413): No help files for not translated help languages
- [`OXUIB-1414`](https://jira.open-xchange.com/browse/OXUIB-1414): Radio button for confirmation state not vertically centered
- [`OXUIB-1415`](https://jira.open-xchange.com/browse/OXUIB-1415): Print option available in menu even though it is not supported
- [`OXUIB-1418`](https://jira.open-xchange.com/browse/OXUIB-1418): App Suite logo disappears (Safari only)
- [`OXUIB-1422`](https://jira.open-xchange.com/browse/OXUIB-1422): Calendar - Zoom details cannot be marked and copied in location
- [`OXUIB-1434`](https://jira.open-xchange.com/browse/OXUIB-1434): "Add storage account" listed at wrong position in "New" dropdown
- [`OXUIB-1445`](https://jira.open-xchange.com/browse/OXUIB-1445): Switchboard code always loaded even without proper capability or config
- [`OXUIB-1446`](https://jira.open-xchange.com/browse/OXUIB-1446): Inline help for contact picker leads to 404
- [`OXUIB-1451`](https://jira.open-xchange.com/browse/OXUIB-1451): Minor fixes for OX Viewer (color adjustments for dark mode)
- [`OXUIB-1445`](https://jira.open-xchange.com/browse/OXUIB-1445): Switchboard code always loaded even without proper capability or config
- Adjusted colors in file preview
- Bring back the gradients for the favicon.svg
- Disabled scroll-snap for mobile mail list view
- Absolute path of default SVG favicon
- Accidental caching of `meta` response
- Broken date handling in vacation notice
- Broken upsell demo
- e2e tests that fail over the weekend (C264519, C274406, C244799, C7865); added some generic helpers for such cases
- `getShardingRoot` returns `undefined`
- Icon size consistency (three-dots)
- Misaligned unseen indicators and checkboxes in all mail layouts
- Non-working up/down arrows in mail list view in Safari
- Some e2e multi-factor authentication tests
- Too early settings access; also added settings.ready(...)
- Access to undefined access on getCurrent() in theming
- [`OXUIB-1472`](https://jira.open-xchange.com/browse/OXUIB-1472): [A11y] App logo has no discernible text when logoAction is set
- [`OXUIB-1129`](https://jira.open-xchange.com/browse/OXUIB-1129): Avatars with initials misaligned in firefox
- [`OXUIB-1471`](https://jira.open-xchange.com/browse/OXUIB-1471): Outdated and broken link in configuration documentation
- Introduce different fix for [`DOCS-3985`](https://jira.open-xchange.com/browse/DOCS-3985) to avoid too early code loading

## [8.0.236409] - 2022-03-08

### Fixed

- Addons have the wrong height on mobile (see 38987e3a)
- Dark Theme: Addons (timezone) not themed
- Date picker breaks when choosing a four letter timezone
- Date picker groups sometimes break into multiple lines when changing text-zoom
- Date picker inputs scale incorrectly on full-zoom (chrome)
- Fix alignment and sizes in scheduling view header
- Generally makes input groups more resilient and removes some explicit widths and heights
- Select contact button has a border radius that is only visible on hover but slightly different
- Select contact button has a very small clickable area
- Task edit: Timezone is misaligned in task edit dialog
- Timezone hover/focus style is inconsistent with other controls in the same dialog

### Removed

- Date picker workaround d58e8514
- Task progress workaround 38987e3a

## [8.0.236408] - 2022-03-07

### Added

- Some more translations

### Changed

- [`OXUI-924`](https://jira.open-xchange.com/browse/OXUI-924): As a user I can configure how scheduling mails are handled

### Fixed

- [`DOCS-4331`](https://jira.open-xchange.com/browse/DOCS-4331): Removed column 7010 from excludes, instead of adding it per request
- [`MWB-1469`](https://jira.open-xchange.com/browse/MWB-1469): (UI part) Can't remove myself from others person appointment
- [`OXUIB-1251`](https://jira.open-xchange.com/browse/OXUIB-1251): Having E-Mails set to "text only" still shows the Button for Text formatting
- [`OXUIB-1389`](https://jira.open-xchange.com/browse/OXUIB-1389): Secondary calendar timezones misaligned
- [`OXUIB-1339`](https://jira.open-xchange.com/browse/OXUIB-1339): Quota widget cut off
- [`OXUIB-1400`](https://jira.open-xchange.com/browse/OXUIB-1400): Settings - Manage shares. The opened dialog does not up show any shares
- [`OXUIB-1042`](https://jira.open-xchange.com/browse/OXUIB-1042): Calendar entry can not be modified (empty popup, UI hangs) (#2)
- [`OXUIB-1403`](https://jira.open-xchange.com/browse/OXUIB-1403): Drive file preview opens Sharing dialog always in dark mode
- Add storage account
- Fix absolute path of default SVG favicon
- Fix task css

## [8.0.236407] - 2022-03-03

### Added

- [`OXUI-924`](https://jira.open-xchange.com/browse/OXUI-924): As a user I can configure how scheduling mails are handled

### Changed

- Improve code loading and error handling

### Fixed

- [`DOCS-3924`](https://jira.open-xchange.com/browse/DOCS-3924): Add fallback for possibly missed edge cases to ensure always correctly displayed share states in drive
- [`DOCS-4095`](https://jira.open-xchange.com/browse/DOCS-4095): Always re-use existing models when updating File Details or listeners on model changes will not work
- [`DOCS-4095`](https://jira.open-xchange.com/browse/DOCS-4095): Drive list view reacts to collection model changes of extendedPermissions now
- [`DOCS-4095`](https://jira.open-xchange.com/browse/DOCS-4095): Share section reacts to extendedPermission changes
- [`DOCS-4095`](https://jira.open-xchange.com/browse/DOCS-4095): Fixed problems with missing list reloads with sharing
- [`DOCS-4095`](https://jira.open-xchange.com/browse/DOCS-4095): Fix for drive list reload can have outdated folder data
- [`DOCS-4179`](https://jira.open-xchange.com/browse/DOCS-4179): Not shared folders can be shown in virtual My Shares folder
- [`DOCS-4214`](https://jira.open-xchange.com/browse/DOCS-4214): Corrected sharing role dropdown layout
- [`DOCS-4214`](https://jira.open-xchange.com/browse/DOCS-4214): Corrected naming for public link in shares section
- [`DOCS-4214`](https://jira.open-xchange.com/browse/DOCS-4214): Corrected focus style in share dialog
- [`DOCS-4279`](https://jira.open-xchange.com/browse/DOCS-4279): Fixed layout issues in Drive and Viewer
- [`DOCS-4327`](https://jira.open-xchange.com/browse/DOCS-4327): Wrong icon for favorites in file details
- [`OXUIB-912`](https://jira.open-xchange.com/browse/OXUIB-912): io.ox/contacts//showDepartment setting removed from UI documentation
- [`OXUIB-1316`](https://jira.open-xchange.com/browse/OXUIB-1316): Dark themes checkmarks are invisible after taking an action like delete (additional commit)
- [`OXUIB-1347`](https://jira.open-xchange.com/browse/OXUIB-1347): Enterprise address picker visible also when not configured
- [`OXUIB-1371`](https://jira.open-xchange.com/browse/OXUIB-1371): Seems like no green pipeline runs between 23:00 and midnight (or later) #2 (closed)
- [`OXUIB-1386`](https://jira.open-xchange.com/browse/OXUIB-1386): No advice when browser does not support modules
- [`OXUIB-1393`](https://jira.open-xchange.com/browse/OXUIB-1393): Missing settings for layout options in address book and tasks
- Fixes platform-os-support on login page
- Show "add storage/mail account" in the secondary dropdown also
- Drive: Do not show anonymized public links from other users
- Drive: fix not working sharing section in pop-out views
- Viewer: fixed missing translation for 'None'

## [8.0.236406] - 2022-02-27

### Fixed

- Mail sanitizer looks for typical patterns to recognize inline image because URLs are a bit unpredictable

## [8.0.236405] - 2022-02-27

### Fixed

- Mail sanitizer considers ox.root when looking for inline images

## [8.0.236404] - 2022-02-26

### Fixed

- Drive toolbar is not clickable when folder is empty (Safari specific)

## [8.0.236403] - 2022-02-25

### Fixed

- Runtime error when trying to print address lists

## [8.0.236402] - 2022-02-25

### Fixed

- [`DOCS-4279`](https://jira.open-xchange.com/browse/DOCS-4279): Fixed layout issues in Drive and Viewer
- [`DOCS-4283`](https://jira.open-xchange.com/browse/DOCS-4283): Correct caret icon in toolbars
- [`DOCS-4266`](https://jira.open-xchange.com/browse/DOCS-4266): Optimize toolbar item order in Drive
- [`OXUIB-1331`](https://jira.open-xchange.com/browse/OXUIB-1331): Eslint/vscode fixes
- [`OXUIB-1371`](https://jira.open-xchange.com/browse/OXUIB-1371): Seems like no green pipeline runs between 23:00 and midnight (or later)
- [`OXUIB-1372`](https://jira.open-xchange.com/browse/OXUIB-1372): Fixes all occurrences of broken getCurrentUser(...).done
- Date-parsing issue with calendar search; also limiting result set
- Extended dialog does not appear
- env-defaults: update SERVER according to recent changes
- Missing gt calls to "Whats New" wizard
- Runtime error when sending a new mail to an email's recipients (done vs then)

## [8.0.236401] - 2022-02-24

### Changed

- Replaced all remaining occurrences of ox.base by ox.root; ox.base must not be used from 8.0 on

### Fixed

- Mail search offered "All folders" even if virtual/all is not available
- About dialog does not list services versions if appRoot differs form '/'
- Missing gt() calls for accept, tentative, decline in appointment confirmation popup

## [8.0.236400] - 2022-02-23

### Changed

- Polished 'Smoke gray' theme
- Polished appointment detail view (join meeting button, missing status updates, paddings, colors etc.)

### Fixed

- Column 7030 issue. Now really using a central list of default columns to avoid using unsupported columns

## [8.0.236399] - 2022-02-23

### Added

- Integrate latest translations

### Changed

- Changing default for setting "autoOpenNotification" to false

### Fixed

- [`DOCS-4281`](https://jira.open-xchange.com/browse/DOCS-4281): Pack web resources of pdfjs to fix rendering PDFs with embedded comments
- [`OXUIB-1260`](https://jira.open-xchange.com/browse/OXUIB-1260): Update App Store URL for new iOS app
- [`OXUIB-1276`](https://jira.open-xchange.com/browse/OXUIB-1276): New search is broken with names that include spaces
- [`OXUIB-1300`](https://jira.open-xchange.com/browse/OXUIB-1300): Events cannot be moved to a new calendar from edit dialog
- [`OXUIB-1322`](https://jira.open-xchange.com/browse/OXUIB-1322): Bottom corners of windows are not round
- [`OXUIB-1351`](https://jira.open-xchange.com/browse/OXUIB-1351): Quite often I see two red warnings and two switchboard connect messages in console
- [`OXUIB-1355`](https://jira.open-xchange.com/browse/OXUIB-1355): Embedded images of welcome mail broken no longer considered as external
- Drive: fixed 'visible-selection' mode on smartphones
- Drive: fixed selection/change of virtual folders on smartphones
- Drive: fixed layout of folder names in tiles view

## [8.0.236398] - 2022-02-22

### Added

- [`OXUI-957`](https://jira.open-xchange.com/browse/OXUI-957): Disable SVG favicon per config
- Copyright in about dialog also understands $year as a placeholder

### Fixed

- [`OXUIB-1351`](https://jira.open-xchange.com/browse/OXUIB-1351): Quite often I see two red warnings and two switchboard connect messages in console
- Prevent detail popups from appearing out of viewport
- [`OXUIB-1359`](https://jira.open-xchange.com/browse/OXUIB-1359): "Connect your device" wizard lacks images

## [8.0.236397] - 2022-02-21

### Added

- Introduce setting io.ox/onboarding//hidden/apps

### Changed

- Inbox categories now have their own visual panel
- Current time indicator has a slightly larger dot and a thicker line within the current day
- Hide syncapp as default in onboarding wizard (see documentation of io.ox/onboarding//hidden/apps)
- Help: Update inline help urls
- Bump bootstrap-icons from 1.8.0 to 1.8.1
- Bump clipboard from 2.0.9 to 2.0.10
- Bump puppeteer from 13.1.3 to 13.3.2 in /e2e
- Bump swiper from 7.4.1 to 8.0.6

### Fixed

- [`OXUIB-1288`](https://jira.open-xchange.com/browse/OXUIB-1288): Chat sidepanel moves behind drive
- [`OXUIB-1324`](https://jira.open-xchange.com/browse/OXUIB-1324): Missing icon "share" results in question-octagon in folder tree
- [`OXUIB-1329`](https://jira.open-xchange.com/browse/OXUIB-1329): Fix layout, text-overflow and more in compose/detail attachment list
- [`OXUIB-1337`](https://jira.open-xchange.com/browse/OXUIB-1337): Only ask once per session to register mailto handler
- [`OXUIB-1345`](https://jira.open-xchange.com/browse/OXUIB-1345): Entry count in address book is always 0
- [`OXUIB-1349`](https://jira.open-xchange.com/browse/OXUIB-1349): Hover box for account dropdown misaligned
- [`DOCS-3918`](https://jira.open-xchange.com/browse/DOCS-3918): Fixing reload process for thumbnails in drive
- [`DOCS-3989`](https://jira.open-xchange.com/browse/DOCS-3989): Sign out alert when logging out
- [`DOCS-4189`](https://jira.open-xchange.com/browse/DOCS-4189): Change image position on scale to view the complete image
- [`DOCS-4196`](https://jira.open-xchange.com/browse/DOCS-4196): Responsive Behaviour in Drive is insufficient
- [`DOCS-4198`](https://jira.open-xchange.com/browse/DOCS-4198): Full rework of OX Viewer styling
- [`DOCS-4206`](https://jira.open-xchange.com/browse/DOCS-4206): Fix color of close button in tour wizard
- [`DOCS-4220`](https://jira.open-xchange.com/browse/DOCS-4220): Add missing shareable test for details share button
- [`DOCS-4224`](https://jira.open-xchange.com/browse/DOCS-4224): Fix my files folder sorting
- [`DOCS-4245`](https://jira.open-xchange.com/browse/DOCS-4245): Enhanced share settings icon for dark mode and added missing tooltip
- [`DOCS-4242`](https://jira.open-xchange.com/browse/DOCS-4242): Search button on mobile sets focus
- A11y: Improve keyboard navigation of mail attachments
- Documentation: Fixes typos
- Add missing width limit on touch devices (.window-body)
- Make freebusy view more robust for external data
- Runtime error when browsing contacts (race condition, breadcrumb disposed)
- White color on white background for some mails
- Added proper names of two illustrations in What's New dialog

## [8.0.236396] - 2022-02-18

### Fixed

- Dynamic theme is not applied if it brings no change compared to server-side default values
- Introduced support for self-referencing variables in dynamic themes configuration
- Removed "height: auto !important" from .form-control
- Avoiding showing undefined revision or undefined version in about dialog

## [8.0.236395] - 2022-02-18

### Fixed

- Use ox-favicons if serverConfig.useOXLogo is set to true
- Form control height for login page
- Base paths for some resources (sounds, tinyMCE)

## [8.0.236394] - 2022-02-17

### Added

- Documentation: enterprise picker

### Fixed

- Add support for different appRoot for Whats New dialog
- Redesign: fixed icons, theming, autocomplete for search
- Service worker will cache requests when baseurl is not /
- [`OXUIB-1263`](https://jira.open-xchange.com/browse/OXUIB-1263): Accept/Tentative/Decline order is inconsistent
- Cannot load icons when baseURL is `/appsuite`

## [8.0.236393] - 2022-02-10

### Added

- Add release workflow

## [8.0.236392] - 2022-02-10

App Suite 8.0 comes along with a lot of significant changes. The most relevant are:
1. The most recognizable user-facing change is the UI redesign. The new UI is bright, cleaner, more consistent, and more in line with contemporary user interface design. More details under Added and Changed.
2. Under the hood, the entire Suite is provided as containers that run in Kubernetes. OX provides the required set of images as well as helm charts to deploy the entire stack automatically. Images and charts can be downloaded from a corresponding container registry.

### Added

- This changelog
- Many themes and the option to change the accent color separately
- Dark mode support
- A new search UI across all apps
  - the search bar is now placed in top center position
  - users can open a dropdown that offers a form to filter the search. This should help simple users to discover more complex search functionality if they need to.
  - of course, an auto-complete allows to select the most popular filters while typing
  - existing filters will be shown under the search field to keep this clean more further input
- A large prominent button at top left position to access primary actions
- Illustrations for empty states, upsell, and What's New for a nicer appearance
- Added support for a "Flagged" messages folder if properly configured on imap server
- Text zoom support for better accessibility
- Themes use native CSS variables under the hood

### Changed

- HTTP/2 is now mandatory
- Moved from LESS to SASS
- Moved from FontAwesome (font-based) to Bootstrap Icons (SVG)
- Moved from grunt to vite and rollup
- Refactored entire UI code from AMD (require.js) towards ES6 modules
- No globals any more; all libraries like jQuery and underscore must now be imported as a module
- Refactored many occurrences of $.Deferred() towards async/await
- UI sources (incl. plugins) are no longer served by the App Suite middleware but by to a new UI middleware
- Source caching is no longer using IndexedDB but a service worker with native caching
- Added a new status bar below the mail list view indicating when the last update was done (e.g. "Updated just now")
- Current folder and number of items is usually shown above the list views
- The drafts folder now shows the number of drafts (not unseen messages in this case)
- Instead of just hiding the folder view, users can now collapse it and still access standard folders in a small sidebar
- Color flags and "Star" to mark emails cannot be used in parallel any more
  - admins canconfigure which variant is used
  - reason for that change is that both need the imap flag \Flagged to work properly with other clients. If \Flagged is set, clients like Thunderbird or Apple Mail will mark the message with a star (Thunderbird) or red flag (Apple Mail).
  - App Suite now also supports Apple-specific keywords to synchronize color flags between App Suite and Apple Mail
- Mail threads now show all different colors flags in list view
- List views just use one layout option to avoid cluttered combinations like checkboxes and contact pictures in parallel
- The settings icon (cog wheel) now opens a larger dropdown that provides popular settings per app
- Calendar views just support a reduced but meaningful set of colors (also compatible with MacOS/iOS clients)
- The appointment detail view now has more structure and offers three buttons to quickly change your confirmation status
- Polished all three layouts in drive and also the file details view
- Added "Recent files" as a virtual folder to drive
- All virtual folders in Drive (Favorites, Recent files, My shares) now support different layouts and file details
- Many layouts are now based on flex layout instead of absolute positioning or floating elements
- Updated all dependencies (libraries & frameworks) to more recent versions

### Removed

- IE11 support (of course)
- Old search and all its code
- Old metrics code
- Schedules (calendar feature)
- Modernizr (lib)
- Hopscotch (unused lib)

[unreleased]: https://gitlab.open-xchange.com/frontend/ui/compare/8.18.1...main
[8.18.1]: https://gitlab.open-xchange.com/frontend/ui/compare/8.18.0...8.18.1
[8.18.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.17.0...8.18.0
[8.17.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.16.0...8.17.0
[8.16.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.15.0...8.16.0
[8.15.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.14.0...8.15.0
[8.14.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.13.0...8.14.0
[8.13.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.12.0...8.13.0
[8.12.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.11.0...8.12.0
[8.11.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.10.0...8.11.0
[8.10.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.9.0...8.10.0
[8.9.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.8.0...8.9.0
[8.8.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.7.0...8.8.0
[8.7.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.6.0...8.7.0
[8.6.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.5.0...8.6.0
[8.5.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.4.0...8.5.0
[8.4.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.3.0...8.4.0
[8.3.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.2.0...8.3.0
[8.2.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.1.4...8.2.0
[8.1.4]: https://gitlab.open-xchange.com/frontend/ui/compare/8.1.3...8.1.4
[8.1.3]: https://gitlab.open-xchange.com/frontend/ui/compare/8.1.2...8.1.3
[8.1.2]: https://gitlab.open-xchange.com/frontend/ui/compare/8.1.1...8.1.2
[8.1.1]: https://gitlab.open-xchange.com/frontend/ui/compare/8.1.0...8.1.1
[8.1.0]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236393...8.1.0
[8.0.236411]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236410...8.0.236411
[8.0.236410]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236409...8.0.236410
[8.0.236409]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236408...8.0.236409
[8.0.236408]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236407...8.0.236408
[8.0.236407]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236406...8.0.236407
[8.0.236406]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236405...8.0.236406
[8.0.236405]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236404...8.0.236405
[8.0.236404]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236403...8.0.236404
[8.0.236403]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236402...8.0.236403
[8.0.236402]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236401...8.0.236402
[8.0.236401]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236400...8.0.236401
[8.0.236400]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236399...8.0.236400
[8.0.236399]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236398...8.0.236399
[8.0.236398]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236397...8.0.236398
[8.0.236397]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236396...8.0.236397
[8.0.236396]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236395...8.0.236396
[8.0.236395]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236394...8.0.236395
[8.0.236394]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.236393...8.0.236394
[8.0.236393]: https://gitlab.open-xchange.com/frontend/ui/compare/8.0.0-0...8.0.236393
