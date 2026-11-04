import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GoogleRegistration } from '../services/types'

const key = 'ccisj-google-registration'

function readPending(): GoogleRegistration | null {
  const raw = sessionStorage.getItem(key)
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null
      || !('registrationToken' in value) || typeof value.registrationToken !== 'string'
      || !('email' in value) || typeof value.email !== 'string'
      || !('fullName' in value) || typeof value.fullName !== 'string'
      || !('fotoUrl' in value) || (value.fotoUrl !== null && typeof value.fotoUrl !== 'string')) {
      throw new Error('Datos de registro con Google inválidos.')
    }
    return { registrationToken: value.registrationToken, email: value.email, fullName: value.fullName, fotoUrl: value.fotoUrl }
  } catch (cause) {
    console.error('[google-registration] No se pudo recuperar el registro pendiente.', {
      errorType: cause instanceof Error ? cause.name : 'unknown',
    })
    sessionStorage.removeItem(key)
    return null
  }
}

export const useGoogleRegistrationStore = defineStore('googleRegistration', () => {
  const pending = ref<GoogleRegistration | null>(readPending())

  function save(value: GoogleRegistration) {
    sessionStorage.setItem(key, JSON.stringify(value))
    pending.value = value
  }

  function clear() {
    sessionStorage.removeItem(key)
    pending.value = null
  }

  return { pending, save, clear }
})
