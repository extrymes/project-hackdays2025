---
title: Progressive Web App
---

# Progressive Web App

OX App Suite can be configured to provide an app-like experience for the user. As a [Progressive Web App](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) the user can install OX App Suite on the desktop and mobile devices and interact with it like a native app.

# Configuration

In order to deliver OX App Suite as a Progressive Web App, the UI middleware can be configured to serve host specific web app manifest files.
Currently this can be achieved using [as-config.yml](https://documentation.open-xchange.com/7.10.6/middleware/administration/custom_host_configuration.html) on the Java Middleware component.
A working example that is used for the preview stack looks like this:

```yaml
main:
  host: core-ui-main.dev.oxui.de
  pwa:
    enabled: true
    shortName: UI main Preview
```
The following table shortly explains the most important properties:

| Name | Description |
|-----------------|:-------------|
| enabled | Defaults to `false`, needs to be `true` to generate a manifest. |
| name | Optional. The name displayed to the user is used as a label for the app icon on the homescreen. Defaults to `shortName` if not set.|
| shortName | Optional. A fallback name, when there is not enough space for `name` like on a phone homescreen. A maximum of 12 characters is recommended. Defaults to `OX App Suite` |
| backgroundColor | Optional. Sets the color of the background when opening the PWA and the color of OS-dependent features (Android task switcher, MacOS title bar, etc.) before a user chooses a theme. Defaults to white. |
| icon | Optional. An app icon. It requires a minimum resolution of 144x144 or higher. It is recommended to use opaque icons without transparency. |
| iconWidthHeight | Optional. As the icon needs to be square, this is the width and height of `icon`. |

This leads to a minimal configuration:

```yaml
main:
    host: all
    pwa:
        enabled: true
```

If `pwa.enabled` field is set to true, the `pwa.raw_manifest` field is sent to the client as is.
Content of this field must be a valid [web application manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest).
