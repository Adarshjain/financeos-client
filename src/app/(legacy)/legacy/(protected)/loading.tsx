/**
 * Loading fallback for every authenticated route.
 *
 * Placed at the group level so all protected pages get instant navigation
 * feedback from one file. Without this, Next has no boundary to stream against
 * and each navigation blocks on the page's full server-side data fetch before
 * anything paints.
 *
 * Rendered inside the protected layout, so the sidebar and mobile nav stay
 * visible and interactive while the page loads.
 */
export default function ProtectedLoading() {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-muted/50"
          />
        ))}
      </div>
    </div>
  );
}
