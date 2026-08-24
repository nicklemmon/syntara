import { type Page } from '@playwright/test'

import { expect, toAppUrl } from '../fixtures'
import { apiRequest, createServiceAccountViaApi, deleteServiceAccountViaApi } from '../utils/api'

import { buildUniqueName } from './workflows'

const SERVICE_ACCOUNTS_URL = '/system-administration/access-management/service-accounts'

export { createServiceAccountViaApi, deleteServiceAccountViaApi }

/** Navigate to the service accounts list page and wait for it to load. */
export async function goToServiceAccountsList(app: Page) {
  await app.goto(toAppUrl(SERVICE_ACCOUNTS_URL))
  await expect(app.getByRole('tab', { name: 'Service accounts', exact: true })).toBeVisible({
    timeout: 20_000,
  })
}

/** Filter the service accounts list by name. */
export async function filterServiceAccountByName(app: Page, name: string) {
  await app.getByPlaceholder('Filter by name').fill(name)
  const responsePromise = app.waitForResponse(
    (resp) => resp.url().includes('/service_accounts') && resp.status() === 200
  )
  await app.getByRole('button', { name: 'Apply filter' }).click()
  await responsePromise
}

export async function goToServiceAccountDetail(app: Page, sa: { id: string; name: string }) {
  const url = `/system-administration/access-management/service-accounts/${sa.id}`
  await app.goto(toAppUrl(url))
  await expect(app.getByRole('heading', { level: 1, name: sa.name })).toBeVisible({
    timeout: 15_000,
  })
}

/**
 * Create a service account via API and optionally disable it.
 * Returns { id, name } for cleanup.
 */
export async function createTestServiceAccount(
  app: Page,
  options: { prefix?: string; disabled?: boolean } = {}
): Promise<{ id: string; name: string }> {
  const name = buildUniqueName(options.prefix ?? 'sa-e2e')
  const sa = await createServiceAccountViaApi(app, name)

  if (options.disabled) {
    await apiRequest(app, 'post', `/service_accounts/${sa.id}/disable`)
  }

  return sa
}

/** Navigate to SA detail page and click a specific tab. */
export async function goToServiceAccountTab(app: Page, sa: { id: string; name: string }, tabName: string) {
  await goToServiceAccountDetail(app, sa)
  const tab = app.getByRole('tab', { name: tabName })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
}

/** Delete a service account via the UI kebab menu (best-effort). */
export async function deleteServiceAccountByName(app: Page, name: string) {
  if (app.isClosed()) return
  try {
    await goToServiceAccountsList(app)
    await filterServiceAccountByName(app, name)

    const row = app.getByRole('row', { name: new RegExp(name) })
    if ((await row.count()) === 0) return

    await row.getByRole('button', { name: /Actions|Kebab toggle/i }).click({ force: true })
    await app.getByRole('menuitem', { name: /delete service account/i }).click()

    const dialog = app.getByRole('dialog')
    await dialog.getByRole('checkbox', { name: /i understand/i }).check()
    await dialog.getByRole('button', { name: 'Delete' }).click()
  } catch {
    // Best-effort cleanup
  }
}
