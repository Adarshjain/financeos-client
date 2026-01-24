'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useActionState } from 'react';

import {
  addBankDetails,
  addCreditCardDetails,
  addMutualFundDetails,
  addStockDetails,
} from '@/actions/accounts';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import type { AccountResponse, ApiResult } from '@/lib/types';

interface AccountDetailsFormProps {
  account: AccountResponse;
}

export function AccountDetailsForm({ account }: AccountDetailsFormProps) {
  const addBankWithId = addBankDetails.bind(null, account.id);
  const addCreditCardWithId = addCreditCardDetails.bind(null, account.id);
  const addStockWithId = addStockDetails.bind(null, account.id);
  const addMutualFundWithId = addMutualFundDetails.bind(null, account.id);

  const [bankState, bankAction] = useActionState(
    addBankWithId,
    null as ApiResult<AccountResponse> | null
  );
  const [creditCardState, creditCardAction] = useActionState(
    addCreditCardWithId,
    null as ApiResult<AccountResponse> | null
  );
  const [stockState, stockAction] = useActionState(
    addStockWithId,
    null as ApiResult<AccountResponse> | null
  );
  const [mutualFundState, mutualFundAction] = useActionState(
    addMutualFundWithId,
    null as ApiResult<AccountResponse> | null
  );

  // Show form based on account type and whether details already exist
  if (account.type === 'bank_account' && !account.bankDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Bank Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={bankAction} className="space-y-4">
            {bankState && !bankState.success && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{bankState.error.message}</AlertDescription>
              </Alert>
            )}
            {bankState?.success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Bank details added!</AlertDescription>
              </Alert>
            )}

            <FormField
              label="Opening Balance (INR)"
              name="openingBalance"
              type="number"
              step="0.01"
              placeholder="50000.00"
            />

            <FormField
              label="Account Last 4 Digits"
              name="last4"
              maxLength={4}
              placeholder="1234"
            />

            <div className="pt-2">
              <SubmitButton className="w-full">Save Bank Details</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (account.type === 'credit_card' && !account.creditCardDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Credit Card Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={creditCardAction} className="space-y-4">
            {creditCardState && !creditCardState.success && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {creditCardState.error.message}
                </AlertDescription>
              </Alert>
            )}
            {creditCardState?.success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Credit card details added!</AlertDescription>
              </Alert>
            )}

            <FormField
              label="Card Last 4 Digits"
              name="last4"
              maxLength={4}
              placeholder="9876"
              required
            />

            <FormField
              label="Credit Limit (INR)"
              name="creditLimit"
              type="number"
              step="0.01"
              placeholder="200000.00"
              required
            />

            <FormField
              label="Payment Due Day (1-31)"
              name="paymentDueDay"
              type="number"
              min={1}
              max={31}
              placeholder="15"
              required
            />

            <FormField
              label="Grace Period (Days)"
              name="gracePeriodDays"
              type="number"
              min={0}
              placeholder="20"
              required
            />

            <FormField
              label="Statement Password (Optional)"
              name="statementPassword"
              type="password"
              placeholder="For PDF statements"
            />

            <div className="pt-2">
              <SubmitButton className="w-full">
                Save Credit Card Details
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (account.type === 'stock' && !account.stockDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Stock Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={stockAction} className="space-y-4">
            {stockState && !stockState.success && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{stockState.error.message}</AlertDescription>
              </Alert>
            )}
            {stockState?.success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Stock details added!</AlertDescription>
              </Alert>
            )}

            <FormField
              label="Instrument Code"
              name="instrumentCode"
              placeholder="RELIANCE"
              required
            />

            <FormField
              label="Last Traded Price (INR)"
              name="lastTradedPrice"
              type="number"
              step="0.01"
              placeholder="2500.00"
            />

            <div className="pt-2">
              <SubmitButton className="w-full">Save Stock Details</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (account.type === 'mutual_fund' && !account.mutualFundDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Mutual Fund Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={mutualFundAction} className="space-y-4">
            {mutualFundState && !mutualFundState.success && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {mutualFundState.error.message}
                </AlertDescription>
              </Alert>
            )}
            {mutualFundState?.success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Mutual fund details added!</AlertDescription>
              </Alert>
            )}

            <FormField
              label="Fund Code"
              name="instrumentCode"
              placeholder="HDFC-FLEXICAP"
              required
            />

            <FormField
              label="Current NAV (INR)"
              name="lastTradedPrice"
              type="number"
              step="0.0001"
              placeholder="45.5000"
            />

            <div className="pt-2">
              <SubmitButton className="w-full">
                Save Mutual Fund Details
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // If details already exist or account type is generic, don't show form
  return null;
}
