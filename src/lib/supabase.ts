/**
 * Supabase client for auth + encrypted-blob backup. Optional: if the env vars
 * are absent the app runs fully local-first (which is the whole point) and every
 * sync path no-ops. `isCloudConfigured()` gates the sign-in UI and sync engine.
 *
 * The server only ever sees ciphertext — see lib/crypto and lib/sync. There are
 * two tables (RLS: owner-only):
 *   vault_keys  { user_id, salt, wrapped_dek, kdf, updated_at }
 *   records     { user_id, id, table_name, iv, ct, updated_at, deleted_at }
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isCloudConfigured(): boolean {
  return Boolean(url && anonKey);
}

export const supabase: SupabaseClient | null = isCloudConfigured()
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
