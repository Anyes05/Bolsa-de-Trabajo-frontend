<script setup lang="ts">
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
        <b class="stepper__marker">{{ current > index + 1 ? 'OK' : index + 1 }}</b>
        {{ label }}
      </li>
    </ol>
  </nav>
</template>
