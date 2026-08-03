'use client';

import {
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  KeyRound,
  Layers,
  ShieldAlert,
  Sparkles,
  Upload
} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {toast} from 'sonner';

import {commitImport, commitReconcileImport, previewImport, previewReconcileImport} from '@/actions/investments';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {Broker as BrokerAccount} from '@/lib/account.types';
import {
  CreateInstrumentRequest,
  ImportCommitRequest,
  ImportCommitResult,
  ImportPreview,
  ReconcileCommitRequest,
  ReconcilePreview,
  ReconciliationBroker,
} from '@/lib/types';
import {formatDate, formatMoney} from '@/lib/utils';

interface ImportWizardDialogProps {
  brokerAccounts: BrokerAccount[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

type ImportMode = 'reconcile_zerodha' | 'reconcile_groww' | 'mf_cas';

export function ImportWizardDialog({brokerAccounts, trigger, onSuccess}: ImportWizardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form State
  const [mode, setMode] = useState<ImportMode>('reconcile_zerodha');
  const [brokerAccountId, setBrokerAccountId] = useState(brokerAccounts[0]?.id || '');
  const [password, setPassword] = useState('');

  // Reconcile Files
  const [taxpnlFiles, setTaxpnlFiles] = useState<File[]>([]);
  const [tradebookFiles, setTradebookFiles] = useState<File[]>([]);
  const [holdingsFile, setHoldingsFile] = useState<File | null>(null);

  // MF CAS Single File
  const [casFile, setCasFile] = useState<File | null>(null);

  const [isPreviewing, setIsPreviewing] = useState(false);

  // Step 2 Review State
  const [reconcilePreview, setReconcilePreview] = useState<ReconcilePreview | null>(null);
  const [casPreview, setCasPreview] = useState<ImportPreview | null>(null);

  const [rowStates, setRowStates] = useState<
      Record<
          number,
          {
            skip: boolean;
            selectedInstrumentId?: string;
            createNew?: boolean;
            newInstrument?: CreateInstrumentRequest;
          }
      >
  >({});
  const [isCommitting, setIsCommitting] = useState(false);

  // Step 3 Result State
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);

  const resetWizard = () => {
    setStep(1);
    setTaxpnlFiles([]);
    setTradebookFiles([]);
    setHoldingsFile(null);
    setCasFile(null);
    setPassword('');
    setReconcilePreview(null);
    setCasPreview(null);
    setRowStates({});
    setCommitResult(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetWizard();
    }
  };

  // Step 1: Preview Submission
  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerAccountId) {
      toast.error('Please select a target broker account.');
      return;
    }

