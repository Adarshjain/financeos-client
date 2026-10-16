# DropZone: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/DropZone/DropZone.stories.tsx`, `src/components/ds/DropZone/DropZone.tsx`

## Change (10)

- [ ] **ff6fad217** · accept defaults to the statement file types
  - Now: `accept = '.pdf,.xlsx,.xls'` (DropZone.tsx:70) is FinanceOS's statement import list.
  - Do: Default `accept` to `undefined` (any file). The app passes the list.
  ```tsx
  <DropZone accept=".pdf,.xlsx,.xls" />
  ```
- [ ] **f7b3a02b6** · An import-history list lives inside the upload control
  - Now: `RecentImport` and the "recent imports" Card (DropZone.tsx:18-23, 56-58, 231-264) are import history. The README says it is built from Button, ListRow, Icon and StatusWords (README line 16), but the code uses `Card`, plain spans and an unused `Banner` import.
  - Do: Remove the recent-imports props. Add `children?: ReactNode` rendered under the list, and let the app compose a `Card` of `ListRow`s with `StatusWords`. If a queued-file list stays, build it from `ListRow` too.
  ```tsx
  <DropZone ...><Card>{imports.map((i) => <ListRow key={i.id} title={i.name} trailing={<StatusWords tone={i.tone}>{i.status}</StatusWords>} />)}</Card></DropZone>
  ```
- [ ] **fa903e860** · recentImports props carry a FinanceOS name
  - Now: `recentImports`, `recentImportsTitle` and `RecentImport` (DropZone.tsx:18, 56-58) are named for the import feature.
  - Do: Covered by the `children` fix above. If a list prop stays, rename it to `items` with a generic `DropZoneItem` (`id`, `name`, `status`, `tone`).
- [ ] **f1c4e0469** · The file input is always multiple
  - Now: The hidden input has `multiple` fixed on (DropZone.tsx:126). Single-file upload is impossible.
  - Do: Add `multiple?: boolean`, default `true`. Pass it to the input.
  ```tsx
  <DropZone multiple={false} />
  ```
- [ ] **f05f8b31c** · Drag state: leave handler can flicker
  - Now: `isDragging ?? isDragOver` (DropZone.tsx:86) is a normal controlled/uncontrolled pattern and needs no `defaultDragging`. But `handleDragLeave` (:95-99) clears the state without checking `relatedTarget`, so moving over a child element can fire a leave first.
  - Do: Ignore the leave when `e.currentTarget.contains(e.relatedTarget as Node)`. Keep the `isDragging` override.
  ```tsx
  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
  ```
- [ ] **f91a8fa8f** · Drop only works on the box, not on the whole zone
  - Now: Drag and click handlers are on the inner box (DropZone.tsx:136-140), shown only when `showDropArea` is true. With `showDropArea={false}` (the `Queued` and `TooLarge` stories) nothing accepts a drop. The README says dropping anywhere works in every state, including while files are queued.
  - Do: Move `onDragOver`, `onDragLeave`, `onDrop` to the root div. `showDropArea` then only hides the box. Keep click-to-open on the box.
- [ ] **f0ad37073** · No argTypes for list props or accept
  - Now: `argTypes` (DropZone.stories.tsx:19-28) lists title, hint, button, drag, error, showDropArea. Missing: `queuedFiles`, `recentImports`, `recentImportsTitle`, `accept`.
  - Do: Add `queuedFiles: { control: 'object' }`, `accept: { control: 'text' }`, `multiple: { control: 'boolean' }`, and `children` if added.
- [ ] **fe0da54eb** · AllVariants uses hand-built grid and headings
  - Now: A `grid grid-cols-2 gap-space-12 max-w-xl items-start` wrapper and four `<div className="text-caption font-semibold text-ink-3 mb-space-4">` headings (DropZone.stories.tsx:37-84).
  - Do: Remove with `AllVariants`. For width, use a decorator `(Story) => <div className="max-w-md"><Story /></div>`.
- [ ] **f0c40908e** · Callbacks are empty or missing
  - Now: `onRemoveFile={() => {}}` (DropZone.stories.tsx:63, 82). `onFilesSelected` and `onRemoveFile` are not set on the `Queued` and `TooLarge` args stories at all, so Remove buttons do not show.
  - Do: Add `onFilesSelected: fn()` and `onRemoveFile: fn()` to meta `args`.
  ```tsx
  args: { ...defaultProps, onFilesSelected: fn(), onRemoveFile: fn() }
  ```
- [ ] **fc9353cec** · WithDropError story uses app copy
  - Now: `WithDropError` uses "File format not supported. Please upload a PDF or Excel sheet." (DropZone.stories.tsx:133). It is FinanceOS-specific. The README variants line names a "file that cannot be sent" (queued with error), not a zone-level error.
  - Do: Use neutral text such as "This file type is not supported." and add the zone-level error to the README variants list.

## Owner's own call (2)

- [ ] **fd2603f91** · AllVariants hard-codes four cases
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f272dd0bc** · No play function for the drop zone
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (7)

- **f45c4efac** · dragTitle defaults to "Drop to add": Generic control wording that any app would use; fine as a default.
- **f6c51eb4e** · Remove-button label is fixed English: Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **f8d275f0e** · Drop box padding, shape and cursor are fixed: Leave as is (owner approved Keep).
- **faa2b2dfd** · File rows are always inside a fixed Card: Leave as is (owner approved Keep).
- **f05fc1b15** · Mixed ReactNode and string field types: No page needs this flexibility yet; add it when one does.
- **f8d074aae** · Only onFilesSelected is exposed: No page needs this flexibility yet; add it when one does.
- **f2e2ce5b6** · defaultProps applied twice; FinanceOS sample names: Leave as is (owner approved Keep).

## README

Update `design-system/components/DropZone/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
