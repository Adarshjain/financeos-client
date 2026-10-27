import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ListTransition, RowTransition, SharedName, useDeferredRows, ViewTransition } from './viewTransition';
import { transitionName } from './viewTransitionNames';

afterEach(() => {
  vi.doUnmock('react');
  vi.resetModules();
});

describe('ViewTransition shim', () => {
  it('passes children through when React has no ViewTransition (the unit tests’ React)', () => {
    render(
      <ViewTransition name="x" enter="a">
        <p>Swiggy</p>
      </ViewTransition>,
    );
    expect(screen.getByText('Swiggy')).toBeInTheDocument();
  });

  it('uses React’s ViewTransition when React has one, with the class names each wrapper gives it', async () => {
    const seen: Array<Record<string, unknown>> = [];
    function FakeViewTransition({ children, ...props }: { children?: React.ReactNode }) {
      seen.push(props);
      return <div data-testid="vt">{children}</div>;
    }
    vi.doMock('react', async (importOriginal) => ({ ...(await importOriginal<object>()), ViewTransition: FakeViewTransition }));
    const shim = await import('./viewTransition');
    expect(shim.ViewTransition).toBe(FakeViewTransition);

    render(
      <shim.ListTransition>
        <shim.RowTransition>
          <shim.SharedName name="loan-l1">
            <span>Home loan</span>
          </shim.SharedName>
        </shim.RowTransition>
      </shim.ListTransition>,
    );
    expect(screen.getByText('Home loan')).toBeInTheDocument();
    expect(seen).toEqual([
      { default: 'none' },
      { enter: 'ds-row-enter', exit: 'ds-row-exit', update: 'ds-row-move', share: 'none' },
      { name: 'loan-l1', share: 'ds-morph', enter: 'none', exit: 'none', update: 'none' },
    ]);
  });

  it('the list, row and shared-name wrappers render their content unchanged', () => {
    render(
      <ListTransition>
        <ul>
          <RowTransition>
            <li>Zomato</li>
          </RowTransition>
          <RowTransition>
            <SharedName name={transitionName.account('a1')}>
              <li>HDFC Salary</li>
            </SharedName>
          </RowTransition>
        </ul>
      </ListTransition>,
    );
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Zomato', 'HDFC Salary']);
  });
});

describe('PageTransition', () => {
  afterEach(() => vi.doUnmock('next/navigation'));

  it('does not fade the first page the app opens on, then fades from the first move to another page on', async () => {
    const updates: unknown[] = [];
    function FakeViewTransition({ children, update }: { children?: React.ReactNode; update?: string }) {
      updates.push(update);
      return <>{children}</>;
    }
    let pathname = '/transactions';
    vi.doMock('react', async (importOriginal) => ({ ...(await importOriginal<object>()), ViewTransition: FakeViewTransition }));
    vi.doMock('next/navigation', () => ({ usePathname: () => pathname }));
    const { PageTransition } = await import('./viewTransition');

    const { rerender } = render(<PageTransition><p>Transactions</p></PageTransition>);
    expect(updates.at(-1)).toBe('none');
    pathname = '/inbox';
    rerender(<PageTransition><p>Inbox</p></PageTransition>);
    expect(updates.at(-1)).toBe('ds-page');
    pathname = '/transactions';
    rerender(<PageTransition><p>Transactions</p></PageTransition>);
    expect(updates.at(-1)).toBe('ds-page');
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });
});

describe('transitionName', () => {
  it('gives a row and its detail the same name, distinct per kind and id', () => {
    expect(transitionName.account('a1')).toBe('account-a1');
    expect(transitionName.loan('l1')).toBe('loan-l1');
    expect(transitionName.person('p1')).toBe('person-p1');
  });
});

describe('useDeferredRows', () => {
  function Rows({ rows, log }: { rows: string[]; log: string[][] }) {
    const shown = useDeferredRows(rows);
    log.push([...shown]);
    return <p>{shown.join(',')}</p>;
  }

  it('shows the first rows at once, with no empty render in between', () => {
    const log: string[][] = [];
    const { rerender } = render(<Rows rows={[]} log={log} />);
    log.length = 0;
    act(() => rerender(<Rows rows={['a', 'b']} log={log} />));
    expect(log[0]).toEqual(['a', 'b']);
    expect(screen.getByText('a,b')).toBeInTheDocument();
  });

  it('keeps the old rows for the urgent render and lands on the new ones in the deferred render', () => {
    const log: string[][] = [];
    const { rerender } = render(<Rows rows={['a', 'b']} log={log} />);
    log.length = 0;
    act(() => rerender(<Rows rows={['b']} log={log} />));
    expect(log[0]).toEqual(['a', 'b']);
    expect(log[log.length - 1]).toEqual(['b']);
    expect(screen.getByText('b')).toBeInTheDocument();
  });
});
