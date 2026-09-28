<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { postulanteService } from '../../services/postulanteService'
import type { PersonalProfile } from '../../services/types'
import { useAuthStore } from '../../stores/auth'

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
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudieron cargar tus datos.'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!profile.value) return
  saving.value = true
  try {
    const { email, fotoUrl, ...data } = profile.value
    const updated = await postulanteService.updatePersonalProfile(data, auth.token ?? undefined)
    profile.value = updated
    auth.setFullName(updated.nombreCompleto)
    messageTone.value = 'success'
    message.value = 'Datos personales actualizados.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudieron guardar los datos.'
  } finally {
    saving.value = false
  }
}

async function onPhotoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    messageTone.value = 'error'
    message.value = 'Selecciona una imagen.'
    return
  }
  uploadingPhoto.value = true
  try {
    profile.value = await postulanteService.uploadProfilePhoto(file, auth.token ?? undefined)
    messageTone.value = 'success'
    message.value = 'Foto de perfil actualizada.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo actualizar la foto.'
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
          <label><input type="file" accept="image/*" :disabled="uploadingPhoto" @change="onPhotoChange"><span>{{ uploadingPhoto ? 'Subiendo foto...' : 'Cambiar foto' }}</span></label>
        </div>
        <label>Nombre y apellido *<input v-model="profile.nombreCompleto" required></label>
        <label>Correo electrónico<input :value="profile.email" disabled></label>
        <label>Cédula de identidad<input v-model="profile.cedulaIdentidad"></label>
        <label>Teléfono<input v-model="profile.telefono"></label>
        <label>Zona de residencia<input v-model="profile.zonaResidencia"></label>
        <footer><AppButton :loading="saving" type="submit">Guardar datos personales</AppButton></footer>
      </form>
    </section>
  </PostulanteShell>
</template>