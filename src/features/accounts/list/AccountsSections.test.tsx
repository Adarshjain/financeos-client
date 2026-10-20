import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/accounts/form/ds/AccountDialogs', () => ({ useAccountDialogs: () => ({ open: vi.fn() }) }));
vi.mock('@/features/accounts/form/ds/AccountFormDialog', () => ({ AccountFormDialog: () => null }));

import { NameCell } from './AccountsSections';

describe('NameCell', () => {
  it('shows name, last4 and sub, and no logo', () => {
    render(<NameCell name="Magnus" last4="9911" sub="Shared limit" />);
    expect(screen.getByText('Magnus')).toBeInTheDocument();
    expect(screen.getByText('••9911')).toBeInTheDocument();
    expect(screen.getByText('Shared limit')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
