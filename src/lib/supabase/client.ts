import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase browser client — singleton for client-side usage.
 *
 * Uses the public anon key; all data access goes through RLS.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
  return createBrowserClient(url, key, {
    global: {
      fetch: async (input, init) => {
        try {
          return await fetch(input, init);
        } catch {
          return new Response(
            JSON.stringify({ message: 'Auth server unreachable' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      },
    },
  });
}
