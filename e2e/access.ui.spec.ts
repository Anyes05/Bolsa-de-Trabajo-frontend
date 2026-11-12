import { expect, test } from '@playwright/test'

test('RF-19: selection of the three roles and registration entry point', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()
  for (const role of ['ADMINISTRADOR', 'SOCIO', 'POSTULANTE']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${role}`) })).toBeVisible()
  }
  await page.getByRole('link', { name: /Regístrate aquí/ }).click()
  await expect(page).toHaveURL(/\/registro$/)
})

for (const [role, label, inputmode] of [
  ['ADMINISTRADOR', 'Email institucional', 'email'],
  ['SOCIO', 'BPS o cédula', 'numeric'],
  ['POSTULANTE', 'Gmail / Correo electrónico', 'email'],
] as const) {
  test(`RF-19: ${role} credentials and reset on return`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: new RegExp(`^${role}`) }).click()
    const identifier = page.getByRole('textbox', { name: label, exact: true })
    await expect(identifier).toHaveAttribute('inputmode', inputmode)
    await identifier.fill(role === 'SOCIO' ? '123456' : 'prueba@example.test')
    const password = page.locator('#login-password')
    await expect(password).toHaveAccessibleName('Contraseña')
    await password.fill('Synthetic-password-123')
    await page.getByRole('button', { name: 'Volver a roles' }).click()
    await page.getByRole('button', { name: new RegExp(`^${role}`) }).click()
    await expect(identifier).toHaveValue('')
    await expect(password).toHaveValue('')
  })
}

for (const path of ['/admin', '/socio/bolsa-empleo', '/postulante/ofertas-empleo']) {
  test(`RF-19: anonymous user cannot open ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL('http://127.0.0.1:4173/')
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()
  })
}

test('RF-19: invalid socio identifier is rejected before requesting login', async ({ page }) => {
  let requests = 0
  await page.route('**/auth/login', async route => {
    requests++
    await route.abort()
  })
  await page.goto('/')
  await page.getByRole('button', { name: /^SOCIO/ }).click()
  await page.getByRole('textbox', { name: 'BPS o cédula', exact: true }).fill('sin-numeros')
  await page.locator('#login-password').fill('Synthetic-password-123')
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByText('Ingresá tu número de BPS o cédula para continuar.')).toBeVisible()
  expect(requests).toBe(0)
})
