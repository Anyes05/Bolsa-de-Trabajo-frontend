<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'

const { theme, toggleTheme } = useTheme()
const dark = computed(() => theme.value === 'dark')
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="dark ? 'Activar modo claro' : 'Activar modo oscuro'"
    :title="dark ? 'Modo claro' : 'Modo oscuro'"
    :aria-pressed="dark"
    @click="toggleTheme"
  >
    <Sun v-if="dark" :size="18" aria-hidden="true" />
    <Moon v-else :size="18" aria-hidden="true" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: background .2s ease, color .2s ease, border-color .2s ease;
}
.theme-toggle:hover { border-color: var(--color-brand); color: var(--t-fgv-brand); }
.theme-toggle:focus-visible { outline: 2px solid var(--color-brand); outline-offset: 2px; }
</style>
