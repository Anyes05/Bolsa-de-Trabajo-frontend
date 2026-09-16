import { ref } from 'vue'
import { api, type AuthResponse, type Role } from '../services/api'

const session = ref<AuthResponse | null>(JSON.parse(sessionStorage.getItem('ccisj-session') || 'null'))

export function useAuth() {
  async function authenticate(role: Role, identifier?: string, password?: string) {
    if (!identifier || !password) return
    session.value = await api.login(role, identifier, password)
    sessionStorage.setItem('ccisj-session', JSON.stringify(session.value))
  }
  function setSession(value: AuthResponse) { session.value = value; sessionStorage.setItem('ccisj-session', JSON.stringify(value)) }
  function logout() { session.value = null; sessionStorage.removeItem('ccisj-session') }
  return { session, authenticate, setSession, logout }
}