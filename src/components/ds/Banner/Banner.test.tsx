import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Banner } from './Banner';

describe('Banner', () => {
  it('renders children content', () => {
    render(<Banner tone="info">That item is already handled.</Banner>);
    expect(
      screen.getByText('That item is already handled.'),
    ).toBeInTheDocument();
  });

  it('renders danger tone with alert role and danger tokens', () => {
    const { container } = render(
      <Banner tone="danger">Email or password is incorrect.</Banner>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-danger-tint',
      'text-danger-ink',
      'rounded-ds-lg',
    );
  });

  it('renders success tone with status role and positive tokens', () => {
    const { container } = render(
      <Banner tone="success">Your account has been deleted.</Banner>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-positive-tint',
      'text-positive-strong',
    );
  });

  it('renders warning tone with status role and warning tokens', () => {
    const { container } = render(
      <Banner tone="warning">2 bank credits look like dividends.</Banner>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-warning-tint',
      'text-warning-ink',
    );
  });

  it('renders info tone with status role and info tokens', () => {
    const { container } = render(
      <Banner tone="info">That item is already handled.</Banner>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-info-tint',
      'text-info-ink',
    );
  });

  it('renders neutral tone with surface background and border', () => {
    const { container } = render(
      <Banner tone="neutral">
        Changing the pattern unlinks the 31 transactions it categorised.
      </Banner>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-surface',
      'text-ink-2',
      'border-line',
    );
  });

  it('renders lead-in title and action with items-center', () => {
    const handleAction = vi.fn();
    const { container } = render(
      <Banner
        tone="warning"
        title="2 bank credits look like dividends."
        action={{ label: 'Reconcile', onSelect: handleAction }}
      >
        Additional details
      </Banner>,
    );
    expect(container.firstChild).toHaveClass('items-center');
    expect(
      screen.getByText('2 bank credits look like dividends.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Additional details')).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: 'Reconcile' });
    expect(actionBtn).toBeInTheDocument();
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders block-level paragraph children without invalid HTML nesting in span', () => {
    render(
      <Banner tone="info" title="Note:">
        <p data-testid="para-content">This is a block paragraph inside the banner.</p>
      </Banner>,
    );
    const para = screen.getByTestId('para-content');
    expect(para).toBeInTheDocument();
    expect(screen.getByText('Note:')).toBeInTheDocument();
    // Parent of the paragraph should be a div, not a span
    expect(para.parentElement?.tagName.toLowerCase()).toBe('div');
  });

  it('renders dismiss button with close Icon and calls onDismiss on click', () => {
    const handleDismiss = vi.fn();
    render(
      <Banner tone="info" onDismiss={handleDismiss}>
        Dismissible message
      </Banner>,
    );
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('rounded picks the corner radius step, lg by default', () => {
    const { container, rerender } = render(<Banner tone="info">Refresh to use the latest version.</Banner>);
    const root = () => container.firstChild as HTMLElement;
    expect(root()).toHaveClass('rounded-ds-lg');
    rerender(<Banner tone="info" rounded="md">Refresh to use the latest version.</Banner>);
    expect(root()).toHaveClass('rounded-ds-md');
    rerender(<Banner tone="info" rounded="sm">Refresh to use the latest version.</Banner>);
    expect(root()).toHaveClass('rounded-ds-sm');
    rerender(<Banner tone="info" rounded="none">Refresh to use the latest version.</Banner>);
    expect(root()).toHaveClass('rounded-none');
    expect(root()).not.toHaveClass('rounded-ds-lg');
  });

  it('keeps its own message padding when the page adds padding around it', () => {
    const { container } = render(
      <Banner tone="info" rounded="none" className="pt-safe-top" action={{ label: 'Refresh', onSelect: vi.fn() }} onDismiss={vi.fn()}>
        Refresh to use the latest version.
      </Banner>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('pt-safe-top', 'bg-info-tint');
    expect(root.firstChild).toHaveClass('px-space-12', 'py-space-10');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});

describe('Banner action href', () => {
  it('draws the action as a link when it has an href', () => {
    render(<Banner action={{ label: 'Open upcoming', href: '/upcoming' }}>Heads up</Banner>);
    expect(screen.getByRole('link', { name: 'Open upcoming' })).toHaveAttribute('href', '/upcoming');
  });
});
