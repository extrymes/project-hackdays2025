<!--

  @copyright Copyright (c) OX Software GmbH, Germany <info@open-xchange.com>
  @license AGPL-3.0

  This code is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with OX App Suite. If not, see <https://www.gnu.org/licenses/agpl-3.0.txt>.

  Any use of the work other than as authorized under this license or copyright law is prohibited.

-->

<template>
  <div class="shortcut-help flex flex-wrap">
    <section
      v-for="(section, app) in profile"
      :key="section"
      :hidden="isHidden[app]"
      :class="`shortcuts-section-${ app }`"
    >
      <h2>{{ sectionTranslations[app] }}</h2>
      <dl>
        <div
          v-for="(keys, action) in section"
          :key="action"
          class="flex mb-4 flex-row"
        >
          <dt>
            {{ actionTranslations[action] }}
          </dt>
          <dd
            v-for="(key, index) in keys"
            :key="key"
            class="text-right break-words"
          >
            <span
              v-if="index !== 0"
              class="text-xxs text-gray font-light ml-4 mr-4 whitespace-nowrap"
            >{{ gt('or') }}</span>
            <span
              v-for="(sequence, sqindex) in parseShortcutKeys(key)"
              :key="sequence"
            >
              <span
                v-if="sqindex !== 0"
                class="text-xxs text-gray font-light ml-4 mr-4 whitespace-nowrap"
              >{{ gt('then') }}</span>
              <span
                v-for="(combo, cbindex) in sequence"
                :key="combo"
              >
                <span
                  v-if="cbindex !== 0"
                  class="text-xxs text-gray font-light whitespace-nowrap"
                >{{ gt('+') }}</span>
                <kbd class="whitespace-nowrap border">{{ combo }}</kbd>
              </span>
            </span>
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
// import ox from '@/ox'
import { actionTranslations, sectionTranslations, getProfile } from '@/io.ox/shortcuts/profile'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { device } from '@/browser'
import gt from 'gettext'

// const currentApp = ox.ui.App?.getCurrentApp()?.id

const selected = coreSettings.get('shortcutsProfile')
const profile = ref(getProfile(selected))

coreSettings.on('change:shortcutsProfile', () => {
  profile.value = getProfile(coreSettings.get('shortcutsProfile'))
})

function translateModifiers (key) {
  switch (key) {
    case 'CommandOrControl':
      // #. Control key on standard keyboards
      return device('macos') ? '⌘' : gt('Ctrl')
    case 'Control':
      // #. Control key on standard keyboards
      return gt('Ctrl')
    case 'Shift':
      return '⇧'
    case 'Alt':
      // #. Alt key on standard keyboards
      return device('macos') ? '⌥' : gt('Alt')
    // case 'Meta':
    //   return '⌘'
    default:
      return key
  }
}

// parse keycombos and sequences into themable chunks, translate modifier keys
// both by language and by OS
// keycombo: multiple keys at the same time, eq Ctrl+K
// sequence: multiple keycombos in a row, eq g THEN m
function parseShortcutKeys (shortcut) {
  const sequence = shortcut.split(' ')
    .map(combo => combo.split('+').map(translateModifiers))
  return sequence
}

const showAllApps = ref(coreSettings.get('shortcuts:showAll'))
coreSettings.on('change:shortcuts:showAll', (val) => {
  showAllApps.value = coreSettings.get('shortcuts:showAll')
})

const isHidden = computed(() => {
  return false
  // const hidden = {}
  // for (const app in profile.value) {
  //   hidden[app] = !showAllApps.value && app.includes('io.ox/') && currentApp !== app
  // }
  // return hidden
})

</script>

<style lang="scss">
.shortcuts-help-modal.modal.flex {
  .modal-dialog {
    max-width: min(500px, 100%);
    // width: max(600px, 90%);
  }
}
</style>

<style scoped lang="scss">
.shortcut-help {
  gap: 0 32px;
}

section {
  padding: 0!important;
  // width: calc(50% - 16px);
  width: 100%;

  @media (max-width: 500px) {
    width: 100%;
  }
}

h2 {
  font-weight: bold;
}

dt {
  font-weight: normal;
  width: 50%;
}

// .shortcuts-section-navigation {
//   width: 100%;
//   dl {
//     columns: 2;
//     column-gap: 32px;
//   }
// }

kbd {
    // override bootstrap
    color: var(--text);
    background-color: var(--background-10);
    box-shadow: none;
}
</style>
