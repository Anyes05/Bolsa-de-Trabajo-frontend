<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Eye, EyeOff, GraduationCap, Lightbulb, Paperclip, Plus, Trash2, Wrench } from 'lucide-vue-next'
import { jsPDF } from 'jspdf'
import AppAlert from '../components/AppAlert.vue'
import BrandLogo from '../components/BrandLogo.vue'
import AppButton from '../components/AppButton.vue'
import AppField from '../components/AppField.vue'
import WizardStepper from '../components/WizardStepper.vue'
import { fallbackSectors, residenceAreas, wizardSteps } from '../data/registration'
import { authService } from '../services/authService'
import { catalogService } from '../services/catalogService'
import { ApiRequestError } from '../services/http'
import { postulanteService } from '../services/postulanteService'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const step = ref(1)
const busy = ref(false)
const error = ref('')
const success = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const sectors = ref<string[]>([...fallbackSectors])
const chosen = ref<string[]>([])
const cvFiles = ref<File[]>([])
const cvMode = ref<'upload' | 'manual' | null>(null)
const fieldErrors = reactive<Record<string, string>>({})
const form = reactive({
  fullName: '',
  identityCard: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  residenceArea: residenceAreas[0],
  profileName: '',
  availability: 'FULL_TIME' as 'FULL_TIME' | 'PART_TIME',
  hasVehicle: false,
  latestJob: '',
  experienceDescription: '',
})

