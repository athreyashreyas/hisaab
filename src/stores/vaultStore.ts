/**
 * Vault lifecycle store — the gate in front of the whole app.
 *
 * Statuses:
 *   checking     — reading persisted state on boot
 *   needs-setup  — no vault on this device yet → SetupPage
 *   locked       — a vault exists but the DEK isn't in memory → UnlockPage
 *   unlocked     — DEK in the session keyring; app is usable
 *
 * The WrappedVaultKey (salt + wrapped DEK, no secrets in the clear) is persisted
 * to localStorage so cold start knows a vault exists and can unlock offline. The
 * unwrapped DEK lives only in the in-memory keyring (see lib/crypto), never on
 * disk in the clear.
 */
import { create } from 'zustand';
import {
  createVault,
  unlockVault,
  rewrapDek,
  keyring,
  generateRecoveryKey,
  type WrappedVaultKey,
} from '../lib/crypto';
import { seedDefaults } from '../lib/repo';
import { clearLocalDb } from '../lib/db';

const VAULT_KEY = 'hisaab.vault';
const RECOVERY_WRAP_KEY = 'hisaab.vault.recovery';

function loadWrapped(): WrappedVaultKey | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? (JSON.parse(raw) as WrappedVaultKey) : null;
  } catch {
    return null;
  }
}

function saveWrapped(w: WrappedVaultKey) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(w));
}

export type VaultStatus = 'checking' | 'needs-setup' | 'locked' | 'unlocked';

interface VaultState {
  status: VaultStatus;
  wrapped: WrappedVaultKey | null;
  /** Held transiently right after setup so the Recovery Key screen can show it once. */
  pendingRecoveryKey: string | null;
  init: () => void;
  setup: (passphrase: string) => Promise<string>;
  unlock: (passphrase: string) => Promise<void>;
  changePassphrase: (current: string, next: string) => Promise<void>;
  regenerateRecoveryKey: () => Promise<string>;
  clearPendingRecoveryKey: () => void;
  lock: () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'checking',
  wrapped: null,
  pendingRecoveryKey: null,

  init() {
    const wrapped = loadWrapped();
    set({ wrapped, status: wrapped ? 'locked' : 'needs-setup' });
  },

  async setup(passphrase) {
    const { wrapped, dek } = await createVault(passphrase);
    saveWrapped(wrapped);

    // Mint a one-time Recovery Key that wraps the same DEK. Its wrapped form is
    // persisted so we can verify/re-key later; the printable key is shown once.
    const recoveryKey = generateRecoveryKey();
    const recoveryWrapped = await rewrapDek(dek, recoveryKey);
    localStorage.setItem(RECOVERY_WRAP_KEY, JSON.stringify(recoveryWrapped));

    keyring.set(dek);
    await seedDefaults();
    set({ wrapped, status: 'unlocked', pendingRecoveryKey: recoveryKey });
    return recoveryKey;
  },

  async unlock(passphrase) {
    const wrapped = get().wrapped ?? loadWrapped();
    if (!wrapped) {
      set({ status: 'needs-setup' });
      return;
    }
    const dek = await unlockVault(passphrase, wrapped); // throws WrongPassphraseError
    keyring.set(dek);
    await seedDefaults(); // no-op if already seeded (e.g. new device before first pull)
    set({ wrapped, status: 'unlocked' });
  },

  async changePassphrase(current, next) {
    const wrapped = get().wrapped ?? loadWrapped();
    if (!wrapped) throw new Error('No vault to change.');
    const dek = await unlockVault(current, wrapped); // verifies current passphrase
    const rewrapped = await rewrapDek(dek, next);
    saveWrapped(rewrapped);
    keyring.set(dek);
    set({ wrapped: rewrapped });
  },

  async regenerateRecoveryKey() {
    const dek = keyring.get(); // must be unlocked
    const recoveryKey = generateRecoveryKey();
    const recoveryWrapped = await rewrapDek(dek, recoveryKey);
    localStorage.setItem(RECOVERY_WRAP_KEY, JSON.stringify(recoveryWrapped));
    return recoveryKey;
  },

  clearPendingRecoveryKey() {
    set({ pendingRecoveryKey: null });
  },

  lock() {
    keyring.clear();
    void clearLocalDb();
    set({ status: 'locked' });
  },
}));

/** Read the wrapped key straight from storage (for the sync engine's vault_keys push). */
export function currentWrappedKey(): WrappedVaultKey | null {
  return loadWrapped();
}
