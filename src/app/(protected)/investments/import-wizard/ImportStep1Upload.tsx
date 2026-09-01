'use client';

import { KeyRound, Sparkles, Upload } from 'lucide-react';
import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Broker as BrokerAccount, isAccountClosed } from '@/lib/account.types';

import { ImportAssetScope, ImportMode } from './types';

interface ImportStep1UploadProps {
  brokerAccounts: BrokerAccount[];
  mode: ImportMode;
  setMode: (mode: ImportMode) => void;
  assetScope: ImportAssetScope;
  setAssetScope: (scope: ImportAssetScope) => void;
  brokerAccountId: string;
  setBrokerAccountId: (id: string) => void;
  password: string;
  setPassword: (password: string) => void;
  taxpnlFiles: File[];
  setTaxpnlFiles: (files: File[]) => void;
  tradebookFiles: File[];
  setTradebookFiles: (files: File[]) => void;
  holdingsFile: File | null;
  setHoldingsFile: (file: File | null) => void;
  casFile: File | null;
  setCasFile: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ImportStep1Upload({
  brokerAccounts,
  mode,
  setMode,
  assetScope,
  setAssetScope,
  brokerAccountId,
  setBrokerAccountId,
  password,
  setPassword,
  taxpnlFiles,
  setTaxpnlFiles,
  tradebookFiles,
  setTradebookFiles,
  holdingsFile,
  setHoldingsFile,
  casFile,
  setCasFile,
  onSubmit,
}: ImportStep1UploadProps) {
  const isFnoOnly = mode === 'reconcile_zerodha' && assetScope === 'fno';

  return (
    <form id="import-step1-form" onSubmit={onSubmit} className="space-y-2 py-2">
      <div className="space-y-2">
        <div className={`grid grid-cols-1 ${mode === 'reconcile_zerodha' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Broker / Import Type</Label>
            <Select value={mode} onValueChange={(val) => setMode(val as ImportMode)}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                <SelectValue placeholder="Select broker..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectItem value="reconcile_zerodha" className="text-xs">
                  Zerodha Reconciliation (Tradebook + Tax P&L)
                </SelectItem>
                <SelectItem value="reconcile_groww" className="text-xs">
                  Groww Reconciliation (Order History + Capital Gains)
                </SelectItem>
                <SelectItem value="mf_cas" className="text-xs">
                  Mutual Funds CAS (CAMS / KFintech PDF)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Broker Account</Label>
            <Select value={brokerAccountId} onValueChange={setBrokerAccountId}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                <SelectValue placeholder="Select target account..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                {brokerAccounts
                  .filter((b) => !isAccountClosed(b) || b.id === brokerAccountId)
                  .map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.name} ({b.provider || 'Broker'}) {b.closedOn ? '(Closed)' : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {mode === 'reconcile_zerodha' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Asset Scope</Label>
              <Select value={assetScope} onValueChange={(val) => setAssetScope(val as ImportAssetScope)}>
                <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Select asset scope..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectItem value="all" className="text-xs">
                    Stocks &amp; F&amp;O (Both)
                  </SelectItem>
                  <SelectItem value="equity" className="text-xs">
                    Stocks only
                  </SelectItem>
                  <SelectItem value="fno" className="text-xs">
                    F&amp;O only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* RECONCILIATION MULTI-FILE DROPZONES */}
        {(mode === 'reconcile_zerodha' || mode === 'reconcile_groww') && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-md bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs text-purple-900 dark:text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 inline mr-1.5 -mt-0.5" />
              {isFnoOnly ? (
                <>
                  <strong>F&O Realized P&L:</strong> Read directly from the Tax P&L — buy value, sell value and charges per contract. No tradebook needed.
                </>
              ) : (
                <>
                  <strong>Authoritative Intraday & Clean FIFO:</strong> Tax P&L provides intraday classification and realized exit charges. Executions are classified, matched via delivery-only FIFO, and cost basis is computed using traded price.
                </>
              )}
            </div>

            <div className={`grid grid-cols-1 ${isFnoOnly ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
              {/* SECTION 1: Tax P&L / Capital Gains Files */}
              <div className="space-y-2 p-3 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10">
                <Label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between">
                  <span>1. {mode === 'reconcile_zerodha' ? 'Zerodha Tax P&L' : 'Groww Capital Gains'} (XLSX)</span>
                  <span className="text-2xs text-purple-600 font-normal">Per FY files</span>
                </Label>
                <div className="border-2 border-dashed border-purple-200 dark:border-purple-900/50 rounded-md p-4 text-center hover:bg-purple-50/40 transition-colors">
                  <Upload className="w-6 h-6 text-purple-500 mx-auto mb-1 opacity-80" />
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls"
                    onChange={(e) => setTaxpnlFiles(Array.from(e.target.files || []))}
                    className="hidden"
                    id="taxpnl-file-input"
                  />
                  <label
                    htmlFor="taxpnl-file-input"
                    className="cursor-pointer text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {taxpnlFiles.length > 0
                      ? `${taxpnlFiles.length} file(s) selected`
                      : `Upload ${mode === 'reconcile_zerodha' ? 'Tax P&L' : 'Capital Gains'} XLSX file(s)`}
                  </label>
                  {taxpnlFiles.length > 0 && (
                    <div className="mt-1 text-2xs text-purple-700 dark:text-purple-300 truncate max-w-xs mx-auto">
                      {taxpnlFiles.map((f) => f.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: Tradebook / Order History Files */}
              {!isFnoOnly && (
                <div className="space-y-2 p-3 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10">
                  <Label className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center justify-between">
                    <span>2. {mode === 'reconcile_zerodha' ? 'Zerodha Tradebook' : 'Groww Order History'}</span>
                    <span className="text-2xs text-blue-600 font-normal">
                      Full history CSV/XLSX
                    </span>
                  </Label>
                  <div className="border-2 border-dashed border-blue-200 dark:border-blue-900/50 rounded-md p-4 text-center hover:bg-blue-50/40 transition-colors">
                    <Upload className="w-6 h-6 text-blue-500 mx-auto mb-1 opacity-80" />
                    <input
                      type="file"
                      multiple
                      accept={mode === 'reconcile_zerodha' ? '.csv' : '.xlsx,.xls,.csv'}
                      onChange={(e) => setTradebookFiles(Array.from(e.target.files || []))}
                      className="hidden"
                      id="tradebook-file-input"
                    />
                    <label
                      htmlFor="tradebook-file-input"
                      className="cursor-pointer text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {tradebookFiles.length > 0
                        ? `${tradebookFiles.length} file(s) selected`
                        : `Upload ${mode === 'reconcile_zerodha' ? 'Tradebook CSV' : 'Order History XLSX'} file(s)`}
                    </label>
                    {tradebookFiles.length > 0 && (
                      <div className="mt-1 text-2xs text-blue-700 dark:text-blue-300 truncate max-w-xs mx-auto">
                        {tradebookFiles.map((f) => f.name).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Optional Holdings Snapshot Anchor */}
            {!isFnoOnly && (
              <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>3. Holdings Snapshot Anchor (Optional)</span>
                  <span className="text-2xs text-slate-500 font-normal">Kite / Groww Holdings export CSV/XLSX</span>
                </Label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-md p-3 text-center hover:bg-slate-100/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setHoldingsFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="holdings-file-input"
                  />
                  <label
                    htmlFor="holdings-file-input"
                    className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                  >
                    {holdingsFile
                      ? holdingsFile.name
                      : 'Upload optional Demat Holdings Snapshot file to anchor & validate open lots'}
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SINGLE FILE MF CAS DROPZONE */}
        {mode === 'mf_cas' && (
          <div className="space-y-3">
            <div className="space-y-1.5 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
              <Label className="text-xs font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-purple-600" />
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
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Upload CAS Statement File
              </Label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-50 transition-colors">
                <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2 opacity-80" />
                <input
                  type="file"
                  accept=".pdf,.csv"
                  onChange={(e) => setCasFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="cas-file-input"
                />
                <label
                  htmlFor="cas-file-input"
                  className="cursor-pointer text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {casFile ? casFile.name : 'Choose CAMS / KFintech CAS PDF/CSV file'}
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
