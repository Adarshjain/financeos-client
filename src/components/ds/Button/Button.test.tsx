import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Icon } from '../Icon/Icon';
import { Button } from './Button';

const underlineEl = () => document.querySelector('[data-underline]') as HTMLElement;

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
    expect(screen.getByRole('button')).toHaveClass('underline', 'font-bold', 'decoration-line-heavy');
  });

  it('draws danger-link as a link in the danger colour', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="danger-link" onClick={handleClick}>
        Delete statement
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Delete statement' });
    expect(btn).toHaveClass('underline', 'font-bold', 'decoration-line-heavy', 'text-danger', 'p-0', 'hover:text-danger-hover', 'active:text-danger-pressed');
    expect(btn).not.toHaveClass('border', 'bg-surface');
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button variant="danger-link" disabled onClick={handleClick}>
        Delete statement
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete statement' }));
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button variant="danger-link" icon={<svg data-testid="i" />}>
        Delete
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('no-underline');
    expect(underlineEl()).toHaveClass('after:bg-line-heavy');
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

  it('renders fullWidth with w-full class', () => {
    render(<Button fullWidth>Save</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  describe('layout="stacked"', () => {
    it('renders with 64px height (h-space-64), flex-col, and icon above label', () => {
      const handleClick = vi.fn();
      render(
        <Button
          layout="stacked"
          icon={<Icon name="add" size="lg" data-testid="stacked-icon" />}
          onClick={handleClick}
        >
          Transaction
        </Button>,
      );

      const btn = screen.getByRole('button', { name: /Transaction/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass(
        'h-space-64',
        'rounded-ds-lg',
        'text-label',
        'flex-col',
        'items-center',
        'justify-center',
        'text-center',
      );

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('asChild slot behavior', () => {
    it('renders asChild with Slot around link', () => {
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

    it('renders icon and count inside child in asChild mode', () => {
      render(
        <Button
          asChild
          icon={<Icon name="wallet" size="md" data-testid="aschild-icon" />}
          count={12}
        >
          <a href="#accounts">Accounts</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: /Accounts/i });
      expect(link).toBeInTheDocument();
      expect(screen.getByTestId('aschild-icon')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('draws the dot inside child in asChild mode', () => {
      render(
        <Button asChild iconOnly dot aria-label="Alerts">
          <a href="#alerts">
            <Icon name="notifications" size="md" />
          </a>
        </Button>,
      );
      const link = screen.getByRole('link', { name: 'Alerts' });
      expect(link).toHaveClass('relative');
      expect(within(link).getByTestId('button-dot')).toBeInTheDocument();
    });

    it('applies loading state inside child in asChild mode', () => {
      render(
        <Button asChild loading loadingLabel="Loading…">
          <a href="#loading">Proceed</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: /Loading…/i });
      expect(link).toHaveAttribute('data-disabled', 'true');
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveClass('pointer-events-none', 'opacity-45');
      expect(screen.getByTestId('spinner-icon')).toBeInTheDocument();
    });

    it('applies disabled state in asChild mode', () => {
      render(
        <Button asChild disabled>
          <a href="#disabled">Disabled Link</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'Disabled Link' });
      expect(link).toHaveAttribute('data-disabled', 'true');
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveClass('pointer-events-none', 'opacity-45');
    });
  });
});

describe('Button md height (UAT)', () => {
  it('md text and icon-only buttons are 36px, the same as a form field', () => {
    const { rerender } = render(<Button>Save</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-control-md');
    rerender(<Button iconOnly aria-label="More"><Icon name="more" /></Button>);
    expect(screen.getByRole('button')).toHaveClass('h-control-md', 'aspect-square');
  });
});

describe('Button type size (UAT)', () => {
  it.each(['sm', 'md', 'xl'] as const)('size %s uses the label type style', (size) => {
    render(<Button size={size}>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveClass('text-label');
    expect(btn).not.toHaveClass('text-caption');
    expect(btn).not.toHaveClass('text-heading');
  });

  describe('link underline with icon', () => {
    it('draws a continuous underline element spanning the control for text + icon', () => {
      render(
        <Button variant="link">
          <Icon name="add" size="sm" />
          Add
        </Button>,
      );
      const cls = underlineEl().className;
      expect(cls).toContain('after:absolute');
      expect(cls).toContain('after:inset-x-0');
      expect(cls).toContain('after:bg-line-heavy');
      expect(cls).toContain('relative');
      expect(screen.getByRole('button').className).toContain('no-underline');
    });

    it('puts the underline on a content-width wrapper, not the stretched button', () => {
      render(
        <Button variant="link" fullWidth icon={<Icon name="download" />}>
          Download CSV
        </Button>,
      );
      const btn = screen.getByRole('button');
      const wrap = underlineEl();
      expect(btn.className).not.toContain('after:');
      expect(btn.className).toContain('justify-center');
      expect(btn.className).toContain('group/link');
      expect(wrap.className).toContain('group-hover/link:after:hidden');
      expect(wrap.className).toContain('inline-flex');
      expect(wrap.className).not.toContain('w-full');
      expect(wrap).toHaveTextContent('Download CSV');
      expect(btn.contains(wrap)).toBe(true);
    });

    it('sizes link icons 2px under the text via icon-inline, for any Icon size', () => {
      render(
        <Button variant="link" icon={<Icon name="add" size="lg" />}>
          Add
        </Button>,
      );
      expect(screen.getByRole('button').className).toContain('[&_svg]:size-icon-inline');
    });

    it('works through the icon prop and asChild', () => {
      render(
        <Button variant="link" asChild>
          <a href="#x">
            Go
            <Icon name="chevron-right" size="sm" />
          </a>
        </Button>,
      );
      expect(underlineEl().className).toContain('after:inset-x-0');
    });

    it('keeps text-decoration for text-only links and none for icon-only', () => {
      const { rerender } = render(<Button variant="link">Text</Button>);
      expect(screen.getByRole('button').className).not.toContain('after:absolute');
      rerender(
        <Button variant="link" iconOnly aria-label="x">
          <Icon name="add" size="sm" />
        </Button>,
      );
      expect(screen.getByRole('button').className).not.toContain('after:absolute');
    });
  });
  describe('link icon gap', () => {
    it('puts a 2px gap between a link icon and its text', () => {
      render(
        <Button variant="link" icon={<Icon name="add" />}>
          Add bank account
        </Button>
      );
      expect(underlineEl().className).toContain('gap-space-2');
    });
  });
});

describe('Button dot', () => {
  it('draws a danger dot and keeps the button relative', () => {
    render(<Button iconOnly dot aria-label="Alerts"><Icon name="notifications" size="md" /></Button>);
    const btn = screen.getByRole('button', { name: 'Alerts' });
    expect(btn).toHaveClass('relative');
    expect(within(btn).getByTestId('button-dot')).toHaveClass('bg-danger', 'absolute');
  });

  it('draws no dot by default', () => {
    render(<Button iconOnly aria-label="Alerts"><Icon name="notifications" size="md" /></Button>);
    expect(screen.queryByTestId('button-dot')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).not.toHaveClass('relative');
  });

  describe('danger-ghost', () => {
    it('is a ghost in the danger colour with the control height', () => {
      render(<Button variant="danger-ghost">Delete</Button>);
      const b = screen.getByRole('button', { name: 'Delete' });
      expect(b).toHaveClass('bg-transparent', 'text-danger', 'hover:text-danger-hover', 'active:text-danger-pressed', 'h-control-md');
      expect(b).not.toHaveClass('underline');
    });

    it('keeps the disabled and loading states of ghost', () => {
      const { rerender } = render(<Button variant="danger-ghost" disabled>Delete</Button>);
      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
      rerender(<Button variant="danger-ghost" loading>Delete</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });
  });
});
