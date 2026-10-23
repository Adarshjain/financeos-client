import crypto from 'node:crypto';

/**
 * A software WebAuthn platform authenticator for API tests (no browser): P-256 key, hand-built
 * authenticatorData, "none" attestation as hand-encoded CBOR. Produces the JSON a browser's
 * PublicKeyCredential.toJSON() does, so it can be posted to the app-lock endpoints as-is.
 */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_AT = 0x40;

const b64 = (b: Buffer) => b.toString('base64url');
const sha256 = (b: Buffer | string) => crypto.createHash('sha256').update(b).digest();

function header(major: number, len: number): Buffer {
  if (len < 24) return Buffer.from([major | len]);
  if (len < 256) return Buffer.from([major | 24, len]);
  return Buffer.from([major | 25, len >> 8, len & 0xff]);
}
const cborText = (s: string) => Buffer.concat([header(0x60, Buffer.byteLength(s)), Buffer.from(s)]);
const cborBytes = (b: Buffer) => Buffer.concat([header(0x40, b.length), b]);

export class SoftAuthenticator {
  private readonly keys = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  private readonly credentialId = crypto.randomBytes(32);
  private userHandle?: Buffer;
  private signCount = 0;

  constructor(
    private readonly rpId: string,
    private readonly origin: string,
  ) {}

  /** Answers `{publicKey: ...}` creation options with a new passkey. */
  create(options: Json, userVerified = true): Json {
    const pk = options.publicKey;
    this.userHandle = Buffer.from(pk.user.id, 'base64url');
    const clientData = this.clientData('webauthn.create', pk.challenge);
    const jwk = this.keys.publicKey.export({ format: 'jwk' });
    const cose = Buffer.concat([
      Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21]),
      cborBytes(Buffer.from(jwk.x as string, 'base64url')),
      Buffer.from([0x22]),
      cborBytes(Buffer.from(jwk.y as string, 'base64url')),
    ]);
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(this.signCount);
    const idLen = Buffer.alloc(2);
    idLen.writeUInt16BE(this.credentialId.length);
    const authData = Buffer.concat([
      sha256(this.rpId),
      Buffer.from([FLAG_UP | FLAG_AT | (userVerified ? FLAG_UV : 0)]),
      counter,
      Buffer.alloc(16),
      idLen,
      this.credentialId,
      cose,
    ]);
    const attestation = Buffer.concat([
      Buffer.from([0xa3]),
      cborText('fmt'),
      cborText('none'),
      cborText('attStmt'),
      Buffer.from([0xa0]),
      cborText('authData'),
      cborBytes(authData),
    ]);
    return this.credential({
      attestationObject: b64(attestation),
      clientDataJSON: b64(Buffer.from(clientData)),
      transports: ['internal'],
    });
  }

  /** Answers `{publicKey: ...}` request options with an assertion; `badSignature` signs with the wrong key. */
  get(options: Json, { userVerified = true, badSignature = false } = {}): Json {
    const pk = options.publicKey;
    const clientData = this.clientData('webauthn.get', pk.challenge);
    this.signCount += 1;
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(this.signCount);
    const authData = Buffer.concat([sha256(this.rpId), Buffer.from([FLAG_UP | (userVerified ? FLAG_UV : 0)]), counter]);
    const key = badSignature
      ? crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey
      : this.keys.privateKey;
    const signature = crypto.sign('sha256', Buffer.concat([authData, sha256(clientData)]), key);
    const response: Json = {
      authenticatorData: b64(authData),
      clientDataJSON: b64(Buffer.from(clientData)),
      signature: b64(signature),
    };
    if (this.userHandle) response.userHandle = b64(this.userHandle);
    return this.credential(response);
  }

  private credential(response: Json): Json {
    const id = b64(this.credentialId);
    return { id, rawId: id, type: 'public-key', response, clientExtensionResults: {} };
  }

  private clientData(type: string, challenge: string): string {
    return JSON.stringify({ type, challenge, origin: this.origin, crossOrigin: false });
  }
}