type ManualExperience = {
  company: string
  role: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

type ManualEducation = {
  institution: string
  degree: string
  level: string
  startYear: string
  endYear: string
}

type ManualLanguage = {
  name: string
  level: string
}

type ManualReference = {
  name: string
  role: string
  company: string
  phone: string
  email: string
}

function blankExperience(): ManualExperience {
  return { company: '', role: '', startDate: '', endDate: '', current: false, description: '' }
}

function blankEducation(): ManualEducation {
  return { institution: '', degree: '', level: '', startYear: '', endYear: '' }
}

function blankLanguage(): ManualLanguage {
  return { name: '', level: '' }
}

function blankReference(): ManualReference {
  return { name: '', role: '', company: '', phone: '', email: '' }
}

const manualCv = reactive({
  summary: '',
  experiences: [] as ManualExperience[],
  education: [] as ManualEducation[],
  technicalSkills: '',
  languages: [] as ManualLanguage[],
  certifications: '',
  showCompetencies: false,
  workReferences: [] as ManualReference[],
  personalReferences: [] as ManualReference[],
})

onMounted(async () => {
  try {
    sectors.value = await catalogService.getSectors()
  } catch {
    sectors.value = [...fallbackSectors]
  }
})

function clearFeedback() {
  error.value = ''
  success.value = ''
  Object.keys(fieldErrors).forEach((key) => { fieldErrors[key] = '' })
}

function toggle(sector: string) {
  if (!chosen.value.includes(sector) && chosen.value.length >= 4) {
    error.value = 'Puedes seleccionar un máximo de 4 rubros para este perfil.'
    return
  }
  error.value = ''
  chosen.value = chosen.value.includes(sector)
    ? chosen.value.filter((item) => item !== sector)
    : [...chosen.value, sector]
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function routeByRole(role: string) {
  const normalized = role.trim().toUpperCase()
  if (normalized === 'POSTULANTE') return { name: 'postulante-bolsa-empleo' as const, path: '/postulante/ofertas-empleo' }
  if (normalized === 'SOCIO') return { name: 'socio-bolsa-empleo' as const, path: '/socio/bolsa-empleo' }
  return { name: 'session' as const, path: '/sesion' }
}

function buildManualCvFile() {
  if (!hasManualCvContent()) {
    return null
  }

  const doc = new jsPDF()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = 180
  let y = 20

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 18) {
      doc.addPage()
      y = 20
    }
  }

  const addHeading = (title: string) => {
    ensureSpace(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 112, 62)
    doc.text(title, 14, y)
    doc.setTextColor(0, 0, 0)
    y += 8
  }

  const addParagraph = (value: string) => {
    const lines = doc.splitTextToSize(value, contentWidth)
    ensureSpace(lines.length * 5 + 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 4
  }

  const nonEmptyExperiences = manualCv.experiences.filter((item) => item.company.trim() || item.role.trim() || item.description.trim())
  const nonEmptyEducation = manualCv.education.filter((item) => item.institution.trim() || item.degree.trim())
  const nonEmptyLanguages = manualCv.languages.filter((item) => item.name.trim())
  const nonEmptyWorkReferences = manualCv.workReferences.filter((item) => item.name.trim())
  const nonEmptyPersonalReferences = manualCv.personalReferences.filter((item) => item.name.trim())

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(0, 112, 62)
  doc.text(form.fullName || 'Curriculum Vitae', 14, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`Correo: ${form.email}`, 14, y)
  y += 7
  doc.text(`Teléfono: ${form.phone}`, 14, y)
  y += 7
  doc.text(`Zona: ${form.residenceArea}`, 14, y)
  y += 7
  doc.text(`Perfil: ${form.profileName}`, 14, y)
  y += 10

  if (manualCv.summary.trim()) {
    addHeading('Perfil profesional')
    addParagraph(manualCv.summary.trim())
  }

  if (nonEmptyExperiences.length) {
    addHeading('Experiencia laboral')
    nonEmptyExperiences.forEach((experience) => {
      const period = [experience.startDate, experience.current ? 'Actualidad' : experience.endDate].filter(Boolean).join(' - ')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      ensureSpace(11)
      doc.text([experience.role, experience.company].filter(Boolean).join(' | '), 14, y)
      y += 5
      if (period) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(period, 14, y)
        y += 5
      }
      if (experience.description.trim()) addParagraph(experience.description.trim())
      else y += 3
    })
  }

  if (nonEmptyEducation.length) {
    addHeading('Formación académica')
    nonEmptyEducation.forEach((education) => {
      const period = [education.startYear, education.endYear].filter(Boolean).join(' - ')
      addParagraph([education.degree, education.institution, education.level, period].filter(Boolean).join(' | '))
    })
  }

  if (manualCv.technicalSkills.trim()) {
    addHeading('Habilidades técnicas')
    addParagraph(manualCv.technicalSkills.trim())
  }

  if (nonEmptyLanguages.length) {
    addHeading('Idiomas')
    addParagraph(nonEmptyLanguages.map((language) => [language.name, language.level].filter(Boolean).join(' - ')).join(', '))
  }

  if (manualCv.certifications.trim()) {
    addHeading('Cursos y certificaciones')
    addParagraph(manualCv.certifications.trim())
  }

  if (nonEmptyWorkReferences.length) {
    addHeading('Referencias laborales')
    nonEmptyWorkReferences.forEach((reference) => addParagraph([
      reference.name, reference.role, reference.company, reference.phone, reference.email,
    ].filter(Boolean).join(' | ')))
  }

  if (nonEmptyPersonalReferences.length) {
    addHeading('Referencias personales')
    nonEmptyPersonalReferences.forEach((reference) => addParagraph([
      reference.name, reference.role, reference.phone, reference.email,
    ].filter(Boolean).join(' | ')))
  }

  const blob = doc.output('blob')
  return new File([blob], 'cv-manual.pdf', { type: 'application/pdf' })
}

function hasManualCvContent() {
  return Boolean(
    manualCv.summary.trim()
    || manualCv.technicalSkills.trim()
    || manualCv.certifications.trim()
    || manualCv.experiences.some((item) => item.company.trim() || item.role.trim() || item.description.trim())
    || manualCv.education.some((item) => item.institution.trim() || item.degree.trim())
    || manualCv.languages.some((item) => item.name.trim())
    || manualCv.workReferences.some((item) => item.name.trim())
    || manualCv.personalReferences.some((item) => item.name.trim()),
  )
}

function selectCvMode(mode: 'upload' | 'manual') {
  cvMode.value = mode
  if (mode === 'manual') clearCvFiles()
}

function addExperience() {
  manualCv.experiences.push(blankExperience())
}

function removeExperience(index: number) {
  manualCv.experiences.splice(index, 1)
}

function addEducation() {
  manualCv.education.push(blankEducation())
}

function removeEducation(index: number) {
  manualCv.education.splice(index, 1)
}

function addLanguage() {
  manualCv.languages.push(blankLanguage())
}

