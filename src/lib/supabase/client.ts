import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase browser client — singleton for client-side usage.
 *
 * Uses the public anon key; all data access goes through RLS.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
  return createBrowserClient(url, key);
}
