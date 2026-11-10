<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { jsPDF } from 'jspdf'
import { Briefcase, Pause, Plus, Trash2, Wrench } from 'lucide-vue-next'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { catalogService } from '../../services/catalogService'
import { postulanteService } from '../../services/postulanteService'
import type { CvResponse, DisponibilidadLaboral, ProfessionalProfile } from '../../services/types'
import { useAuthStore } from '../../stores/auth'
import { userFacingError } from '../../utils/userMessage'

const auth = useAuthStore()
const profiles = ref<ProfessionalProfile[]>([])
const cvs = ref<CvResponse[]>([])
const sectors = ref<string[]>([])
const loading = ref(false)
const disponibilidad = ref<DisponibilidadLaboral | null>(null)
const disponibilidadLoading = ref(false)
const disponibilidadSaving = ref(false)
const disponibilidadError = ref('')
const disponibilidadMessage = ref('')
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
    message.value = userFacingError(error, 'cargar tus perfiles profesionales')
  } finally {
    loading.value = false
  }
}

async function loadDisponibilidad() {
  disponibilidadLoading.value = true
  disponibilidadError.value = ''
  try {
    disponibilidad.value = await postulanteService.disponibilidadLaboral(auth.token ?? undefined)
  } catch (error) {
    disponibilidadError.value = userFacingError(error, 'cargar tu disponibilidad laboral')
  } finally {
    disponibilidadLoading.value = false
  }
}

async function toggleDisponibilidad() {
  if (!disponibilidad.value || disponibilidadSaving.value) return
  disponibilidadSaving.value = true
  disponibilidadError.value = ''
  disponibilidadMessage.value = ''
  try {
    disponibilidad.value = await postulanteService.updateDisponibilidadLaboral(
      !disponibilidad.value.busquedaPausada, auth.token ?? undefined,
    )
    disponibilidadMessage.value = disponibilidad.value.busquedaPausada
      ? 'Búsqueda pausada. Tus perfiles ya no aparecen en las búsquedas de socios.'
      : 'Volviste a activar tu búsqueda. Se conserva la visibilidad individual de tus perfiles.'
  } catch (error) {
    disponibilidadError.value = userFacingError(error, 'actualizar tu disponibilidad laboral')
  } finally {
    disponibilidadSaving.value = false
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
    message.value = id ? 'El perfil profesional se actualizó correctamente.' : 'El perfil profesional se creó correctamente.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = userFacingError(error, 'guardar el perfil profesional')
  } finally {
    saving.value = false
  }
}

async function setVisibility(profile: ProfessionalProfile, visible: boolean) {
  try {
    const updated = await postulanteService.updateProfile({ ...profile, visible }, auth.token ?? undefined)
    profiles.value = profiles.value.map((current) => current.id === updated.id ? updated : current)
    messageTone.value = 'success'
    message.value = visible
      ? disponibilidad.value?.busquedaPausada
        ? 'El perfil quedó habilitado, pero seguirá oculto mientras tu búsqueda esté pausada.'
        : 'El perfil ahora es visible para los socios en la bolsa de empleo.'
      : 'El perfil quedó oculto y no aparecerá en la bolsa de empleo.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = userFacingError(error, 'actualizar la visibilidad del perfil')
  }
}

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  selectedFile.value = file?.type === 'application/pdf' ? file : null
  if (file && !selectedFile.value) {
    messageTone.value = 'error'
    message.value = 'Solo se admiten archivos PDF. Seleccioná un CV en formato PDF e intentá de nuevo.'
  }
}

async function uploadCv() {
  if (!editing.value || !selectedFile.value) return
  uploading.value = true
  try {
    await postulanteService.uploadCv(selectedFile.value, undefined, auth.token ?? undefined, editing.value.id)
    selectedFile.value = null
    messageTone.value = 'success'
    message.value = 'El PDF del CV se subió correctamente.'
    await load()
  } catch (error) {
    messageTone.value = 'error'
    message.value = userFacingError(error, 'subir el PDF del CV')
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
    editorError.value = 'Agregá al menos una referencia laboral o personal para poder generar el CV.'
    return
  }
  uploading.value = true
  editorError.value = ''
  try {
    await postulanteService.uploadCv(file, manualCv.summary || undefined, auth.token ?? undefined, editing.value.id)
    messageTone.value = 'success'
    message.value = 'El CV manual se generó y guardó correctamente.'
    manualCvOpen.value = false
    await load()
  } catch (error) {
    editorError.value = userFacingError(error, 'crear el PDF manual del CV')
  } finally {
    uploading.value = false
  }
}

