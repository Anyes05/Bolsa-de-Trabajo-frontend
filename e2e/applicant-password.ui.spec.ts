import { expect, test } from '@playwright/test'

test('RF-18: applicant password validation, server error and session renewal (mock API)', async ({ page }) => {
  const session = { token: 'synthetic-old', email: 'applicant@example.test', role: 'POSTULANTE', fullName: 'Persona Prueba' }
  await page.addInitScript(value => sessionStorage.setItem('ccisj-session', JSON.stringify(value)), session)
  let submissions = 0
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/change-password')) {
      submissions++
      expect(route.request().postDataJSON()).toEqual({
        currentPassword: 'Anterior123!', newPassword: 'NuevaClave123!',
      })
      if (submissions === 1) {
        await route.fulfill({ status: 400, json: { message: 'La contraseña actual no es correcta' } })
      } else {
        await route.fulfill({ json: { ...session, token: 'synthetic-renewed' } })
      }
    } else if (path.endsWith('/auth/me')) {
      await route.fulfill({ json: session })
    } else if (path.endsWith('/postulante/datos-personales')) {
      await route.fulfill({ json: { nombreCompleto: 'Persona Prueba', email: session.email, cedulaIdentidad: '', telefono: '', zonaResidencia: 'San José de Mayo', fotoUrl: null } })
    } else if (path.endsWith('/postulante/permanencia')) {
      await route.fulfill({ json: { requiereAccion: false } })
    } else if (path.includes('/notificaciones')) {
      await route.fulfill({ json: [] })
    } else {
      await route.abort()
    }
  })
  await page.goto('/postulante/mi-perfil')
  const current = page.locator('#applicant-current-password')
  const next = page.locator('#applicant-new-password')
  const repeat = page.locator('#applicant-repeat-password')
  const submit = page.getByRole('button', { name: 'Actualizar contraseña', exact: true })
  await expect(submit).toBeDisabled()
  await current.fill('Anterior123!')
  await next.fill('NuevaClave123!')
  await repeat.fill('Diferente123!')
  await expect(submit).toBeDisabled()
  await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
  await repeat.fill('NuevaClave123!')
  await submit.click()
  await expect(page.getByText('La contraseña actual no es correcta')).toBeVisible()
  await expect(current).toHaveValue('Anterior123!')
  await submit.click()
  await expect(page.getByText('Tu contraseña se actualizó correctamente.')).toBeVisible()
  await expect(current).toHaveValue('')
  await expect(next).toHaveValue('')
  await expect(repeat).toHaveValue('')
  expect(submissions).toBe(2)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('ccisj-session')!).token)).toBe('synthetic-renewed')
})
