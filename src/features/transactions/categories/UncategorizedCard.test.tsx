import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UncategorizedCard } from './UncategorizedCard';

describe('UncategorizedCard', () => {
  it('shows the count, the rows, a Review link and Tag per row', () => {
    const onTag = vi.fn();
    render(
      <UncategorizedCard
        count={23}
        reviewHref="/transactions?x=1"
        rows={[
          { id: 'a', description: 'IKEA India', detail: '3 Oct · ₹7,430' },
          { id: 'b', description: 'Croma', detail: '9 Sep · ₹24,990' },
        ]}
        onTag={onTag}
      />,
    );
    expect(screen.getByText('Uncategorized · 23')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Review/ }).getAttribute('href')).toBe('/transactions?x=1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Tag' })[1]);
    expect(onTag).toHaveBeenCalledWith('b');
  });
});
