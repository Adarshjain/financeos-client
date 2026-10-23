import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Conceal, ConcealProvider, concealText, useConcealed, useConcealedAnywhere } from './Conceal';
import { concealMoney } from './concealMoney';

describe('concealText', () => {
  it('replaces each ₹ amount and keeps the other words', () => {
    expect(concealText('of ₹1.55L · 18 days left')).toBe('of ₹ — · 18 days left');
    expect(concealText('▲ ₹41,220 vs ₹1,00,000.50')).toBe('▲ ₹ — vs ₹ —');
  });
  it('takes the sign with the amount', () => {
    expect(concealText('+₹2,15,000.00')).toBe('₹ —');
    expect(concealText('-₹180.00')).toBe('₹ —');
    expect(concealText('₹-180')).toBe('₹ —');
  });
  it('leaves text without an amount, and words that start like a suffix', () => {
    expect(concealText('62%')).toBe('62%');
    expect(concealText('₹500 Last month')).toBe('₹ — Last month');
  });
  it('whole replaces everything, for a bare amount', () => {
    expect(concealText('3,600.00', true)).toBe('₹ —');
  });
  it('whole leaves an empty, blank or dash value as it is', () => {
    expect(concealText('', true)).toBe('');
    expect(concealText('  ', true)).toBe('  ');
    expect(concealText('—', true)).toBe('—');
    expect(concealText('-', true)).toBe('-');
    expect(concealText('-5.00', true)).toBe('₹ —');
  });
});

describe('Conceal', () => {
  it('shows its children outside a provider and while amounts are shown', () => {
    render(<Conceal>₹1,250.00</Conceal>);
    expect(screen.getByText('₹1,250.00')).toBeInTheDocument();
  });

  it('shows "₹ —" in place of the amounts while hidden', () => {
    render(
      <ConcealProvider concealed>
        <Conceal>₹1,250.00 spent</Conceal>
      </ConcealProvider>,
    );
    expect(screen.getByText('₹ — spent')).toBeInTheDocument();
    expect(screen.queryByText(/1,250/)).toBeNull();
  });

  it('masks `value` and not the children when children are nodes', () => {
    render(
      <ConcealProvider concealed>
        <Conceal whole value="450.00">
          <b>450</b>
        </Conceal>
      </ConcealProvider>,
    );
    expect(screen.getByText('₹ —')).toBeInTheDocument();
    expect(screen.queryByText('450')).toBeNull();
  });

  it('whole with nothing to read still hides a node', () => {
    render(
      <ConcealProvider concealed>
        <Conceal whole>
          <b>450</b>
        </Conceal>
      </ConcealProvider>,
    );
    expect(screen.getByText('₹ —')).toBeInTheDocument();
  });

  it('keeps other text when hidden and the text has no amount', () => {
    render(
      <ConcealProvider concealed>
        <Conceal>62%</Conceal>
      </ConcealProvider>,
    );
    expect(screen.getByText('62%')).toBeInTheDocument();
  });
});

describe('placeholder and fragments', () => {
  it('a blank placeholder leaves the spot empty', () => {
    expect(concealText('₹80,806', true, '')).toBe('');
    render(
      <ConcealProvider concealed>
        <p data-testid="p">
          <Conceal whole placeholder="">
            ₹80,806
          </Conceal>
        </p>
      </ConcealProvider>,
    );
    expect(screen.getByTestId('p')).toHaveTextContent('');
  });
  it('concealMoney reaches strings inside fragments and arrays', () => {
    render(
      <ConcealProvider concealed>
        <p>{concealMoney(<>Due ₹500, {['₹1,000', ' soon']}</>)}</p>
      </ConcealProvider>,
    );
    expect(screen.getByText('Due ₹ —, ₹ — soon')).toBeInTheDocument();
  });
});

describe('useConcealed', () => {
  function Probe() {
    return <span>{useConcealed() ? 'hidden' : 'shown'}</span>;
  }
  it('is false by default and follows the provider', () => {
    const { rerender } = render(<Probe />);
    expect(screen.getByText('shown')).toBeInTheDocument();
    rerender(
      <ConcealProvider concealed>
        <Probe />
      </ConcealProvider>,
    );
    expect(screen.getByText('hidden')).toBeInTheDocument();
  });
});

describe('concealMoney', () => {
  it('wraps only strings that hold a ₹ amount', () => {
    render(
      <ConcealProvider concealed>
        <p>{concealMoney('Due ₹500')}</p>
        <p>{concealMoney('Due soon')}</p>
      </ConcealProvider>,
    );
    expect(screen.getByText('Due ₹ —')).toBeInTheDocument();
    expect(screen.getByText('Due soon')).toBeInTheDocument();
  });
});

describe('ConcealProvider store', () => {
  it('resets the outside-the-provider flag when the provider unmounts', () => {
    const outside = renderHook(() => useConcealedAnywhere());
    expect(outside.result.current).toBe(false);
    const inside = render(<ConcealProvider concealed>x</ConcealProvider>);
    expect(outside.result.current).toBe(true);
    act(() => inside.unmount());
    expect(outside.result.current).toBe(false);
  });
});
