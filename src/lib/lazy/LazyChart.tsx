'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { Skeleton } from '@/components/ds';
import type { ChartProps } from '@/components/organisms/Chart/Chart';

// Recharts is not in the page's JS: the Chart loads after hydration, with a skeleton of the chart's own frame
// (16:9, 21:9 from `desk`; or the parent's full height with `fill`) so nothing shifts when it arrives.
const loadChart = () => import('@/components/organisms/Chart/Chart').then((m) => m.Chart);
const FramedChart = dynamic(loadChart, { ssr: false, loading: () => <Skeleton className="aspect-video desk:aspect-wide w-full" /> });
const FilledChart = dynamic(loadChart, { ssr: false, loading: () => <Skeleton className="h-full min-h-0 w-full" /> });

/** The Chart organism, loaded on demand. Same props and behaviour as Chart. */
export function LazyChart(props: ChartProps) {
  return props.fill ? <FilledChart {...props} /> : <FramedChart {...props} />;
}
