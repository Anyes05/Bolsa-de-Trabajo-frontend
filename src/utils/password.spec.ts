import { describe, expect, it } from 'vitest'
import { PASSWORD_ERROR, isValidPassword, validatePassword } from './password'

describe('password policy', () => {
  it('accepts passwords only when every required character class is present', () => {
    expect(validatePassword('Segura1!')).toBeNull()
    expect(isValidPassword('Segura1!')).toBe(true)
  })

  it('distinguishes an empty password from an invalid one', () => {
    expect(validatePassword('')).toBe('Ingresa una contraseña.')
    for (const password of ['short1!', 'sinmayuscula1!', 'SINMINUSCULA1!', 'SinNumero!', 'SinEspecial1']) {
      expect(validatePassword(password)).toBe(PASSWORD_ERROR)
      expect(isValidPassword(password)).toBe(false)
    }
  })

  it('rejects passwords longer than the supported backend limit', () => {
    expect(validatePassword(`Aa1!${'x'.repeat(69)}`)).toBe(PASSWORD_ERROR)
  })
})
