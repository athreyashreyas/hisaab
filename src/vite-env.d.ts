/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** The deployed build id, injected by vite.config.ts. Used by lib/appUpdate.ts
 *  to tell whether the server is serving a newer bundle than this tab. */
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
