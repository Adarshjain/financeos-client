# ServerFixture: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/__fixtures__/ServerFixture.tsx`

## Change (1)

- [x] **fba43ba36** · ServerFixture is a test file placed in the library tree
  - Now: `__fixtures__/ServerFixture.tsx` renders `SectionHeader label="Server Test"`, `Badge`, `Banner`. It is not exported, and no file in the repo imports it.
  - Do: Move it to a test folder (for example `src/test/fixtures/`) or delete it if no test uses it. Pass its words as props if it is kept.

## README

No README.
