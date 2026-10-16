# Select: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Select/Select.stories.tsx`, `src/components/ds/Select/Select.tsx`

## Change (20)

- [ ] **fb0e3148d** · Select's default empty message is app copy
  - Now: When a search finds nothing and no `emptyText` is passed, Select writes `No options match "<query>".` itself (Select.tsx:354). The `emptyText` prop already exists, so the problem is only the fallback sentence.
  - Do: Keep `emptyText`, but make the fallback the generic "No results" with no query echo. The app passes any richer sentence.
  ```tsx
  <Select searchable emptyText={(q) => `No bank matches "${q}"`} />
  ```
- [ ] **fd5848e72** · Select's create row defaults to '+ Add "query"'
  - Now: If `onCreate` is set but `createLabel` is not, Select renders `+ Add "<query>"` (Select.tsx:385-387). 'Add' is app wording.
  - Do: When `createLabel` is missing, render a plus `<Icon name="plus">` followed by the typed query only. The app passes `createLabel` for any verb.
  ```tsx
  <Select onCreate={add} createLabel={(q) => `Add bank "${q}"`} />
  ```
- [ ] **ff2251cbe** · Select defaults placeholder, Done and title copy
  - Now: `placeholder = 'Select an option…'` (Select.tsx:485), `Done · {n}` (:430) and the sheet title fallback `label || placeholder || 'Select'` (:717) are all written in the component.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. Select opens as a Popover at every size, so the sheet title fallback ('Select') goes. The placeholder and Done copy still become props as decided.
- [ ] **facce898f** · Select's multi-select Clear and Done are not overridable
  - Now: In multi mode the footer always shows `Clear` and `Done · n` buttons (Select.tsx:421-436). There are no label props and no slot to change them.
  - Do: Add `clearLabel` (default 'Clear', a generic control word) and `doneLabel?: (count: number) => ReactNode` (default 'Done'). Pass both through `SelectMenu`.
  ```tsx
  <Select multiple clearLabel="Reset" doneLabel={(n) => `Apply ${n}`} />
  ```
- [ ] **fc1728145** · Select builds its chips from CategoryChip
  - Now: Select imports `CategoryChip` (Select.tsx:11) to draw the selected values and the '+n' overflow (:618-623). CategoryChip is a FinanceOS name for what is just a tag.
  - Do: Select's chosen values and "+n" use `<Badge variant="outline" shape="rounded">`. Counts use `<Badge variant="solid" shape="rounded" size="sm" tone=…>{formatCount(n)}</Badge>`. _(per G2)_
- [ ] **f323e6a57** · Select's actionRow uses two props for one action
  - Now: `actionRow` plus `onActionClick` (Select.tsx:468) renders a pinned row under the options. The API is generic, a 'create new' row is common in select libraries. The only awkward part is that one action needs two props, and the row is a `div role=button` not a Button.
  - Do: One action shape everywhere (your choice on the Select action row): `action={{ label, onSelect }}`. Replaces `actionRow` + `onActionClick`: `<Select action={{ label: 'New shared limit…', onSelect: openSheet }} />`. The FinanceOS text stays in the app.
- [ ] **f7228d592** · Select always filters options itself
  - Now: `SelectMenu` lowercases the query and filters label, description and hint (Select.tsx:138-153). This cannot be turned off, so a server-side search that returns already-filtered rows gets filtered twice. Grouping at :115-135 is fine as it is.
  - Do: Add `filter?: 'auto' | 'none' | ((option, query) => boolean)` with default `'auto'`. With `'none'` the app owns the list and uses `onSearchChange`.
  ```tsx
  <Select searchable filter="none" onSearchChange={setQ} options={serverRows} />
  ```
- [ ] **f1becd2e4** · Select overrides SearchField's focus ring from outside
  - Now: Select passes `containerClassName="focus-within:ring-0 focus-within:ring-offset-0 focus-within:border-brand"` to SearchField (Select.tsx:332). It is a parent restyling a child.
  - Do: Give SearchField a `variant="embedded"` (no ring, border turns brand on focus) and use it from Select. Existing standalone look stays as `variant="default"`.
  ```tsx
  <SearchField variant="embedded" />
  ```
- [ ] **f6628318d** · Select ignores native and form props
  - Now: `Select` destructures a fixed list and never spreads rest props (Select.tsx:478-516, trigger at ~:675). `name`, `onBlur`, `required` and `data-*` are lost. `ref` points to the trigger button.
  - Do: Extend `SelectProps` with `Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'|'defaultValue'|'onChange'|'placeholder'>` and spread the rest onto the trigger button. Add `name` that renders a hidden input so form posts work.
  ```tsx
  <Select name="bank" onBlur={validate} data-testid="bank" />
  ```
- [ ] **f199c45be** · Select: hint is searched as text but may be a node
  - Now: `hint` and `description` are `ReactNode`, and the filter does `String(opt.hint)` (Select.tsx:148-149), so a JSX hint becomes "[object Object]" for search. `label` is a plain `string`, which is fine (it is searched). `disabledReason` is a string only.
  - Do: Add `searchText?: string` to `SelectOption` and match the query against `label` plus `searchText`; stop stringifying nodes. Allow `disabledReason` to be a `ReactNode`.
  ```tsx
  { value: 'a', label: 'HDFC', hint: <Tag/>, searchText: 'savings 4521' }
  ```
- [ ] **f9760139b** · SelectMenu has no defaultValue / onValueChange pair
  - Now: `SelectMenu` highlights `value` only when it is a string (Select.tsx:174-185). It is a controlled list that calls `onSelect`, and has no own state for the value.
  - Do: Keep `SelectMenu` controlled (it is the inner list). If it is exported for reuse, add `selected` / `onSelectedChange` per RULES §5c, and highlight the first selected value when `value` is an array.
