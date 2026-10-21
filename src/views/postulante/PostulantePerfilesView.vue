<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { jsPDF } from 'jspdf'
import { Plus, Trash2, Wrench } from 'lucide-vue-next'
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
const manualCvOpen = ref(false)
const editorError = ref('')
type ManualEntry = { title: string; detail: string; from: string; to: string }
type ManualReference = { name: string; role: string; phone: string; email: string }
const manualCv = reactive({
  summary: '',
  experiences: [] as ManualEntry[],
  education: [] as ManualEntry[],
  skills: '',
  languages: '',
  certifications: '',
  workReferences: [] as ManualReference[],
  personalReferences: [] as ManualReference[],
})

function resetManualCv() {
  manualCv.summary = ''
  manualCv.experiences = []
  manualCv.education = []
  manualCv.skills = ''
  manualCv.languages = ''
  manualCv.certifications = ''
  manualCv.workReferences = []
  manualCv.personalReferences = []
}

const availabilityLabel: Record<ProfessionalProfile['disponibilidadHoraria'], string> = {
  FULL_TIME: 'Tiempo completo',
  PART_TIME: 'Part-time',
  INDEFINIDO: 'Cualquier horario',
}

function blankProfile(): ProfessionalProfile {
  return {
    id: 0,
    nombre: '',
    disponibilidadHoraria: 'FULL_TIME',
    tieneVehiculo: false,
    libreta: '',
    ultimoEmpleo: null,
    descripcionExperiencia: null,
    visible: true,
    rubros: [],
  }
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
  manualCvOpen.value = false
  resetManualCv()
  editorError.value = ''
  editing.value = copyProfile(profile)
}

function openNewProfile() {
  selectedFile.value = null
  manualCvOpen.value = false
  resetManualCv()
  editorError.value = ''
  editing.value = blankProfile()
}

function toggleSector(sector: string) {
  if (!editing.value) return
  if (!editing.value.rubros.includes(sector) && editing.value.rubros.length >= 4) {
    editorError.value = 'Puedes seleccionar un máximo de 4 rubros para este perfil.'
    return
  }
  editorError.value = ''
  editing.value.rubros = editing.value.rubros.includes(sector)
    ? editing.value.rubros.filter((item) => item !== sector)
    : [...editing.value.rubros, sector]
}

async function saveProfile() {
  if (!editing.value) return
  saving.value = true
  try {
    const { id, ...profile } = editing.value
    const updated = id
      ? await postulanteService.updateProfile(editing.value, auth.token ?? undefined)
      : await postulanteService.createProfile(profile, auth.token ?? undefined)
    profiles.value = id
      ? profiles.value.map((current) => current.id === updated.id ? updated : current)
      : [...profiles.value, updated]
    editing.value = null
    messageTone.value = 'success'
    message.value = 'Perfil profesional actualizado.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo guardar el perfil.'
  } finally {
    saving.value = false
  }
}

