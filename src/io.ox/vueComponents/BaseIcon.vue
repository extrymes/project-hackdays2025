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
  <span v-html="data || questionOctagonIcon"></span>
</template>

<script setup>
import { watch } from 'vue'
import questionOctagonIcon from 'bootstrap-icons/icons/question-octagon.svg?raw'
import useSWRV from 'swrv'
const props = defineProps({
  iconName: {
    type: String,
    required: true
  },
  className: {
    type: String,
    default: ''
  }
})

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('width', 16)
svg.setAttribute('height', 16)
svg.setAttribute('aria-hidden', true)

function fetcher (url) {
  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Could not load icon ${url}`)
      return res
    })
    .then(res => res.text())
    .then(text => {
      const parser = new DOMParser()
      const icon = parser.parseFromString(text, 'image/svg+xml').getElementsByTagName('svg')[0]
      for (const { name, value } of (icon.attributes || [])) {
        if (name === 'class') svg.setAttribute('class', [svg.getAttribute('class'), value].filter(Boolean).join(' '))
        else svg.setAttribute(name, value)
      }
      const classes = props.className.split(' ').filter(Boolean)
      svg.classList.add(...classes)
      svg.innerHTML = icon.innerHTML
      svg.dispatchEvent(new Event('load'))
      return svg.outerHTML
    })
}
const options = {
  revalidateOnFocus: false // no need to revalidate icons; they don't change
}
const { data, error } = useSWRV(`./themes/default/icons/${props.iconName}`, fetcher, options)
watch(error, error => console.error(error && error.message))

</script>
