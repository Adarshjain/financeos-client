import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Callout, Note } from './Callout';

describe('Callout', () => {
  it('renders title and message content', () => {
    render(
      <Callout title="2 bank credits look like dividends.">
        Action needed
      </Callout>,
    );
    expect(
      screen.getByText('2 bank credits look like dividends.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Action needed')).toBeInTheDocument();
  });

  it('applies callout token styles', () => {
    const { container } = render(
      <Callout>2 bank credits look like dividends.</Callout>,
    );
    expect(container.firstChild).toHaveClass(
      'bg-warning-tint',
      'text-warning-ink',
      'rounded-ds-lg',
    );
  });

  it('renders note component with canvas ground and ink-2 text', () => {
    const { container } = render(
      <Note>
        Changing the pattern unlinks the 31 transactions it categorised.
      </Note>,
    );
    expect(container.firstChild).toHaveClass('bg-canvas', 'text-ink-2');
  });

  it('renders warning-banner variant', () => {
    const { container } = render(
      <Callout variant="warning-banner">2 lines were skipped.</Callout>,
    );
    expect(container.firstChild).toHaveClass(
      'bg-warning-tint',
      'text-warning-ink',
    );
  });

  it('renders action element', () => {
    render(
      <Callout
        action={<a href="#reconcile" data-testid="reconcile-link">Reconcile</a>}
      >
        Unmatched credits
      </Callout>,
    );
    expect(screen.getByTestId('reconcile-link')).toBeInTheDocument();
  });
});
