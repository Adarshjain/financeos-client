import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UpcomingControls } from '../UpcomingControls';

describe('UpcomingControls', () => {
  it('renders all kind chips and fires onKind with the chosen value', async () => {
    const onKind = vi.fn();
    render(<UpcomingControls months={3} onMonths={vi.fn()} kind="all" onKind={onKind} />);
    for (const l of ['All', 'Card bills', 'EMIs', 'Lending', 'Statements']) {
      expect(screen.getByRole('button', { name: l })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole('button', { name: 'EMIs' }));
    expect(onKind).toHaveBeenCalledWith('emi');
    await userEvent.click(screen.getByRole('button', { name: 'Card bills' }));
    expect(onKind).toHaveBeenCalledWith('card_bill');
    await userEvent.click(screen.getByRole('button', { name: 'Lending' }));
    expect(onKind).toHaveBeenCalledWith('lending_due');
    await userEvent.click(screen.getByRole('button', { name: 'Statements' }));
    expect(onKind).toHaveBeenCalledWith('statement_expected');
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onKind).toHaveBeenCalledWith('all');
  });

  it('shows the active chip with a different variant class than the others', () => {
    render(<UpcomingControls months={3} onMonths={vi.fn()} kind="emi" onKind={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'EMIs' }).className).not.toBe(screen.getByRole('button', { name: 'All' }).className);
  });

  it('horizon select shows the current months, pluralised', () => {
    const { rerender } = render(<UpcomingControls months={3} onMonths={vi.fn()} kind="all" onKind={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Horizon' })).toHaveTextContent('3 Months');
    rerender(<UpcomingControls months={1} onMonths={vi.fn()} kind="all" onKind={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Horizon' })).toHaveTextContent('1 Month');
  });
});
