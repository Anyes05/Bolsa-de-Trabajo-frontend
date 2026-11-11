<script setup lang="ts">
import {
  BriefcaseBusiness,
  Building2,
  FileSpreadsheet,
  History,
  CircleDollarSign,
  CircleUserRound,
  LogOut,
  Menu,
  Megaphone,
  Settings,
  Tags,
  UserRound,
  X,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'
import ProfileAvatar from '../ProfileAvatar.vue'
import AppAlert from '../AppAlert.vue'
import { useAuthStore } from '../../stores/auth'
import { userFacingError } from '../../utils/userMessage'

withDefaults(defineProps<{
  title: string
  subtitle: string
  active: string
}>(), {
  title: 'Panel de administración',
  subtitle: 'Gestiona la plataforma CCISJ',
  active: 'dashboard',
})

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const open = ref(false)
const profileError = ref('')
const photoMessage = ref('')
const uploadingPhoto = ref(false)

watch(() => route.fullPath, () => { open.value = false })
watch(open, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

const displayName = computed(() => auth.fullName || auth.email || 'Administrador')
const avatarInitials = computed(() => initials(displayName.value))

const links = [
  { key: 'dashboard', label: 'Control de Caja', to: '/admin', icon: CircleDollarSign },
  { key: 'socios', label: 'Gestión de Socios', to: '/admin/socios', icon: Building2 },
  { key: 'importacion', label: 'Carga masiva', to: '/admin/socios/importacion', icon: FileSpreadsheet },
  { key: 'socios-historial', label: 'Historial de Socios', to: '/admin/socios/historial', icon: History },
  { key: 'rubros', label: 'Rubros', to: '/admin/rubros', icon: Tags },
  { key: 'postulantes', label: 'Postulantes', to: '/admin/postulantes', icon: CircleUserRound },
  { key: 'ofertas', label: 'Ofertas Laborales', to: '/admin/ofertas', icon: BriefcaseBusiness },
  { key: 'configuracion', label: 'Config. Cuota', to: '/admin/configuracion', icon: Settings },
  { key: 'comunicados', label: 'Comunicados', to: '/admin/comunicados', icon: Megaphone },
  { key: 'perfil', label: 'Mi Perfil', to: '/admin/perfil', icon: UserRound },
]

onMounted(async () => {
  if (auth.role !== 'ADMIN') return
  try {
    await auth.refreshCurrentUser()
  } catch (cause) {
    profileError.value = userFacingError(cause, 'cargar tu perfil')
  }
})

async function onPhotoChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploadingPhoto.value = true
  profileError.value = ''
  photoMessage.value = ''
  try {
    await auth.uploadPhoto(file)
    photoMessage.value = 'Tu foto de perfil se actualizó correctamente.'
  } catch (cause) {
    profileError.value = userFacingError(cause, 'actualizar la foto de perfil')
  } finally {
    uploadingPhoto.value = false
  }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AD'
}

function logout() {
  auth.logout()
  router.push({ name: 'access' })
}
</script>

<template>
  <div class="admin-shell">
    <div v-if="open" class="shell-backdrop admin-shell__backdrop" @click="open = false" />
    <aside class="admin-sidebar" :class="{ 'admin-sidebar--open': open }">
      <div class="admin-sidebar__brand">
        <BrandLogo variant="white" />
        <button class="shell-sidebar-close admin-sidebar__close" type="button" aria-label="Cerrar menú" @click="open = false">
          <X :size="18" />
        </button>
      </div>
      <p class="admin-sidebar__label">Administración</p>
      <nav class="admin-nav" aria-label="Navegación administrativa">
        <RouterLink
          v-for="link in links"
          :key="link.key"
          class="admin-nav__item"
          :class="{ 'admin-nav__item--active': active === link.key }"
          :to="link.to"
          @click="open = false"
        >
          <component :is="link.icon" :size="18" aria-hidden="true" />
          <span>{{ link.label }}</span>
        </RouterLink>
      </nav>
      <div class="admin-sidebar__footer">
        <span>© 2026 CCISJ</span>
        <span>San José, Uruguay</span>
      </div>
    </aside>

    <div class="admin-shell__content">
      <header class="admin-topbar">
        <button class="shell-menu-button admin-menu-button" type="button" aria-label="Abrir menú" @click="open = true">
          <Menu :size="20" />
        </button>
        <div class="admin-breadcrumb">
          <span>CCISJ</span>
          <strong>/</strong>
          <b>{{ title }}</b>
        </div>
        <div class="admin-topbar__user">
          <div class="admin-topbar__identity">
            <strong>{{ displayName }}</strong>
            <span>{{ auth.role || 'ADMIN' }}</span>
          </div>
          <label title="Cambiar foto de perfil">
            <ProfileAvatar class="admin-topbar__avatar" :src="auth.photoUrl" :initials="avatarInitials" />
            <input class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Cambiar foto de perfil" :disabled="uploadingPhoto" @change="onPhotoChange">
          </label>
          <button class="shell-exit" type="button" @click="logout">
            <span class="shell-exit__label">Cerrar sesión</span>
            <LogOut :size="17" aria-hidden="true" />
          </button>
        </div>
      </header>
      <main class="admin-page">
        <AppAlert v-if="profileError" tone="error">{{ profileError }}</AppAlert>
        <AppAlert v-if="photoMessage" tone="success">{{ photoMessage }}</AppAlert>
        <header class="admin-page__heading">
          <div>
            <p class="admin-page__eyebrow">Panel administrativo</p>
            <h1>{{ title }}</h1>
            <p>{{ subtitle }}</p>
          </div>
          <slot name="header-actions" />
        </header>
        <slot />
      </main>
    </div>
  </div>
</template>
