<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import BrandPanel from '../components/BrandPanel.vue'
import RoleOption from '../components/RoleOption.vue'
import AppField from '../components/AppField.vue'
import AppButton from '../components/AppButton.vue'
import AppAlert from '../components/AppAlert.vue'
import PasswordInput from '../components/PasswordInput.vue'
import GoogleSignInButton from '../components/GoogleSignInButton.vue'
import { useGoogleRegistrationStore } from '../stores/googleRegistration'
import { getRoleOption, roleOptions } from '../data/roles'
import { authService } from '../services/authService'
import { useAuthStore } from '../stores/auth'
import type { Role } from '../services/types'
import type { GoogleCredential, AuthResponse } from '../services/types'
import { userFacingError } from '../utils/userMessage'

const router = useRouter()
const auth = useAuthStore()
const googleRegistration = useGoogleRegistrationStore()
const googleLinkCredential = ref<GoogleCredential | null>(null)
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
  googleLinkCredential.value = null
  role.value = value
  identifier.value = ''
  password.value = ''
  error.value = ''
}

function returnToRoles() {
  googleLinkCredential.value = null
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
    error.value = 'Ingresá tu número de BPS o cédula para continuar.'
    return
  }
  if (!password.value.trim()) {
    error.value = 'Ingresá tu contraseña para continuar.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    if (googleLinkCredential.value && role.value === 'POSTULANTE') {
      const result = await authService.googleLink(googleLinkCredential.value, password.value)
      if (result.status !== 'LOGIN') throw new Error('No se pudo vincular tu cuenta. Volvé a iniciar sesión con Google.')
      await enterSession(result.session)
      return
    }
    const session = await authService.login(role.value, identifierValue, password.value)
    await enterSession(session)
  } catch (exception) {
    error.value = userFacingError(exception, 'iniciar sesión')
  } finally {
    busy.value = false
  }
}

async function enterSession(session: AuthResponse) {
    googleRegistration.clear()
    auth.setSession(session)
    if (session.debeCambiarPassword) {
      await router.replace({ name: 'socio-cambiar-clave' })
      return
    }
    const target = routeByRole(session.role)
    await router.replace({ name: target.name })
    if (window.location.pathname !== target.path) {
      window.location.assign(target.path)
    }
}

async function signInGoogle(credential: GoogleCredential) {
  busy.value = true
  error.value = ''
  googleLinkCredential.value = null
  try {
    const result = await authService.googleAuthenticate(credential)
    if (result.status === 'LOGIN') await enterSession(result.session)
    else if (result.status === 'REGISTER') {
      googleRegistration.save(result)
      await router.push({ name: 'register' })
    } else {
      googleLinkCredential.value = credential
      identifier.value = result.email
      password.value = ''
      error.value = 'Este correo ya tiene una cuenta. Confirmá su contraseña para vincularla con Google.'
    }
  } catch (cause) {
    error.value = userFacingError(cause, 'iniciar sesión con Google')
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
        <p class="access-card__subtitle">¿Cómo quieres ingresar?</p>
        <nav class="access-card__roles" aria-label="Selección de rol">
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
        <RouterLink class="access-card__link" to="/registro">¿Buscas empleo? Regístrate aquí</RouterLink>
      </section>

      <form v-else class="login-form" @submit.prevent="submitLogin">
        <button type="button" class="login-form__back" @click="returnToRoles">
          <ArrowLeft :size="16" aria-hidden="true" /> Volver a roles
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
        <GoogleSignInButton v-if="role === 'POSTULANTE'" :disabled="busy" @credential="signInGoogle" />
        <AppField id="login-identifier" :label="detail?.label ?? ''" required>
          <input
            id="login-identifier"
            v-model="identifier"
            :placeholder="detail?.placeholder"
            :inputmode="role === 'SOCIO' ? 'numeric' : 'email'"
            autocomplete="username"
            :readonly="!!googleLinkCredential"
            required
          >
        </AppField>
        <AppField id="login-password" label="Contraseña" required>
          <PasswordInput
            id="login-password"
            v-model="password"
            placeholder="Ingresa tu contraseña"
            autocomplete="current-password"
            required
          />
        </AppField>
        <AppAlert v-if="error">{{ error }}</AppAlert>
        <p class="login-form__hint">Acceso seguro al sistema CCISJ.</p>
        <RouterLink
          v-if="role === 'POSTULANTE'"
          class="login-form__register-link"
          to="/registro"
        >
          ¿No tienes cuenta? Crear postulante
        </RouterLink>
        <RouterLink class="login-form__register-link" to="/terminos">Términos y condiciones</RouterLink>
        <AppButton type="submit" :loading="busy">
          {{ busy ? 'Ingresando...' : 'Ingresar' }}
          <ArrowRight :size="15" aria-hidden="true" />
        </AppButton>
      </form>
    </section>
  </main>
</template>
