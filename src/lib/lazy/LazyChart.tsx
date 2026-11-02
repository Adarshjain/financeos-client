'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import type { ChartProps } from '@/components/organisms/Chart/Chart';

// Recharts is not in the page's JS: the Chart loads after hydration, with a skeleton of the chart's own frame
// (16:9, 21:9 from `desk`; or the parent's full height with `fill`) so nothing shifts when it arrives.
const loadChart = () => import('@/components/organisms/Chart/Chart').then((m) => m.Chart);
// `h-auto`: Skeleton's own 12px height would otherwise win over the aspect ratio and draw a thin line.
const FramedChart = dynamic(loadChart, { ssr: false, loading: () => <Skeleton className="h-auto aspect-video desk:aspect-wide w-full" /> });
const FilledChart = dynamic(loadChart, { ssr: false, loading: () => <Skeleton className="h-full min-h-0 w-full" /> });

let chartLoad: Promise<unknown> | null = null;
let chartLoaded = false;

/** Starts fetching the Chart's code (once). Resolves when it is in; a failed fetch is retried by the next call. */
export function preloadChart(): Promise<unknown> {
  if (!chartLoad) {
    chartLoad = loadChart().then(
      () => {
        chartLoaded = true;
      },
      () => {
        chartLoad = null;
      },
    );
  }
  return chartLoad;
}

/**
 * Whether the Chart's code is in. With `wanted`, starts fetching it. A consumer that is about to draw a chart keeps its own
 * loading state until this is true, so the user sees that one loading state and then the chart, not a second chart-frame skeleton.
 */
export function useChartReady(wanted: boolean): boolean {
  const [ready, setReady] = React.useState(chartLoaded);
  React.useEffect(() => {
    if (!wanted || chartLoaded) {
      setReady(chartLoaded);
      return;
    }
    let live = true;
    void preloadChart().then(() => {
      if (live) setReady(chartLoaded);
    });
    return () => {
      live = false;
    };
  }, [wanted]);
  return ready || chartLoaded;
}

/** The Chart organism, loaded on demand. Same props and behaviour as Chart. */
export function LazyChart(props: ChartProps) {
  return props.fill ? <FilledChart {...props} /> : <FramedChart {...props} />;
}
