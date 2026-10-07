'use client';

import { ArrowLeft, Edit2, Lock, Trash2, Unlock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { LoanForm } from '@/app/(protected)/loans/LoanForm';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { LoanAmortizationSchedule } from './components/LoanAmortizationSchedule';
import { LoanDetailDialogs } from './components/LoanDetailDialogs';
import { LoanEventsAndCharges } from './components/LoanEventsAndCharges';
import { LoanHeroHeader } from './components/LoanHeroHeader';
import { LoanMatchSuggestionsBanner } from './components/LoanMatchSuggestionsBanner';
import { useLoanDetail } from './components/useLoanDetail';

interface LoanDetailProps {
  loanId: string;
}

export function LoanDetail({ loanId }: LoanDetailProps) {
  const router = useRouter();

  const {
    detail,
    schedule,
    editOpen,
    setEditOpen,
    addEventOpen,
    setAddEventOpen,
    addChargeOpen,
    setAddChargeOpen,
    markPaidOpen,
    setMarkPaidOpen,
    selectedInstallment,
    matchLoading,
    matchSuggestions,
    expandedFYs,
    paymentDate,
    setPaymentDate,
    paymentAmount,
    setPaymentAmount,
    paymentTx,
    onSelectPaymentTx,
    onClearPaymentTx,
    submittingPayment,
    eventType,
    setEventType,
    effectiveDate,
    setEffectiveDate,
    newAnnualRatePct,
    setNewAnnualRatePct,
    eventAmount,
    setEventAmount,
    adjustmentMode,
    setAdjustmentMode,
    newEmiOverride,
    setNewEmiOverride,
    eventTx,
    onSelectEventTx,
    onClearEventTx,
    submittingEvent,
    chargeType,
    setChargeType,
    chargeAmount,
    setChargeAmount,
    chargeDate,
    setChargeDate,
    chargeNotes,
    setChargeNotes,
    chargeTx,
    onSelectChargeTx,
    onClearChargeTx,
    submittingCharge,
    loan,
    hasEventsOrPayments,
    currentFY,
    toggleFY,
    handleOpenMarkPaid,
    handleSettlePayment,
    handleUnlinkPayment,
    handleAddEvent,
    handleDeleteEvent,
    handleAddCharge,
    handleDeleteCharge,
    handleFindMatches,
    handleConfirmMatch,
    handleConfirmAllMatches,
    handleCloseLoan,
    handleReopenLoan,
    deleteLoanMutation,
  } = useLoanDetail({ loanId });

  if (!detail || !loan) {
    return <div className="p-6 text-xs text-slate-500">Loading loan…</div>;
  }

  // One set of actions, rendered twice: a desktop card (lg+) and the mobile
  // bottom bar (below lg), so no action exists on one viewport only.
  const renderActionBar = (isMobile: boolean) => {
    const grow = isMobile ? 'flex-1' : undefined;
    return (
      <div className={cn('flex items-center gap-2 w-full', !isMobile && 'flex-wrap justify-end')}>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className={grow}>
          <Edit2 className="h-3.5 w-3.5" /> Edit
        </Button>

        {loan.status === 'active' ? (
          <ConfirmationDialog
            title="Close Loan"
            description={`Are you sure you want to mark "${loan.name}" as closed?`}
            primaryAction={handleCloseLoan}
            primaryActionText="Close Loan"
            variant="default"
            trigger={
              <Button variant="outline" size="sm" className={grow}>
                <Lock className="h-3.5 w-3.5" /> Close
              </Button>
            }
          />
        ) : (
          <ConfirmationDialog
            title="Reopen Loan"
            description={`Reopen loan "${loan.name}"?`}
            primaryAction={handleReopenLoan}
            primaryActionText="Reopen Loan"
            variant="default"
            trigger={
              <Button variant="outline" size="sm" className={grow}>
                <Unlock className="h-3.5 w-3.5" /> Reopen
              </Button>
            }
          />
        )}

        <ConfirmationDialog
          title="Delete Loan"
          description={`Delete "${loan.name}" and all associated schedule data?`}
          primaryAction={async () => {
            try {
              await deleteLoanMutation.mutateAsync();
              toast.success('Loan deleted');
              router.push('/loans');
            } catch {
              // onError already surfaced the toast.
            }
          }}
          primaryActionText="Delete Loan"
          variant="destructive"
          trigger={
            <Button variant="destructive" size="sm" className={grow}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          }
        />
      </div>
    );
  };

  return (
    <div className="space-y-2 p-3 pb-32">
      {/* Mobile bottom action bar */}
      <PageActionBar>{renderActionBar(true)}</PageActionBar>

      {/* Back Link */}
      <Link
        href="/loans"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Loans Overview
      </Link>

      {/* Header Container */}
      <LoanHeroHeader loan={loan} />

      {/* Desktop action bar */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      {/* Match Suggestions Inline Banner */}
      <LoanMatchSuggestionsBanner
        matchLoading={matchLoading}
        matchSuggestions={matchSuggestions}
        onFindMatches={handleFindMatches}
        onConfirmMatch={handleConfirmMatch}
        onConfirmAllMatches={handleConfirmAllMatches}
      />

      {/* Amortization Schedule */}
      <LoanAmortizationSchedule
        schedule={schedule}
        expandedFYs={expandedFYs}
        onToggleFY={toggleFY}
        currentFY={currentFY}
        onOpenMarkPaid={handleOpenMarkPaid}
        onUnlinkPayment={handleUnlinkPayment}
      />

      {/* Events & Charges Side-By-Side Sections */}
      <LoanEventsAndCharges
        events={detail.events}
        charges={detail.charges}
        onOpenAddEvent={() => setAddEventOpen(true)}
        onOpenAddCharge={() => setAddChargeOpen(true)}
        onDeleteEvent={handleDeleteEvent}
        onDeleteCharge={handleDeleteCharge}
      />

      {/* Edit Loan Form */}
      <LoanForm
        open={editOpen}
        onOpenChange={setEditOpen}
        loanToEdit={loan}
        hasEventsOrPayments={hasEventsOrPayments}
      />

      {/* Dialogs */}
      <LoanDetailDialogs
        markPaidOpen={markPaidOpen}
        setMarkPaidOpen={setMarkPaidOpen}
        selectedInstallment={selectedInstallment}
        paymentDate={paymentDate}
        setPaymentDate={setPaymentDate}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentTx={paymentTx}
        onSelectPaymentTx={onSelectPaymentTx}
        onClearPaymentTx={onClearPaymentTx}
        submittingPayment={submittingPayment}
        onSettlePayment={handleSettlePayment}
        addEventOpen={addEventOpen}
        setAddEventOpen={setAddEventOpen}
        eventType={eventType}
        setEventType={setEventType}
        effectiveDate={effectiveDate}
        setEffectiveDate={setEffectiveDate}
        newAnnualRatePct={newAnnualRatePct}
        setNewAnnualRatePct={setNewAnnualRatePct}
        eventAmount={eventAmount}
        setEventAmount={setEventAmount}
        adjustmentMode={adjustmentMode}
        setAdjustmentMode={setAdjustmentMode}
        newEmiOverride={newEmiOverride}
        setNewEmiOverride={setNewEmiOverride}
        eventTx={eventTx}
        onSelectEventTx={onSelectEventTx}
        onClearEventTx={onClearEventTx}
        submittingEvent={submittingEvent}
        onAddEvent={handleAddEvent}
        addChargeOpen={addChargeOpen}
        setAddChargeOpen={setAddChargeOpen}
        chargeType={chargeType}
        setChargeType={setChargeType}
        chargeAmount={chargeAmount}
        setChargeAmount={setChargeAmount}
        chargeDate={chargeDate}
        setChargeDate={setChargeDate}
        chargeNotes={chargeNotes}
        setChargeNotes={setChargeNotes}
        chargeTx={chargeTx}
        onSelectChargeTx={onSelectChargeTx}
        onClearChargeTx={onClearChargeTx}
        submittingCharge={submittingCharge}
        onAddCharge={handleAddCharge}
      />
    </div>
  );
}