async function activateCv(cvId: number) {
  try {
    await postulanteService.activateCv(cvId, auth.token ?? undefined)
    await load()
    messageTone.value = 'success'
    message.value = 'El PDF quedó activo y se usará en tus postulaciones.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = userFacingError(error, 'activar el PDF del CV')
  }
}

async function deleteCv(cvId: number) {
  if (!window.confirm('¿Eliminar este PDF? Esta acción no se puede deshacer.')) return
  try {
    await postulanteService.deleteCv(cvId, auth.token ?? undefined)
    await load()
    messageTone.value = 'success'
    message.value = 'El PDF se eliminó correctamente.'
  } catch (error) {
    messageTone.value = 'error'
    message.value = userFacingError(error, 'eliminar el PDF del CV')
  }
}

function openDownload(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const editingCvs = computed(() => editing.value ? cvsFor(editing.value.id) : [])
onMounted(load)
onMounted(loadDisponibilidad)
</script>

<template>
  <PostulanteShell title="Mis Perfiles Profesionales" subtitle="Gestiona tus diferentes perfiles de postulación" active-section="perfiles">
    <section class="postulante-profiles">
      <AppAlert v-if="message" :tone="messageTone">{{ message }}</AppAlert>
      <AppAlert tone="info">Administra tus perfiles profesionales y los PDFs asociados a cada uno.</AppAlert>
      <section class="job-search-status" :class="{ 'job-search-status--paused': disponibilidad?.busquedaPausada }" aria-labelledby="job-search-title" :aria-busy="disponibilidadLoading || disponibilidadSaving">
        <div class="job-search-status__heading">
          <span class="job-search-status__icon" aria-hidden="true"><Pause v-if="disponibilidad?.busquedaPausada" :size="22" /><Briefcase v-else :size="22" /></span>
          <div>
            <h2 id="job-search-title">Disponibilidad laboral</h2>
            <p v-if="disponibilidad" class="job-search-status__state">{{ disponibilidad.busquedaPausada ? 'Búsqueda pausada' : 'Estoy buscando trabajo' }}</p>
            <p v-else>{{ disponibilidadLoading ? 'Cargando disponibilidad...' : 'Disponibilidad no disponible' }}</p>
          </div>
        </div>
        <div v-if="disponibilidad" class="job-search-status__control">
          <span id="job-search-label">No busco trabajo actualmente</span>
          <button type="button" class="job-search-status__switch" role="switch" aria-labelledby="job-search-label" aria-describedby="job-search-help" :aria-checked="disponibilidad.busquedaPausada" :disabled="disponibilidadLoading || disponibilidadSaving" @click="toggleDisponibilidad"><span /></button>
        </div>
        <p id="job-search-help" class="job-search-status__help">{{ disponibilidad?.busquedaPausada ? 'Tus perfiles están ocultos para las búsquedas de socios. El administrador puede seguir viéndolos y vos podés editarlos. Desactivá esta opción cuando quieras volver a buscar trabajo.' : 'Podés pausar todos tus perfiles sin eliminar tu cuenta. Al reanudar la búsqueda se respeta la visibilidad individual de cada perfil.' }}</p>
        <p v-if="disponibilidadSaving" class="job-search-status__help" role="status">Guardando disponibilidad...</p>
        <AppAlert v-if="disponibilidadError" tone="error">{{ disponibilidadError }} <button v-if="!disponibilidad" type="button" :disabled="disponibilidadLoading" @click="loadDisponibilidad">Reintentar</button></AppAlert>
        <p v-if="disponibilidadMessage" class="job-search-status__confirmation" role="status">{{ disponibilidadMessage }}</p>
      </section>
      <div class="postulante-profiles__toolbar"><AppButton @click="openNewProfile">Agregar perfil profesional</AppButton></div>
      <p v-if="loading">Cargando perfiles...</p>

      <article v-for="profile in profiles" :key="profile.id" class="profile-card-postulante">
        <header class="profile-card-postulante__header">
          <div>
            <h2>{{ profile.nombre }}</h2>
            <span class="profile-card-postulante__visibility" :class="profile.visible && disponibilidad && !disponibilidad.busquedaPausada ? 'profile-card-postulante__visibility--visible' : 'profile-card-postulante__visibility--hidden'">{{ !profile.visible ? 'Perfil oculto' : !disponibilidad ? 'Visibilidad pendiente' : disponibilidad.busquedaPausada ? 'Oculto por búsqueda pausada' : 'Perfil visible' }}</span>
          </div>
          <div class="profile-card-postulante__actions">
            <AppButton variant="secondary" @click="setVisibility(profile, !profile.visible)">{{ profile.visible ? 'Ocultar perfil' : disponibilidad?.busquedaPausada ? 'Habilitar al reanudar' : 'Hacer visible' }}</AppButton>
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
            <div class="profile-card-postulante__actions">
              <AppButton variant="secondary" @click="openDownload(cv.downloadUrl)">Descargar</AppButton>
              <AppButton variant="secondary" :disabled="cv.activo" @click="activateCv(cv.id)">Activar</AppButton>
              <AppButton variant="danger" @click="deleteCv(cv.id)">Eliminar</AppButton>
            </div>
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
          <label class="modal__checkbox">
            <input v-model="editing.tieneVehiculo" type="checkbox">
            <span>Posee vehículo propio</span>
          </label>
          <label>Libreta de conducir<input v-model="editing.libreta" maxlength="120" placeholder="Ej. Cat. A, G2"></label>
          <label>Detalle del último empleo *<input v-model="editing.ultimoEmpleo"></label>
          <label>Resumen de experiencia laboral y presentación *<textarea v-model="editing.descripcionExperiencia"></textarea></label>
          <label class="modal__checkbox">
            <input v-model="editing.visible" type="checkbox">
            <span>{{ disponibilidad?.busquedaPausada ? 'Habilitar este perfil para cuando reanude mi búsqueda' : 'Perfil visible para socios en la bolsa de empleo' }}</span>
          </label>
          <AppAlert v-if="editorError">{{ editorError }}</AppAlert>
          <section v-if="editing.id" class="profile-pdfs profile-pdfs--editor"><h4>PDFs de este perfil</h4><div v-for="cv in editingCvs" :key="cv.id" class="profile-pdfs__item"><span>{{ cv.nombreArchivo || `PDF versión ${cv.version}` }}</span><div class="profile-card-postulante__actions"><AppButton variant="secondary" @click="openDownload(cv.downloadUrl)">Descargar</AppButton><AppButton variant="secondary" :disabled="cv.activo" @click="activateCv(cv.id)">Activar</AppButton><AppButton variant="danger" @click="deleteCv(cv.id)">Eliminar</AppButton></div></div><div class="profile-pdfs__upload"><input type="file" accept=".pdf,application/pdf" @change="onFileChange"><AppButton :loading="uploading" :disabled="!selectedFile" @click="uploadCv">Subir PDF</AppButton><AppButton variant="secondary" @click="manualCvOpen = !manualCvOpen"><Wrench :size="15" /> Crear PDF manual</AppButton></div>
            <section v-if="manualCvOpen" class="profile-manual-cv"><p>Agrega una referencia laboral o personal para poder generar el PDF.</p><label>Perfil profesional<textarea v-model="manualCv.summary" /></label><div class="profile-manual-cv__heading"><b>Experiencia laboral</b><button type="button" @click="addManualEntry('experiences')"><Plus :size="14" /> Agregar</button></div><div v-for="(entry, index) in manualCv.experiences" :key="`experience-${index}`" class="profile-manual-cv__entry"><input v-model="entry.title" placeholder="Cargo | Empresa"><input v-model="entry.from" type="month"><input v-model="entry.to" type="month"><textarea v-model="entry.detail" placeholder="Responsabilidades y logros" /><button type="button" @click="removeEntry('experiences', index)"><Trash2 :size="14" /> Quitar</button></div><div class="profile-manual-cv__heading"><b>Formación académica</b><button type="button" @click="addManualEntry('education')"><Plus :size="14" /> Agregar</button></div><div v-for="(entry, index) in manualCv.education" :key="`education-${index}`" class="profile-manual-cv__entry"><input v-model="entry.title" placeholder="Título | Institución"><input v-model="entry.from" type="month"><input v-model="entry.to" type="month"><textarea v-model="entry.detail" placeholder="Detalle de la formación" /><button type="button" @click="removeEntry('education', index)"><Trash2 :size="14" /> Quitar</button></div><label>Habilidades técnicas<textarea v-model="manualCv.skills" /></label><label>Idiomas<textarea v-model="manualCv.languages" placeholder="Ej: Inglés - Intermedio" /></label><label>Cursos y certificaciones<textarea v-model="manualCv.certifications" /></label><div class="profile-manual-cv__heading"><b>Referencias laborales</b><button type="button" @click="addReference('workReferences')"><Plus :size="14" /> Agregar</button></div><div v-for="(reference, index) in manualCv.workReferences" :key="`work-${index}`" class="profile-manual-cv__entry"><input v-model="reference.name" placeholder="Nombre"><input v-model="reference.role" placeholder="Cargo / relación"><input v-model="reference.phone" placeholder="Teléfono"><input v-model="reference.email" placeholder="Correo"><button type="button" @click="removeReference('workReferences', index)"><Trash2 :size="14" /> Quitar</button></div><div class="profile-manual-cv__heading"><b>Referencias personales</b><button type="button" @click="addReference('personalReferences')"><Plus :size="14" /> Agregar</button></div><div v-for="(reference, index) in manualCv.personalReferences" :key="`personal-${index}`" class="profile-manual-cv__entry"><input v-model="reference.name" placeholder="Nombre"><input v-model="reference.role" placeholder="Relación"><input v-model="reference.phone" placeholder="Teléfono"><input v-model="reference.email" placeholder="Correo"><button type="button" @click="removeReference('personalReferences', index)"><Trash2 :size="14" /> Quitar</button></div><AppButton :loading="uploading" @click="uploadManualCv">Generar y subir PDF</AppButton></section>
          </section>
        </div>
        <footer class="modal__actions"><AppButton variant="secondary" @click="editing = null">Cancelar</AppButton><AppButton :loading="saving" @click="saveProfile">Guardar cambios</AppButton></footer>
      </section>
    </div>
  </PostulanteShell>
</template>

<style scoped>
.job-search-status { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px 24px; padding: 24px; border: 1px solid #dce8df; border-radius: 16px; background: #fff; box-shadow: 0 4px 18px #163c2908; }
.job-search-status__heading { display: flex; align-items: center; gap: 14px; }
.job-search-status__icon { display: grid; place-items: center; flex-shrink: 0; width: 48px; height: 48px; border-radius: 14px; color: #087c42; background: #eaf5ee; }
.job-search-status h2 { margin: 0; font-size: 1.05rem; color: #24352b; }
.job-search-status__heading p { margin: 5px 0 0; font-size: .875rem; color: #087c42; }
.job-search-status--paused { border-color: #e4dcc6; background: #fffdf8; }
.job-search-status--paused .job-search-status__icon { color: #886322; background: #f7eed8; }
.job-search-status--paused .job-search-status__state { color: #886322; }
.job-search-status__control { display: flex; align-items: center; gap: 14px; font-size: .875rem; color: #344b3d; }
.job-search-status__switch { display: flex; align-items: center; flex-shrink: 0; width: 48px; height: 28px; padding: 3px; border: 1px solid #bdcfc3; border-radius: 20px; background: #dce7df; cursor: pointer; }
.job-search-status__switch span { width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #163c2933; transition: transform .18s; }
.job-search-status__switch[aria-checked="true"] { background: #078844; border-color: #078844; }
.job-search-status__switch[aria-checked="true"] span { transform: translateX(20px); }
.job-search-status__switch:focus-visible { outline: 2px solid #078844; outline-offset: 3px; }
.job-search-status__switch:disabled { cursor: wait; opacity: .6; }
.job-search-status__help, .job-search-status__confirmation { grid-column: 1 / -1; margin: 0; font-size: .875rem; line-height: 1.6; color: #64736a; }
.job-search-status__confirmation { color: #087c42; }
.job-search-status > :deep(.app-alert) { grid-column: 1 / -1; }
@media (max-width: 700px) {
  .job-search-status { grid-template-columns: 1fr; padding: 20px; gap: 16px; }
  .job-search-status__control { justify-content: space-between; }
}
@media (prefers-reduced-motion: reduce) {
  .job-search-status__switch span { transition: none; }
}
</style>