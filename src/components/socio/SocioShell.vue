<script setup lang="ts">
import { Bell, Briefcase, Building2, ClipboardList, LogOut, Megaphone, Menu, UserRound, X } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'
import NotificationBell from '../NotificationBell.vue'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../stores/auth'
import { useSocioNotificationsStore } from '../../stores/socioNotifications'
import { useSocioProfileStore } from '../../stores/socioProfile'

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
const profile = useSocioProfileStore()
const router = useRouter()
const route = useRoute()
const open = ref(false)

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
    const currentUser = await authService.currentUser()
    if (currentUser.fullName) auth.setFullName(currentUser.fullName)
    auth.setEsDirectivo(currentUser.esDirectivo === true)
  } catch {}
})

function logout() {
  profile.clearPhoto()
  auth.logout()
  router.push({ name: 'access' })
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
          />
          <div class="socio-header__user">
            <div class="socio-header__identity">
              <strong>{{ shownCompany.name }}</strong>
              <span>{{ shownCompany.roleLabel }}</span>
            </div>
            <span class="socio-header__avatar" aria-hidden="true">
              <img v-if="profile.photoUrl" :src="profile.photoUrl" alt="">
              <template v-else>{{ shownCompany.initials }}</template>
            </span>
            <button type="button" class="shell-exit" @click="logout">
              <span class="shell-exit__label">Cerrar sesión</span>
              <LogOut :size="17" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <div class="socio-shell__body">
        <slot />
      </div>
      <slot name="overlay" />
      <aside v-if="notifications.toast" class="socio-toast" role="status">
        <span class="socio-toast__icon" aria-hidden="true">
          <Megaphone :size="16" />
        </span>
        <div>
          <strong>{{ notifications.toast.title }}</strong>
          <p>{{ notifications.toast.body }}</p>
        </div>
        <button type="button" class="socio-toast__close" aria-label="Cerrar aviso" @click="notifications.dismissToast()">
          <X :size="14" />
        </button>
      </aside>
    </div>
  </div>
</template>
