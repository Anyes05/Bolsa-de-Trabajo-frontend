<script setup lang="ts">
import { ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import AppField from '../../components/AppField.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { perfilesMock, type PostulantePerfil } from '../../data/mockPostulanteBolsa'

type EditableProfile = PostulantePerfil & { id: number }
const profiles = ref<EditableProfile[]>(perfilesMock.map((profile) => ({ ...profile })))
const editingProfile = ref<EditableProfile | null>(null)
const form = ref({
  name: '',
  availability: '',
  latestJob: '',
  summary: '',
  hasVehicle: false,
})

function toggleVisibility(profile: EditableProfile) {
  profile.visibility = profile.visibility === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE'
}

function openEdit(profile: EditableProfile) {
  editingProfile.value = profile
  form.value = {
    name: profile.name,
    availability: profile.availability,
    latestJob: profile.latestJob,
    summary: profile.summary,
    hasVehicle: profile.hasVehicle,
  }
}

function closeEdit() {
  editingProfile.value = null
}

function saveEdit() {
  if (!editingProfile.value) return
  editingProfile.value.name = form.value.name
  editingProfile.value.availability = form.value.availability
  editingProfile.value.latestJob = form.value.latestJob
  editingProfile.value.summary = form.value.summary
  editingProfile.value.hasVehicle = form.value.hasVehicle
  editingProfile.value = null
}
</script>

<template>
  <PostulanteShell
    title="Mis Perfiles Profesionales"
    subtitle="Gestiona tus diferentes perfiles de postulacion"
    active-section="perfiles"
  >
    <section class="postulante-profiles">
      <AppAlert tone="info">
        Tener multiples perfiles te permite postularte con la informacion y experiencia mas relevante para cada tipo de empleo.
      </AppAlert>

      <article v-for="profile in profiles" :key="profile.id" class="profile-card-postulante">
        <header class="profile-card-postulante__header">
          <div>
            <h2>{{ profile.name }}</h2>
            <span
              class="profile-card-postulante__visibility"
              :class="{
                'profile-card-postulante__visibility--visible': profile.visibility === 'VISIBLE',
                'profile-card-postulante__visibility--hidden': profile.visibility === 'HIDDEN',
              }"
            >
              {{ profile.visibility === 'VISIBLE' ? 'Visible en Bolsa' : 'Oculto (solo postulacion directa)' }}
            </span>
          </div>
          <div class="profile-card-postulante__actions">
            <AppButton variant="secondary" @click="toggleVisibility(profile)">
              {{ profile.visibility === 'VISIBLE' ? 'Ocultar perfil' : 'Hacer Visible' }}
            </AppButton>
            <AppButton @click="openEdit(profile)">Editar</AppButton>
          </div>
        </header>

        <div class="profile-card-postulante__details">
          <p><strong>Disponibilidad:</strong> {{ profile.availability }}</p>
          <p>
            <strong>Habilidades:</strong>
            <span class="profile-card-postulante__skills">
              <span v-for="skill in profile.skills" :key="skill">{{ skill }}</span>
            </span>
          </p>
          <p><strong>Ultimo empleo:</strong> {{ profile.latestJob }}</p>
        </div>
      </article>
    </section>

    <div v-if="editingProfile" class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
      <div class="modal__backdrop" @click="closeEdit"></div>
      <section class="modal__panel modal__panel--large">
        <header class="modal__header">
          <h3 id="edit-profile-title">Editar Perfil Profesional</h3>
          <button type="button" class="modal__close" @click="closeEdit">×</button>
        </header>

        <div class="modal__form-grid">
          <AppField id="profile-name" label="Nombre del perfil profesional" required>
            <input id="profile-name" v-model="form.name">
          </AppField>
          <AppField id="profile-availability" label="Disponibilidad Horaria" required>
            <input id="profile-availability" v-model="form.availability">
          </AppField>
          <AppField id="profile-latest-job" label="Detalle del ultimo empleo" required>
            <input id="profile-latest-job" v-model="form.latestJob">
          </AppField>
          <AppField id="profile-summary" label="Resumen de experiencia laboral y presentacion" required>
            <textarea id="profile-summary" v-model="form.summary"></textarea>
          </AppField>
          <label class="modal__checkbox">
            <input v-model="form.hasVehicle" type="checkbox"> ¿Posee vehiculo propio / libreta de conducir al dia?
          </label>
        </div>

        <footer class="modal__actions">
          <AppButton variant="secondary" @click="closeEdit">Cancelar</AppButton>
          <AppButton @click="saveEdit">Guardar Cambios</AppButton>
        </footer>
      </section>
    </div>
  </PostulanteShell>
</template>
