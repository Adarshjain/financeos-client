import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsToggle } from './SettingsToggle';

describe('SettingsToggle organism', () => {
  it('renders label and description connected to switch', () => {
    render(
      <SettingsToggle
        label="Exclude from net worth"
        description="Hide this account from totals"
      />,
    );

    const label = screen.getByText('Exclude from net worth');
    const description = screen.getByText('Hide this account from totals');
    const switchEl = screen.getByRole('switch');

    expect(label).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(switchEl).toBeInTheDocument();
    expect(label).toHaveAttribute('for', switchEl.getAttribute('id'));
  });

  it('toggling calls onCheckedChange', () => {
    const handleCheckedChange = vi.fn();
    render(
      <SettingsToggle
        label="Exclude from net worth"
        onCheckedChange={handleCheckedChange}
      />,
    );

    const switchEl = screen.getByRole('switch');
    fireEvent.click(switchEl);
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });

  it('clicking the label toggles the switch', () => {
    const handleCheckedChange = vi.fn();
    render(
      <SettingsToggle
        label="Exclude from net worth"
        onCheckedChange={handleCheckedChange}
      />,
    );

    const label = screen.getByText('Exclude from net worth');
    fireEvent.click(label);
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });

  it('disabled blocks the toggle', () => {
    const handleCheckedChange = vi.fn();
    render(
      <SettingsToggle
        label="Exclude from net worth"
        disabled
        onCheckedChange={handleCheckedChange}
      />,
    );

    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeDisabled();

    fireEvent.click(switchEl);
    expect(handleCheckedChange).not.toHaveBeenCalled();

    const label = screen.getByText('Exclude from net worth');
    fireEvent.click(label);
    expect(handleCheckedChange).not.toHaveBeenCalled();
  });

  it('renders error line with Text component', () => {
    render(
      <SettingsToggle
        label="Enable alerts"
        error="You must verify email first"
      />,
    );

    const errorEl = screen.getByText('You must verify email first');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveClass('text-danger', 'text-caption');
  });

  it('renders borderTop when requested', () => {
    const { container } = render(
      <SettingsToggle label="Bordered" borderTop />,
    );
    expect(container.firstChild).toHaveClass('border-t');
  });
});

describe('SettingsToggle alignment (UAT)', () => {
  it('has no side padding so it lines up with the fields above it', () => {
    const { container } = render(<SettingsToggle label="Exclude from net worth" />);
    const row = container.firstChild as HTMLElement;
    expect(row.className).toContain('px-0');
    expect(row.className).not.toContain('px-space-16');
  });
});