function removeLanguage(index: number) {
  manualCv.languages.splice(index, 1)
}

function addWorkReference() {
  manualCv.workReferences.push(blankReference())
}

function removeWorkReference(index: number) {
  manualCv.workReferences.splice(index, 1)
}

function addPersonalReference() {
  manualCv.personalReferences.push(blankReference())
}

function removePersonalReference(index: number) {
  manualCv.personalReferences.splice(index, 1)
}

function hasManualReference() {
  return manualCv.workReferences.some((item) => item.name.trim())
    || manualCv.personalReferences.some((item) => item.name.trim())
}

function manualProfileSummary() {
  const firstExperience = manualCv.experiences.find((item) => item.company.trim() || item.role.trim())
  return {
    latestJob: firstExperience ? [firstExperience.role, firstExperience.company].filter(Boolean).join(' - ') : '',
    experienceDescription: manualCv.summary.trim() || firstExperience?.description.trim() || '',
  }
}

function validateStep(current: number) {
  clearFeedback()
  if (current === 1) {
    if (!form.fullName) fieldErrors.fullName = 'Ingresa tu nombre completo.'
    if (!form.identityCard) fieldErrors.identityCard = 'Ingresa tu cédula.'
    if (!form.phone) fieldErrors.phone = 'Ingresa un teléfono.'
    if (!form.email) fieldErrors.email = 'Ingresa un correo.'
    else if (!isEmail(form.email)) fieldErrors.email = 'El correo no es válido.'
    if (form.password.length < 12) fieldErrors.password = 'La contraseña debe tener al menos 12 caracteres.'
    if (!form.confirmPassword) fieldErrors.confirmPassword = 'Confirma tu contraseña.'
    else if (form.confirmPassword !== form.password) fieldErrors.confirmPassword = 'Las contraseñas no coinciden.'
    if (!form.residenceArea) fieldErrors.residenceArea = 'Selecciona una zona.'
    if (Object.values(fieldErrors).some(Boolean)) {
      error.value = 'Completa los campos obligatorios y verifica la contraseña.'
      return false
    }
  }
  if (current === 2) {
    if (!form.profileName) fieldErrors.profileName = 'Indica un nombre para este perfil.'
    if (!chosen.value.length) {
      error.value = 'Indica un perfil y al menos un rubro.'
      return false
    }
    if (fieldErrors.profileName) {
      error.value = 'Indica un perfil y al menos un rubro.'
      return false
    }
  }
  return true
}

function next() {
  if (!validateStep(step.value)) return
  step.value += 1
}

function previous() {
  clearFeedback()
  if (step.value > 1) step.value -= 1
}

function onCvFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = Array.from(input.files ?? []).filter((file) => file.type === 'application/pdf')
  const existing = new Set(cvFiles.value.map((file) => `${file.name}-${file.size}-${file.lastModified}`))
  const added = selected.filter((file) => !existing.has(`${file.name}-${file.size}-${file.lastModified}`))
  cvFiles.value = [...cvFiles.value, ...added].slice(0, 5)
  input.value = ''
}

function removeCvFile(index: number) {
  cvFiles.value = cvFiles.value.filter((_, currentIndex) => currentIndex !== index)
}

function clearCvFiles() {
  cvFiles.value = []
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function logApiFailure(scope: string, error: unknown, context: Record<string, unknown> = {}) {
  if (error instanceof ApiRequestError) {
    const payload = {
      status: error.status,
      path: error.path,
      payload: error.payload,
      message: error.message,
      context,
    }
    console.error(`[${scope}] API error ${JSON.stringify(payload)}`)
    return
  }
  console.error(`[${scope}] error ${JSON.stringify({ message: error instanceof Error ? error.message : String(error), context })}`)
}

async function uploadCvWithRetry(file: File, resumen: string, authToken: string) {
  try {
    await postulanteService.uploadCv(file, resumen, authToken)
    return
  } catch (firstError) {
    logApiFailure('register-upload-first-attempt', firstError, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      hasAuthToken: Boolean(authToken),
      authTokenLength: authToken?.length ?? 0,
    })
    const message = firstError instanceof Error ? firstError.message : ''
    const isForbidden = /403|forbidden/i.test(message)
    if (!isForbidden) {
      throw firstError
    }

    // En producción vimos 403 esporádico inmediatamente luego de registrar; reintentamos una vez.
    await wait(900)
    try {
      await postulanteService.uploadCv(file, resumen, authToken)
    } catch (retryError) {
      logApiFailure('register-upload-retry', retryError, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        hasAuthToken: Boolean(authToken),
        authTokenLength: authToken?.length ?? 0,
      })
      throw retryError
    }
  }
}

