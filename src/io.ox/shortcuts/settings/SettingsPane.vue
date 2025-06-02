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
    <SettingsExplanation help-section="">
      {{ gt('You can perform common tasks with keyboard shortcuts. You can choose which profile you want to use or turn them off.') }}
    </SettingsExplanation>

    <SettingsSection :title="st.SHORTCUT_PROFILE">
    <div class="controls">
      <div
        v-for="[key, name] in profiles"
        :key="key"
        class="radio custom small"
      >
        <input
          :id="`shortcut-profile-${key}`"
          v-model="selected"
          type="radio"
          name="profile"
          :value="key"
          @change="onChange"
        >
        <label :for="`shortcut-profile-${key}`">{{ name }}</label>
      </div>

      <ShortcutHelp />
    </div>
  </SettingsSection>
</template>

<script setup>

import { profileTranslations } from '@/io.ox/shortcuts/profile'
import { st } from '@/io.ox/settings/index'
import gt from 'gettext'
import SettingsSection from '@/io.ox/vueComponents/SettingsSection.vue'
import SettingsExplanation from '@/io.ox/vueComponents/SettingsExplanation.vue'
import ShortcutHelp from '@/io.ox/shortcuts/ShortcutHelp.vue'

const props = defineProps({
  model: {
    type: Object,
    required: true
  }
})

const profiles = Object.entries(profileTranslations)
const selected = props.model.get('shortcutsProfile') || 'default'

function onChange (event) {
  props.model.set('shortcutsProfile', event.target.value)
}

</script>
