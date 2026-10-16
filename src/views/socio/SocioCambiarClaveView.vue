<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import BrandPanel from '../../components/BrandPanel.vue'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const busy = ref(false)
const error = ref('')
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const canSubmit = computed(() => (
  form.currentPassword.length > 0
  && form.newPassword.length >= 12
  && form.newPassword === form.confirmPassword
))

async function submit() {
  if (!canSubmit.value) {
    error.value = 'Completa la clave actual y una nueva de al menos 12 caracteres.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const session = await authService.changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })
    auth.setSession(session)
    await router.replace({ name: 'socio-bolsa-empleo' })
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible cambiar la contraseña.'
  } finally {
    busy.value = false
  }
}

function logout() {
  auth.logout()
  router.push({ name: 'access' })
}
</script>

<template>
  <main class="access">
    <BrandPanel />
    <section class="access__content">
      <section class="access-card" aria-labelledby="change-password-title">
        <h2 id="change-password-title" class="access-card__title">Cambio de clave obligatorio</h2>
        <p class="access-card__subtitle">
          Por seguridad, debes definir tu contraseña definitiva dentro de las primeras 24 horas desde el alta.
        </p>
        <form class="access-form" @submit.prevent="submit">
          <label>
            Contraseña provisional *
            <input v-model="form.currentPassword" type="password" required autocomplete="current-password">
          </label>
          <label>
            Nueva contraseña *
            <input v-model="form.newPassword" type="password" required minlength="12" autocomplete="new-password" placeholder="Mínimo 12 caracteres">
          </label>
          <label>
            Confirmar nueva contraseña *
            <input v-model="form.confirmPassword" type="password" required minlength="12" autocomplete="new-password">
          </label>
          <AppAlert v-if="error">{{ error }}</AppAlert>
          <AppButton type="submit" :disabled="busy || !canSubmit">
            {{ busy ? 'Guardando...' : 'Guardar y continuar' }}
          </AppButton>
          <button class="access-link" type="button" @click="logout">Cerrar sesión</button>
        </form>
      </section>
    </section>
  </main>
</template>

<style scoped>
.access-form {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.access-form label {
  display: grid;
  gap: 6px;
  color: #405063;
  font-size: 13px;
  font-weight: 600;
}

.access-form input {
  height: 42px;
  padding: 0 12px;
  border: 1px solid #d5dde6;
  border-radius: 10px;
  font-size: 14px;
}

.access-link {
  border: 0;
  background: transparent;
  color: #5b6b7c;
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
}
</style>
