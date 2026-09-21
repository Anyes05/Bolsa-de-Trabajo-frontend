import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mockSocioNotifications } from '../data/mockSocioNotificaciones'

export const useSocioNotificationsStore = defineStore('socio-notifications', () => {
  const items = ref(mockSocioNotifications.map((item) => ({ ...item })))
  const toastDismissed = ref(false)

  const unreadCount = computed(() => items.value.filter((item) => item.unread).length)
  const toast = computed(() => {
    if (toastDismissed.value) return null
    return items.value.find((item) => item.popup) ?? null
  })

  function markAllRead() {
    items.value = items.value.map((item) => ({ ...item, unread: false }))
  }

  function dismissToast() {
    toastDismissed.value = true
  }

  return { items, unreadCount, toast, markAllRead, dismissToast }
})
