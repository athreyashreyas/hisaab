/**
 * Supabase auth store. Optional layer — the app is fully usable signed-out and
 * local-only. Signing in enables the encrypted-blob backup. Auth identity is
 * completely separate from the vault passphrase: Supabase authenticates *who you
 * are*; the passphrase decrypts *what you stored*. The server can do the former
 * and never the latter.
 */
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase, isCloudConfigured } from '../lib/supabase';

interface AuthState {
  user: User | null;
  ready: boolean;
  init: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: !isCloudConfigured(),

  async init() {
    if (!supabase) {
      set({ ready: true });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ user: data.session?.user ?? null, ready: true });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null });
    });
  },

  async signInWithEmail(email, password) {
    if (!supabase) throw new Error('Cloud backup is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signUpWithEmail(email, password) {
    if (!supabase) throw new Error('Cloud backup is not configured.');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
