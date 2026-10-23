# JobsHistory

A list of background jobs, used by Settings › Activity (full) and Import › Recent imports (compact). Put it in a Card; the page passes the jobs, so paging, filters and polling stay with the page.

## Anatomy
- Full: Job (type and subject), Started, Took, Result (progress while active), Status badge, View. On phone each row stacks: job, a line of when and what it did, status.
- Compact: no header row (a single column needs none). The job's file name over one status line (a coloured word, when it started, what it did) and View. A running job shows its note and a ProgressBar in place of the line.

## Props
- `jobs`, `openHref(job)` (where View goes), `onOpen?(job)` (row press), `pager?`, `empty?`, `loading?`, `skeletonRows?`, `compact?`.

## Built from
DataTable, Badge, Button, Text, ProgressBar (through the active-job body).

## Variants
- Full, compact; running, done, warning, failed rows; empty; loading.
