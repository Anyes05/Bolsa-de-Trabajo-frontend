<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppAlert from '../components/AppAlert.vue'
import AppButton from '../components/AppButton.vue'
import BrandLogo from '../components/BrandLogo.vue'
import { permanenciaService } from '../services/permanenciaService'
import { useAuthStore } from '../stores/auth'
import { userFacingError } from '../utils/userMessage'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const busy = ref(false)
const done = ref(false)
const error = ref('')

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token && auth.isAuthenticated && auth.role === 'POSTULANTE') {
    return
  }
  if (!token) {
    error.value = 'Falta el enlace de confirmación. Iniciá sesión como postulante para confirmar tu permanencia.'
    return
  }
  busy.value = true
  try {
    await permanenciaService.confirmarPorToken(token)
    done.value = true
  } catch (cause) {
    error.value = userFacingError(cause, 'confirmar tu permanencia')
  } finally {
    busy.value = false
  }
})

async function confirmarSesion() {
  busy.value = true
  error.value = ''
  try {
    await permanenciaService.confirmarAutenticado()
    done.value = true
  } catch (cause) {
    error.value = userFacingError(cause, 'confirmar tu permanencia')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="permanencia">
    <header class="permanencia__brand">
      <BrandLogo variant="green" />
    </header>
    <section class="permanencia__card" aria-labelledby="permanencia-title">
      <h1 id="permanencia-title">Permanencia en la Bolsa</h1>
      <p v-if="busy">Confirmando tu permanencia...</p>
      <AppAlert v-else-if="error" tone="error">{{ error }}</AppAlert>
      <template v-else-if="done">
        <AppAlert tone="success">Listo. Tu perfil vuelve a estar visible para las empresas socias.</AppAlert>
        <AppButton type="button" @click="router.push(auth.isAuthenticated ? { name: 'postulante-bolsa-empleo' } : { name: 'access' })">
          Continuar
        </AppButton>
      </template>
      <template v-else-if="auth.isAuthenticated && auth.role === 'POSTULANTE'">
        <p>Confirmá que querés seguir formando parte de la Bolsa de Empleo del CCISJ.</p>
        <AppButton type="button" :disabled="busy" @click="confirmarSesion">Confirmar permanencia</AppButton>
      </template>
    </section>
  </main>
</template>

<style scoped>
.permanencia {
  min-height: 100vh;
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 24px;
  padding: 32px 16px 48px;
  background: linear-gradient(180deg, #eef3f0 0%, #f7f8f7 55%, #fff 100%);
}
.permanencia__brand { width: min(960px, 100%); }
.permanencia__card {
  width: min(520px, 100%);
  display: grid;
  gap: 16px;
  padding: 28px 24px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 40px rgb(16 48 36 / 8%);
}
.permanencia__card h1 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  color: #16382b;
  font-size: 1.6rem;
}
.permanencia__card p { margin: 0; color: #4d5b55; line-height: 1.45; }
</style>
