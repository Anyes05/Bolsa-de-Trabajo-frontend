<script setup lang="ts">
import { computed } from 'vue'
import logoBlanco from '../assets/logos/ccisj-logo-blanco.png'
import logoVerde from '../assets/logos/ccisj-logo-verde.png'
import logoRedondo from '../assets/logos/ccisj-logo-redondo.png'

const props = withDefaults(defineProps<{
  variant?: 'white' | 'green' | 'round'
}>(), {
  variant: 'green',
})

const src = computed(() => {
  if (props.variant === 'white') return logoBlanco
  if (props.variant === 'round') return logoRedondo
  return logoVerde
})
</script>

<template>
  <img
    class="brand-logo"
    :class="`brand-logo--${variant}`"
    :src="src"
    alt="Centro Comercial e Industrial de San Jose"
  >
</template>
