<script setup lang="ts">
import { Bell } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'

withDefaults(defineProps<{
  count?: number
  to?: RouteLocationRaw
  label?: string
}>(), {
  count: 0,
  to: undefined,
  label: 'Notificaciones',
})
</script>

<template>
  <RouterLink
    v-if="to"
    class="notification-bell"
    :to="to"
    :aria-label="count > 0 ? `${label}: ${count} pendientes` : label"
  >
    <Bell :size="20" aria-hidden="true" />
    <span v-if="count > 0" class="notification-bell__badge" aria-hidden="true">
      {{ count > 99 ? '99+' : count }}
    </span>
  </RouterLink>
  <button
    v-else
    type="button"
    class="notification-bell"
    :aria-label="count > 0 ? `${label}: ${count} pendientes` : label"
  >
    <Bell :size="20" aria-hidden="true" />
    <span v-if="count > 0" class="notification-bell__badge" aria-hidden="true">
      {{ count > 99 ? '99+' : count }}
    </span>
  </button>
</template>
