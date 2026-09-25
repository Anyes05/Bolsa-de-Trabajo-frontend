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

function routeByRole(roleValue: string) {
  const normalized = roleValue.trim().toUpperCase()
  if (normalized === 'POSTULANTE') return { name: 'postulante-bolsa-empleo' as const, path: '/postulante/ofertas-empleo' }
  if (normalized === 'SOCIO') return { name: 'socio-bolsa-empleo' as const, path: '/socio/bolsa-empleo' }
  if (normalized === 'ADMIN') return { name: 'admin-dashboard' as const, path: '/admin' }
  return { name: 'session' as const, path: '/sesion' }
}

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

function loginIdentifier() {
  if (role.value === 'SOCIO') return identifier.value.replace(/\D/g, '')
  return identifier.value.trim()
}

async function submitLogin() {
  if (!role.value) return
  const identifierValue = loginIdentifier()
  if (role.value === 'SOCIO' && !identifierValue) {
    error.value = 'Ingresa tu numero de BPS.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const session = await authService.login(role.value, identifierValue, password.value)
    auth.setSession(session)
    const target = routeByRole(session.role)
    await router.replace({ name: target.name })
    if (window.location.pathname !== target.path) {
      window.location.assign(target.path)
    }
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
            :title="option.role === 'ADMIN' ? 'ADMINISTRADOR' : option.role === 'SOCIO' ? 'SOCIO' : 'POSTULANTE'"
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
            :inputmode="role === 'SOCIO' ? 'numeric' : 'email'"
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
        <RouterLink
          v-if="role === 'POSTULANTE'"
          class="login-form__register-link"
          to="/registro"
        >
          ¿No tenes cuenta? Crear postulante
        </RouterLink>
        <AppButton type="submit" :loading="busy">
          {{ busy ? 'Ingresando...' : 'Ingresar' }}
          <ArrowRight :size="15" aria-hidden="true" />
        </AppButton>
      </form>
    </section>
  </main>
</template>
