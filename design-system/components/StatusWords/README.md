# StatusWords

Inline coloured words on a context line that convey status without tags.

## Use
A word, a middle dot (`·`) between words, never a pill. Colour is never the only signal: the word itself says it. The app passes words, semantic tones, and optional icons.

## Props

### StatusWord
- `tone?: 'neutral' | 'info' | 'warning' | 'success'`: semantic colour (default `'neutral'`).
- `icon?: IconName`: optional icon glyph rendered before the text.

### StatusWords
- `items?: StatusWordItem[]`: array of `{ tone, label, icon }` items.
- `prefix?: React.ReactNode`: leading label (e.g. account name) before the first separator.
- `separator?: React.ReactNode`: separator element between words (default `' · '`).

## Variants
- Tones: `neutral` (grey), `info` (blue), `warning` (amber), `success` (green).

## Built from
- `Icon`
