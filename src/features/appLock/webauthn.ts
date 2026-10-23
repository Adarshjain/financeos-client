/* eslint-disable no-undef -- WebAuthn DOM type names (the rule does not know lib.dom types) */
/**
 * WebAuthn glue with no dependency: prefers the browser's own JSON helpers
 * (parseCreationOptionsFromJSON, parseRequestOptionsFromJSON, toJSON) and falls back to base64url by hand.
 */

type Json = Record<string, unknown>;

export function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function bufferToBase64Url(buffer: ArrayBuffer | ArrayBufferView): string {
  const bytes =
    buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface JsonHelpers {
  parseCreationOptionsFromJSON?: (json: Json) => PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON?: (json: Json) => PublicKeyCredentialRequestOptions;
}

function helpers(): JsonHelpers {
  return (typeof PublicKeyCredential === 'undefined' ? {} : PublicKeyCredential) as unknown as JsonHelpers;
}

/** The server sends `{ publicKey: {...} }`; accept the bare options too. */
function unwrap(json: Json): Json {
  return (json.publicKey as Json | undefined) ?? json;
}

function descriptors(list: unknown): PublicKeyCredentialDescriptor[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return list.map((d: Json) => ({ ...d, id: base64UrlToBuffer(d.id as string) }) as unknown as PublicKeyCredentialDescriptor);
}

export function toCreationOptions(json: Json): PublicKeyCredentialCreationOptions {
  const o = unwrap(json);
  const native = helpers().parseCreationOptionsFromJSON;
  if (native) return native.call(PublicKeyCredential, o);
  const user = o.user as Json;
  return {
    ...o,
    challenge: base64UrlToBuffer(o.challenge as string),
    user: { ...user, id: base64UrlToBuffer(user.id as string) },
    excludeCredentials: descriptors(o.excludeCredentials),
  } as unknown as PublicKeyCredentialCreationOptions;
}

export function toRequestOptions(json: Json): PublicKeyCredentialRequestOptions {
  const o = unwrap(json);
  const native = helpers().parseRequestOptionsFromJSON;
  if (native) return native.call(PublicKeyCredential, o);
  return {
    ...o,
    challenge: base64UrlToBuffer(o.challenge as string),
    allowCredentials: descriptors(o.allowCredentials),
  } as unknown as PublicKeyCredentialRequestOptions;
}

/** The credential as the JSON the server's WebAuthn library reads (what `toJSON()` returns). */
export function credentialToJSON(credential: PublicKeyCredential): Json {
  const native = (credential as unknown as { toJSON?: () => Json }).toJSON;
  if (typeof native === 'function') return native.call(credential);
  const response = credential.response as AuthenticatorAttestationResponse & AuthenticatorAssertionResponse;
  const out: Json = {
    clientDataJSON: bufferToBase64Url(response.clientDataJSON),
  };
  if ('attestationObject' in response && response.attestationObject) {
    out.attestationObject = bufferToBase64Url(response.attestationObject);
    out.transports = response.getTransports?.() ?? [];
  } else {
    out.authenticatorData = bufferToBase64Url(response.authenticatorData);
    out.signature = bufferToBase64Url(response.signature);
    if (response.userHandle) out.userHandle = bufferToBase64Url(response.userHandle);
  }
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: out,
  };
}

/** True when this device has a built-in authenticator (Face ID, Touch ID, Windows Hello, fingerprint). */
export async function isPlatformAuthAvailable(): Promise<boolean> {
  try {
    if (typeof PublicKeyCredential === 'undefined' || !window.isSecureContext) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** A passkey only works on the relying-party host (or a subdomain of it). */
export function hostMatchesRp(rpId: string, hostname: string = window.location.hostname): boolean {
  return hostname === rpId || hostname.endsWith(`.${rpId}`);
}

/** True when the user dismissed or the browser refused the prompt (not a server rejection). */
export function isCancelled(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'AbortError');
}
