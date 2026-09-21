<script setup lang="ts">
import { Bell, Briefcase, Building2, ClipboardList, LogOut, Megaphone, UserRound, X } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'
import { mockDirectivoCompany } from '../../data/mockSocioDirectorio'
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

const shownCompany = computed(() => (
  auth.isDirectivo
    ? mockDirectivoCompany
    : {
        name: props.companyName,
        initials: props.companyInitials,
        roleLabel: props.companyRole,
      }
))

function logout() {
  profile.clearPhoto()
  auth.logout()
  router.push({ name: 'access' })
}
</script>

<template>
  <div class="socio-shell">
    <aside class="socio-sidebar">
      <div class="socio-sidebar__brand">
        <BrandLogo variant="white" />
      </div>
      <nav class="socio-nav" aria-label="Modulo socio">
        <RouterLink
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'bolsa' }"
          :to="{ name: 'socio-bolsa-empleo' }"
        >
          <Briefcase :size="15" aria-hidden="true" />
          Bolsa de Empleo
        </RouterLink>
        <RouterLink
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'ofertas' }"
          :to="{ name: 'socio-mis-ofertas' }"
        >
          <ClipboardList :size="15" aria-hidden="true" />
          Mis Ofertas
        </RouterLink>
        <RouterLink
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'notificaciones' }"
          :to="{ name: 'socio-notificaciones' }"
        >
          <Bell :size="15" aria-hidden="true" />
          Notificaciones
          <span v-if="notifications.unreadCount" class="socio-nav__count">{{ notifications.unreadCount }}</span>
        </RouterLink>
        <RouterLink
          v-if="auth.isDirectivo"
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'directorio' }"
          :to="{ name: 'socio-directorio' }"
        >
          <Building2 :size="15" aria-hidden="true" />
          Directorio de Socios
        </RouterLink>
        <RouterLink
          class="socio-nav__item"
          :class="{ 'socio-nav__item--active': activeNav === 'perfil' }"
          :to="{ name: 'socio-perfil' }"
        >
          <UserRound :size="15" aria-hidden="true" />
          Mi Perfil
        </RouterLink>
      </nav>
      <small class="socio-sidebar__footer">© 2026 CCISJ · San Jose, Uruguay</small>
    </aside>

    <div class="socio-shell__content">
      <header class="socio-header">
        <div>
          <h1 class="socio-header__title">{{ title }}</h1>
          <p class="socio-header__subtitle">{{ subtitle }}</p>
        </div>
        <div class="socio-header__tools">
          <slot name="header-actions" />
          <div class="socio-header__user">
            <div class="socio-header__identity">
              <strong>{{ shownCompany.name }}</strong>
              <span>{{ shownCompany.roleLabel }}</span>
            </div>
            <span class="socio-header__avatar" aria-hidden="true">
              <img v-if="profile.photoUrl" :src="profile.photoUrl" alt="">
              <template v-else>{{ shownCompany.initials }}</template>
            </span>
            <button type="button" class="socio-header__exit" @click="logout">
              Salir <LogOut :size="16" aria-hidden="true" />
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
