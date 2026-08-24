/**
 * E2E Tests: Integration Filtering (page-specific)
 *
 * Shared FilterBar behavior (chips, empty state, shareable URLs, clear-all,
 * pagination with filters) lives in filter-bar.spec.ts. This file covers
 * Integrations-only fields:
 * - Status filter selection and switching
 * - Combined name + status + integration type filters
 */
import { createUnavailableGuard, test, expect, toAppUrl } from './fixtures'
import { buildUniqueName } from './helpers/workflows'
import { createIntegrationViaApi, deleteIntegrationViaApi, type SeededIntegration } from './seeds/resources'
import { getAuthToken } from './utils/api'

const seededIntegrations: SeededIntegration[] = []

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  const token = await getAuthToken(page)
  if (token) {
    const prefix = buildUniqueName('e2e-intfilt')
    for (let i = 1; i <= 12; i++) {
      const name = i === 1 ? `${prefix}-copilot` : `${prefix}-integration-${i}`
      const integration = await createIntegrationViaApi(page, { name, token })
      if (integration) seededIntegrations.push(integration)
    }
  }
  await page.close()
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage()
  for (const integration of seededIntegrations) {
    await deleteIntegrationViaApi(page, integration.id)
  }
  await page.close()
})

test.describe('Integration Filtering', () => {
  const guard = createUnavailableGuard('No integration data available; seed data required')

  test.beforeEach(async ({ app }) => {
    await app.goto(toAppUrl('/configuration/integrations'))
    await expect(app.getByRole('heading', { level: 1, name: 'Integrations' })).toBeVisible()
    const grid = app.getByRole('grid', { name: 'Integrations table' })
    const hasGrid = await grid
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!hasGrid) guard.markUnavailable()
    test.skip(!hasGrid, 'No integration data available; seed data required')
  })

  test('status filter: switch between status values', async ({ app }) => {
    // Navigate to integrations
    await app.goto(toAppUrl('/configuration/integrations'))
    await expect(app.getByRole('heading', { level: 1, name: 'Integrations' })).toBeVisible()

    const table = app.getByRole('grid', { name: 'Integrations table' })
    await expect(table).toBeVisible()

    // Act - Switch to Status field and apply "Available" status filter
    const fieldSelector = app.locator('#filter-toolbar').getByRole('button', { name: 'Name', exact: true })
    await fieldSelector.click()
    await app.getByRole('option', { name: 'Status' }).click()
    await app.getByRole('button', { name: 'Filter by status' }).click()
    await app.getByRole('option', { name: 'Available' }).click()

    // Assert - Status filter chip displayed
    const statusChipGroup = app.getByRole('search', { name: 'Filters' }).getByRole('list', { name: 'Status' })
    await expect(statusChipGroup).toBeVisible()
    await expect(statusChipGroup.getByText('Available')).toBeVisible()

    // Verify URL
    await expect(app).toHaveURL(/status=available/)

    // Verify filtered results exist (skip if filter matched nothing)
    const dataRow = table.getByRole('row').nth(1) // First data row (index 0 is header)
    const hasAvailable = await dataRow
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!hasAvailable, 'No integrations with "Available" status; seed data required')

    // Act - Switch to "Error" status (replaces "Available")
    await app.locator('#filter-toolbar').getByRole('button', { name: 'Available', exact: true }).click()
    await app.getByRole('option', { name: 'Error' }).click()

    // Assert - Status filter updated to "Error"
    await expect(statusChipGroup.getByText('Error')).toBeVisible()
    await expect(statusChipGroup.getByText('Available')).not.toBeVisible()

    // Verify URL updated
    await expect(app).toHaveURL(/status=error/)
    await expect(app).not.toHaveURL(/status=available/)

    // Act - Remove status filter
    await statusChipGroup
      .locator('.pf-v6-c-label', { hasText: 'Error' })
      .getByRole('button', { name: /close/i })
      .click()

    // Assert - Status filter removed
    await expect(statusChipGroup).not.toBeVisible()
    await expect(app).not.toHaveURL(/status=/)
  })

  test('combined filters: name + status + integration type', async ({ app }) => {
    // Navigate to integrations
    await app.goto(toAppUrl('/configuration/integrations'))
    await expect(app.getByRole('heading', { level: 1, name: 'Integrations' })).toBeVisible()

    // Act - Apply name filter
    await app.getByPlaceholder('Filter by name').fill('integration')
    await app.getByRole('button', { name: 'Apply filter' }).click()

    // Assert - Name filter applied
    const nameChipGroup = app.getByRole('search', { name: 'Filters' }).getByRole('list', { name: 'Name' })
    await expect(nameChipGroup.getByText('integration')).toBeVisible()
    await expect(app).toHaveURL(/name%5Bcontains%5D=integration/)

    // Act - Switch to Status and add status filter
    const fieldSelector = app.locator('#filter-toolbar').getByRole('button', { name: 'Name', exact: true })
    await fieldSelector.click()
    await app.getByRole('option', { name: 'Status' }).click()
    await app.getByRole('button', { name: 'Filter by status' }).click()
    await app.getByRole('option', { name: 'Error' }).click()

    // Assert - Status filter applied
    const statusChipGroup = app.getByRole('search', { name: 'Filters' }).getByRole('list', { name: 'Status' })
    await expect(statusChipGroup.getByText('Error')).toBeVisible()
    await expect(app).toHaveURL(/status=error/)

    // Act - Switch to Integration type and add filter (re-query field selector)
    const fieldSelector2 = app.locator('#filter-toolbar').getByRole('button', { name: 'Status', exact: true })
    await fieldSelector2.click()
    await app.getByRole('option', { name: 'Integration type' }).click()
    await app.getByRole('button', { name: 'Filter by integration type' }).click()
    await app.getByRole('option', { name: 'MCP Server' }).click()

    // Assert - Integration type filter applied
    const typeChipGroup = app.getByRole('search', { name: 'Filters' }).getByRole('list', { name: 'Integration type' })
    await expect(typeChipGroup.getByText('MCP Server')).toBeVisible()
    await expect(app).toHaveURL(/provider_type=mcp/)

    // Assert - All three filters active
    await expect(nameChipGroup.getByText('integration')).toBeVisible()
    await expect(statusChipGroup.getByText('Error')).toBeVisible()
    await expect(typeChipGroup.getByText('MCP Server')).toBeVisible()

    // Verify URL contains all filters
    await expect(app).toHaveURL(/name%5Bcontains%5D=integration/)
    await expect(app).toHaveURL(/status=error/)
    await expect(app).toHaveURL(/provider_type=mcp/)

    // Act - Clear all filters
    await app.getByRole('search', { name: 'Filters' }).getByRole('button', { name: 'Clear all filters' }).click()

    // Assert - All filters removed
    await expect(app.getByRole('search', { name: 'Filters' }).getByRole('list')).toHaveCount(0)
    await expect(app).not.toHaveURL(/name%5Bcontains%5D/)
    await expect(app).not.toHaveURL(/status=/)
    await expect(app).not.toHaveURL(/provider_type=/)
  })
})
