import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewListContainer } from '@/components/transactions/review-browser/ReviewListContainer';
import { COMMIT_PX } from '@/components/ui/swipe-action-row.helpers';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { PagedTransaction, Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const accounts: Account[] = [{ id: 'acc1', name: 'HDFC Bank', type: AccountType.BANK_ACCOUNT }];

const withReasons: Transaction = {
  id: 't-reasons',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -450,
  description: 'Swiggy order',
  source: 'gmail_statement',
  reviewType: 'NEEDS_REVIEW',
  reviewReasons: ['DUPLICATE_SUSPECT', 'CATEGORY_UNVERIFIED'],
  createdAt: '2026-07-25T00:00:00Z',
};

const withoutReasons: Transaction = {
  ...withReasons,
  id: 't-bare',
  description: 'Bare row',
  reviewReasons: [],
};

const pagedData: PagedTransaction = {
  content: [withReasons, withoutReasons],
  totalElements: 2,
  totalPages: 1,
  size: 50,
  number: 0,
  first: true,
  last: true,
  empty: false,
};

const touch = { pointerType: 'touch', isPrimary: true, pointerId: 1 };

function rowFor(description: string) {
  return screen.getByText(description).closest('[data-slot="swipe-action-row-content"]') as HTMLElement;
}

function swipe(el: HTMLElement, dx: number) {
  fireEvent.pointerDown(el, { ...touch, clientX: 200, clientY: 100 });
  fireEvent.pointerMove(el, { ...touch, clientX: 200 + dx, clientY: 100 });
  fireEvent.pointerUp(el, { ...touch, clientX: 200 + dx, clientY: 100 });
}

function renderList(selectedIds: string[] = []) {
  const onToggleSelect = vi.fn();
  const onMutate = vi.fn();
  renderWithQuery(
    <ReviewListContainer
      loading={false}
      pagedData={pagedData}
      selectedIds={selectedIds}
      appliedAccountCount={1}
      selectableAccountCount={1}
      accounts={accounts}
      onSelectAllPage={vi.fn()}
      onToggleSelect={onToggleSelect}
      onMutate={onMutate}
    />,
  );
  return { onToggleSelect, onMutate };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReviewListContainer swipe actions', () => {
  it('wraps each card in a swipe row and strips the card bottom margin so the backdrop fills the row', () => {
    renderList();

    const row = rowFor('Swiggy order');
    expect(row.parentElement).toHaveAttribute('data-slot', 'swipe-action-row');
    expect(row.parentElement?.className).toContain('sm:mb-2');
    expect(row.firstElementChild?.className).toContain('sm:mb-0');
  });

  it('swipe right opens the approve picker for that card with its reasons pre-checked', () => {
    renderList();

    swipe(rowFor('Swiggy order'), COMMIT_PX + 10);

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'Approve Transaction' })).toBeInTheDocument();
    expect(dialog.getByText('Possible duplicate')).toBeInTheDocument();
    expect(dialog.getByText('Category unverified')).toBeInTheDocument();
    const boxes = dialog.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    boxes.forEach((box) => expect(box).toHaveAttribute('aria-checked', 'true'));
  });

  it('swipe left opens the delete confirmation for that card', () => {
    renderList();

    swipe(rowFor('Swiggy order'), -(COMMIT_PX + 10));

    expect(screen.getByRole('heading', { name: 'Delete Transaction?' })).toBeInTheDocument();
    expect(
      screen.getByText(/This is not a manually created transaction/),
    ).toBeInTheDocument();
  });

  it('offers no approve side for a card without review reasons but still offers delete', () => {
    renderList();
    const row = rowFor('Bare row');

    swipe(row, COMMIT_PX + 10);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(row.style.transform).toBe('translateX(0px)');

    swipe(row, -(COMMIT_PX + 10));
    expect(screen.getByRole('heading', { name: 'Delete Transaction?' })).toBeInTheDocument();
  });

  it('a swipe does not open the card detail dialog or toggle selection', () => {
    const { onToggleSelect } = renderList();

    swipe(rowFor('Swiggy order'), COMMIT_PX - 20);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('closing the dialog clears the target so it can be reopened', async () => {
    renderList();

    swipe(rowFor('Swiggy order'), -(COMMIT_PX + 10));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    swipe(rowFor('Swiggy order'), COMMIT_PX + 10);
    expect(screen.getByRole('heading', { name: 'Approve Transaction' })).toBeInTheDocument();
  });

  it('on approve success refreshes the list and drops a selected row from the bulk selection', async () => {
    vi.mocked(api.POST).mockResolvedValue({
      data: { succeededIds: ['t-reasons'], skippedIds: [], failures: [] },
    } as never);
    const { onToggleSelect, onMutate } = renderList(['t-reasons']);

    swipe(rowFor('Swiggy order'), COMMIT_PX + 10);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(onMutate).toHaveBeenCalledTimes(1));
    expect(onToggleSelect).toHaveBeenCalledWith('t-reasons');
    expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-review', {
      body: {
        transactionIds: ['t-reasons'],
        reviewType: 'MANUALLY_REVIEWED',
        reviewReasons: ['DUPLICATE_SUSPECT', 'CATEGORY_UNVERIFIED'],
      },
    });
  });

  it('on delete success refreshes the list without touching an unselected row', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
    const { onToggleSelect, onMutate } = renderList();

    swipe(rowFor('Bare row'), -(COMMIT_PX + 10));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onMutate).toHaveBeenCalledTimes(1));
    expect(onToggleSelect).not.toHaveBeenCalled();
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/transactions/{id}', {
      params: { path: { id: 't-bare' } },
    });
  });
});
