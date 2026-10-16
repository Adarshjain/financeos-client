# Text

Every piece of plain text on a page: titles, subtitles, body copy, helper lines, footers. Pages never put type or colour classes on their own elements; they render Text.

## Props
- `variant`: one of the type styles: `hero-figure`, `page-title`, `screen-title`, `figure`, `title`, `heading`, `body`, `body-strong`, `label`, `caption`, `overline`, `tab-label`. It sets size, line height, weight and letter-spacing together. Default `body`.
- `tone`: `ink` (default), `ink-2`, `ink-3`, `ink-4`, `positive`, `danger`, `warning`, `info`.
- `as`: the element (`h1`…`h6`, `p`, `span`, `div`, `label`). Choose it for meaning; it never changes the look. Default `span`.
- `family`: optional, `text` or `display`. When omitted, inherits from parent. `display` is allowed only where RULES §4.5 allows the display face: the hero figure, desktop page titles, and empty, offline and auth headlines.
- `align`: optional, `start`, `center`, `end`. When omitted, inherits from parent.
- `truncate`: one line with an ellipsis.
- Numbers are always tabular (inherited from the type styles).

## Rules
- Inline emphasis inside a Text uses `<strong>` (weight from the style's strong step); inline links use Button `link`.
- A Text never takes colour, size or weight through `className`; `className` is for layout only.

## Built from
Nothing else; the type styles and ink tokens.

## Variants
- Every type style, each tone, the display family on page-title, centred, truncated.