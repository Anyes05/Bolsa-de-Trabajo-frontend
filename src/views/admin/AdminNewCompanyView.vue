<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import { socioService } from '../../services/socioService'
import type { RubroOption, TipoIdentificadorSocio } from '../../services/types'

const router = useRouter()
const rubros = ref<RubroOption[]>([])
const error = ref('')
const busy = ref(false)
const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  tipoIdentificador: 'BPS' as TipoIdentificadorSocio,
  identificador: '',
  email: '',
  password: '',
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
  form.tipoIdentificador === 'CEDULA' ? 'Número de cédula' : 'Número de RUT'
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
      : 'Ingresa el número de RUT.'
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
  if (form.password.length < 12) {
    error.value = 'La contraseña debe tener al menos 12 caracteres.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await socioService.createSocio({
      tipoIdentificador: form.tipoIdentificador,
      identificador,
      email: form.email.trim(),
      password: form.password,
      razonSocial: form.razonSocial.trim(),
      rut: form.rut.trim(),
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
    await router.push({ name: 'admin-socios' })
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible crear el socio.'
  } finally {
    busy.value = false
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
    <section class="new-company-card">
      <header class="new-company-card__header">
        <h2>Ficha del Socio</h2>
        <p>Registra al socio con RUT o cédula (una sola opción). Elige también la fecha de alta en el CCISJ.</p>
      </header>
      <form class="new-company-form" @submit.prevent="submit">
        <label>Registrar con *
          <select v-model="form.tipoIdentificador" class="new-company-select" required @change="onTipoChange">
            <option value="BPS">Número de RUT</option>
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
          <small>El socio ingresará al sistema con este mismo número. No puede tener RUT y cédula a la vez.</small>
        </label>
        <label>Fecha de alta en el CCISJ *
          <input v-model="form.fechaAlta" type="date" required>
        </label>
        <label>Email de cuenta *
          <input v-model="form.email" type="email" required placeholder="cuenta@empresa.com">
          <small>Con este correo se registra el usuario en el sistema.</small>
        </label>
        <label class="new-company-form__wide">Contraseña provisional *
          <input v-model="form.password" type="password" required minlength="12" placeholder="Mínimo 12 caracteres">
          <small>El socio deberá cambiarla en las primeras 24 horas al ingresar.</small>
        </label>
        <label class="new-company-form__wide">Razón social *
          <input v-model="form.razonSocial" required>
        </label>
        <label>RUT *
          <input v-model="form.rut" required>
        </label>
        <label>Teléfono
          <input v-model="form.telefono">
        </label>
        <label>Email de contacto
          <input v-model="form.emailContacto" type="email" placeholder="contacto@empresa.com">
          <small>Con este correo se contacta a la firma. Puede coincidir con el de cuenta.</small>
        </label>
        <label>Fecha de aniversario
          <input v-model="form.fechaAniversario" type="date">
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
        <label class="new-company-form__wide">Ciudad / Localidad *
          <input v-model="form.localidad" required>
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
