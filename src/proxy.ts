import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js middleware for Supabase session refresh.
 *
 * - Refreshes the Supabase auth session on every request
 * - Does NOT block unauthenticated users from /notes (offline-first)
 * - Redirects authenticated users away from /auth/* pages to /notes
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip middleware if Supabase is not configured or uses placeholders
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseUrl.includes('your_supabase_project')
  ) {
    return supabaseResponse;
  }

  // Check if there are any auth cookies before doing network requests
  const allCookies = request.cookies.getAll();
  const hasAuthToken = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );

  // If there is no auth token cookie in the request, the user is unauthenticated.
  // Skip getUser() to prevent unnecessary network latency and fetch errors.
  if (!hasAuthToken) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (input, init) => {
        try {
          return await fetch(input, init);
        } catch {
          // If Supabase host is unreachable or offline, return 400 so GoTrue
          // handles it gracefully without retrying or logging AuthRetryableFetchError
          return new Response(
            JSON.stringify({ message: 'Auth server unreachable' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      },
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session (important for keeping auth alive)
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // If session is invalid or server is unreachable, clear stale auth cookies
    if (error) {
      allCookies.forEach((c) => {
        if (c.name.startsWith('sb-') && c.name.includes('-auth-token')) {
          supabaseResponse.cookies.delete(c.name);
        }
      });
      return supabaseResponse;
    }

    const pathname = request.nextUrl.pathname;

    // If user is logged in and visiting /auth/*, redirect to /notes
    if (user && pathname.startsWith('/auth') && !pathname.startsWith('/auth/callback')) {
      const url = request.nextUrl.clone();
      url.pathname = '/notes';
      return NextResponse.redirect(url);
    }
  } catch {
    // If Supabase fails, allow offline navigation gracefully
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
