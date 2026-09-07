'use client';

import { Link2 } from 'lucide-react';

import type { Account } from '@/lib/account.types';
import type { ObligationRef, Transaction, TransactionLinkResponse } from '@/lib/transaction.types';

import { LinkedTransactionsSection } from './LinkedTransactionsSection';
import { ObligationRefsSection } from './ObligationRefsSection';

interface LinksSectionProps {
  transaction: Transaction;
  accounts: Account[];
  links: TransactionLinkResponse[];
  loadingLinks: boolean;
  linksError: string | null;
  unlinkingId: string | null;
  fetchLinks: () => void;
  handleUnlink: (linkId: string) => void;
  obligationRefs: ObligationRef[];
  unlinkingObligationId: string | null;
  onUnlinkLending: (lendingId: string) => void;
  onUnlinkLoanPayment: (loanId: string, paymentId: string) => void;
}

/**
 * The single "Links" entry point for everything that explains a transaction:
 * transaction<->transaction links and ledger/loan obligation refs, grouped
 * under one header instead of two separate sections.
 */
export function LinksSection({
  transaction,
  accounts,
  links,
  loadingLinks,
  linksError,
  unlinkingId,
  fetchLinks,
  handleUnlink,
  obligationRefs,
  unlinkingObligationId,
  onUnlinkLending,
  onUnlinkLoanPayment,
}: LinksSectionProps) {
  const hasTxnLinks = links.length > 0 || Boolean(linksError);
  const hasObligationRefs = obligationRefs.length > 0;

  if (!hasTxnLinks && !hasObligationRefs) return null;

  return (
    <div className="space-y-3 pt-1">
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 px-1">
        <Link2 className="h-3.5 w-3.5 text-indigo-500" /> Links
      </span>

      {hasTxnLinks && (
        <div className="space-y-2">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            Transactions
          </span>
          <LinkedTransactionsSection
            transaction={transaction}
            accounts={accounts}
            links={links}
            loadingLinks={loadingLinks}
            linksError={linksError}
            unlinkingId={unlinkingId}
            fetchLinks={fetchLinks}
            handleUnlink={handleUnlink}
            hideHeader
          />
        </div>
      )}

      {hasObligationRefs && (
        <div className="space-y-2">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            Ledger & loans
          </span>
          <ObligationRefsSection
            refs={obligationRefs}
            unlinkingId={unlinkingObligationId}
            onUnlinkLending={onUnlinkLending}
            onUnlinkLoanPayment={onUnlinkLoanPayment}
            hideHeader
          />
        </div>
      )}
    </div>
  );
}
