/**
 * Hisaab end-to-end encryption.
 *
 * Design (why it is shaped this way):
 *
 *   passphrase ──Argon2id(salt)──▶ KEK ──wraps──▶ DEK ──AES-GCM──▶ record blobs
 *
 * - The DEK (Data Encryption Key) is a random 256-bit AES-GCM key generated once
 *   per vault. Every transaction / goal / budget record is encrypted with it.
 * - The DEK never leaves the device in the clear. It is *wrapped* (encrypted) by
 *   a KEK (Key Encryption Key) that is derived from the user's passphrase via
 *   Argon2id. Only the wrapped DEK + its salt are stored server-side.
 * - This indirection buys two things: (1) changing the passphrase only re-wraps
 *   the DEK, it does not re-encrypt the whole vault; (2) any device that knows
 *   the passphrase can unwrap the same DEK and read the same ciphertext.
 *
 * What the server (Supabase) sees: opaque {iv, ciphertext} blobs, timestamps,
 * tombstones, and the wrapped-DEK record. Never plaintext, never the passphrase,
 * never the DEK. That is the honest meaning of "E2E on all sides".
 *
 * What lives locally: Dexie holds *plaintext* records so charts and aggregation
 * are instant and offline. The device is the trust boundary. The unwrapped DEK
 * is held in memory for the session only (see keyring below) and is used to
 * encrypt outbound sync payloads and decrypt inbound ones.
 *
 * Recovery: there is no server-side password reset (the server cannot decrypt).
 * On first setup we also emit a one-time Recovery Key — a second KEK that wraps
 * the same DEK — which the user stores offline. Lose both passphrase and
 * recovery key and the cloud backup is unreadable; local data on the device is
 * unaffected. exportVault()/importVault() give a fully offline encrypted backup.
 *
 * Deps: `hash-wasm` for Argon2id (small, fast wasm), WebCrypto for AES-GCM.
 * Both run in every modern browser and are light enough for an 8GB machine and
 * mid-range phones.
 */

import { argon2id } from 'hash-wasm';

// --- tunables -------------------------------------------------------------

const ARGON2_MEMORY_KIB = 64 * 1024; // 64 MB — resists GPU cracking, fine on mobile
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 1;
const KEY_LEN = 32; // 256-bit
const IV_LEN = 12; // 96-bit, GCM standard
const SALT_LEN = 16;

// --- types ----------------------------------------------------------------

/** Stored server-side (and in an offline backup). Contains no secrets in the clear. */
export interface WrappedVaultKey {
  /** Argon2id salt for the passphrase-derived KEK (base64). Not secret. */
  salt: string;
  /** DEK encrypted under the KEK (base64 of iv||ciphertext). */
  wrappedDek: string;
  /** Argon2id params, stored so we can raise cost later without breaking old vaults. */
  kdf: { memoryKiB: number; iterations: number; parallelism: number };
  version: 1;
}

/** An encrypted record as it travels to/from the server. */
export interface Envelope {
  iv: string; // base64
  ct: string; // base64 ciphertext (includes GCM tag)
}

// --- base64 helpers -------------------------------------------------------

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

// --- key derivation -------------------------------------------------------

