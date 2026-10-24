import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl width', () => {
  it('hugs its content in a grid cell or flex column when not fullWidth', () => {
    render(<SegmentedControl options={['Debit', 'Credit']} />);
    expect(screen.getByRole('radiogroup')).toHaveClass('inline-flex', 'w-fit', 'self-start', 'justify-self-start');
  });

  it('fullWidth keeps the full width', () => {
    render(<SegmentedControl options={['Debit', 'Credit']} fullWidth />);
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveClass('flex', 'w-full');
    expect(group).not.toHaveClass('w-fit');
  });
});
