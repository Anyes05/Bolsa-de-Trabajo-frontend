<script setup lang="ts">
import { LogOut } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BrandLogo from '../BrandLogo.vue'
import { useAuthStore } from '../../stores/auth'

defineProps<{
  title: string
  subtitle: string
  companyName: string
  companyInitials: string
  companyRole: string
}>()

const auth = useAuthStore()
const router = useRouter()

function logout() {
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
        <RouterLink class="socio-nav__item socio-nav__item--active" to="/socio/bolsa-empleo">
          Bolsa de Empleo
        </RouterLink>
        <span class="socio-nav__item socio-nav__item--disabled" aria-disabled="true">Mis Ofertas</span>
      </nav>
      <small class="socio-sidebar__footer">© 2026 CCISJ · San Jose, Uruguay</small>
    </aside>

    <div class="socio-shell__content">
      <header class="socio-header">
        <div>
          <h1 class="socio-header__title">{{ title }}</h1>
          <p class="socio-header__subtitle">{{ subtitle }}</p>
        </div>
        <div class="socio-header__user">
          <div class="socio-header__identity">
            <strong>{{ companyName }}</strong>
            <span>{{ companyRole }}</span>
          </div>
          <span class="socio-header__avatar" aria-hidden="true">{{ companyInitials }}</span>
          <button type="button" class="socio-header__exit" @click="logout">
            Salir <LogOut :size="16" aria-hidden="true" />
          </button>
        </div>
      </header>
      <div class="socio-shell__body">
        <slot />
      </div>
    </div>
  </div>
</template>
