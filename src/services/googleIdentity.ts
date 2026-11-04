type GoogleIdentityApi = {
  initialize(options: {
    client_id: string
    nonce: string
    callback: (response: { credential: string }) => void
  }): void
  renderButton(container: HTMLElement, options: {
    type: 'standard'
    theme: 'outline'
    size: 'large'
    text: 'signin_with' | 'signup_with'
  }): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } }
  }
}

let pending: Promise<GoogleIdentityApi> | null = null

export function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id)
  if (pending) return pending
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  pending = new Promise<GoogleIdentityApi>((resolve, reject) => {
    script.onload = () => {
      const identity = window.google?.accounts.id
      if (identity) resolve(identity)
      else reject(new Error('No se pudo inicializar el acceso con Google. Intentá nuevamente.'))
    }
    script.onerror = () => reject(new Error('No se pudo conectar con Google. Revisá tu conexión e intentá nuevamente.'))
    document.head.append(script)
  }).catch((cause: unknown) => {
    pending = null
    script.remove()
    throw cause
  })
  return pending
}
