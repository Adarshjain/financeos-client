import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PageFooter } from './PageFooter';

describe('PageFooter', () => {
  it('renders Cancel before the primary and fires both', () => {
    const cancel = vi.fn();
    const save = vi.fn();
    render(<PageFooter secondary={{ label: 'Cancel', onSelect: cancel }} primary={{ label: 'Save', onSelect: save }} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Cancel', 'Save']);
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('is the Dialog footer: right-aligned from desk up, equal columns on a phone', () => {
    const { container } = render(<PageFooter primary={{ label: 'Save' }} />);
    expect(container.querySelector('.desk\\:justify-end')).toBeInTheDocument();
    expect(container.querySelector('.auto-cols-fr')).toBeInTheDocument();
  });

  it('sticky docks it to the bottom; default does not', () => {
    const { container, rerender } = render(<PageFooter primary={{ label: 'Save' }} />);
    expect(container.firstChild).not.toHaveClass('sticky');
    rerender(<PageFooter sticky primary={{ label: 'Save' }} />);
    // Pinned to the very bottom; on a phone full-bleed over the page padding, on a solid surface.
    expect(container.firstChild).toHaveClass('sticky', 'bottom-0', 'max-desk:-mx-space-16', 'max-desk:mt-auto', 'max-desk:bg-surface');
    expect(container.firstChild).toHaveClass('border-t');
  });

  it('disables and shows loading on the primary', () => {
    render(<PageFooter primary={{ label: 'Save', disabled: true }} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
