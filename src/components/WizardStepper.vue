<script setup lang="ts">
import { Check } from 'lucide-vue-next'

defineProps<{
  steps: readonly string[]
  current: number
}>()
</script>

<template>
  <nav class="stepper" aria-label="Progreso del registro">
    <ol class="stepper__list">
      <li
        v-for="(label, index) in steps"
        :key="label"
        class="stepper__step"
        :class="{
          'stepper__step--active': current === index + 1,
          'stepper__step--done': current > index + 1,
        }"
        :aria-current="current === index + 1 ? 'step' : undefined"
      >
        <b class="stepper__marker">
          <template v-if="current > index + 1"><Check :size="16" aria-hidden="true" /><span class="visually-hidden">Completado:</span></template>
          <template v-else>{{ index + 1 }}</template>
        </b>
        <span class="stepper__label">{{ label }}</span>
      </li>
    </ol>
  </nav>
</template>
