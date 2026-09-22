import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth callback handler.
 *
 * Supabase redirects here after a successful Google sign-in.
 * We exchange the `code` query-param for a session, then redirect
 * the user into the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/notes';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, send the user to login with an error hint
  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}