    setIsPreviewing(true);
    try {
      if (mode === 'reconcile_zerodha' || mode === 'reconcile_groww') {
        if (tradebookFiles.length === 0) {
          toast.error('Please upload at least one Tradebook / Order History file.');
          setIsPreviewing(false);
          return;
        }
        if (taxpnlFiles.length === 0) {
          toast.error('Please upload at least one Tax P&L / Capital Gains file.');
          setIsPreviewing(false);
          return;
        }

        const formData = new FormData();
        const brokerName: ReconciliationBroker = mode === 'reconcile_zerodha' ? 'zerodha' : 'groww';
        formData.append('broker', brokerName);
        formData.append('brokerAccountId', brokerAccountId);

        tradebookFiles.forEach((f) => formData.append('tradebookFiles', f));
        taxpnlFiles.forEach((f) => formData.append('taxpnlFiles', f));
        if (holdingsFile) {
          formData.append('holdingsFile', holdingsFile);
        }

        const res = await previewReconcileImport(formData);
        if (res.success) {
          setReconcilePreview(res.data);
          const initialStates: Record<number, any> = {};
          for (const exec of res.data.executions) {
            const isUnmatched = !exec.matchedInstrument;
            initialStates[exec.rowIndex] = {
              skip: exec.isDuplicate,
              selectedInstrumentId: exec.matchedInstrument?.id,
              createNew: false,
              newInstrument: {
                type: 'stock',
                name: exec.symbol || 'New Instrument',
                symbol: exec.symbol || '',
                exchange: exec.exchange || 'NSE',
                isin: exec.isin || undefined,
                yahooSymbol: exec.symbol ? `${exec.symbol.toUpperCase()}.${exec.exchange === 'BSE' ? 'BO' : 'NS'}` : '',
              },
            };
          }
          setRowStates(initialStates);
          setStep(2);
        } else {
          toast.error(res.error.message);
        }
      } else {
        // MF CAS
        if (!casFile) {
          toast.error('Please select a CAS PDF/CSV file.');
          setIsPreviewing(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', casFile);
        formData.append('source', 'mf_cas');
        formData.append('brokerAccountId', brokerAccountId);
        if (password) {
          formData.append('password', password);
        }

        const res = await previewImport(formData);
        if (res.success) {
          setCasPreview(res.data);
          const initialStates: Record<number, any> = {};
          for (const row of res.data.rows) {
            initialStates[row.rowIndex] = {
              skip: row.duplicate || !!row.parsedRow?.error,
              selectedInstrumentId: row.matchedInstrument?.id,
              createNew: false,
              newInstrument: {
                type: 'mutual_fund',
                name: row.parsedRow.parsedName || row.parsedRow.parsedSymbol || 'New Mutual Fund',
                symbol: row.parsedRow.parsedSymbol || '',
                exchange: 'MUTUAL_FUND',
                isin: row.parsedRow.parsedIsin || undefined,
              },
            };
          }
          setRowStates(initialStates);
          setStep(2);
        } else {
          toast.error(res.error.message);
        }
      }
    } catch (err) {
      toast.error('Failed to preview import: ' + (err as Error).message);
    } finally {
      setIsPreviewing(false);
    }
  };

  // Step 2: Commit Submission
  const handleCommitSubmit = async () => {
    setIsCommitting(true);
    try {
      if (mode === 'reconcile_zerodha' || mode === 'reconcile_groww') {
        if (!reconcilePreview) return;
        const brokerName: ReconciliationBroker = mode === 'reconcile_zerodha' ? 'zerodha' : 'groww';

        const commitExecutions = reconcilePreview.executions.map((exec) => {
          const state = rowStates[exec.rowIndex] || {skip: false};
          return {
            rowIndex: exec.rowIndex,
            tradeDate: exec.tradeDate,
            type: exec.type,
            settlementType: exec.settlementType,
            symbol: exec.symbol,
            isin: exec.isin,
            exchange: exec.exchange,
            quantity: exec.quantity,
            price: exec.price,
            charges: exec.charges,
            externalRef: exec.externalRef,
            instrumentId: !state.createNew ? state.selectedInstrumentId || exec.matchedInstrument?.id : undefined,
            newInstrument: state.createNew ? state.newInstrument : undefined,
            skip: state.skip,
          };
        });

        const req: ReconcileCommitRequest = {
          broker: brokerName,
          brokerAccountId,
          executions: commitExecutions,
          classifications: reconcilePreview.classifications,
        };

        const res = await commitReconcileImport(req);
        if (res.success) {
          setCommitResult(res.data);
          setStep(3);
          onSuccess?.();
          router.refresh();
        } else {
          toast.error(res.error.message);
        }
      } else {
        // CAS Commit
        if (!casPreview) return;
        const commitRows = casPreview.rows.map((row) => {
          const state = rowStates[row.rowIndex] || {skip: false};
          return {
            rowIndex: row.rowIndex,
            row: row.parsedRow,
            skip: state.skip,
            instrumentId: !state.createNew ? state.selectedInstrumentId || row.matchedInstrument?.id : undefined,
            newInstrument: state.createNew ? state.newInstrument : undefined,
          };
        });

        const req: ImportCommitRequest = {
          source: 'mf_cas',
          brokerAccountId,
          rows: commitRows,
        };

        const res = await commitImport(req);
        if (res.success) {
          setCommitResult(res.data);
          setStep(3);
          onSuccess?.();
          router.refresh();
        } else {
          toast.error(res.error.message);
        }
      }
    } catch (err) {
      toast.error('Failed to commit import: ' + (err as Error).message);
    } finally {
      setIsCommitting(false);
    }
  };

  const updateRowNewInstrument = (rowIndex: number, updates: Partial<CreateInstrumentRequest>) => {
    setRowStates((prev) => {
      const currentState = prev[rowIndex];
      const existingNewInst: CreateInstrumentRequest = currentState?.newInstrument || {
        type: 'stock',
        name: '',
        symbol: '',
      };
      return {
        ...prev,
        [rowIndex]: {
          ...currentState,
          skip: currentState?.skip ?? false,
          createNew: true,
          newInstrument: {
            ...existingNewInst,
            ...updates,
            type: updates.type || existingNewInst.type || 'stock',
          },
        },
      };
    });
  };

  const selectedBrokerName = brokerAccounts.find((b) => b.id === brokerAccountId)?.name || 'Broker';

  return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
              <Button variant="outline" size="sm" className="h-8 text-xs flex items-center">
                <Upload className="w-3.5 h-3.5"/>
                Import Broker Trades
              </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col p-3 sm:p-6 overflow-hidden">
          <DialogHeader className="shrink-0 pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-600 dark:text-purple-400"/>
              Broker Import Reconciliation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Step {step} of
              3: {step === 1 ? 'Select Broker & Upload Files' : step === 2 ? 'Reconciliation Review & Open Holdings' : 'Import Complete'}
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: Upload Files */}
          {step === 1 && (
              <form onSubmit={handlePreviewSubmit}
                    className="flex-1 flex flex-col justify-between overflow-y-auto min-h-0 space-y-4 py-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Broker / Import
                        Type</Label>
                      <Select value={mode} onValueChange={(val) => setMode(val as ImportMode)}>
                        <SelectTrigger
                            className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                          <SelectValue placeholder="Select broker..."/>
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectItem value="reconcile_zerodha" className="text-xs">Zerodha Reconciliation (Tradebook +
                            Tax P&L)</SelectItem>
                          <SelectItem value="reconcile_groww" className="text-xs">Groww Reconciliation (Order History +
                            Capital Gains)</SelectItem>
                          <SelectItem value="mf_cas" className="text-xs">Mutual Funds CAS (CAMS / KFintech
                            PDF)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Broker
                        Account</Label>
                      <Select value={brokerAccountId} onValueChange={setBrokerAccountId}>
                        <SelectTrigger
                            className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                          <SelectValue placeholder="Select target account..."/>
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          {brokerAccounts.map((b) => (
                              <SelectItem key={b.id} value={b.id} className="text-xs">
                                {b.name} ({b.provider || 'Broker'})
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* RECONCILIATION MULTI-FILE DROPZONES */}
                  {(mode === 'reconcile_zerodha' || mode === 'reconcile_groww') && (
                      <div className="space-y-3">
                        <div
                            className="p-2.5 rounded-md bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-[11px] text-purple-900 dark:text-purple-300">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 inline mr-1.5 -mt-0.5"/>
                          <strong>Authoritative Intraday & Clean FIFO:</strong> Tax P&L provides intraday classification
                          and realized exit charges. Executions are classified, matched via delivery-only FIFO, and cost
                          basis is computed using traded price.
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* SECTION 1: Tax P&L / Capital Gains Files */}
                          <div
                              className="space-y-2 p-3 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10">
                            <Label
                                className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between">
                              <span>1. {mode === 'reconcile_zerodha' ? 'Zerodha Tax P&L' : 'Groww Capital Gains'} (XLSX)</span>
                              <span className="text-[10px] text-purple-600 font-normal">Per FY files</span>
                            </Label>
                            <div
                                className="border-2 border-dashed border-purple-200 dark:border-purple-900/50 rounded-md p-4 text-center hover:bg-purple-50/40 transition-colors">
                              <Upload className="w-6 h-6 text-purple-500 mx-auto mb-1 opacity-80"/>
                              <input
                                  type="file"
                                  multiple
                                  accept=".xlsx,.xls"
                                  onChange={(e) => setTaxpnlFiles(Array.from(e.target.files || []))}
                                  className="hidden"
                                  id="taxpnl-file-input"
                              />
                              <label htmlFor="taxpnl-file-input"
                                     className="cursor-pointer text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                                {taxpnlFiles.length > 0 ? `${taxpnlFiles.length} file(s) selected` : `Upload ${mode === 'reconcile_zerodha' ? 'Tax P&L' : 'Capital Gains'} XLSX file(s)`}
                              </label>
                              {taxpnlFiles.length > 0 && (
                                  <div
                                      className="mt-1 text-[10px] text-purple-700 dark:text-purple-300 truncate max-w-xs mx-auto">
                                    {taxpnlFiles.map((f) => f.name).join(', ')}
                                  </div>
                              )}
                            </div>
                          </div>

                          {/* SECTION 2: Tradebook / Order History Files */}
                          <div
                              className="space-y-2 p-3 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10">
                            <Label
                                className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center justify-between">
                              <span>2. {mode === 'reconcile_zerodha' ? 'Zerodha Tradebook' : 'Groww Order History'}</span>
                              <span className="text-[10px] text-blue-600 font-normal">Full history CSV/XLSX</span>
                            </Label>
                            <div
                                className="border-2 border-dashed border-blue-200 dark:border-blue-900/50 rounded-md p-4 text-center hover:bg-blue-50/40 transition-colors">
                              <Upload className="w-6 h-6 text-blue-500 mx-auto mb-1 opacity-80"/>
                              <input
                                  type="file"
                                  multiple
                                  accept={mode === 'reconcile_zerodha' ? '.csv' : '.xlsx,.xls,.csv'}
                                  onChange={(e) => setTradebookFiles(Array.from(e.target.files || []))}
                                  className="hidden"
                                  id="tradebook-file-input"
                              />
                              <label htmlFor="tradebook-file-input"
                                     className="cursor-pointer text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                {tradebookFiles.length > 0 ? `${tradebookFiles.length} file(s) selected` : `Upload ${mode === 'reconcile_zerodha' ? 'Tradebook CSV' : 'Order History XLSX'} file(s)`}
                              </label>
                              {tradebookFiles.length > 0 && (
                                  <div
                                      className="mt-1 text-[10px] text-blue-700 dark:text-blue-300 truncate max-w-xs mx-auto">
                                    {tradebookFiles.map((f) => f.name).join(', ')}
                                  </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SECTION 3: Optional Holdings Snapshot Anchor */}
                        <div
                            className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                          <Label
                              className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                            <span>3. Holdings Snapshot Anchor (Optional)</span>
                            <span className="text-[10px] text-slate-500 font-normal">Kite / Groww Holdings export CSV/XLSX</span>
                          </Label>
                          <div
                              className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-md p-3 text-center hover:bg-slate-100/50 transition-colors">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => setHoldingsFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="holdings-file-input"
                            />
                            <label htmlFor="holdings-file-input"
                                   className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline">
                              {holdingsFile ? holdingsFile.name : 'Upload optional Demat Holdings Snapshot file to anchor & validate open lots'}
                            </label>
                          </div>
                        </div>
                      </div>
                  )}

                  {/* SINGLE FILE MF CAS DROPZONE */}
                  {mode === 'mf_cas' && (
                      <div className="space-y-3">
                        <div
                            className="space-y-1.5 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                          <Label
                              className="text-xs font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-purple-600"/>
                            CAS PDF Password
                          </Label>
                          <Input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Enter CAS PDF password (usually your PAN)"
                              className="h-8 text-xs bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upload CAS
                            Statement File</Label>
                          <div
                              className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-50 transition-colors">
                            <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2 opacity-80"/>
                            <input
                                type="file"
                                accept=".pdf,.csv"
                                onChange={(e) => setCasFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="cas-file-input"
                            />
                            <label htmlFor="cas-file-input"
                                   className="cursor-pointer text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                              {casFile ? casFile.name : 'Choose CAMS / KFintech CAS PDF/CSV file'}
                            </label>
                          </div>
                        </div>
                      </div>
                  )}
                </div>

                <DialogFooter className="pt-3 shrink-0">
                  <Button
                      type="submit"
                      size="sm"
                      disabled={isPreviewing}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isPreviewing ? 'Reconciling & Parsing Files...' : 'Preview Reconciliation'}
                    <ChevronRight className="w-3.5 h-3.5 ml-1"/>
                  </Button>
                </DialogFooter>
              </form>
          )}

          {/* STEP 2: Reconciliation Review */}
          {step === 2 && (reconcilePreview || casPreview) && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3 py-1">
                {reconcilePreview && (
                    <>
                      {/* Summary counters */}
                      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                        <div className="p-2 rounded bg-slate-100 dark:bg-slate-900">
                          <div className="text-[10px] text-slate-500">Executions</div>
                          <div
                              className="font-bold text-slate-900 dark:text-white text-sm">{reconcilePreview.summaryStats.totalExecutions}</div>
                        </div>
                        <div
                            className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          <div className="text-[10px]">Delivery / Intraday</div>
                          <div
                              className="font-bold text-sm">{reconcilePreview.summaryStats.deliveryExecutions} / {reconcilePreview.summaryStats.intradayExecutions}</div>
                        </div>
                        <div
                            className="p-2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                          <div className="text-[10px]">Open Holdings</div>
                          <div className="font-bold text-sm">{reconcilePreview.derivedHoldings.length} scrips</div>
                        </div>
                        <div
                            className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                          <div className="text-[10px]">Warnings / Gaps</div>
                          <div className="font-bold text-sm">{reconcilePreview.summaryStats.warningsCount}</div>
                        </div>
                        <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                          <div className="text-[10px]">Duplicates</div>
                          <div className="font-bold text-sm">{reconcilePreview.summaryStats.duplicates}</div>
                        </div>
                      </div>

                      {/* Realized Cross-Check Card */}
                      <div
                          className="shrink-0 p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div
                            className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <div>
                            <div className="text-[10px] font-semibold text-slate-500">Delivery Realized P&L</div>
                            <div
                                className="font-bold text-slate-900 dark:text-white">{formatMoney(reconcilePreview.realizedSummary.deliveryRealized)}</div>
                          </div>
                          <div className="text-right text-[10px]">
                            <div className="text-slate-400">Tax
                              P&L: {formatMoney(reconcilePreview.realizedSummary.classifierDeliveryRealized)}</div>
                            <div
                                className={`font-semibold ${Number(reconcilePreview.realizedSummary.deliveryDiff) === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              Diff: {Number(reconcilePreview.realizedSummary.deliveryDiff) >= 0 ? '+' : ''}{formatMoney(reconcilePreview.realizedSummary.deliveryDiff)}
                            </div>
                          </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <div>
                            <div className="text-[10px] font-semibold text-slate-500">Intraday Realized P&L</div>
                            <div
                                className="font-bold text-slate-900 dark:text-white">{formatMoney(reconcilePreview.realizedSummary.intradayRealized)}</div>
                          </div>
                          <div className="text-right text-[10px]">
                            <div className="text-slate-400">Tax
                              P&L: {formatMoney(reconcilePreview.realizedSummary.classifierIntradayRealized)}</div>
                            <div
                                className={`font-semibold ${Number(reconcilePreview.realizedSummary.intradayDiff) === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              Diff: {Number(reconcilePreview.realizedSummary.intradayDiff) >= 0 ? '+' : ''}{formatMoney(reconcilePreview.realizedSummary.intradayDiff)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Warnings / Data Gaps Banner */}
                      {reconcilePreview.warnings.length > 0 && (
                          <div
                              className="shrink-0 space-y-1 max-h-24 overflow-y-auto p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300">
                            <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0"/>
                              Reconciliation Alerts & Flags:
                            </div>
                            <ul className="space-y-1 pl-5 list-disc">
                              {reconcilePreview.warnings.map((w, idx) => (
                                  <li key={idx} className="leading-tight">
                                    <span className="font-semibold mr-1">[{w.type}]:</span>
                                    {w.message}
                                  </li>
                              ))}
                            </ul>
                          </div>
                      )}

                      {/* Scrollable Holdings & Executions Area */}
                      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
                        {/* Derived Open Holdings Table */}
                        <div
                            className="border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-950/30">
                          <div
                              className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-purple-600"/>
                            Derived Open Delivery Holdings ({reconcilePreview.derivedHoldings.length})
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent text-[11px] bg-slate-100 dark:bg-slate-900">
                                <TableHead className="py-1 h-7">Instrument</TableHead>
                                <TableHead className="py-1 h-7 text-right">Open Qty</TableHead>
                                <TableHead className="py-1 h-7 text-right">Clean Avg Cost</TableHead>
                                <TableHead className="py-1 h-7 text-right">Cost Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reconcilePreview.derivedHoldings.map((h, i) => (
                                  <TableRow key={i} className="text-[11px] h-7 border-slate-100 dark:border-slate-800">
                                    <TableCell className="py-1 font-semibold">{h.symbol} <span
                                        className="text-[10px] text-slate-400 font-normal">{h.isin ? `(${h.isin})` : ''}</span></TableCell>
                                    <TableCell
                                        className="py-1 text-right tabular-nums font-mono">{h.quantity}</TableCell>
                                    <TableCell
                                        className="py-1 text-right tabular-nums">{formatMoney(h.avgCost)}</TableCell>
                                    <TableCell
                                        className="py-1 text-right tabular-nums font-bold">{formatMoney(h.costValue)}</TableCell>
                                  </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Classified Executions Table */}
                        <div
                            className="border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-950">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                            Classified Executions ({reconcilePreview.executions.length})
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent text-[11px] bg-slate-50 dark:bg-slate-900">
                                <TableHead className="w-8 px-1 text-center py-1 h-7"></TableHead>
                                <TableHead className="py-1 px-1 h-7">Date & Side</TableHead>
                                <TableHead className="py-1 px-1 h-7">CNC/MIS</TableHead>
                                <TableHead className="py-1 px-1 h-7">Scrip</TableHead>
                                <TableHead className="py-1 px-1 h-7 text-right">Qty × Price</TableHead>
                                <TableHead className="py-1 px-1 h-7">Status / Map</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[...reconcilePreview.executions]
                                  .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
                                  .map((exec) => {
                                const state = rowStates[exec.rowIndex] || {skip: false};
                                return (
                                    <TableRow key={exec.rowIndex}
                                              className={`text-[11px] border-slate-100 dark:border-slate-800 ${state.skip ? 'opacity-50 bg-slate-50/50' : ''}`}>
                                      <TableCell className="text-center py-1 px-2">
                                        <Checkbox
                                            checked={!state.skip}
                                            onCheckedChange={(checked) => {
                                              setRowStates((prev) => ({
                                                ...prev,
                                                [exec.rowIndex]: {...prev[exec.rowIndex], skip: !checked},
                                              }));
                                            }}
                                        />
                                      </TableCell>
                                      <TableCell className="py-1 px-2 tabular-nums">
                                        <div className="whitespace-nowrap">{formatDate(exec.tradeDate)}</div>
                                        <Badge
                                            className={`text-[8px] px-1 py-0 ${exec.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                          {exec.type.toUpperCase()}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-1 px-2">
                                        <Badge variant="outline"
                                               className={`text-[8px] px-1 py-0 ${exec.settlementType === 'intraday' ? 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40' : 'border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-950/40'}`}>
                                          {exec.settlementType.toUpperCase()}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-1 px-2">
                                        <div
                                            className="font-semibold text-slate-900 dark:text-white">{exec.symbol}</div>
                                        <div
                                            className="text-[9px] text-slate-400">{exec.isin ? exec.isin : ''} • {exec.exchange}</div>
                                      </TableCell>
                                      <TableCell className="py-1 px-2 text-right tabular-nums">
                                        <div>{exec.quantity} × {formatMoney(exec.price)}</div>
                                        <div className="text-[9px] text-slate-400">{formatMoney(exec.totalValue)}</div>
                                      </TableCell>
                                      <TableCell className="py-1 px-2">
                                        {exec.matchedInstrument ? (
                                            <div
                                                className="text-emerald-800">{exec.matchedInstrument.name}</div>
                                        ) : (
                                            <Badge className="text-amber-800">Unmatched</Badge>
                                        )}
                                        {exec.isDuplicate && <Badge variant="outline"
                                                                    className="text-purple-600 border-purple-300 ml-1">Duplicate</Badge>}
                                      </TableCell>
                                    </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </>
                )}

                <DialogFooter className="pt-2 gap-2 shrink-0 flex-col-reverse sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)}
                          className="text-xs w-full sm:w-auto">
                    Back
                  </Button>
                  <Button type="button" size="sm" onClick={handleCommitSubmit} disabled={isCommitting}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                    {isCommitting ? 'Importing Reconciled Executions...' : `Import Confirmed Trades (${Object.values(rowStates).filter((s) => !s.skip).length})`}
                  </Button>
                </DialogFooter>
              </div>
          )}

          {/* STEP 3: Result */}
          {step === 3 && commitResult && (
              <div className="space-y-3 py-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto"/>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Broker Import Reconciliation
                    Complete!</h3>
                  <p className="text-xs text-slate-500">
                    Successfully processed import for <span
                      className="font-semibold text-slate-700 dark:text-slate-300">{selectedBrokerName}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs max-w-md mx-auto">
                  <div
                      className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Committed</div>
                    <div className="text-lg font-bold">{commitResult.committed}</div>
                  </div>
                  <div
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="text-[10px] text-slate-500">Skipped</div>
                    <div className="text-lg font-bold">{commitResult.skipped}</div>
                  </div>
                  <div
                      className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300">
                    <div className="text-[10px] text-red-600 dark:text-red-400">Failed</div>
                    <div className="text-lg font-bold">{commitResult.failed?.length || 0}</div>
                  </div>
                </div>

                <DialogFooter className="justify-center pt-4">
                  <Button type="button" size="sm" onClick={() => handleOpenChange(false)}
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white">
                    Done & View Portfolio
                  </Button>
                </DialogFooter>
              </div>
          )}
        </DialogContent>
      </Dialog>
  );
}
