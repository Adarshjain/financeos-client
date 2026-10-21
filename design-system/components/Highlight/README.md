# Highlight

Text with every search match wrapped in a mint marker stroke. It covers the lower two thirds of the letters, has rough ends and a slight tilt, and sweeps in once per new search (owner, 2026-10-21).

## Props
- `text`: the string to show.
- `query`: optional search text. Trimmed, case-insensitive, matches every occurrence, regex characters are literal. Empty or whitespace shows plain text with no mark.
- A numeric query (digits with at most one `.`) matches ignoring `,` grouping separators: `3600` marks `3,600` in `3,600.00`. The mark includes the commas inside the match.
- Native span props are spread; `className` is for layout only.

## Variants
- None. One look; colours come from the `highlight` and `highlight-soft` tokens, so light and dark follow the theme.

## Motion
- The sweep (`dur-emphasis`, 600ms) plays when a mark mounts. Marks are keyed by the query, so a new query replays it and a re-render with the same query does not. No animation under reduced motion.

## Built from
Nothing else; the `highlight-stroke` utility, the `highlight-sweep` animation and the highlight colour tokens.

## Do / Don't
- Do pass only string values; for ReactNode content, leave it unhighlighted.
- Don't use it for selection, focus or status; it means "this matched your search".
- Don't recolour or restyle the mark.
