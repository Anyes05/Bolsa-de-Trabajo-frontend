<script setup lang="ts">
import { ArrowLeft, ArrowRight, Bell, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { recentNotifications, type NotificationPreview } from '../utils/notificationPreview'

const props = withDefaults(defineProps<{
  count?: number
  to: RouteLocationRaw
  items: NotificationPreview[]
  loading?: boolean
  error?: string
  label?: string
}>(), {
  count: 0,
  loading: false,
  error: '',
  label: 'Notificaciones',
})

const emit = defineEmits<{ refresh: []; read: [id: string] }>()
const route = useRoute()
const panelId = useId()
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const open = ref(false)
const selectedId = ref<string | null>(null)
const position = ref({ left: '0px', top: '0px', width: '400px', maxHeight: '560px' })
const recent = computed(() => recentNotifications(props.items))
const selected = computed(() => props.items.find((item) => item.id === selectedId.value) ?? null)

function formatDate(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return ''
  return new Date(value).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' })
}

function reposition() {
  if (!open.value || !trigger.value) return
  const rect = trigger.value.getBoundingClientRect()
  const width = Math.min(400, window.innerWidth - 24)
  const top = rect.bottom + 10
  position.value = {
    left: `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`,
    top: `${top}px`,
    width: `${width}px`,
    maxHeight: `${Math.max(0, Math.min(560, window.innerHeight - top - 12))}px`,
  }
}

function close(restoreFocus = false) {
  open.value = false
  selectedId.value = null
  if (restoreFocus) trigger.value?.focus()
}

async function toggle() {
  if (open.value) {
    close()
    return
  }
  open.value = true
  reposition()
  emit('refresh')
  await nextTick()
  panel.value?.querySelector<HTMLButtonElement>('button')?.focus()
}

function openNotice(item: NotificationPreview) {
  selectedId.value = item.id
  if (item.unread) emit('read', item.id)
}

function outside(event: Event) {
  if (!open.value || !(event.target instanceof Node)) return
  if (!trigger.value?.contains(event.target) && !panel.value?.contains(event.target)) close()
}

function keydown(event: KeyboardEvent) {
  if (open.value && event.key === 'Escape') {
    event.preventDefault()
    close(true)
  }
}

watch(() => route.fullPath, () => close())
onMounted(() => {
  document.addEventListener('pointerdown', outside)
  document.addEventListener('focusin', outside)
  document.addEventListener('keydown', keydown)
  window.addEventListener('resize', reposition)
  window.addEventListener('scroll', reposition, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('focusin', outside)
  document.removeEventListener('keydown', keydown)
  window.removeEventListener('resize', reposition)
  window.removeEventListener('scroll', reposition, true)
})
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="notification-bell"
    :class="{ 'notification-bell--open': open }"
    :aria-label="count > 0 ? `${label}: ${count} pendientes` : label"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-controls="open ? panelId : undefined"
    @click="toggle"
  >
    <Bell :size="20" aria-hidden="true" />
    <span v-if="count > 0" class="notification-bell__badge" aria-hidden="true">
      {{ count > 99 ? '99+' : count }}
    </span>
  </button>
  <Teleport to="body">
    <section
      v-if="open"
      :id="panelId"
      ref="panel"
      class="notification-dropdown"
      :style="position"
      role="dialog"
      :aria-labelledby="`${panelId}-title`"
    >
      <header class="notification-dropdown__header">
        <div>
          <h2 :id="`${panelId}-title`">{{ label }}</h2>
          <p>{{ loading ? 'Actualizando avisos...' : error ? 'No se pudieron actualizar los avisos' : count ? `${count} sin leer` : 'Estás al día' }}</p>
        </div>
        <button type="button" class="notification-dropdown__icon-button" aria-label="Cerrar notificaciones" @click="close(true)">
          <X :size="18" aria-hidden="true" />
        </button>
      </header>
      <p v-if="error" class="notification-dropdown__error" role="alert">
        {{ error }}
        <button type="button" :disabled="loading" @click="emit('refresh')">Reintentar</button>
      </p>
      <div class="notification-dropdown__content" :aria-busy="loading">
        <article v-if="selected" class="notification-dropdown__detail">
          <button type="button" class="notification-dropdown__back" @click="selectedId = null">
            <ArrowLeft :size="15" aria-hidden="true" /> Volver a recientes
          </button>
          <h3>{{ selected.title }}</h3>
          <time v-if="formatDate(selected.createdAt)" :datetime="selected.createdAt || undefined">{{ formatDate(selected.createdAt) }}</time>
          <p>{{ selected.body }}</p>
        </article>
        <p v-else-if="loading" class="notification-dropdown__empty" role="status">Cargando notificaciones...</p>
        <ul v-else-if="recent.length" class="notification-dropdown__list" aria-label="Notificaciones recientes">
          <li v-for="item in recent" :key="item.id">
            <button type="button" class="notification-dropdown__item" :class="{ 'notification-dropdown__item--unread': item.unread }" @click="openNotice(item)">
              <span class="notification-dropdown__notice-icon" aria-hidden="true"><Bell :size="16" /></span>
              <span class="notification-dropdown__summary">
                <strong>{{ item.title }}</strong>
                <span class="notification-dropdown__preview">{{ item.body }}</span>
                <time v-if="formatDate(item.createdAt)" :datetime="item.createdAt || undefined">{{ formatDate(item.createdAt) }}</time>
              </span>
              <span v-if="item.unread" class="notification-dropdown__dot" aria-label="No leída"></span>
            </button>
          </li>
        </ul>
        <div v-else-if="!error" class="notification-dropdown__empty">
          <Bell :size="26" aria-hidden="true" />
          <p>No tenés notificaciones por ahora.</p>
        </div>
      </div>
      <footer class="notification-dropdown__footer">
        <small v-if="items.length > recent.length">Mostrando las {{ recent.length }} más recientes</small>
        <RouterLink :to="to" @click="close()">
          Ver todas las notificaciones <ArrowRight :size="16" aria-hidden="true" />
        </RouterLink>
      </footer>
    </section>
  </Teleport>
</template>

<style scoped>
.notification-dropdown {
  position: fixed;
  z-index: 60;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dce8e0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 16px 48px #163c2926, 0 3px 10px #163c2910;
  color: #24352b;
  text-align: left;
}
.notification-dropdown__header { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 20px; border-bottom: 1px solid #e6eee8; }
.notification-dropdown__header h2 { margin: 0; font-size: 1rem; font-weight: 700; }
.notification-dropdown__header p { margin: 4px 0 0; color: #688073; font-size: .8rem; }
.notification-dropdown__icon-button { display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0; border: 0; border-radius: 50%; background: #f0f6f2; color: #3d5d4c; cursor: pointer; }
.notification-dropdown__content { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.notification-dropdown__list { list-style: none; margin: 0; padding: 0; }
.notification-dropdown__list li + li { border-top: 1px solid #edf2ee; }
.notification-dropdown__item { display: flex; align-items: flex-start; gap: 12px; width: 100%; padding: 16px 20px; border: 0; background: #fff; color: inherit; text-align: left; font: inherit; cursor: pointer; }
.notification-dropdown__item--unread { background: #f3faf6; }
.notification-dropdown__item:hover { background: #eaf5ee; }
.notification-dropdown__notice-icon { display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; border-radius: 10px; background: #e4f1e9; color: #087c42; }
.notification-dropdown__summary { display: grid; gap: 5px; flex: 1; min-width: 0; overflow-wrap: anywhere; }
.notification-dropdown__summary strong { font-size: .875rem; line-height: 1.4; }
.notification-dropdown__preview { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #63736a; font-size: .8rem; line-height: 1.5; }
.notification-dropdown time { color: #708377; font-size: .75rem; }
.notification-dropdown__dot { width: 7px; height: 7px; flex-shrink: 0; margin-top: 6px; border-radius: 50%; background: #008d45; }
.notification-dropdown__empty { display: grid; justify-items: center; gap: 10px; margin: 0; padding: 32px 20px; color: #718177; font-size: .875rem; text-align: center; }
.notification-dropdown__empty p { margin: 0; }
.notification-dropdown__footer { display: grid; flex-shrink: 0; gap: 8px; padding: 14px 20px; border-top: 1px solid #e6eee8; background: #f8fbf9; }
.notification-dropdown__footer small { color: #718177; font-size: .75rem; text-align: center; }
.notification-dropdown__footer a { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 32px; color: #08783e; font-size: .875rem; font-weight: 700; text-decoration: none; }
.notification-dropdown__detail { padding: 18px 20px; overflow-wrap: anywhere; }
.notification-dropdown__detail h3 { margin: 16px 0 8px; font-size: 1rem; line-height: 1.4; }
.notification-dropdown__detail p { margin: 16px 0 0; white-space: pre-wrap; font-size: .875rem; line-height: 1.65; }
.notification-dropdown__back { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: transparent; color: #08783e; font: inherit; font-size: .8rem; cursor: pointer; }
.notification-dropdown__error { margin: 0; padding: 12px 20px; background: #fff4f1; color: #9c3d2c; font-size: .8rem; }
.notification-dropdown__error button { margin-left: 8px; border: 0; background: transparent; color: inherit; text-decoration: underline; cursor: pointer; }
.notification-dropdown :is(button, a):focus-visible { outline: 2px solid #008d45; outline-offset: -3px; }
</style>
