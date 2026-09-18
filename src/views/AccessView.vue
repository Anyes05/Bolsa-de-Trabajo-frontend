<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import BrandPanel from '../components/BrandPanel.vue'
import RoleOption from '../components/RoleOption.vue'
import AppField from '../components/AppField.vue'
import AppButton from '../components/AppButton.vue'
import AppAlert from '../components/AppAlert.vue'
import { getRoleOption, roleOptions } from '../data/roles'
import { authService } from '../services/authService'
import { useAuthStore } from '../stores/auth'
import type { Role } from '../services/types'

const router = useRouter()
const auth = useAuthStore()
const role = ref<Role | null>(null)
const identifier = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
const detail = computed(() => (role.value ? getRoleOption(role.value) : null))

function selectRole(value: Role) {
  role.value = value
  identifier.value = ''
  password.value = ''
  error.value = ''
}

function returnToRoles() {
  role.value = null
  error.value = ''
}

async function submitLogin() {
  if (!role.value) return
  busy.value = true
  error.value = ''
  try {
    const session = await authService.login(role.value, identifier.value, password.value)
    auth.setSession(session)
    await router.push({ name: auth.homeRoute })
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible ingresar.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="access">
    <BrandPanel />
    <section class="access__content">
      <section v-if="!role" class="access-card" aria-labelledby="access-title">
        <h2 id="access-title" class="access-card__title">Bienvenido</h2>
        <p class="access-card__subtitle">¿Como queres ingresar?</p>
        <nav class="access-card__roles" aria-label="Seleccion de rol">
          <RoleOption
            v-for="option in roleOptions"
            :key="option.role"
            :title="option.role === 'ADMIN' ? 'ADMINISTRADOR' : option.role === 'SOCIO' ? 'EMPRESA / SOCIO' : 'POSTULANTE'"
            :description="option.description"
            :icon="option.icon"
            :modifier="option.modifier"
            @click="selectRole(option.role)"
          />
        </nav>
        <RouterLink class="access-card__link" to="/registro">¿Buscas empleo? Registrate aqui</RouterLink>
      </section>

      <form v-else class="login-form" @submit.prevent="submitLogin">
        <button type="button" class="login-form__back" @click="returnToRoles">
          <ArrowLeft :size="14" aria-hidden="true" /> Volver
        </button>
        <header class="login-form__heading">
          <span class="login-form__icon" aria-hidden="true">
            <component :is="detail?.icon" :size="20" />
          </span>
          <div>
            <h2>{{ detail?.title }}</h2>
            <p>Ingresa con tus credenciales</p>
          </div>
        </header>
        <AppField id="login-identifier" :label="detail?.label ?? ''" required>
          <input
            id="login-identifier"
            v-model="identifier"
            :placeholder="detail?.placeholder"
            autocomplete="username"
            required
          >
        </AppField>
        <AppField id="login-password" label="Contrasena" required>
          <input
            id="login-password"
            v-model="password"
            type="password"
            placeholder="Ingresa tu contrasena"
            autocomplete="current-password"
            required
          >
        </AppField>
        <AppAlert v-if="error">{{ error }}</AppAlert>
        <p class="login-form__hint">Acceso seguro al sistema CCISJ.</p>
        <AppButton type="submit" :loading="busy">
          {{ busy ? 'Ingresando...' : 'Ingresar' }}
          <ArrowRight :size="15" aria-hidden="true" />
        </AppButton>
      </form>
    </section>
  </main>
</template>
