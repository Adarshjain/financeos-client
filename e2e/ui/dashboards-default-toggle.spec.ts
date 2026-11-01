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
    const list = await api.GET('/api/v1/dashboards');
    expectStatus(list, 200);
    const home = list.data!.find((d) => d.name === 'Home')!;
    expect(home.isDefault).toBe(true);

    const row = page.getByRole('table').getByRole('button').filter({ hasText: /^Home/ });
    await expect(row).toBeVisible({ timeout: 45_000 });
    await page.getByRole('button', { name: 'Options for Home', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Clear default' }).click();
    await expectToast(page, 'Default cleared');
    await expect(page.getByRole('menuitem')).toHaveCount(0);
    expect((await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: home.id } } })).data!.isDefault).toBe(false);

    await page.getByRole('button', { name: 'Options for Home', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Set as default' }).click();
    await expectToast(page, 'Default dashboard set');

    const after = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: home.id } } });
    expectStatus(after, 200);
    expect(after.data!.isDefault).toBe(true);
    const builtins = after.data!.widgets.filter((w) => w.kind === 'builtin');
    expect(builtins.map((w) => w.builtinKey).sort()).toEqual(['attention', 'bills_due', 'net_worth', 'upcoming']);
    expect(builtins.find((w) => w.builtinKey === 'upcoming')!.params).toEqual({ days: 14 });
    expect(after.data!.widgets).toHaveLength(5);

    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-widget').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('dashboard-widget')).toHaveCount(5);
    await expect(page.getByText('Net worth').first()).toBeVisible();
    await expect(page.getByText('Upcoming').first()).toBeVisible();
  });
});
