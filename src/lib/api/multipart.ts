/**
 * `bodySerializer` for openapi-fetch multipart requests. The generated schema types a
 * multipart request body as a plain object (e.g. `{ files: Blob[] }`) — this turns that
 * object into the `FormData` the browser `fetch` actually needs to send, appending arrays
 * as repeated keys (the convention every multipart controller on the server expects) and
 * skipping absent optional fields rather than sending them as the string `"undefined"`.
 */
export function multipartBodySerializer(body: Record<string, unknown> | undefined): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body ?? {})) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        formData.append(key, item instanceof Blob ? item : String(item));
      }
    } else if (value instanceof Blob) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  }
  return formData;
}
