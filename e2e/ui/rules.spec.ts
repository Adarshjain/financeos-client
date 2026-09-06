import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createCategory } from '../fixtures/seed/categories';
import { expect, test } from '../fixtures/test';

test.describe('Rules & Categories UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-rules');
    await loginContext(context, currentUser.cookie);
  });

  test('/rules/categories: manage categories in CategoryManager', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    // Seed an initial category
    await createCategory(api, 'Initial Seeded Cat');

    await page.goto('/rules/categories');

    // 1. Check page title and existing category
    await expect(
      page.getByRole('heading', { name: /Category Manager/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Initial Seeded Cat' })
    ).toBeVisible();

    // 2. Create new category via modal
    await page.getByRole('button', { name: /Add Category/i }).click();
    const dialog = page.getByRole('dialog', { name: /Create New Category/i });
    await expect(dialog).toBeVisible();

    await page.locator('#category-name').fill('UI Created Category');
    await dialog.getByRole('button', { name: /Create Category/i }).click();

    // Verify new category appears in grid (heading)
    await expect(
      page.getByRole('heading', { name: 'UI Created Category' })
    ).toBeVisible();

    // 3. Search categories
    const searchInput = page.getByPlaceholder('Search categories...');
    await searchInput.fill('UI Created');
    await expect(
      page.getByRole('heading', { name: 'UI Created Category' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Initial Seeded Cat' })
    ).not.toBeVisible();

    // Clear search
    await searchInput.clear();
    await expect(
      page.getByRole('heading', { name: 'Initial Seeded Cat' })
    ).toBeVisible();

    // 4. Rename category
    const createdCard = page.locator('div.group', {
      has: page.getByRole('heading', { name: 'UI Created Category' }),
    });
    await createdCard.getByRole('button', { name: 'Category actions' }).click();
    await page.getByRole('menuitem', { name: /Rename/i }).click();

    const renameDialog = page.getByRole('dialog', { name: /Rename Category/i });
    await expect(renameDialog).toBeVisible();
    const renameInput = page.locator('#rename-category-name');
    await expect(renameInput).toHaveValue('UI Created Category');
    await renameInput.fill('UI Renamed Category');
    await renameDialog.getByRole('button', { name: /Save/i }).click();
    await expect(renameDialog).not.toBeVisible();

    // Verify heading shows the new name
    await expect(
      page.getByRole('heading', { name: 'UI Renamed Category' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'UI Created Category' })
    ).not.toBeVisible();

    // 5. Delete category
    const renamedCard = page.locator('div.group', {
      has: page.getByRole('heading', { name: 'UI Renamed Category' }),
    });
    await renamedCard.getByRole('button', { name: 'Category actions' }).click();
    await page.getByRole('menuitem', { name: /Delete/i }).click();

    const deleteDialog = page.getByRole('dialog', { name: /Delete Category/i });
    await expect(deleteDialog).toBeVisible();
    await expect(
      deleteDialog.getByText(
        'Transactions in this category will keep their other categories; none are deleted.'
      )
    ).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(deleteDialog).not.toBeVisible();

    // Verify card is gone
    await expect(
      page.getByRole('heading', { name: 'UI Renamed Category' })
    ).not.toBeVisible();

    // 6. Verify via API fixture that GET /api/v1/categories no longer lists it
    const categoriesRes = await api.GET('/api/v1/categories');
    expect(
      categoriesRes.data?.some((c) => c.name === 'UI Renamed Category')
    ).toBe(false);
  });

  test('/rules: create rule, preview matches dialog, verify toggle, edit, and delete', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    // Pre-create category for rule creation
    await createCategory(api, 'Coffee & Drinks');

    await page.goto('/rules');

    // 1. Verify header
    await expect(
      page.getByRole('heading', { name: 'Categorization Rules' })
    ).toBeVisible();

    // 2. Open create rule modal
    await page.getByRole('button', { name: 'New Rule' }).click();
    const ruleDialog = page.getByRole('dialog', { name: /Create Categorization Rule/i });
    await expect(ruleDialog).toBeVisible();

    // Fill form
    await page.locator('#merchantKey').fill('BLUE_TOKAI');
    await page.locator('#displayName').fill('Blue Tokai Coffee');

    // Select category in combobox
    await ruleDialog.getByText('Select categories...', { exact: true }).click();
    await page
      .locator('[cmdk-item]')
      .filter({ hasText: 'Coffee & Drinks' })
      .click();

    // Submit form (without Escape key which would close the entire dialog)
    await ruleDialog.getByRole('button', { name: 'Save' }).click();
    await expect(ruleDialog).not.toBeVisible();

    // 3. Newly created manual rule has verified=true; switch from default 'Unverified' tab to 'All'
    await page.getByRole('button', { name: 'All' }).click();

    // Rule card should appear in the grid
    const ruleCard = page.locator('div', { hasText: 'Blue Tokai Coffee' }).first();
    await expect(ruleCard).toBeVisible();

    // 4. Open "Find Matches" preview dialog via Rule actions dropdown
    await ruleCard.getByRole('button', { name: 'Rule actions' }).click();
    await page.getByRole('menuitem', { name: /Find Matches/i }).click();

    const matchesDialog = page.getByRole('dialog', { name: /Matching transactions/i });
    await expect(matchesDialog).toBeVisible();
    await expect(matchesDialog.getByText('Matching transactions')).toBeVisible();
    // Close preview dialog
    await matchesDialog.getByRole('button', { name: 'Close' }).click();
    await expect(matchesDialog).not.toBeVisible();

    // 5. Edit rule
    await ruleCard.getByRole('button', { name: 'Rule actions' }).click();
    await page.getByRole('menuitem', { name: /Edit Rule/i }).click();

    const editDialog = page.getByRole('dialog', { name: /Edit Rule/i });
    await expect(editDialog).toBeVisible();
    await page.locator('#displayName').fill('Blue Tokai Roasters');
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(editDialog).not.toBeVisible();

    await expect(page.getByText('Blue Tokai Roasters')).toBeVisible();

    // 6. Filter by verified tabs: switch to 'Verified' tab and confirm visible
    await page.getByRole('button', { name: 'Verified', exact: true }).click();
    await expect(page.getByText('Blue Tokai Roasters')).toBeVisible();

    // Switch to 'Unverified' tab and confirm not visible
    await page.getByRole('button', { name: 'Unverified', exact: true }).click();
    await expect(page.getByText('Blue Tokai Roasters')).not.toBeVisible();

    // Switch back to 'All'
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(page.getByText('Blue Tokai Roasters')).toBeVisible();

    // 7. Delete rule
    const updatedRuleCard = page.locator('div', { hasText: 'Blue Tokai Roasters' }).first();
    await updatedRuleCard.getByRole('button', { name: 'Rule actions' }).click();
    await page.getByRole('menuitem', { name: /Delete Rule/i }).click();

    const deleteDialog = page.getByRole('dialog', { name: /Delete Rule\?/i });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(deleteDialog).not.toBeVisible();

    // Verify card is deleted
    await expect(page.getByText('Blue Tokai Roasters')).not.toBeVisible();
  });
});
