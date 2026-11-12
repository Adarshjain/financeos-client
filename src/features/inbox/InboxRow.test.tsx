import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InboxRow } from './InboxRow';
import { item } from './inboxTestUtils';

describe('InboxRow', () => {
  it('is one link to the row page, with no buttons or menu', () => {
    render(<InboxRow item={item({ key: 'bill:s1', title: 'Card bill due', subtitle: 'Due in 2 days', href: '/accounts/a1' })} />);
    const link = screen.getByTestId('inbox-row');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/accounts/a1');
    expect(link).toHaveTextContent('Card bill due');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'More options' })).toBeNull();
  });

  it('a grouped row shows its count and the full subtitle', () => {
    const subtitle = 'First long item title · Second long item title · Third long item title · Fourth long item title';
    render(<InboxRow item={item({ key: 'page:/investments/nps', title: 'NPS: 4 to review', subtitle, count: 4, href: '/investments/nps' })} />);
    expect(screen.getByTestId('inbox-row')).toHaveAttribute('href', '/investments/nps');
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(subtitle)).toBeInTheDocument();
  });

  it('a single row has no count badge', () => {
    render(<InboxRow item={item({ key: 'a', title: 'One thing', href: '/x', count: 1 })} />);
    expect(screen.queryByText('1')).toBeNull();
  });
});
