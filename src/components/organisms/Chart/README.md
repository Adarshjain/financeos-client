# Chart

A report chart over Recharts, drawn in Dinero tokens. Renders a report's chart data as line, bar, stacked bar, area, pie or donut. Built from Text; the tooltip, legend and data table are drawn here, with tokens only.

## Anatomy
- Cartesian (line, area, bar, stacked bar): a legend above when there is more than one series, a hairline horizontal grid in `line`, no axis lines, axis labels in `ink-3`, compact ₹1.2L ticks on an auto-sized value axis, a hover card with a Total row for stacks.
- Pie and donut: the pie (donut shows the total, or the hovered slice, in the centre) beside a list of name, value and share; the list stacks under the pie below 360px. Slices run largest-first from 12 o'clock.
- Colours: `chart-1` … `chart-5` by series. Past five series (or slices) the smallest fold into one "Other" in `chart-rest`.
- Frame: 16:9 on phone, 21:9 from `desk`, or the parent's height with `fill`. No data: "No data for this configuration."
- A visually hidden data table mirrors the data as the SVG's text equivalent.

## Props
- `data: ChartInput`: categories, series (aligned by index), `chartType` and `measure` (money formatting when the measure is a money field)
- `fill?: boolean`: fill the parent's height instead of the default frame
- `money?: boolean`: whether values are money; when given it wins over the measure-name inference, when omitted behaviour is unchanged
- `yDomain?: 'zero' | 'data'`: value axis includes 0 (default) or fits the data range

## Variants
One story per chart type (Bar, Line, Area, StackedBar, Pie, Donut) plus PriceChart (fill, data-fitted axis).

## Built from
Text. Logic lives in `src/lib/charts/` (formatting, ticks, series folding, element size).
