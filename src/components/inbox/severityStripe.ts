/** Severity stripe colour: critical rose, warning amber, info slate. */
export function severityStripeClass(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-500';
    case 'warning':
      return 'bg-amber-500';
    default:
      return 'bg-slate-300 dark:bg-slate-600';
  }
}
