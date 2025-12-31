import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: Array<{ value: string; label: string }>
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, label, error, hint, id, options, ...props }, ref) => {
    const selectId = id || props.name
    
    return (
      <div className="space-y-1.5">
        {label && (
          <Label htmlFor={selectId}>{label}</Label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full px-3.5 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-lg transition-colors duration-200",
            "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
            "disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed",
            error && "border-red-300 dark:border-red-700 focus:ring-red-500",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              {option.label}
            </option>
          ))}
        </select>
        {hint && !error && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)
NativeSelect.displayName = "NativeSelect"

export { NativeSelect }
