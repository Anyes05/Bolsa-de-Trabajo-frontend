<script setup lang="ts">
import { ChevronDown, Mail, Phone } from 'lucide-vue-next'
import AppButton from '../AppButton.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'
import ProfileCard from './ProfileCard.vue'

defineProps<{
  applicant: {
    id: number
    fullName: string
    email: string
    phone?: string
    initials: string
    profiles: MockApplicantProfile[]
  }
  expanded: boolean
}>()

const emit = defineEmits<{
  toggle: []
  view: [profile: MockApplicantProfile]
  contact: []
}>()
</script>

<template>
  <article class="applicant-group-card">
    <header class="applicant-group-card__header">
      <span class="applicant-group-card__avatar" aria-hidden="true">{{ applicant.initials }}</span>
      <div class="applicant-group-card__identity">
        <h3>{{ applicant.fullName }}</h3>
        <a class="applicant-group-card__contact" :href="`mailto:${applicant.email}`">
          <Mail :size="15" aria-hidden="true" />{{ applicant.email }}
        </a>
        <a
          v-if="applicant.phone"
          class="applicant-group-card__contact"
          :href="`tel:${applicant.phone.replace(/\s+/g, '')}`"
        >
          <Phone :size="15" aria-hidden="true" />{{ applicant.phone }}
        </a>
        <span v-else class="applicant-group-card__contact applicant-group-card__contact--muted">
          <Phone :size="15" aria-hidden="true" />Sin teléfono
        </span>
      </div>
      <span class="applicant-group-card__count">
        {{ applicant.profiles.length }} {{ applicant.profiles.length === 1 ? 'perfil' : 'perfiles' }}
      </span>
    </header>
    <footer class="applicant-group-card__actions">
      <AppButton variant="secondary" type="button" @click="emit('toggle')">
        Ver sus perfiles <ChevronDown :size="15" :class="{ 'applicant-group-card__chevron--open': expanded }" />
      </AppButton>
      <AppButton variant="primary" type="button" @click="emit('contact')">
        <Mail :size="14" aria-hidden="true" /> Contactar
      </AppButton>
    </footer>
    <div v-if="expanded" class="applicant-group-card__profiles">
      <ProfileCard v-for="profile in applicant.profiles" :key="profile.id" :profile="profile" @view="emit('view', profile)" />
    </div>
  </article>
</template>
