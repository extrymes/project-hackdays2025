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
  <BaseButton
    type="button"
    :class-name="props.className"
    :aria-label="props.ariaLabel"
  >
    <span v-if="props.title" aria-hidden="true" :title="props.title">
      <BaseIcon :icon-name="icon" :class-name="props.iconClass"></BaseIcon>
    </span>
    <BaseIcon v-else :icon-name="icon" :class-name="props.iconClass"></BaseIcon>
  </BaseButton>
</template>

<script setup>
import BaseButton from '@/io.ox/vueComponents/BaseButton.vue'
import BaseIcon from '@/io.ox/vueComponents/BaseIcon.vue'
const props = defineProps({
  icon: {
    type: String,
    default: ''
  },
  iconClass: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: null
  },
  className: {
    type: String,
    default: 'btn btn-default'
  },
  title: {
    type: String,
    default: undefined
  }
})

</script>
