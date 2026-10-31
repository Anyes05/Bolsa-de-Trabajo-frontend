import { ApiRequestError } from '../services/http'

/** Mensajes claros orientados a la acción que intentaba el usuario. */
export function userFacingError(error: unknown, action: string): string {
  if (error instanceof ApiRequestError) {
    const detail = error.message?.trim()
    if (error.status === 401) {
      return `No se pudo ${action}: tu sesión expiró o las credenciales no son válidas. Volvé a iniciar sesión e intentá nuevamente.`
    }
    if (error.status === 403) {
      return `No se pudo ${action}: no tenés permiso para esta operación. Si creés que es un error, contactá al CCISJ.`
    }
    if (error.status === 404) {
      return `No se pudo ${action}: no encontramos el recurso solicitado. Actualizá la página e intentá de nuevo.`
    }
    if (error.status === 409) {
      return detail && detail !== 'No fue posible completar la solicitud.'
        ? `${detail} Revisá los datos e intentá nuevamente.`
        : `No se pudo ${action}: ya existe un registro con esos datos. Revisá que no esté duplicado.`
    }
    if (error.status === 400 || error.status === 422) {
      return detail && detail !== 'No fue posible completar la solicitud.'
        ? detail
        : `No se pudo ${action}. Verificá que todos los campos obligatorios estén completos y con el formato correcto.`
    }
    if (error.status >= 500) {
      return `No se pudo ${action} por un problema del servidor. Esperá un momento e intentá nuevamente.`
    }
    if (detail && detail !== 'No fue posible completar la solicitud.') {
      return `No se pudo ${action}. ${detail}`
    }
  }
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim()
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return `No se pudo ${action}: no hay conexión con el servidor. Comprobá tu internet e intentá nuevamente.`
    }
    return msg
  }
  return `No se pudo ${action}. Intentá nuevamente; si el problema continúa, contactá al CCISJ.`
}