async function complete() {
  busy.value = true
  clearFeedback()
  try {
    if (cvMode.value === 'manual' && !hasManualReference()) {
      error.value = 'Agrega al menos una referencia laboral o personal para crear el CV manual.'
      return
    }
    const manualSummary = cvMode.value === 'manual' ? manualProfileSummary() : null
    const session = await authService.registerApplicant({
      ...form,
      ...(manualSummary ?? {}),
      sectors: chosen.value,
    })
    auth.setSession(session)

    // Intento no bloqueante: si falla, el postulante podrá cargar CV luego en Mis Perfiles.
    const generatedManualCv = cvMode.value === 'manual' ? buildManualCvFile() : null
    const filesToUpload = cvMode.value === 'upload' ? cvFiles.value : generatedManualCv ? [generatedManualCv] : []

    if (filesToUpload.length) {
      for (const file of filesToUpload) {
        try {
          await uploadCvWithRetry(file, manualSummary?.experienceDescription || form.experienceDescription, session.token)
        } catch (uploadError) {
          logApiFailure('register-upload-final', uploadError, {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            hasAuthToken: Boolean(session.token),
            authTokenLength: session.token?.length ?? 0,
          })
        }
      }
    }

    success.value = 'Registro completado. Ingresando...'
    const target = routeByRole(session.role)
    await router.replace({ name: target.name })
    if (window.location.pathname !== target.path) {
      window.location.assign(target.path)
    }
  } catch (exception) {
    logApiFailure('register-submit', exception, {
      email: form.email,
      sectors: chosen.value,
      withFiles: cvFiles.value.length,
      hasStoreToken: Boolean(auth.token),
      storeTokenLength: auth.token?.length ?? 0,
    })
    error.value = exception instanceof Error ? exception.message : 'No fue posible completar el registro.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="registration">
    <header class="registration__header">
      <RouterLink class="registration__brand" to="/" aria-label="Volver al acceso">
        <BrandLogo variant="white" />
      </RouterLink>
      <span class="registration__divider" aria-hidden="true"></span>
      <h1>Registro de Postulante</h1>
      <WizardStepper :steps="wizardSteps" :current="step" />
    </header>

    <form class="registration-card" @submit.prevent="step < 3 ? next() : complete()">
      <section v-if="step === 1" class="registration-card__step" aria-labelledby="step-personal">
        <h2 id="step-personal">Datos Personales</h2>
        <p>Completa la información básica para dar de alta tu ficha de postulante.</p>
        <div class="form-grid">
          <AppField id="fullName" label="Nombre completo" required wide :error="fieldErrors.fullName">
            <input id="fullName" v-model="form.fullName" placeholder="Ingresa tu nombre y apellido" autocomplete="name" :aria-invalid="Boolean(fieldErrors.fullName)">
          </AppField>
          <AppField id="identityCard" label="Cédula de Identidad" required :error="fieldErrors.identityCard">
            <input id="identityCard" v-model="form.identityCard" placeholder="Ej: 4.876.543-2" :aria-invalid="Boolean(fieldErrors.identityCard)">
          </AppField>
          <AppField id="phone" label="Teléfono / Celular" required :error="fieldErrors.phone">
            <input id="phone" v-model="form.phone" placeholder="Ej: 099 123 456" autocomplete="tel" :aria-invalid="Boolean(fieldErrors.phone)">
          </AppField>
          <AppField id="email" label="Gmail / Correo electrónico" required :error="fieldErrors.email">
            <input id="email" v-model="form.email" type="email" placeholder="usuario@gmail.com" autocomplete="email" :aria-invalid="Boolean(fieldErrors.email)">
          </AppField>
          <AppField id="password" label="Escribe una contraseña" required :error="fieldErrors.password">
            <div class="password-field">
              <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Mínimo 12 caracteres" autocomplete="new-password" :aria-invalid="Boolean(fieldErrors.password)">
              <button type="button" class="password-field__toggle" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword">
                <EyeOff v-if="showPassword" :size="14" aria-hidden="true" />
                <Eye v-else :size="14" aria-hidden="true" />
              </button>
            </div>
          </AppField>
          <AppField id="confirmPassword" label="Confirmar contraseña" required :error="fieldErrors.confirmPassword">
            <div class="password-field">
              <input id="confirmPassword" v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="Repite tu contraseña" autocomplete="new-password" :aria-invalid="Boolean(fieldErrors.confirmPassword)">
              <button type="button" class="password-field__toggle" :aria-label="showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'" @click="showConfirmPassword = !showConfirmPassword">
                <EyeOff v-if="showConfirmPassword" :size="14" aria-hidden="true" />
                <Eye v-else :size="14" aria-hidden="true" />
              </button>
            </div>
          </AppField>
          <AppField id="residenceArea" label="Zona de residencia" required wide :error="fieldErrors.residenceArea">
            <select id="residenceArea" v-model="form.residenceArea">
              <option v-for="area in residenceAreas" :key="area" :value="area">{{ area }}</option>
            </select>
          </AppField>
        </div>
      </section>

      <section v-else-if="step === 2" class="registration-card__step" aria-labelledby="step-profile">
        <aside class="registration-card__notice">
          <Lightbulb :size="17" aria-hidden="true" />
          <div>
            <b>Puedes tener varios perfiles laborales</b><br>
            Después podrás crear perfiles adicionales para distintos rubros.
          </div>
        </aside>
        <h2 id="step-profile">Primer Perfil Laboral</h2>
        <p>Configura las bases de tu primera postulación activa.</p>
        <AppField id="profileName" label="Nombre de este perfil" required :error="fieldErrors.profileName">
          <input id="profileName" v-model="form.profileName" placeholder="Ej: Perfil Administración" :aria-invalid="Boolean(fieldErrors.profileName)">
        </AppField>
        <fieldset class="sector-picker">
          <legend>Rubros de interés</legend>
          <button
            v-for="sector in sectors"
            :key="sector"
            type="button"
            class="sector-picker__chip"
            :class="{ 'sector-picker__chip--selected': chosen.includes(sector) }"
            :aria-pressed="chosen.includes(sector)"
            @click="toggle(sector)"
          >
            <Check v-if="chosen.includes(sector)" :size="13" aria-hidden="true" />{{ sector }}
          </button>
        </fieldset>
        <fieldset class="availability">
          <legend>Disponibilidad horaria</legend>
          <button
            type="button"
            class="availability__choice"
            :class="{ 'availability__choice--selected': form.availability === 'FULL_TIME' }"
            :aria-pressed="form.availability === 'FULL_TIME'"
            @click="form.availability = 'FULL_TIME'"
          >
            <b>Full-time</b>
            <small>Más de 30 horas semanales</small>
          </button>
          <button
            type="button"
            class="availability__choice"
            :class="{ 'availability__choice--selected': form.availability === 'PART_TIME' }"
            :aria-pressed="form.availability === 'PART_TIME'"
            @click="form.availability = 'PART_TIME'"
          >
            <b>Part-time</b>
            <small>Menos de 30 horas semanales</small>
          </button>
        </fieldset>
        <label class="registration-card__check">
          <input v-model="form.hasVehicle" type="checkbox"> Tengo vehículo propio habilitado
        </label>
      </section>

      <section v-else class="registration-card__step" aria-labelledby="step-cv">
        <h2 id="step-cv">Curriculum Vitae</h2>
        <p>Elige una modalidad: adjunta un PDF existente o crea uno nuevo con tu información.</p>
        <div class="cv-mode-actions" aria-label="Modalidad de curriculum">
          <button type="button" class="cv-mode-actions__button" :class="{ 'cv-mode-actions__button--active': cvMode === 'upload' }" @click="selectCvMode('upload')">
            <Paperclip :size="17" aria-hidden="true" /> Adjuntar CV
          </button>
          <button type="button" class="cv-mode-actions__button" :class="{ 'cv-mode-actions__button--active': cvMode === 'manual' }" @click="selectCvMode('manual')">
            <Wrench :size="17" aria-hidden="true" /> Crear CV manualmente
          </button>
        </div>

        <section v-if="cvMode === 'upload'" class="cv-option-panel" aria-labelledby="attach-cv-title">
          <h3 id="attach-cv-title"><Paperclip :size="18" aria-hidden="true" /> Adjuntar archivo de CV</h3>
          <div class="upload-placeholder">
            <div><small>PDF, tamaño máximo de 5MB por archivo (hasta 5 CVs).</small></div>
            <label class="upload-placeholder__action" for="cv-file-input">Elegir archivos</label>
            <input id="cv-file-input" class="upload-placeholder__input" type="file" multiple accept=".pdf,application/pdf" @change="onCvFileChange">
          </div>
          <div v-if="cvFiles.length" class="upload-files">
            <div class="upload-files__header">
              <strong>Archivos seleccionados ({{ cvFiles.length }})</strong>
              <button type="button" class="upload-files__clear" @click="clearCvFiles">Quitar todos</button>
            </div>
            <ul class="upload-files__list">
              <li v-for="(file, index) in cvFiles" :key="`${file.name}-${index}`" class="upload-files__item">
                <span>{{ file.name }}</span>
                <button type="button" class="upload-files__remove" @click="removeCvFile(index)">Quitar</button>
              </li>
            </ul>
          </div>
        </section>

        <section v-else-if="cvMode === 'manual'" class="experience-form" aria-labelledby="manual-cv-title">
          <h3 id="manual-cv-title"><BriefcaseBusiness :size="18" aria-hidden="true" /> Crear CV manualmente</h3>
          <p class="experience-form__intro">Al completar el registro se generará un PDF y se guardará como tu CV activo.</p>
          <AppField id="manualSummary" label="Perfil profesional">
            <textarea id="manualSummary" v-model="manualCv.summary" placeholder="Resume tu experiencia, fortalezas y objetivo laboral..."></textarea>
          </AppField>

          <section class="manual-cv-section">
            <div class="manual-cv-section__heading"><h4>Experiencia laboral</h4><button type="button" @click="addExperience"><Plus :size="14" /> Agregar experiencia</button></div>
            <article v-for="(experience, index) in manualCv.experiences" :key="index" class="manual-cv-entry">
              <div class="manual-cv-entry__grid">
                <label>Cargo<input v-model="experience.role" placeholder="Ej: Auxiliar administrativo"></label>
                <label>Empresa<input v-model="experience.company" placeholder="Ej: Empresa Ejemplo"></label>
                <label>Desde<input v-model="experience.startDate" type="month"></label>
                <label>Hasta<input v-model="experience.endDate" type="month" :disabled="experience.current"></label>
              </div>
              <label class="manual-cv-entry__check"><input v-model="experience.current" type="checkbox"> Trabajo actual</label>
              <label>Responsabilidades y logros<textarea v-model="experience.description" placeholder="Describe tareas, herramientas usadas y logros..."></textarea></label>
              <button v-if="manualCv.experiences.length > 1" type="button" class="manual-cv-entry__remove" @click="removeExperience(index)"><Trash2 :size="13" /> Quitar</button>
            </article>
          </section>

          <section class="manual-cv-section">
            <div class="manual-cv-section__heading"><h4>Formación académica</h4><button type="button" @click="addEducation"><Plus :size="14" /> Agregar formación</button></div>
            <article v-for="(education, index) in manualCv.education" :key="index" class="manual-cv-entry">
              <div class="manual-cv-entry__grid">
                <label>Institución<input v-model="education.institution" placeholder="Ej: UTU"></label>
                <label>Título o carrera<input v-model="education.degree" placeholder="Ej: Técnico en administración"></label>
                <label>Nivel<select v-model="education.level"><option value="">Seleccionar</option><option>Secundaria</option><option>Técnico</option><option>Terciario</option><option>Universitario</option><option>Curso</option></select></label>
                <label>Desde<input v-model="education.startYear" type="month"></label>
                <label>Hasta<input v-model="education.endYear" type="month"></label>
              </div>
              <button v-if="manualCv.education.length > 1" type="button" class="manual-cv-entry__remove" @click="removeEducation(index)"><Trash2 :size="13" /> Quitar</button>
            </article>
          </section>

          <section class="manual-cv-section">
            <div class="manual-cv-section__heading"><h4><GraduationCap :size="15" aria-hidden="true" /> Competencias</h4><button v-if="!manualCv.showCompetencies" type="button" @click="manualCv.showCompetencies = true"><Plus :size="14" /> Agregar competencias</button></div>
            <template v-if="manualCv.showCompetencies">
              <label>Habilidades técnicas<textarea v-model="manualCv.technicalSkills" placeholder="Ej: Excel, facturación, caja, atención al cliente, AutoCAD..."></textarea></label>
              <label>Cursos y certificaciones<textarea v-model="manualCv.certifications" placeholder="Indica cursos, certificaciones o capacitaciones relevantes..."></textarea></label>
            </template>
            <div class="manual-cv-section__heading"><h4>Idiomas</h4><button type="button" @click="addLanguage"><Plus :size="14" /> Agregar idioma</button></div>
            <div v-for="(language, index) in manualCv.languages" :key="index" class="manual-cv-language">
              <input v-model="language.name" placeholder="Idioma">
              <select v-model="language.level"><option value="">Nivel</option><option>Básico</option><option>Intermedio</option><option>Avanzado</option><option>Nativo</option></select>
              <button v-if="manualCv.languages.length > 1" type="button" aria-label="Quitar idioma" @click="removeLanguage(index)"><Trash2 :size="14" /></button>
            </div>
          </section>

          <section class="manual-cv-section">
            <div class="manual-cv-section__heading"><h4>Referencias laborales</h4><button type="button" @click="addWorkReference"><Plus :size="14" /> Agregar referencia</button></div>
            <article v-for="(reference, index) in manualCv.workReferences" :key="index" class="manual-cv-entry">
              <div class="manual-cv-entry__grid">
                <label>Nombre<input v-model="reference.name" placeholder="Nombre completo"></label>
                <label>Cargo<input v-model="reference.role" placeholder="Ej: Supervisor"></label>
                <label>Empresa<input v-model="reference.company" placeholder="Empresa"></label>
                <label>Teléfono<input v-model="reference.phone" type="tel" placeholder="099 123 456"></label>
              </div>
              <label>Correo electrónico<input v-model="reference.email" type="email" placeholder="referencia@correo.com"></label>
              <button type="button" class="manual-cv-entry__remove" @click="removeWorkReference(index)"><Trash2 :size="13" /> Quitar</button>
            </article>
          </section>

          <section class="manual-cv-section">
            <div class="manual-cv-section__heading"><h4>Referencias personales</h4><button type="button" @click="addPersonalReference"><Plus :size="14" /> Agregar referencia</button></div>
            <article v-for="(reference, index) in manualCv.personalReferences" :key="index" class="manual-cv-entry">
              <div class="manual-cv-entry__grid">
                <label>Nombre<input v-model="reference.name" placeholder="Nombre completo"></label>
                <label>Relación o profesión<input v-model="reference.role" placeholder="Ej: Excompañero/a"></label>
                <label>Teléfono<input v-model="reference.phone" type="tel" placeholder="099 123 456"></label>
                <label>Correo electrónico<input v-model="reference.email" type="email" placeholder="referencia@correo.com"></label>
              </div>
              <button type="button" class="manual-cv-entry__remove" @click="removePersonalReference(index)"><Trash2 :size="13" /> Quitar</button>
            </article>
          </section>
        </section>
      </section>

      <AppAlert v-if="error">{{ error }}</AppAlert>
      <AppAlert v-if="success" tone="success">{{ success }}</AppAlert>

      <footer class="registration-card__actions">
        <AppButton v-if="step > 1" variant="secondary" @click="previous">
          <ArrowLeft :size="14" aria-hidden="true" /> Anterior
        </AppButton>
        <span v-else></span>
        <AppButton v-if="step < 3" type="submit">
          Continuar <ArrowRight :size="15" aria-hidden="true" />
        </AppButton>
        <AppButton v-else type="submit" :loading="busy">
          {{ busy ? 'Registrando...' : 'Completar Registro' }}
          <Check :size="15" aria-hidden="true" />
        </AppButton>
      </footer>
    </form>
  </main>
</template>
