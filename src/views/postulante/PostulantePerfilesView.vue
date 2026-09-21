<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { postulanteService } from '../../services/postulanteService'
import type { CvResponse } from '../../services/types'

const cvs = ref<CvResponse[]>([])
const loading = ref(false)
const message = ref<string | null>(null)
const messageTone = ref<'success' | 'error' | 'info'>('info')
const showUploadModal = ref(false)
const uploading = ref(false)
const selectedFile = ref<File | null>(null)
const form = ref({
  summary: '',
})

const hasCvs = computed(() => cvs.value.length > 0)

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-UY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function loadCvs() {
  loading.value = true
  try {
    cvs.value = await postulanteService.listCvs()
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'No se pudieron cargar tus CVs.'
    messageTone.value = 'error'
  } finally {
    loading.value = false
  }
}

function openUpload() {
  selectedFile.value = null
  form.value.summary = ''
  showUploadModal.value = true
}

function closeUpload() {
  showUploadModal.value = false
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

async function submitUpload() {
  if (!selectedFile.value) {
    messageTone.value = 'error'
    message.value = 'Debes seleccionar un archivo PDF o DOCX.'
    return
  }

  uploading.value = true
  try {
    await postulanteService.uploadCv(selectedFile.value, form.value.summary)
    messageTone.value = 'success'
    message.value = 'CV cargado correctamente.'
    closeUpload()
    await loadCvs()
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo cargar el CV.'
  } finally {
    uploading.value = false
  }
}

async function activateCv(cvId: number) {
  try {
    await postulanteService.activateCv(cvId)
    messageTone.value = 'success'
    message.value = 'CV marcado como activo.'
    await loadCvs()
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo activar el CV.'
  }
}

async function deleteCv(cvId: number) {
  try {
    await postulanteService.deleteCv(cvId)
    messageTone.value = 'success'
    message.value = 'CV eliminado correctamente.'
    await loadCvs()
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo eliminar el CV.'
  }
}

function openDownload(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(loadCvs)
</script>

<template>
  <PostulanteShell
    title="Mis Perfiles Profesionales"
    subtitle="Gestiona tus diferentes perfiles de postulacion"
    active-section="perfiles"
  >
    <section class="postulante-profiles">
      <AppAlert v-if="message" :tone="messageTone">
        {{ message }}
      </AppAlert>
      <AppAlert tone="info">
        Sube y administra multiples versiones de tu CV. Puedes mantener una version activa para tus postulaciones.
      </AppAlert>
      <div class="postulante-profiles__toolbar">
        <AppButton @click="openUpload">Subir nuevo CV</AppButton>
      </div>

      <p v-if="loading">Cargando CVs...</p>
      <AppAlert v-else-if="!hasCvs" tone="info">Aun no cargaste ningun CV.</AppAlert>

      <article v-for="cv in cvs" :key="cv.id" class="profile-card-postulante">
        <header class="profile-card-postulante__header">
          <div>
            <h2>{{ cv.nombreArchivo || `CV v${cv.version}` }}</h2>
            <span
              class="profile-card-postulante__visibility"
              :class="{
                'profile-card-postulante__visibility--visible': cv.activo,
                'profile-card-postulante__visibility--hidden': !cv.activo,
              }"
            >
              {{ cv.activo ? 'CV Activo' : 'CV Inactivo' }}
            </span>
          </div>
          <div class="profile-card-postulante__actions">
            <AppButton variant="secondary" :disabled="cv.activo" @click="activateCv(cv.id)">
              {{ cv.activo ? 'Activo' : 'Activar' }}
            </AppButton>
            <AppButton variant="secondary" @click="openDownload(cv.downloadUrl)">Descargar</AppButton>
            <AppButton @click="deleteCv(cv.id)">Eliminar</AppButton>
          </div>
        </header>

        <div class="profile-card-postulante__details">
          <p><strong>Version:</strong> {{ cv.version }}</p>
          <p><strong>Tipo:</strong> {{ cv.mimeType || 'No informado' }}</p>
          <p><strong>Tamano:</strong> {{ cv.sizeBytes ? `${Math.round(cv.sizeBytes / 1024)} KB` : 'No informado' }}</p>
          <p><strong>Fecha de carga:</strong> {{ formatDate(cv.fechaCarga) }}</p>
          <p><strong>Resumen:</strong> {{ cv.resumen || 'Sin resumen.' }}</p>
        </div>
      </article>
    </section>

    <div v-if="showUploadModal" class="modal" aria-modal="true" aria-labelledby="upload-cv-title">
      <div class="modal__backdrop" @click="closeUpload"></div>
      <section class="modal__panel modal__panel--large">
        <header class="modal__header">
          <h3 id="upload-cv-title">Subir nuevo CV</h3>
          <button type="button" class="modal__close" @click="closeUpload">×</button>
        </header>

        <div class="modal__form-grid">
          <label for="cv-file-input">Archivo CV (PDF o DOCX) *</label>
          <input id="cv-file-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" @change="onFileChange">

          <label for="profile-summary-input">Resumen de experiencia laboral y presentacion</label>
          <textarea id="profile-summary-input" v-model="form.summary"></textarea>
        </div>

        <footer class="modal__actions">
          <AppButton variant="secondary" @click="closeUpload">Cancelar</AppButton>
          <AppButton :loading="uploading" @click="submitUpload">Subir CV</AppButton>
        </footer>
      </section>
    </div>
  </PostulanteShell>
</template>
