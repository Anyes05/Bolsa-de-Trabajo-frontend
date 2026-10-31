<script setup lang="ts">
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-vue-next'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  tone?: 'error' | 'success' | 'info' | 'warning'
  title?: string
}>(), {
  tone: 'error',
  title: undefined,
})

const icon = computed(() => {
  if (props.tone === 'success') return CheckCircle2
  if (props.tone === 'warning') return AlertTriangle
  if (props.tone === 'info') return Info
  return AlertCircle
})
</script>

<template>
  <div class="app-alert" :class="`app-alert--${tone}`" role="alert">
    <span class="app-alert__icon" aria-hidden="true">
      <component :is="icon" :size="20" />
    </span>
    <div class="app-alert__body">
      <strong v-if="title" class="app-alert__title">{{ title }}</strong>
      <p class="app-alert__text"><slot /></p>
    </div>
  </div>
</template>
