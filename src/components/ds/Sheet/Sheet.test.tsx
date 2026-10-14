import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHandle,
  SheetShell,
  SheetTrigger,
} from './Sheet';

describe('SheetShell', () => {
  it('renders title, subtitle and body content', () => {
    render(
      <SheetShell
        title="Set statement details"
        subtitle="HDFC Regalia · 5 Oct"
      >
        <SheetBody>Form inputs</SheetBody>
      </SheetShell>,
    );
    expect(screen.getByText('Set statement details')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia · 5 Oct')).toBeInTheDocument();
    expect(screen.getByText('Form inputs')).toBeInTheDocument();
  });

  it('renders drag handle with line-handle token', () => {
    const { container } = render(<SheetHandle />);
    expect(container.firstChild).toHaveClass(
      'w-space-40',
      'h-space-4',
      'rounded-ds-pill',
      'bg-line-handle',
    );
  });

  it('renders footer with buttons', () => {
    render(
      <SheetFooter>
        <button type="button">Cancel</button>
        <button type="button">Save</button>
      </SheetFooter>,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});

describe('Sheet (Radix bottom-sheet overlay)', () => {
  it('opens and displays content on trigger click', () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button type="button">Open Sheet</button>
        </SheetTrigger>
        <SheetContent title="Bottom Sheet Details">
          <SheetBody>Sheet is open</SheetBody>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.queryByText('Sheet is open')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Sheet' }));

    expect(screen.getByText('Sheet is open')).toBeInTheDocument();
  });
});
