<script setup lang="ts">
import { Camera } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PasswordInput from '../../components/PasswordInput.vue'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../stores/auth'
import { isValidPassword, PASSWORD_HINT } from '../../utils/password'
import { userFacingError } from '../../utils/userMessage'

const auth = useAuthStore()
const router = useRouter()
const uploadingPhoto = ref(false)
const photoError = ref('')
const photoMessage = ref('')
const passwordBusy = ref(false)
const passwordError = ref('')
const passwordMessage = ref('')
const password = reactive({ current: '', next: '', repeat: '' })
const displayName = computed(() => auth.fullName || 'Administrador')
const initials = computed(() => displayName.value.split(/\s+/).filter(Boolean)
  .slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AD')
const passwordsMatch = computed(() => password.next === password.repeat)
const canUpdatePassword = computed(() => password.current.length > 0
  && isValidPassword(password.next) && passwordsMatch.value && password.next !== password.current)

async function onPhotoChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || uploadingPhoto.value) return
  photoError.value = ''
  photoMessage.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    photoError.value = 'Seleccioná una imagen JPG, PNG o WEBP.'
    return
  }
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    photoError.value = 'La imagen no puede estar vacía y debe pesar hasta 5 MB.'
    return
  }
  uploadingPhoto.value = true
  try {
    await auth.uploadPhoto(file)
    photoMessage.value = 'Tu foto de perfil se actualizó correctamente.'
  } catch (cause) {
    photoError.value = userFacingError(cause, 'actualizar la foto de perfil')
  } finally {
    uploadingPhoto.value = false
  }
}

async function removePhoto() {
  if (uploadingPhoto.value) return
  uploadingPhoto.value = true
  photoError.value = ''
  photoMessage.value = ''
  try {
    await auth.removePhoto()
    photoMessage.value = 'Tu foto de perfil se eliminó correctamente.'
  } catch (cause) {
    photoError.value = userFacingError(cause, 'quitar la foto de perfil')
  } finally {
    uploadingPhoto.value = false
  }
}

async function updatePassword() {
  if (passwordBusy.value) return
  passwordError.value = ''
  passwordMessage.value = ''
  if (!canUpdatePassword.value) {
    passwordError.value = 'Completá la contraseña actual y una nueva válida, diferente a la actual. Ambas contraseñas nuevas deben coincidir.'
    return
  }
  passwordBusy.value = true
  try {
    const session = await authService.changePassword({
      currentPassword: password.current,
      newPassword: password.next,
    })
    auth.setSession(session)
    password.current = ''
    password.next = ''
    password.repeat = ''
    passwordMessage.value = 'Tu contraseña se actualizó correctamente.'
  } catch (cause) {
    passwordError.value = userFacingError(cause, 'actualizar la contraseña')
  } finally {
    passwordBusy.value = false
  }
}

function logout() {
  auth.logout()
  router.push({ name: 'access' })
}
</script>

<template>
  <AdminShell active="perfil" title="Mi Perfil" subtitle="Administra tu foto de perfil y la seguridad de tu cuenta">
    <div class="socio-profile">
      <section class="socio-profile__identity" aria-label="Perfil del administrador">
        <div class="socio-profile__photo">
          <label class="socio-profile__avatar">
            <img v-if="auth.photoUrl" :src="auth.photoUrl" alt="Foto de perfil">
            <template v-else>{{ initials }}</template>
            <input type="file" accept="image/jpeg,image/png,image/webp" class="visually-hidden" aria-label="Cambiar foto desde el avatar" :disabled="uploadingPhoto" @change="onPhotoChange">
            <span class="socio-profile__camera" aria-hidden="true"><Camera :size="14" /></span>
          </label>
          <div class="socio-profile__photo-actions">
            <label class="socio-profile__photo-button">
              {{ uploadingPhoto ? 'Actualizando foto...' : 'Cambiar foto' }}
              <input type="file" accept="image/jpeg,image/png,image/webp" class="visually-hidden" aria-label="Seleccionar foto de perfil" :disabled="uploadingPhoto" @change="onPhotoChange">
            </label>
            <button v-if="auth.photoUrl" type="button" class="socio-profile__photo-clear" :disabled="uploadingPhoto" @click="removePhoto">
              Quitar
            </button>
          </div>
        </div>
        <div>
          <h2>{{ displayName }}</h2>
          <p>{{ auth.email }}</p>
          <span class="socio-profile__badge">Administrador</span>
          <p class="socio-profile__hint">JPG, PNG o WEBP de hasta 5 MB.</p>
        </div>
      </section>
      <AppAlert v-if="photoError" tone="error">{{ photoError }}</AppAlert>
      <AppAlert v-if="photoMessage" tone="success">{{ photoMessage }}</AppAlert>

      <section class="socio-profile__card" aria-labelledby="admin-account-title">
        <h3 id="admin-account-title">Datos de la cuenta</h3>
        <div class="socio-profile__row">
          <label>
            Correo de acceso
            <input :value="auth.email || ''" type="email" readonly>
            <small>El correo de acceso no se modifica desde esta pantalla.</small>
          </label>
          <label>
            Rol
            <input value="Administrador" readonly>
            <small>Permisos de administración del sistema CCISJ.</small>
          </label>
        </div>
      </section>

      <form class="socio-profile__card" aria-labelledby="admin-password-title" @submit.prevent="updatePassword">
        <h3 id="admin-password-title">Cambiar contraseña</h3>
        <label for="admin-current-password">Contraseña actual *</label>
        <PasswordInput id="admin-current-password" v-model="password.current" autocomplete="current-password" required :disabled="passwordBusy" />
        <div class="socio-profile__row">
          <div>
            <label for="admin-new-password">Nueva contraseña *</label>
            <PasswordInput id="admin-new-password" v-model="password.next" autocomplete="new-password" placeholder="Mínimo 8 caracteres" required :minlength="8" :disabled="passwordBusy" />
            <small>{{ PASSWORD_HINT }}</small>
          </div>
          <div>
            <label for="admin-repeat-password">Repetir contraseña *</label>
            <PasswordInput id="admin-repeat-password" v-model="password.repeat" autocomplete="new-password" required :disabled="passwordBusy" />
            <small v-if="password.repeat && !passwordsMatch">Las contraseñas no coinciden.</small>
          </div>
        </div>
        <AppAlert v-if="passwordError" tone="error">{{ passwordError }}</AppAlert>
        <AppAlert v-if="passwordMessage" tone="success">{{ passwordMessage }}</AppAlert>
        <AppButton type="submit" :disabled="!canUpdatePassword" :loading="passwordBusy">
          {{ passwordBusy ? 'Actualizando...' : 'Actualizar contraseña' }}
        </AppButton>
      </form>

      <section class="socio-profile__logout">
        <h3>Cerrar sesión</h3>
        <p>Al cerrar sesión deberás ingresar tus credenciales nuevamente.</p>
        <button type="button" class="socio-profile__logout-button" @click="logout">Cerrar sesión</button>
      </section>
    </div>
  </AdminShell>
</template>
