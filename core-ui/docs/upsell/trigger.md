---
title: Triggers
---

# Available Upsell triggers

This sections lists the built in triggers provided by the core extension points and how they can be configured. Capabilities marked with ```"static"``` can not be configured with the "requires" attribute. Anything that needs to be customized beyond this config needs custom code that replaces/resets the core extension points.

## Menu bar / Top bar

| ID              | Configurable properties     | Capabilities                              | Shown on mobile | Description                                                                                     |
| --------------- | --------------------------- | ----------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| quick-launchers | none                        |                                           | no              | Part of quick launch icon of an app.                                                            |
| app-launcher    | none                        |                                           | yes             | Part of an app icon within app launcher dropdown menu.                                          |
| upgrade-button  | enabled                     | default: active_sync or caldav or carddav | no              | Former "secondary launcher" An "Upgrade Button" is shown in the topbar next to the search field |
| topbar-dropdown | enabled                     | default: active_sync or caldav or carddav | yes             | Part of main toolbar's dropdown as first entry.                                                 |

Note: In case you want to add quick launcher entries for promoted apps please take a look at the [following settings section]({{ site.baseurl }}/ui/configuration/settings-list-of.html#topbar-apps)

## Folder view

**General**

| ID                    | Configurable properties           | Capabilities                              | Shown on mobile | Description                                                                                                                                                                            |
| --------------------- | --------------------------------- | ----------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mail-folderview-quota | enabled, upsellLimit | active_sync or caldav or carddav  | yes             | Located below the folder view without an icon by default. You can set the upsell limit in Bytes. If the maximum mail quota is larger than upsell limit, the trigger will not be shown. |
| folderview/mail       | enabled, icon, color, title       | active_sync                    | yes             | Located below the folder view of the mail app/module.                                                                                                                                  |
| folderview/contacts   | enabled, icon, color, title       | carddav                        | yes             | Located below the folder view of the addressbook app/module.                                                                                                                           |
| folderview/calendar   | enabled, icon, color, title       | caldav                         | yes             | Located below the folder view of the calendar app/module.                                                                                                                              |

**Premium Features/Area**

Note: These upsell trigger are placed inside the premium area at the bottom of the folder view. These upsell trigger are only shown if the premium area is enabled.
You can enable it by setting ```io.ox/core//upsell/premium/folderView/visible=true```
If the user has closed the premium area once, it will not be shown again. This is stored at ```io.ox/core//upsell/premium/folderView/closedByUser```

| ID                          | Configurable properties | Capabilities                               | On mobile | Description                                        |
| --------------------------- | ----------------------- | ------------------------------------------ | --------- | -------------------------------------------------- |
| folderview/mail/bottom      | enabled, color, title   | active_sync (static)                       | shown     | Default text 'Try now' and has no icon by default. |
| folderview/contacts/bottom  | enabled, color, title   | carddav (static)                           | shown     | Default text 'Try now' and has no icon by default. |
| folderview/calendar/bottom  | enabled, color, title   | caldav (static)                            | shown     | Default text 'Try now' and has no icon by default. |
| folderview/infostore/bottom | enabled, color, title   | boxcom or google or msliveconnect (static) | shown     | Default text 'Try now' and has no icon by default. |

## Misc

| ID                | Configurable properties            | Capabilities               | On mobile | Description                                                                                                                                                                                           |
| ----------------- | ---------------------------------- | -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| client.onboarding | enabled, icon, color               |                            | shown     | Part of "Connect your device" wizard                                                                                                                                                                  |
| portal-widget     | enabled, icon, imageURL, removable | active_sync caldav carddav | shown     | A draggable portal widget. You can add a background image with 'imageURL'. If no image is used, the widget displays the text centered with a customizable space separated list of font-awesome icons. |

# Visibility of triggers

Todo: Text der kurz erklärt enabled vs caps

You can enable upsell for those [capabilities](../customize/manifests.html#capabilities) inside an existing or new file `.properties` with

```javascript
io.ox/core//upsell/enabled/active_sync=true
io.ox/core//upsell/enabled/caldav=true
io.ox/core//upsell/enabled/carddav=true
```

**Note**: You have to restart the server so that the changes take place.
# Listening to Upsell events
If the user clicks on a certain upsell trigger, e.g. OX Drive in the launcher, an event is triggerd on the ox object.
```javascript
upsell:requires-upgrade
```
To register for those events and consume the payload you can do something like
```javascript
import { default: ox } from './ox.js'
...
ox.on('upsell:requires-upgrade' (data) => {
  // data is an object like
  // {
  //   id: "io.ox/files",
  //   missing: "infostore",
  //   type: "app"
  // }

  // pass the data to your upsell handling code
  // e.g. show a modal dialog that takes the user
  // to the customer center where he can purchase the
  // upgrade/feature
  openCustomCheckoutPage(data)
})
```

## Visibility based on capabilities

If you want certain upsell trigger to appear on different [capabilities](../customize/manifests.html#capabilities), you can configure this inside the `.properties` file.

Therefore, you have to configure the required field with a logical expression of capabilities for the trigger. If the actual capabilities does not satisfy the expression and the upsell capabilites satisfies the expression, the upsell trigger will be drawn.

See the following example which requires *eas* and *caldav* or not *carddav*:

```javascript
io.ox/core//features/upsell/$id/requires="active_sync && (caldav || !carddav)"
```

## Disable individual trigger

If you want to disable a custom trigger, you can add the following to the `.properties` file:

```javascript
io.ox/core//features/upsell/$id/enabled=false
```



# Customize appearance/strings

## Change default icon

All custom triggers have a 'bi-stars' as default icon. You can change the default icon to any font-awesome icon or a set of space separated icons.

```javascript
io.ox/core//upsell/defaultIcon="bi/stars.svg"
```

## Change single icon

You can replace the icon of individual trigger with

```javascript
io.ox/core//features/upsell/$id/icon="bi/stars.svg"
```
where '$id' is the id of the upsell trigger.

## Change color for individual trigger

You can change the color of some upsell trigger with

```javascript
io.ox/core//features/upsell/$id/color="#f00"
```
where '$id' is the id of the upsell trigger and the color can be any css color.

## Change text

Some of the custom triggers use a title (or other strings) which a hoster could customize. You can provide your own text via

```javascript
io.ox/core//features/upsell/$id/i18n/$lang/title="A custom title"
```
where '$lang' is the current language identifier (e.g. "en_US").

**Note**: It is important, that several translations are provided.

You can see the current language identifier when you open the webconsole and type

```javascript
ox.language
```
# Feature toggles for upsell

OX App Suite UI offers different feature toggles. These toggles control the appearance of different features in the UI. Find more details about upsell feature toggles under [Settings list]({{ site.baseurl }}/ui/configuration/settings-list-of.html)
