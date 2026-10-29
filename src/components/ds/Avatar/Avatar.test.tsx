import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Avatar } from './Avatar';

describe('Avatar component', () => {
  it('renders initials from children', () => {
    render(<Avatar>HD</Avatar>);
    expect(screen.getByText('HD')).toBeInTheDocument();
  });

  it('renders initials from prop', () => {
    render(<Avatar initials="AM" />);
    expect(screen.getByText('AM')).toBeInTheDocument();
  });

  it('neutral initials sit on a light tile in dark mode', () => {
    render(<Avatar>HD</Avatar>);
    expect(screen.getByText('HD')).toHaveClass('dark:bg-ink', 'dark:text-on-brand');
  });

  it('a photo keeps a light tile in dark mode', () => {
    const { container } = render(<Avatar src="/a.png" alt="A" tone="brand" />);
    expect(container.firstChild).toHaveClass('dark:bg-ink');
  });

  it('renders rounded variant with neutral tone (default)', () => {
    render(<Avatar variant="rounded" tone="neutral">HD</Avatar>);
    const el = screen.getByText('HD');
    expect(el).toHaveClass('rounded-ds-md', 'bg-canvas', 'text-ink-2');
  });

  it('renders circle variant with brand tone', () => {
    render(<Avatar variant="circle" tone="brand">PN</Avatar>);
    const el = screen.getByText('PN');
    expect(el).toHaveClass('rounded-ds-pill', 'bg-brand-tint', 'text-brand-strong');
  });

  it('renders square variant with inverse tone', () => {
    render(<Avatar variant="square" tone="inverse">SB</Avatar>);
    const el = screen.getByText('SB');
    expect(el).toHaveClass('rounded-ds-sm', 'bg-brand', 'text-on-brand');
  });

  it('renders unified sizes sm, md, lg across variants', () => {
    const { rerender } = render(<Avatar size="sm" variant="rounded">HD</Avatar>);
    expect(screen.getByText('HD')).toHaveClass('h-space-24', 'w-space-24');

    rerender(<Avatar size="md" variant="rounded">HD</Avatar>);
    expect(screen.getByText('HD')).toHaveClass('h-control-md', 'w-control-md');

    rerender(<Avatar size="md" variant="circle" tone="brand">PN</Avatar>);
    expect(screen.getByText('PN')).toHaveClass('h-control-md', 'w-control-md');

    rerender(<Avatar size="md" variant="square" tone="inverse">SB</Avatar>);
    expect(screen.getByText('SB')).toHaveClass('h-control-md', 'w-control-md');

    rerender(<Avatar size="lg" variant="rounded">HD</Avatar>);
    expect(screen.getByText('HD')).toHaveClass('h-control-xl', 'w-control-xl');
  });

  it('renders image when src is provided and falls back on error', () => {
    render(
      <Avatar
        src="https://example.test/invalid.png"
        alt="User Avatar"
        initials="AM"
      />,
    );

    const img = screen.getByRole('img', { name: 'User Avatar' });
    expect(img).toBeInTheDocument();

    // Trigger image error
    fireEvent.error(img);

    expect(screen.getByText('AM')).toBeInTheDocument();
  });

  it('resets image error when src changes', () => {
    const { rerender } = render(
      <Avatar
        src="https://example.test/invalid.png"
        alt="User Avatar"
        initials="AM"
      />,
    );

    const img = screen.getByRole('img', { name: 'User Avatar' });
    fireEvent.error(img);
    expect(screen.getByText('AM')).toBeInTheDocument();

    rerender(
      <Avatar
        src="https://example.test/valid.png"
        alt="User Avatar"
        initials="AM"
      />,
    );
    expect(screen.getByRole('img', { name: 'User Avatar' })).toBeInTheDocument();
  });

  it('spreads imgProps onto the img element with loading="lazy" default', () => {
    render(
      <Avatar
        src="https://example.test/image.png"
        alt="User Avatar"
        imgProps={{ referrerPolicy: 'no-referrer' }}
      />,
    );

    const img = screen.getByRole('img', { name: 'User Avatar' });
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  });
});
