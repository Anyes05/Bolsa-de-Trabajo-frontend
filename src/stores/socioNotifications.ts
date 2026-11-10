import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { socioNotificationService, type SocioNotificationRecord } from '../services/socioNotificationService'
import { useAuthStore } from './auth'

export type SocioNotificationItem = {
  id: string
  kind: 'comunicado'
  title: string
  body: string
  date: string
  createdAt: string | null
  unread: boolean
  popup: boolean
}

function mapItem(item: SocioNotificationRecord): SocioNotificationItem {
  return {
    id: String(item.id),
    kind: 'comunicado',
    title: item.titulo,
    body: item.cuerpo,
    createdAt: item.createdAt,
    date: item.createdAt ? new Date(item.createdAt).toLocaleString('es-UY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }) : '',
    unread: !item.leida,
    popup: item.popup && !item.leida,
  }
}

export const useSocioNotificationsStore = defineStore('socio-notifications', () => {
  const auth = useAuthStore()
  const items = ref<SocioNotificationItem[]>([])
  const loading = ref(false)
  const error = ref('')
  const toastDismissed = ref(false)
  const opened = ref<SocioNotificationItem | null>(null)
  const blocking = ref(false)
  let pending: { token: string; promise: Promise<void> } | null = null

  watch(() => auth.token, () => {
    items.value = []
    error.value = ''
    loading.value = false
    if (opened.value) document.body.style.overflow = ''
    opened.value = null
    blocking.value = false
    toastDismissed.value = false
  }, { flush: 'sync' })

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
    const token = auth.token
    if (!token || auth.role !== 'SOCIO') return
    if (pending?.token === token) return pending.promise
    loading.value = true
    error.value = ''
    const promise = socioNotificationService.list().then((records) => {
      if (auth.token !== token) return
      items.value = records.map(mapItem)
      toastDismissed.value = false
    }).catch((exception: unknown) => {
      if (auth.token !== token) return
      error.value = exception instanceof Error ? exception.message : 'No se pudieron cargar las notificaciones'
      items.value = []
    }).finally(() => {
      if (auth.token === token) loading.value = false
      if (pending?.promise === promise) pending = null
    })
    pending = { token, promise }
    return promise
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

  async function markOneRead(id: string) {
    const token = auth.token
    error.value = ''
    try {
      await socioNotificationService.markOneRead(id)
      if (auth.token === token) applyLocalRead(id)
    } catch (exception) {
      if (auth.token === token) {
        error.value = exception instanceof Error ? exception.message : 'No se pudo marcar la notificación como leída'
      }
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
    markOneRead,
    closeDetail,
    dismissBlockingPopup,
    markAllRead,
    dismissToast,
  }
})
