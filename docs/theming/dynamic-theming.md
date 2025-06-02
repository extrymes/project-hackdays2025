---
title: Dynamic Theming
---

# Dynamic Theming

The dynamic theme plugin allows to have custom colors and logo without creating a real theme for each possible color combination. The only available information which can be used to select a theme is the domain name, i.e. the brand.

# Installation

The theme generator consists of the single package `open-xchange-dynamic-theme`, which is installed on the OX middleware.

# Enabling the Plugin

The plugin is enabled or disabled by the capability `dynamic-theme`, e.g. in a file `/opt/open-xchange/etc/dynamic-theme.properties` set

```
com.openexchange.capability.dynamic-theme=true
```

When using the plugin, the actual theme should be the built-in default theme.
To prevent all users from changing it and hide the theme selector in the preferences, set the property `io.ox/core//theme` to read-only.
To do this, change the file `/opt/open-xchange/etc/meta/appsuite.yaml` as follows:

```yaml
io.ox/core//theme:
    protected: true
```

If some users won't use dynamic themes, this approach won't work. Instead, the theme selector can be disabled an enabled by controlling the list of available themes. The theme selector is hidden if the list is empty.
To be able to do that with the config, the entire list of themes needs to be specified as a single JSON value, e.g. by changing the file `/opt/open-xchange/etc/settings/appsuite.properties` as follows:

```
io.ox/core/settingOptions//themes={"default":"Default Theme"}
```

Then, to hide the theme selector for users with a dynamic theme, use the config to change the value to `{}`.

# Specifying a Theme

The package installs the file `/opt/open-xchange/etc/settings/open-xchange-dynamic-theme.properties`, which contains the global defaults for the custom theme settings. Any of the settings contained in that file can be changed per-context or at any other granularity supported by the config. The individual settings are as follows:

| Variable              | Default                 | Dark/Light | Description                                                                                                                                                                                                                                                                                                                          |   |
|-----------------------|-------------------------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---|
| `mainColor`           | `#283f73`               | dark       | The main highlight color. Setting only this variable might already be enough.                                                                                                                                                                                                                                                        |   |
| `linkColor`           | same as `mainColor`     | dark       | Text color for links and border-less buttons.                                                                                                                                                                                                                                                                                        |   |
| `toolbarColor`        | same as `mainColor`     | dark       | Text color for links and border-less buttons in toolbars.                                                                                                                                                                                                                                                                                        |   |
| `logoURL/light`       |                         |            | URL of the logo in the top left corner of the top bar.                                                                                                                                                                                                                                                                               |   |
| `logoURL/dark`        | same as `logoURL/light` |            | URL of the logo in the top left corner of the top bar when dark mode is enabled.                                                                                                                                                                                                                                                                               |   |
| `logoWidth`           | `60`                    |            | Width of the logo as number of pixels or any CSS length unit. Set to `auto` to use the native width of the image. For best display on high-resolution screens, it is recommended to use a bigger image and specify a smaller size here.                                                                                              |   |
| `logoHeight`          | `auto`                  |            | Optional height of the logo as number of pixels or any CSS length unit. The maximum value is 64. Leave as `auto` to scale according to the specified width while preserving the aspect ratio. For best display on high-resolution screens, it is recommended to use a bigger image and specify either `auto` or a smaller size here. |   |
| `topbarBackground`    | same as `mainColor`     | dark       | Background color of the top bar.                                                                                                                                                                                                                                                                                                     |   |
| `topbarHover`         | `rgba(0, 0, 0, 0.3)`    | dark       | Background of an item in the top bar when it has the keyboard focus, the mouse hovers it, or it is active.                                                                                                                                                                                                                           |   |
| `listSelected`        | `#ddd`                  | light      | Background of selected items in the list view when the list view does not have the keyboard focus.                                                                                                                                                                                                                                   |   |
| `listHover`           | `#f7f7f7`               | light      | Background of a not selected item in the list view when the mouse hovers over it.                                                                                                                                                                                                                                                    |   |
| `listSelectedFocus`   | same as `mainColor`     | dark       | Background color of selected items in the list view when the list view has the keyboard focus.                                                                                                                                                                                                                                       |   |
| `folderBackground`    | `#f5f5f5`               | light      | Background color of left the side panel.                                                                                                                                                                                                                                                                                             |   |
| `folderSelected`      | `rgba(0, 0, 0, 0.1)`    | light      | Background of a selected item in the side panel when the side panel does not have the keyboard focus.                                                                                                                                                                                                                                |   |
| `folderHover`         | `rgba(0, 0, 0, 0.05)`   | light      | Background color of a not selected item in the side panel when the mouse hovers over it.                                                                                                                                                                                                                                             |   |
| `folderSelectedFocus` | same as `mainColor`     | dark       | Background color of a selected item in the side panel when the side panel has the keyboard focus.                                                                                                                                                                                                                                    |   |

In the configuration file, each variable name must be preceded by '`io.ox/dynamic-theme//`'.
When referring to the value of other variables on the right side of the equals sign,
(like in the default value of `linkColor`) the variable names must be preceded by '`@io-ox-dynamic-theme-`'.
`headerLogo` and `logoURL` can be relative (to `/appsuite/`), or absolute.
When using absolute URLs to point to different hosts, use the form `//hostname/path`
to keep the protocol (HTTP or HTTPS) and avoid any unnecessary security warnings.

The colors can be any CSS color, as long as the restriction of the "Dark/Light" column are respected. Colors marked "dark" specify dark backgrounds with white text/icons. If the specified color is too light, accessibility will suffer. Similarly for colors labeled "light".
