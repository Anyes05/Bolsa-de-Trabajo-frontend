<script setup lang="ts">
defineProps<{
  id: string
  label: string
  required?: boolean
  error?: string
  wide?: boolean
}>()
</script>

<template>
  <div class="app-field" :class="{ 'app-field--wide': wide, 'app-field--invalid': Boolean(error) }">
    <label class="app-field__label" :for="id">
      {{ label }}
      <span v-if="required" class="app-field__required" aria-hidden="true">*</span>
    </label>
    <slot />
    <p v-if="error" class="app-field__error" :id="`${id}-error`" role="alert">{{ error }}</p>
  </div>
</template>
