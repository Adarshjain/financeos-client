# useMediaQuery: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** DELETED (G5): delete `src/components/ds/useMediaQuery.ts`.

**Files:** `src/components/ds/useMediaQuery.ts`

## Change (2)

- [x] **fc088df99** · useMediaQuery/useIsPhone are internal with a fixed breakpoint
  - Now: `useIsPhone` uses `(max-width: 1023.98px)` (line 35), the `lg` breakpoint. It is not exported from `index.ts`, and only ResponsiveOverlay uses it.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. With ResponsiveOverlay gone nothing detects the viewport in JavaScript, so useMediaQuery and useIsPhone are deleted and RULES §5c.3 loses its only exception.
- [x] **f06c840ef** · useMediaQuery assumes desktop on the server
  - Now: `serverValue = false` (line 14) means the server render is always the desktop form, so a phone may show it for a moment after load.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. With ResponsiveOverlay gone nothing detects the viewport in JavaScript, so useMediaQuery and useIsPhone are deleted and RULES §5c.3 loses its only exception.

## README

No README.
