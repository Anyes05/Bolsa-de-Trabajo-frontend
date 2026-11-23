<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppAlert from './AppAlert.vue'
import AppButton from './AppButton.vue'
import { loadGoogleIdentity, type GoogleButtonOptions } from '../services/googleIdentity'
import type { GoogleCredential } from '../services/types'

const props = withDefaults(defineProps<{ disabled?: boolean; text?: 'signin_with' | 'signup_with' }>(), {
  disabled: false, text: 'signin_with',
})
const emit = defineEmits<{ credential: [credential: GoogleCredential] }>()
const container = ref<HTMLDivElement | null>(null)
const error = ref('')
let active = true

/** GIS acepta un ancho de hasta 400 px: se iguala al contenedor y, si este es más ancho, se centra. */
const MAX_BUTTON_WIDTH = 400

function buttonOptions(element: HTMLElement): GoogleButtonOptions {
  const width = Math.min(element.clientWidth, MAX_BUTTON_WIDTH)
  const dark = document.documentElement.dataset.theme === 'dark'
  return {
    type: 'standard',
    theme: dark ? 'filled_black' : 'outline',
    size: 'large',
    shape: 'rectangular',
    text: props.text,
    logo_alignment: 'center',
    ...(width > 0 ? { width } : {}),
  }
}

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
    google.renderButton(container.value, buttonOptions(container.value))
  } catch (cause) {
    if (active) error.value = cause instanceof Error ? cause.message : 'No se pudo cargar el acceso con Google.'
  }
}

onMounted(initialize)
onUnmounted(() => { active = false })
</script>

<template>
  <div class="google-sign-in">
    <div ref="container" class="google-sign-in__button" :class="{ 'google-sign-in__button--hidden': error }" :inert="disabled" :aria-busy="disabled" />
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
    <AppButton v-if="error" class="google-sign-in__retry" variant="secondary" :disabled="disabled" @click="initialize">Reintentar acceso con Google</AppButton>
  </div>
</template>

<style scoped>
.google-sign-in { display: grid; gap: 10px; width: 100%; margin: 16px 0; }
.google-sign-in__button { display: flex; justify-content: center; width: 100%; min-width: 0; }
.google-sign-in__button--hidden { display: none; }
.google-sign-in__retry { width: 100%; }
</style>
