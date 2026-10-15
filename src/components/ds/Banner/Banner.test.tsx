import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

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

  it('supports legacy tone aliases err, ok, warn, callout, note', () => {
    const { container: cErr } = render(<Banner tone="err">Error</Banner>);
    expect(cErr.firstChild).toHaveClass('bg-danger-tint');

    const { container: cOk } = render(<Banner tone="ok">Ok</Banner>);
    expect(cOk.firstChild).toHaveClass('bg-positive-tint');

    const { container: cWarn } = render(<Banner tone="warn">Warn</Banner>);
    expect(cWarn.firstChild).toHaveClass('bg-warning-tint');

    const { container: cCallout } = render(
      <Banner tone="callout">Callout</Banner>,
    );
    expect(cCallout.firstChild).toHaveClass('bg-warning-tint');

    const { container: cNote } = render(<Banner tone="note">Note</Banner>);
    expect(cNote.firstChild).toHaveClass('bg-surface');
  });

  it('renders lead-in title and trailing action', () => {
    render(
      <Banner
        tone="warning"
        title="2 bank credits look like dividends."
        action={<button type="button">Reconcile</button>}
      >
        Additional details
      </Banner>,
    );
    expect(
      screen.getByText('2 bank credits look like dividends.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Additional details')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reconcile' }),
    ).toBeInTheDocument();
  });
});
