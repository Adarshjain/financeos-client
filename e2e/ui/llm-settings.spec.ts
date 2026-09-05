import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';

test.describe('LLM Settings UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-llm-settings');
    await loginContext(context, currentUser.cookie);
  });

  test('LLM Keys & Routing journey: add key -> test key -> delete key -> customize routing -> persist reload -> reset routing', async ({
    page,
  }) => {
    // 1. Navigate to /settings/llm-keys
    await page.goto('/settings/llm-keys');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI Routing Preferences', exact: true })).toBeVisible();

    // 2. Add Gemini Key
    // Find the Gemini card Add Key button
    const geminiCard = page.locator('.border', { has: page.getByText('Gemini', { exact: true }) }).first();
    await geminiCard.getByRole('button', { name: /Add Key/i }).click();

    // Dialog opens
    await expect(page.getByRole('heading', { name: 'Add Gemini Key' })).toBeVisible();
    await page.getByPlaceholder('Paste API key').fill('e2e-gemini-good');
    await page.getByPlaceholder('e.g. Project Alpha').fill('My E2E Gemini');
    await page.getByRole('button', { name: 'Save Key' }).click();

    // Dialog closes, row appears with label, masked key, and Active badge
    await expect(page.getByText('My E2E Gemini')).toBeVisible();
    await expect(page.getByText('•••• good')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();

    // 3. Test Key via menu
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: /Test Key/i }).click();
    await expect(page.getByText('Verified')).toBeVisible();

    // 4. Delete Key via menu
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: /Delete Key/i }).click();

    await expect(page.getByRole('heading', { name: 'Delete API Key?' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete Key', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Delete API Key?' })).not.toBeVisible();

    // Key is removed from the list
    await expect(page.getByText('•••• good')).not.toBeVisible();

    // 5. Customise routing order on Chat group
    const chatRoutingCard = page.locator('.border', { has: page.getByText('Answering your questions about your data') }).first();
    await expect(chatRoutingCard.getByText('Default')).toBeVisible();

    // Click Customise
    await chatRoutingCard.getByRole('button', { name: /Customise/i }).click();

    // Move second item up
    const upButtons = chatRoutingCard.locator('button:has(svg.lucide-arrow-up)');
    await upButtons.nth(1).click();

    // Save routing changes
    await chatRoutingCard.getByRole('button', { name: 'Save' }).click();

    // Custom badge appears
    await expect(chatRoutingCard.getByText('Custom')).toBeVisible();
    await expect(chatRoutingCard.getByRole('button', { name: /Reset/i })).toBeVisible();

    // Reload page and verify order persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    const reloadedChatCard = page.locator('.border', { has: page.getByText('Answering your questions about your data') }).first();
    await expect(reloadedChatCard.getByText('Custom')).toBeVisible();
    await expect(reloadedChatCard.getByRole('button', { name: /Reset/i })).toBeVisible();

    // 6. Reset routing order to default
    await reloadedChatCard.getByRole('button', { name: /Reset/i }).click();
    await expect(reloadedChatCard.getByText('Default')).toBeVisible();
    await expect(reloadedChatCard.getByRole('button', { name: /Reset/i })).not.toBeVisible();
  });
});
