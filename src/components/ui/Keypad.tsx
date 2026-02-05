import { DeleteIcon, EqualIcon, MinusIcon, PlusIcon, XIcon } from 'lucide-react';
import { JSX, useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const keys: (string | number | { el: JSX.Element; value: string })[] = [
  1, 2, 3, { el: <DeleteIcon />, value: 'delete' },
  4, 5, 6, { el: <MinusIcon />, value: 'minus' },
  7, 8, 9, { el: <PlusIcon />, value: 'plus' },
  '.', 0, { el: <XIcon />, value: 'multiply' }, { el: <EqualIcon />, value: 'equal' },
];

type Op = 'plus' | 'minus' | 'multiply';

const OP_SYMBOL: Record<Op, string> = { plus: '+', minus: '−', multiply: '×' };

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

function formatResult(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded);
}

function compute(prev: number, op: Op, current: string): number {
  const b = parseNum(current);
  if (op === 'plus') return prev + b;
  if (op === 'minus') return prev - b;
  return prev * b;
}

export interface KeypadProps {
  onChange?: (value: string) => void;
  onClose?: () => void;
  done?: () => void;
  amount?: string;
}

export default function Keypad({ onChange, onClose, done, amount }: KeypadProps) {
  const [current, setCurrent] = useState(amount ?? '-0');
  const [pending, setPending] = useState<{ prev: number; op: Op } | null>(null);
  const [justComputed, setJustComputed] = useState(false);

  const hasOpInProgress = pending !== null;

  const handlePress = useCallback(
    (key: string | number) => {
      if (key === 'close') {
        onClose?.();
        return;
      }
      if (key === 'done') {
        done?.();
        return;
      }

      // Equal: compute and show result (no chaining)
      if (key === 'equal') {
        if (!pending) return;
        const result = formatResult(compute(pending.prev, pending.op, current));
        setCurrent(result);
        setPending(null);
        setJustComputed(true);
        onChange?.(result);
        return;
      }

      // Op: store first number, start second (no chaining — one op at a time)
      if (key === 'plus' || key === 'minus' || key === 'multiply') {
        setJustComputed(false);
        const prevNum = parseNum(current);
        setPending({ prev: prevNum, op: key });
        setCurrent('0');
        return;
      }

      // +/- disabled while op in progress
      if (key === '+/-') {
        if (hasOpInProgress) return;
        setJustComputed(false);
        setCurrent((v) =>
          v.startsWith('-') ? (v.slice(1) || '0') : v === '0' || v === '' ? '-0' : `-${v}`,
        );
        return;
      }

      if (key === 'delete') {
        setJustComputed(false);
        setCurrent((v) => v.slice(0, -1) || '-0');
        return;
      }

      if (key === '.') {
        setJustComputed(false);
        setCurrent((v) => {
          if (v.includes('.')) return v;
          return v === '-' || v === '-0' ? '-0.' : `${v}.`;
        });
        return;
      }

      // Digit (or 0): after =, replace result; otherwise append
      const digit = String(key);
      setCurrent((v) => {
        if (justComputed) return digit;
        if (v === '0' || v === '') return digit;
        if (v === '-0') return `-${digit}`;
        return v + digit;
      });
      setJustComputed(false);
    },
    [current, hasOpInProgress, justComputed, onChange, onClose, done, pending],
  );

  useEffect(() => {
    if (!pending) onChange?.(current);
  }, [current, pending, onChange]);

  useEffect(() => {
    if (amount != null && amount !== current) {
      setCurrent(amount);
      setPending(null);
      setJustComputed(false);
    }
  }, [amount]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '.') handlePress('.');
      else if (e.key === 'Backspace') handlePress('delete');
      else if (e.key === '-') handlePress('minus');
      else if (e.key === '+') handlePress('plus');
      else if (e.key === '*' || (e.shiftKey && e.key === '8')) handlePress('multiply');
      else if (e.key === '=' || e.key === 'Enter') handlePress('equal');
      else {
        const n = parseInt(e.key, 10);
        if (!Number.isNaN(n)) handlePress(n);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handlePress, hasOpInProgress]);

  const displayString = pending
    ? `${pending.prev}${OP_SYMBOL[pending.op]}${current}`
    : current;
  const num = parseFloat(displayString);
  const displayColor =
    !pending && num !== 0 ? (num > 0 ? 'text-emerald-500' : 'text-red-500') : '';

  const isLiteral = (k: (typeof keys)[number]): k is string | number =>
    typeof k === 'string' || typeof k === 'number';

  return (
    <div className="flex flex-col gap-3 mt-auto">
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => !hasOpInProgress && handlePress('+/-')}
          disabled={hasOpInProgress}
          className={cn(
            'flex items-center justify-center text-center text-2xl rounded-full bg-transparent border transition-all duration-100 ease-out active:scale-95 select-none',
            !hasOpInProgress && 'active:bg-gray-300 active:shadow-inner',
            hasOpInProgress && 'opacity-50 cursor-not-allowed',
          )}
        >
          +/-
        </button>
        <div
          className={cn(
            'min-h-[3rem] text-5xl font-medium text-center tabular-nums truncate px-1  col-span-3',
            displayColor,
          )}
        >
          {displayString}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 h-[220px]">
        {keys.map((key, i) => {
          const value = isLiteral(key) ? key : key.value;
          const isSign = value === '+/-';
          const disabled = isSign && hasOpInProgress;
          return (
            <button
              type="button"
              key={isLiteral(key) ? `k-${key}-${i}` : key.value}
              onClick={() => !disabled && handlePress(value)}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center text-center text-2xl rounded-full bg-gray-200 transition-all duration-100 ease-out active:scale-95 select-none',
                !disabled && 'active:bg-gray-300 active:shadow-inner',
                disabled && 'opacity-50 cursor-not-allowed',
                !isLiteral(key) && key.value === 'delete' && 'bg-red-100 text-red-800',
              )}
            >
              {isLiteral(key) ? key : key.el}
            </button>
          );
        })}
      </div>
    </div>
  );
}
