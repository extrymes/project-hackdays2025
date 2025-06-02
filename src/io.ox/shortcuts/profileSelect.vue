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
  <div class="relative flex items-center">
    <label
      :for="id"
      class="absolute text-gray text-xxs text-light"
    >{{ gt('Shortcut profile') }}</label>
    <select
      :id="id"
      v-model="selected"
      class="form-control"
    >
      <option
        v-for="[key, name] in profiles"
        :key="key"
        :value="key"
      >
        {{ name }}
      </option>
    </select>
  </div>

  <div class="checkbox custom small ml-32">
    <input
      id="checkbox"
      v-model="showAllApps"
      type="checkbox"
    >
    <label for="checkbox">{{ gt('Show all shortcuts') }}</label>
  </div>
</template>

<script setup>
import gt from 'gettext'
import { ref, watchEffect } from 'vue'
import { settings as coreSettings } from '@/io.ox/core/settings'
import _ from '@/underscore'
import { profileTranslations } from '@/io.ox/shortcuts/profile'

const profiles = Object.entries(profileTranslations)
const id = _.uniqueId('shortcut-profile-')

const selected = ref(coreSettings.get('shortcutsProfile'))
watchEffect(() => {
  coreSettings.set('shortcutsProfile', selected.value)
})

const showAllApps = ref(coreSettings.get('shortcuts:showAll'))
watchEffect(() => {
  coreSettings.set('shortcuts:showAll', showAllApps.value)
})

</script>

<style lang="scss">
.shortcuts-help-modal.modal.flex {
  #profile-select {
    display: flex;
    align-items: baseline;
  }
  .modal-footer {
    display: flex;
    justify-content: space-between;
    &::before,
    &::after {
      display: none;
    }
  }
}
</style>

<style scoped lang="scss">
label {
  top: -15px;
}
</style>
