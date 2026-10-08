import { makeApi } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('Dashboards UI: default toggle keeps Home intact (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-dash-toggle');
    await loginContext(context, currentUser.cookie);
  });

  test('clearing and re-setting the default on Home keeps its four built-in widgets and /dashboard still renders them', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);

    await page.goto('/dashboards');
    await page.waitForLoadState('networkidle');
    const list = await api.GET('/api/v1/dashboards');
    expectStatus(list, 200);
    const home = list.data!.find((d) => d.name === 'Home')!;
    expect(home.isDefault).toBe(true);

    const card = page.locator('div.flex-col.gap-3', { has: page.getByRole('link', { name: 'Home', exact: true }) });
    await card.getByTitle('Clear default').click();
    await expectToast(page, 'Default cleared');
    await expect(card.getByTitle('Set as default')).toBeVisible();
    expect((await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: home.id } } })).data!.isDefault).toBe(false);

    await card.getByTitle('Set as default').click();
    await expectToast(page, 'Set as default');
    await expect(card.getByTitle('Clear default')).toBeVisible();

    const after = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: home.id } } });
    expectStatus(after, 200);
    expect(after.data!.isDefault).toBe(true);
    const builtins = after.data!.widgets.filter((w) => w.kind === 'builtin');
    expect(builtins.map((w) => w.builtinKey).sort()).toEqual(['attention', 'bills_due', 'net_worth', 'upcoming']);
    expect(builtins.find((w) => w.builtinKey === 'upcoming')!.params).toEqual({ days: 14 });
    expect(after.data!.widgets).toHaveLength(5);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Net worth').first()).toBeVisible();
    await expect(page.getByText('Upcoming').first()).toBeVisible();
  });
});
