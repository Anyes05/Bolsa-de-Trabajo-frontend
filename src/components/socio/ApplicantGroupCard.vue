<script setup lang="ts">
import { ChevronDown, Mail } from 'lucide-vue-next'
import AppButton from '../AppButton.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'
import ProfileCard from './ProfileCard.vue'

defineProps<{
  applicant: {
    id: number
    fullName: string
    email: string
    initials: string
    profiles: MockApplicantProfile[]
  }
  expanded: boolean
}>()

const emit = defineEmits<{
  toggle: []
  view: [profile: MockApplicantProfile]
}>()
</script>

<template>
  <article class="applicant-group-card">
    <header class="applicant-group-card__header">
      <span class="applicant-group-card__avatar" aria-hidden="true">{{ applicant.initials }}</span>
      <div>
        <h3>{{ applicant.fullName }}</h3>
        <a :href="`mailto:${applicant.email}`"><Mail :size="13" aria-hidden="true" />{{ applicant.email }}</a>
      </div>
      <span>{{ applicant.profiles.length }} {{ applicant.profiles.length === 1 ? 'perfil' : 'perfiles' }}</span>
    </header>
    <footer class="applicant-group-card__actions">
      <AppButton variant="secondary" type="button" @click="emit('toggle')">
        Ver sus perfiles <ChevronDown :size="15" :class="{ 'applicant-group-card__chevron--open': expanded }" />
      </AppButton>
      <AppButton variant="primary" type="button"><Mail :size="14" aria-hidden="true" /> Contactar</AppButton>
    </footer>
    <div v-if="expanded" class="applicant-group-card__profiles">
      <ProfileCard v-for="profile in applicant.profiles" :key="profile.id" :profile="profile" @view="emit('view', profile)" />
    </div>
  </article>
</template>