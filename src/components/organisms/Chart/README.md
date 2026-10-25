# Chart

A report chart over Recharts, drawn in Dinero tokens. Renders a report's chart data as line, bar, stacked bar, area, pie, donut or breakdown. Built from Text, DataTable, ProgressBar and Button; the tooltip, legend and data table are drawn here, with tokens only.

## Anatomy
- Cartesian (line, area, bar, stacked bar): a legend above when there is more than one series, a hairline horizontal grid in `line`, no axis lines, axis labels in `ink-3`, compact ₹1.2L ticks on an auto-sized value axis, a hover card with a Total row for stacks.
- Pie and donut: the pie (donut shows the total, or the hovered slice, in the centre) beside a list of name, value and share; the list stacks under the pie below 360px. Slices run largest-first from 12 o'clock.
- Breakdown (`chartType: 'breakdown'`): a ranked list, not a drawn chart. A DataTable with rank, the row's label over a ProgressBar, and the chosen value columns (Amount, Share, Txns, Avg, vs prev; fixed order). Each bar uses the row's own colour, `chart-1` … `chart-5` by rank and `chart-rest` for the Other row; bars are relative to the largest row or to the total. A row with sub-rows expands on a press and opens its underlying data from the link inside; the footer shows "Tap a row to expand it" and the total. The organism takes plain data and callbacks; it runs no queries.
- Colours: `chart-1` … `chart-5` by series. Past five series (or slices) the smallest fold into one "Other" in `chart-rest`.
- Frame: 16:9 on phone, 21:9 from `desk`, or the parent's height with `fill`. No data: "No data for this configuration."
- A visually hidden data table mirrors the data as the SVG's text equivalent.

## Props
- `data: ChartInput`: categories, series (aligned by index), `chartType` and `measure` (money formatting when the measure is a money field)
- `fill?: boolean`: fill the parent's height instead of the default frame
- `money?: boolean`: whether values are money; when given it wins over the measure-name inference, when omitted behaviour is unchanged
- `yDomain?: 'zero' | 'data'`: value axis includes 0 (default) or fits the data range
- Breakdown only: `columns?: BreakdownColumn[]` (default amount, share, and change when the data compares), `bars?: 'relative_to_largest' | 'share_of_total'`, `higherIsBetter?: boolean` (colours the change), `rowsLabel?: string` (label column heading, default "Category"), `onOpenRow?: (index) => void` (makes rows open underlying data), `canOpenRow?: (index) => boolean`

## Variants
One story per chart type (Bar, Line, Area, StackedBar, Pie, Donut) plus PriceChart (fill, data-fitted axis), and the breakdown: BreakdownRelativeBars, BreakdownShareBars, BreakdownWithSubRows, BreakdownWithOtherRow.

## Built from
Text, DataTable, ProgressBar, Button. Logic lives in `src/lib/charts/` (formatting, ticks, series folding, element size).
