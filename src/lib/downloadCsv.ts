/** Saves a blob as a download under `filename`. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: some browsers still read the URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Saves CSV text as a file in the browser. */
export function downloadCsv(csv: string, filename: string): void {
  saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}
