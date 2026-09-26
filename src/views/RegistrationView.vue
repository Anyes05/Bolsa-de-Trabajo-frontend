<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Eye, EyeOff, Lightbulb, Paperclip } from 'lucide-vue-next'
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
  const latestJob = form.latestJob.trim()
  const experience = form.experienceDescription.trim()
  if (!latestJob && !experience) {
    return null
  }

  const doc = new jsPDF()
  const createdAt = new Date().toLocaleString('es-UY')
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Curriculum Vitae', 14, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Nombre: ${form.fullName}`, 14, y)
  y += 7
  doc.text(`Email: ${form.email}`, 14, y)
  y += 7
  doc.text(`Teléfono: ${form.phone}`, 14, y)
  y += 7
  doc.text(`Zona: ${form.residenceArea}`, 14, y)
  y += 7
  doc.text(`Perfil: ${form.profileName}`, 14, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Ultimo empleo / empresa actual', 14, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  const latestLines = doc.splitTextToSize(latestJob || 'No informado', 180)
  doc.text(latestLines, 14, y)
  y += latestLines.length * 6 + 4

  doc.setFont('helvetica', 'bold')
  doc.text('Descripción de experiencia', 14, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  const expLines = doc.splitTextToSize(experience || 'No informada', 180)
  doc.text(expLines, 14, y)
  y += expLines.length * 6 + 8

  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(`Generado automáticamente durante el registro el ${createdAt}`, 14, y)

  const blob = doc.output('blob')
  return new File([blob], 'cv-registro.pdf', { type: 'application/pdf' })
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
    const session = await authService.registerApplicant({
      ...form,
      sectors: chosen.value,
    })
    auth.setSession(session)

    // Intento no bloqueante: si falla, el postulante podrá cargar CV luego en Mis Perfiles.
    const filesToUpload = cvFiles.value.length ? cvFiles.value : (() => {
      const generated = buildManualCvFile()
      return generated ? [generated] : []
    })()

    if (filesToUpload.length) {
      for (const file of filesToUpload) {
        try {
          await uploadCvWithRetry(file, form.experienceDescription, session.token)
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
        <p>Para finalizar el registro, puedes adjuntar uno o varios CVs y completar tu experiencia.</p>
        <div class="upload-placeholder">
          <Paperclip :size="22" aria-hidden="true" />
          <div>
            <b>Adjuntar archivo de CV</b>
            <small>PDF, tamaño máximo de 5MB por archivo (hasta 5 CVs).</small>
          </div>
          <label class="upload-placeholder__action" for="cv-file-input">Elegir archivos</label>
          <input
            id="cv-file-input"
            class="upload-placeholder__input"
            type="file"
            multiple
            accept=".pdf,application/pdf"
            @change="onCvFileChange"
          >
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
        <section class="experience-form">
          <h3><BriefcaseBusiness :size="18" aria-hidden="true" /> Completar experiencia manualmente</h3>
          <AppField id="latestJob" label="Último empleo / empresa actual">
            <input id="latestJob" v-model="form.latestJob" placeholder="Ej: Auxiliar administrativo">
          </AppField>
          <AppField id="experienceDescription" label="Descripción de la experiencia">
            <textarea id="experienceDescription" v-model="form.experienceDescription" placeholder="Detalla tareas y logros clave..."></textarea>
          </AppField>
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