- [ ] **fc755cd76** · Select stories wire value to useArgs and miss controls
  - Now: The meta `render` forces `value={value ?? args.defaultValue}` and sends `onValueChange` to `updateArgs` (Select.stories.tsx:143-152). `argTypes` (:129) covers text and boolean props only; `options`, `groups`, `loadingText`, `maxDisplayChips`, `showRadio`, `icon`, `trigger`, `emptyText` have none.
  - Do: Set `argTypes` for `maxDisplayChips` (number), `showRadio`/`loading` (boolean), `loadingText` (text). Hide JSX/array props with `table: { disable: true }`. Add `onValueChange: fn()` in meta `args` and keep `useArgs` only to keep the controlled value in sync.
  ```tsx
  args: { onValueChange: fn() },
  argTypes: { maxDisplayChips: { control: 'number' } }
  ```
- [ ] **f74724f10** · Select's CustomTrigger story hard-codes its props
  - Now: `CustomTrigger` sets `options`, `defaultValue` and `trigger` inside `render` (Select.stories.tsx:477-496).
  - Do: Move `options`, `defaultValue` and `trigger` into `args`, and use meta `render` (spread of `args`). A JSX `trigger` in `args` is fine; add `argTypes.trigger: { control: false }`.
  ```tsx
  args: { options, defaultValue: 'a', trigger: <FilterChip label="Bank" /> }
  ```
- [ ] **fe9bac7bf** · Select stories hand-build frames and captions
  - Now: Stories use raw `div`s (`space-y-space-24 max-w-4xl`, a bordered `bg-canvas` grid) and caption `span`s repeated about 20 times (Select.stories.tsx:161-164, 276-282, 501-504).
  - Do: Remove the wrappers. Use `parameters: { layout: 'padded' }` plus a decorator with `bg-canvas` if a frame is needed. Put the explanation in `parameters.docs.description.story`, and use story names instead of captions.
  ```tsx
  decorators: [(S) => <div className="max-w-sm"><S /></div>]
  ```
- [ ] **fd9e407bf** · Select stories embed a base64 bank logo four times
  - Now: The same inline SVG data URI is passed to `Avatar` at lines 24, 191, 398 and 527 of Select.stories.tsx.
  - Do: Define it once in a shared story fixture (the repo has `ds/__fixtures__`) and import it. Better, use `Avatar` with initials and no image.
  ```tsx
  <Avatar variant="logo" size="sm">HD</Avatar>
  ```
- [ ] **ff94137d3** · Select stories carry FinanceOS sample data
  - Now: About 115 lines of module-level data (banks, statuses, 'Rahul Sharma … owes ₹15,000', '₹5,00,000 · 2 cards') sit at the top of Select.stories.tsx:9-124.
  - Do: Use neutral placeholder data (Option A, Option B, 'Item 1'), kept in `__fixtures__` and imported once, so the stories show the component and not the finance app.
- [ ] **f355dbb45** · Select stories use empty callbacks, not fn()
  - Now: `onCreate={() => {}}` / `onCreate: () => {}` (Select.stories.tsx:314, 342, 447). `onSelect`, `onClear`, `onDone`, `onActionClick` are not wired in SelectMenu stories; `onValueChange` goes only to `updateArgs`.
  - Do: Import `fn` from `storybook/test` and set `onCreate: fn()`, `onSelect: fn()`, `onClear: fn()`, `onDone: fn()`, `onValueChange: fn()` in meta `args` so they show in the Actions panel.
  ```tsx
  import { fn } from 'storybook/test';
  args: { onCreate: fn(), onDone: fn() }
  ```
- [ ] **f94295afc** · Select stories use relative imports and render SelectMenu
  - Now: Imports are `../Avatar/Avatar`, `../FilterChip/FilterChip`, `./Select` (Select.stories.tsx:5-7). It also puts the inner `SelectMenu` directly on the canvas.
  - Do: Import `{ Select, Avatar, FilterChip }` from `@/components/ds`. Show the open menu through `Select` with `defaultOpen: true`, not `SelectMenu` directly.
  ```tsx
  import { Select, Avatar } from '@/components/ds';
  ```
- [ ] **f71ce40cd** · Select stories restyle Avatar with className
  - Now: `<Avatar variant="logo" className="bg-danger text-on-brand">` (Select.stories.tsx:34, also :43) overrides colours with a visual class.
  - Do: Use an Avatar `tone` prop if one exists (or add `tone`), otherwise use the default avatar. No colour classes in stories.
  ```tsx
  <Avatar variant="logo" tone="danger">ST</Avatar>
  ```
- [ ] **f076366d4** · Select's open-menu stories are static and NoResults starts closed
  - Now: The `SelectMenu` examples in AllVariants are always-open static panels (Select.stories.tsx:279-371). The `NoResults` story (:451) uses `searchable` and `searchValue` but starts closed, so the canvas shows nothing.
  - Do: Give `NoResults` and similar stories `args: { searchable: true, defaultOpen: true, searchValue: 'zzz' }` so the open menu is visible. Add no `play` function (G9). Stop showing `SelectMenu` as the sample. _(per G9)_

## Owner's own call (4)

- [ ] **f80fa3a78** · Select's AllVariants is a hard-coded kitchen sink
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **ff6cf696d** · Select's ClosedFieldStates duplicates AllVariants
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fe32a7aaa** · Select stories duplicate states inside two kitchen sinks
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fb5f93aa6** · Select stories have no play functions
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (1)

- **fa2b32e35** · Select's list height is fixed at max-h-72: Leave as is (owner approved Keep).

## README

Update `design-system/components/Select/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