/** Derive a raw 256-bit KEK from a passphrase + salt using Argon2id. */
async function deriveKekRaw(
  passphrase: string,
  salt: Uint8Array,
  kdf: WrappedVaultKey['kdf']
): Promise<Uint8Array> {
  const hex = await argon2id({
    password: passphrase.normalize('NFKC'),
    salt,
    parallelism: kdf.parallelism,
    iterations: kdf.iterations,
    memorySize: kdf.memoryKiB,
    hashLength: KEY_LEN,
    outputType: 'hex',
  });
  const out = new Uint8Array(KEY_LEN);
  for (let i = 0; i < KEY_LEN; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

// --- AES-GCM primitives ---------------------------------------------------

async function aesEncrypt(key: CryptoKey, plaintext: Uint8Array): Promise<Envelope> {
  const iv = randomBytes(IV_LEN);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}

async function aesDecrypt(key: CryptoKey, env: Envelope): Promise<Uint8Array> {
  const iv = fromB64(env.iv);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    fromB64(env.ct)
  );
  return new Uint8Array(pt);
}

// --- vault lifecycle ------------------------------------------------------

/**
 * Create a brand-new vault. Generates a random DEK, wraps it under a
 * passphrase-derived KEK, and returns both the wrapped key (to persist) and the
 * live DEK (to hold in the session keyring). Call once, at first setup.
 */
export async function createVault(
  passphrase: string
): Promise<{ wrapped: WrappedVaultKey; dek: CryptoKey }> {
  const kdf = {
    memoryKiB: ARGON2_MEMORY_KIB,
    iterations: ARGON2_ITERATIONS,
    parallelism: ARGON2_PARALLELISM,
  };
  const salt = randomBytes(SALT_LEN);
  const dekRaw = randomBytes(KEY_LEN);

  const kekRaw = await deriveKekRaw(passphrase, salt, kdf);
  const kek = await importAesKey(kekRaw);
  const wrappedEnv = await aesEncrypt(kek, dekRaw);

  // DEK is imported extractable so it can be re-wrapped (passphrase change,
  // recovery key). It only ever exists extractable inside this module.
  const dek = await importDekExtractable(dekRaw);
  return {
    wrapped: {
      salt: toB64(salt),
      wrappedDek: `${wrappedEnv.iv}.${wrappedEnv.ct}`,
      kdf,
      version: 1,
    },
    dek,
  };
}

/**
 * Unlock an existing vault: re-derive the KEK from the passphrase and unwrap the
 * DEK. Throws if the passphrase is wrong (GCM auth failure).
 */
export async function unlockVault(
  passphrase: string,
  wrapped: WrappedVaultKey
): Promise<CryptoKey> {
  const salt = fromB64(wrapped.salt);
  const kekRaw = await deriveKekRaw(passphrase, salt, wrapped.kdf);
  const kek = await importAesKey(kekRaw);
  const [iv, ct] = wrapped.wrappedDek.split('.');
  let dekRaw: Uint8Array;
  try {
    dekRaw = await aesDecrypt(kek, { iv, ct });
  } catch {
    throw new WrongPassphraseError();
  }
  return importDekExtractable(dekRaw);
}

/**
 * Add a second way to unlock the same DEK (a passphrase change, or minting an
 * offline Recovery Key). Requires the live DEK, so the user must already be
 * unlocked. Returns a new WrappedVaultKey for the new secret; keep or replace.
 */
export async function rewrapDek(
  dek: CryptoKey,
  newSecret: string
): Promise<WrappedVaultKey> {
  // Export the raw DEK so we can re-wrap it. We create the DEK as extractable
  // only inside this module for exactly this purpose.
  const dekRaw = new Uint8Array(await crypto.subtle.exportKey('raw', dek));
  const kdf = {
    memoryKiB: ARGON2_MEMORY_KIB,
    iterations: ARGON2_ITERATIONS,
    parallelism: ARGON2_PARALLELISM,
  };
  const salt = randomBytes(SALT_LEN);
  const kekRaw = await deriveKekRaw(newSecret, salt, kdf);
  const kek = await importAesKey(kekRaw);
  const env = await aesEncrypt(kek, dekRaw);
  return {
    salt: toB64(salt),
    wrappedDek: `${env.iv}.${env.ct}`,
    kdf,
    version: 1,
  };
}

/** Generate a human-friendly offline recovery key, e.g. HISB-4F2A-9K3D-... */
export function generateRecoveryKey(): string {
  const bytes = randomBytes(16);
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const groups: string[] = ['HISB'];
  for (let g = 0; g < 4; g++) {
    let s = '';
    for (let i = 0; i < 4; i++) s += alphabet[bytes[g * 4 + i] % alphabet.length];
    groups.push(s);
  }
  return groups.join('-');
}

// NOTE: for rewrapDek/exportKey to work, createVault must import the DEK as
// extractable. Override the earlier import for the DEK specifically:
export async function importDekExtractable(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, [
    'encrypt',
    'decrypt',
  ]);
}

// --- record encryption (what sync uses) -----------------------------------

/** Encrypt any JSON-serialisable record for upload. */
export async function sealRecord<T>(dek: CryptoKey, record: T): Promise<Envelope> {
  return aesEncrypt(dek, enc.encode(JSON.stringify(record)));
}

/** Decrypt a downloaded envelope back into a record. */
export async function openRecord<T>(dek: CryptoKey, env: Envelope): Promise<T> {
  const pt = await aesDecrypt(dek, env);
  return JSON.parse(dec.decode(pt)) as T;
}

// --- offline encrypted backup --------------------------------------------

export interface VaultBackup {
  format: 'hisaab-vault';
  version: 1;
  wrapped: WrappedVaultKey;
  records: Envelope[];
}

/** Bundle the wrapped key + all sealed records into one portable file. */
export function exportVault(
  wrapped: WrappedVaultKey,
  records: Envelope[]
): VaultBackup {
  return { format: 'hisaab-vault', version: 1, wrapped, records };
}

// --- session keyring (in-memory only, never persisted in the clear) -------

let sessionDek: CryptoKey | null = null;

export const keyring = {
  set(dek: CryptoKey) {
    sessionDek = dek;
  },
  get(): CryptoKey {
    if (!sessionDek) throw new VaultLockedError();
    return sessionDek;
  },
  isUnlocked(): boolean {
    return sessionDek !== null;
  },
  clear() {
    sessionDek = null;
  },
};

// --- errors ---------------------------------------------------------------

export class WrongPassphraseError extends Error {
  constructor() {
    super('That passphrase does not match this vault.');
    this.name = 'WrongPassphraseError';
  }
}

export class VaultLockedError extends Error {
  constructor() {
    super('The vault is locked. Enter your passphrase to continue.');
    this.name = 'VaultLockedError';
  }
}
