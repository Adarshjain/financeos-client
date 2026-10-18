import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SearchPalette,type SearchPaletteGroup } from './SearchPalette';

const makeGroups = (onSelect = vi.fn()): SearchPaletteGroup[] => [
  {
    id: 'accounts',
    label: 'Accounts',
    items: [
      { id: 'regalia', title: 'HDFC Regalia Gold', trailing: '₹44,319', onSelect: () => onSelect('regalia') },
      { id: 'statements', title: 'Regalia · Statements', trailing: '3', onSelect: () => onSelect('statements') },
    ],
  },
  { id: 'empty', label: 'Pages', items: [] },
  {
    id: 'transactions',
    label: 'Transactions',
    meta: '8 on Regalia',
    items: [
      { id: 'croma', title: 'Croma Electronics', disabled: true, onSelect: () => onSelect('croma') },
      { id: 'payment', title: 'Payment received', onSelect: () => onSelect('payment') },
    ],
  },
];

const rows = () => screen.getAllByRole('option');
const row = (name: string) => screen.getByRole('option', { name: new RegExp(name) });
const input = () => screen.getByRole('searchbox');

describe('SearchPalette', () => {
  it('renders nothing while closed', () => {
    render(<SearchPalette groups={makeGroups()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the search field and the groups in order, skipping empty groups', () => {
    render(<SearchPalette defaultOpen groups={makeGroups()} />);
    expect(input()).toHaveAttribute('placeholder', 'Search…');
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('8 on Regalia')).toBeInTheDocument();
    expect(screen.queryByText('Pages')).toBeNull();
    expect(rows().map((r) => r.textContent)).toEqual([
      'HDFC Regalia Gold₹44,319',
      'Regalia · Statements3',
      'Croma Electronics',
      'Payment received',
    ]);
  });

  it('typing updates the search text, controlled or not', () => {
    const onValueChange = vi.fn();
    render(<SearchPalette defaultOpen groups={makeGroups()} onValueChange={onValueChange} />);
    fireEvent.change(input(), { target: { value: 'regalia' } });
    expect(onValueChange).toHaveBeenCalledWith('regalia');
    expect(input()).toHaveValue('regalia');
  });

  it('highlights the first row and moves with the arrow keys, skipping disabled rows', () => {
    render(<SearchPalette defaultOpen groups={makeGroups()} />);
    expect(row('HDFC Regalia')).toHaveClass('bg-brand-tint');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(row('Statements')).toHaveClass('bg-brand-tint');
    expect(row('HDFC Regalia')).not.toHaveClass('bg-brand-tint');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(row('Payment')).toHaveClass('bg-brand-tint');
    expect(row('Croma')).not.toHaveClass('bg-brand-tint');
  });

  it('Enter picks the highlighted row: runs its onSelect and closes', () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(<SearchPalette defaultOpen groups={makeGroups(onSelect)} onOpenChange={onOpenChange} />);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('statements');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clicking a row picks it; a disabled row does nothing', () => {
    const onSelect = vi.fn();
    render(<SearchPalette defaultOpen groups={makeGroups(onSelect)} />);
    fireEvent.click(row('Croma'));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(row('Payment'));
    expect(onSelect).toHaveBeenCalledWith('payment');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the highlight returns to the first row when the results change', () => {
    const { rerender } = render(<SearchPalette defaultOpen groups={makeGroups()} />);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    const next: SearchPaletteGroup[] = [
      { id: 'pages', label: 'Pages', items: [{ id: 'rewards', title: 'Rewards', onSelect: vi.fn() }] },
    ];
    rerender(<SearchPalette defaultOpen groups={next} />);
    expect(row('Rewards')).toHaveClass('bg-brand-tint');
  });

  it('while loading shows skeleton rows instead of results', () => {
    render(<SearchPalette defaultOpen loading groups={makeGroups()} />);
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(document.querySelector('[data-loading]')!.children).toHaveLength(4);
  });

  it('with search text and no results says so, in overridable words', () => {
    const { rerender } = render(<SearchPalette defaultOpen value="zomato" groups={[]} />);
    expect(screen.getByText('No results for "zomato"')).toBeInTheDocument();
    rerender(<SearchPalette defaultOpen value="zomato" groups={[]} emptyLabel={(q) => `Nothing for ${q}`} />);
    expect(screen.getByText('Nothing for zomato')).toBeInTheDocument();
  });

  it('with no search text and no results shows nothing', () => {
    render(<SearchPalette defaultOpen value="  " groups={[]} />);
    expect(screen.queryByText(/No results/)).toBeNull();
  });

  it('⌘ or Ctrl + shortcutKey toggles it; without shortcutKey the keys do nothing', () => {
    const { unmount } = render(<SearchPalette shortcutKey="k" groups={makeGroups()} />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'K', ctrlKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();
    render(<SearchPalette groups={makeGroups()} />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape and the phone Cancel button close it', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<SearchPalette open groups={makeGroups()} onOpenChange={onOpenChange} />);
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    onOpenChange.mockClear();
    rerender(<SearchPalette open groups={makeGroups()} onOpenChange={onOpenChange} cancelLabel="Back" />);
    const cancel = screen.getByRole('button', { name: 'Back' });
    expect(cancel).toHaveClass('lg:hidden');
    fireEvent.click(cancel);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('desktop shows an esc key and move / open hints with overridable words', () => {
    render(<SearchPalette defaultOpen groups={makeGroups()} moveLabel="go" openLabel="pick" />);
    expect(screen.getByText('esc')).toHaveClass('hidden', 'lg:inline-flex');
    const footer = screen.getByText('go').closest('.lg\\:block')!;
    expect(footer).toHaveClass('hidden');
    expect(footer).toHaveTextContent(/go.*Enter.*pick/);
  });
});
