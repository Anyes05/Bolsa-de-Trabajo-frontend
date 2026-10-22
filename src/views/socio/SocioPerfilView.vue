<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Camera } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PasswordInput from '../../components/PasswordInput.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { authService } from '../../services/authService'
import { socioIdentificadorLabel } from '../../services/socioService'
import { localidadesConActual } from '../../data/localidades'
import { socioPerfilService } from '../../services/socioPerfilService'
import type { RubroOption, SocioRecord } from '../../services/types'
import { isValidPassword, PASSWORD_HINT } from '../../utils/password'
import { useAuthStore } from '../../stores/auth'
import { useSocioProfileStore } from '../../stores/socioProfile'

const auth = useAuthStore()
const profile = useSocioProfileStore()
const router = useRouter()

const socio = ref<SocioRecord | null>(null)
const rubros = ref<RubroOption[]>([])
const busy = ref(false)
const saving = ref(false)
const passwordBusy = ref(false)
const error = ref('')
const savedHint = ref('')
const passwordHint = ref('')
const passwordError = ref('')
const photoError = ref('')

const form = reactive({
  razonSocial: '',
  telefono: '',
  emailContacto: '',
  calle: '',
  numero: '',
  localidad: '',
  rubroId: '',
  fechaAniversario: '',
})

const password = reactive({
  current: '',
  next: '',
  repeat: '',
})

const displayName = computed(() => socio.value?.razonSocial || auth.fullName || 'Socio')
const initials = computed(() => (
  displayName.value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'S'
))
const localidadOptions = computed(() => localidadesConActual(form.localidad))
const emailCuenta = computed(() => socio.value?.emailUsuario || auth.email || '')
const identificador = computed(() => (socio.value ? socioIdentificadorLabel(socio.value) : '—'))

const canUpdatePassword = computed(() => (
  password.current.length > 0
  && isValidPassword(password.next)
  && password.next === password.repeat
))

onMounted(load)

async function load() {
  busy.value = true
  error.value = ''
  try {
    const [perfil, catalog] = await Promise.all([
      socioPerfilService.get(),
      socioPerfilService.listRubros(),
    ])
    applyPerfil(perfil)
    rubros.value = catalog
    auth.setFullName(perfil.razonSocial)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible cargar el perfil.'
  } finally {
    busy.value = false
  }
}

function applyPerfil(perfil: SocioRecord) {
  socio.value = perfil
  form.razonSocial = perfil.razonSocial ?? ''
  form.telefono = perfil.telefono ?? ''
  form.emailContacto = perfil.emailContacto ?? ''
  form.calle = perfil.calle ?? ''
  form.numero = perfil.numero ?? ''
  form.localidad = perfil.localidad ?? ''
  form.rubroId = perfil.rubroId != null ? String(perfil.rubroId) : ''
  form.fechaAniversario = perfil.fechaAniversario?.slice(0, 10) ?? ''
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

async function saveProfile() {
  if (!form.rubroId) {
    error.value = 'Selecciona un rubro.'
    return
  }
  saving.value = true
  error.value = ''
  savedHint.value = ''
  try {
    const updated = await socioPerfilService.update({
      razonSocial: form.razonSocial.trim(),
      telefono: emptyToNull(form.telefono),
      emailContacto: emptyToNull(form.emailContacto),
      calle: form.calle.trim(),
      numero: emptyToNull(form.numero),
      localidad: form.localidad.trim(),
      rubroId: Number(form.rubroId),
      fechaAniversario: emptyToNull(form.fechaAniversario),
    })
    applyPerfil(updated)
    auth.setFullName(updated.razonSocial)
    savedHint.value = 'Los cambios se guardaron correctamente.'
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible guardar el perfil.'
  } finally {
    saving.value = false
  }
}

async function updatePassword() {
  if (!canUpdatePassword.value) {
    passwordError.value = `Completa la clave actual y una nueva válida. ${PASSWORD_HINT}`
    return
  }
  passwordBusy.value = true
  passwordError.value = ''
  passwordHint.value = ''
  try {
    const session = await authService.changePassword({
      currentPassword: password.current,
      newPassword: password.next,
    })
    auth.setSession(session)
    password.current = ''
    password.next = ''
    password.repeat = ''
    passwordHint.value = 'La contraseña se actualizó correctamente.'
  } catch (exception) {
    passwordError.value = exception instanceof Error ? exception.message : 'No fue posible actualizar la contraseña.'
  } finally {
    passwordBusy.value = false
  }
}

function onPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  photoError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    photoError.value = 'Elige una imagen (JPG, PNG o WEBP).'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    photoError.value = 'La imagen debe pesar menos de 2 MB.'
    return
  }
  profile.setPhoto(file)
}

function logout() {
  profile.clearPhoto()
  auth.logout()
  router.push({ name: 'access' })
}
</script>

