<script setup lang="ts">
import { Bell, Briefcase, Building2, ClipboardList, LogOut, Megaphone, Menu, UserRound, X } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'
import NotificationBell from '../NotificationBell.vue'
import ProfileAvatar from '../ProfileAvatar.vue'
import AppAlert from '../AppAlert.vue'
import { userFacingError } from '../../utils/userMessage'
import { useAuthStore } from '../../stores/auth'
import { useSocioNotificationsStore } from '../../stores/socioNotifications'

const props = defineProps<{
  title: string
  subtitle: string
  companyName: string
  companyInitials: string
  companyRole: string
  activeNav?: 'bolsa' | 'ofertas' | 'directorio' | 'notificaciones' | 'perfil'
}>()

const auth = useAuthStore()
const notifications = useSocioNotificationsStore()
const router = useRouter()
const route = useRoute()
const open = ref(false)
const profileError = ref('')
const notificationPreviews = computed(() => notifications.items.map((item) => ({
  id: item.id, title: item.title, body: item.body, createdAt: item.createdAt, unread: item.unread,
})))

watch(() => route.fullPath, () => { open.value = false })
watch(open, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'S'
}

const shownCompany = computed(() => {
  const name = auth.fullName || props.companyName || 'Socio'
  return {
    name,
    initials: initials(name) || props.companyInitials,
    roleLabel: auth.isDirectivo ? 'SOCIO DIRECTIVO' : (props.companyRole || 'SOCIO'),
  }
})

onMounted(async () => {
  if (auth.role !== 'SOCIO') return
  try {
    await auth.refreshCurrentUser()
  } catch (cause) {
    profileError.value = userFacingError(cause, 'cargar tu perfil')
  }
  await notifications.load()
  notifications.presentBlockingPopup()
})

function logout() {
  auth.logout()
  router.push({ name: 'access' })
}

function openToastDetail() {
  if (notifications.toast) {
    notifications.openDetail(notifications.toast)
  }
}

function onModalKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.stopPropagation()
  event.preventDefault()
  if (notifications.blocking) return
  notifications.closeDetail()
}

function onModalBackdropClick() {
  if (notifications.blocking) return
  notifications.closeDetail()
}

function closeOpenedModal() {
  if (notifications.blocking) {
    void notifications.dismissBlockingPopup()
    return
  }
  notifications.closeDetail()
}
</script>

<template>
  <div class="socio-shell">
    <div v-if="open" class="shell-backdrop" @click="open = false" />
    <aside class="socio-sidebar" :class="{ 'socio-sidebar--open': open }">
      <div class="socio-sidebar__brand">
        <BrandLogo variant="white" />
        <button class="shell-sidebar-close" type="button" aria-label="Cerrar menú" @click="open = false">
          <X :size="18" />
        </button>
      </div>
      <nav class="socio-nav" aria-label="Módulo socio">
        <RouterLink
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'bolsa' }"
          :to="{ name: 'socio-bolsa-empleo' }"
          @click="open = false"
        >
          <Briefcase :size="17" aria-hidden="true" />
          Bolsa de Empleo
        </RouterLink>
        <RouterLink
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'ofertas' }"
          :to="{ name: 'socio-mis-ofertas' }"
          @click="open = false"
        >
          <ClipboardList :size="17" aria-hidden="true" />
          Mis Ofertas
        </RouterLink>
        <RouterLink
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'notificaciones' }"
          :to="{ name: 'socio-notificaciones' }"
          @click="open = false"
        >
          <Bell :size="17" aria-hidden="true" />
          Notificaciones
          <span v-if="notifications.unreadCount" class="socio-nav__count">{{ notifications.unreadCount }}</span>
        </RouterLink>
        <RouterLink
          v-if="auth.isDirectivo"
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'directorio' }"
          :to="{ name: 'socio-directorio' }"
          @click="open = false"
        >
          <Building2 :size="17" aria-hidden="true" />
          Directorio de Socios
        </RouterLink>
        <RouterLink
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'perfil' }"
          :to="{ name: 'socio-perfil' }"
          @click="open = false"
        >
          <UserRound :size="17" aria-hidden="true" />
          Mi Perfil
        </RouterLink>
      </nav>
      <small class="socio-sidebar__footer">© 2026 CCISJ · San José, Uruguay</small>
    </aside>

    <div class="socio-shell__content">
      <header class="socio-header">
        <button class="shell-menu-button" type="button" aria-label="Abrir menú" @click="open = true">
          <Menu :size="20" />
        </button>
        <div class="socio-header__titles">
          <h1 class="socio-header__title">{{ title }}</h1>
          <p class="socio-header__subtitle">{{ subtitle }}</p>
        </div>
        <div class="socio-header__tools">
          <slot name="header-actions" />
          <NotificationBell
            :count="notifications.unreadCount"
            :to="{ name: 'socio-notificaciones' }"
            label="Notificaciones"
            :items="notificationPreviews"
            :loading="notifications.loading"
            :error="notifications.error"
            @refresh="notifications.load()"
            @read="notifications.markOneRead"
          />
          <div class="socio-header__user">
            <div class="socio-header__identity">
              <strong>{{ shownCompany.name }}</strong>
              <span>{{ shownCompany.roleLabel }}</span>
            </div>
            <ProfileAvatar class="socio-header__avatar" :src="auth.photoUrl" :initials="shownCompany.initials" />
            <button type="button" class="shell-exit" @click="logout">
              <span class="shell-exit__label">Cerrar sesión</span>
              <LogOut :size="17" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <div class="socio-shell__body">
        <AppAlert v-if="profileError" tone="error">{{ profileError }}</AppAlert>
        <slot />
      </div>
      <slot name="overlay" />
      <aside
        v-if="notifications.toast && !notifications.opened"
        class="socio-toast"
        role="status"
      >
        <button type="button" class="socio-toast__open" @click="openToastDetail">
          <span class="socio-toast__icon" aria-hidden="true">
            <Megaphone :size="16" />
          </span>
          <span>
            <strong>{{ notifications.toast.title }}</strong>
            <p>{{ notifications.toast.body }}</p>
            <em>Abrir comunicado</em>
          </span>
        </button>
        <button type="button" class="socio-toast__close" aria-label="Cerrar aviso" @click="notifications.dismissToast()">
          <X :size="14" />
        </button>
      </aside>

      <div
        v-if="notifications.opened"
        class="notification-modal"
        :class="{ 'notification-modal--blocking': notifications.blocking }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`notification-modal-title-${notifications.opened.id}`"
        @click.self="onModalBackdropClick"
        @keydown="onModalKeydown"
      >
        <section class="notification-modal__panel">
          <header class="notification-modal__header">
            <div>
              <p class="notification-modal__eyebrow">
                {{ notifications.blocking ? 'Comunicado obligatorio' : 'Comunicado CCISJ' }}
              </p>
              <h2 :id="`notification-modal-title-${notifications.opened.id}`">{{ notifications.opened.title }}</h2>
              <time v-if="notifications.opened.date">{{ notifications.opened.date }}</time>
            </div>
            <button type="button" class="notification-modal__close" aria-label="Cerrar" @click="closeOpenedModal">
              <X :size="18" />
            </button>
          </header>
          <div class="notification-modal__body">
            <p>{{ notifications.opened.body }}</p>
          </div>
          <footer class="notification-modal__footer">
            <button type="button" class="notification-modal__done" @click="closeOpenedModal">
              Cerrar
            </button>
          </footer>
        </section>
      </div>
    </div>
  </div>
</template>
