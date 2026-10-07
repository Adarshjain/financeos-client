import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ObligationRefsSection } from '@/components/transactions/detail-content/ObligationRefsSection';
import type { ObligationRef } from '@/lib/transaction.types';

const ref: ObligationRef = {
  kind: 'DIVIDEND',
  id: 'div-1',
  parentId: 'inst-9',
  label: 'Dividend · INFY',
  amount: 1200,
};

function renderSection(refs: ObligationRef[], extra: { unlinkingId?: string | null; hideHeader?: boolean } = {}) {
  const onUnlinkDividend = vi.fn();
  render(
    <ObligationRefsSection
      refs={refs}
      unlinkingId={extra.unlinkingId ?? null}
      onUnlinkLending={vi.fn()}
      onUnlinkLoanPayment={vi.fn()}
      onUnlinkDividend={onUnlinkDividend}
      hideHeader={extra.hideHeader}
    />,
  );
  return { onUnlinkDividend };
}

describe('ObligationRefsSection DIVIDEND', () => {
  it('shows Open to the instrument dividends page', () => {
    renderSection([ref]);
    expect(screen.getByRole('link', { name: /Open/ })).toHaveAttribute(
      'href',
      '/investments/dividends?instrumentId=inst-9',
    );
  });

  it('omits Open when parentId is missing', () => {
    renderSection([{ ...ref, parentId: null }]);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('Unlink calls onUnlinkDividend with the dividend id (no confirmation)', () => {
    const { onUnlinkDividend } = renderSection([ref]);
    fireEvent.click(screen.getByRole('button', { name: /Unlink/ }));
    expect(onUnlinkDividend).toHaveBeenCalledWith('div-1');
  });

  it('disables Unlink while that dividend is unlinking', () => {
    renderSection([ref], { unlinkingId: 'div-1' });
    expect(screen.getByRole('button', { name: /Unlink/ })).toBeDisabled();
  });

  it('uses the generalized fallback header', () => {
    renderSection([ref]);
    expect(screen.getByText('Loan / Lending / Dividend')).toBeInTheDocument();
  });
});
