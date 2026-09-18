<script setup lang="ts">
defineProps<{
  legend: string
  options: string[]
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <fieldset class="filter-group">
    <legend class="filter-group__legend">{{ legend }}</legend>
    <button
      v-for="option in options"
      :key="option"
      type="button"
      class="filter-group__option"
      :class="{ 'filter-group__option--active': modelValue === option }"
      :aria-pressed="modelValue === option"
      @click="$emit('update:modelValue', option)"
    >
      {{ option }}
    </button>
  </fieldset>
</template>
