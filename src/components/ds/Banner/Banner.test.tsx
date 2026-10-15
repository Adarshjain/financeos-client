import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Banner } from './Banner';

describe('Banner', () => {
  it('renders children content', () => {
    render(<Banner tone="info">That item is already handled.</Banner>);
    expect(screen.getByText('That item is already handled.')).toBeInTheDocument();
  });

  it('renders error tone with alert role and danger tokens', () => {
    const { container } = render(
      <Banner tone="err">Email or password is incorrect.</Banner>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-danger-tint',
      'text-danger-ink',
      'rounded-ds-lg',
    );
  });

  it('renders ok tone with status role and positive tokens', () => {
    const { container } = render(
      <Banner tone="ok">Your account has been deleted.</Banner>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-positive-tint',
      'text-positive-strong',
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

  it('renders warn tone with status role and warning tokens', () => {
    const { container } = render(
      <Banner tone="warn">2 lines were skipped.</Banner>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-warning-tint',
      'text-warning-ink',
    );
  });

  it('renders trailing action element', () => {
    render(
      <Banner
        tone="err"
        action={<button type="button" data-testid="retry-btn">Retry</button>}
      >
        Failed to load
      </Banner>,
    );
    expect(screen.getByTestId('retry-btn')).toBeInTheDocument();
  });
});
