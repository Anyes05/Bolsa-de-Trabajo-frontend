<script setup lang="ts">
import { computed, ref } from 'vue'
import AccessView from './views/AccessView.vue'
import RegistrationView from './views/RegistrationView.vue'
import SessionView from './views/SessionView.vue'
import { useAuth } from './composables/useAuth'
import type { AuthResponse } from './services/api'

type View = 'access' | 'register'
const view = ref<View>('access')
const { session, logout, setSession } = useAuth()
const currentView = computed(() => session.value ? 'session' : view.value)
function completeRegistration(auth: AuthResponse) { setSession(auth) }
</script>

<template>
  <SessionView v-if="currentView === 'session'" :session="session!" @logout="logout" />
  <RegistrationView v-else-if="currentView === 'register'" @complete="completeRegistration" />
  <AccessView v-else @register="view = 'register'" @login="setSession" />
</template>