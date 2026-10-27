'use client';

import { useEffect, useState } from 'react';

import { PixelGridLoader } from './PixelGridLoader';

interface ThinkingIndicatorProps {
  status?: string;
  startTime?: number;
  isStreaming?: boolean;
}

export function ThinkingIndicator({
  status,
  startTime,
  isStreaming,
}: ThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState('0.0s');

  useEffect(() => {
    if (!isStreaming || !startTime) return;

    const interval = setInterval(() => {
      const ms = Date.now() - startTime;
      setElapsed(`${(ms / 1000).toFixed(1)}s`);
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming, startTime]);

  return (
    <div className="flex items-center gap-2 text-2xs">
      <PixelGridLoader />
      <span
        className="bg-clip-text text-transparent text-xs font-medium"
        style={{
          backgroundImage:
            'linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)',
          backgroundSize: '200% 100%',
          animationName: 'bui-shimmer-text',
          animationDuration: '1.4s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      >
        {status || 'Thinking…'}
      </span>
      <span className="font-mono text-2xs text-[var(--ink-3)] tabular-nums">
        {elapsed}
      </span>
    </div>
  );
}
