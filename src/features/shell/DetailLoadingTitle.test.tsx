import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DetailLoadingTitle } from './DetailLoadingTitle';

let pathname = '/loans/l1';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/lib/viewTransition', () => ({
  SharedName: ({ name, children }: { name: string; children: React.ReactNode }) => <div data-name={name}>{children}</div>,
}));

describe('DetailLoadingTitle', () => {
  it('names the loan skeleton title after the loan in the address', () => {
    pathname = '/loans/l1';
    render(<DetailLoadingTitle kind="loan">Loan</DetailLoadingTitle>);
    expect(screen.getByText('Loan').closest('[data-name]')).toHaveAttribute('data-name', 'loan-l1');
  });

  it('names the person skeleton title after the person in the address', () => {
    pathname = '/loans/lendings/p1';
    render(<DetailLoadingTitle kind="person">Person</DetailLoadingTitle>);
    expect(screen.getByText('Person').closest('[data-name]')).toHaveAttribute('data-name', 'person-p1');
  });
});
