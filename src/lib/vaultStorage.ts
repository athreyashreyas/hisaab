/**
 * Local persistence for the vault key material and account identity. No secrets
 * in the clear: the wrapped DEKs are useless without the password or the recovery
 * phrase. Kept in its own module so the store, the sync engine, and the exporter
 * can all read it without importing each other.
 */
import type { WrappedVaultKey } from './crypto';

const K = {
  wrapped: 'hisaab.vault', // DEK wrapped under the password KEK
  recovery: 'hisaab.vault.recovery', // DEK wrapped under the recovery-phrase KEK
  dek: 'hisaab.vault.dek', // live DEK (base64) kept for auto-unlock on this device
  email: 'hisaab.email',
  onboardedAt: 'hisaab.onboardedAt',
} as const;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (private mode / disabled storage)
  }
}

export const vaultStorage = {
  getWrapped: () => readJson<WrappedVaultKey>(K.wrapped),
  setWrapped: (w: WrappedVaultKey) => writeJson(K.wrapped, w),
  getRecoveryWrap: () => readJson<WrappedVaultKey>(K.recovery),
  setRecoveryWrap: (w: WrappedVaultKey) => writeJson(K.recovery, w),
  /** The device-stored live DEK (base64), for auto-unlock. Null if locked out. */
  getDek: () => {
    try {
      return localStorage.getItem(K.dek);
    } catch {
      return null;
    }
  },
  setDek: (b64: string) => {
    try {
      localStorage.setItem(K.dek, b64);
    } catch {
      /* ignore */
    }
  },
  clearDek: () => {
    try {
      localStorage.removeItem(K.dek);
    } catch {
      /* ignore */
    }
  },
  getEmail: () => {
    try {
      return localStorage.getItem(K.email);
    } catch {
      return null;
    }
  },
  setEmail: (email: string) => {
    try {
      localStorage.setItem(K.email, email);
    } catch {
      /* ignore */
    }
  },
  getOnboardedAt: () => {
    try {
      const raw = localStorage.getItem(K.onboardedAt);
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  },
  setOnboardedAt: (ts: number) => {
    try {
      localStorage.setItem(K.onboardedAt, String(ts));
    } catch {
      /* ignore */
    }
  },
  /** Full local wipe of key material + identity (sign-out). Onboarding marker optional. */
  clear: (opts: { keepEmail?: boolean; keepOnboarded?: boolean } = {}) => {
    try {
      localStorage.removeItem(K.wrapped);
      localStorage.removeItem(K.recovery);
      localStorage.removeItem(K.dek);
      if (!opts.keepEmail) localStorage.removeItem(K.email);
      if (!opts.keepOnboarded) localStorage.removeItem(K.onboardedAt);
    } catch {
      /* ignore */
    }
  },
};

export function currentWrappedKey(): WrappedVaultKey | null {
  return vaultStorage.getWrapped();
}

export function currentRecoveryWrap(): WrappedVaultKey | null {
  return vaultStorage.getRecoveryWrap();
}
