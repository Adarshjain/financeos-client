import { fireEvent, render, screen } from '@testing-library/react';
import { Check, Search } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

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
  });

  it('renders all sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-control-sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-control-md');

    rerender(<Button size="xl">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-control-xl');
  });

  it('renders loading state with ongoing label and spinner', () => {
    const handleClick = vi.fn();
    render(
      <Button loading loadingLabel="Saving…" onClick={handleClick}>
        Save
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders icon-only button with aria-label', () => {
    render(
      <Button
        iconOnly
        aria-label="Search"
        icon={<Search data-testid="search-icon" />}
      />
    );

    const button = screen.getByRole('button', { name: 'Search' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('aspect-square', 'p-0');
  });

  it('renders count pill when count prop is provided', () => {
    render(
      <Button icon={<Check />} count={9}>
        Approve
      </Button>
    );

    expect(screen.getByRole('button')).toHaveTextContent('Approve');
    expect(screen.getByText('9')).toBeInTheDocument();
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
});
