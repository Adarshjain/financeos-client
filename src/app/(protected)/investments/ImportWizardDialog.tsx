'use client';

import { AlertTriangle, CheckCircle2, ChevronRight, FileSpreadsheet, KeyRound, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { commitImport, previewImport } from '@/actions/investments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Broker } from '@/lib/account.types';
import {
  CreateInstrumentRequest,
  ImportCommitRequest,
  ImportCommitResult,
  ImportPreview,
  ImportSource,
  Instrument,
  InstrumentType,
} from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { InstrumentTypeahead } from './InstrumentTypeahead';

interface ImportWizardDialogProps {
  brokerAccounts: Broker[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ImportWizardDialog({ brokerAccounts, trigger, onSuccess }: ImportWizardDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form State
  const [source, setSource] = useState<ImportSource>('zerodha_tradebook');
  const [brokerAccountId, setBrokerAccountId] = useState(brokerAccounts[0]?.id || '');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Step 2 Review State
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null);
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
    setFile(null);
    setPassword('');
    setPreviewData(null);
    setRowStates({});
    setCommitResult(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetWizard();
    }
  };

  // Step 1: Submit File for Preview
  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerAccountId) {
      toast.error('Please select a target broker account.');
      return;
    }
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', source);
      formData.append('brokerAccountId', brokerAccountId);
      if (source === 'mf_cas' && password) {
        formData.append('password', password);
      }

      const res = await previewImport(formData);
      if (res.success) {
        setPreviewData(res.data);

        // Initialize row states
        const initialStates: Record<number, any> = {};
        for (const row of res.data.rows) {
          const isDup = row.duplicate;
          const hasError = !!row.parsedRow?.error;
          initialStates[row.rowIndex] = {
            skip: isDup || hasError,
            selectedInstrumentId: row.matchedInstrument?.id,
            createNew: false,
            newInstrument: {
              type: (row.parsedRow.parsedIsin ? 'mutual_fund' : 'stock') as InstrumentType,
              name: row.parsedRow.parsedName || row.parsedRow.parsedSymbol || 'New Instrument',
              symbol: row.parsedRow.parsedSymbol || '',
              exchange: row.parsedRow.exchange || 'NSE',
              isin: row.parsedRow.parsedIsin || undefined,
              yahooSymbol: row.parsedRow.parsedSymbol ? `${row.parsedRow.parsedSymbol.toUpperCase()}.NS` : '',
            },
          };
        }
        setRowStates(initialStates);
        setStep(2);
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to preview import: ' + (err as Error).message);
    } finally {
      setIsPreviewing(false);
    }
  };

  // Step 2: Commit Review
  const handleCommitSubmit = async () => {
    if (!previewData) return;

    setIsCommitting(true);
    try {
      const commitRows = previewData.rows.map((row) => {
        const state = rowStates[row.rowIndex] || { skip: false };
        return {
          rowIndex: row.rowIndex,
          row: row.parsedRow,
          skip: state.skip,
          instrumentId: !state.createNew ? state.selectedInstrumentId || row.matchedInstrument?.id : undefined,
          newInstrument: state.createNew ? state.newInstrument : undefined,
        };
      });

      const req: ImportCommitRequest = {
        source,
        brokerAccountId,
        rows: commitRows,
      };

      const res = await commitImport(req);
      if (res.success) {
        setCommitResult(res.data);
        setStep(3);
        onSuccess?.();
      } else {
        toast.error(res.error.message);
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
          <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1.5 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40">
            <Upload className="w-3.5 h-3.5" />
            Import Trades
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
            Import Investments Wizard
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Step {step} of 3: {step === 1 ? 'Select Broker & Upload File' : step === 2 ? 'Review & Resolve Instruments' : 'Import Complete'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <form onSubmit={handlePreviewSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Import Source Format</Label>
                <Select value={source} onValueChange={(val) => setSource(val as ImportSource)}>
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Select import format..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectItem value="zerodha_tradebook" className="text-xs">Zerodha Tradebook (CSV)</SelectItem>
                    <SelectItem value="groww" className="text-xs">Groww Stocks (CSV/XLSX)</SelectItem>
                    <SelectItem value="mf_cas" className="text-xs">MF CAS (CAMS / KFintech PDF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Broker Account</Label>
                <Select value={brokerAccountId} onValueChange={setBrokerAccountId}>
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Select target broker..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    {brokerAccounts.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.name} ({b.brokerDetails?.provider || 'Broker'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {source === 'groww' && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-md border border-slate-100 dark:border-slate-800">
                Groww stocks order/transaction export (CSV or XLSX). Mutual funds come from the CAS import, not here.
              </p>
            )}

            {source === 'mf_cas' && (
              <div className="space-y-1.5 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                <Label className="text-xs font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                  CAS PDF Password
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter CAS PDF password"
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800"
                />
                <p className="text-[10px] text-purple-700 dark:text-purple-400">
                  Usually your PAN (in uppercase) or password set during download from CAMS/KFintech. A single CAS covers transactions across all your AMCs.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upload Statement File</Label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2 opacity-80" />
                <input
                  type="file"
                  accept={source === 'mf_cas' ? '.pdf,.csv' : source === 'groww' ? '.csv,.xlsx' : '.csv'}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="import-csv-input"
                />
                <label htmlFor="import-csv-input" className="cursor-pointer text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                  {file ? file.name : source === 'mf_cas' ? 'Choose MF CAS PDF/CSV file' : source === 'groww' ? 'Choose Groww Stocks CSV/XLSX file' : 'Choose Zerodha Tradebook CSV file'}
                </label>
                <p className="text-[10px] text-slate-400 mt-1">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : source === 'mf_cas' ? 'Supports CAMS / KFintech Consolidated Account Statements (.pdf)' : source === 'groww' ? 'Supports Groww stocks order/transaction exports (.csv, .xlsx)' : 'Supports Zerodha equity tradebook exports (.csv)'}
                </p>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="submit"
                size="sm"
                disabled={isPreviewing || !file}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isPreviewing ? 'Parsing Statement...' : 'Preview Import'}
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 2: Review */}
        {step === 2 && previewData && (
          <div className="space-y-4 py-2">
            {/* Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-900">
                <div className="text-[10px] text-slate-500">Total Rows</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{previewData.summary.total}</div>
              </div>
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                <div className="text-[10px]">Matched</div>
                <div className="font-bold text-sm">{previewData.summary.matched}</div>
              </div>
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                <div className="text-[10px]">Unmatched</div>
                <div className="font-bold text-sm">{previewData.summary.unmatched}</div>
              </div>
              <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                <div className="text-[10px]">Duplicates</div>
                <div className="font-bold text-sm">{previewData.summary.duplicates}</div>
              </div>
              <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                <div className="text-[10px]">Errors</div>
                <div className="font-bold text-sm">{previewData.summary.errors}</div>
              </div>
            </div>

            {/* Note banner */}
            {previewData.summary.note && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{previewData.summary.note}</span>
              </div>
            )}

            {/* Review Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50 dark:bg-slate-900 text-xs">
                    <TableHead className="w-10 text-center">Import</TableHead>
                    <TableHead>Date & Type</TableHead>
                    <TableHead>Parsed Instrument</TableHead>
                    <TableHead className="text-right">Qty × Price / Amount</TableHead>
                    <TableHead>Status & Instrument Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.rows.map((row) => {
                    const state = rowStates[row.rowIndex] || { skip: false };
                    const isDup = row.duplicate;
                    const isUnmatched = row.matchStatus === 'unmatched';
                    const pr = row.parsedRow || {};
                    const isDividend = pr.kind === 'dividend';

                    return (
                      <TableRow key={row.rowIndex} className={`text-xs border-slate-100 dark:border-slate-800 ${state.skip ? 'opacity-50 bg-slate-50/50 dark:bg-slate-950/20' : ''}`}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={!state.skip}
                            onCheckedChange={(checked) => {
                              setRowStates((prev) => ({
                                ...prev,
                                [row.rowIndex]: { ...prev[row.rowIndex], skip: !checked },
                              }));
                            }}
                          />
                        </TableCell>
                        <TableCell className="tabular-nums">
                          <div>{formatDate(pr.tradeDate)}</div>
                          {isDividend ? (
                            <Badge className="bg-purple-100 text-purple-800 text-[8px] px-1 py-0">
                              DIVIDEND
                            </Badge>
                          ) : (
                            <Badge className={`text-[8px] px-1 py-0 ${pr.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {pr.type?.toUpperCase() || pr.kind?.toUpperCase() || 'TRADE'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-white">{pr.parsedName || pr.parsedSymbol || '—'}</div>
                          <div className="text-[10px] text-slate-400">
                            {pr.parsedSymbol ? `Ticker: ${pr.parsedSymbol}` : ''} {pr.parsedIsin ? `• ISIN: ${pr.parsedIsin}` : ''} {pr.exchange ? `• Exch: ${pr.exchange}` : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {isDividend ? (
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(pr.amount || pr.price)}
                            </div>
                          ) : (
                            <div>
                              {pr.quantity} × {formatMoney(pr.price)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {row.matchStatus === 'matched' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[9px]">
                                {row.matchedInstrument?.name || 'Matched'}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 text-[9px]">Unmatched</Badge>
                            )}
                            {isDup && <Badge variant="outline" className="text-purple-600 border-purple-300 text-[9px]">Duplicate</Badge>}
                            {pr.error && <Badge className="bg-red-100 text-red-800 text-[9px]">{pr.error}</Badge>}
                          </div>

                          {/* Instrument Resolution for Unmatched */}
                          {isUnmatched && !state.skip && (
                            <div className="mt-1.5 space-y-1.5 p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                              <div className="flex items-center gap-2 text-[10px]">
                                <label className="flex items-center gap-1 cursor-pointer font-semibold">
                                  <input
                                    type="radio"
                                    name={`mode-${row.rowIndex}`}
                                    checked={!state.createNew}
                                    onChange={() => setRowStates((prev) => ({ ...prev, [row.rowIndex]: { ...prev[row.rowIndex], createNew: false } }))}
                                  />
                                  Map Existing
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer font-semibold">
                                  <input
                                    type="radio"
                                    name={`mode-${row.rowIndex}`}
                                    checked={state.createNew}
                                    onChange={() => setRowStates((prev) => ({ ...prev, [row.rowIndex]: { ...prev[row.rowIndex], createNew: true } }))}
                                  />
                                  Create New
                                </label>
                              </div>

                              {!state.createNew ? (
                                <InstrumentTypeahead
                                  selectedInstrument={state.selectedInstrumentId ? ({ id: state.selectedInstrumentId, name: 'Mapped Instrument' } as Instrument) : null}
                                  onSelect={(inst) => setRowStates((prev) => ({ ...prev, [row.rowIndex]: { ...prev[row.rowIndex], selectedInstrumentId: inst.id } }))}
                                />
                              ) : (
                                <div className="space-y-1 text-[10px]">
                                  <Input
                                    value={state.newInstrument?.name || ''}
                                    onChange={(e) => updateRowNewInstrument(row.rowIndex, { name: e.target.value })}
                                    placeholder="Name"
                                    className="h-6 text-[10px]"
                                  />
                                  <div className="grid grid-cols-2 gap-1">
                                    <Input
                                      value={state.newInstrument?.symbol || ''}
                                      onChange={(e) =>
                                        updateRowNewInstrument(row.rowIndex, {
                                          symbol: e.target.value,
                                          yahooSymbol: `${e.target.value.toUpperCase()}.NS`,
                                        })
                                      }
                                      placeholder="Symbol"
                                      className="h-6 text-[10px]"
                                    />
                                    <Input
                                      value={state.newInstrument?.yahooSymbol || ''}
                                      onChange={(e) => updateRowNewInstrument(row.rowIndex, { yahooSymbol: e.target.value })}
                                      placeholder="Yahoo Symbol"
                                      className="h-6 text-[10px]"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">
                Back
              </Button>
              <Button type="button" size="sm" onClick={handleCommitSubmit} disabled={isCommitting} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                {isCommitting ? 'Importing Statements...' : `Import Confirmed Rows (${Object.values(rowStates).filter((s) => !s.skip).length})`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 3: Result */}
        {step === 3 && commitResult && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Import Complete!</h3>
              <p className="text-xs text-slate-500">
                Successfully processed import for <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedBrokerName}</span>.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs max-w-md mx-auto">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Committed</div>
                <div className="text-lg font-bold">{commitResult.committed}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <div className="text-[10px] text-slate-500">Skipped</div>
                <div className="text-lg font-bold">{commitResult.skipped}</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300">
                <div className="text-[10px] text-red-600 dark:text-red-400">Failed</div>
                <div className="text-lg font-bold">{commitResult.failed?.length || 0}</div>
              </div>
            </div>

            {commitResult.failed && commitResult.failed.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-left text-xs space-y-1 max-w-md mx-auto">
                <div className="font-bold text-red-800 dark:text-red-300">Failures:</div>
                <ul className="list-disc pl-4 text-[11px] text-red-700 dark:text-red-400 space-y-0.5">
                  {commitResult.failed.map((f, i) => (
                    <li key={i}>Row #{f.rowIndex}: {f.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter className="justify-center pt-4">
              <Button type="button" size="sm" onClick={() => handleOpenChange(false)} className="text-xs bg-purple-600 hover:bg-purple-700 text-white">
                Done & View Portfolio
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
