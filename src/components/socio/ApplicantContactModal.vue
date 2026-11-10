<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Mail } from 'lucide-vue-next'
import AppButton from '../AppButton.vue'
import AppAlert from '../AppAlert.vue'
import type { ContactApplication } from '../../services/socioBolsaService'

const props = defineProps<{
  applicantName: string
  applicantEmail: string
  loading?: boolean
  applications: ContactApplication[]
  loadingApplications: boolean
  error?: string | null
}>()

const selectedOfferId = ref<number | ''>('')
const selectedApplication = computed(() => props.applications.find((item) => item.ofertaId === selectedOfferId.value))
watch(() => props.applications, (items) => {
  selectedOfferId.value = items.length === 1 ? items[0]!.ofertaId : ''
}, { immediate: true })

const emit = defineEmits<{
  close: []
  notify: [selected: boolean, application: ContactApplication]
}>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !props.loading) emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <dialog open class="profile-modal" aria-modal="true" aria-labelledby="applicant-contact-modal-title">
    <div class="profile-modal__backdrop" @click="!loading && emit('close')"></div>
    <section class="profile-modal__panel">
      <header class="profile-modal__header">
        <div class="profile-modal__heading">
          <h2 id="applicant-contact-modal-title" class="profile-modal__name">Notificar postulante</h2>
          <p class="profile-modal__meta">
            <Mail :size="13" aria-hidden="true" />
            {{ applicantName }} · {{ applicantEmail }}
          </p>
        </div>
      </header>

      <div class="profile-modal__body">
        <section class="profile-modal__block">
          <h3>Resultado del proceso</h3>
          <p>Seleccione la oferta laboral y el resultado que desea comunicar. El postulante recibirá un correo y una notificación con los datos de la vacante y de su empresa.</p>
          <p v-if="loadingApplications" role="status">Cargando postulaciones...</p>
          <AppAlert v-else-if="!applications.length && !error" tone="info">Este postulante no tiene postulaciones disponibles a ofertas de su empresa.</AppAlert>
          <label v-else-if="applications.length" class="contact-offer">
            Oferta laboral
            <select v-model="selectedOfferId" :disabled="loading || loadingApplications">
              <option disabled value="">Seleccione una oferta</option>
              <option v-for="application in applications" :key="application.ofertaId" :value="application.ofertaId">
                {{ application.ofertaTitulo }} — {{ application.perfilNombre }}
              </option>
            </select>
          </label>
          <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
        </section>
      </div>

      <footer class="profile-modal__actions">
        <AppButton variant="secondary" type="button" :disabled="loading" @click="emit('close')">Cancelar</AppButton>
        <AppButton variant="secondary" type="button" :loading="loading" :disabled="loadingApplications || !selectedApplication" @click="selectedApplication && emit('notify', false, selectedApplication)">No seleccionado</AppButton>
        <AppButton variant="primary" type="button" :loading="loading" :disabled="loadingApplications || !selectedApplication" @click="selectedApplication && emit('notify', true, selectedApplication)">Seleccionado</AppButton>
      </footer>
    </section>
  </dialog>
</template>

<style scoped>
.contact-offer { display: grid; gap: 8px; margin-top: 16px; }
.contact-offer select { width: 100%; padding: 10px 12px; border: 1px solid #d8e2db; border-radius: 8px; background: #fff; color: #243028; font: inherit; }
</style>
