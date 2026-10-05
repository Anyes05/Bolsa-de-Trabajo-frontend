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
  })
}
</script>

<template>
  <div class="offer-form-modal" role="dialog" aria-modal="true" aria-labelledby="offer-form-title">
    <div class="offer-form-modal__backdrop" @click="emit('close')"></div>
    <section class="offer-form-modal__panel">
      <header class="offer-form-modal__header">
        <h2 id="offer-form-title">{{ mode === 'edit' ? 'Editar oferta laboral' : 'Publicar oferta laboral' }}</h2>
        <button type="button" class="offer-form-modal__close" aria-label="Cerrar" @click="emit('close')"><X :size="18" /></button>
      </header>
      <form class="offer-form" @submit.prevent="submit">
        <label v-if="adminMode" class="offer-form__wide">Socio titular *
          <select v-model="form.socioId" required>
            <option :value="null" disabled>Seleccionar socio</option>
            <option v-for="socio in socios" :key="socio.id" :value="socio.id">{{ socio.razonSocial }}</option>
          </select>
        </label>
        <label class="offer-form__wide">Título del puesto *<input v-model="form.titulo" maxlength="180" required></label>
        <label>Cargo<input v-model="form.cargo" maxlength="120"></label>
        <label>Rubro *<select v-model.number="form.rubroId" required><option :value="0" disabled>Seleccionar...</option><option v-for="sector in sectors" :key="sector.id" :value="sector.id">{{ sector.nombreRubro }}</option></select></label>
        <label>Zona<input v-model="form.zona" maxlength="120"></label>
        <label>Modalidad<select v-model="form.disponibilidadHoraria"><option value="FULL_TIME">Tiempo completo</option><option value="PART_TIME">Part-time</option><option value="INDEFINIDO">Cualquier horario</option></select></label>
        <label>Tipo de contrato<select v-model="form.tipoContrato"><option value="">No especificado</option><option value="EFECTIVO">Efectivo</option><option value="TEMPORARIA">Temporaria</option><option value="ZAFRA">Zafra</option><option value="PASANTIA">Pasantía</option></select></label>
        <label>Vacantes *<input v-model.number="form.vacantes" type="number" min="1" required></label>
        <label>Rango salarial<input v-model="form.salario" maxlength="120" placeholder="Ej. $28.000 – $32.000"></label>
        <fieldset class="offer-form__wide offer-form__closing">
          <legend>Vigencia de la oferta *</legend>
          <label><input v-model="form.fechaModo" type="radio" value="INDEFINIDA"> Abierta indefinidamente</label>
          <label><input v-model="form.fechaModo" type="radio" value="FECHA"> Cierra en una fecha exacta</label>
          <input v-if="form.fechaModo === 'FECHA'" v-model="form.fechaCierre" type="date" :min="new Date().toISOString().slice(0, 10)" required>
        </fieldset>
        <label class="offer-form__wide">Descripción *<textarea v-model="form.descripcion" rows="4" required></textarea></label>
        <label class="offer-form__wide">Requisitos<textarea v-model="form.requisitos" rows="3"></textarea></label>
        <footer class="offer-form__actions"><AppButton variant="secondary" type="button" @click="emit('close')">Cancelar</AppButton><AppButton type="submit">{{ mode === 'edit' ? 'Guardar cambios' : 'Publicar oferta' }}</AppButton></footer>
      </form>
    </section>
  </div>
</template>