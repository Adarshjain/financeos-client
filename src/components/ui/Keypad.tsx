import { CheckIcon, DeleteIcon, XIcon } from 'lucide-react';
import { JSX, useState } from 'react';

const keys: (string | number | { el: JSX.Element, value: string })[] = [
  1, 2, 3, { el: <DeleteIcon />, value: 'delete' },
  4, 5, 6, '',
  7, 8, 9, { el: <XIcon />, value: 'close' },
  '+/-', 0, '.', { el: <CheckIcon />, value: 'done' },
];

export interface KeypadProps {
  onChange?: (value: string) => void;
  onClose?: () => void;
  done?: () => void;
}

export default function Keypad({ onChange, onClose, done }: KeypadProps) {
  const [value, setValue] = useState('0');

  const handlePress = (key: string | number) => {
    if (key === 'close') {
      onClose?.();
      return;
    }
    if (key === 'done') {
      done?.();
      return;
    }

    let next = value;

    // Toggle sign
    if (key === '+/-') {
      next = value.startsWith('-')
        ? value.slice(1)
        : value === '0' ? value : `-${value}`;
    } else if (key === 'delete') {
      next = value.slice(0, -1);
    } else if (key === '.') {
      if (!value.includes('.')) {
        next = `${value}.`;
      }
    } else {
      next = value === '0' ? String(key) : value + key;
    }

    setValue(next);
    onChange?.(next);
  };

  return (
    <div className="grid grid-cols-4 h-[220px] gap-2">
      {keys.map(key => {
        return <button
          key={typeof key === 'string' || typeof key === 'number' ? key : key.value}
          onClick={() => handlePress(typeof key === 'string' || typeof key === 'number' ? key : key.value)}
          className="flex items-center justify-center text-center text-2xl rounded-full bg-gray-200
            transition-all duration-100 ease-out
            active:scale-95
            active:bg-gray-300
            active:shadow-inner
            select-none"
        >
          {typeof key === 'string' || typeof key === 'number' ? key : key.el}
        </button>;
      })}
    </div>
  );
}
