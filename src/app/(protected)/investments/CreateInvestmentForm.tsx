'use client';

import { Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { SubmitButton } from '@/components/forms/SubmitButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Broker } from '@/lib/account.types';
import { Instrument } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

import { ItemizedChargesCollapsible } from './create-form/ItemizedChargesCollapsible';
import { OrderTicketHeader } from './create-form/OrderTicketHeader';
import { TradeInputSection } from './create-form/TradeInputSection';
import { useCreateInvestmentForm } from './create-form/useCreateInvestmentForm';

interface CreateInvestmentFormProps {
  brokerAccounts: Broker[];
  initialBrokerAccountId?: string;
  initialInstrument?: Instrument | null;
  onSuccess?: () => void;
}

export function CreateInvestmentForm({
  brokerAccounts,
  initialBrokerAccountId,
  initialInstrument,
  onSuccess,
}: CreateInvestmentFormProps) {
  const {
    selectedBrokerId,
    setSelectedBrokerId,
    selectedInstrument,
    setSelectedInstrument,
    type,
    setType,
    showCharges,
    setShowCharges,
    brokerage,
    setBrokerage,
    stt,
    setStt,
    exchangeTxnCharges,
    setExchangeTxnCharges,
    sebiCharges,
    setSebiCharges,
    stampDuty,
    setStampDuty,
    gst,
    setGst,
    dpCharges,
    setDpCharges,
    otherCharges,
    setOtherCharges,
    isSubmitting,
    formKey,
    quantityInput,
    setQuantityInput,
    priceInput,
    setPriceInput,
    totalCharges,
    estGrossValue,
    estNetTotal,
    handleSubmit,
  } = useCreateInvestmentForm({
    brokerAccounts,
    initialBrokerAccountId,
    initialInstrument,
    onSuccess,
  });

  if (brokerAccounts.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Record Trade
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 text-xs text-slate-500 space-y-3">
          <p>You need at least one broker account to record trades.</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/accounts">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Broker Account
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-md rounded-xl overflow-hidden transition-all">
      {/* Order Ticket Header Banner */}
      <OrderTicketHeader
        type={type}
        selectedInstrument={selectedInstrument}
        estNetTotal={estNetTotal}
      />

      <CardContent className="p-4 sm:p-5 space-y-2">
        <form key={formKey} onSubmit={handleSubmit} className="space-y-2">
          <TradeInputSection
            type={type}
            setType={setType}
            selectedBrokerId={selectedBrokerId}
            setSelectedBrokerId={setSelectedBrokerId}
            brokerAccounts={brokerAccounts}
            selectedInstrument={selectedInstrument}
            setSelectedInstrument={setSelectedInstrument}
            quantityInput={quantityInput}
            setQuantityInput={setQuantityInput}
            priceInput={priceInput}
            setPriceInput={setPriceInput}
            estGrossValue={estGrossValue}
            totalCharges={totalCharges}
            estNetTotal={estNetTotal}
          />

          {/* Itemized Charges Collapsible */}
          <ItemizedChargesCollapsible
            showCharges={showCharges}
            setShowCharges={setShowCharges}
            totalCharges={totalCharges}
            brokerage={brokerage}
            setBrokerage={setBrokerage}
            stt={stt}
            setStt={setStt}
            exchangeTxnCharges={exchangeTxnCharges}
            setExchangeTxnCharges={setExchangeTxnCharges}
            sebiCharges={sebiCharges}
            setSebiCharges={setSebiCharges}
            stampDuty={stampDuty}
            setStampDuty={setStampDuty}
            gst={gst}
            setGst={setGst}
            dpCharges={dpCharges}
            setDpCharges={setDpCharges}
            otherCharges={otherCharges}
            setOtherCharges={setOtherCharges}
          />

          {/* Notes */}
          <FormField
            label="Order Notes (Optional)"
            name="notes"
            type="text"
            placeholder="e.g. Zerodha Tradebook import / Manual Buy"
          />

          <div className="pt-2">
            <SubmitButton
              className={`w-full font-black text-xs h-10 rounded-lg shadow-sm transition-all text-white ${
                type === 'buy'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
              pending={isSubmitting}
            >
              {type === 'buy' ? 'EXECUTE BUY ORDER' : 'EXECUTE SELL ORDER'}
              {estNetTotal > 0 ? ` • ${formatMoney(estNetTotal)}` : ''}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
