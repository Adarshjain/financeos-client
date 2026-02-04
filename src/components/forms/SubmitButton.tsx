'use client';

import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { Button, type ButtonProps } from '@/components/ui/button';

interface SubmitButtonProps extends ButtonProps {
  children: React.ReactNode;
  /** When using imperative submit (onSubmit + server action), pass loading state here */
  pending?: boolean;
}

export function SubmitButton({ children, pending: pendingProp, ...props }: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingProp ?? formPending;

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? 'Loading...' : children}
    </Button>
  );
}
