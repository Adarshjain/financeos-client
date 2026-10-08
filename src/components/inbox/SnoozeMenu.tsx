'use client';

import { Clock } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';

import { appTodayPlus, SNOOZE_PRESETS } from './inbox.helpers';

interface SnoozeMenuProps {
  title: string;
  onSnooze: (until: string) => void;
}

/** Snooze presets (tomorrow, 3 days, a week) plus a custom date; the date must be after today. */
export function SnoozeMenu({ title, onSnooze }: SnoozeMenuProps) {
  const [pickOpen, setPickOpen] = React.useState(false);

  return (
    <>
      {/* Non-modal so opening the date dialog from an item does not leave the page inert. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={`Snooze ${title}`} title="Snooze">
            <Clock className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          {SNOOZE_PRESETS.map((preset) => (
            <DropdownMenuItem key={preset.label} onSelect={() => onSnooze(appTodayPlus(preset.days))}>
              {preset.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPickOpen(true)}>Pick a date…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SnoozeDateDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        title={title}
        onSubmit={(until) => {
          setPickOpen(false);
          onSnooze(until);
        }}
      />
    </>
  );
}

interface SnoozeDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: (until: string) => void;
}

function SnoozeDateDialog({ open, onOpenChange, title, onSubmit }: SnoozeDateDialogProps) {
  const tomorrow = appTodayPlus(1);
  const [until, setUntil] = React.useState(tomorrow);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setUntil(appTodayPlus(1));
    setError(null);
  }, [open]);

  const submit = () => {
    if (!until) {
      setError('Pick a date');
      return;
    }
    if (until < tomorrow) {
      setError('Pick a date after today');
      return;
    }
    onSubmit(until);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Snooze until</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2 py-2">
          <Label htmlFor="inbox-snooze-until">Remind me on</Label>
          <DateInput
            id="inbox-snooze-until"
            value={until}
            min={tomorrow}
            onChange={(e) => setUntil(e.target.value)}
          />
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </DialogBody>
        <DialogFooter
          secondaryAction={{ label: 'Cancel', onClick: () => onOpenChange(false) }}
          primaryAction={{ label: 'Snooze', onClick: submit }}
        />
      </DialogContent>
    </Dialog>
  );
}
