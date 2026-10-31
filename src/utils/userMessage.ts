import { ApiRequestError } from '../services/http'

const GENERIC_DETAIL = 'No fue posible completar la solicitud.'
const GENERIC_DETAIL_LONG = 'No fue posible completar la solicitud. Intentá nuevamente en unos momentos.'

function isProvisionalDeadlineMessage(detail: string) {
  return /24\s*horas|clave provisional|plazo/i.test(detail)
}

/** Mensajes claros orientados a la acción que intentaba el usuario. */
export function userFacingError(error: unknown, action: string): string {
  const isLogin = /iniciar sesi[oó]n|ingresar|login/i.test(action)

  if (error instanceof ApiRequestError) {
    const detail = error.message?.trim()
    const hasUsefulDetail = Boolean(
      detail
      && detail !== GENERIC_DETAIL
      && detail !== GENERIC_DETAIL_LONG
      && !/^unauthorized$/i.test(detail)
      && !/^acceso denegado$/i.test(detail),
    )

    if (isLogin) {
      if (error.status === 401) {
        return 'Usuario o contraseña incorrectos. Revisá tus datos e intentá nuevamente.'
      }
      if (error.status === 403) {
        if (hasUsefulDetail && isProvisionalDeadlineMessage(detail!)) {
          return detail!
        }
        if (hasUsefulDetail) return detail!
        return 'No se pudo iniciar sesión. Si sos socio y tu clave provisional venció (24 h), pedile al administrador que la restablezca.'
      }
      if (hasUsefulDetail) return detail!
      return 'No se pudo iniciar sesión. Intentá nuevamente en unos momentos.'
    }

    if (error.status === 401) {
      return `No se pudo ${action}: tu sesión ya no es válida. Volvé a iniciar sesión e intentá nuevamente.`
    }
    if (error.status === 403) {
      if (hasUsefulDetail && isProvisionalDeadlineMessage(detail!)) {
        return detail!
      }
      return hasUsefulDetail
        ? detail!
        : `No se pudo ${action}: no tenés permiso para esta operación. Si creés que es un error, contactá al CCISJ.`
    }
    if (error.status === 404) {
      return `No se pudo ${action}: no encontramos el recurso solicitado. Actualizá la página e intentá de nuevo.`
    }
    if (error.status === 409) {
      return hasUsefulDetail
        ? `${detail} Revisá los datos e intentá nuevamente.`
        : `No se pudo ${action}: ya existe un registro con esos datos. Revisá que no esté duplicado.`
    }
    if (error.status === 400 || error.status === 422) {
      return hasUsefulDetail
        ? detail!
        : `No se pudo ${action}. Verificá que todos los campos obligatorios estén completos y con el formato correcto.`
    }
    if (error.status >= 500) {
      return `No se pudo ${action} por un problema del servidor. Esperá un momento e intentá nuevamente.`
    }
    if (hasUsefulDetail) {
      return `No se pudo ${action}. ${detail}`
    }
  }
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim()
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return `No se pudo ${action}: no hay conexión con el servidor. Comprobá tu internet e intentá nuevamente.`
    }
    if (isLogin && /credenciales/i.test(msg)) {
      return 'Usuario o contraseña incorrectos. Revisá tus datos e intentá nuevamente.'
    }
    return msg
  }
  return `No se pudo ${action}. Intentá nuevamente; si el problema continúa, contactá al CCISJ.`
}
