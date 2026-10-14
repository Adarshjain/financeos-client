import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders account variant with rounded-ds-md, bg-canvas, text-ink-2', () => {
    render(<Avatar variant="account">HD</Avatar>);
    const el = screen.getByText('HD');
    expect(el).toHaveClass('rounded-ds-md', 'bg-canvas', 'text-ink-2');
  });

  it('renders person variant with rounded-ds-pill, bg-brand-tint, text-brand-strong', () => {
    render(<Avatar variant="person">PN</Avatar>);
    const el = screen.getByText('PN');
    expect(el).toHaveClass('rounded-ds-pill', 'bg-brand-tint', 'text-brand-strong');
  });

  it('renders logo variant with rounded-ds-sm, bg-brand, text-on-brand', () => {
    render(<Avatar variant="logo">SB</Avatar>);
    const el = screen.getByText('SB');
    expect(el).toHaveClass('rounded-ds-sm', 'bg-brand', 'text-on-brand');
  });

  it('renders sizes sm, md, xl', () => {
    const { rerender } = render(<Avatar size="sm" variant="account">HD</Avatar>);
    expect(screen.getByText('HD')).toHaveClass('h-space-24');

    rerender(<Avatar size="md" variant="account">HD</Avatar>);
    expect(screen.getByText('HD')).toHaveClass('h-control-md');

    rerender(<Avatar size="xl" variant="account">HD</Avatar>);
    expect(screen.getByText('HD')).toHaveClass('h-control-xl');
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
});
