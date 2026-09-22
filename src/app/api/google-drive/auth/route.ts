import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/backend/services/google-drive.service';

/**
 * POST /api/google-drive/auth
 *
 * Exchange Google OAuth authorization code for access/refresh tokens.
 *
 * Body: { code: string }
 * Returns: { access_token, refresh_token, expiry_date }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google OAuth credentials are not configured on the server' },
        { status: 500 }
      );
    }

    const tokens = await exchangeCodeForTokens(code);

    const response = NextResponse.json({
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
    });
    if (tokens.refresh_token) {
      response.cookies.set('writebox_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/google-drive',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch (error: unknown) {
    console.error('OAuth token exchange failed:', error);
    const message = error instanceof Error ? error.message : 'Token exchange failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
