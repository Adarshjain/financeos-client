'use client';

import { FileText } from 'lucide-react';

import { FormFieldTextArea } from '@/components/ui/form-field-textarea';
import { Label } from '@/components/ui/label';

interface DescriptionSectionProps {
  description?: string;
  sourcedDescription?: string;
  suggestingCategories: boolean;
  onDescriptionBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

export function DescriptionSection({
  description,
  sourcedDescription,
  suggestingCategories,
  onDescriptionBlur,
}: DescriptionSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col gap-2">
      <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        Description
      </Label>
      <div className="space-y-2">
        <FormFieldTextArea
          placeholder="Add description or notes..."
          name="description"
          defaultValue={description}
          onBlur={onDescriptionBlur}
          autoResize
          hint={suggestingCategories ? 'Suggesting categories…' : undefined}
        />
        {sourcedDescription && (
          <>
            <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Original Description
            </Label>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {sourcedDescription}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
