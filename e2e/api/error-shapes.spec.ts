import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import { expect, test } from '../fixtures/test';

test.describe('Error Shapes & Missing Request Parameters/Parts (400)', () => {
  test('GET /accounts/{id}/gmail-cleanup-preview without ?before= returns 400 VALIDATION_ERROR', async ({
    api,
  }) => {
    const account = await createBankAccount(api);

    // Call without ?before= query parameter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (api as any).GET(
      `/api/v1/accounts/${account.id}/gmail-cleanup-preview`
    );
    expectStatus(res, 400);
    expect((res.error as any)?.code).toBe('VALIDATION_ERROR');
    expect((res.error as any)?.details?.parameter).toBe('before');
  });

  test('POST /accounts/{id}/gmail-cleanup without ?before= returns 400 VALIDATION_ERROR', async ({
    api,
  }) => {
    const account = await createBankAccount(api);

    // Call without ?before= query parameter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (api as any).POST(
      `/api/v1/accounts/${account.id}/gmail-cleanup`
    );
    expectStatus(res, 400);
    expect((res.error as any)?.code).toBe('VALIDATION_ERROR');
    expect((res.error as any)?.details?.parameter).toBe('before');
  });

  test('POST /accounts/{id}/ingest without files multipart returns 400 VALIDATION_ERROR', async ({
    api,
  }) => {
    const account = await createBankAccount(api);

    // Send empty FormData (no 'files' part)
    const emptyForm = new FormData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (api as any).POST('/api/v1/accounts/{accountId}/ingest', {
      params: { path: { accountId: account.id } },
      body: emptyForm,
      bodySerializer: (b: unknown) => b,
    });
    expectStatus(res, 400);
    expect((res.error as any)?.code).toBe('VALIDATION_ERROR');
    expect((res.error as any)?.details?.part).toBe('files');
  });
});
