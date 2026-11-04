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

  const unreadCount = computed(() => items.value.filter((item) => item.unread).length)
  const toast = computed(() => {
    if (toastDismissed.value) return null
    return items.value.find((item) => item.popup) ?? null
  })

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

  function openDetail(item: SocioNotificationItem) {
    opened.value = item
    items.value = items.value.map((entry) => (
      entry.id === item.id ? { ...entry, unread: false, popup: false } : entry
    ))
    toastDismissed.value = true
    document.body.style.overflow = 'hidden'
  }

  function closeDetail() {
    opened.value = null
    document.body.style.overflow = ''
  }

  async function markAllRead() {
    await socioNotificationService.markAllRead()
    items.value = items.value.map((item) => ({ ...item, unread: false, popup: false }))
    toastDismissed.value = true
  }

  async function dismissToast() {
    toastDismissed.value = true
    items.value = items.value.map((item) => (item.popup ? { ...item, popup: false } : item))
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
    opened,
    load,
    openDetail,
    closeDetail,
    markAllRead,
    dismissToast,
  }
})
