<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  size?: 'md' | 'sm'
}>(), {
  variant: 'primary',
  type: 'button',
  loading: false,
  disabled: false,
  size: 'md',
})
</script>

<template>
  <button
    class="app-button"
    :class="[`app-button--${variant}`, `app-button--${size}`]"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
  >
    <slot />
  </button>
</template>
