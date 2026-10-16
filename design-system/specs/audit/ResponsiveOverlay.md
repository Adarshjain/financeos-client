# ResponsiveOverlay: audit spec

Read `00-global.md` first. Its rules override anything below.

**Layer:** DELETED (G5). Select uses Popover, Menu uses Radix DropdownMenu, DateField uses Popover. Delete the folder and README.

**Files:** `src/components/ds/ResponsiveOverlay/ResponsiveOverlay.stories.tsx`, `src/components/ds/ResponsiveOverlay/ResponsiveOverlay.tsx`

## Change (12)

- [ ] **f0c899240** · ResponsiveOverlay has an asDropdownMenu flag for Menu only
  - Now: `asDropdownMenu` swaps the desktop Popover for a Radix DropdownMenu (ResponsiveOverlay.tsx:60, 123-150). Only `Menu.tsx:343` uses it, and the branch repeats the popover surface classes (:143-147). The README props list omits `asDropdownMenu`, `forcePopover`, `forceSheet`, `modal`, `footer`. It is internal, so no app sees it.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **ffa7033b0** · ResponsiveOverlay: breakpoint is internal, force flags can clash
  - Now: The phone check comes from `useIsPhone()` and `isSheet = (isPhone || forceSheet) && !forcePopover` (ResponsiveOverlay.tsx:20, 93-94). If both force flags are true, popover wins silently.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **f4695fdb4** · ResponsiveOverlay copies popover classes, fixes sheet padding
  - Now: `max-h-dvh` and `dialogBodyClassName || 'p-0'` are baked into the sheet (ResponsiveOverlay.tsx:111-113). The dropdown branch copies Popover's surface classes (:143-147) and its own `min-w-menu-trigger max-w-dialog-sm`.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **fd87bad54** · ResponsiveOverlay cannot pass Dialog props to the sheet
  - Now: The sheet branch renders `DialogContent` with only `title`, `onClose` and `className` (ResponsiveOverlay.tsx:108-112). `size`, `description`, `srTitle`, `showClose` cannot be set.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **fb205597e** · ResponsiveOverlay is React.FC with no ref or root className
  - Now: `ResponsiveOverlay` is `React.FC` (ResponsiveOverlay.tsx:68). It renders no wrapper element of its own, so a ref or className has nothing to attach to. `title` is `ReactNode` and goes into `DialogPrimitive.Title`.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **f8c96803f** · ResponsiveOverlay stories lack most controls
  - Now: Only `open` and `title` have controls (ResponsiveOverlay.stories.tsx:15-26). `align`, `side`, `sideOffset`, `modal`, `forcePopover`, `forceSheet`, `asDropdownMenu`, `footer` have none, and `AllVariants` (:63-98) is a hard-coded render.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **fe92ed548** · ResponsiveOverlay story hard-codes trigger and content
  - Now: The meta `render` builds the trigger Button and the item rows inside the story (ResponsiveOverlay.stories.tsx:27-57), so `args.trigger` and `args.children` cannot be edited.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **f458807c8** · ResponsiveOverlay stories fake item rows with raw divs
  - Now: A `p-space-16 font-text` wrapper and item rows made from classes (`bg-brand-tint text-brand-strong … hover:bg-hover`) at ResponsiveOverlay.stories.tsx:30, 42-52, 66-95, plus an `h4` caption.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **fa858204e** · ResponsiveOverlay story sends onOpenChange only to updateArgs
  - Now: `onOpenChange={(val) => updateArgs({ open: val })}` (ResponsiveOverlay.stories.tsx:34) never reaches the Actions panel.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **f66937444** · ResponsiveOverlay stories use relative imports
  - Now: Imports `../Button/Button`, `../Icon/Icon`, `./ResponsiveOverlay` (ResponsiveOverlay.stories.tsx:5-7).
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **f548d11ac** · ResponsiveOverlay AllVariants shows desktop only
  - Now: `AllVariants` (ResponsiveOverlay.stories.tsx:63-98) only shows the popover and duplicates `DesktopPopover`. `PhoneSheet` (:108) relies on a viewport parameter. No story shows dropdown-menu mode or `footer`.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.
- [ ] **f6af52287** · ResponsiveOverlay stories have no play function
  - Now: No `play` in ResponsiveOverlay.stories.tsx.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. ResponsiveOverlay exists only to switch between popover and sheet, so it is deleted (component, README, stories, tests). Select, Menu and DateField use Popover or Radix DropdownMenu directly.

## README

Update `design-system/components/ResponsiveOverlay/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