<template>
  <SocioShell
    active-nav="perfil"
    title="Mi Perfil"
    subtitle="Edita tus datos de contacto y de la firma"
    :company-name="displayName"
    :company-initials="initials"
    :company-role="auth.isDirectivo ? 'SOCIO DIRECTIVO' : 'SOCIO'"
  >
    <div class="socio-profile">
      <AppAlert v-if="error">{{ error }}</AppAlert>
      <p v-if="busy" class="socio-profile__hint">Cargando perfil...</p>

      <template v-else-if="socio">
        <section class="socio-profile__identity">
          <div class="socio-profile__photo">
            <label class="socio-profile__avatar">
              <img v-if="profile.photoUrl" :src="profile.photoUrl" alt="Foto de perfil">
              <template v-else>{{ initials }}</template>
              <input type="file" accept="image/*" class="visually-hidden" @change="onPhotoChange">
              <span class="socio-profile__camera" aria-hidden="true">
                <Camera :size="14" />
              </span>
            </label>
            <div class="socio-profile__photo-actions">
              <label class="socio-profile__photo-button">
                Cambiar foto
                <input type="file" accept="image/*" class="visually-hidden" @change="onPhotoChange">
              </label>
              <button v-if="profile.photoUrl" type="button" class="socio-profile__photo-clear" @click="profile.clearPhoto()">
                Quitar
              </button>
            </div>
          </div>
          <div>
            <h2>{{ displayName }}</h2>
            <p>{{ emailCuenta }}</p>
            <span class="socio-profile__badge">{{ auth.isDirectivo ? 'Socio directivo' : 'Socio' }}</span>
            <small v-if="photoError" class="socio-profile__photo-error">{{ photoError }}</small>
          </div>
        </section>

        <form class="socio-profile__card" @submit.prevent="saveProfile">
          <h3>Datos de la firma</h3>
          <label>
            Razón social *
            <input v-model="form.razonSocial" required>
          </label>
          <label>
            Email de cuenta
            <input :value="emailCuenta" type="email" disabled>
            <small>No editable</small>
          </label>
          <label>
            BPS / Cédula
            <input :value="identificador" disabled>
            <small>Identificador de acceso (no editable)</small>
          </label>
          <label>
            RUT / Cédula
            <input :value="socio.rut || ''" disabled>
            <small>No editable</small>
          </label>

          <h4>Contacto y ubicación</h4>
          <div class="socio-profile__row">
            <label>
              Teléfono *
              <input v-model="form.telefono" required>
            </label>
            <label>
              Email de contacto
              <input v-model="form.emailContacto" type="email">
            </label>
          </div>
          <label>
            Rubro *
            <select v-model="form.rubroId" required>
              <option value="" disabled>Seleccionar rubro</option>
              <option v-for="rubro in rubros" :key="rubro.id" :value="String(rubro.id)">{{ rubro.nombreRubro }}</option>
            </select>
          </label>
          <label>
            Fecha de aniversario *
            <input v-model="form.fechaAniversario" type="date" required>
          </label>
          <label>
            Calle *
            <input v-model="form.calle" required>
          </label>
          <div class="socio-profile__row">
            <label>
              Nro puerta
              <input v-model="form.numero">
            </label>
            <label>
              Localidad / Zona *
              <select v-model="form.localidad" required>
                <option value="" disabled>Seleccionar localidad</option>
                <option v-for="localidad in localidadOptions" :key="localidad" :value="localidad">{{ localidad }}</option>
              </select>
            </label>
          </div>
          <p v-if="savedHint" class="socio-profile__hint">{{ savedHint }}</p>
          <AppButton type="submit" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </AppButton>
        </form>

        <form class="socio-profile__card" @submit.prevent="updatePassword">
          <h3>Cambiar contraseña</h3>
          <label>
            Contraseña actual *
            <PasswordInput v-model="password.current" autocomplete="current-password" />
          </label>
          <div class="socio-profile__row">
            <label>
              Nueva contraseña *
              <PasswordInput v-model="password.next" autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
              <small>{{ PASSWORD_HINT }}</small>
            </label>
            <label>
              Repetir contraseña *
              <PasswordInput v-model="password.repeat" autocomplete="new-password" />
            </label>
          </div>
          <AppAlert v-if="passwordError">{{ passwordError }}</AppAlert>
          <p v-if="passwordHint" class="socio-profile__hint">{{ passwordHint }}</p>
          <AppButton type="submit" :disabled="!canUpdatePassword || passwordBusy">
            {{ passwordBusy ? 'Actualizando...' : 'Actualizar contraseña' }}
          </AppButton>
        </form>

        <section class="socio-profile__logout">
          <h3>Cerrar sesión</h3>
          <p>Al cerrar sesión deberás ingresar tus credenciales nuevamente.</p>
          <button type="button" class="socio-profile__logout-button" @click="logout">Cerrar sesión</button>
        </section>
      </template>
    </div>
  </SocioShell>
</template>
