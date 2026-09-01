'use client';

import {
  ArrowLeft,
  Edit2,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  closeLoanAction,
  deleteLoanAction,
  reopenLoanAction,
} from '@/actions/loans';
import { LoanForm } from '@/app/(protected)/loans/LoanForm';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Button } from '@/components/ui/button';
import type { Account } from '@/lib/account.types';
import type {
  InstallmentDto,
  LoanDetailResponse,
} from '@/lib/types';

import { LoanAmortizationSchedule } from './components/LoanAmortizationSchedule';
import { LoanDetailDialogs } from './components/LoanDetailDialogs';
import { LoanEventsAndCharges } from './components/LoanEventsAndCharges';
import { LoanHeroHeader } from './components/LoanHeroHeader';
import { LoanMatchSuggestionsBanner } from './components/LoanMatchSuggestionsBanner';
import { useLoanDetail } from './components/useLoanDetail';

interface LoanDetailProps {
  initialDetail: LoanDetailResponse;
  initialSchedule: InstallmentDto[];
  bankAccounts: Account[];
}

export function LoanDetail({
  initialDetail,
  initialSchedule,
  bankAccounts,
}: LoanDetailProps) {
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
    paymentTxId,
    setPaymentTxId,
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
    eventTxId,
    setEventTxId,
    submittingEvent,
    chargeType,
    setChargeType,
    chargeAmount,
    setChargeAmount,
    chargeDate,
    setChargeDate,
    chargeNotes,
    setChargeNotes,
    chargeTxId,
    setChargeTxId,
    submittingCharge,
    loan,
    hasEventsOrPayments,
    currentFY,
    refreshData,
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
  } = useLoanDetail({
    initialDetail,
    initialSchedule,
  });

  return (
    <div className="space-y-2 p-3 pb-32">
      {/* Top Header Action Bar */}
      <PageActionBar>
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="flex-1"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </Button>

          {loan.status === 'active' ? (
            <ConfirmationDialog
              title="Close Loan"
              description={`Are you sure you want to mark "${loan.name}" as closed?`}
              primaryAction={async () => {
                const res = await closeLoanAction(loan.id);
                if (res.success) {
                  toast.success('Loan closed');
                  await refreshData();
                } else {
                  toast.error(res.error.message);
                }
              }}
              primaryActionText="Close Loan"
              variant="default"
              trigger={
                <Button variant="outline" size="sm" className="flex-1">
                  <Lock className="h-3.5 w-3.5" /> Close
                </Button>
              }
            />
          ) : (
            <ConfirmationDialog
              title="Reopen Loan"
              description={`Reopen loan "${loan.name}"?`}
              primaryAction={async () => {
                const res = await reopenLoanAction(loan.id);
                if (res.success) {
                  toast.success('Loan reopened');
                  await refreshData();
                } else {
                  toast.error(res.error.message);
                }
              }}
              primaryActionText="Reopen Loan"
              variant="default"
              trigger={
                <Button variant="outline" size="sm" className="flex-1">
                  <Unlock className="h-3.5 w-3.5" /> Reopen
                </Button>
              }
            />
          )}

          <ConfirmationDialog
            title="Delete Loan"
            description={`Delete "${loan.name}" and all associated schedule data?`}
            primaryAction={async () => {
              const res = await deleteLoanAction(loan.id);
              if (res.success) {
                toast.success('Loan deleted');
                router.push('/loans');
              } else {
                toast.error(res.error.message);
              }
            }}
            primaryActionText="Delete Loan"
            variant="destructive"
            trigger={
              <Button variant="destructive" size="sm" className="flex-1">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            }
          />
        </div>
      </PageActionBar>

      {/* Back Link */}
      <Link
        href="/loans"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Loans Overview
      </Link>

      {/* Header Container */}
      <LoanHeroHeader loan={loan} />

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
        bankAccounts={bankAccounts}
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
        paymentTxId={paymentTxId}
        setPaymentTxId={setPaymentTxId}
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
        eventTxId={eventTxId}
        setEventTxId={setEventTxId}
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
        chargeTxId={chargeTxId}
        setChargeTxId={setChargeTxId}
        submittingCharge={submittingCharge}
        onAddCharge={handleAddCharge}
      />
    </div>
  );
}
