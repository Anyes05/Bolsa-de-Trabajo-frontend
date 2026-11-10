import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { postulanteNotificationService } from '../services/postulanteNotificationService'
import type { SocioNotificationRecord } from '../services/socioNotificationService'
import { userFacingError } from '../utils/userMessage'
import { useAuthStore } from './auth'

export const usePostulanteNotificationsStore = defineStore('postulante-notifications', () => {
  const auth = useAuthStore()
  const items = ref<SocioNotificationRecord[]>([])
  const loading = ref(false)
  const error = ref('')
  const unreadCount = computed(() => items.value.filter((item) => !item.leida).length)
  let pending: { token: string; promise: Promise<void> } | null = null

  watch(() => auth.token, () => {
    items.value = []
    error.value = ''
    loading.value = false
  }, { flush: 'sync' })

  async function load() {
    const token = auth.token
    if (!token || auth.role !== 'POSTULANTE') return
    if (pending?.token === token) return pending.promise
    loading.value = true
    error.value = ''
    const promise = postulanteNotificationService.list().then((records) => {
      if (auth.token === token) items.value = records
    }).catch((cause: unknown) => {
      if (auth.token === token) error.value = userFacingError(cause, 'cargar las notificaciones')
    }).finally(() => {
      if (auth.token === token) loading.value = false
      if (pending?.promise === promise) pending = null
    })
    pending = { token, promise }
    return promise
  }

  async function markOneRead(id: number) {
    const token = auth.token
    error.value = ''
    try {
      const updated = await postulanteNotificationService.markOneRead(id)
      if (auth.token === token) {
        items.value = items.value.map((item) => item.id === id ? updated : item)
      }
    } catch (cause) {
      if (auth.token === token) error.value = userFacingError(cause, 'marcar la notificación como leída')
    }
  }

  async function markAllRead() {
    const token = auth.token
    const ids = new Set(items.value.map((item) => item.id))
    error.value = ''
    try {
      await postulanteNotificationService.markAllRead()
      if (auth.token === token) {
        items.value = items.value.map((item) => ids.has(item.id) ? { ...item, leida: true, popup: false } : item)
      }
    } catch (cause) {
      if (auth.token === token) error.value = userFacingError(cause, 'marcar las notificaciones como leídas')
    }
  }

  return { items, loading, error, unreadCount, load, markOneRead, markAllRead }
})
