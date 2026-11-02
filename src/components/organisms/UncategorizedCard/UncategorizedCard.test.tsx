import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UncategorizedCard } from './UncategorizedCard';

describe('UncategorizedCard', () => {
  it('says some transactions need a category, with no count and no group line', () => {
    render(<UncategorizedCard />);
    expect(screen.getByText('Some transactions need a category')).toBeInTheDocument();
    expect(screen.queryByText(/\d/)).toBeNull();
    expect(screen.queryByText(/group/)).toBeNull();
  });

  it('Sort them reports the press', async () => {
    const onSort = vi.fn();
    render(<UncategorizedCard onSort={onSort} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sort them' }));
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it('Sort them reports the pointer going down before the press completes', async () => {
    const onSortPress = vi.fn();
    const onSort = vi.fn();
    render(<UncategorizedCard onSort={onSort} onSortPress={onSortPress} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Sort them' }));
    expect(onSortPress).toHaveBeenCalledTimes(1);
    expect(onSort).not.toHaveBeenCalled();
  });
});
