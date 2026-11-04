import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createCreditCard } from '../fixtures/seed/accounts';
import { createLoan } from '../fixtures/seed/loans';
import { expect, test } from '../fixtures/test';

/**
 * /settings/notifications in a real browser: the switch groups, offsets and send hour, per-card and
 * per-loan mutes (every change saves immediately and survives a reload), the devices list, and the
 * this-device card offering to enable push (the E2E server carries VAPID keys; the prompt itself is
 * never clicked).
 */
// The kind switches carry a generic "Toggle" name, so find each one from its row label.
const kindSwitch = (page: Page, label: string) =>
  page
    .getByText(label, { exact: true })
    .locator('xpath=ancestor::*[.//*[@role="switch"]][1]')
    .getByRole('switch');

// Every change saves in the background (the switch moves first), so wait for the save before moving on.
const saved = (page: Page) => page.waitForResponse((r) => r.request().method() === 'POST' && r.ok());

test.describe('Notification settings UI (@ui)', () => {
  let user: CreatedUser;
  let cardName: string;
  let loanName: string;

  test.beforeEach(async ({ context, request }) => {
    user = await createUser(request, 'ui-notifications');
    await loginContext(context, user.cookie);
    const api = makeApi(user.cookie);
    cardName = `Mute Card ${Date.now()}`;
    loanName = `Mute Loan ${Date.now()}`;
    await createCreditCard(api, { name: cardName, last4: '7401' });
    await createLoan(api, { name: loanName, firstEmiDate: istToday(20), startDate: istToday(-10) });
  });

  test('switch groups, a kind toggle, an offset, and card/loan mutes persist across a reload', async ({ page }) => {
    await page.goto('/settings/notifications');
    await expect(page.getByRole('banner')).toContainText('Notifications');
    await expect(page.getByRole('navigation', { name: 'Settings sections' })).toHaveCount(0); // a section page shows no list

    // Every module has its own card of switches.
    for (const group of ['Push', 'Bills & EMIs', 'Statements', 'Gmail & jobs', 'Rewards', 'Muted']) {
      await expect(page.getByText(group, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText('Days before due')).toBeVisible();

    // This browser can do push and the server is configured: the enable button is offered.
    await expect(page.getByRole('button', { name: 'Turn on here' })).toBeVisible();
    await expect(page.getByText('No devices yet')).toBeVisible();

    // A kind switch saves immediately.
    const emiOverdue = kindSwitch(page, 'EMI overdue');
    await expect(emiOverdue).toBeChecked();
    await Promise.all([saved(page), emiOverdue.click()]);
    await expect(emiOverdue).not.toBeChecked();

    // An extra reminder offset.
    await page.getByRole('button', { name: 'Days before due' }).click();
    const fourteen = page.getByRole('option', { name: '14 days before' });
    await expect(fourteen).toHaveAttribute('aria-selected', 'false');
    await Promise.all([saved(page), fourteen.click()]);
    await expect(fourteen).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');

    // Per-card and per-loan mutes.
    const cardMute = page.getByRole('switch', { name: `Mute ${cardName}` });
    await Promise.all([saved(page), cardMute.click()]);
    await expect(cardMute).toBeChecked();
    const loanMute = page.getByRole('switch', { name: `Mute ${loanName}` });
    await Promise.all([saved(page), loanMute.click()]);
    await expect(loanMute).toBeChecked();

    // Everything was saved on the server, not just in the page.
    await page.reload();
    await expect(page.getByRole('banner')).toContainText('Notifications');
    await expect(page.getByRole('navigation', { name: 'Settings sections' })).toHaveCount(0); // a section page shows no list
    await expect(kindSwitch(page, 'EMI overdue')).not.toBeChecked();
    await page.getByRole('button', { name: 'Days before due' }).click();
    await expect(page.getByRole('option', { name: '14 days before' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('switch', { name: `Mute ${cardName}` })).toBeChecked();
    await expect(page.getByRole('switch', { name: `Mute ${loanName}` })).toBeChecked();

    // And unmuting works the same way.
    await page.getByRole('switch', { name: `Mute ${loanName}` }).click();
    await expect(page.getByRole('switch', { name: `Mute ${loanName}` })).not.toBeChecked();
  });
});
