<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { Mail } from 'lucide-vue-next'
import AppButton from '../AppButton.vue'

defineProps<{
  applicantName: string
  applicantEmail: string
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
  notify: [selected: boolean]
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
          <p>Selecciona el mensaje que se enviará al postulante. Podrá responder directamente al correo de tu empresa.</p>
        </section>
      </div>

      <footer class="profile-modal__actions">
        <AppButton variant="secondary" type="button" :disabled="loading" @click="emit('close')">Cancelar</AppButton>
        <AppButton variant="secondary" type="button" :loading="loading" @click="emit('notify', false)">No seleccionado</AppButton>
        <AppButton variant="primary" type="button" :loading="loading" @click="emit('notify', true)">Seleccionado</AppButton>
      </footer>
    </section>
  </dialog>
</template>
