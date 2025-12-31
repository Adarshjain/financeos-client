import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
        success:
          "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
        warning:
          "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        danger:
          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
        info:
          "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        secondary:
          "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
        destructive:
          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
        outline:
          "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
