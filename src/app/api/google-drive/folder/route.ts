import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateFolder } from '@/backend/services/google-drive.service';

/**
 * POST /api/google-drive/folder
 *
 * Find or create the WriteBox folder in the user's Google Drive.
 *
 * Body: { accessToken: string }
 * Returns: { folderId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    const folderId = await findOrCreateFolder(accessToken);

    return NextResponse.json({ folderId });
  } catch (error: unknown) {
    console.error('Folder creation failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to find or create folder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
