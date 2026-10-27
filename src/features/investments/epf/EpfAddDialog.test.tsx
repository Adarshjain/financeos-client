import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { employer, latestContribution } from './epf.fixtures';
import { EpfAddDialog } from './EpfAddDialog';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-27' }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('@/features/transactions/TransactionPickerField', () => ({ TransactionPickerField: () => <div /> }));
const options = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./epfActions', () => ({ loadEpfFormOptions: options.load }));

beforeEach(() => vi.clearAllMocks());

describe('EpfAddDialog', () => {
  it('shows the form filled from the last contribution once the employers arrive', async () => {
    options.load.mockResolvedValue({ success: true, data: { employers: [employer()], latestContribution: latestContribution() } });
    renderWithQuery(<EpfAddDialog onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Add entry' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Your share/)).toHaveValue('7200');
  });

  it('opens on the type it was given', async () => {
    options.load.mockResolvedValue({ success: true, data: { employers: [], latestContribution: null } });
    renderWithQuery(<EpfAddDialog initialType="OPENING_BALANCE" onClose={vi.fn()} />);
    await screen.findByRole('button', { name: 'Add entry' });
    expect(screen.getByRole('combobox', { name: /^Type/ })).toHaveTextContent('Opening balance');
  });

  it('says so and closes when the employers cannot be loaded', async () => {
    options.load.mockResolvedValue({ success: false, error: { message: 'no' } });
    const onClose = vi.fn();
    renderWithQuery(<EpfAddDialog onClose={onClose} />);
    expect(await screen.findByText('The employers could not be loaded. Close this and try again.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
