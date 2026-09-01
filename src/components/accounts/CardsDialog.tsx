'use client';

import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Plus,
} from 'lucide-react';
import { JSX } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';

import { AddAddonCardholderForm } from './cards-dialog/AddAddonCardholderForm';
import { CardholdersList } from './cards-dialog/CardholdersList';
import { CloseCardholderForm } from './cards-dialog/CloseCardholderForm';
import { CloseCardPlasticForm } from './cards-dialog/CloseCardPlasticForm';
import { EditCardholderForm } from './cards-dialog/EditCardholderForm';
import { IssueCardForm } from './cards-dialog/IssueCardForm';
import { ReassignTransactionsForm } from './cards-dialog/ReassignTransactionsForm';
import { ReplaceCardForm } from './cards-dialog/ReplaceCardForm';
import { useCardsDialog, ViewState } from './cards-dialog/useCardsDialog';

interface CardsDialogProps {
  account: Account;
  trigger: JSX.Element;
}

export function CardsDialog({ account, trigger }: CardsDialogProps) {
  const {
    open,
    handleOpenChange,
    cardholders,
    isLoading,
    error,
    view,
    targetCardholder,
    targetCard,
    personName,
    setPersonName,
    relationship,
    setRelationship,
    spendLimit,
    setSpendLimit,
    cardLast4,
    setCardLast4,
    openedOn,
    setOpenedOn,
    issuedOn,
    setIssuedOn,
    closeDate,
    setCloseDate,
    replaceNewLast4,
    setReplaceNewLast4,
    replaceIssuedOn,
    setReplaceIssuedOn,
    formError,
    isSubmitting,
    reattributeFrom,
    setReattributeFrom,
    reattributeTo,
    setReattributeTo,
    reattributeSource,
    setReattributeSource,
    isReattributing,
    reattributeError,
    backToList,
    isBank,
    startAddPrimary,
    startAddAddon,
    startEditCardholder,
    startCloseCardholder,
    startIssueCard,
    startReplaceCard,
    startCloseCard,
    startReassign,
    handleSavePrimary,
    handleSaveAddon,
    handleSaveEditCardholder,
    handleConfirmCloseCardholder,
    handleReopenCardholder,
    handleDeleteCardholder,
    handleSaveIssueCard,
    handleSaveReplaceCard,
    handleConfirmCloseCard,
    handleDeleteCardPlastic,
    handleConfirmReattribute,
  } = useCardsDialog(account);

  const viewTitles: Record<ViewState, string> = {
    list: isBank ? `${account.name} — Debit cards` : `${account.name} — Cardholders & Plastics`,
    addPrimary: isBank ? 'Add your debit card' : 'Add Card',
    addAddon: isBank ? 'Add Joint Holder Card' : 'Add Add-on Cardholder',
    editCardholder: targetCardholder ? `Edit ${targetCardholder.personName || targetCardholder.role}` : 'Edit Cardholder',
    closeCardholder: targetCardholder ? `Close Cardholder (${targetCardholder.personName || targetCardholder.role})` : 'Close Cardholder',
    issueCard: targetCardholder ? `Issue Plastic Card to ${targetCardholder.personName || targetCardholder.role}` : 'Issue Plastic Card',
    replaceCard: targetCard ? `Replace Card •••• ${targetCard.last4}` : 'Replace Card',
    closeCard: targetCard ? `Close Card •••• ${targetCard.last4}` : 'Close Card',
    reassign: 'Reassign Transactions',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 min-w-0">
            {view === 'list' ? (
              <CreditCard className="w-5 h-5 text-amber-500 shrink-0" />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={backToList}
                aria-label="Back to cardholders"
                className="shrink-0 -ml-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <span className="truncate">{viewTitles[view]}</span>
          </DialogTitle>
          {view === 'list' && (
            <Button size="sm" onClick={startAddAddon} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" />
              {isBank ? 'Joint holder card' : 'Add-on Cardholder'}
            </Button>
          )}
        </DialogHeader>

        <DialogBody className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {view === 'addPrimary' && (
            <IssueCardForm
              cardLast4={cardLast4}
              setCardLast4={setCardLast4}
              issuedOn={issuedOn}
              setIssuedOn={setIssuedOn}
              formError={formError}
              isSubmitting={isSubmitting}
              submitLabel={isBank ? 'Add Debit Card' : 'Issue Plastic'}
              submittingLabel={isBank ? 'Adding...' : 'Issuing...'}
              onSubmit={handleSavePrimary}
              onCancel={backToList}
            />
          )}

          {view === 'addAddon' && (
            <AddAddonCardholderForm
              personName={personName}
              setPersonName={setPersonName}
              relationship={relationship}
              setRelationship={setRelationship}
              spendLimit={spendLimit}
              setSpendLimit={setSpendLimit}
              openedOn={openedOn}
              setOpenedOn={setOpenedOn}
              cardLast4={cardLast4}
              setCardLast4={setCardLast4}
              issuedOn={issuedOn}
              setIssuedOn={setIssuedOn}
              formError={formError}
              isSubmitting={isSubmitting}
              isBank={isBank}
              onSubmit={handleSaveAddon}
              onCancel={backToList}
            />
          )}

          {view === 'editCardholder' && targetCardholder && (
            <EditCardholderForm
              targetCardholder={targetCardholder}
              personName={personName}
              setPersonName={setPersonName}
              relationship={relationship}
              setRelationship={setRelationship}
              spendLimit={spendLimit}
              setSpendLimit={setSpendLimit}
              formError={formError}
              isSubmitting={isSubmitting}
              onSubmit={handleSaveEditCardholder}
              onCancel={backToList}
            />
          )}

          {view === 'closeCardholder' && targetCardholder && (
            <CloseCardholderForm
              targetCardholder={targetCardholder}
              closeDate={closeDate}
              setCloseDate={setCloseDate}
              formError={formError}
              isSubmitting={isSubmitting}
              onConfirmClose={handleConfirmCloseCardholder}
            />
          )}

          {view === 'issueCard' && targetCardholder && (
            <IssueCardForm
              cardLast4={cardLast4}
              setCardLast4={setCardLast4}
              issuedOn={issuedOn}
              setIssuedOn={setIssuedOn}
              formError={formError}
              isSubmitting={isSubmitting}
              onSubmit={handleSaveIssueCard}
              onCancel={backToList}
            />
          )}

          {view === 'replaceCard' && targetCard && (
            <ReplaceCardForm
              targetCard={targetCard}
              targetCardholder={targetCardholder}
              replaceNewLast4={replaceNewLast4}
              setReplaceNewLast4={setReplaceNewLast4}
              replaceIssuedOn={replaceIssuedOn}
              setReplaceIssuedOn={setReplaceIssuedOn}
              formError={formError}
              isSubmitting={isSubmitting}
              onSubmit={handleSaveReplaceCard}
              onCancel={backToList}
            />
          )}

          {view === 'closeCard' && targetCard && (
            <CloseCardPlasticForm
              targetCard={targetCard}
              closeDate={closeDate}
              setCloseDate={setCloseDate}
              formError={formError}
              isSubmitting={isSubmitting}
              onConfirmClose={handleConfirmCloseCard}
            />
          )}

          {view === 'reassign' && targetCardholder && (
            <ReassignTransactionsForm
              targetCardholder={targetCardholder}
              cardholders={cardholders}
              reattributeSource={reattributeSource}
              setReattributeSource={setReattributeSource}
              reattributeFrom={reattributeFrom}
              setReattributeFrom={setReattributeFrom}
              reattributeTo={reattributeTo}
              setReattributeTo={setReattributeTo}
              reattributeError={reattributeError}
              isReattributing={isReattributing}
              onSubmit={handleConfirmReattribute}
              onCancel={backToList}
            />
          )}

          {view === 'list' && (
            <CardholdersList
              isLoading={isLoading}
              cardholders={cardholders}
              isBank={isBank}
              onAddPrimary={startAddPrimary}
              onEdit={startEditCardholder}
              onReassign={startReassign}
              onReopen={handleReopenCardholder}
              onClose={startCloseCardholder}
              onDelete={handleDeleteCardholder}
              onIssueCard={startIssueCard}
              onReplaceCard={startReplaceCard}
              onCloseCard={startCloseCard}
              onDeleteCardPlastic={handleDeleteCardPlastic}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
