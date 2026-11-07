<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { localidadesConActual } from '../../data/localidades'
import { postulanteService } from '../../services/postulanteService'
import type { PersonalProfile } from '../../services/types'
import { useAuthStore } from '../../stores/auth'
import { userFacingError } from '../../utils/userMessage'

const auth = useAuthStore()
const profile = ref<PersonalProfile | null>(null)
const loading = ref(false)
const saving = ref(false)
const uploadingPhoto = ref(false)
const message = ref<string | null>(null)
const messageTone = ref<'success' | 'error'>('success')

async function load() {
  loading.value = true
  try {
    profile.value = await postulanteService.personalProfile(auth.token ?? undefined)
    auth.setPhotoUrl(profile.value.fotoUrl)
  } catch (error) {
    messageTone.value = 'error'
    message.value = userFacingError(error, 'cargar tus datos personales')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!profile.value) return
  if (!profile.value.nombreCompleto.trim()) {
    messageTone.value = 'error'
    message.value = 'El nombre y apellido son obligatorios para guardar tu perfil.'
    return
  }
  saving.value = true
  try {
    const { email, fotoUrl, ...data } = profile.value
    const updated = await postulanteService.updatePersonalProfile(data, auth.token ?? undefined)
    profile.value = updated
    auth.setFullName(updated.nombreCompleto)
    auth.setPhotoUrl(updated.fotoUrl)
    messageTone.value = 'success'
    message.value = 'Tus datos personales se guardaron correctamente.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = userFacingError(error, 'guardar tus datos personales')
  } finally {
    saving.value = false
  }
}

async function onPhotoChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    messageTone.value = 'error'
    message.value = 'Seleccioná una imagen (JPG, PNG o WEBP) para tu foto de perfil.'
    return
  }
  uploadingPhoto.value = true
  try {
    profile.value = await postulanteService.uploadProfilePhoto(file, auth.token ?? undefined)
    auth.setPhotoUrl(profile.value.fotoUrl)
    messageTone.value = 'success'
    message.value = 'Tu foto de perfil se actualizó correctamente.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = userFacingError(error, 'actualizar la foto de perfil')
  } finally {
    uploadingPhoto.value = false
  }
}

onMounted(load)
</script>

<template>
  <PostulanteShell title="Mi perfil" subtitle="Edita tus datos personales" active-section="mi-perfil">
    <section class="personal-profile">
      <AppAlert v-if="message" :tone="messageTone">{{ message }}</AppAlert>
      <p v-if="loading">Cargando datos personales...</p>
      <form v-else-if="profile" class="personal-profile__form" @submit.prevent="save">
        <div class="personal-profile__photo">
          <img v-if="profile.fotoUrl" :src="profile.fotoUrl" alt="Foto de perfil">
          <span v-else>{{ profile.nombreCompleto.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }}</span>
          <label><input type="file" accept="image/jpeg,image/png,image/webp" :disabled="uploadingPhoto" @change="onPhotoChange"><span>{{ uploadingPhoto ? 'Subiendo foto...' : 'Cambiar foto' }}</span></label>
        </div>
        <label>Nombre y apellido *
          <input v-model="profile.nombreCompleto" required placeholder="Como figura en tu documento">
        </label>
        <label>Correo electrónico
          <input :value="profile.email" disabled>
          <small>No se puede modificar desde aquí</small>
        </label>
        <label>Cédula de identidad
          <input v-model="profile.cedulaIdentidad" inputmode="numeric" placeholder="Sin puntos ni guiones">
        </label>
        <label>Teléfono
          <input v-model="profile.telefono" inputmode="tel" placeholder="Ej. 099123456">
        </label>
        <label>Zona de residencia
          <select v-model="profile.zonaResidencia">
            <option value="" disabled>Seleccionar localidad</option>
            <option v-for="localidad in localidadesConActual(profile.zonaResidencia)" :key="localidad" :value="localidad">{{ localidad }}</option>
          </select>
        </label>
        <footer><AppButton :loading="saving" type="submit">Guardar datos personales</AppButton></footer>
      </form>
    </section>
  </PostulanteShell>
</template>