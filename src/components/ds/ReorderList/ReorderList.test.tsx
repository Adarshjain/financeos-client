import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ReorderList } from './ReorderList';

const items = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma' },
];

const titles = () =>
  screen.getAllByText(/^(Alpha|Beta|Gamma|Delta)$/).map((el) => el.textContent);

describe('ReorderList', () => {
  it('moves a row up and reports the new ids (controlled)', () => {
    const onValueChange = vi.fn();
    render(<ReorderList items={items} value={['a', 'b', 'c']} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move up Beta' }));
    expect(onValueChange).toHaveBeenCalledWith(['b', 'a', 'c']);
    expect(titles()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('moves a row down', () => {
    const onValueChange = vi.fn();
    render(<ReorderList items={items} value={['a', 'b', 'c']} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move down Beta' }));
    expect(onValueChange).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('disables Move up on the first row and Move down on the last', () => {
    render(<ReorderList items={items} defaultValue={['a', 'b', 'c']} />);
    expect(screen.getByRole('button', { name: 'Move up Alpha' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move down Gamma' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move down Alpha' })).toBeEnabled();
  });

  it('reorders itself when uncontrolled and numbers rows from 1', () => {
    render(<ReorderList items={items} defaultValue={['a', 'b', 'c']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move down Alpha' }));
    expect(titles()).toEqual(['Beta', 'Alpha', 'Gamma']);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('appends items missing from value and ignores unknown ids', () => {
    render(<ReorderList items={items} value={['c', 'zzz']} />);
    expect(titles()).toEqual(['Gamma', 'Alpha', 'Beta']);
  });

  it('renders the item trailing node and custom labels', () => {
    render(
      <ReorderList
        items={[{ id: 'a', title: 'Alpha', trailing: <button type="button">Remove Alpha</button> }, items[1]]}
        labels={{ moveUp: 'Raise', moveDown: 'Lower' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lower Alpha' })).toBeInTheDocument();
  });

  it('uses ariaLabel when the title is a node', () => {
    render(<ReorderList items={[{ id: 'a', title: <b>Alpha</b>, ariaLabel: 'Alpha model' }]} />);
    expect(screen.getByRole('button', { name: 'Move up Alpha model' })).toBeInTheDocument();
  });

  it('shows the moved row selected until another row moves', () => {
    render(<ReorderList items={items} defaultValue={['a', 'b', 'c']} />);
    const row = (t: string) => screen.getByText(t).closest('.border-l-brand-strong');
    expect(row('Beta')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Move down Beta' }));
    expect(row('Beta')).not.toBeNull();
    expect(row('Alpha')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Move up Gamma' }));
    expect(row('Gamma')).not.toBeNull();
    expect(row('Beta')).toBeNull();
  });

  it('drops a move the parent ignored when value later changes another way', () => {
    const { rerender } = render(<ReorderList items={items} value={['a', 'b', 'c']} onValueChange={vi.fn()} />);
    const row = (t: string) => screen.getByText(t).closest('.border-l-brand-strong');
    fireEvent.click(screen.getByRole('button', { name: 'Move down Alpha' }));
    rerender(<ReorderList items={items} value={['c', 'b', 'a']} onValueChange={vi.fn()} />);
    expect(row('Alpha')).toBeNull();
    expect(screen.getByRole('button', { name: 'Move down Alpha' })).not.toHaveFocus();
  });

  it('keeps focus on the same arrow of the moved row, else the other arrow', () => {
    render(<ReorderList items={items} defaultValue={['a', 'b', 'c']} />);
    const down = screen.getByRole('button', { name: 'Move down Alpha' });
    down.focus();
    fireEvent.click(down);
    expect(screen.getByRole('button', { name: 'Move down Alpha' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Move down Alpha' }));
    // Alpha is now last: Move down is disabled, so focus lands on Move up.
    expect(screen.getByRole('button', { name: 'Move up Alpha' })).toHaveFocus();
  });

  it('scrolls the moved row into view when the browser supports it', () => {
    const scroll = vi.fn();
    const proto = HTMLElement.prototype as { scrollIntoView?: unknown };
    const original = proto.scrollIntoView;
    proto.scrollIntoView = scroll;
    render(<ReorderList items={items} defaultValue={['a', 'b', 'c']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move down Alpha' }));
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
    proto.scrollIntoView = original;
  });
});
