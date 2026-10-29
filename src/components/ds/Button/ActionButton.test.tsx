import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LinkProvider } from '../LinkProvider';
import { ActionButton } from './ActionButton';

describe('ActionButton', () => {
  it('renders a button and calls onSelect without an href', () => {
    const onSelect = vi.fn();
    render(<ActionButton onSelect={onSelect}>Retry</ActionButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders a real link with an href', () => {
    render(<ActionButton href="/accounts">Go to accounts</ActionButton>);
    const link = screen.getByRole('link', { name: 'Go to accounts' });
    expect(link).toHaveAttribute('href', '/accounts');
  });

  it('a disabled action with an href is a disabled button, not a link', () => {
    render(
      <ActionButton href="/accounts" disabled>
        Go to accounts
      </ActionButton>,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: 'Go to accounts' })).toBeDisabled();
  });

  it('still calls onSelect on a link click', () => {
    const onSelect = vi.fn();
    render(<ActionButton href="#x" onSelect={onSelect}>Open</ActionButton>);
    fireEvent.click(screen.getByRole('link', { name: 'Open' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders the app link component from LinkProvider', () => {
    const AppLink = ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
      <a href={href} data-app-link="" {...rest}>{children}</a>
    );
    render(
      <LinkProvider component={AppLink}>
        <ActionButton href="/loans">Go to loans</ActionButton>
      </LinkProvider>,
    );
    expect(screen.getByRole('link', { name: 'Go to loans' })).toHaveAttribute('data-app-link');
  });
});
