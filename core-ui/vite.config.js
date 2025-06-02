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

import { defineConfig } from 'vite'
import vitePluginOxBundle from '@open-xchange/vite-plugin-ox-bundle'
import vitePluginOxCss from '@open-xchange/vite-plugin-ox-css'
import vitePluginOxExternals from '@open-xchange/vite-plugin-ox-externals'
import vitePluginOxManifests from '@open-xchange/vite-plugin-ox-manifests'
import vitePluginProxy from '@open-xchange/vite-plugin-proxy'
import rollupPluginCopy from 'rollup-plugin-copy'
import gettextPlugin from '@open-xchange/rollup-plugin-po2json'
import { config } from 'dotenv-defaults'
import fs from 'node:fs/promises'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'

config()

let PROXY_URL
try {
  PROXY_URL = new URL(process.env.SERVER)
} catch (e) {
  PROXY_URL = new URL('https://0.0.0.0')
}
const PORT = process.env.PORT
const ENABLE_HMR = process.env.ENABLE_HMR === 'true'
const ENABLE_HTTP_PROXY = process.env.ENABLE_HTTP_PROXY === 'true'
const FRONTEND_URIS = process.env.FRONTEND_URIS || ''
const ENABLE_SECURE_PROXY = process.env.ENABLE_SECURE_PROXY === 'true'
const ENABLE_SECURE_FRONTENDS = process.env.ENABLE_SECURE_FRONTENDS === 'true'
const ENABLE_STRICT_FILESYSTEM = process.env.ENABLE_STRICT_FILESYSTEM === 'true'
// convert to absolute path (helps fixing a windows issue with case sensitive paths)
const root = await fs.realpath('./src')
const normalizedRoot = path.normalize(await fs.realpath('./'))

// only VITE_ prefixed variables will be statically replaced
// therefore remap APP_VERSION to VITE_VERSION
process.env.VITE_VERSION = process.env.APP_VERSION

// fetch all locales for Moment.js for prebundling
const momentLocales = (await fs.readdir('node_modules/@open-xchange/moment/dist/locale'))
  .filter(file => file.endsWith('.js'))
  .filter(dep => !dep.endsWith('tzl.js')) // TODO: "tzl.js" contains a syntax error
  .map(file => `@open-xchange/moment/dist/locale/${file}`)

