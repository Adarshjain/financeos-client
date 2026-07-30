'use client';

import { Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { catalogSearch, resolveInstrument } from '@/actions/investments';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Instrument, InstrumentCandidate, InstrumentType } from '@/lib/types';

interface InstrumentSearchFieldProps {
  type?: InstrumentType;
  // Default mode: resolve the picked candidate to a persisted instrument (dedup-or-create) and
  // emit it. Used by the Add-Instrument flow.
  onResolved?: (instrument: Instrument) => void;
  // "Fill fields" mode: instead of persisting, hand the raw candidate back so the caller can
  // populate an existing form (e.g. Edit Instrument, where the row must keep its id + holdings).
  // When provided, selecting a result does NOT hit resolveInstrument.
  onPick?: (candidate: InstrumentCandidate) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

const candidateKey = (c: InstrumentCandidate) =>
  c.existingInstrumentId || c.amfiCode || c.yahooSymbol || `${c.source}-${c.name}`;

/**
 * Inline "search the real feeds (AMFI/Yahoo) and pick" field. On select it resolves the
 * candidate to a persisted instrument (dedup-or-create on the server) and emits it via
 * onResolved. Shared by the Add-Instrument dialog and any other search-first entry point.
 */
export function InstrumentSearchField({
  type,
  onResolved,
  onPick,
  autoFocus,
  placeholder,
}: InstrumentSearchFieldProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstrumentCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);

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
        setResults(res.success ? res.data || [] : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, type]);

  const handleSelect = async (candidate: InstrumentCandidate) => {
    // Fill-fields mode: hand the candidate to the caller without persisting anything.
    if (onPick) {
      onPick(candidate);
      setQuery('');
      setResults([]);
      return;
    }

    const rowKey = candidateKey(candidate);
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
        onResolved?.(res.data);
        toast.success(`Added ${res.data.name}`);
        setQuery('');
        setResults([]);
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to add instrument: ' + (err as Error).message);
    } finally {
      setResolvingKey(null);
    }
  };

  const localResults = results.filter((r) => r.source === 'LOCAL');
  const externalResults = results.filter((r) => r.source !== 'LOCAL');

  const renderRow = (candidate: InstrumentCandidate) => {
    const rowKey = candidateKey(candidate);
    const isResolving = resolvingKey === rowKey;
    const subtitle = candidate.amfiCode
      ? `AMFI: ${candidate.amfiCode}`
      : `${candidate.symbol || 'No symbol'}${candidate.exchange ? ` • ${candidate.exchange}` : ''}`;

    return (
      <button
        key={rowKey}
        type="button"
        disabled={isResolving}
        onClick={() => handleSelect(candidate)}
        className="w-full text-left p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-between transition-colors text-xs disabled:opacity-60"
      >
        <div className="space-y-0.5 truncate pr-2">
          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {candidate.name}
          </div>
          <div className="text-[10px] text-slate-400">{subtitle}</div>
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
            </>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          type="text"
          autoFocus={autoFocus}
          placeholder={placeholder || 'Search by name or symbol (AMFI / Yahoo)…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
        />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 p-1">
        {loading ? (
          <div className="p-3 text-center text-xs text-slate-400">Searching…</div>
        ) : results.length > 0 ? (
          <div className="space-y-1">
            {localResults.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50 rounded-sm">
                  In your catalog
                </div>
                {localResults.map(renderRow)}
              </div>
            )}
            {externalResults.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50 rounded-sm mt-1">
                  Search results
                </div>
                {externalResults.map(renderRow)}
              </div>
            )}
          </div>
        ) : query.trim().length >= 2 ? (
          <div className="p-3 text-center text-xs text-slate-400">
            No matches — enter the details below manually.
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-slate-400">
            Type at least 2 characters to search…
          </div>
        )}
      </div>
    </div>
  );
}
