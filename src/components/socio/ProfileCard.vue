<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import AppButton from '../AppButton.vue'
import ProfileAvatar from '../ProfileAvatar.vue'
import { availabilityLabel, type MockApplicantProfile } from '../../data/mockSocioBolsa'

defineProps<{
  profile: MockApplicantProfile
}>()

defineEmits<{
  view: []
}>()
</script>

<template>
  <article class="profile-card">
    <header class="profile-card__header">
      <ProfileAvatar class="profile-card__avatar" :src="profile.fotoUrl" :initials="profile.initials" />
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
      <AppButton variant="secondary" type="button" @click="$emit('view')">Ver perfil completo</AppButton>
    </footer>
  </article>
</template>
