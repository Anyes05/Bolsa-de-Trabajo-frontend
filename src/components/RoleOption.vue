<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { Component } from 'vue'

defineProps<{
  title: string
  description: string
  icon: Component
  modifier?: string
}>()
</script>

<template>
  <button type="button" class="role-option" :class="modifier">
    <span class="role-option__icon" aria-hidden="true">
      <component :is="icon" :size="22" />
    </span>
    <strong class="role-option__text">
      {{ title }}
      <small>{{ description }}</small>
    </strong>
    <ChevronRight aria-hidden="true" />
  </button>
</template>
