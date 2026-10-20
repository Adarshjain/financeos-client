import { expectStatus } from '../fixtures/api';
import { llmCalls, scriptLlm } from '../fixtures/control';
import { istToday } from '../fixtures/dates';
import { genCardPdf } from '../fixtures/gen/statements';
import { createCreditCard } from '../fixtures/seed/accounts';
import { getInbox } from '../fixtures/seed/nav';
import { getAccountStatements, getStatement, uploadAndIngest } from '../fixtures/seed/statements';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

type Api = Awaited<ReturnType<typeof newUser>>['api'];

interface Gappy {
  last4: string;
  periodStart?: string;
  periodEnd?: string;
  omitDueDate?: boolean;
  omitMinimumDue?: boolean;
}

/** Card statement PDF (synthetic) with the chosen printed fields left out. */
async function gappyPdf(g: Gappy): Promise<Buffer> {
  const periodEnd = g.periodEnd ?? istToday(-3);
  return genCardPdf({
    issuer: 'HDFC Bank',
    cardLast4: g.last4,
    statementDate: periodEnd,
    periodStart: g.periodStart ?? istToday(-32),
    periodEnd,
    previousBalance: 0,
    paymentsReceived: 0,
    financeCharges: 0,
    creditLimit: 100000,
    omitDueDate: g.omitDueDate,
    omitMinimumDue: g.omitMinimumDue,
    rows: [
      { date: g.periodStart ?? istToday(-20), description: 'AMAZON ONLINE SHOPPING', debit: 4500 },
      { date: periodEnd, description: 'RESTAURANT DINING', debit: 1500 },
    ],
  });
}

async function ingest(api: Api, cardId: string, g: Gappy, filename = `gap-${g.last4}.pdf`) {
  const buffer = await gappyPdf(g);
  const out = await uploadAndIngest(api, cardId, [{ filename, buffer }]);
  return { ...out, buffer, filename };
}

/** Script the statement-details LLM task to answer nothing, once per ingest that will call it. */
const noAi = (api: Api, n = 1) => scriptLlm(api, 'statement-details', Array.from({ length: n }, () => ({ json: {} })));

const gapItems = (inbox: Awaited<ReturnType<typeof getInbox>>) => inbox.items.filter((i) => i.kind === 'statement_details_missing');

