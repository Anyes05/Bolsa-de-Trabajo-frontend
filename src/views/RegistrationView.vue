<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Lightbulb, Paperclip } from 'lucide-vue-next'
import AppAlert from '../components/AppAlert.vue'
import BrandLogo from '../components/BrandLogo.vue'
import AppButton from '../components/AppButton.vue'
import AppField from '../components/AppField.vue'
import WizardStepper from '../components/WizardStepper.vue'
import { fallbackSectors, residenceAreas, wizardSteps } from '../data/registration'
import { authService } from '../services/authService'
import { catalogService } from '../services/catalogService'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const step = ref(1)
const busy = ref(false)
const error = ref('')
const success = ref('')
const sectors = ref<string[]>([...fallbackSectors])
const chosen = ref<string[]>([])
const fieldErrors = reactive<Record<string, string>>({})
const form = reactive({
  fullName: '',
  identityCard: '',
  phone: '',
  email: '',
  password: '',
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

function validateStep(current: number) {
  clearFeedback()
  if (current === 1) {
    if (!form.fullName) fieldErrors.fullName = 'Ingresa tu nombre completo.'
    if (!form.identityCard) fieldErrors.identityCard = 'Ingresa tu cedula.'
    if (!form.phone) fieldErrors.phone = 'Ingresa un telefono.'
    if (!form.email) fieldErrors.email = 'Ingresa un correo.'
    else if (!isEmail(form.email)) fieldErrors.email = 'El correo no es valido.'
    if (form.password.length < 12) fieldErrors.password = 'La contrasena debe tener al menos 12 caracteres.'
    if (!form.residenceArea) fieldErrors.residenceArea = 'Selecciona una zona.'
    if (Object.values(fieldErrors).some(Boolean)) {
      error.value = 'Completa los campos obligatorios. La contrasena debe tener al menos 12 caracteres.'
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

async function complete() {
  busy.value = true
  clearFeedback()
  try {
    const session = await authService.registerApplicant({
      ...form,
      sectors: chosen.value,
    })
    auth.setSession(session)
    success.value = 'Registro completado. Ingresando...'
    await router.push({ name: 'session' })
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
            <input id="password" v-model="form.password" type="password" placeholder="Minimo 12 caracteres" autocomplete="new-password" :aria-invalid="Boolean(fieldErrors.password)">
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
        <p>Completa tu experiencia laboral. La carga de archivos estara disponible con S3.</p>
        <div class="upload-placeholder">
          <Paperclip :size="22" aria-hidden="true" />
          <div>
            <b>Adjuntar archivo de CV</b>
            <small>PDF o Word, tamaño maximo de 5MB</small>
          </div>
          <button type="button" disabled>Proximamente</button>
        </div>
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
