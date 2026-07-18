/**
 * The account store — one password, end to end.
 *
 * A single email + password is the whole identity. From that password the app
 * derives two independent things: a login token sent to Supabase (so the server
 * can verify you) and, locally, the key that unwraps your data's encryption key
 * (the DEK). The server never sees the password or the DEK. A separate recovery
 * phrase independently wraps the same DEK — stored in the cloud too — so a
 * password reset can restore access on any device.
 *
 * Statuses:
 *   checking    boot
 *   onboarding  fresh, no account yet → guided sign-up
 *   signed-out  onboarded before, but this device has no local vault → sign in
 *   locked      local vault present, needs the password to unlock (works offline)
 *   recovery    arrived via a password-reset email link → set a new password
 *   unlocked    DEK in the session keyring; the app is usable
 */
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import {
  createVault,
  unlockVault,
  rewrapDek,
  keyring,
  exportDekB64,
  importDekB64,
  WrongPassphraseError,
} from '../lib/crypto';
import {
  deriveAuthToken,
  generateRecoveryPhrase,
  normalizeRecoveryPhrase,
  normalizeEmail,
} from '../lib/account';
import { vaultStorage, currentWrappedKey, currentRecoveryWrap } from '../lib/vaultStorage';
import { pushVaultKeys, fetchVaultKeys } from '../lib/vaultCloud';
import { supabase, isCloudConfigured } from '../lib/supabase';
import { seedDefaults } from '../lib/repo';
import { clearLocalDb } from '../lib/db';
import { syncNow } from '../lib/sync';

export type AccountStatus =
  | 'checking'
  | 'onboarding'
  | 'signed-out'
  | 'locked'
  | 'recovery'
  | 'unlocked';

export class WrongPasswordError extends Error {
  constructor() {
    super('That email or password is incorrect.');
    this.name = 'WrongPasswordError';
  }
}
export class WrongRecoveryPhraseError extends Error {
  constructor() {
    super('That recovery phrase does not match this account.');
    this.name = 'WrongRecoveryPhraseError';
  }
}

interface AccountState {
  status: AccountStatus;
  user: User | null;
  email: string | null;
  onboardedAt: number | null;
  pendingRecoveryPhrase: string | null;

