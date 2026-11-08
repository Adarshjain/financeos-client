import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm } from '../fixtures/control';
import type { GoogleIdentity } from '../fixtures/google-stubs';
import { cleanupIdentity, registerIdentity, registerMailbox, registerMessageGone, removeMappings } from '../fixtures/google-stubs';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  connectGmail,
  createSender,
  extractedTxn,
  extractionFor,
  htmlAlertMail,
  isoDaysAgo,
  runSync,
  scriptExtractions,
  waitForGmailJobsIdle,
} from '../fixtures/seed/gmail';
import { expect, test } from '../fixtures/test';

/** "View email" in a Needs attention email's Details: the mail itself, no images or scripts, and the gone state. */
test.describe('Gmail View email UI (@ui)', () => {
  test.describe.configure({ mode: 'serial' });

  let user: CreatedUser;
  let api: ReturnType<typeof makeApi>;
  let identity: GoogleIdentity;
  const mail = htmlAlertMail({ last4: '9999', amount: 640, merchant: 'UBER', date: isoDaysAgo(3) });

  test.beforeAll(async ({ request }) => {
    user = await createUser(request, 'ui-gmail-view');
    api = makeApi(user.cookie);
    identity = await registerIdentity();
    await createBankAccount(api, { name: 'E2E View Bank', last4: '1234', ingestFromDate: isoDaysAgo(60) });
    await createSender(api);
    const connectMailbox = await registerMailbox(identity, []);
    await connectGmail(api, identity);
    await waitForGmailJobsIdle(api);
    await removeMappings(connectMailbox.mappingIds);
    await registerMailbox(identity, [mail]);
    await scriptExtractions(api, [
      extractionFor(mail, { json: extractedTxn({ amount: 640, date: isoDaysAgo(3), last4: '9999', merchant: 'UBER' }) }),
    ]);
    await runSync(api);
  });

  test.beforeEach(async ({ context }) => {
    await loginContext(context, user.cookie);
  });

  test.afterAll(async () => {
    await resetLlm(api);
    await cleanupIdentity(identity);
  });

  test('View email shows the text, no image and no script; a deleted mail shows the gone state', async ({ page }) => {
    test.slow();
    await page.goto('/settings/connections');
    await page.getByTestId('attention-number').filter({ hasText: '••9999' }).getByRole('button', { name: 'Details' }).click();
    const emails = page.getByRole('dialog', { name: 'Emails for this number' });
    await emails.getByRole('button', { name: 'Details' }).click();
    await expect(emails.getByRole('link', { name: 'Open in Gmail' })).toBeVisible();

    await emails.getByRole('button', { name: 'View email' }).click();
    const viewer = page.getByRole('dialog', { name: mail.subject });
    await expect(viewer).toBeVisible();
    const frame = page.getByTestId('view-email-frame');
    await expect(frame).toHaveAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
    const body = page.frameLocator('[data-testid="view-email-frame"]');
    await expect(body.getByText('Dear Customer')).toBeVisible();
    await expect(body.getByText('E2E Bank logo')).toBeVisible();
    await expect(body.getByRole('link', { name: 'Help centre' })).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(body.locator('img')).toHaveCount(0);
    await expect(body.locator('script')).toHaveCount(0);
    await expect(body.locator('body')).not.toContainText('pwned');

    await viewer.getByRole('button', { name: 'Close' }).last().click();
    await expect(viewer).toBeHidden();

    await registerMessageGone(identity, mail.id);
    await emails.getByRole('button', { name: 'View email' }).click();
    await expect(page.getByText('This email is no longer in your mailbox.')).toBeVisible();
    await expect(page.getByTestId('view-email-frame')).toHaveCount(0);
  });
});
