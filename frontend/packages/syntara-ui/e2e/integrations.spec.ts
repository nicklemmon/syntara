import { test, expect, toAppUrl } from './fixtures'
import { isSkipWebServerForPlaywrightTests } from './playwrightWebServerEnv'

const isRealBackend = isSkipWebServerForPlaywrightTests()

test.describe('Integration status display', () => {
  test.skip(isRealBackend, 'relies on mock API seed data')

  test('error status badge shows validation error tooltip on hover', async ({ app }) => {
    await app.goto(toAppUrl('/configuration/integrations'))
    await expect(app.getByRole('heading', { level: 1, name: 'Integrations' })).toBeVisible()

    const jiraRow = app.getByRole('row', { name: /Jira Integration/ })
    await expect(jiraRow).toBeVisible()

    const errorLabel = jiraRow.getByText('Error')
    await errorLabel.hover()
    await expect(app.getByRole('tooltip')).toHaveText('Connection refused')
  })

  test('available status badge does not show tooltip on hover', async ({ app }) => {
    await app.goto(toAppUrl('/configuration/integrations'))
    await expect(app.getByRole('heading', { level: 1, name: 'Integrations' })).toBeVisible()

    const copilotRow = app.getByRole('row', { name: /GitHub Copilot/ })
    await expect(copilotRow).toBeVisible()

    const availableLabel = copilotRow.getByText('Available')
    await availableLabel.hover()
    await expect(app.getByRole('tooltip')).not.toBeAttached({ timeout: 1000 })
  })
})
