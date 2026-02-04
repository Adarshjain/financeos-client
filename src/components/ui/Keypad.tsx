import { CheckIcon, DeleteIcon, XIcon } from 'lucide-react';
import { JSX, useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const keys: (string | number | { el: JSX.Element, value: string })[] = [
  1, 2, 3, { el: <DeleteIcon />, value: 'delete' },
  4, 5, 6, { el: <XIcon />, value: 'close' },
  7, 8, 9, { el: <CheckIcon />, value: 'done' },
  '+/-', 0, '.',
];

export interface KeypadProps {
  onChange?: (value: string) => void;
  onClose?: () => void;
  done?: () => void;
  amount?: string;
}

export default function Keypad({ onChange, onClose, done, amount }: KeypadProps) {
  const [value, setValue] = useState(amount ?? '-0');

  const handlePress = useCallback((key: string | number) => {
    if (key === 'close') {
      onClose?.();
      return;
    }
    if (key === 'done') {
      done?.();
      return;
    }

    let next = value;

    // Toggle sign (default to -0 for expenses)
    if (key === '+/-') {
      next = value.startsWith('-')
        ? (value.slice(1) || '0')
        : value === '0' || value === '' ? '-0' : `-${value}`;
    } else if (key === 'delete') {
      next = value.slice(0, -1);
    } else if (key === '.') {
      if (!value.includes('.')) {
        next = value === '-' || value === '-0' ? '-0.' : `${value}.`;
      }
    } else {
      // Replace leading 0 or -0 when typing first digit; append otherwise
      if (value === '0' || value === '') {
        next = String(key);
      } else if (value === '-0') {
        next = `-${key}`;
      } else {
        next = value + key;
      }
    }

    setValue(next);
    onChange?.(next);
  }, [done, onChange, onClose, value]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      try {
        if (e.key === '.') {
          handlePress(e.key)
        }
        if (e.key === 'Backspace') {
          handlePress('delete')
        }
        if (e.key === '-' || e.key === '_') {
          handlePress('+/-')
        }
        const key = parseInt(e.key);
        if (!isNaN(key)) {
          handlePress(key)
        }
      } catch (e) {
        // Do nothing
      }
    };

    window.addEventListener('keydown', listener);

    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [handlePress]);


  return (
    <div className="grid grid-cols-4 h-[220px] gap-2">
      {keys.map(key => {
        const isStringNumber = typeof key === 'string' || typeof key === 'number';
        return <button
          type={!isStringNumber && key.value === 'done' ? 'submit' : 'button'}
          key={isStringNumber ? key : key.value}
          onClick={
            !isStringNumber && key.value === 'done'
              ? undefined
              : () => handlePress(isStringNumber ? key : key.value)
          }
          className={
            cn(
              'flex items-center justify-center text-center text-2xl rounded-full bg-gray-200 transition-all duration-100 ease-out active:scale-95 active:bg-gray-300 active:shadow-inner select-none',
              !isStringNumber && key.value === 'done' ? 'bg-emerald-200 text-emerald-800 row-span-2 rounded-3xl' : null,
              !isStringNumber && key.value === 'close' ? 'bg-red-200 text-red-800' : null,
              isStringNumber && key === '' ? 'opacity-0' : null,
            )
          }
        >
          {isStringNumber ? key : key.el}
        </button>;
      })}
    </div>
  );
}
