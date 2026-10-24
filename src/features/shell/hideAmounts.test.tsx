import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Conceal } from '@/components/ds';

import { HideAmountsProvider, useHideAmounts } from './hideAmounts';
import { HIDE_AMOUNTS_COOKIE } from './hideAmountsName';

const cookie = () => document.cookie.split('; ').find((c) => c.startsWith(`${HIDE_AMOUNTS_COOKIE}=`));

afterEach(() => {
  document.cookie = `${HIDE_AMOUNTS_COOKIE}=; path=/; max-age=0`;
});

describe('HideAmountsProvider', () => {
  it('starts from the value the server read, so the first render is already right', () => {
    render(
      <HideAmountsProvider initialHidden>
        <Conceal>₹1,250.00</Conceal>
      </HideAmountsProvider>,
    );
    expect(screen.getByText('₹ —')).toBeInTheDocument();
  });

  it('toggling updates Conceal at once and saves the choice in the cookie', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HideAmountsProvider initialHidden={false}>
        <Conceal>₹1,250.00</Conceal>
        {children}
      </HideAmountsProvider>
    );
    const { result } = renderHook(() => useHideAmounts(), { wrapper });
    expect(screen.getByText('₹1,250.00')).toBeInTheDocument();
    act(() => result.current.setHidden(true));
    expect(screen.getByText('₹ —')).toBeInTheDocument();
    expect(cookie()).toBe(`${HIDE_AMOUNTS_COOKIE}=1`);
    act(() => result.current.setHidden(false));
    expect(screen.getByText('₹1,250.00')).toBeInTheDocument();
    expect(cookie()).toBe(`${HIDE_AMOUNTS_COOKIE}=0`);
  });
});
