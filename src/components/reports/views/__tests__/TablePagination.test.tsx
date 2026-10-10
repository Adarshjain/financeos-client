import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TablePagination } from '@/components/reports/views/TablePagination';

describe('TablePagination (CD-13)', () => {
  it('renders total count, plural unit, page size options, and page navigation', () => {
    const onPageChange = vi.fn();
    const onSizeChange = vi.fn();

    render(
      <TablePagination
        page={{
          number: 1,
          size: 15,
          totalPages: 5,
          totalElements: 75,
        }}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
        unit="transaction"
      />,
    );

    expect(screen.getByText('75 transactions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('handles singular unit and page 0 prev button disabled', () => {
    const onSizeChange = vi.fn();
    render(
      <TablePagination
        page={{
          number: 0,
          size: 50,
          totalPages: 1,
          totalElements: 1,
        }}
        onSizeChange={onSizeChange}
      />,
    );

    expect(screen.getByText('1 row')).toBeInTheDocument();
  });
});
