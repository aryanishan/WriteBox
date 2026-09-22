import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/backend/services/google-drive.service';

/** Refreshes the short-lived access token using the httpOnly OAuth cookie. */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('writebox_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'Google Drive session has expired. Please reconnect.' }, { status: 401 });
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    return NextResponse.json({ access_token: tokens.access_token, expiry_date: tokens.expiry_date });
  } catch (error) {
    console.error('Access token refresh failed:', error);
    return NextResponse.json({ error: 'Unable to refresh Google Drive access.' }, { status: 401 });
  }
}
