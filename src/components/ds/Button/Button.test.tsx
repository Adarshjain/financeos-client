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
      const cls = screen.getByRole('button').className;
      expect(cls).toContain('after:absolute');
      expect(cls).toContain('after:inset-x-0');
      expect(cls).toContain('after:bg-current');
      expect(cls).toContain('no-underline');
      expect(cls).toContain('relative');
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
      expect(screen.getByRole('link').className).toContain('after:inset-x-0');
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
  describe('icon size beside text', () => {
    it('draws the icon at xs when the button shows text', () => {
      render(
        <Button icon={<Icon name="add" size="md" />}>Add account</Button>
      );
      expect(screen.getByRole('button').className).toContain('[&_svg]:w-icon-xs');
    });

    it('draws an Icon child at xs beside text', () => {
      render(
        <Button>
          <Icon name="add" size="lg" />
          Add
        </Button>
      );
      expect(screen.getByRole('button').className).toContain('[&_svg]:w-icon-xs');
    });

    it('treats a raw svg (server-rendered Icon) beside text as an icon', () => {
      render(
        <Button>
          <svg data-testid="raw" />
          All
        </Button>
      );
      expect(screen.getByRole('button').className).toContain('[&_svg]:w-icon-xs');
    });

    it('does not apply xs to an svg-only child', () => {
      render(
        <Button aria-label="Go">
          <svg />
        </Button>
      );
      expect(screen.getByRole('button').className).not.toContain('[&_svg]:w-icon-xs');
    });

    it('keeps the icon size on an icon-only button', () => {
      const { container } = render(
        <Button iconOnly aria-label="Close" icon={<Icon name="close" size="md" />} />
      );
      expect(container.querySelector('svg')?.getAttribute('class')).toContain('w-icon-md');
    });

    it('puts a 2px gap between a link icon and its text', () => {
      render(
        <Button variant="link" icon={<Icon name="add" />}>
          Add bank account
        </Button>
      );
      expect(screen.getByRole('button').className).toContain('gap-space-2');
    });
  });
});
