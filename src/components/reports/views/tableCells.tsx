// Cell pieces shared by the raw table and its card form.

/**
 * A title cell's text with an optional muted companion beside it: a column folded into the
 * title column instead of standing in its own (net worth's kind beside the account name).
 */
export function TitleCell({ text, subtitle }: { text: string; subtitle: string | null }) {
  return (
    <>
      {text}
      {subtitle && (
        <>
          {' '}
          <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</span>
        </>
      )}
    </>
  );
}
