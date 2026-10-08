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
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();

    // Every module has its own group of switches.
    for (const group of ['Credit cards', 'Transactions', 'Loans and lendings', 'Rewards', 'Gmail', 'Imports and jobs']) {
      await expect(page.getByTestId(`kind-group-${group}`)).toBeVisible();
    }
    await expect(page.getByText('Remind me (bills and EMIs)')).toBeVisible();

    // This browser can do push and the server is configured: the enable button is offered.
    await expect(page.getByRole('button', { name: /enable on this device/i })).toBeVisible();
    await expect(page.getByText('No device is registered yet.')).toBeVisible();

    // A kind switch saves immediately.
    const emiOverdue = page.getByRole('checkbox', { name: 'EMI overdue' });
    await expect(emiOverdue).toHaveAttribute('data-state', 'checked');
    await emiOverdue.click();
    await expect(emiOverdue).toHaveAttribute('data-state', 'unchecked');

    // An extra reminder offset.
    const offsets = page.getByTestId('reminder-offsets');
    await offsets.getByRole('button', { name: '14 days before' }).click();
    await expect(offsets.getByRole('button', { name: '14 days before' })).toHaveAttribute('aria-pressed', 'true');

    // Per-card and per-loan mutes.
    const cardMute = page.getByRole('checkbox', { name: `Mute ${cardName}` });
    await cardMute.click();
    await expect(cardMute).toHaveAttribute('data-state', 'checked');
    const loanMute = page.getByRole('checkbox', { name: `Mute ${loanName}` });
    await loanMute.click();
    await expect(loanMute).toHaveAttribute('data-state', 'checked');

    // Everything was saved on the server, not just in the page.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'EMI overdue' })).toHaveAttribute('data-state', 'unchecked');
    await expect(page.getByTestId('reminder-offsets').getByRole('button', { name: '14 days before' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('checkbox', { name: `Mute ${cardName}` })).toHaveAttribute('data-state', 'checked');
    await expect(page.getByRole('checkbox', { name: `Mute ${loanName}` })).toHaveAttribute('data-state', 'checked');

    // And unmuting works the same way.
    await page.getByRole('checkbox', { name: `Mute ${loanName}` }).click();
    await expect(page.getByRole('checkbox', { name: `Mute ${loanName}` })).toHaveAttribute('data-state', 'unchecked');
  });
});
