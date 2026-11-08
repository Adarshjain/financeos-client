import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SignOutRow } from './SignOutRow';

describe('SignOutRow', () => {
  it('goes inactive while the sign-out action runs, so a second press does nothing', async () => {
    let finish: () => void = () => undefined;
    const action = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(
      <form action={action}>
        <SignOutRow />
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(screen.getByRole('button', { name: 'Sign out' })).not.toBeDisabled();
  });
});
