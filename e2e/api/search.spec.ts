import { E2E_API_URL } from '../fixtures/config';
import { seedSearch } from '../fixtures/seed/search';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

interface SearchBody {
  accounts: Array<{ id: string }>;
  transactions: Array<{ id: string; description: string }>;
  holdings: unknown[];
  people: Array<{ id: string }>;
  loans: Array<{ id: string }>;
  reports: Array<{ id: string }>;
  dashboards: Array<{ id: string }>;
}

const GROUPS = ['accounts', 'transactions', 'holdings', 'people', 'loans', 'reports', 'dashboards'] as const;

async function search(cookie: string, q: string) {
  const res = await fetch(`${E2E_API_URL}/api/v1/search?q=${encodeURIComponent(q)}`, {
    headers: { Cookie: `FINANCEOS_SESSION=${cookie}` },
  });
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as SearchBody };
}

test.describe('Global search API (@api)', () => {
  test('rejects text under 3 characters (after trimming) and over 100 with 400', async ({ request }) => {
    const { cookie } = await newUser(request, 'search-len');
    for (const q of ['', 'a', 'ab', '  ab  ', '   ']) {
      expect((await search(cookie, q)).status, `q="${q}"`).toBe(400);
    }
    expect((await search(cookie, 'x'.repeat(101))).status).toBe(400);
    expect((await search(cookie, 'abc')).status).toBe(200);
    expect((await search(cookie, 'x'.repeat(100))).status).toBe(200);
  });

  test('requires a session', async () => {
    const res = await fetch(`${E2E_API_URL}/api/v1/search?q=abc`);
    expect([401, 403]).toContain(res.status);
  });

  test('always returns every group, empty when nothing matches', async ({ request }) => {
    const { cookie } = await newUser(request, 'search-empty');
    const { status, body } = await search(cookie, 'qqqnomatch');
    expect(status).toBe(200);
    for (const g of GROUPS) expect(body[g], g).toEqual([]);
  });

  test('finds a record in each group and returns the 5 newest of 7 matching transactions', async ({ request }) => {
    const { api, cookie } = await newUser(request, 'search-find');
    const seeded = await seedSearch(api, 'Zephyr', 7);

    const { status, body } = await search(cookie, 'zephyr');
    expect(status).toBe(200);
    expect(body.accounts.map((a) => a.id)).toContain(seeded.card.id);
    expect(body.people.map((p) => p.id)).toEqual([seeded.person.id]);
    expect(body.loans.map((l) => l.id)).toEqual([seeded.loan.id]);
    expect(body.reports.map((r) => r.id)).toContain(seeded.report.id);
    expect(body.dashboards.map((d) => d.id)).toContain(seeded.dashboard.id);

    // Transactions were dated 1..7 days ago, so purchase 1 is the newest.
    expect(body.transactions.map((t) => t.description)).toEqual([1, 2, 3, 4, 5].map((i) => `Zephyr purchase ${i}`));
  });

  test('caps every group at 5', async ({ request }) => {
    const { api, cookie } = await newUser(request, 'search-cap');
    // Each round has its own word so names stay unique, and all of them contain "Zephyr".
    for (let i = 0; i < 7; i++) await seedSearch(api, `Zephyr${i}`, 1);

    const { body } = await search(cookie, 'Zephyr');
    for (const g of GROUPS) expect(body[g].length, g).toBeLessThanOrEqual(5);
    expect(body.accounts).toHaveLength(5);
    expect(body.transactions).toHaveLength(5);
    expect(body.people).toHaveLength(5);
    expect(body.loans).toHaveLength(5);
    expect(body.reports).toHaveLength(5);
    expect(body.dashboards).toHaveLength(5);
  });

  test('never returns another user’s records in any group', async ({ request }) => {
    const a = await newUser(request, 'search-a');
    const b = await newUser(request, 'search-b');
    const seededA = await seedSearch(a.api, 'Zephyr', 2);
    const seededB = await seedSearch(b.api, 'Zephyr', 2);

    const forA = (await search(a.cookie, 'Zephyr')).body;
    const forB = (await search(b.cookie, 'Zephyr')).body;

    const idsOf = (body: SearchBody) =>
      new Set(
        [body.accounts, body.transactions, body.people, body.loans, body.reports, body.dashboards].flatMap((g) =>
          (g as Array<{ id: string }>).map((r) => r.id),
        ),
      );
    const idsA = idsOf(forA);
    const idsB = idsOf(forB);
    expect(idsA.has(seededA.card.id)).toBe(true);
    expect(idsB.has(seededB.card.id)).toBe(true);
    for (const id of idsA) expect(idsB.has(id), `${id} is in both users' results`).toBe(false);
    for (const id of [seededB.card.id, seededB.loan.id, seededB.report.id, seededB.dashboard.id, seededB.person.id]) {
      expect(idsA.has(id), id).toBe(false);
    }
  });
});
