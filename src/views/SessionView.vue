<script setup lang="ts">
import { watch } from 'vue'
import { LogOut } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppButton from '../components/AppButton.vue'
import BrandLogo from '../components/BrandLogo.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

watch(
  () => auth.role,
  (role) => {
    const normalized = (role ?? '').trim().toUpperCase()
    if (normalized === 'POSTULANTE') {
      router.replace({ name: 'postulante-bolsa-empleo' })
      if (window.location.pathname !== '/postulante/ofertas-empleo') {
        window.location.replace('/postulante/ofertas-empleo')
      }
      return
    }
    if (normalized === 'SOCIO') {
      router.replace({ name: 'socio-bolsa-empleo' })
      if (window.location.pathname !== '/socio/bolsa-empleo') {
        window.location.replace('/socio/bolsa-empleo')
      }
      return
    }
    if (normalized === 'ADMIN') {
      router.replace({ name: 'admin-dashboard' })
      if (window.location.pathname !== '/admin') {
        window.location.replace('/admin')
      }
    }
  },
  { immediate: true },
)

function logout() {
  auth.logout()
  router.push({ name: 'access' })
}
</script>

<template>
  <main class="session">
    <section class="session__card" aria-labelledby="session-title">
      <BrandLogo variant="green" />
      <p>Sesión iniciada</p>
      <h1 id="session-title">{{ auth.email }}</h1>
      <span>{{ auth.role }}</span>
      <AppButton type="button" @click="logout">
        <LogOut :size="16" aria-hidden="true" /> Cerrar sesión
      </AppButton>
    </section>
  </main>
</template>
