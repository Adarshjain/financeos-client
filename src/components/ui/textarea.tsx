import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize, onChange, value, defaultValue, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null)

    React.useImperativeHandle(ref, () => innerRef.current!)

    const adjustHeight = () => {
      const textarea = innerRef.current
      if (textarea && autoResize) {
        textarea.style.height = "auto"
        // Account for border size under border-box sizing to prevent content shifts or flickering.
        const borderHeight = textarea.offsetHeight - textarea.clientHeight
        textarea.style.height = `${textarea.scrollHeight + borderHeight}px`
      }
    }

    React.useEffect(() => {
      if (autoResize) {
        adjustHeight()
      }
    }, [value, defaultValue, autoResize])

    React.useEffect(() => {
      if (!autoResize) return
      window.addEventListener("resize", adjustHeight)
      return () => {
        window.removeEventListener("resize", adjustHeight)
      }
    }, [autoResize])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        adjustHeight()
      }
      if (onChange) {
        onChange(e)
      }
    }

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          autoResize && "resize-none overflow-hidden",
          className
        )}
        ref={innerRef}
        onChange={handleChange}
        value={value}
        defaultValue={defaultValue}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }

