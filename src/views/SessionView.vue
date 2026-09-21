<script setup lang="ts">
import { onMounted } from 'vue'
import { LogOut } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppButton from '../components/AppButton.vue'
import BrandLogo from '../components/BrandLogo.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (auth.role === 'POSTULANTE') {
    router.replace({ name: 'postulante-bolsa-empleo' })
    return
  }
  if (auth.role === 'SOCIO') {
    router.replace({ name: 'socio-bolsa-empleo' })
  }
})

function logout() {
  auth.logout()
  router.push({ name: 'access' })
}
</script>

<template>
  <main class="session">
    <section class="session__card" aria-labelledby="session-title">
      <BrandLogo variant="green" />
      <p>Sesion iniciada</p>
      <h1 id="session-title">{{ auth.email }}</h1>
      <span>{{ auth.role }}</span>
      <AppButton type="button" @click="logout">
        <LogOut :size="16" aria-hidden="true" /> Cerrar sesion
      </AppButton>
    </section>
  </main>
</template>
