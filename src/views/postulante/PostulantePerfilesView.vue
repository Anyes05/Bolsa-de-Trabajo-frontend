<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { catalogService } from '../../services/catalogService'
import { postulanteService } from '../../services/postulanteService'
import type { CvResponse, ProfessionalProfile } from '../../services/types'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const profiles = ref<ProfessionalProfile[]>([])
const cvs = ref<CvResponse[]>([])
const sectors = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const message = ref<string | null>(null)
const messageTone = ref<'success' | 'error' | 'info'>('info')
const editing = ref<ProfessionalProfile | null>(null)
const selectedFile = ref<File | null>(null)

const availabilityLabel: Record<ProfessionalProfile['disponibilidadHoraria'], string> = {
  FULL_TIME: 'Tiempo completo',
  PART_TIME: 'Part-time',
  INDEFINIDO: 'Cualquier horario',
}

function copyProfile(profile: ProfessionalProfile) {
  return { ...profile, rubros: [...profile.rubros] }
}

function cvsFor(profileId: number) {
  return cvs.value.filter((cv) => cv.perfilLaboralId === profileId)
}

async function load() {
  loading.value = true
  try {
    const [loadedProfiles, loadedCvs, loadedSectors] = await Promise.all([
      postulanteService.listProfiles(auth.token ?? undefined),
      postulanteService.listCvs(auth.token ?? undefined),
      catalogService.getSectors(),
    ])
    profiles.value = loadedProfiles
    cvs.value = loadedCvs
    sectors.value = loadedSectors
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudieron cargar tus perfiles.'
  } finally {
    loading.value = false
  }
}

function openEditor(profile: ProfessionalProfile) {
  selectedFile.value = null
  editing.value = copyProfile(profile)
}

function toggleSector(sector: string) {
  if (!editing.value) return
  editing.value.rubros = editing.value.rubros.includes(sector)
    ? editing.value.rubros.filter((item) => item !== sector)
    : [...editing.value.rubros, sector]
}

async function saveProfile() {
  if (!editing.value) return
  saving.value = true
  try {
    const updated = await postulanteService.updateProfile(editing.value, auth.token ?? undefined)
    profiles.value = profiles.value.map((profile) => profile.id === updated.id ? updated : profile)
    editing.value = copyProfile(updated)
    messageTone.value = 'success'
    message.value = 'Perfil profesional actualizado.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo guardar el perfil.'
  } finally {
    saving.value = false
  }
}

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  selectedFile.value = file?.type === 'application/pdf' ? file : null
  if (file && !selectedFile.value) {
    messageTone.value = 'error'
    message.value = 'Selecciona un archivo PDF.'
  }
}

async function uploadCv() {
  if (!editing.value || !selectedFile.value) return
  uploading.value = true
  try {
    await postulanteService.uploadCv(selectedFile.value, undefined, auth.token ?? undefined, editing.value.id)
    selectedFile.value = null
    messageTone.value = 'success'
    message.value = 'PDF cargado correctamente.'
    await load()
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo subir el PDF.'
  } finally {
    uploading.value = false
  }
}

async function activateCv(cvId: number) {
  try {
    await postulanteService.activateCv(cvId, auth.token ?? undefined)
    await load()
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo activar el PDF.'
  }
}

async function deleteCv(cvId: number) {
  if (!window.confirm('Eliminar este PDF? Esta accion no se puede deshacer.')) return
  try {
    await postulanteService.deleteCv(cvId, auth.token ?? undefined)
    await load()
    messageTone.value = 'success'
    message.value = 'PDF eliminado correctamente.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo eliminar el PDF.'
  }
}