export default defineConfig(({ mode, command }) => {
  const debugMode = mode === 'development' || command === 'serve'
  if (mode === 'development') process.env.VITE_DEBUG = 'true'
  return {
    root,
    publicDir: '../public',
    logLevel: process.env.LOG_LEVEL || (debugMode ? 'info' : 'warn'),
    base: debugMode ? PROXY_URL.pathname : './',
    build: {
      minify: 'esbuild',
      target: 'es2022',
      outDir: '../dist',
      emptyOutDir: true,
      polyfillDynamicImport: false,
      sourcemap: true,
      assetsInlineLimit: 0,
      reportCompressedSize: process.env.LOG_LEVEL === 'info',
      modulePreload: true,
      dynamicImportVarsOptions: {
        warnOnError: true,
        exclude: [
          'src/io.ox/core/settings.js',
          'src/io.ox/core/manifests.js',
          // in the following files, the dynamic imports are already deprecated
          'src/io.ox/settings/main.js',
          'src/io.ox/backbone/views/actions/util.js',
          'src/io.ox/core/desktop.js',
          'src/io.ox/core/feature.js'
          // convert to absolute paths (helps fixing a windows issue with case sensitive paths)
        ].map((excludedPath) => `${normalizedRoot}/${excludedPath}`)
      },
      rollupOptions: {
        input: {
          'blank.html': 'src/blank.html',
          'busy.html': 'src/busy.html',
          'index.html': 'src/index.html',
          'print.html': 'src/print.html'
        },
        preserveEntrySignatures: 'strict',
        cache: true,
        output: {
          minifyInternalExports: false,
          entryFileNames: '[name].js'
          // TODO: discuss if we want to do this...
          // TODO: does not work with vite 3 consistently anymore
          // assetFileNames: 'assets/[name][extname]',
          // chunkFileNames: 'assets/[name].js'
        }
      }
    },
    server: {
      port: PORT,
      hmr: ENABLE_HMR,
      https: {
        key: process.env.HOST_KEY || 'ssl/host.key',
        cert: process.env.HOST_CRT || 'ssl/host.crt'
      },
      fs: {
        strict: ENABLE_STRICT_FILESYSTEM
      }
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        public: fileURLToPath(new URL('./public', import.meta.url))
      }
    },
    optimizeDeps: {
      include: [
        'jquery',
        'underscore',
        'backbone',
        'backbone-validation',
        'ky',
        'dompurify',
        'velocity-animate',
        'jwt-decode',
        'chart.js',
        'mark.js',
        'croppie/croppie.min.js',
        'qrcode',
        'swiper',
        'bigscreen',
        'pdfjs-dist/build/pdf',
        'pdfjs-dist/build/pdf.worker',
        '@open-xchange/moment',
        ...momentLocales,
        'color-rgba',
        'chart.js/auto',
        'socket.io-client'
      ],
      exclude: [
        '@open-xchange/bootstrap',
        '@open-xchange/tinymce'
      ]
    },
    plugins: [
      {
        configureServer ({ middlewares, ws }) {
          // detect refresh event from vite and update the version
          const send = ws.send
          ws.send = function (...args) {
            if (args[0]?.type === 'full-reload') {
              version = +new Date()
            }
            return send.apply(this, args)
          }

          let version = +new Date()
          middlewares.use((req, res, next) => {
            if (req.originalUrl === '/updateVersion') {
              version = +new Date()
              res.statusCode = 200
              res.setHeader('new-version', version)
              return res.end()
            }

            // Serve empty file for bundles in dev mode
            if (req.originalUrl.match(/\/bundles\/[a-z]+.js/g)) {
              res.statusCode = 200
              return res.end()
            }

            res.setHeader('version', req.headers?.version || version)
            res.setHeader('latest-version', version)
            next()
          })
        }
      },
      vue(),
      vitePluginProxy({
        proxy: {
          [`${PROXY_URL.pathname}/api`.replace(/\/+/g, '/')]: {
            target: PROXY_URL.href,
            changeOrigin: true,
            secure: ENABLE_SECURE_PROXY
          },
          '/ajax': {
            target: PROXY_URL.href,
            changeOrigin: true,
            secure: ENABLE_SECURE_PROXY
          },
          '/help': {
            target: PROXY_URL.href,
            changeOrigin: true,
            secure: ENABLE_SECURE_PROXY
          },
          '/meta': {
            target: PROXY_URL.href,
            changeOrigin: true,
            secure: ENABLE_SECURE_PROXY
          },
          '/socket.io/appsuite': {
            target: `wss://${PROXY_URL.host}/socket.io/appsuite`,
            ws: true,
            changeOrigin: true,
            secure: ENABLE_SECURE_PROXY
          }
        },
        httpProxy: ENABLE_HTTP_PROXY && {
          target: PROXY_URL.href,
          port: PROXY_URL.port || 8080
        },
        frontends: FRONTEND_URIS && FRONTEND_URIS.split(',').map(uri => ({ target: uri, secure: ENABLE_SECURE_FRONTENDS }))
      }),
      vitePluginOxManifests({
        watch: true,
        entryPoints: ['src/**/*.js'],
        manifestsAsEntryPoints: true,
        meta: {
          id: 'core-ui',
          name: 'Core UI',
          buildDate: new Date().toISOString(),
          commitSha: process.env.CI_COMMIT_SHA,
          version: String(process.env.APP_VERSION || '').split('-')[0],
          revision: String(process.env.APP_VERSION || '').split('-')[1]
        }
      }),
      vitePluginOxExternals({
        prefix: '$'
      }),
      gettextPlugin({
        poFiles: 'src/i18n/*.po',
        outFile: 'ox.pot',
        defaultDictionary: 'io.ox/core',
        defaultLanguage: 'en_US'
      }),
      rollupPluginCopy({
        targets: [
          { src: 'node_modules/@open-xchange/tinymce/dist/skins/**/*', dest: 'public/tinymce/skins' },
          { src: 'node_modules/@open-xchange/tinymce/dist/lang/**/*', dest: 'public/tinymce/langs' },
          { src: 'node_modules/font-awesome/fonts/*', dest: 'public/fonts' },
          { src: ['./src/themes/default'], dest: 'public/themes' },
          { src: './src/pe/portal/plugins/oxdriveclients/img/', dest: 'public/pe/portal/plugins/oxdriveclients/' },
          { src: './src/pe/portal/plugins/oxdriveclients/img/', dest: 'public/pe/portal/plugins/oxdriveclients/' },
          { src: ['./src/themes/default/favicon.*'], dest: 'public' },
          { src: './src/pe/core/whatsnew/**/*', dest: 'public/whatsnew' },
          { src: './src/io.ox/switchboard/call/ringtones/*', dest: 'public/io.ox/switchboard/call/ringtones' },
          { src: 'node_modules/pdfjs-dist/build/pdf.worker.js', dest: 'public/pdfjs/' },
          { src: 'node_modules/pdfjs-dist/build/pdf.worker.js.map', dest: 'public/pdfjs/' },
          { src: 'node_modules/pdfjs-dist/cmaps', dest: 'public/pdfjs' },
          { src: 'node_modules/pdfjs-dist/web', dest: 'public/pdfjs' },
          { src: 'node_modules/bootstrap-icons/icons/*', dest: 'public/themes/default/icons/bi/' },
          { src: './src/themes/icons/*', dest: 'public/themes/default/icons/bi/' }
        ],
        hook: 'buildStart'
      }),
      vitePluginOxCss(),
      vitePluginOxBundle(
        {
          ignore: ['precore.js'],
          src: './bundles.json'
        }
      )]
  }
})
