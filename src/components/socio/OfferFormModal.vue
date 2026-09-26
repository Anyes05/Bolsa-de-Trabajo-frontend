<script setup lang="ts">
import { onMounted, onUnmounted, reactive, watch } from 'vue'
import { X } from 'lucide-vue-next'
import AppButton from '../AppButton.vue'
import { availabilityLabel } from '../../data/mockSocioBolsa'
import {
  emptyOfferForm,
  mockOfferSectors,
  mockOfferZones,
  type MockSocioOffer,
} from '../../data/mockSocioOfertas'

const props = defineProps<{
  mode: 'create' | 'edit'
  offer: MockSocioOffer | null
}>()

const emit = defineEmits<{
  close: []
  save: [offer: MockSocioOffer]
}>()

const form = reactive(emptyOfferForm())

watch(
  () => props.offer,
  (offer) => {
    Object.assign(form, offer ? { ...offer } : emptyOfferForm())
  },
  { immediate: true },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

function submit() {
  emit('save', { ...form })
}
</script>

<template>
  <div class="offer-form-modal" role="dialog" aria-modal="true" aria-labelledby="offer-form-title">
    <div class="offer-form-modal__backdrop" @click="emit('close')"></div>
    <section class="offer-form-modal__panel">
      <header class="offer-form-modal__header">
        <h2 id="offer-form-title">{{ mode === 'edit' ? 'Editar Oferta' : 'Publicar Nueva Oferta' }}</h2>
        <button type="button" class="offer-form-modal__close" aria-label="Cerrar" @click="emit('close')">
          <X :size="18" />
        </button>
      </header>

      <form class="offer-form" @submit.prevent="submit">
        <label class="offer-form__wide">
          Título del puesto *
          <input v-model="form.title" required :placeholder="mode === 'create' ? 'Ej. Vendedor/a Mostrador' : undefined">
        </label>

        <label>
          Rubro *
          <select v-model="form.sector" required>
            <option value="" disabled>Seleccionar...</option>
            <option v-for="sector in mockOfferSectors" :key="sector" :value="sector">{{ sector }}</option>
          </select>
        </label>

        <label>
          Zona
          <select v-model="form.zone">
            <option value="">Seleccionar...</option>
            <option v-for="zone in mockOfferZones" :key="zone" :value="zone">{{ zone }}</option>
          </select>
        </label>

        <label>
          Modalidad
          <select v-model="form.availability">
            <option v-for="(label, value) in availabilityLabel" :key="value" :value="value">{{ label }}</option>
          </select>
        </label>

        <label>
          Rango salarial
          <input v-model="form.salary" :placeholder="mode === 'create' ? 'Ej. $28.000 – $32.000' : undefined">
        </label>

        <label class="offer-form__wide">
          Descripción *
          <textarea v-model="form.description" rows="4" required></textarea>
        </label>

        <label class="offer-form__wide">
          Requisitos
          <textarea v-model="form.requirements" rows="3"></textarea>
        </label>

        <label v-if="mode === 'edit'" class="offer-form__status">
          Estado
          <select v-model="form.status">
            <option>Activa</option>
            <option>Pausada</option>
            <option>Cerrada</option>
          </select>
        </label>

        <footer class="offer-form__actions">
          <AppButton variant="secondary" type="button" @click="emit('close')">Cancelar</AppButton>
          <AppButton variant="primary" type="submit">
            {{ mode === 'edit' ? 'Guardar' : 'Publicar Oferta' }}
          </AppButton>
        </footer>
      </form>
    </section>
  </div>
</template>
