<script setup lang="ts">
import { MapPin, Mail } from 'lucide-vue-next'
import AppButton from '../AppButton.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'

defineProps<{
  profile: MockApplicantProfile
}>()

const availabilityLabel: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
}
</script>

<template>
  <article class="profile-card">
    <header class="profile-card__header">
      <span class="profile-card__avatar" aria-hidden="true">{{ profile.initials }}</span>
      <div>
        <h3 class="profile-card__name">{{ profile.fullName }}</h3>
        <p class="profile-card__role">{{ profile.profileName }}</p>
        <p class="profile-card__location">
          <MapPin :size="13" aria-hidden="true" />
          {{ profile.location }}
        </p>
      </div>
    </header>
    <ul class="profile-card__tags">
      <li v-for="tag in profile.tags" :key="tag" class="profile-card__tag">{{ tag }}</li>
    </ul>
    <p class="profile-card__meta">
      Disponibilidad: <b>{{ availabilityLabel[profile.availability] }}</b>
      · Libreta: {{ profile.license }}
    </p>
    <footer class="profile-card__actions">
      <AppButton variant="secondary" type="button">Ver perfil completo</AppButton>
      <AppButton variant="primary" type="button">
        <Mail :size="14" aria-hidden="true" /> Contactar
      </AppButton>
    </footer>
  </article>
</template>
