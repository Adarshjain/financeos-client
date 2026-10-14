import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Kbd } from './Kbd';

describe('Kbd component', () => {
  it('renders a kbd element with text', () => {
    render(<Kbd>⌘N</Kbd>);
    const kbd = screen.getByText('⌘N');
    expect(kbd).toBeInTheDocument();
    expect(kbd.tagName.toLowerCase()).toBe('kbd');
  });

  it('applies the design system styling classes', () => {
    render(<Kbd>Esc</Kbd>);
    const kbd = screen.getByText('Esc');
    expect(kbd).toHaveClass(
      'bg-surface',
      'border-line-strong',
      'text-ink-2',
      'rounded-ds-xs',
      'text-caption',
      'font-bold',
    );
  });

  it('merges custom layout classes from className', () => {
    render(<Kbd className="ml-auto">J</Kbd>);
    expect(screen.getByText('J')).toHaveClass('ml-auto');
  });
});
