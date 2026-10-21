import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface HighlightProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The text to show. */
  text: string;
  /** The search text; every match in `text` gets the marker stroke. */
  query?: string;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const NUMERIC = /^\d+(\.\d+)?$|^\d*\.\d+$|^\d+\.$/;

// A numeric query matches across grouping commas: "3600" finds "3,600".
const buildPattern = (query: string) =>
  NUMERIC.test(query)
    ? [...query].map(escapeRegex).join(',?')
    : escapeRegex(query);

/**
 * Highlight renders text with every search match wrapped in a mint marker stroke.
 * It is a server component without hooks. Marks are keyed by the query, so a new
 * query remounts them and replays the sweep once.
 */
export const Highlight = forwardRef<HTMLSpanElement, HighlightProps>(
  ({ text, query, className, ...props }, ref) => {
    const trimmed = query?.trim() ?? '';
    const parts: React.ReactNode[] = [];

    if (trimmed) {
      const matcher = new RegExp(buildPattern(trimmed), 'gi');
      let last = 0;
      for (const match of text.matchAll(matcher)) {
        const start = match.index ?? 0;
        if (match[0] === '') continue;
        if (start > last) parts.push(text.slice(last, start));
        parts.push(
          <mark
            key={`${trimmed}-${start}`}
            className="highlight-stroke animate-highlight-sweep motion-reduce:animate-none"
          >
            {match[0]}
          </mark>,
        );
        last = start + match[0].length;
      }
      if (last < text.length) parts.push(text.slice(last));
    }

    return (
      <span ref={ref} className={cn(className)} {...props}>
        {parts.length > 0 ? parts : text}
      </span>
    );
  },
);

Highlight.displayName = 'Highlight';
