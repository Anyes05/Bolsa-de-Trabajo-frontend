<script setup lang="ts">
import { ArrowLeft, Mail } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import PasswordInput from '../../components/PasswordInput.vue'
import { LOCALIDADES_SAN_JOSE } from '../../data/localidades'
import { socioService } from '../../services/socioService'
import type { RubroOption, SocioRecord, TipoIdentificadorSocio } from '../../services/types'

const router = useRouter()
const rubros = ref<RubroOption[]>([])
const error = ref('')
const busy = ref(false)
const createdSocio = ref<SocioRecord | null>(null)
const mailBusy = ref(false)
const mailSent = ref('')
const mailError = ref('')
const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  tipoIdentificador: 'BPS' as TipoIdentificadorSocio,
  identificador: '',
  email: '',
  razonSocial: '',
  rut: '',
  telefono: '',
  emailContacto: '',
  fechaAlta: today,
  fechaAniversario: '',
  esDirectivo: false,
  calle: '',
  numero: '',
  localidad: '',
  rubroId: '',
})

const identificadorLabel = computed(() => (
  form.tipoIdentificador === 'CEDULA' ? 'Número de cédula' : 'Número de BPS'
))

onMounted(async () => {
  try {
    rubros.value = await socioService.getRubros()
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible cargar los rubros.'
  }
})

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toIsoDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const localized = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (localized) return `${localized[3]}-${localized[2]}-${localized[1]}`
  return trimmed
}

function onTipoChange() {
  form.identificador = ''
}

async function submit() {
  const identificador = form.identificador.replace(/\D/g, '')
  if (!identificador) {
    error.value = form.tipoIdentificador === 'CEDULA'
      ? 'Ingresa el número de cédula.'
      : 'Ingresa el número de BPS.'
    return
  }
  if (form.tipoIdentificador === 'BPS' && identificador.length < 9) {
    error.value = 'El número de BPS debe tener al menos 9 dígitos.'
    return
  }
  const rutOCedula = form.rut.replace(/\D/g, '')
  if (rutOCedula.length !== 12 && rutOCedula.length !== 8) {
    error.value = 'Ingresa un RUT (12 dígitos) o una cédula (8 dígitos).'
    return
  }
  if (!form.telefono.trim()) {
    error.value = 'Ingresa el teléfono del socio.'
    return
  }
  if (!form.fechaAniversario) {
    error.value = 'Indica la fecha de aniversario.'
    return
  }
  if (!form.localidad) {
    error.value = 'Selecciona la localidad.'
    return
  }
  if (!form.rubroId) {
    error.value = 'Selecciona un rubro.'
    return
  }
  if (!form.fechaAlta) {
    error.value = 'Indica la fecha de alta en el CCISJ.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    createdSocio.value = await socioService.createSocio({
      tipoIdentificador: form.tipoIdentificador,
      identificador,
      email: form.email.trim(),
      razonSocial: form.razonSocial.trim(),
      rut: form.rut.replace(/\D/g, ''),
      telefono: emptyToNull(form.telefono),
      emailContacto: emptyToNull(form.emailContacto),
      calle: form.calle.trim(),
      numero: emptyToNull(form.numero),
      localidad: form.localidad.trim(),
      rubroId: Number(form.rubroId),
      esDirectivo: form.esDirectivo,
      fechaAlta: toIsoDate(form.fechaAlta),
      fechaAniversario: toIsoDate(form.fechaAniversario),
    })
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible crear el socio.'
  } finally {
    busy.value = false
  }
}

async function sendCredentialsMail() {
  if (!createdSocio.value) return
  mailBusy.value = true
  mailError.value = ''
  try {
    const result = await socioService.enviarCredenciales(createdSocio.value.id)
    createdSocio.value = { ...createdSocio.value, passwordProvisional: result.passwordProvisional }
    mailSent.value = `Mail enviado a ${result.destinatario} con las credenciales y el aviso de 24 horas.`
  } catch (exception) {
    mailError.value = exception instanceof Error ? exception.message : 'No fue posible enviar el mail al socio.'
  } finally {
    mailBusy.value = false
  }
}
</script>

<template>
  <AdminShell active="socios" title="Nuevo Socio" subtitle="Registrar nueva firma en el padrón social">
    <template #header-actions>
      <RouterLink class="admin-back-button" to="/admin/socios">
        <ArrowLeft :size="15" /> Volver
      </RouterLink>
    </template>
    <section v-if="createdSocio" class="new-company-card">
      <header class="new-company-card__header">
        <h2>Socio creado correctamente</h2>
        <p>Comunícale esta clave provisional a <strong>{{ createdSocio.razonSocial }}</strong>. Deberá cambiarla en las primeras 24 horas al ingresar. No se podrá volver a ver.</p>
      </header>
      <div class="new-company-form">
        <label class="new-company-form__wide">Clave provisional generada
          <PasswordInput :model-value="createdSocio.passwordProvisional ?? ''" readonly autocomplete="off" />
          <small>Se generó automáticamente a partir de la razón social.</small>
        </label>
        <p class="new-company-form__wide">
          Podés enviarle las credenciales por mail a <strong>{{ createdSocio.emailUsuario || createdSocio.emailContacto || 'su correo registrado' }}</strong>
          (usuario de acceso y clave provisional, con el aviso de las 24 horas). Al enviarlo se genera una clave nueva y el plazo de 24 horas corre desde ese momento.
        </p>
        <AppAlert v-if="mailError">{{ mailError }}</AppAlert>
        <p v-if="mailSent" class="socio-profile__hint">{{ mailSent }}</p>
        <footer class="new-company-form__footer">
          <button class="new-company-cancel" type="button" @click="router.push({ name: 'admin-socios' })">Ir al listado sin enviar</button>
          <button class="new-company-submit" type="button" :disabled="mailBusy" @click="sendCredentialsMail">
            <Mail :size="15" aria-hidden="true" />
            {{ mailBusy ? 'Enviando...' : (mailSent ? 'Reenviar mail al socio' : 'Mandar mail al socio') }}
          </button>
        </footer>
      </div>
    </section>
    <section v-else class="new-company-card">
      <header class="new-company-card__header">
        <h2>Ficha del Socio</h2>
        <p>Registra al socio con BPS o cédula (una sola opción, es su usuario de ingreso). El RUT o la cédula fiscal se carga aparte. Elige también la fecha de alta en el CCISJ. La clave provisional se genera automáticamente.</p>
      </header>
      <form class="new-company-form" @submit.prevent="submit">
        <label>Registrar con *
          <select v-model="form.tipoIdentificador" class="new-company-select" required @change="onTipoChange">
            <option value="BPS">Número de BPS</option>
            <option value="CEDULA">Número de cédula</option>
          </select>
        </label>
        <label>{{ identificadorLabel }} *
          <input
            v-model="form.identificador"
            inputmode="numeric"
            required
            :placeholder="form.tipoIdentificador === 'CEDULA' ? '12345678' : '123456789'"
          >
          <small v-if="form.tipoIdentificador === 'BPS'">El socio ingresará al sistema con este número (mínimo 9 dígitos). No puede tener BPS y cédula a la vez.</small>
          <small v-else>El socio ingresará al sistema con este mismo número. No puede tener BPS y cédula a la vez.</small>
        </label>
        <label>Fecha de alta en el CCISJ *
          <input v-model="form.fechaAlta" type="date" required>
        </label>
        <label>Email de cuenta *
          <input v-model="form.email" type="email" required placeholder="cuenta@empresa.com">
          <small>Con este correo se registra el usuario en el sistema.</small>
        </label>
        <label class="new-company-form__wide">Razón social *
          <input v-model="form.razonSocial" required>
        </label>
        <label>RUT o cédula *
          <input v-model="form.rut" inputmode="numeric" required placeholder="RUT (12 dígitos) o cédula (8 dígitos)">
          <small>Si no tiene RUT, ingresa la cédula. Distinto del BPS/cédula de ingreso al sistema.</small>
        </label>
        <label>Teléfono *
          <input v-model="form.telefono" required>
        </label>
        <label>Email de contacto
          <input v-model="form.emailContacto" type="email" placeholder="contacto@empresa.com">
          <small>Con este correo se contacta a la firma. Puede coincidir con el de cuenta.</small>
        </label>
        <label>Fecha de aniversario *
          <input v-model="form.fechaAniversario" type="date" required>
        </label>
        <label>Rubro *
          <select v-model="form.rubroId" class="new-company-select" required>
            <option value="" disabled>Seleccionar rubro</option>
            <option v-for="rubro in rubros" :key="rubro.id" :value="String(rubro.id)">{{ rubro.nombreRubro }}</option>
          </select>
        </label>
        <label>Calle *
          <input v-model="form.calle" required>
        </label>
        <label>Nro puerta
          <input v-model="form.numero">
        </label>
        <label class="new-company-form__wide">Localidad / Zona *
          <select v-model="form.localidad" class="new-company-select" required>
            <option value="" disabled>Seleccionar localidad</option>
            <option v-for="localidad in LOCALIDADES_SAN_JOSE" :key="localidad" :value="localidad">{{ localidad }}</option>
          </select>
        </label>
        <label class="new-company-check">
          <input v-model="form.esDirectivo" type="checkbox">
          Es directivo
        </label>
        <AppAlert v-if="error">{{ error }}</AppAlert>
        <footer class="new-company-form__footer">
          <RouterLink class="new-company-cancel" to="/admin/socios">Cancelar</RouterLink>
          <button class="new-company-submit" type="submit" :disabled="busy">
            {{ busy ? 'Creando...' : 'Crear Socio' }}
          </button>
        </footer>
      </form>
    </section>
  </AdminShell>
</template>

<style scoped>
.new-company-submit {
  gap: 7px;
}
</style>
