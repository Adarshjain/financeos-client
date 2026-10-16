import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Icon } from '../Icon/Icon';
import { Button } from './Button';

describe('Button component', () => {
  it('renders children correctly', () => {
    render(<Button>Save changes</Button>);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('handles click events when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled button</Button>);
    const button = screen.getByRole('button', { name: 'Disabled button' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders all variants with proper classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-brand', 'text-on-brand');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-surface', 'text-ink', 'border-line-strong');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-danger', 'border-danger-border');

    rerender(<Button variant="danger-filled">Danger Filled</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-danger', 'text-on-brand');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent', 'text-ink');

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole('button')).toHaveClass('underline', 'font-bold');
  });

  it('handles link variant clicks and disabled state', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="link" onClick={handleClick}>
        Reconcile
      </Button>,
    );
    const linkBtn = screen.getByRole('button', { name: 'Reconcile' });
    fireEvent.click(linkBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button variant="link" disabled onClick={handleClick}>
        Reconcile
      </Button>,
    );
    fireEvent.click(linkBtn);
    expect(handleClick).toHaveBeenCalledTimes(1); // not incremented
  });

  it('renders all sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-control-sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-control-md');

    rerender(<Button size="xl">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-control-xl');
  });

  it('renders loading state with spinner icon and keeps label or loadingLabel', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button loading loadingLabel="Saving…" onClick={handleClick}>
        Save
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(screen.getByTestId('spinner-icon')).toHaveClass('animate-spin');
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();

    // Keeps original label when loadingLabel is omitted
    rerender(<Button loading>Save</Button>);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByTestId('spinner-icon')).toHaveClass('animate-spin');
  });

  it('renders icon-only button with aria-label', () => {
    render(
      <Button
        iconOnly
        aria-label="Search"
        icon={<Icon name="search" size="md" data-testid="search-icon" />}
      />
    );

    const button = screen.getByRole('button', { name: 'Search' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('aspect-square', 'p-0');
  });

  it('renders count pill when count prop is provided', () => {
    const { rerender } = render(
      <Button icon={<Icon name="check" size="md" />} count={9}>
        Approve
      </Button>
    );

    expect(screen.getByRole('button')).toHaveTextContent('Approve');
    const pill = screen.getByText('9');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveClass('bg-ink', 'text-on-brand');

    rerender(
      <Button variant="primary" count={5}>
        Approve rules
      </Button>
    );
    const primaryPill = screen.getByText('5');
    expect(primaryPill).toBeInTheDocument();
    expect(primaryPill).toHaveClass('bg-surface', 'text-ink');
  });

  it('renders asChild with Slot', () => {
    render(
      <Button asChild variant="primary">
        <a href="#test-link">Link Button</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Link Button' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#test-link');
    expect(link).toHaveClass('bg-brand', 'text-on-brand');
  });

  it('renders google variant with full width, control-xl, image icon, and default label', () => {
    render(<Button variant="google" />);
    const btn = screen.getByRole('button', { name: 'Continue with Google' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('w-full', 'h-control-xl');

    const img = btn.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/brand/google-g.svg');
    expect(img).toHaveAttribute('width', '18');
    expect(img).toHaveAttribute('height', '18');
  });

  it('renders google variant with custom children', () => {
    render(<Button variant="google">Sign in with Google</Button>);
    expect(
      screen.getByRole('button', { name: 'Sign in with Google' }),
    ).toBeInTheDocument();
  });

  describe('tile variant', () => {
    it('renders iconPosition="start" (default) with 46px height, ink-3 icon, and start alignment', () => {
      const handleClick = vi.fn();
      render(
        <Button
          variant="tile"
          icon={<Icon name="accounts" size="lg" data-testid="tile-icon" />}
          onClick={handleClick}
        >
          Accounts
        </Button>,
      );

      const btn = screen.getByRole('button', { name: /Accounts/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass(
        'bg-surface',
        'border',
        'border-line',
        'rounded-ds-lg',
        'text-body-strong',
        'text-ink',
        'justify-start',
        'text-left',
        'w-full',
      );

      const iconWrapper = screen.getByTestId('tile-icon').parentElement;
      expect(iconWrapper).toHaveClass('text-ink-3');

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders iconPosition="top" with 64px (h-16), centred, and label in ink-2', () => {
      render(
        <Button
          variant="tile"
          iconPosition="top"
          icon={<Icon name="add" size="lg" data-testid="tile-icon-top" />}
        >
          Transaction
        </Button>,
      );

      const btn = screen.getByRole('button', { name: /Transaction/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass(
        'h-16',
        'rounded-ds-lg',
        'text-label',
        'text-ink-2',
        'flex-col',
        'items-center',
        'justify-center',
        'text-center',
        'w-full',
      );

      const iconWrapper = screen.getByTestId('tile-icon-top').parentElement;
      expect(iconWrapper).toHaveClass('text-ink-3');
    });

    it('renders asChild wrapping a link with no underline', () => {
      render(
        <Button variant="tile" asChild>
          <a href="#test-accounts">
            <Icon name="accounts" size="lg" data-testid="link-icon" />
            Accounts
          </a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: /Accounts/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '#test-accounts');
      expect(link).toHaveClass('bg-surface', 'border', 'border-line', 'no-underline', 'w-full');
    });

    it('suppresses count badge on tile variant', () => {
      render(
        <Button variant="tile" count={5}>
          Accounts
        </Button>,
      );

      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('handles disabled state properly on tile', () => {
      const handleClick = vi.fn();
      render(
        <Button variant="tile" disabled onClick={handleClick}>
          Disabled Tile
        </Button>,
      );

      const btn = screen.getByRole('button', { name: /Disabled Tile/i });
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
