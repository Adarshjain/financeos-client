import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

import { AddWidgetDialog } from '@/components/dashboards/AddWidgetDialog';
import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

async function open(hasUnsavedChanges?: boolean) {
  const user = userEvent.setup();
  renderWithQuery(
    <AddWidgetDialog reports={[]} onAdd={vi.fn()} onAddBuiltin={vi.fn()} hasUnsavedChanges={hasUnsavedChanges} />,
  );
  await user.click(screen.getByRole('button', { name: 'Add widget' }));
  return user;
}

describe('AddWidgetDialog — leaving for the report builder', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
  });

  it('no saved reports and nothing unsaved: "Create one" is a plain link to the builder', async () => {
    await open(false);
    expect(await screen.findByRole('link', { name: 'Create one' })).toHaveAttribute('href', '/reports/new');
  });

  it('with unsaved changes "Create one" asks first; Cancel stays, Leave goes to the builder', async () => {
    const user = await open(true);
    expect(screen.queryByRole('link', { name: 'Create one' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Create one' }));
    const confirm = await screen.findByRole('dialog', { name: 'Leave without saving?' });
    expect(confirm).toHaveTextContent('Your unsaved changes to this dashboard will be lost.');
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Add a widget' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create one' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Leave without saving?' })).getByRole('button', { name: 'Leave' }));
    expect(router.push).toHaveBeenCalledWith('/reports/new');
  });
});
