/**
 * A stand-in for a dialog that has its own tests: it shows the props the page gave it as JSON (functions
 * left out) in a `data-testid` element and closes on its button. Use it as
 * `vi.mock('./X', async () => (await import('@/test/fakeDialog')).fakeDialog('x', 'XDialog'))`; the factory
 * must import it lazily because `vi.mock` runs before the file's own imports.
 */
export function fakeDialog(testId: string, exportName: string) {
  return {
    [exportName]: function FakeDialog(props: { onClose?: () => void } & Record<string, unknown>) {
      return (
        <div>
          <span data-testid={testId}>{JSON.stringify(props)}</span>
          <button onClick={props.onClose}>close dialog</button>
        </div>
      );
    },
  };
}
