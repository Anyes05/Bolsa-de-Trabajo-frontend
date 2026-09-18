<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
}>(), {
  variant: 'primary',
  type: 'button',
  loading: false,
  disabled: false,
})
</script>

<template>
  <button
    class="app-button"
    :class="`app-button--${variant}`"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
  >
    <slot />
  </button>
</template>
