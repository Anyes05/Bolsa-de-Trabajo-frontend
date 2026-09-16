<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, Building2, ChevronRight, ShieldCheck, UserRound } from 'lucide-vue-next'
import BrandPanel from '../components/BrandPanel.vue'
import { api, type AuthResponse, type Role } from '../services/api'

const emit = defineEmits<{ login: [auth: AuthResponse]; register: [] }>()
const role = ref<Role | null>(null)
const identifier = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
const roleDetails: Record<Role, { title: string; label: string; placeholder: string }> = {
  ADMIN: { title: 'Administrador', label: 'Email institucional', placeholder: 'admin@ccisj.org.uy' },
  SOCIO: { title: 'Empresa / Socio', label: 'Numero de BPS', placeholder: 'Ingresa tu numero de BPS' },
  POSTULANTE: { title: 'Postulante', label: 'Gmail / Correo electronico', placeholder: 'usuario@gmail.com' },
}
const detail = computed(() => roleDetails[role.value || 'POSTULANTE'])

function selectRole(value: Role) { role.value = value; identifier.value = ''; password.value = ''; error.value = '' }
function returnToRoles() { role.value = null; error.value = '' }
async function submitLogin() {
  if (!role.value) return
  busy.value = true; error.value = ''
  try { emit('login', await api.login(role.value, identifier.value, password.value)) }
  catch (exception) { error.value = exception instanceof Error ? exception.message : 'No fue posible ingresar.' }
  finally { busy.value = false }
}
</script>
<template>
  <main class="access"><BrandPanel /><section class="access__content"><div v-if="!role" class="access-card"><h2 class="access-card__title">Bienvenido</h2><p class="access-card__subtitle">¿Como queres ingresar?</p><button type="button" class="role-option role-option--admin" @click="selectRole('ADMIN')"><span class="role-option__icon"><ShieldCheck :size="22" /></span><strong class="role-option__text">ADMINISTRADOR<small>Acceso completo al sistema</small></strong><ChevronRight /></button><button type="button" class="role-option" @click="selectRole('SOCIO')"><span class="role-option__icon"><Building2 :size="22" /></span><strong class="role-option__text">EMPRESA / SOCIO<small>Accede con tu numero de BPS</small></strong><ChevronRight /></button><button type="button" class="role-option" @click="selectRole('POSTULANTE')"><span class="role-option__icon"><UserRound :size="22" /></span><strong class="role-option__text">POSTULANTE<small>Accede con tu Gmail / correo</small></strong><ChevronRight /></button><button type="button" class="access-card__link" @click="emit('register')">¿Buscas empleo? Registrate aqui</button></div><form v-else class="login-form" @submit.prevent="submitLogin"><button type="button" class="login-form__back" @click="returnToRoles"><ArrowLeft :size="14" /> Volver</button><div class="login-form__heading"><span class="login-form__icon"><component :is="role === 'ADMIN' ? ShieldCheck : role === 'SOCIO' ? Building2 : UserRound" :size="20" /></span><div><h2>{{ detail.title }}</h2><p>Ingresa con tus credenciales</p></div></div><label class="form-field">{{ detail.label }} <i>*</i><input v-model="identifier" :placeholder="detail.placeholder" required></label><label class="form-field">Contrasena <i>*</i><input v-model="password" type="password" placeholder="Ingresa tu contrasena" required></label><p v-if="error" class="form-error">{{ error }}</p><p class="login-form__hint">Acceso seguro al sistema CCISJ.</p><button type="submit" class="button button--primary" :disabled="busy">{{ busy ? 'Ingresando...' : 'Ingresar' }} <ArrowRight :size="15" /></button></form></section></main>
</template>