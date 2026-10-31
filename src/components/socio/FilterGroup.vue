<script setup lang="ts">
withDefaults(defineProps<{
  legend: string
  options: string[]
  modelValue: string
  variant?: 'list' | 'select'
}>(), {
  variant: 'list',
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <fieldset class="filter-group" :class="{ 'filter-group--select': variant === 'select' }">
    <legend class="filter-group__legend">{{ legend }}</legend>
    <label v-if="variant === 'select'" class="filter-group__select-wrap">
      <span class="visually-hidden">{{ legend }}</span>
      <select
        class="filter-group__select"
        :value="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in options" :key="option" :value="option">{{ option }}</option>
      </select>
    </label>
    <template v-else>
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
    </template>
  </fieldset>
</template>
