import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ActionBar } from './ActionBar';

describe('ActionBar', () => {
  it('draws tertiary, secondary, primary left to right and fires onSelect', () => {
    const onT = vi.fn();
    const onS = vi.fn();
    const onP = vi.fn();
    render(
      <ActionBar
        actions={{
          tertiary: { label: 'Reset', onSelect: onT },
          secondary: { label: 'Cancel', onSelect: onS },
          primary: { label: 'Save report', onSelect: onP },
        }}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Reset', 'Cancel', 'Save report']);
    buttons.forEach((b) => fireEvent.click(b));
    expect(onT).toHaveBeenCalledTimes(1);
    expect(onS).toHaveBeenCalledTimes(1);
    expect(onP).toHaveBeenCalledTimes(1);
  });

  it('fills only the primary; the others are links (danger-link for tone danger)', () => {
    render(
      <ActionBar
        actions={{
          tertiary: { label: 'Delete', tone: 'danger' },
          secondary: { label: 'Cancel' },
          primary: { label: 'Save report' },
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save report' })).toHaveClass('bg-brand');
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveClass('bg-brand');
    expect(screen.getByRole('button', { name: 'Delete' }).className).toMatch(/danger/);
  });

  it('draws a destructive primary danger-filled', () => {
    render(<ActionBar actions={{ primary: { label: 'Delete report', destructive: true } }} />);
    expect(screen.getByRole('button', { name: 'Delete report' }).className).toMatch(/bg-danger/);
  });

  it('draws only the actions given', () => {
    render(<ActionBar actions={{ primary: { label: 'Create report' } }} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('disables and loads the primary without firing', () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ActionBar actions={{ primary: { label: 'Save report', disabled: true, onSelect } }} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
    expect(onSelect).not.toHaveBeenCalled();
    rerender(<ActionBar actions={{ primary: { label: 'Save report', loading: true, onSelect } }} />);
    expect(screen.getByTestId('spinner-icon')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Save report/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('draws an action icon before its label', () => {
    render(<ActionBar actions={{ primary: { label: 'Download CSV', icon: 'download' } }} />);
    const button = screen.getByRole('button', { name: 'Download CSV' });
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.textContent).toBe('Download CSV');
  });

  it('renders the start slot before the actions, and forwards ref, native props and className', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ActionBar
        ref={ref}
        data-testid="bar"
        className="extra"
        start={<span>Unsaved changes</span>}
        actions={{ primary: { label: 'Save report' } }}
      />,
    );
    expect(ref.current).toBe(screen.getByTestId('bar'));
    expect(ref.current).toHaveClass('extra', 'fixed');
    const note = screen.getByText('Unsaved changes');
    const save = screen.getByRole('button', { name: 'Save report' });
    expect(note.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not hide the tab bar (no data-selection-bar mark)', () => {
    const { container } = render(<ActionBar actions={{ primary: { label: 'Save' } }} />);
    expect(container.querySelector('[data-selection-bar]')).toBeNull();
  });
});
