import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createLoan, getLoan } from '../fixtures/seed/loans';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

/**
 * Notification producers beyond card bills (bills.spec covers those): the per-kind switches, the
 * per-loan mute, and the EMI reminder marker driven through the on-demand `/evaluate` tick. No
 * device is registered, so nothing is pushed; the markers still advance, which is the contract.
 */
test.describe('Notifications API (producers)', () => {
  test('settings expose every kind switch, all on by default, and new kinds save like the old ones', async ({ request }) => {
    // A fresh user: the worker user's switches may already have been flipped by other specs.
    const { api } = await secondUser(request, 'notif-defaults');
    const res = await api.GET('/api/v1/notifications/settings');
    expectStatus(res, 200);
    const kinds = res.data!.kinds ?? {};
    for (const key of [
      'STATEMENT_RECEIVED',
      'BILL_DUE_REMINDER',
      'BILL_OVERDUE',
      'GMAIL_RECONNECT',
      'GMAIL_ATTENTION',
      'EMI_DUE_REMINDER',
      'EMI_OVERDUE',
    ]) {
      expect(kinds[key], `${key} defaults to on`).toBe(true);
    }
    expect(res.data!.mutedLoanIds).toEqual([]);

    const off = await api.PUT('/api/v1/notifications/settings', { body: { kinds: { EMI_OVERDUE: false } } });
    expectStatus(off, 200);
    expect(off.data!.kinds?.EMI_OVERDUE).toBe(false);
    expect(off.data!.kinds?.EMI_DUE_REMINDER).toBe(true);

    const unknown = await api.PUT('/api/v1/notifications/settings', { body: { kinds: { NOT_A_KIND: true } } });
    expectStatus(unknown, 400);

    const back = await api.PUT('/api/v1/notifications/settings', { body: { kinds: { EMI_OVERDUE: true } } });
    expectStatus(back, 200);
  });

  test('a loan can be muted and unmuted, and the loan carries the flag', async ({ api, request }) => {
    const loan = await createLoan(api, { name: 'Mute me', firstEmiDate: istToday(20), startDate: istToday(-10) });
    expect((await getLoan(api, loan.id)).loan.notificationsMuted).toBe(false);

    const muted = await api.PUT('/api/v1/notifications/loans/{loanId}/mute', {
      params: { path: { loanId: loan.id } },
      body: { muted: true },
    });
    expectStatus(muted, 200);
    expect(muted.data!.mutedLoanIds).toContain(loan.id);
    expect((await getLoan(api, loan.id)).loan.notificationsMuted).toBe(true);

    const unmuted = await api.PUT('/api/v1/notifications/loans/{loanId}/mute', {
      params: { path: { loanId: loan.id } },
      body: { muted: false },
    });
    expectStatus(unmuted, 200);
    expect(unmuted.data!.mutedLoanIds).not.toContain(loan.id);

    const { api: apiB } = await secondUser(request, 'notif-mute-b');
    await expectForeign(apiB, 'PUT', `/api/v1/notifications/loans/${loan.id}/mute`, { muted: true });
    const missing = await api.PUT('/api/v1/notifications/loans/{loanId}/mute', {
      params: { path: { loanId: '00000000-0000-0000-0000-000000000000' } },
      body: { muted: true },
    });
    expectStatus(missing, 404);
  });

  test('the on-demand tick records the EMI reminder for the current installment, idempotently', async ({ api }) => {
    // Send hour 0 so the scheduled producers run whatever the wall clock says.
    expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { sendHour: 0 } }), 200);

    // First EMI due in 3 days → the smallest reached default offset is 3.
    const due = await createLoan(api, { name: 'EMI due soon', firstEmiDate: istToday(3), startDate: istToday(-27) });
    // First EMI due in 12 days → outside every default offset, nothing recorded.
    const far = await createLoan(api, { name: 'EMI far away', firstEmiDate: istToday(12), startDate: istToday(-18) });
    // Muted loan due today → the marker still advances, it just does not push.
    const quiet = await createLoan(api, { name: 'EMI muted', firstEmiDate: istToday(0), startDate: istToday(-30) });
    expectStatus(
      await api.PUT('/api/v1/notifications/loans/{loanId}/mute', { params: { path: { loanId: quiet.id } }, body: { muted: true } }),
      200,
    );

    const first = await api.POST('/api/v1/notifications/evaluate');
    expectStatus(first, 200);
    expect(first.data!.failed).toBe(0);
    expect(first.data!.recorded).toBeGreaterThanOrEqual(2);
    expect(first.data!.sent, 'no device is registered').toBe(0);

    const dueLoan = (await getLoan(api, due.id)).loan;
    expect(dueLoan.lastNotifiedKind).toBe('DUE_3');
    expect(dueLoan.lastNotifiedOn).toBe(istToday());
    const farLoan = (await getLoan(api, far.id)).loan;
    expect(farLoan.lastNotifiedKind ?? null).toBeNull();
    const quietLoan = (await getLoan(api, quiet.id)).loan;
    expect(quietLoan.lastNotifiedKind).toBe('DUE_0');

    // Running the tick again changes nothing for these loans.
    const second = await api.POST('/api/v1/notifications/evaluate');
    expectStatus(second, 200);
    expect((await getLoan(api, due.id)).loan.lastNotifiedKind).toBe('DUE_3');
    expect((await getLoan(api, due.id)).loan.lastNotifiedOn).toBe(istToday());
  });

  test('an installment overdue since before the loan was entered is history, not a nag', async ({ api }) => {
    expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { sendHour: 0 } }), 200);
    const backfilled = await createLoan(api, { name: 'Backfilled', firstEmiDate: istToday(-5), startDate: istToday(-35) });

    expectStatus(await api.POST('/api/v1/notifications/evaluate'), 200);

    expect((await getLoan(api, backfilled.id)).loan.lastNotifiedKind ?? null).toBeNull();
  });

  test('rejects anonymous callers', async () => {
    await expectUnauthenticated('POST', '/api/v1/notifications/evaluate');
    await expectUnauthenticated('PUT', '/api/v1/notifications/loans/00000000-0000-0000-0000-000000000000/mute', { muted: true });
  });
});