function openDownload(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const editingCvs = computed(() => editing.value ? cvsFor(editing.value.id) : [])
onMounted(load)
</script>

<template>
  <PostulanteShell title="Mis Perfiles Profesionales" subtitle="Gestiona tus diferentes perfiles de postulacion" active-section="perfiles">
    <section class="postulante-profiles">
      <AppAlert v-if="message" :tone="messageTone">{{ message }}</AppAlert>
      <AppAlert tone="info">Administra tus perfiles profesionales y los PDFs asociados a cada uno.</AppAlert>
      <p v-if="loading">Cargando perfiles...</p>

      <article v-for="profile in profiles" :key="profile.id" class="profile-card-postulante">
        <header class="profile-card-postulante__header">
          <div>
            <h2>{{ profile.nombre }}</h2>
            <span class="profile-card-postulante__visibility" :class="profile.visible ? 'profile-card-postulante__visibility--visible' : 'profile-card-postulante__visibility--hidden'">{{ profile.visible ? 'Perfil visible' : 'Perfil oculto' }}</span>
          </div>
          <AppButton variant="secondary" @click="openEditor(profile)">Editar</AppButton>
        </header>
        <div class="profile-card-postulante__details">
          <p><strong>Habilidades y areas de interes:</strong> <span class="profile-card-postulante__skills"><span v-for="rubro in profile.rubros" :key="rubro">{{ rubro }}</span></span></p>
          <p><strong>Disponibilidad horaria:</strong> {{ availabilityLabel[profile.disponibilidadHoraria] }}</p>
          <p><strong>Vehiculo propio:</strong> {{ profile.tieneVehiculo ? 'Si' : 'No' }}</p>
          <p><strong>Detalle del ultimo empleo:</strong> {{ profile.ultimoEmpleo || 'No informado' }}</p>
          <p><strong>Resumen de experiencia laboral y presentacion:</strong> {{ profile.descripcionExperiencia || 'No informado' }}</p>
        </div>
        <section class="profile-pdfs">
          <h3>PDFs</h3>
          <p v-if="!cvsFor(profile.id).length">Todavia no hay PDFs asociados a este perfil.</p>
          <div v-for="cv in cvsFor(profile.id)" :key="cv.id" class="profile-pdfs__item">
            <span>{{ cv.nombreArchivo || `PDF version ${cv.version}` }} {{ cv.activo ? '(Activo)' : '' }}</span>
            <div class="profile-card-postulante__actions"><AppButton variant="secondary" @click="openDownload(cv.downloadUrl)">Descargar</AppButton><AppButton variant="secondary" :disabled="cv.activo" @click="activateCv(cv.id)">Activar</AppButton><AppButton @click="deleteCv(cv.id)">Eliminar</AppButton></div>
          </div>
        </section>
      </article>
      <AppAlert v-if="!loading && !profiles.length" tone="info">Aun no tenes perfiles profesionales.</AppAlert>
    </section>

    <div v-if="editing" class="modal" aria-modal="true" aria-labelledby="edit-profile-title">
      <div class="modal__backdrop" @click="editing = null"></div>
      <section class="modal__panel modal__panel--large">
        <header class="modal__header"><h3 id="edit-profile-title">Editar Perfil Profesional</h3><button type="button" class="modal__close" @click="editing = null">×</button></header>
        <div class="modal__form-grid profile-editor">
          <label>Nombre del perfil profesional *<input v-model="editing.nombre"></label>
          <fieldset><legend>Habilidades y Areas de interes</legend><div class="profile-card-postulante__skills"><button v-for="sector in sectors" :key="sector" type="button" :class="{ 'profile-chip--selected': editing.rubros.includes(sector) }" @click="toggleSector(sector)">{{ sector }}</button></div></fieldset>
          <label>Disponibilidad Horaria *<select v-model="editing.disponibilidadHoraria"><option value="FULL_TIME">Tiempo completo</option><option value="INDEFINIDO">Cualquier horario</option><option value="PART_TIME">Part-time</option></select></label>
          <label class="modal__checkbox"><input v-model="editing.tieneVehiculo" type="checkbox"> Posee vehiculo propio / libreta de conducir al dia</label>
          <label>Detalle del ultimo empleo *<input v-model="editing.ultimoEmpleo"></label>
          <label>Resumen de experiencia laboral y presentacion *<textarea v-model="editing.descripcionExperiencia"></textarea></label>
          <label class="modal__checkbox"><input v-model="editing.visible" type="checkbox"> Perfil visible para socios</label>
          <section class="profile-pdfs profile-pdfs--editor"><h4>PDFs de este perfil</h4><div v-for="cv in editingCvs" :key="cv.id" class="profile-pdfs__item"><span>{{ cv.nombreArchivo || `PDF version ${cv.version}` }}</span><div class="profile-card-postulante__actions"><AppButton variant="secondary" @click="openDownload(cv.downloadUrl)">Descargar</AppButton><AppButton variant="secondary" :disabled="cv.activo" @click="activateCv(cv.id)">Activar</AppButton><AppButton @click="deleteCv(cv.id)">Eliminar</AppButton></div></div><div class="profile-pdfs__upload"><input type="file" accept=".pdf,application/pdf" @change="onFileChange"><AppButton :loading="uploading" :disabled="!selectedFile" @click="uploadCv">Subir PDF</AppButton></div></section>
        </div>
        <footer class="modal__actions"><AppButton variant="secondary" @click="editing = null">Cancelar</AppButton><AppButton :loading="saving" @click="saveProfile">Guardar cambios</AppButton></footer>
      </section>
    </div>
  </PostulanteShell>
</template>