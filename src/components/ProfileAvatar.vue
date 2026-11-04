<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ src?: string | null; initials: string }>()
const failed = ref(false)
watch(() => props.src, () => { failed.value = false })

function imageFailed() {
  failed.value = true
  console.warn('[profile-avatar] No se pudo cargar la foto de perfil.')
}
</script>

<template>
  <span class="profile-avatar" aria-hidden="true">
    <img v-if="src && !failed" :src="src" alt="" loading="lazy" @error="imageFailed">
    <template v-else>{{ initials }}</template>
  </span>
</template>

<style scoped>
.profile-avatar { overflow: hidden; flex-shrink: 0; }
.profile-avatar img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
</style>
