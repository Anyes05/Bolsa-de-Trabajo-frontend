<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  page: number
  totalPages: number
  totalElements: number
  loading?: boolean
  label?: string
}>()

const emit = defineEmits<{ change: [page: number] }>()

const hasPrevious = computed(() => props.page > 0)
const hasNext = computed(() => props.page + 1 < props.totalPages)
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination-bar" :aria-label="label ?? 'Paginación'">
    <button class="pagination-bar__button" type="button" :disabled="loading || !hasPrevious" aria-label="Página anterior" @click="emit('change', page - 1)">
      <ChevronLeft :size="16" aria-hidden="true" /> Anterior
    </button>
    <span aria-live="polite">Página {{ page + 1 }} de {{ totalPages }} · {{ totalElements }} resultados</span>
    <button class="pagination-bar__button" type="button" :disabled="loading || !hasNext" aria-label="Página siguiente" @click="emit('change', page + 1)">
      Siguiente <ChevronRight :size="16" aria-hidden="true" />
    </button>
  </nav>
</template>

<style scoped>
.pagination-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; margin: 16px 0; color: var(--t-fg-526159); font-size: 0.9rem; }
.pagination-bar__button { display: inline-flex; align-items: center; gap: 4px; min-height: 40px; padding: 8px 14px; border: 1px solid var(--t-line-d5e0d9); border-radius: 8px; background: var(--t-bg-ffffff); color: var(--t-fg-24352b); font: inherit; cursor: pointer; }
.pagination-bar__button:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination-bar__button:focus-visible { outline: 2px solid var(--t-line-078844); outline-offset: 2px; }
</style>
