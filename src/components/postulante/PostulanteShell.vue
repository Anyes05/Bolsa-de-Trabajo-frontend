<script setup lang="ts">
import { onMounted } from 'vue'
import { LogOut } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'
import { useAuthStore } from '../../stores/auth'
import { authService } from '../../services/authService'

defineProps<{
  title: string
  subtitle: string
  activeSection: 'ofertas' | 'perfiles'
}>()

const auth = useAuthStore()
const router = useRouter()

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
}

onMounted(async () => {
  if (auth.fullName || auth.role !== 'POSTULANTE') return
  try {
    const currentUser = await authService.currentUser()
    auth.setFullName(currentUser.fullName)
  } catch {}
})

function logout() {
  auth.logout()
  router.push({ name: 'access' })
}
</script>

<template>
  <div class="postulante-shell">
    <aside class="postulante-sidebar">
      <div class="postulante-sidebar__brand">
        <BrandLogo variant="white" />
      </div>
      <nav class="postulante-nav" aria-label="Modulo postulante">
        <RouterLink
          class="postulante-nav__item"
          :class="{ 'postulante-nav__item--active': activeSection === 'ofertas' }"
          to="/postulante/ofertas-empleo"
        >
          Ofertas de Empleo
        </RouterLink>
        <RouterLink
          class="postulante-nav__item"
          :class="{ 'postulante-nav__item--active': activeSection === 'perfiles' }"
          to="/postulante/mis-perfiles"
        >
          Mis Perfiles
        </RouterLink>
      </nav>
      <small class="postulante-sidebar__footer">© 2026 CCISJ · San José</small>
    </aside>

    <div class="postulante-shell__content">
      <header class="postulante-header">
        <div>
          <h1 class="postulante-header__title">{{ title }}</h1>
          <p class="postulante-header__subtitle">{{ subtitle }}</p>
        </div>
        <div class="postulante-header__user">
          <div class="postulante-header__identity">
            <strong>{{ auth.fullName || auth.email || 'Postulante' }}</strong>
            <span>{{ auth.role || 'POSTULANTE' }}</span>
          </div>
          <span class="postulante-header__avatar" aria-hidden="true">{{ initials(auth.fullName || auth.email || 'Postulante') }}</span>
          <button type="button" class="postulante-header__exit" @click="logout">
            Salir <LogOut :size="16" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div class="postulante-shell__body">
        <slot />
      </div>
    </div>
  </div>
</template>
