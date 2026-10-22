export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_HINT = 'Mínimo 8 caracteres, con mayúscula, minúscula, número y un carácter especial (ej: !@#$%).'

export const PASSWORD_ERROR = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

export function validatePassword(password: string): string | null {
  if (!password) return 'Ingresa una contraseña.'
  if (!PASSWORD_REGEX.test(password)) return PASSWORD_ERROR
  return null
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password)
}
