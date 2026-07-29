'use client';

import { Check, Loader2, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { catalogSearch, resolveInstrument } from '@/actions/investments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Instrument, InstrumentCandidate, InstrumentType } from '@/lib/types';

import { CreateInstrumentDialog } from './CreateInstrumentDialog';

interface InstrumentTypeaheadProps {
  selectedInstrument: Instrument | null;
  onSelect: (instrument: Instrument) => void;
  name?: string;
  required?: boolean;
  type?: InstrumentType;
}

export function InstrumentTypeahead({
  selectedInstrument,
  onSelect,
  name = 'instrumentId',
  required = true,
  type,
}: InstrumentTypeaheadProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstrumentCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await catalogSearch(query.trim(), type);
        if (res.success) {
          setResults(res.data || []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, type]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCandidate = async (candidate: InstrumentCandidate) => {
    const rowKey =
      candidate.existingInstrumentId ||
      candidate.amfiCode ||
      candidate.yahooSymbol ||
      `${candidate.source}-${candidate.name}`;
    setResolvingKey(rowKey);

    try {
      const res = await resolveInstrument({
        type: candidate.type,
        name: candidate.name,
        symbol: candidate.symbol,
        exchange: candidate.exchange,
        isin: candidate.isin,
        amfiCode: candidate.amfiCode,
        yahooSymbol: candidate.yahooSymbol,
        currency: candidate.currency,
        existingInstrumentId: candidate.existingInstrumentId,
      });

      if (res.success) {
        onSelect(res.data);
        setQuery('');
        setIsOpen(false);
        toast.success(`Added ${res.data.name}`);
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to resolve instrument: ' + (err as Error).message);
    } finally {
      setResolvingKey(null);
    }
  };

  const localResults = results.filter((r) => r.source === 'LOCAL');
  const externalResults = results.filter((r) => r.source !== 'LOCAL');

  const renderCandidateRow = (candidate: InstrumentCandidate) => {
    const rowKey =
      candidate.existingInstrumentId ||
      candidate.amfiCode ||
      candidate.yahooSymbol ||
      `${candidate.source}-${candidate.name}`;
    const isResolving = resolvingKey === rowKey;

    const subtitle = candidate.amfiCode
      ? `AMFI: ${candidate.amfiCode}`
      : `${candidate.symbol || 'No symbol'}${candidate.exchange ? ` • ${candidate.exchange}` : ''}`;

    return (
      <button
        key={rowKey}
        type="button"
        disabled={isResolving}
        onClick={() => handleSelectCandidate(candidate)}
        className="w-full flex-col text-left p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 flex transition-colors text-xs"
      >
        <div className="space-y-0.5 pr-2">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {candidate.name}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span>{subtitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isResolving ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" /> Adding…
            </span>
          ) : (
            <>
              {candidate.pricePreview && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  ₹{candidate.pricePreview.value} · {candidate.pricePreview.asOf}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[9px] uppercase">
                {candidate.type.replace('_', ' ')}
              </Badge>
              {selectedInstrument?.id &&
                candidate.existingInstrumentId === selectedInstrument.id && (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
            </>
          )}
        </div>
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      <input
        type="hidden"
        name={name}
        value={selectedInstrument?.id || ''}
        required={required}
      />

      {selectedInstrument ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 overflow-hidden">
            <Badge variant="outline" className="text-[10px] uppercase shrink-0">
              {selectedInstrument.type}
            </Badge>
            <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {selectedInstrument.name}
              {selectedInstrument.symbol ? ` (${selectedInstrument.symbol})` : ''}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="h-6 text-[11px] text-slate-500 hover:text-slate-900 shrink-0"
          >
            Change
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search instrument by name or symbol..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg p-1 space-y-1">
          {loading ? (
            <div className="p-3 text-center text-xs text-slate-400">Searching...</div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {localResults.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50 rounded-sm">
                    In your catalog
                  </div>
                  {localResults.map(renderCandidateRow)}
                </div>
              )}
              {externalResults.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50 rounded-sm mt-1">
                    Search results
                  </div>
                  {externalResults.map(renderCandidateRow)}
                </div>
              )}
            </div>
          ) : query.trim().length >= 2 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              No instruments found.
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">
              Type at least 2 characters to search catalog...
            </div>
          )}

          <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCreateOpen(true);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-md transition-colors"
            >
              Can&apos;t find it? Enter manually (advanced)
            </button>
          </div>
        </div>
      )}

      <CreateInstrumentDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        initialMode="manual"
        type={type}
        onCreated={(newInst) => {
          onSelect(newInst);
          setQuery('');
          setIsOpen(false);
        }}
      />
    </div>
  );
}
