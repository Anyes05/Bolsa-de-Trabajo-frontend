<script setup lang="ts">
import { Briefcase, ClipboardList, Bell, LogOut, Menu, UserRound, X } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'
import NotificationBell from '../NotificationBell.vue'
import ProfileAvatar from '../ProfileAvatar.vue'
import AppAlert from '../AppAlert.vue'
import AppButton from '../AppButton.vue'
import { permanenciaService, type PermanenciaEstado } from '../../services/permanenciaService'
import { usePostulanteNotificationsStore } from '../../stores/postulanteNotifications'
import { useAuthStore } from '../../stores/auth'
import { userFacingError } from '../../utils/userMessage'

defineProps<{
  title: string
  subtitle: string
  activeSection: 'ofertas' | 'perfiles' | 'mi-perfil' | 'notificaciones'
}>()

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const open = ref(false)
const profileError = ref('')
const notifications = usePostulanteNotificationsStore()
const permanencia = ref<PermanenciaEstado | null>(null)
const confirming = ref(false)

watch(() => route.fullPath, () => { open.value = false })
watch(open, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
}

async function loadShellData() {
  if (auth.role !== 'POSTULANTE') return
  try {
    await auth.refreshCurrentUser()
  } catch (cause) {
    profileError.value = userFacingError(cause, 'cargar tu perfil')
  }
  try {
    const [, estado] = await Promise.all([
      notifications.load(),
      permanenciaService.estado(),
    ])
    permanencia.value = estado
  } catch (cause) {
    profileError.value = userFacingError(cause, 'cargar tu estado de permanencia')
  }
}

async function confirmarPermanencia() {
  confirming.value = true
  try {
    permanencia.value = await permanenciaService.confirmarAutenticado()
  } catch (cause) {
    profileError.value = userFacingError(cause, 'confirmar tu permanencia')
  } finally {
    confirming.value = false
  }
}

onMounted(() => {
  void loadShellData()
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
        <RouterLink
          class="postulante-nav__item"
          :class="{ 'postulante-nav__item--active': activeSection === 'notificaciones' }"
          to="/postulante/notificaciones"
          @click="open = false"
        >
          <Bell :size="17" aria-hidden="true" />
          Notificaciones
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
          <NotificationBell
            :count="notifications.unreadCount"
            label="Notificaciones"
            :to="{ name: 'postulante-notificaciones' }"
          />
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
        <AppAlert v-if="notifications.error" tone="error">{{ notifications.error }}</AppAlert>
        <div v-if="permanencia?.requiereAccion" class="permanencia-banner" role="status">
          <div>
            <strong>Confirmá tu permanencia en la Bolsa</strong>
            <p>
              Llevás más de 2 meses sin actividad.
              <template v-if="permanencia.avisoPendiente && permanencia.deadline">
                Tenés tiempo hasta el {{ new Date(permanencia.deadline).toLocaleDateString('es-UY') }}.
              </template>
              <template v-else-if="permanencia.ocultoPorRetencion">
                Tu perfil está oculto para las empresas hasta que confirmes.
              </template>
            </p>
          </div>
          <AppButton type="button" :disabled="confirming" @click="confirmarPermanencia">
            Confirmar permanencia
          </AppButton>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.permanencia-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff7e8;
  border: 1px solid #efd4a0;
  color: #5c4316;
}
.permanencia-banner strong { display: block; margin-bottom: 4px; }
.permanencia-banner p { margin: 0; font-size: 0.92rem; line-height: 1.4; }
</style>
