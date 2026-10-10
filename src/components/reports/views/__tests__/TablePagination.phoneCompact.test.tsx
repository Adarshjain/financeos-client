import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { stubPhone } from '@/test/stubPhone';

vi.mock(
  '@/components/ui/select',
  async () => (await import('@/test/mockSelect')).selectMock
);

const page = { number: 3, size: 50, totalPages: 8, totalElements: 400 };
const navButtons = () =>
  within(screen.getByRole('navigation', { name: 'Pagination' })).getAllByRole(
    'button'
  );
const sizePicker = () =>
  screen
    .getByRole('combobox', { name: 'Rows per page' })
    .closest('[data-testid="select"]')!.parentElement!;

describe('TablePagination phoneCompact', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hides the range and the page-size control below sm, keeping them from sm up', () => {
    render(
      <TablePagination
        page={page}
        onSizeChange={vi.fn()}
        unit="txn"
        phoneCompact
      />
    );
    expect(screen.getByText('151–200').parentElement).toHaveClass(
      'hidden',
      'sm:inline'
    );
    expect(sizePicker()).toHaveClass('hidden', 'sm:block');
  });

  it('hides the plain count below sm too, on a single page', () => {
    render(
      <TablePagination
        page={{ number: 0, size: 50, totalPages: 1, totalElements: 12 }}
        unit="txn"
        phoneCompact
      />
    );
    expect(screen.getByText('12 txns').parentElement).toHaveClass(
      'hidden',
      'sm:inline'
    );
  });

  it('uses the smaller buttons on a phone', () => {
    stubPhone(true);
    render(<TablePagination page={page} phoneCompact />);
    for (const b of navButtons()) expect(b).toHaveClass('h-7');
  });

  it('keeps the regular buttons on a wider screen', () => {
    stubPhone(false);
    render(<TablePagination page={page} phoneCompact />);
    for (const b of navButtons()) expect(b).toHaveClass('h-8');
  });

  it('without phoneCompact never hides the range or the size control, and keeps regular buttons on a phone', () => {
    stubPhone(true);
    render(<TablePagination page={page} onSizeChange={vi.fn()} unit="txn" />);
    expect(screen.getByText('151–200').parentElement).not.toHaveClass('hidden');
    expect(sizePicker()).not.toHaveClass('hidden');
    for (const b of navButtons()) expect(b).toHaveClass('h-8');
  });
});
