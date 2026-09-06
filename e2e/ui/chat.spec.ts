import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { scriptChat } from '../fixtures/chat';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { expect, test } from '../fixtures/test';

test.describe('Chat UI (@ui)', () => {
  test.describe.configure({ mode: 'serial' });
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-chat');
    await loginContext(context, currentUser.cookie);
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async () => {
    if (currentUser?.cookie) {
      const api = makeApi(currentUser.cookie);
      await resetLlm(api);
    }
  });

  test('Full chat journey: empty state chips -> stats & table blocks -> trace disclosure -> clarify chips -> report draft save -> New Chat (@desktop)', async ({
    page,
  }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);

    // 1. Visit /chat and check empty state
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'How can I help with your finances today?' })).toBeVisible();
    await expect(page.getByPlaceholder('Ask anything about your data…')).toBeVisible();

    // 2. Script a response with stats and table blocks
    await scriptChat(api, [
      { action: 'run_sql', sql: 'SELECT * FROM V_CHAT_TRANSACTIONS' },
      {
        action: 'final_answer',
        answer: 'Here is your financial overview.',
        blocks: JSON.stringify({
          stats: [
            { label: 'Total Inflow', value: '₹1,50,000', delta: '+12%', sentiment: 'good' },
            { label: 'Total Outflow', value: '₹45,000', sentiment: 'neutral' },
          ],
          tables: [
            {
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
        }),
      },
    ]);

    // Type prompt and send
    await page.getByPlaceholder('Ask anything about your data…').fill('Give me a financial summary');
    await page.getByRole('button', { name: 'Send message' }).click();

    // Assert answer and rich blocks render
    await expect(page.getByText('Here is your financial overview.')).toBeVisible();
    await expect(page.getByText('Total Inflow')).toBeVisible();
    await expect(page.getByText('₹1,50,000')).toBeVisible();
    await expect(page.getByText('Dining')).toBeVisible();
    await expect(page.getByText('12,500')).toBeVisible();

    // Assert trace disclosure is present and can be expanded
    const traceBtn = page.getByRole('button', { name: /Ran 1 step/i });
    await expect(traceBtn).toBeVisible();
    await traceBtn.click();
    await expect(page.getByText('Executed SQL query')).toBeVisible();

    // 3. Script a clarify question with options, where clarification answer returns report draft
    await scriptChat(api, [
      {
        action: 'clarify',
        question: 'Which timeframe are you interested in?',
        options: '["This Month", "Last 3 Months", "This Year"]',
      },
      {
        action: 'final_answer',
        answer: 'Here is a report draft for your monthly spends.',
        blocks: JSON.stringify({
          reportDraft: {
            mode: 'create',
            name: 'Monthly Dining Spends KPI',
            type: 'KPI',
            datasource: 'transactions',
            definition: { measure: 'amount', aggregation: 'sum', filters: [] },
          },
        }),
      },
    ]);

    await page.getByPlaceholder('Ask anything about your data…').fill('Create a report draft for dining');
    await page.getByRole('button', { name: 'Send message' }).click();

    // Assert clarify box and option chips
    await expect(page.getByText('Which timeframe are you interested in?')).toBeVisible();
    const chip = page.getByRole('button', { name: 'This Month' });
    await expect(chip).toBeVisible();

    // Click the option chip -> sends clarification reply and displays report draft
    await chip.click();
    await expect(page.getByText('Here is a report draft for your monthly spends.')).toBeVisible();
    await expect(page.getByText('Monthly Dining Spends KPI')).toBeVisible();
    const saveBtn = page.getByRole('button', { name: 'Save report' });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(page.getByText('Saved ✓')).toBeVisible();

    // Click New Chat to clear chat transcript
    const newChatBtn = page.getByRole('button', { name: /New Chat/i });
    await expect(newChatBtn).toBeVisible();
    await newChatBtn.click();

    // Chat cleared, empty state restored
    await expect(page.getByRole('heading', { name: 'How can I help with your finances today?' })).toBeVisible();

    // Verify saved report exists by navigating to /reports
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Monthly Dining Spends KPI')).toBeVisible();
  });

  test('Daily quota error banner in UI', async ({
    page,
  }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);

    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Send 3 successful messages
    for (let i = 1; i <= 3; i++) {
      await scriptChat(api, [{ action: 'final_answer', answer: `Answer ${i}` }]);
      await page.getByPlaceholder('Ask anything about your data…').fill(`Question ${i}`);
      await page.getByRole('button', { name: 'Send message' }).click();
      await expect(page.getByText(`Answer ${i}`)).toBeVisible();
    }

    // 4th message hits quota limit
    await page.getByPlaceholder('Ask anything about your data…').fill('Question 4');
    await page.getByRole('button', { name: 'Send message' }).click();

    // Client proxy displays quota error message
    await expect(
      page.getByText('You have reached your daily chat message limit. Please try again tomorrow.')
    ).toBeVisible();
  });

  test('Completion browser notification when tab is unfocused/hidden', async ({
    context,
    page,
  }) => {
    const api = makeApi(currentUser.cookie);

    // Grant notification permission
    await context.grantPermissions(['notifications']);

    // Install mock Notification class and recorder
    await page.addInitScript(() => {
      const recorded: Array<{ title: string; options?: unknown }> = [];
      (window as unknown as { __recordedNotifications: Array<{ title: string; options?: unknown }> }).__recordedNotifications = recorded;

      class MockNotification {
        static permission = 'granted';
        static requestPermission() {
          return Promise.resolve('granted');
        }
        title: string;
        options: unknown;
        onclick: (() => void) | null = null;
        constructor(title: string, options?: unknown) {
          this.title = title;
          this.options = options;
          recorded.push({ title, options });
        }
        close() {}
      }
      (window as unknown as { Notification: typeof MockNotification }).Notification = MockNotification;
    });

    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await scriptChat(api, [
      { delayMs: 1000, action: 'final_answer', answer: 'Notification test complete answer.' },
    ]);

    await page.getByPlaceholder('Ask anything about your data…').fill('Notify me when done');
    await page.getByRole('button', { name: 'Send message' }).click();

    // Emulate hidden/unfocused page before response stream completes
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.hasFocus = () => false;
    });

    // Wait for answer to land
    await expect(page.getByText('Notification test complete answer.')).toBeVisible();

    // Verify recorded notification
    const recorded = await page.evaluate(() => {
      return (window as unknown as { __recordedNotifications: Array<{ title: string; options?: unknown }> }).__recordedNotifications;
    });

    expect(recorded.length).toBeGreaterThanOrEqual(1);
    expect(recorded.some((n) => n.title === 'Your answer is ready')).toBe(true);
  });

  test('Mobile send and answer rendering (@mobile)', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);

    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'How can I help with your finances today?' })).toBeVisible();

    await scriptChat(api, [
      {
        action: 'final_answer',
        answer: 'Mobile chat response successful.',
        blocks: JSON.stringify({
          stats: [{ label: 'Cash', value: '₹50,000' }],
        }),
      },
    ]);

    await page.getByPlaceholder('Ask anything about your data…').fill('Mobile prompt');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('Mobile chat response successful.')).toBeVisible();
    await expect(page.getByText('Cash')).toBeVisible();
    await expect(page.getByText('₹50,000')).toBeVisible();
  });
});
