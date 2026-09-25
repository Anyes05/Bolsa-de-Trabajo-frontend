<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Camera } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppButton from '../../components/AppButton.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { mockCompany } from '../../data/mockSocioBolsa'
import { mockOfferSectors } from '../../data/mockSocioOfertas'
import { mockDirectivoProfile, mockSocioProfile } from '../../data/mockSocioPerfil'
import { useAuthStore } from '../../stores/auth'
import { useSocioProfileStore } from '../../stores/socioProfile'

const auth = useAuthStore()
const profile = useSocioProfileStore()
const router = useRouter()
const photoError = ref('')
const saved = reactive({
  ...(auth.isDirectivo ? mockDirectivoProfile : mockSocioProfile),
  ...(auth.fullName ? { fullName: auth.fullName } : {}),
})
const form = reactive({ ...saved })
const password = reactive({
  current: '',
  next: '',
  repeat: '',
})
const savedHint = ref('')
const passwordHint = ref('')

const canUpdatePassword = computed(() => (
  password.current.length > 0
  && password.next.length >= 6
  && password.next === password.repeat
))

function saveProfile() {
  Object.assign(saved, form)
  savedHint.value = 'Los cambios se guardaron en esta pantalla (mock).'
}

function updatePassword() {
  if (!canUpdatePassword.value) return
  password.current = ''
  password.next = ''
  password.repeat = ''
  passwordHint.value = 'La contrasena se actualizo en esta pantalla (mock).'
}

function onPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  photoError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    photoError.value = 'Elegi una imagen (JPG, PNG o WEBP).'
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
    subtitle="Edita tus datos personales y de acceso"
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <div class="socio-profile">
      <section class="socio-profile__identity">
        <div class="socio-profile__photo">
          <label class="socio-profile__avatar">
            <img v-if="profile.photoUrl" :src="profile.photoUrl" alt="Foto de perfil">
            <template v-else>{{ saved.initials }}</template>
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
          <h2>{{ saved.fullName }}</h2>
          <p>{{ saved.email }}</p>
          <span class="socio-profile__badge">Socio</span>
          <small v-if="photoError" class="socio-profile__photo-error">{{ photoError }}</small>
        </div>
      </section>

      <form class="socio-profile__card" @submit.prevent="saveProfile">
        <h3>Datos personales</h3>
        <label>
          Nombre completo *
          <input v-model="form.fullName" required>
        </label>
        <label>
          Email *
          <input v-model="form.email" type="email" required>
        </label>

        <h4>Datos del socio</h4>
        <label>
          Razon social
          <input v-model="form.razonSocial">
        </label>
        <div class="socio-profile__row">
          <label>
            Telefono
            <input v-model="form.telefono">
          </label>
          <label>
            Email de contacto
            <input v-model="form.emailContacto" type="email">
          </label>
        </div>
        <label>
          Rubro
          <select v-model="form.rubro">
            <option v-for="sector in mockOfferSectors" :key="sector" :value="sector">{{ sector }}</option>
            <option value="Construccion">Construccion</option>
          </select>
        </label>
        <label>
          N° BPS
          <input :value="form.bps" disabled>
          <small>No editable</small>
        </label>
        <p v-if="savedHint" class="socio-profile__hint">{{ savedHint }}</p>
        <AppButton type="submit">Guardar cambios</AppButton>
      </form>

      <form class="socio-profile__card" @submit.prevent="updatePassword">
        <h3>Cambiar contrasena</h3>
        <label>
          Contrasena actual *
          <input v-model="password.current" type="password" autocomplete="current-password">
        </label>
        <div class="socio-profile__row">
          <label>
            Nueva contrasena *
            <input v-model="password.next" type="password" autocomplete="new-password" placeholder="Minimo 6 caracteres">
          </label>
          <label>
            Repetir contrasena *
            <input v-model="password.repeat" type="password" autocomplete="new-password">
          </label>
        </div>
        <p v-if="passwordHint" class="socio-profile__hint">{{ passwordHint }}</p>
        <AppButton type="submit" :disabled="!canUpdatePassword">Actualizar contrasena</AppButton>
      </form>

      <section class="socio-profile__logout">
        <h3>Cerrar sesion</h3>
        <p>Al cerrar sesion deberas ingresar tus credenciales nuevamente.</p>
        <button type="button" class="socio-profile__logout-button" @click="logout">Cerrar sesion</button>
      </section>
    </div>
  </SocioShell>
</template>