async function setVisibility(profile: ProfessionalProfile, visible: boolean) {
  try {
    const updated = await postulanteService.updateProfile({ ...profile, visible }, auth.token ?? undefined)
    profiles.value = profiles.value.map((current) => current.id === updated.id ? updated : current)
    messageTone.value = 'success'
    message.value = visible ? 'Perfil visible en la bolsa.' : 'Perfil oculto de la bolsa.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo actualizar la visibilidad.'
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

function addManualEntry(kind: 'experiences' | 'education') {
  manualCv[kind].push({ title: '', detail: '', from: '', to: '' })
}

function addReference(kind: 'workReferences' | 'personalReferences') {
  manualCv[kind].push({ name: '', role: '', phone: '', email: '' })
}

function removeEntry(kind: 'experiences' | 'education', index: number) {
  manualCv[kind].splice(index, 1)
}

function removeReference(kind: 'workReferences' | 'personalReferences', index: number) {
  manualCv[kind].splice(index, 1)
}

function hasReference() {
  return manualCv.workReferences.some((reference) => reference.name.trim())
    || manualCv.personalReferences.some((reference) => reference.name.trim())
}

function buildManualCv() {
  if (!editing.value || !hasReference()) return null
  const document = new jsPDF()
  let y = 20
  const pageHeight = document.internal.pageSize.getHeight()
  const write = (title: string, content: string) => {
    if (!content.trim()) return
    const lines = document.splitTextToSize(content, 180)
    if (y + lines.length * 5 + 14 > pageHeight - 18) {
      document.addPage()
      y = 20
    }
    document.setFont('helvetica', 'bold')
    document.setFontSize(12)
    document.setTextColor(0, 112, 62)
    document.text(title, 14, y)
    y += 7
    document.setFont('helvetica', 'normal')
    document.setFontSize(10)
    document.setTextColor(0, 0, 0)
    document.text(lines, 14, y)
    y += lines.length * 5 + 7
  }
  document.setFont('helvetica', 'bold')
  document.setFontSize(18)
  document.setTextColor(0, 112, 62)
  document.text(auth.fullName || 'Curriculum Vitae', 14, y)
  y += 10
  document.setFont('helvetica', 'normal')
  document.setFontSize(10)
  document.setTextColor(0, 0, 0)
  document.text(`Perfil: ${editing.value.nombre}`, 14, y)
  y += 9
  write('Perfil profesional', manualCv.summary)
  write('Experiencia laboral', manualCv.experiences.filter((entry) => entry.title.trim()).map((entry) => [entry.title, entry.from, entry.to, entry.detail].filter(Boolean).join(' | ')).join('\n'))
  write('Formación académica', manualCv.education.filter((entry) => entry.title.trim()).map((entry) => [entry.title, entry.from, entry.to, entry.detail].filter(Boolean).join(' | ')).join('\n'))
  write('Habilidades técnicas', manualCv.skills)
  write('Idiomas', manualCv.languages)
  write('Cursos y certificaciones', manualCv.certifications)
  write('Referencias laborales', manualCv.workReferences.filter((reference) => reference.name.trim()).map((reference) => [reference.name, reference.role, reference.phone, reference.email].filter(Boolean).join(' | ')).join('\n'))
  write('Referencias personales', manualCv.personalReferences.filter((reference) => reference.name.trim()).map((reference) => [reference.name, reference.role, reference.phone, reference.email].filter(Boolean).join(' | ')).join('\n'))
  return new File([document.output('blob')], 'cv-manual.pdf', { type: 'application/pdf' })
}

async function uploadManualCv() {
  if (!editing.value) return
  const file = buildManualCv()
  if (!file) {
    editorError.value = 'Agrega al menos una referencia laboral o personal para generar el CV.'
    return
  }
  uploading.value = true
  editorError.value = ''
  try {
    await postulanteService.uploadCv(file, manualCv.summary || undefined, auth.token ?? undefined, editing.value.id)
    messageTone.value = 'success'
    message.value = 'CV manual creado y guardado correctamente.'
    manualCvOpen.value = false
    await load()
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : 'No se pudo crear el PDF manual.'
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
  if (!window.confirm('¿Eliminar este PDF? Esta acción no se puede deshacer.')) return
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
  <PostulanteShell title="Mis Perfiles Profesionales" subtitle="Gestiona tus diferentes perfiles de postulación" active-section="perfiles">
    <section class="postulante-profiles">
      <AppAlert v-if="message" :tone="messageTone">{{ message }}</AppAlert>
      <AppAlert tone="info">Administra tus perfiles profesionales y los PDFs asociados a cada uno.</AppAlert>
      <div class="postulante-profiles__toolbar"><AppButton @click="openNewProfile">Agregar perfil profesional</AppButton></div>
      <p v-if="loading">Cargando perfiles...</p>

      <article v-for="profile in profiles" :key="profile.id" class="profile-card-postulante">
        <header class="profile-card-postulante__header">
          <div>
            <h2>{{ profile.nombre }}</h2>
            <span class="profile-card-postulante__visibility" :class="profile.visible ? 'profile-card-postulante__visibility--visible' : 'profile-card-postulante__visibility--hidden'">{{ profile.visible ? 'Perfil visible' : 'Perfil oculto' }}</span>
          </div>
          <div class="profile-card-postulante__actions">
            <AppButton variant="secondary" @click="setVisibility(profile, !profile.visible)">{{ profile.visible ? 'Ocultar perfil' : 'Hacer visible' }}</AppButton>
            <AppButton variant="secondary" @click="openEditor(profile)">Editar</AppButton>
          </div>
        </header>
        <div class="profile-card-postulante__details">
          <p><strong>Habilidades y áreas de interés:</strong> <span class="profile-card-postulante__skills"><span v-for="rubro in profile.rubros" :key="rubro">{{ rubro }}</span></span></p>
          <p><strong>Disponibilidad horaria:</strong> {{ availabilityLabel[profile.disponibilidadHoraria] }}</p>
          <p><strong>Vehículo propio:</strong> {{ profile.tieneVehiculo ? 'Sí' : 'No' }}</p>
          <p><strong>Libreta de conducir:</strong> {{ profile.libreta || 'No informada' }}</p>
          <p><strong>Detalle del último empleo:</strong> {{ profile.ultimoEmpleo || 'No informado' }}</p>
          <p><strong>Resumen de experiencia laboral y presentación:</strong> {{ profile.descripcionExperiencia || 'No informado' }}</p>
        </div>
        <section class="profile-pdfs">
          <h3>PDFs</h3>
          <p v-if="!cvsFor(profile.id).length">Todavía no hay PDFs asociados a este perfil.</p>
          <div v-for="cv in cvsFor(profile.id)" :key="cv.id" class="profile-pdfs__item">
            <span>{{ cv.nombreArchivo || `PDF versión ${cv.version}` }} {{ cv.activo ? '(Activo)' : '' }}</span>
            <div class="profile-card-postulante__actions"><AppButton variant="secondary" @click="openDownload(cv.downloadUrl)">Descargar</AppButton><AppButton variant="secondary" :disabled="cv.activo" @click="activateCv(cv.id)">Activar</AppButton><AppButton @click="deleteCv(cv.id)">Eliminar</AppButton></div>
          </div>
        </section>
      </article>
      <AppAlert v-if="!loading && !profiles.length" tone="info">Aún no tienes perfiles profesionales.</AppAlert>
    </section>

    <div v-if="editing" class="modal" aria-modal="true" aria-labelledby="edit-profile-title">
      <div class="modal__backdrop" @click="editing = null"></div>
      <section class="modal__panel modal__panel--large">
        <header class="modal__header"><h3 id="edit-profile-title">Editar Perfil Profesional</h3><button type="button" class="modal__close" @click="editing = null">×</button></header>
        <div class="modal__form-grid profile-editor">
          <label>Nombre del perfil profesional *<input v-model="editing.nombre"></label>
          <fieldset><legend>Habilidades y áreas de interés</legend><div class="profile-card-postulante__skills"><button v-for="sector in sectors" :key="sector" type="button" :class="{ 'profile-chip--selected': editing.rubros.includes(sector) }" @click="toggleSector(sector)">{{ sector }}</button></div></fieldset>
          <label>Disponibilidad Horaria *<select v-model="editing.disponibilidadHoraria"><option value="FULL_TIME">Tiempo completo</option><option value="INDEFINIDO">Cualquier horario</option><option value="PART_TIME">Part-time</option></select></label>
          <label class="modal__checkbox"><input v-model="editing.tieneVehiculo" type="checkbox"> Posee vehículo propio / libreta de conducir al día</label>
          <label>Libreta de conducir<input v-model="editing.libreta" maxlength="120" placeholder="Ej. Cat. A, G2"></label>
          <label>Detalle del último empleo *<input v-model="editing.ultimoEmpleo"></label>
          <label>Resumen de experiencia laboral y presentación *<textarea v-model="editing.descripcionExperiencia"></textarea></label>
          <label class="modal__checkbox"><input v-model="editing.visible" type="checkbox"> Perfil visible para socios</label>
          <AppAlert v-if="editorError">{{ editorError }}</AppAlert>
          <section v-if="editing.id" class="profile-pdfs profile-pdfs--editor"><h4>PDFs de este perfil</h4><div v-for="cv in editingCvs" :key="cv.id" class="profile-pdfs__item"><span>{{ cv.nombreArchivo || `PDF versión ${cv.version}` }}</span><div class="profile-card-postulante__actions"><AppButton variant="secondary" @click="openDownload(cv.downloadUrl)">Descargar</AppButton><AppButton variant="secondary" :disabled="cv.activo" @click="activateCv(cv.id)">Activar</AppButton><AppButton @click="deleteCv(cv.id)">Eliminar</AppButton></div></div><div class="profile-pdfs__upload"><input type="file" accept=".pdf,application/pdf" @change="onFileChange"><AppButton :loading="uploading" :disabled="!selectedFile" @click="uploadCv">Subir PDF</AppButton><AppButton variant="secondary" @click="manualCvOpen = !manualCvOpen"><Wrench :size="15" /> Crear PDF manual</AppButton></div>
            <section v-if="manualCvOpen" class="profile-manual-cv"><p>Agrega una referencia laboral o personal para poder generar el PDF.</p><label>Perfil profesional<textarea v-model="manualCv.summary" /></label><div class="profile-manual-cv__heading"><b>Experiencia laboral</b><button type="button" @click="addManualEntry('experiences')"><Plus :size="14" /> Agregar</button></div><div v-for="(entry, index) in manualCv.experiences" :key="`experience-${index}`" class="profile-manual-cv__entry"><input v-model="entry.title" placeholder="Cargo | Empresa"><input v-model="entry.from" type="month"><input v-model="entry.to" type="month"><textarea v-model="entry.detail" placeholder="Responsabilidades y logros" /><button type="button" @click="removeEntry('experiences', index)"><Trash2 :size="14" /> Quitar</button></div><div class="profile-manual-cv__heading"><b>Formación académica</b><button type="button" @click="addManualEntry('education')"><Plus :size="14" /> Agregar</button></div><div v-for="(entry, index) in manualCv.education" :key="`education-${index}`" class="profile-manual-cv__entry"><input v-model="entry.title" placeholder="Título | Institución"><input v-model="entry.from" type="month"><input v-model="entry.to" type="month"><textarea v-model="entry.detail" placeholder="Detalle de la formación" /><button type="button" @click="removeEntry('education', index)"><Trash2 :size="14" /> Quitar</button></div><label>Habilidades técnicas<textarea v-model="manualCv.skills" /></label><label>Idiomas<textarea v-model="manualCv.languages" placeholder="Ej: Inglés - Intermedio" /></label><label>Cursos y certificaciones<textarea v-model="manualCv.certifications" /></label><div class="profile-manual-cv__heading"><b>Referencias laborales</b><button type="button" @click="addReference('workReferences')"><Plus :size="14" /> Agregar</button></div><div v-for="(reference, index) in manualCv.workReferences" :key="`work-${index}`" class="profile-manual-cv__entry"><input v-model="reference.name" placeholder="Nombre"><input v-model="reference.role" placeholder="Cargo / relación"><input v-model="reference.phone" placeholder="Teléfono"><input v-model="reference.email" placeholder="Correo"><button type="button" @click="removeReference('workReferences', index)"><Trash2 :size="14" /> Quitar</button></div><div class="profile-manual-cv__heading"><b>Referencias personales</b><button type="button" @click="addReference('personalReferences')"><Plus :size="14" /> Agregar</button></div><div v-for="(reference, index) in manualCv.personalReferences" :key="`personal-${index}`" class="profile-manual-cv__entry"><input v-model="reference.name" placeholder="Nombre"><input v-model="reference.role" placeholder="Relación"><input v-model="reference.phone" placeholder="Teléfono"><input v-model="reference.email" placeholder="Correo"><button type="button" @click="removeReference('personalReferences', index)"><Trash2 :size="14" /> Quitar</button></div><AppButton :loading="uploading" @click="uploadManualCv">Generar y subir PDF</AppButton></section>
          </section>
        </div>
        <footer class="modal__actions"><AppButton variant="secondary" @click="editing = null">Cancelar</AppButton><AppButton :loading="saving" @click="saveProfile">Guardar cambios</AppButton></footer>
      </section>
    </div>
  </PostulanteShell>
</template>