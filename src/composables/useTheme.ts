import { readonly, ref } from 'vue'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'ccisj-theme'
const THEME_COLOR: Record<Theme, string> = { light: '#008c45', dark: '#0f1f17' }
const DARK_QUERY = '(prefers-color-scheme: dark)'

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

const theme = ref<Theme>('light')

function apply(value: Theme) {
  theme.value = value
  document.documentElement.dataset.theme = value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[value])
}

/**
 * Aplica el tema antes de montar la app: el elegido por la persona o, si nunca eligió,
 * el del sistema operativo (y lo sigue mientras no elija uno).
 */
export function initTheme() {
  apply(storedTheme() ?? systemTheme())
  window.matchMedia?.(DARK_QUERY).addEventListener?.('change', (event) => {
    if (!storedTheme()) apply(event.matches ? 'dark' : 'light')
  })
}

export function useTheme() {
  function setTheme(value: Theme) {
    apply(value)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value)
    } catch {
      // Sin almacenamiento (modo privado estricto): el tema vale solo para esta visita.
    }
  }

  return {
    theme: readonly(theme),
    setTheme,
    toggleTheme: () => setTheme(theme.value === 'dark' ? 'light' : 'dark'),
  }
}
