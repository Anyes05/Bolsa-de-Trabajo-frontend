<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'error' | 'success' | 'info'
}>(), {
  tone: 'error',
})
</script>

<template>
  <p class="app-alert" :class="`app-alert--${tone}`" role="alert">
    <slot />
  </p>
</template>
