<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppAlert from './AppAlert.vue'
import { loadGoogleIdentity } from '../services/googleIdentity'
import type { GoogleCredential } from '../services/types'

const props = withDefaults(defineProps<{ disabled?: boolean; text?: 'signin_with' | 'signup_with' }>(), {
  disabled: false, text: 'signin_with',
})
const emit = defineEmits<{ credential: [credential: GoogleCredential] }>()
const container = ref<HTMLDivElement | null>(null)
const error = ref('')
let active = true

async function initialize() {
  error.value = ''
  try {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) throw new Error('El acceso con Google no está configurado. Contactá al administrador.')
    const google = await loadGoogleIdentity()
    if (!active || !container.value) return
    const nonce = crypto.randomUUID()
    google.initialize({
      client_id: clientId,
      nonce,
      callback: (response) => {
        if (!active || props.disabled) return
        if (!response.credential) {
          error.value = 'Google no devolvió una credencial. Intentá nuevamente.'
          return
        }
        emit('credential', { credential: response.credential, nonce })
      },
    })
    container.value.replaceChildren()
    google.renderButton(container.value, { type: 'standard', theme: 'outline', size: 'large', text: props.text })
  } catch (cause) {
    if (active) error.value = cause instanceof Error ? cause.message : 'No se pudo cargar el acceso con Google.'
  }
}

onMounted(initialize)
onUnmounted(() => { active = false })
</script>

<template>
  <div class="google-sign-in">
    <div ref="container" :inert="disabled" :aria-busy="disabled" />
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
    <button v-if="error" type="button" :disabled="disabled" @click="initialize">Reintentar acceso con Google</button>
  </div>
</template>

<style scoped>
.google-sign-in { display: grid; gap: 10px; margin: 16px 0; }
</style>
