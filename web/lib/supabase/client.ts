import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-side Supabase client.
 *
 * During Next.js build (SSG / page-data collection) the environment variables
 * may not be available (e.g. Cloudflare Pages). We fall back to harmless
 * placeholder values so module-level `const supabase = createClient()` in
 * repository files doesn't throw at build time. The build-time client is never
 * used for real queries — the browser re-evaluates modules at runtime with the
 * real env vars injected into the bundle.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
  );
}
