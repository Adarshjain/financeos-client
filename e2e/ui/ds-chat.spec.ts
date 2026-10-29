import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { scriptChat } from '../fixtures/chat';
import { resetLlm, scriptLlm, setLlmMode } from '../fixtures/control';
import { createReport } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

const PLACEHOLDER = 'Ask about your money…';
const STARTER = 'Who still owes me money, and how much?';
const TITLE = 'Money owed to me';

const blocks = JSON.stringify({
  stats: [{ label: 'Owed to you', value: '₹12,500', delta: '+8% vs last month', sentiment: 'bad' }],
  tables: [
    {
      title: 'Where it went',
      columns: [
        { key: 'category', label: 'Category' },
        { key: 'spent', label: 'Spent', format: 'inr' },
      ],
      rows: [
        { category: 'Dining', spent: 12500 },
        { category: 'Shopping', spent: 8000 },
      ],
    },
  ],
  followUps: ['Compare with last month'],
});

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900, tag: '@ui' },
  { name: 'phone 390px', width: 390, height: 844, tag: '@ui @mobile' },
];

const BUSY = 'Ask the data is busy with another answer. Try again in a moment.';

/** Waits for `text`. The server answers one chat at a time across users, so a busy banner is retried until the answer lands. */
async function answer(page: Page, text: string | RegExp) {
  for (let i = 0; i < 8; i++) {
    const outcome = await Promise.race([
      page.getByText(text).first().waitFor({ timeout: 10_000 }).then(() => 'answer'),
      page.getByText(BUSY).waitFor({ timeout: 10_000 }).then(() => 'busy'),
    ]).catch(() => 'none');
    if (outcome === 'busy') {
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: 'Retry' }).click();
    } else break;
  }
  await expect(page.getByText(text).first()).toBeVisible();
}

async function ask(page: Page, text: string) {
  const field = page.getByPlaceholder(PLACEHOLDER);
  await field.fill(text);
  await field.press('Enter');
}

