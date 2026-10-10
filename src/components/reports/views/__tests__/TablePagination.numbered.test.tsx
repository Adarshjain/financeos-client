import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { stubPhone } from '@/test/stubPhone';

vi.mock(
  '@/components/ui/select',
  async () => (await import('@/test/mockSelect')).selectMock
);

const pageNumbers = () =>
  within(screen.getByRole('navigation', { name: 'Pagination' }))
    .getAllByRole('button')
    .map((b) => b.getAttribute('aria-label'))
    .filter((l) => l?.startsWith('Page '))
    .map((l) => l!.slice(5));

describe('TablePagination numbered paging', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('says which rows are on screen out of the total', () => {
    render(
      <TablePagination
        page={{ number: 2, size: 50, totalPages: 25, totalElements: 1234 }}
        unit="txn"
      />
    );
    expect(screen.getByText('101–150')).toBeInTheDocument();
    expect(screen.getByText('1,234 txns')).toBeInTheDocument();
  });

  it('ends the range at the total on the last page', () => {
    render(
      <TablePagination
        page={{ number: 24, size: 50, totalPages: 25, totalElements: 1234 }}
        unit="txn"
      />
    );
    expect(screen.getByText('1,201–1,234')).toBeInTheDocument();
  });

  it('shows just the count, and no pager, when everything fits on one page', () => {
    render(
      <TablePagination
        page={{ number: 0, size: 50, totalPages: 1, totalElements: 12 }}
        unit="txn"
      />
    );
    expect(screen.getByText('12 txns')).toBeInTheDocument();
    expect(screen.queryByText(/–/)).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });

  it('marks the current page and jumps straight to a clicked page', () => {
    const onPageChange = vi.fn();
    render(
      <TablePagination
        page={{ number: 9, size: 10, totalPages: 20, totalElements: 200 }}
        onPageChange={onPageChange}
      />
    );
    expect(pageNumbers()).toEqual(['1', '9', '10', '11', '20']);
    expect(screen.getByRole('button', { name: 'Page 10' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('button', { name: 'Page 9' })).not.toHaveAttribute(
      'aria-current'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Page 20' }));
    expect(onPageChange).toHaveBeenLastCalledWith(19);
    fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));
    expect(onPageChange).toHaveBeenLastCalledWith(0);
  });

  it('does nothing when the current page is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <TablePagination
        page={{ number: 1, size: 10, totalPages: 3, totalElements: 30 }}
        onPageChange={onPageChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('shows a gap for skipped pages, hidden from screen readers', () => {
    const { container } = render(
      <TablePagination
        page={{ number: 9, size: 10, totalPages: 20, totalElements: 200 }}
      />
    );
    const gaps = container.querySelectorAll('[aria-hidden]');
    expect([...gaps].filter((g) => g.textContent === '…')).toHaveLength(2);
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(
      <TablePagination
        page={{ number: 0, size: 10, totalPages: 3, totalElements: 30 }}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Previous page' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    rerender(
      <TablePagination
        page={{ number: 2, size: 10, totalPages: 3, totalElements: 30 }}
      />
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('disables every page button while loading', () => {
    render(
      <TablePagination
        page={{ number: 1, size: 10, totalPages: 3, totalElements: 30 }}
        loading
      />
    );
    for (const b of within(
      screen.getByRole('navigation', { name: 'Pagination' })
    ).getAllByRole('button')) {
      expect(b).toBeDisabled();
    }
  });

  it('on a page past the end keeps the pager so you can step back, with the count only', () => {
    const onPageChange = vi.fn();
    // Rows were deleted after page 2 was opened: the server now has one page.
    render(
      <TablePagination
        page={{ number: 1, size: 50, totalPages: 1, totalElements: 50 }}
        onPageChange={onPageChange}
      />
    );
    expect(screen.getByText('50 rows')).toBeInTheDocument();
    expect(screen.queryByText(/–/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('offers the given page sizes instead of the defaults, plus the current one', () => {
    const onSizeChange = vi.fn();
    render(
      <TablePagination
        page={{ number: 0, size: 75, totalPages: 2, totalElements: 120 }}
        onSizeChange={onSizeChange}
        pageSizeOptions={[25, 50, 200]}
      />
    );
    expect(
      screen.getByRole('combobox', { name: 'Rows per page' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '25 / page',
      '50 / page',
      '75 / page',
      '200 / page',
    ]);
    fireEvent.click(screen.getByRole('option', { name: '200 / page' }));
    expect(onSizeChange).toHaveBeenCalledWith(200);
  });

  it('on a phone shows only the current page between the first and last', () => {
    stubPhone(true);
    render(
      <TablePagination
        page={{ number: 9, size: 10, totalPages: 20, totalElements: 200 }}
      />
    );
    expect(pageNumbers()).toEqual(['1', '10', '20']);
  });

  it('on a wider screen shows a sibling either side of the current page', () => {
    stubPhone(false);
    render(
      <TablePagination
        page={{ number: 9, size: 10, totalPages: 20, totalElements: 200 }}
      />
    );
    expect(pageNumbers()).toEqual(['1', '9', '10', '11', '20']);
  });
});
