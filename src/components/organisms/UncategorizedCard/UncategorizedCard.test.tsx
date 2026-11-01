import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UncategorizedCard } from './UncategorizedCard';

const TOP = [
  { label: 'Ravi Kumar', count: 6 },
  { label: 'Sharma Medicals', count: 4 },
  { label: 'Green Leaf Café', count: 3 },
];

describe('UncategorizedCard', () => {
  it('says how many need a category, on phone and desktop wording', () => {
    render(<UncategorizedCard count={23} groupCount={7} topGroups={TOP} />);
    expect(screen.getByText('23 need a category')).toBeInTheDocument();
    expect(screen.getByText('23 transactions need a category')).toBeInTheDocument();
  });

  it('names the biggest group on phone and the top groups with "and N more" on desktop', () => {
    render(<UncategorizedCard count={23} groupCount={7} topGroups={TOP} />);
    expect(screen.getByText('In 7 groups. The biggest is Ravi Kumar, with 6.')).toBeInTheDocument();
    expect(screen.getByText('7 groups: Ravi Kumar (6), Sharma Medicals (4), Green Leaf Café (3) and 4 more')).toBeInTheDocument();
  });

  it('leaves out "and N more" when every group is listed', () => {
    render(<UncategorizedCard count={9} groupCount={2} topGroups={TOP.slice(0, 2)} />);
    expect(screen.getByText('2 groups: Ravi Kumar (6), Sharma Medicals (4)')).toBeInTheDocument();
  });

  it('has no group line when everything is a one-off', () => {
    render(<UncategorizedCard count={5} groupCount={0} topGroups={[]} />);
    expect(screen.getByText('5 need a category')).toBeInTheDocument();
    expect(screen.queryByText(/group/)).toBeNull();
  });

  it('uses the singular for one', () => {
    render(<UncategorizedCard count={1} groupCount={0} topGroups={[]} />);
    expect(screen.getByText('1 needs a category')).toBeInTheDocument();
    expect(screen.getByText('1 transaction needs a category')).toBeInTheDocument();
  });

  it('Sort them reports the press', async () => {
    const onSort = vi.fn();
    render(<UncategorizedCard count={23} groupCount={7} topGroups={TOP} onSort={onSort} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sort them' }));
    expect(onSort).toHaveBeenCalledTimes(1);
  });
});
