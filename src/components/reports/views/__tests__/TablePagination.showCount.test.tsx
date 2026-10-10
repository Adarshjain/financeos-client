import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TablePagination } from '@/components/reports/views/TablePagination';

const page = { number: 0, size: 25, totalPages: 2, totalElements: 30 };

describe('TablePagination showCount', () => {
  it('prints the total count by default', () => {
    render(<TablePagination page={page} />);
    expect(screen.getByText('30 rows')).toBeInTheDocument();
  });

  it('with showCount off prints no count but keeps the paging controls', () => {
    render(<TablePagination page={page} showCount={false} />);
    expect(screen.queryByText(/30 rows?/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
  });
});
