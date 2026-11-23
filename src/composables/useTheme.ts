import { readonly, ref } from 'vue'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'ccisj-theme'
const THEME_COLOR: Record<Theme, string> = { light: '#008c45', dark: '#0f1f17' }

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

const theme = ref<Theme>('light')

function apply(value: Theme) {
  theme.value = value
  document.documentElement.dataset.theme = value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[value])
}

/**
 * Aplica el tema antes de montar la app: el elegido por la persona o, si nunca eligió, el claro.
 */
export function initTheme() {
  apply(storedTheme() ?? 'light')
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
