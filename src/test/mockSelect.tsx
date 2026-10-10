import * as React from 'react';

/**
 * Lightweight stand-in for `@/components/ui/select` (Radix Select can't be
 * driven reliably in jsdom). Items are always rendered as buttons; clicking one
 * calls `onValueChange`. Use via:
 *   vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
 */
const Ctx = React.createContext<{ value?: string; onValueChange?: (v: string) => void; disabled?: boolean }>({});

function Select({
  value,
  onValueChange,
  disabled,
  children,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Ctx.Provider value={{ value, onValueChange, disabled }}>
      <div data-testid="select" data-value={value} data-disabled={disabled ? 'true' : 'false'}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

function SelectTrigger({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const { disabled } = React.useContext(Ctx);
  return (
    <div role="combobox" aria-expanded={false} aria-controls="mock-listbox" aria-disabled={disabled} aria-label={rest['aria-label']}>
      {children}
    </div>
  );
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(Ctx);
  return <span>{value || placeholder}</span>;
}

function SelectContent({ children }: { children?: React.ReactNode }) {
  return <div role="listbox">{children}</div>;
}

function SelectItem({ value, children }: { value: string; children?: React.ReactNode }) {
  const { onValueChange } = React.useContext(Ctx);
  return (
    <button type="button" role="option" aria-selected={false} onClick={() => onValueChange?.(value)}>
      {children}
    </button>
  );
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <div role="group">{children}</div>;
}

function SelectLabel({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}

export const selectMock = { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel };
