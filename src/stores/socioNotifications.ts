import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { socioNotificationService, type SocioNotificationRecord } from '../services/socioNotificationService'

export type SocioNotificationItem = {
  id: string
  kind: 'comunicado'
  title: string
  body: string
  date: string
  unread: boolean
  popup: boolean
}

function mapItem(item: SocioNotificationRecord): SocioNotificationItem {
  return {
    id: String(item.id),
    kind: 'comunicado',
    title: item.titulo,
    body: item.cuerpo,
    date: item.createdAt ? new Date(item.createdAt).toLocaleString('es-UY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }) : '',
    unread: !item.leida,
    popup: item.popup && !item.leida,
  }
}

export const useSocioNotificationsStore = defineStore('socio-notifications', () => {
  const items = ref<SocioNotificationItem[]>([])
  const loading = ref(false)
  const error = ref('')
  const toastDismissed = ref(false)
  const opened = ref<SocioNotificationItem | null>(null)
  const blocking = ref(false)

  const unreadCount = computed(() => items.value.filter((item) => item.unread).length)
  const pendingPopup = computed(() => items.value.find((item) => item.popup) ?? null)
  const toast = computed(() => {
    if (toastDismissed.value || blocking.value || opened.value) return null
    return pendingPopup.value
  })

  function applyLocalRead(id: string) {
    items.value = items.value.map((entry) => (
      entry.id === id ? { ...entry, unread: false, popup: false } : entry
    ))
  }

  function clearLocalPopups() {
    items.value = items.value.map((item) => (item.popup ? { ...item, popup: false } : item))
    toastDismissed.value = true
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const records = await socioNotificationService.list()
      items.value = records.map(mapItem)
      toastDismissed.value = false
    } catch (exception) {
      error.value = exception instanceof Error ? exception.message : 'No se pudieron cargar las notificaciones'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  /** RF-17: al cargar el shell, si hay popup pendiente se abre modal bloqueante. */
  function presentBlockingPopup() {
    const item = pendingPopup.value
    if (!item || opened.value) return
    blocking.value = true
    opened.value = { ...item }
    document.body.style.overflow = 'hidden'
  }

  async function openDetail(item: SocioNotificationItem) {
    blocking.value = false
    opened.value = { ...item, unread: false, popup: false }
    applyLocalRead(item.id)
    toastDismissed.value = true
    document.body.style.overflow = 'hidden'
    try {
      await socioNotificationService.markOneRead(item.id)
    } catch {
      // La lectura visual no se bloquea; al recargar se reintenta el estado real.
    }
  }

  function closeDetail() {
    if (blocking.value) return
    opened.value = null
    document.body.style.overflow = ''
  }

  /** Cierre del pop-up bloqueante: llama dismiss API existente. */
  async function dismissBlockingPopup() {
    if (!blocking.value && !opened.value) return
    const current = opened.value
    opened.value = null
    blocking.value = false
    document.body.style.overflow = ''
    clearLocalPopups()
    if (current) applyLocalRead(current.id)
    try {
      if (current) await socioNotificationService.markOneRead(current.id)
      await socioNotificationService.dismissPopup()
    } catch {
      // El cierre visual no debe bloquearse si falla el backend.
    }
  }

  async function markAllRead() {
    applyLocalReadAll()
    try {
      await socioNotificationService.markAllRead()
    } catch (exception) {
      error.value = exception instanceof Error ? exception.message : 'No se pudieron marcar como leídas'
      await load()
    }
  }

  function applyLocalReadAll() {
    items.value = items.value.map((item) => ({ ...item, unread: false, popup: false }))
    toastDismissed.value = true
  }

  async function dismissToast() {
    toastDismissed.value = true
    clearLocalPopups()
    try {
      await socioNotificationService.dismissPopup()
    } catch {
      // El cierre visual no debe bloquearse si falla el backend.
    }
  }

  return {
    items,
    loading,
    error,
    unreadCount,
    toast,
    pendingPopup,
    opened,
    blocking,
    load,
    presentBlockingPopup,
    openDetail,
    closeDetail,
    dismissBlockingPopup,
    markAllRead,
    dismissToast,
  }
})
