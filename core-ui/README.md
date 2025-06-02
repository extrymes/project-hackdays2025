# App Suite UI

## Setup

Run `yarn` then `yarn dev` to start the dev server.

## HTTPS

In order to have working self signed certificates, please copy from old core `./ssl`  to `./ssl` in this project or use mkcert to create new ones.

## Imports

### Node modules

We don't use global libraries anymore.

```
import $ from 'jquery'
import _ from 'underscore'
import Backbone from '@/backbone'
```

### Gettext

```
import { gt } from 'gettext'

gt('Yes')
```

### Settings

To import settings, you just have to import them from the file.

```
import { settings } from '@/io.ox/core/settings'
```

Note that you cannot see to which jslobs these settings point. You have to look into the settings file. If you want to automatically load settings on boot, you have to have the following two lines in the settings file:

```
import { Settings } from '@/io.ox/core/settings'
export const settings = new Settings('io.ox/core', () => defaults)
```

Those lines do not have to be exact, but it is imporant, that `Settings` constructor is imported and a named export called `settings` is exported.

If you do not stick to this pattern, the settings need to be loaded manually with

```
import { settings } from '@/my/custom/settings'
settings.load().then(() => {
  // use settings
})
```

### Css, less or scss files

```
import '@/path/to/less/file.less'
import '@/path/to/less/file.scss'
import '@/path/to/less/file.css'
```

If variables or mixins are missing, import this file:

```
@import '@/themes/imports.scss';
```

### Dynamic imports

```
const { default: apiName } = await import('@/io.ox/name/api')
```

```
import('@/io.ox/name/api').then(({ default: apiName }) => console.log(apiName) })
```

## OX specific Plugins

### @open-xchange/vite-plugin-proxy

A plugin to proxy requests to multiple frontends (either deployed or dev-servers) and middlewares. It also merges manifests from the `/manifests` calls. This is only used for development and is not used for production. More info [here](https://gitlab.open-xchange.com/frontend/vite-plugin-proxy).
### @open-xchange/vite-plugin-ox-manifests

A plugin to provide the `/manifests`
 endpoint for local development and creates manifest information for production. More info [here](https://gitlab.open-xchange.com/frontend/vite-plugin-ox-manifests).

### @open-xchange/vite-plugin-ox-externals

A plugin to mark files as external to this project. Nevertheless, those files must somehow be reachable within the development and production environment. It is basically achieved with a custom prefix for external files. More info [here](https://gitlab.open-xchange.com/frontend/vite-plugin-ox-externals).

### @open-xchange/rollup-plugin-po2json

This plugin is responsible for creating the pot and provide translations for production. It is rollup-only plugin, meaning it does not support dev mode. But it works together with the vite-plugin-ox-manifest to provide dev-mode support as well. More info [here](https://gitlab.open-xchange.com/frontend/rollup-plugin-po2json).
