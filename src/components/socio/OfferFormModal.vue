<script setup lang="ts">
import { onMounted, onUnmounted, reactive, watch } from 'vue'
import { X } from 'lucide-vue-next'
import AppButton from '../AppButton.vue'
import type { ActiveSocioOption, Availability, ContractType, JobOffer, JobOfferPayload } from '../../services/types'

const props = defineProps<{
  mode: 'create' | 'edit'
  offer: JobOffer | null
  adminMode?: boolean
  sectors: Array<{ id: number; nombreRubro: string }>
  socios?: ActiveSocioOption[]
}>()

const emit = defineEmits<{ close: []; save: [offer: JobOfferPayload] }>()

const form = reactive({
  socioId: null as number | null,
  rubroId: 0,
  titulo: '',
  cargo: '',
  descripcion: '',
  requisitos: '',
  zona: '',
  salario: '',
  tipoContrato: '' as ContractType | '',
  disponibilidadHoraria: 'FULL_TIME' as Availability,
  vacantes: 1,
  fechaCierre: '',
  fechaModo: 'INDEFINIDA' as 'INDEFINIDA' | 'FECHA',
  mostrarNombreEmpresa: true,
})

watch(() => props.offer, (offer) => {
  Object.assign(form, {
    socioId: offer?.socioId ?? props.socios?.[0]?.id ?? null,
    rubroId: offer?.rubroId ?? 0,
    titulo: offer?.titulo ?? '',
    cargo: offer?.cargo ?? '',
    descripcion: offer?.descripcion ?? '',
    requisitos: offer?.requisitos ?? '',
    zona: offer?.zona ?? '',
    salario: offer?.salario ?? '',
    tipoContrato: offer?.tipoContrato ?? '',
    disponibilidadHoraria: offer?.disponibilidadHoraria ?? 'FULL_TIME',
    vacantes: offer?.vacantes ?? 1,
    fechaCierre: offer?.fechaCierre ?? '',
    fechaModo: offer?.fechaCierre ? 'FECHA' : 'INDEFINIDA',
    mostrarNombreEmpresa: offer?.mostrarNombreEmpresa ?? true,
  })
}, { immediate: true })

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function submit() {
  emit('save', {
    socioId: props.adminMode ? form.socioId : undefined,
    rubroId: form.rubroId,
    titulo: form.titulo.trim(),
    cargo: form.cargo.trim() || null,
    descripcion: form.descripcion.trim(),
    requisitos: form.requisitos.trim() || null,
    zona: form.zona.trim() || null,
    salario: form.salario.trim() || null,
    tipoContrato: form.tipoContrato || null,
    disponibilidadHoraria: form.disponibilidadHoraria,
    vacantes: form.vacantes,
    fechaCierre: form.fechaModo === 'FECHA' ? form.fechaCierre : null,
    mostrarNombreEmpresa: form.mostrarNombreEmpresa,
  })
}
</script>

<template>
  <div class="offer-form-modal" role="dialog" aria-modal="true" aria-labelledby="offer-form-title">
    <div class="offer-form-modal__backdrop" @click="emit('close')"></div>
    <section class="offer-form-modal__panel">
      <header class="offer-form-modal__header">
        <h2 id="offer-form-title" class="offer-form-modal__header-heading">{{ mode === 'edit' ? 'Editar oferta laboral' : 'Publicar oferta laboral' }}</h2>
        <button type="button" class="offer-form-modal__close" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button>
      </header>
      <form class="offer-form" @submit.prevent="submit">
        <label v-if="adminMode" class="offer-form__wide offer-form__label">Socio titular *
          <select v-model="form.socioId" class="offer-form__select" required>
            <option :value="null" disabled>Seleccionar socio</option>
            <option v-for="socio in socios" :key="socio.id" :value="socio.id">{{ socio.razonSocial }}</option>
          </select>
        </label>
        <label class="offer-form__wide offer-form__label">Título del puesto *<input v-model="form.titulo" class="offer-form__input" maxlength="180" required></label>
        <label class="offer-form__label">Cargo<input v-model="form.cargo" class="offer-form__input" maxlength="120"></label>
        <label class="offer-form__label">Rubro *<select v-model.number="form.rubroId" class="offer-form__select" required><option :value="0" disabled>Seleccionar...</option><option v-for="sector in sectors" :key="sector.id" :value="sector.id">{{ sector.nombreRubro }}</option></select></label>
        <label class="offer-form__label">Zona<input v-model="form.zona" class="offer-form__input" maxlength="120"></label>
        <label class="offer-form__label">Modalidad<select v-model="form.disponibilidadHoraria" class="offer-form__select"><option value="FULL_TIME">Tiempo completo</option><option value="PART_TIME">Part-time</option><option value="INDEFINIDO">Cualquier horario</option></select></label>
        <label class="offer-form__label">Tipo de contrato<select v-model="form.tipoContrato" class="offer-form__select"><option value="">No especificado</option><option value="EFECTIVO">Efectivo</option><option value="TEMPORARIA">Temporaria</option><option value="ZAFRA">Zafra</option><option value="PASANTIA">Pasantía</option></select></label>
        <label class="offer-form__label">Vacantes *<input v-model.number="form.vacantes" class="offer-form__input" type="number" min="1" required></label>
        <label class="offer-form__label">Rango salarial<input v-model="form.salario" class="offer-form__input" maxlength="120" placeholder="Ej. $28.000 – $32.000"></label>
        <fieldset class="offer-form__wide offer-form__closing">
          <legend class="offer-form__closing-legend">Visibilidad de la empresa</legend>
          <label class="offer-form__radio offer-form__label">
            <input v-model="form.mostrarNombreEmpresa" class="offer-form__input offer-form__radio-input" type="checkbox" aria-describedby="offer-company-visibility-help">
            <span>Mostrar el nombre de la empresa a los postulantes</span>
          </label>
          <p id="offer-company-visibility-help" class="offer-form__visibility-help">Si desmarcás esta opción, aparecerá «Empresa reservada» en las ofertas y en Mis postulaciones. Las notificaciones y los correos al postulante seguirán mostrando el nombre real de la empresa.</p>
        </fieldset>
        <fieldset class="offer-form__wide offer-form__closing">
          <legend class="offer-form__closing-legend">Vigencia de la oferta *</legend>
          <div class="offer-form__radios">
            <label class="offer-form__radio offer-form__label">
              <input v-model="form.fechaModo" class="offer-form__input offer-form__radio-input" type="radio" value="INDEFINIDA">
              <span>Abierta indefinidamente</span>
            </label>
            <label class="offer-form__radio offer-form__label">
              <input v-model="form.fechaModo" class="offer-form__input offer-form__radio-input" type="radio" value="FECHA">
              <span>Cierra en una fecha exacta</span>
            </label>
          </div>
          <input
            v-if="form.fechaModo === 'FECHA'"
            v-model="form.fechaCierre"
            class="offer-form__date offer-form__input"
            type="date"
            :min="new Date().toISOString().slice(0, 10)"
            required
          >
        </fieldset>
        <label class="offer-form__wide offer-form__label">Descripción *<textarea v-model="form.descripcion" class="offer-form__textarea" rows="4" required></textarea></label>
        <label class="offer-form__wide offer-form__label">Requisitos<textarea v-model="form.requisitos" class="offer-form__textarea" rows="3"></textarea></label>
        <footer class="offer-form__actions"><AppButton variant="secondary" type="button" @click="emit('close')">Cancelar</AppButton><AppButton type="submit">{{ mode === 'edit' ? 'Guardar cambios' : 'Publicar oferta' }}</AppButton></footer>
      </form>
    </section>
  </div>
</template>