test.describe('Statement details API (@api)', () => {
  test('statement list and detail expose missingDetails (due date missing, minimum missing)', async ({ request }) => {
    const { api } = await newUser(request, 'sd-missing');
    const card = await createCreditCard(api, { name: 'Gap Card', last4: '9101' });
    await noAi(api);
    await ingest(api, card.id, { last4: '9101', omitDueDate: true, omitMinimumDue: true });

    const list = await getAccountStatements(api, card.id);
    expect(list).toHaveLength(1);
    const missing = list[0].missingDetails;
    expect(missing).toContain('DUE_DATE');
    expect(missing).toContain('MINIMUM_DUE');
    expect(missing).not.toContain('PERIOD_START');
    expect(missing).not.toContain('PERIOD_END');
    expect(missing).not.toContain('TOTAL_DUE');

    const detail = await getStatement(api, list[0].id);
    expect(detail.missingDetails).toEqual(missing);
  });

  test('a statement with everything printed has no missing details', async ({ request }) => {
    const { api } = await newUser(request, 'sd-complete');
    const card = await createCreditCard(api, { name: 'Full Card', last4: '9102' });
    await ingest(api, card.id, { last4: '9102' });
    const list = await getAccountStatements(api, card.id);
    expect(list[0].missingDetails).toEqual([]);
    expect(gapItems(await getInbox(api))).toHaveLength(0);
  });

  test('bill rows carry missingDetails too', async ({ request }) => {
    const { api } = await newUser(request, 'sd-bill');
    const card = await createCreditCard(api, { name: 'Bill Gap Card', last4: '9103' });
    await noAi(api);
    await ingest(api, card.id, { last4: '9103', omitDueDate: true });
    const res = await api.GET('/api/v1/bills', { params: { query: { accountId: card.id } } });
    expectStatus(res, 200);
    const row = res.data!.find((b) => b.statementId);
    expect(row!.missingDetails).toContain('DUE_DATE');
  });

  test('the inbox lists one row per card with gaps, opening the newest gappy statement', async ({ request }) => {
    const { api } = await newUser(request, 'sd-inbox');
    const card = await createCreditCard(api, { name: 'Inbox Gap Card', last4: '9104' });
    await noAi(api, 2);
    await ingest(api, card.id, { last4: '9104', periodStart: '2026-01-01', periodEnd: '2026-01-31', omitDueDate: true }, 'older.pdf');
    await ingest(api, card.id, { last4: '9104', periodStart: '2026-02-01', periodEnd: '2026-02-28', omitMinimumDue: true }, 'newer.pdf');

    const list = await getAccountStatements(api, card.id);
    expect(list).toHaveLength(2);
    const newest = list.find((s) => s.periodEnd === '2026-02-28')!;

    const items = gapItems(await getInbox(api));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'statement_details_missing',
      title: 'Statement details missing',
      href: `/ds/accounts/${card.id}/statements?statement=${newest.id}`,
    });
    expect(items[0].actions.map((a) => a.type)).toEqual(['open', 'snooze']);
  });

  test('the bill DUE_UNKNOWN row for a statement without a due date is suppressed from the inbox', async ({ request }) => {
    const { api } = await newUser(request, 'sd-suppress');
    const card = await createCreditCard(api, { name: 'Suppress Card', last4: '9105' });
    await noAi(api);
    await ingest(api, card.id, { last4: '9105', omitDueDate: true });
    const inbox = await getInbox(api);
    expect(gapItems(inbox)).toHaveLength(1);
    expect(inbox.items.filter((i) => i.kind === 'bill')).toHaveLength(0);
  });

  test('PATCH details fills the gaps: missingDetails empties and the inbox row goes', async ({ request }) => {
    const { api } = await newUser(request, 'sd-fill');
    const card = await createCreditCard(api, { name: 'Fill Card', last4: '9106' });
    await noAi(api);
    await ingest(api, card.id, { last4: '9106', omitDueDate: true, omitMinimumDue: true });
    const [stmt] = await getAccountStatements(api, card.id);

    const res = await api.PATCH('/api/v1/bills/{statementId}/details', {
      params: { path: { statementId: stmt.id } },
      body: { paymentDueDate: istToday(12), minimumAmountDue: 300 },
    });
    expectStatus(res, 200);
    expect(res.data!.missingDetails).toEqual([]);
    expect((await getStatement(api, stmt.id)).missingDetails).toEqual([]);
    expect(gapItems(await getInbox(api))).toHaveLength(0);
  });

  test('an old (2021) statement is valid and can be filled', async ({ request }) => {
    const { api } = await newUser(request, 'sd-old');
    const card = await createCreditCard(api, { name: 'Old Card', last4: '9107' });
    await noAi(api);
    await ingest(api, card.id, { last4: '9107', periodStart: '2021-05-01', periodEnd: '2021-05-31', omitDueDate: true });
    const [stmt] = await getAccountStatements(api, card.id);
    expect(stmt.periodEnd).toBe('2021-05-31');
    expect(stmt.missingDetails).toContain('DUE_DATE');
    const res = await api.PATCH('/api/v1/bills/{statementId}/details', {
      params: { path: { statementId: stmt.id } },
      body: { paymentDueDate: '2021-06-15' },
    });
    expectStatus(res, 200);
    expect((await getStatement(api, stmt.id)).missingDetails).not.toContain('DUE_DATE');
  });

  test.describe('PATCH validation', () => {
    const cases: { name: string; body: Record<string, unknown>; message: string }[] = [
      { name: 'period start after period end', body: { periodStart: '2026-03-10', periodEnd: '2026-03-01' }, message: 'Period start must be on or before period end' },
      { name: 'period longer than 400 days', body: { periodStart: '2024-01-01', periodEnd: '2026-03-01' }, message: 'Statement period cannot be longer than 400 days' },
      { name: 'due date more than 60 days after period end', body: { periodStart: '2026-02-01', periodEnd: '2026-03-01', paymentDueDate: '2026-06-01' }, message: 'Due date must be 0 to 60 days after the period end' },
      { name: 'due date before period end', body: { periodStart: '2026-02-10', periodEnd: '2026-03-10', paymentDueDate: '2026-03-01' }, message: 'Due date must be 0 to 60 days after the period end' },
      { name: 'minimum above total', body: { totalAmountDue: 1000, minimumAmountDue: 2000 }, message: 'Minimum due cannot exceed total due' },
    ];
    for (const c of cases) {
      test(`rejects ${c.name}`, async ({ request }) => {
        const { api } = await newUser(request, 'sd-val');
        const card = await createCreditCard(api, { name: 'Validation Card', last4: '9108' });
        await noAi(api);
        await ingest(api, card.id, { last4: '9108', omitDueDate: true });
        const [stmt] = await getAccountStatements(api, card.id);
        const res = await api.PATCH('/api/v1/bills/{statementId}/details', {
          params: { path: { statementId: stmt.id } },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body: c.body as any,
        });
        expectStatus(res, 400);
        expect(JSON.stringify(res.error)).toContain(c.message);
      });
    }
  });

  test('re-uploading the same file for a statement with gaps is SKIPPED and reports filledDetails', async ({ request }) => {
    const { api } = await newUser(request, 'sd-reupload');
    const card = await createCreditCard(api, { name: 'Reupload Card', last4: '9109' });
    await noAi(api);
    const first = await ingest(api, card.id, { last4: '9109', omitDueDate: true });
    expect(first.result.fileDetails[0].status).toBe('SUCCESS');

    const again = await uploadAndIngest(api, card.id, [{ filename: first.filename, buffer: first.buffer }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = again.result.fileDetails[0] as any;
    expect(file.status).toBe('SKIPPED');
    expect(file.errorMessage).toMatch(/^Statement already ingested; /);
    expect(file.filledDetails).toEqual([]);
    expect(file.errorMessage).toContain('nothing new to fill');
  });
  test.describe('AI fallback at ingestion', () => {
    test('AI fills the missing due date and minimum', async ({ request }) => {
      const { api } = await newUser(request, 'sd-ai-fill');
      const card = await createCreditCard(api, { name: 'AI Fill Card', last4: '9111' });
      const periodEnd = istToday(-3);
      const due = istToday(17);
      await scriptLlm(api, 'statement-details', [{ json: { paymentDueDate: due, minimumAmountDue: 100 } }]);
      await ingest(api, card.id, { last4: '9111', periodEnd, omitDueDate: true, omitMinimumDue: true });
      const [stmt] = await getAccountStatements(api, card.id);
      expect(stmt.missingDetails).toEqual([]);
      const detail = await getStatement(api, stmt.id);
      expect(detail.missingDetails).toEqual([]);
      expect(detail.cardDetails?.paymentDueDate).toBe(due);
      expect(detail.cardDetails?.minimumAmountDue).toBe(100);
      expect(gapItems(await getInbox(api))).toHaveLength(0);
    });

    test('invalid AI answers are dropped', async ({ request }) => {
      const { api } = await newUser(request, 'sd-ai-invalid');
      const card = await createCreditCard(api, { name: 'AI Invalid Card', last4: '9112' });
      const periodEnd = istToday(-3);
      await scriptLlm(api, 'statement-details', [{ json: { paymentDueDate: istToday(87), minimumAmountDue: 99999999 } }]);
      await ingest(api, card.id, { last4: '9112', periodEnd, omitDueDate: true, omitMinimumDue: true });
      const [stmt] = await getAccountStatements(api, card.id);
      expect(stmt.missingDetails).toContain('DUE_DATE');
      expect(stmt.missingDetails).toContain('MINIMUM_DUE');
    });

    test('an AI error leaves the gaps and the ingest still succeeds', async ({ request }) => {
      const { api } = await newUser(request, 'sd-ai-error');
      const card = await createCreditCard(api, { name: 'AI Error Card', last4: '9113' });
      await scriptLlm(api, 'statement-details', [{ error: { kind: 'NO_KEYS', message: 'x' } }]);
      const out = await ingest(api, card.id, { last4: '9113', omitDueDate: true, omitMinimumDue: true });
      expect(out.result.fileDetails[0].status).toBe('SUCCESS');
      const [stmt] = await getAccountStatements(api, card.id);
      expect(stmt.missingDetails).toContain('DUE_DATE');
      expect(stmt.missingDetails).toContain('MINIMUM_DUE');
    });

    test('nothing missing means no statement-details call', async ({ request }) => {
      const { api } = await newUser(request, 'sd-ai-none');
      const card = await createCreditCard(api, { name: 'AI None Card', last4: '9114' });
      const before = (await llmCalls(api, 'statement-details')).length;
      await ingest(api, card.id, { last4: '9114' });
      expect((await llmCalls(api, 'statement-details')).length).toBe(before);
    });

    test('the prompt is masked and asks only for the missing fields', async ({ request }) => {
      const { api } = await newUser(request, 'sd-ai-prompt');
      const card = await createCreditCard(api, { name: 'AI Prompt Card', last4: '9115' });
      await noAi(api);
      await ingest(api, card.id, { last4: '9115', omitDueDate: true, omitMinimumDue: true });
      const calls = await llmCalls(api, 'statement-details');
      expect(calls.length).toBeGreaterThanOrEqual(1);
      const prompt = calls[calls.length - 1].prompt;
      expect(prompt).not.toMatch(/\d{8,}/);
      expect(prompt).toContain('paymentDueDate');
      expect(prompt).toContain('minimumAmountDue');
      expect(prompt).not.toContain('periodStart');
      expect(prompt).not.toContain('periodEnd');
      expect(prompt).not.toContain('totalAmountDue');
    });
  });
});
