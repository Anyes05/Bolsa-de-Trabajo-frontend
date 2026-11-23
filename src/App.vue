<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ThemeToggle from './components/ThemeToggle.vue'

const route = useRoute()
// Las pantallas con sesión llevan el selector en su barra superior; las públicas, flotante.
const publicPage = computed(() => !route.meta.requiresAuth)
</script>

<template>
  <RouterView />
  <ThemeToggle v-if="publicPage" class="theme-toggle--floating" />
</template>

<style>
.theme-toggle--floating {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 50;
  box-shadow: var(--shadow-md);
}
</style>
