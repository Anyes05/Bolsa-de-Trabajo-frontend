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
const cvFile = ref<File | null>(null)
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
  if (normalized === 'POSTULANTE') return { name: 'postulante-bolsa-empleo' as const }
  if (normalized === 'SOCIO') return { name: 'socio-bolsa-empleo' as const }
  return { name: 'session' as const }
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
  doc.text(`Telefono: ${form.phone}`, 14, y)
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
  doc.text('Descripcion de experiencia', 14, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  const expLines = doc.splitTextToSize(experience || 'No informada', 180)
  doc.text(expLines, 14, y)
  y += expLines.length * 6 + 8

  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(`Generado automaticamente durante el registro el ${createdAt}`, 14, y)

  const blob = doc.output('blob')
  return new File([blob], 'cv-registro.pdf', { type: 'application/pdf' })
}

function validateStep(current: number) {
  clearFeedback()
  if (current === 1) {
    if (!form.fullName) fieldErrors.fullName = 'Ingresa tu nombre completo.'
    if (!form.identityCard) fieldErrors.identityCard = 'Ingresa tu cedula.'
    if (!form.phone) fieldErrors.phone = 'Ingresa un telefono.'
    if (!form.email) fieldErrors.email = 'Ingresa un correo.'
    else if (!isEmail(form.email)) fieldErrors.email = 'El correo no es valido.'
    if (form.password.length < 12) fieldErrors.password = 'La contrasena debe tener al menos 12 caracteres.'
    if (!form.confirmPassword) fieldErrors.confirmPassword = 'Confirma tu contrasena.'
    else if (form.confirmPassword !== form.password) fieldErrors.confirmPassword = 'Las contrasenas no coinciden.'
    if (!form.residenceArea) fieldErrors.residenceArea = 'Selecciona una zona.'
    if (Object.values(fieldErrors).some(Boolean)) {
      error.value = 'Completa los campos obligatorios y verifica la contrasena.'
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
  cvFile.value = input.files?.[0] ?? null
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
    const fileToUpload = cvFile.value ?? buildManualCvFile()
    if (fileToUpload) {
      try {
        await postulanteService.uploadCv(fileToUpload, form.experienceDescription)
      } catch (uploadError) {
        console.warn('No se pudo adjuntar CV en registro inicial', uploadError)
      }
    }

    success.value = 'Registro completado. Ingresando...'
    await router.replace(routeByRole(session.role))
  } catch (exception) {
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
        <p>Completa la informacion basica para dar de alta tu ficha de postulante.</p>
        <div class="form-grid">
          <AppField id="fullName" label="Nombre completo" required wide :error="fieldErrors.fullName">
            <input id="fullName" v-model="form.fullName" placeholder="Ingresa tu nombre y apellido" autocomplete="name" :aria-invalid="Boolean(fieldErrors.fullName)">
          </AppField>
          <AppField id="identityCard" label="Cedula de Identidad" required :error="fieldErrors.identityCard">
            <input id="identityCard" v-model="form.identityCard" placeholder="Ej: 4.876.543-2" :aria-invalid="Boolean(fieldErrors.identityCard)">
          </AppField>
          <AppField id="phone" label="Telefono / Celular" required :error="fieldErrors.phone">
            <input id="phone" v-model="form.phone" placeholder="Ej: 099 123 456" autocomplete="tel" :aria-invalid="Boolean(fieldErrors.phone)">
          </AppField>
          <AppField id="email" label="Gmail / Correo electronico" required :error="fieldErrors.email">
            <input id="email" v-model="form.email" type="email" placeholder="usuario@gmail.com" autocomplete="email" :aria-invalid="Boolean(fieldErrors.email)">
          </AppField>
          <AppField id="password" label="Escribi una contrasena" required :error="fieldErrors.password">
            <div class="password-field">
              <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Minimo 12 caracteres" autocomplete="new-password" :aria-invalid="Boolean(fieldErrors.password)">
              <button type="button" class="password-field__toggle" :aria-label="showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'" @click="showPassword = !showPassword">
                <EyeOff v-if="showPassword" :size="14" aria-hidden="true" />
                <Eye v-else :size="14" aria-hidden="true" />
              </button>
            </div>
          </AppField>
          <AppField id="confirmPassword" label="Confirmar contrasena" required :error="fieldErrors.confirmPassword">
            <div class="password-field">
              <input id="confirmPassword" v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="Repite tu contrasena" autocomplete="new-password" :aria-invalid="Boolean(fieldErrors.confirmPassword)">
              <button type="button" class="password-field__toggle" :aria-label="showConfirmPassword ? 'Ocultar confirmacion de contrasena' : 'Mostrar confirmacion de contrasena'" @click="showConfirmPassword = !showConfirmPassword">
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
            <b>Podes tener varios perfiles laborales</b><br>
            Despues podras crear perfiles adicionales para distintos rubros.
          </div>
        </aside>
        <h2 id="step-profile">Primer Perfil Laboral</h2>
        <p>Configura las bases de tu primera postulacion activa.</p>
        <AppField id="profileName" label="Nombre de este perfil" required :error="fieldErrors.profileName">
          <input id="profileName" v-model="form.profileName" placeholder="Ej: Perfil Administracion" :aria-invalid="Boolean(fieldErrors.profileName)">
        </AppField>
        <fieldset class="sector-picker">
          <legend>Rubros de interes</legend>
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
            <small>Mas de 30 horas semanales</small>
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
          <input v-model="form.hasVehicle" type="checkbox"> Tengo vehiculo propio habilitado
        </label>
      </section>

      <section v-else class="registration-card__step" aria-labelledby="step-cv">
        <h2 id="step-cv">Curriculum Vitae</h2>
        <p>Para finalizar el registro, podes adjuntar tu CV digital y completar tu experiencia.</p>
        <div class="upload-placeholder">
          <Paperclip :size="22" aria-hidden="true" />
          <div>
            <b>Adjuntar archivo de CV</b>
            <small>PDF o DOCX, tamaño maximo de 5MB.</small>
          </div>
          <label class="upload-placeholder__action" for="cv-file-input">Subir archivo</label>
          <input
            id="cv-file-input"
            class="upload-placeholder__input"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="onCvFileChange"
          >
        </div>
        <p v-if="cvFile" class="upload-placeholder__filename">Archivo seleccionado: {{ cvFile.name }}</p>
        <section class="experience-form">
          <h3><BriefcaseBusiness :size="18" aria-hidden="true" /> Completar experiencia manualmente</h3>
          <AppField id="latestJob" label="Ultimo empleo / empresa actual">
            <input id="latestJob" v-model="form.latestJob" placeholder="Ej: Auxiliar administrativo">
          </AppField>
          <AppField id="experienceDescription" label="Descripcion de la experiencia">
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