for (const viewport of VIEWPORTS) {
  const phone = viewport.width < 641;

  test.describe(`/chat, ${viewport.name} (${viewport.tag})`, () => {
    let currentUser: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-chat');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const api = makeApi(currentUser.cookie);
      await resetLlm(api);
      await setLlmMode(api, 'SCHEMA_DEFAULT');
      await scriptLlm(api, 'data-chat-title', [{ json: { title: TITLE } }]);
    });

    test.afterEach(async () => {
      if (currentUser?.cookie) await resetLlm(makeApi(currentUser.cookie));
    });

    test('a starter shows live steps, then the answer with KPI and table, the meta line and the steps', async ({ page }) => {
      test.slow();
      const api = makeApi(currentUser.cookie);
      await scriptChat(api, [
        { action: 'run_sql', sql: 'SELECT description, amount FROM V_CHAT_TRANSACTIONS' },
        { delayMs: 2500, action: 'final_answer', answer: 'You are owed **₹12,500** in total.', blocks },
      ]);
      await page.goto('/chat');
      await expect(page).toHaveTitle('Ask the data · FinanceOS');
      await expect(page.getByRole('heading', { name: 'What do you want to know?' })).toBeVisible();
      await expect(page.getByText('Spending', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: STARTER }).click();

      // While answering: the user's question, a live step and the stop button.
      await expect(page.getByText(STARTER, { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();

      await answer(page, 'You are owed');
      await expect(page.getByText('Owed to you')).toBeVisible();
      await expect(page.getByText('₹12,500', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Where it went')).toBeVisible();
      await expect(page.getByText('Dining')).toBeVisible();
      await expect(page.getByText('₹8,000').first()).toBeVisible();
      await expect(page.getByText(/^Ran 1 query · \d\.\d s/)).toBeVisible();

      await page.getByRole('button', { name: 'Show steps' }).click();
      await expect(page.getByRole('button', { name: 'Hide steps' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Show query' })).toBeVisible();
      await page.getByRole('button', { name: 'Show query' }).click();
      await expect(page.getByText('SELECT description, amount FROM V_CHAT_TRANSACTIONS')).toBeVisible();
    });

    test('a follow-up stays in the same chat; the URL, the title and a reload keep it', async ({ page }) => {
      test.slow();
      const api = makeApi(currentUser.cookie);
      await scriptChat(api, [
        { action: 'run_sql', sql: 'SELECT 1 FROM V_CHAT_TRANSACTIONS' },
        { action: 'final_answer', answer: 'First answer here.', blocks },
      ]);
      await page.goto('/chat');
      await ask(page, 'Who owes me?');
      await answer(page, 'First answer here.');
      await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}$/);
      const url = page.url();

      // The title arrives and shows in the top bar.
      await expect(page.getByText(TITLE).first()).toBeVisible();
      if (!phone) await expect(page.locator('aside').getByText(TITLE)).toBeVisible();

      await scriptChat(api, [{ action: 'final_answer', answer: 'Second answer here.' }]);
      await page.getByRole('button', { name: 'Compare with last month' }).click();
      await answer(page, 'Second answer here.');
      expect(page.url()).toBe(url);
      if (!phone) await expect(page.locator('aside').getByText(/2 questions/)).toBeVisible();

      await page.reload();
      await answer(page, 'First answer here.');
      await answer(page, 'Second answer here.');
      await expect(page.getByText('Who owes me?', { exact: true })).toBeVisible();
      // The stored answer keeps its steps: the meta line is still there after a reload.
      await expect(page.getByText(/^Ran 1 query · \d\.\d s/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Show steps' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Compare with last month' })).toHaveCount(0);
    });

    test('?q= sends the question once', async ({ page }) => {
      test.slow();
      const api = makeApi(currentUser.cookie);
      await scriptChat(api, [{ action: 'final_answer', answer: 'Answer to the search text.' }]);
      await page.goto(`/chat?q=${encodeURIComponent('spend this month')}`);
      await answer(page, 'Answer to the search text.');
      await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}$/);
      await expect(page.getByText('spend this month', { exact: true })).toHaveCount(1);
    });

    test('Copy table copies the rows and shows a toast', async ({ page, context }) => {
      test.slow();
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await scriptChat(makeApi(currentUser.cookie), [{ action: 'final_answer', answer: 'Here is the table.', blocks }]);
      await page.goto('/chat');
      await ask(page, 'Show the table');
      await answer(page, 'Here is the table.');
      await page.getByRole('button', { name: 'Copy table' }).click();
      await expect(page.getByText('Table copied')).toBeVisible();
      const text = await page.evaluate(() => navigator.clipboard.readText());
      expect(text).toBe('Category\tSpent\nDining\t₹12,500\nShopping\t₹8,000');
    });

    test('Stop ends a running answer and keeps the question', async ({ page }) => {
      test.slow();
      await scriptChat(makeApi(currentUser.cookie), [
        { action: 'run_sql', sql: 'SELECT 1 FROM V_CHAT_TRANSACTIONS' },
        { delayMs: 5000, action: 'final_answer', answer: 'Too late to show.' },
      ]);
      await page.goto('/chat');
      await ask(page, 'A slow question');
      await page.getByRole('button', { name: 'Stop' }).click();
      await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
      await expect(page.getByText('A slow question', { exact: true })).toBeVisible();
      await expect(page.getByText(/^Stopped/)).toBeVisible();
      await expect(page.getByText('Too late to show.')).toHaveCount(0);
    });

    test('an answer that did not finish shows Retry, and Retry asks the question again', async ({ page }) => {
      test.slow();
      const api = makeApi(currentUser.cookie);
      await scriptChat(api, [{ action: 'final_answer', answer: 'Recovered answer.' }]);
      let cut = true;
      await page.route('**/api/chat', async (route) => {
        if (!cut) return route.continue();
        cut = false;
        const res = await route.fetch();
        if (!res.ok()) {
          // Busy: let the page see it, and cut the next attempt instead.
          cut = true;
          return route.fulfill({ response: res });
        }
        // Only the first event reaches the page: the stream ends without an answer.
        const first = (await res.text()).split(/\r?\n\r?\n/)[0] + '\n\n';
        await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: first });
      });
      await page.goto('/chat');
      await ask(page, 'A question that fails');
      const failed = page.getByText('The answer did not finish. Your question is kept.');
      for (let i = 0; i < 8 && !(await failed.isVisible()); i++) {
        await page.waitForTimeout(1500);
        const busy = page.getByText(BUSY);
        if (await busy.isVisible()) await page.getByRole('button', { name: 'Retry' }).click();
      }
      await expect(failed).toBeVisible();
      await expect(page.getByText('A question that fails', { exact: true })).toBeVisible();

      await scriptChat(api, [{ action: 'final_answer', answer: 'Recovered answer.' }]);
      await page.getByRole('button', { name: 'Retry' }).click();
      await answer(page, 'Recovered answer.');
      await expect(page.getByText('The answer did not finish. Your question is kept.')).toHaveCount(0);
    });

    test('a clarifying question offers its options as buttons', async ({ page }) => {
      test.slow();
      const api = makeApi(currentUser.cookie);
      await scriptChat(api, [{ action: 'clarify', question: 'Which period do you mean?', options: '["This month", "Last 90 days"]' }]);
      await page.goto('/chat');
      await ask(page, 'Show my spend on food');
      await answer(page, 'Which period do you mean?');
      await scriptChat(api, [{ action: 'final_answer', answer: 'Food spend for this month.' }]);
      await page.getByRole('button', { name: 'This month' }).click();
      await answer(page, 'Food spend for this month.');
    });

    if (!phone) {
      test('Rename and Delete chat from the pane menu', async ({ page }) => {
        test.slow();
        await scriptChat(makeApi(currentUser.cookie), [{ action: 'final_answer', answer: 'Answer to rename.' }]);
        await page.goto('/chat');
        await ask(page, 'Rename me');
        await expect(page.locator('aside').getByText(TITLE)).toBeVisible();

        await page.locator('aside').getByRole('button', { name: 'More options', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Rename' }).click();
        await page.getByRole('textbox', { name: 'Name' }).fill('Renamed chat');
        await page.getByRole('button', { name: 'Save name' }).click();
        await expect(page.locator('aside').getByText('Renamed chat')).toBeVisible();

        await page.locator('aside').getByRole('button', { name: 'More options', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Delete chat' }).click();
        await expect(page.getByText('Delete “Renamed chat”?')).toBeVisible();
        await expect(page.getByText('The chat and its answers go. Reports you saved from it stay.')).toBeVisible();
        await page.getByRole('button', { name: 'Delete chat' }).click();
        await expect(page).toHaveURL(/\/chat$/);
        await expect(page.getByRole('heading', { name: 'What do you want to know?' })).toBeVisible();
        await expect(page.locator('aside').getByText('Renamed chat')).toHaveCount(0);
      });
    }

    const kpiDefinition = { measure: 'amount', aggregation: 'sum', filters: [] };
    const draftBlocks = (draft: Record<string, unknown>) => JSON.stringify({ reportDraft: { type: 'KPI', datasource: 'transactions', definition: kpiDefinition, ...draft } });

    /** Opens a new chat whose answer carries `draft`, and waits for its card. */
    async function askForDraft(page: Page, draft: Record<string, unknown>) {
      await scriptChat(makeApi(currentUser.cookie), [{ action: 'final_answer', answer: 'Here is a draft.', blocks: draftBlocks(draft) }]);
      await page.goto('/chat');
      await ask(page, 'Make this a report');
      await answer(page, 'Here is a draft.');
    }

    const reportRow = (page: Page, name: string) => page.getByText(name, { exact: true });

    test('report draft: Save as report keeps the card, shows the toast and Open report opens the report', async ({ page }) => {
      test.slow();
      await askForDraft(page, { mode: 'create', name: 'Draft spend KPI' });
      await expect(page.getByText('Report draft', { exact: true })).toBeVisible();
      await expect(page.getByText('Draft spend KPI', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Save as report' }).click();
      await expect(page.getByText('Report saved').first()).toBeVisible();
      await expect(page.getByText(/^Report saved/).first()).toBeVisible();
      await page.getByRole('link', { name: 'Open report' }).click();
      await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}/);
    });

    test('report draft: Undo (toast) deletes the saved report and brings the actions back', async ({ page }) => {
      test.slow();
      await askForDraft(page, { mode: 'create', name: 'Draft undo KPI' });
      await page.getByRole('button', { name: 'Save as report' }).click();
      await expect(page.getByText('Report saved').first()).toBeVisible();
      await page.getByRole('button', { name: 'Undo' }).first().click();
      await expect(page.getByRole('button', { name: 'Save as report' })).toBeVisible();
      await page.goto('/reports');
      await expect(reportRow(page, 'Draft undo KPI')).toHaveCount(0);
    });

    test('report draft: the saved state survives a reload', async ({ page }) => {
      test.slow();
      await askForDraft(page, { mode: 'create', name: 'Draft reload KPI' });
      await page.getByRole('button', { name: 'Save as report' }).click();
      await expect(page.getByText(/^Report saved/).first()).toBeVisible();
      await page.reload();
      await expect(page.getByText(/^Report saved/).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save as report' })).toHaveCount(0);
    });

    if (!phone) {
      test('report draft: Add to Home saves the report and puts a widget on the default dashboard; the card Undo takes both away', async ({ page }) => {
        test.slow();
        // Home exists once it has been opened; count its widgets before and after.
        await page.goto('/dashboard');
        const widgets = page.getByTestId('dashboard-widget');
        await expect(widgets.first()).toBeVisible();
        const before = await widgets.count();

        await askForDraft(page, { mode: 'create', name: 'Draft home KPI' });
        await page.getByRole('button', { name: 'Add to Home' }).click();
        await expect(page.getByText('Report saved and added to Home').first()).toBeVisible();

        const url = page.url();
        await page.goto('/dashboard');
        await expect(widgets).toHaveCount(before + 1);

        await page.goto(url);
        await page.getByRole('button', { name: 'Undo' }).click();
        await expect(page.getByRole('button', { name: 'Add to Home' })).toBeVisible();
        await page.goto('/dashboard');
        await expect(widgets).toHaveCount(before);
        await page.goto('/reports');
        await expect(reportRow(page, 'Draft home KPI')).toHaveCount(0);
      });

      test('report draft: Add to Home without a default dashboard creates Home with the report widget', async ({ page }) => {
        test.slow();
        const api = makeApi(currentUser.cookie);
        // Opening Home seeds it; delete every dashboard so the user has no default.
        await page.goto('/dashboard');
        await expect(page.getByTestId('dashboard-widget').first()).toBeVisible();
        const list = await api.GET('/api/v1/dashboards');
        for (const d of list.data ?? []) await api.DELETE('/api/v1/dashboards/{id}', { params: { path: { id: d.id } } });

        await askForDraft(page, { mode: 'create', name: 'Draft first KPI' });
        await page.getByRole('button', { name: 'Add to Home' }).click();
        await expect(page.getByText('Report saved and added to Home').first()).toBeVisible();

        await page.goto('/dashboard');
        const widgets = page.getByTestId('dashboard-widget');
        await expect(widgets).toHaveCount(1);
        await expect(widgets.first()).toContainText('Draft first KPI');
      });

      test('report draft: Update report changes the saved report, and Undo puts the earlier one back', async ({ page }) => {
        test.slow();
        const report = await createReport(makeApi(currentUser.cookie), { name: 'Old name KPI', type: 'KPI', datasource: 'transactions', definition: kpiDefinition } as never);
        await askForDraft(page, { mode: 'update', reportId: report.id, name: 'New name KPI' });
        await expect(page.getByText('Change to your report')).toBeVisible();
        await page.getByRole('button', { name: 'Update report' }).click();
        await expect(page.getByText('Report updated').first()).toBeVisible();
        await page.getByRole('button', { name: 'Undo' }).first().click();
        await expect(page.getByRole('button', { name: 'Update report' })).toBeVisible();
        await page.goto('/reports');
        await expect(reportRow(page, 'Old name KPI')).toBeVisible();
        await expect(reportRow(page, 'New name KPI')).toHaveCount(0);
      });

      test('report draft: Delete report asks first, then deletes and says so', async ({ page }) => {
        test.slow();
        const report = await createReport(makeApi(currentUser.cookie), { name: 'Doomed KPI', type: 'KPI', datasource: 'transactions', definition: kpiDefinition } as never);
        await askForDraft(page, { mode: 'delete', reportId: report.id, name: 'Doomed KPI' });
        await page.getByRole('button', { name: 'Delete report' }).click();
        await expect(page.getByText('Delete “Doomed KPI”?')).toBeVisible();
        await expect(page.getByText('The report and its widget on Home go. Your transactions stay.')).toBeVisible();
        await page.getByRole('button', { name: 'Delete report' }).last().click();
        await expect(page.getByText('Report deleted')).toBeVisible();
        await page.goto('/reports');
        await expect(reportRow(page, 'Doomed KPI')).toHaveCount(0);
      });
    }

    if (phone) {
      test('phone: home, a conversation without the tab bar, and back', async ({ page }) => {
        test.slow();
        await scriptChat(makeApi(currentUser.cookie), [{ action: 'final_answer', answer: 'Phone answer.' }]);
        await page.goto('/chat');
        await expect(page.getByRole('heading', { name: 'What do you want to know?' })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Menu/ })).toHaveCount(0);
        await ask(page, 'Phone question');
        await answer(page, 'Phone answer.');
        await expect(page.getByRole('tab', { name: /Menu/ })).toHaveCount(0);
        await expect(page.getByText(TITLE).first()).toBeVisible();

        await page.getByRole('link', { name: 'Back' }).or(page.getByRole('button', { name: 'Back' })).first().click();
        await expect(page.getByRole('heading', { name: 'What do you want to know?' })).toBeVisible();
        await expect(page.getByText('Recent chats')).toBeVisible();
        await expect(page.getByText(TITLE)).toBeVisible();
        await page.getByText(TITLE).click();
        await answer(page, 'Phone answer.');
      });
    }
  });
}
