import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ChoiceCard } from './ChoiceCard';

const widgets = (
  <>
    <ChoiceCard value="util" title="Card utilisation" description="Share of limit used" meta="Half width · needs: card" />
    <ChoiceCard value="bills" title="Bills due" description="Due in the next 7 days" />
    <ChoiceCard value="loans" title="Loans" disabled />
  </>
);

describe('ChoiceCard', () => {
  it('renders title, description and meta', () => {
    render(<ChoiceCard.Group>{widgets}</ChoiceCard.Group>);
    expect(screen.getByText('Card utilisation')).toBeInTheDocument();
    expect(screen.getByText('Share of limit used')).toBeInTheDocument();
    expect(screen.getByText('Half width · needs: card')).toBeInTheDocument();
  });

  it('uncontrolled: starts from defaultValue and selects on click', () => {
    const onValueChange = vi.fn();
    render(
      <ChoiceCard.Group defaultValue="util" onValueChange={onValueChange}>
        {widgets}
      </ChoiceCard.Group>,
    );
    expect(screen.getByRole('radio', { name: /Card utilisation/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: /Bills due/ }));
    expect(onValueChange).toHaveBeenCalledWith('bills');
    expect(screen.getByRole('radio', { name: /Bills due/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Card utilisation/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('controlled: the value prop decides, a click only reports', () => {
    const onValueChange = vi.fn();
    render(
      <ChoiceCard.Group value="util" onValueChange={onValueChange}>
        {widgets}
      </ChoiceCard.Group>,
    );
    fireEvent.click(screen.getByRole('radio', { name: /Bills due/ }));
    expect(onValueChange).toHaveBeenCalledWith('bills');
    expect(screen.getByRole('radio', { name: /Card utilisation/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('a disabled card cannot be chosen', () => {
    const onValueChange = vi.fn();
    render(<ChoiceCard.Group onValueChange={onValueChange}>{widgets}</ChoiceCard.Group>);
    const loans = screen.getByRole('radio', { name: /Loans/ });
    expect(loans).toBeDisabled();
    fireEvent.click(loans);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('arrow keys move the choice and skip disabled cards', () => {
    const onValueChange = vi.fn();
    render(
      <ChoiceCard.Group defaultValue="util" onValueChange={onValueChange}>
        {widgets}
      </ChoiceCard.Group>,
    );
    const util = screen.getByRole('radio', { name: /Card utilisation/ });
    util.focus();
    fireEvent.keyDown(util, { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenLastCalledWith('bills');
    expect(screen.getByRole('radio', { name: /Bills due/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('radio', { name: /Bills due/ }), { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenLastCalledWith('util');
  });

  it('only the chosen card is a tab stop', () => {
    render(<ChoiceCard.Group defaultValue="bills">{widgets}</ChoiceCard.Group>);
    expect(screen.getByRole('radio', { name: /Bills due/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: /Card utilisation/ })).toHaveAttribute('tabindex', '-1');
  });

  it('the group takes layout classes', () => {
    render(
      <ChoiceCard.Group className="grid-cols-1 desk:grid-cols-3" data-testid="g">
        {widgets}
      </ChoiceCard.Group>,
    );
    expect(screen.getByTestId('g')).toHaveClass('desk:grid-cols-3');
  });
});
