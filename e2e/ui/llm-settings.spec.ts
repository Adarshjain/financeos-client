import type { Page } from '@playwright/test';

import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';

// A routing group's row on the AI tab, found from its name (the nearest row holding a Customise button).
const routingRow = (page: Page, name: string) =>
  page.getByText(name, { exact: true }).locator('xpath=ancestor::*[.//button[normalize-space()="Customise"]][1]');

test.describe('LLM Settings UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-llm-settings');
    await loginContext(context, currentUser.cookie);
  });

  test('AI keys & routing journey: add key -> test key -> delete key -> customise routing -> persist reload -> reset routing', async ({
    page,
  }) => {
    // 1. Navigate to /settings/ai
    await page.goto('/settings/ai');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Your keys', { exact: true })).toBeVisible();
    await expect(page.getByText('Routing', { exact: true })).toBeVisible();

    // 2. Add a Gemini key (Gemini is the dialog's default provider)
    await page.getByRole('button', { name: 'Add key', exact: true }).click();
    const addDialog = page.getByRole('dialog', { name: 'Add key' });
    await expect(addDialog).toBeVisible();
    // The key field is read-only until focused (keeps password managers out), so focus it first.
    await addDialog.getByPlaceholder('Paste API key').focus();
    await addDialog.getByPlaceholder('Paste API key').fill('e2e-gemini-good');
    await addDialog.getByPlaceholder('e.g. Project Alpha').fill('My E2E Gemini');
    await addDialog.getByRole('button', { name: 'Add key', exact: true }).click();

    // Dialog closes, row appears with label, masked key and Active status
    await expect(addDialog).not.toBeVisible();
    await expect(page.getByText('My E2E Gemini').first()).toBeVisible();
    await expect(page.getByText('•••• good').first()).toBeVisible();
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible();

    // 3. Test key via the row menu
    await page.getByRole('button', { name: /Key options for/ }).click();
    await page.getByRole('menuitem', { name: 'Test key' }).click();
    await expect(page.getByText('Key verified')).toBeVisible();

    // 4. Delete key via the row menu
    await page.getByRole('button', { name: /Key options for/ }).click();
    await page.getByRole('menuitem', { name: 'Delete key' }).click();

    const deleteDialog = page.getByRole('dialog', { name: 'Delete API key?' });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(deleteDialog).not.toBeVisible();

    // Key is removed from the list
    await expect(page.getByText('•••• good')).toHaveCount(0);

    // 5. Customise routing order on the Chat group
    const chatRow = routingRow(page, 'Chat');
    await expect(chatRow.getByText('Default', { exact: true })).toBeVisible();
    await chatRow.getByRole('button', { name: 'Customise' }).click();

    // Move the second option up, then save
    const editor = page.getByRole('dialog', { name: 'Chat' });
    await expect(editor).toBeVisible();
    await editor.getByRole('button', { name: /^Move up/ }).nth(1).click();
    await editor.getByRole('button', { name: 'Save routing' }).click();
    await expect(editor).not.toBeVisible();

    // Custom badge appears
    await expect(chatRow.getByText('Custom', { exact: true })).toBeVisible();
    await expect(chatRow.getByRole('button', { name: 'Reset' })).toBeVisible();

    // Reload page and verify order persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    const reloadedChatRow = routingRow(page, 'Chat');
    await expect(reloadedChatRow.getByText('Custom', { exact: true })).toBeVisible();
    await expect(reloadedChatRow.getByRole('button', { name: 'Reset' })).toBeVisible();

    // 6. Reset routing order to default
    await reloadedChatRow.getByRole('button', { name: 'Reset' }).click();
    await expect(reloadedChatRow.getByText('Default', { exact: true })).toBeVisible();
    await expect(reloadedChatRow.getByRole('button', { name: 'Reset' })).toHaveCount(0);
  });

  test('Custom model row: type a model, Test & add probes it, it persists in the order, and can be removed', async ({
    page,
  }) => {
    await page.goto('/settings/ai');
    await page.waitForLoadState('networkidle');

    // Without a key the add row only hints; add a Gemini key first
    const defaultRow = routingRow(page, 'Everything else');
    await defaultRow.getByRole('button', { name: 'Customise' }).click();
    const editor = page.getByRole('dialog', { name: 'Everything else' });
    await expect(editor.getByText('Add an API key to type in a model of your own.')).toBeVisible();
    await editor.getByRole('button', { name: 'Cancel' }).click();
    await expect(editor).not.toBeVisible();

    await page.getByRole('button', { name: 'Add key', exact: true }).click();
    const addDialog = page.getByRole('dialog', { name: 'Add key' });
    // The key field is read-only until focused (keeps password managers out), so focus it first.
    await addDialog.getByPlaceholder('Paste API key').focus();
    await addDialog.getByPlaceholder('Paste API key').fill('e2e-gemini-good');
    await addDialog.getByRole('button', { name: 'Add key', exact: true }).click();
    await expect(addDialog).not.toBeVisible();
    await expect(page.getByText('•••• good').first()).toBeVisible();

    // Type a model id and probe it; the row joins the draft at the bottom
    await defaultRow.getByRole('button', { name: 'Customise' }).click();
    await expect(editor).toBeVisible();
    await editor.getByLabel('Model id').fill('gemini-e2e-custom');
    await editor.getByRole('button', { name: /Test & add/i }).click();
    await expect(editor.getByRole('button', { name: 'Remove gemini-e2e-custom' })).toBeVisible();
    await expect(editor.getByLabel('Model id')).toHaveValue('');

    // The same model again is refused client-side
    await editor.getByLabel('Model id').fill('gemini-e2e-custom');
    await editor.getByRole('button', { name: /Test & add/i }).click();
    await expect(editor.getByText('That model is already in this list.')).toBeVisible();

    // Move it to the top and save
    const upButtons = editor.getByRole('button', { name: /^Move up/ });
    const rows = await upButtons.count();
    for (let i = rows - 1; i > 0; i -= 1) {
      await upButtons.nth(i).click();
    }
    await editor.getByRole('button', { name: 'Save routing' }).click();
    await expect(editor).not.toBeVisible();
    await expect(defaultRow.getByText('Custom', { exact: true })).toBeVisible();
    await expect(defaultRow.getByText('gemini-e2e-custom')).toBeVisible();
    await expect(defaultRow.getByText('1 gemini-e2e-custom')).toBeVisible();

    // Survives a reload, then can be removed from the draft
    await page.reload();
    await page.waitForLoadState('networkidle');
    const reloaded = routingRow(page, 'Everything else');
    await expect(reloaded.getByText('gemini-e2e-custom')).toBeVisible();
    await reloaded.getByRole('button', { name: 'Customise' }).click();
    await editor.getByRole('button', { name: 'Remove gemini-e2e-custom' }).click();
    await editor.getByRole('button', { name: 'Save routing' }).click();
    await expect(editor).not.toBeVisible();
    await expect(reloaded.getByText('gemini-e2e-custom')).toHaveCount(0);
  });
});
