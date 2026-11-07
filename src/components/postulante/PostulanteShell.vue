<script setup lang="ts">
import { Briefcase, ClipboardList, LogOut, Menu, UserRound, X } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'
import NotificationBell from '../NotificationBell.vue'
import ProfileAvatar from '../ProfileAvatar.vue'
import AppAlert from '../AppAlert.vue'
import { useAuthStore } from '../../stores/auth'
import { userFacingError } from '../../utils/userMessage'

defineProps<{
  title: string
  subtitle: string
  activeSection: 'ofertas' | 'perfiles' | 'mi-perfil'
}>()

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const open = ref(false)
const profileError = ref('')

watch(() => route.fullPath, () => { open.value = false })
watch(open, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
}

onMounted(async () => {
  if (auth.role !== 'POSTULANTE') return
  try {
    await auth.refreshCurrentUser()
  } catch (cause) {
    profileError.value = userFacingError(cause, 'cargar tu perfil')
  }
})

function logout() {
  auth.logout()
  router.push({ name: 'access' })
}
</script>

<template>
  <div class="postulante-shell">
    <div v-if="open" class="shell-backdrop" @click="open = false" />
    <aside class="postulante-sidebar" :class="{ 'postulante-sidebar--open': open }">
      <div class="postulante-sidebar__brand">
        <BrandLogo variant="white" />
        <button class="shell-sidebar-close" type="button" aria-label="Cerrar menú" @click="open = false">
          <X :size="18" />
        </button>
      </div>
      <nav class="postulante-nav" aria-label="Módulo postulante">
        <RouterLink
          class="postulante-nav__item"
          :class="{ 'postulante-nav__item--active': activeSection === 'ofertas' }"
          to="/postulante/ofertas-empleo"
          @click="open = false"
        >
          <Briefcase :size="17" aria-hidden="true" />
          Ofertas de Empleo
        </RouterLink>
        <RouterLink
          class="postulante-nav__item"
          :class="{ 'postulante-nav__item--active': activeSection === 'perfiles' }"
          to="/postulante/mis-perfiles"
          @click="open = false"
        >
          <ClipboardList :size="17" aria-hidden="true" />
          Mis Perfiles Profesionales
        </RouterLink>
        <RouterLink
          class="postulante-nav__item"
          :class="{ 'postulante-nav__item--active': activeSection === 'mi-perfil' }"
          to="/postulante/mi-perfil"
          @click="open = false"
        >
          <UserRound :size="17" aria-hidden="true" />
          Mi perfil
        </RouterLink>
      </nav>
      <small class="postulante-sidebar__footer">© 2026 CCISJ · San José, Uruguay</small>
    </aside>

    <div class="postulante-shell__content">
      <header class="postulante-header">
        <button class="shell-menu-button" type="button" aria-label="Abrir menú" @click="open = true">
          <Menu :size="20" />
        </button>
        <div class="postulante-header__titles">
          <h1 class="postulante-header__title">{{ title }}</h1>
          <p class="postulante-header__subtitle">{{ subtitle }}</p>
        </div>
        <div class="postulante-header__user">
          <NotificationBell :count="0" label="Notificaciones" />
          <div class="postulante-header__identity">
            <strong>{{ auth.fullName || auth.email || 'Postulante' }}</strong>
            <span>{{ auth.role || 'POSTULANTE' }}</span>
          </div>
          <ProfileAvatar class="postulante-header__avatar" :src="auth.photoUrl" :initials="initials(auth.fullName || auth.email || 'Postulante')" />
          <button type="button" class="shell-exit" @click="logout">
            <span class="shell-exit__label">Cerrar sesión</span>
            <LogOut :size="17" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div class="postulante-shell__body">
        <AppAlert v-if="profileError" tone="error">{{ profileError }}</AppAlert>
        <slot />
      </div>
    </div>
  </div>
</template>
