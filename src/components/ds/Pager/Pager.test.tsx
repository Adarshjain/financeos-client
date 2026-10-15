import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { getPageNumbers, Pager } from './Pager';

describe('getPageNumbers', () => {
  it('implements desktop ellipsis formula: first, current ± 1, last with ellipsis in gaps', () => {
    // ‹ 1 2 … 4 › on page 1 of 4
    expect(getPageNumbers(0, 4, false)).toEqual([0, 1, 'ellipsis', 3]);
    // ‹ 1 … 3 4 › on page 4 of 4
    expect(getPageNumbers(3, 4, false)).toEqual([0, 'ellipsis', 2, 3]);
    // ‹ 1 … 4 5 6 … 10 › on page 5 of 10
    expect(getPageNumbers(4, 10, false)).toEqual([0, 'ellipsis', 3, 4, 5, 'ellipsis', 9]);
    // returns empty array for single page
    expect(getPageNumbers(0, 1, false)).toEqual([]);
  });

  it('implements phone ellipsis formula: one neighbour fewer', () => {
    // ‹ 1 … 4 › on page 1 of 4
    expect(getPageNumbers(0, 4, true)).toEqual([0, 'ellipsis', 3]);
    // ‹ 1 … 4 › on page 4 of 4
    expect(getPageNumbers(3, 4, true)).toEqual([0, 'ellipsis', 3]);
    // ‹ 1 … 3 4 › on page 3 of 4
    expect(getPageNumbers(2, 4, true)).toEqual([0, 'ellipsis', 2, 3]);
  });
});

describe('Pager', () => {
  it('renders range and total count with pluralized unit', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        unit="transaction"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('of 182')).toBeInTheDocument();
    expect(screen.getByText('transactions')).toBeInTheDocument();
  });

  it('handles 0 totalElements', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={0}
        totalPages={1}
        unit="transaction"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('of 0')).toBeInTheDocument();
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

  it('triggers onSizeChange when changing page size via dropdown menu', () => {
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
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Rows per page' });
    fireEvent.pointerDown(trigger, { button: 0 });

    const option = screen.getByRole('menuitem', { name: '100 / page' });
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

  it('hides unit in phone variant', () => {
    render(
      <Pager
        variant="phone"
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        unit="transaction"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('of 182')).toBeInTheDocument();
    expect(screen.queryByText('transactions')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Rows per page' }),
    ).not.toBeInTheDocument();
  });
});
