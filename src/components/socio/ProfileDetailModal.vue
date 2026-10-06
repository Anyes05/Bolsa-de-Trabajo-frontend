<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { Car, Download, FileText, Mail, MapPin } from 'lucide-vue-next'
import AppButton from '../AppButton.vue'
import { availabilityLabel, type MockApplicantProfile } from '../../data/mockSocioBolsa'

defineProps<{
  profile: MockApplicantProfile
}>()

const emit = defineEmits<{
  close: []
  downloadCv: [profileId: string]
}>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <dialog open class="profile-modal" aria-modal="true" :aria-labelledby="`profile-modal-title-${profile.id}`">
    <div class="profile-modal__backdrop" @click="emit('close')"></div>
    <section class="profile-modal__panel">
      <header class="profile-modal__header">
        <div class="profile-modal__heading">
          <h2 :id="`profile-modal-title-${profile.id}`" class="profile-modal__name">{{ profile.fullName }}</h2>
          <p class="profile-modal__meta">
            <MapPin :size="13" aria-hidden="true" />
            {{ profile.location }}
            <template v-if="profile.identityCard"> · CI: {{ profile.identityCard }}</template>
            <template v-if="profile.age"> · {{ profile.age }} años</template>
          </p>
          <ul class="profile-modal__pills">
            <li>{{ availabilityLabel[profile.availability] }}</li>
            <li>
              <Car :size="12" aria-hidden="true" />
              {{ profile.hasVehicle ? 'Con vehículo propio' : 'Sin vehículo' }}
            </li>
          </ul>
        </div>
        <span class="profile-modal__category">{{ profile.categoryLabel }}</span>
      </header>

      <div class="profile-modal__body">
        <section class="profile-modal__block">
          <h3>Áreas de interés</h3>
          <ul class="profile-modal__tags">
            <li v-for="interest in profile.interests" :key="interest">{{ interest }}</li>
          </ul>
        </section>

        <section class="profile-modal__block">
          <h3>Resumen de experiencia</h3>
          <p>{{ profile.hasApplication ? profile.experienceSummary || 'No informado' : 'Disponible después de una postulación a una oferta propia' }}</p>
        </section>

        <section class="profile-modal__block">
          <h3>Último empleo</h3>
          <p><b>{{ profile.hasApplication ? profile.latestJob || 'No informado' : 'Disponible después de una postulación a una oferta propia' }}</b></p>
        </section>

        <section class="profile-modal__block">
          <h3>Currículum vitae adjunto</h3>
          <div class="profile-modal__cv">
            <div class="profile-modal__cv-file">
              <span class="profile-modal__cv-icon" aria-hidden="true">
                <FileText :size="18" />
              </span>
              <div>
                <strong>{{ profile.cvFileName || 'CV asociado al perfil' }}</strong>
                <small>{{ !profile.hasApplication ? 'Disponible después de una postulación a una oferta propia' : profile.hasCv ? profile.cvMeta || 'CV asociado' : 'No se adjuntó un CV' }}</small>
              </div>
            </div>
            <AppButton variant="secondary" type="button" :disabled="!profile.hasCv" @click="emit('downloadCv', profile.id)">
              <Download :size="14" aria-hidden="true" />
              Descargar CV
            </AppButton>
          </div>
        </section>
      </div>

      <footer class="profile-modal__actions">
        <AppButton variant="secondary" type="button" @click="emit('close')">Cerrar</AppButton>
        <AppButton variant="primary" type="button">
          <Mail :size="14" aria-hidden="true" />
          Solicitar Contacto
        </AppButton>
      </footer>
    </section>
  </dialog>
</template>