  init: () => void;
  register: (email: string, password: string) => Promise<string>;
  signIn: (email: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetViaRecovery: (newPassword: string, recoveryPhrase: string) => Promise<void>;
  regenerateRecoveryPhrase: () => Promise<string>;
  clearPendingRecoveryPhrase: () => void;
  markOnboarded: () => void;
  lock: () => void;
  signOut: () => Promise<void>;
  useDifferentAccount: () => Promise<void>;
  startOver: () => Promise<void>;
}

const now = () => Date.now();

/** Load the DEK into the session keyring and keep a copy on this device so the
 *  next launch auto-unlocks. Persistence is best-effort; the keyring is the
 *  source of truth for this session. */
async function keepUnlocked(dek: CryptoKey): Promise<void> {
  keyring.set(dek);
  try {
    vaultStorage.setDek(await exportDekB64(dek));
  } catch {
    // If the DEK can't be serialised/stored, the session still works; the next
    // launch just falls back to the unlock screen.
  }
}

export const useAccountStore = create<AccountState>((set, get) => ({
  status: 'checking',
  user: null,
  email: null,
  onboardedAt: null,
  pendingRecoveryPhrase: null,

  init() {
    const wrapped = currentWrappedKey();
    const email = vaultStorage.getEmail();
    let onboardedAt = vaultStorage.getOnboardedAt();
    // Backfill: a device that already has a vault predates onboarding tracking.
    if (!onboardedAt && wrapped) {
      onboardedAt = now();
      vaultStorage.setOnboardedAt(onboardedAt);
    }
    set({ email, onboardedAt });

    // Ask the browser to keep this origin's storage (session, vault key, ledger)
    // from being evicted, so an installed PWA stays signed in across launches.
    try {
      void navigator.storage?.persist?.();
    } catch {
      /* not supported; ignore */
    }

    const lockedStatus: AccountStatus =
      onboardedAt == null ? 'onboarding' : wrapped ? 'locked' : 'signed-out';

    // Auto-unlock: if this device kept the DEK from a previous session, restore
    // it and go straight to the app — no password prompt on every reopen. Safe
    // under the trust model (the local ledger is already plaintext here); "Lock
    // now" and sign out clear it. Recovery links still win via onAuthStateChange.
    const storedDek = wrapped ? vaultStorage.getDek() : null;
    if (storedDek) {
      set({ status: 'checking' });
      void importDekB64(storedDek)
        .then((dek) => {
          keyring.set(dek);
          if (get().status !== 'recovery') set({ status: 'unlocked' });
          void syncNow();
        })
        .catch(() => {
          vaultStorage.clearDek();
          if (get().status !== 'recovery') set({ status: lockedStatus });
        });
    } else {
      set({ status: lockedStatus });
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => set({ user: data.session?.user ?? null }));
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // Arrived from a reset email. Force the reset screen regardless of any
          // local vault, so a new password can be set with the recovery phrase.
          set({ user: session?.user ?? null, status: 'recovery' });
          return;
        }
        set({ user: session?.user ?? null });
      });
    }
  },

  // --- sign up (onboarding) ------------------------------------------------
  async register(emailRaw, password) {
    const email = normalizeEmail(emailRaw);
    const authToken = await deriveAuthToken(email, password);

    let user: User | null = null;
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password: authToken });
      if (error) throw friendlyAuthError(error.message);
      user = data.user ?? null;
    }

    // Mint the vault (the password is the passphrase) and a recovery phrase.
    const { wrapped, dek } = await createVault(password);
    await keepUnlocked(dek);
    const recoveryPhrase = generateRecoveryPhrase();
    const recoveryWrap = await rewrapDek(dek, recoveryPhrase);

    vaultStorage.setWrapped(wrapped);
    vaultStorage.setRecoveryWrap(recoveryWrap);
    vaultStorage.setEmail(email);

    await seedDefaults();

    // Back up the wrapped keys if we have a session (email-confirmation-off case).
    if (user) {
      try {
        await pushVaultKeys(user.id, wrapped, recoveryWrap);
      } catch (err) {
        console.warn('[account] vault key push deferred', err);
      }
    }

    set({ user, email, status: 'unlocked', pendingRecoveryPhrase: recoveryPhrase });
    return recoveryPhrase;
  },

  // --- sign in (new device / different account) ----------------------------
  async signIn(emailRaw, password) {
    if (!supabase) throw new Error('Cloud is not configured, cannot sign in on a new device.');
    const email = normalizeEmail(emailRaw);
    const authToken = await deriveAuthToken(email, password);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: authToken });
    if (error || !data.user) throw new WrongPasswordError();
    const user = data.user;

    const cloud = await fetchVaultKeys(user.id);
    if (!cloud) throw new Error('No encrypted vault was found for this account.');

    const dek = await unlockVault(password, cloud.wrapped);
    await keepUnlocked(dek);

    vaultStorage.setWrapped(cloud.wrapped);
    if (cloud.recoveryWrap) vaultStorage.setRecoveryWrap(cloud.recoveryWrap);
    vaultStorage.setEmail(email);
    if (get().onboardedAt == null) vaultStorage.setOnboardedAt(now());

    set({ user, email, onboardedAt: get().onboardedAt ?? now(), status: 'unlocked' });
    void syncNow(); // pull this account's ledger onto the new device
  },

  // --- unlock (same device) ------------------------------------------------
  async unlock(password) {
    const wrapped = currentWrappedKey();
    if (!wrapped) {
      set({ status: 'signed-out' });
      return;
    }
    const dek = await unlockVault(password, wrapped); // throws WrongPassphraseError
    await keepUnlocked(dek);
    set({ status: 'unlocked' });

    // Best-effort: make sure there's a live Supabase session for backup. We have
    // the password in hand right now, so we can re-auth without prompting again.
    void ensureSession(get().email, password);
    void syncNow();
  },

  // --- change password (unlocked) ------------------------------------------
  async changePassword(current, next) {
    const wrapped = currentWrappedKey();
    if (!wrapped) throw new Error('No vault to change.');
    const dek = await unlockVault(current, wrapped); // verifies the current password
    const newWrapped = await rewrapDek(dek, next);
    vaultStorage.setWrapped(newWrapped);

    const email = get().email;
    const user = get().user;
    if (supabase && email) {
      const newAuthToken = await deriveAuthToken(email, next);
      const { error } = await supabase.auth.updateUser({ password: newAuthToken });
      if (error) throw error;
    }
    if (user) await pushVaultKeys(user.id, newWrapped, currentRecoveryWrap());
    await keepUnlocked(dek); // DEK is unchanged; refresh the device copy anyway
  },

  // --- password reset ------------------------------------------------------
  async requestPasswordReset(emailRaw) {
    if (!supabase) throw new Error('Cloud is not configured.');
    const email = normalizeEmail(emailRaw);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  },

  async resetViaRecovery(newPassword, recoveryPhrase) {
    if (!supabase) throw new Error('Cloud is not configured.');
    const user = get().user;
    if (!user) throw new Error('This reset link has expired. Request a new one.');
    const email = normalizeEmail(user.email ?? get().email ?? '');

    const cloud = await fetchVaultKeys(user.id);
    if (!cloud?.recoveryWrap) {
      throw new Error('No recovery data was found for this account.');
    }

    let dek;
    try {
      dek = await unlockVault(normalizeRecoveryPhrase(recoveryPhrase), cloud.recoveryWrap);
    } catch {
      throw new WrongRecoveryPhraseError();
    }

    const newWrapped = await rewrapDek(dek, newPassword);
    const newAuthToken = await deriveAuthToken(email, newPassword);
    const { error } = await supabase.auth.updateUser({ password: newAuthToken });
    if (error) throw error;

    await pushVaultKeys(user.id, newWrapped, cloud.recoveryWrap);
    vaultStorage.setWrapped(newWrapped);
    vaultStorage.setRecoveryWrap(cloud.recoveryWrap);
    vaultStorage.setEmail(email);
    if (get().onboardedAt == null) vaultStorage.setOnboardedAt(now());

    await keepUnlocked(dek);
    set({ email, onboardedAt: get().onboardedAt ?? now(), status: 'unlocked' });
    void syncNow();
  },

  async regenerateRecoveryPhrase() {
    const dek = keyring.get(); // must be unlocked
    const phrase = generateRecoveryPhrase();
    const recoveryWrap = await rewrapDek(dek, phrase);
    vaultStorage.setRecoveryWrap(recoveryWrap);
    const user = get().user;
    const wrapped = currentWrappedKey();
    if (user && wrapped) await pushVaultKeys(user.id, wrapped, recoveryWrap);
    return phrase;
  },

  clearPendingRecoveryPhrase() {
    set({ pendingRecoveryPhrase: null });
  },

  markOnboarded() {
    const ts = now();
    vaultStorage.setOnboardedAt(ts);
    set({ onboardedAt: ts });
  },

  lock() {
    keyring.clear();
    vaultStorage.clearDek(); // drop the auto-unlock copy so the password is needed
    set({ status: 'locked' });
  },

  async signOut() {
    if (supabase) await supabase.auth.signOut();
    keyring.clear();
    await clearLocalDb();
    vaultStorage.clear({ keepEmail: true, keepOnboarded: true });
    set({ user: null, status: 'signed-out' });
  },

  async useDifferentAccount() {
    if (supabase) await supabase.auth.signOut();
    keyring.clear();
    await clearLocalDb();
    vaultStorage.clear({ keepOnboarded: true });
    set({ user: null, email: null, status: 'signed-out' });
  },

  async startOver() {
    if (supabase) await supabase.auth.signOut();
    keyring.clear();
    await clearLocalDb();
    vaultStorage.clear();
    set({ user: null, email: null, onboardedAt: null, status: 'onboarding' });
  },
}));

/** Re-establish a Supabase session from a password we already hold (background). */
async function ensureSession(email: string | null, password: string): Promise<void> {
  if (!supabase || !email || !navigator.onLine) return;
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  try {
    const authToken = await deriveAuthToken(email, password);
    await supabase.auth.signInWithPassword({ email, password: authToken });
  } catch {
    // best effort; sync will resume when a session is available
  }
}

function friendlyAuthError(message: string): Error {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists')) {
    return new Error('An account with this email already exists. Sign in instead.');
  }
  if (m.includes('password')) return new Error('That password does not meet the requirements.');
  return new Error(message);
}

export { WrongPassphraseError };
export { isCloudConfigured };
