import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Pager } from './Pager';

describe('Pager', () => {
  it('renders range and total count with / by default', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        unit="transactions"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('/ 182')).toBeInTheDocument();
    expect(screen.getByText('transactions')).toBeInTheDocument();
  });

  it('does not render unit when not provided', () => {
    const { container } = render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('/ 182')).toBeInTheDocument();
    expect(container.querySelector('.desk\\:inline')).toBeNull();
  });

  it('renders custom summary when supplied', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        summary={({ start, end, total }) => `${start}–${end} of ${total} transactions`}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50 of 182 transactions')).toBeInTheDocument();
    expect(screen.queryByText('/ 182')).not.toBeInTheDocument();
  });

  it('handles 0 totalElements', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={0}
        totalPages={1}
        unit="transactions"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('/ 0')).toBeInTheDocument();
  });

  it('marks active page with aria-current="page"', () => {
    render(
      <Pager
        page={1} // 0-based page 1 is "2"
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
      />,
    );

    const activePageBtn = screen.getByRole('button', { name: /Page 2/i });
    expect(activePageBtn).toHaveAttribute('aria-current', 'page');
  });

  it('renders each page number exactly once in the DOM with desktop neighbours carrying hidden desk:inline-flex', () => {
    const { container } = render(
      <Pager
        page={4} // page 5 of 10
        size={50}
        totalElements={500}
        totalPages={10}
        onPageChange={() => {}}
      />,
    );

    [1, 4, 5, 6, 10].forEach((num) => {
      expect(screen.getAllByRole('button', { name: `Page ${num}` })).toHaveLength(1);
    });
    [2, 3, 7, 8, 9].forEach((num) => {
      expect(screen.queryByRole('button', { name: `Page ${num}` })).not.toBeInTheDocument();
    });

    // Pages 4 and 6 are neighbours of page 5, so they carry hidden desk:inline-flex
    expect(screen.getByRole('button', { name: 'Page 4' })).toHaveClass('hidden', 'desk:inline-flex');
    expect(screen.getByRole('button', { name: 'Page 6' })).toHaveClass('hidden', 'desk:inline-flex');
    // Active, first and last pages show on both forms
    ['Page 1', 'Page 5', 'Page 10'].forEach((name) => {
      expect(screen.getByRole('button', { name })).not.toHaveClass('hidden');
    });
    // One ellipsis on each side, shown on both forms
    const gaps = Array.from(container.querySelectorAll('[aria-hidden="true"]')).filter((el) => el.textContent === '…');
    expect(gaps).toHaveLength(2);
    gaps.forEach((gap) => {
      expect(gap).not.toHaveClass('hidden');
      expect(gap).not.toHaveClass('desk:hidden');
    });
  });

  it('shows the page in a one-page gap instead of hiding it or using an ellipsis', () => {
    const { container } = render(
      <Pager page={0} size={10} totalElements={30} onPageChange={() => {}} />,
    );

    // Page 1 of 3 on phone: 1 2 3, never "1 3"
    ['Page 1', 'Page 2', 'Page 3'].forEach((name) => {
      expect(screen.getByRole('button', { name })).not.toHaveClass('hidden');
    });
    expect(container.textContent).not.toContain('…');
  });

  it('gives the phone form its own ellipsis where it drops a desktop neighbour', () => {
    const { container } = render(
      <Pager page={3} size={10} totalElements={60} onPageChange={() => {}} />,
    );

    // Page 4 of 6: desktop 1 2 3 4 5 6, phone 1 … 4 5 6
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveClass('hidden', 'desk:inline-flex');
    expect(screen.getByRole('button', { name: 'Page 5' })).not.toHaveClass('hidden');
    const gaps = Array.from(container.querySelectorAll('[aria-hidden="true"]')).filter((el) => el.textContent === '…');
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toHaveClass('desk:hidden');
    expect(gaps[0]).not.toHaveClass('hidden');
  });

  it('compact variant trims the padding and uses small controls', () => {
    render(
      <Pager variant="compact" page={0} size={10} totalElements={30} onPageChange={() => {}} />,
    );

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveClass('py-space-4', 'text-label');
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveClass('h-control-sm', 'min-w-control-sm');
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveClass('h-control-sm');
  });

  it('disables previous button on first page', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Next page' }),
    ).not.toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pager
        page={3}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('triggers onPageChange when clicking page numbers and arrows', () => {
    const handlePageChange = vi.fn();
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={handlePageChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(handlePageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: /Page 4/i }));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('triggers onSizeChange when changing page size via Select and formats with sizeLabel', () => {
    const handleSizeChange = vi.fn();
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
        onSizeChange={handleSizeChange}
        sizeOptions={[25, 50, 100]}
        sizeLabel={(n) => `${n} / page`}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Rows per page' });
    expect(trigger).toHaveTextContent('50 / page');
    fireEvent.click(trigger);

    const option = screen.getByRole('option', { name: '100 / page' });
    fireEvent.click(option);
    expect(handleSizeChange).toHaveBeenCalledWith(100);
  });

  it('hides arrows and page buttons for single page lists', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={25}
        totalPages={1}
        unit="needing review"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–25')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Previous page' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next page' }),
    ).not.toBeInTheDocument();
  });

  it('applies responsive hidden classes to unit on mobile viewports', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        unit="transactions"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('/ 182')).toBeInTheDocument();
    expect(screen.getByText('transactions')).toHaveClass('hidden', 'desk:inline');
  });
});
