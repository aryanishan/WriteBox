import { NextRequest, NextResponse } from 'next/server';
import { createDriveFile } from '@/backend/services/google-drive.service';

/**
 * POST /api/google-drive/sync
 *
 * Create a new note file in the user's WriteBox Google Drive folder.
 *
 * Body: { accessToken, folderId, fileName, content }
 * Returns: { fileId, modifiedTime }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, folderId, fileName, content } = body;

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    if (!folderId || typeof folderId !== 'string') {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const result = await createDriveFile(accessToken, folderId, fileName, content);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('File sync failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to create file in Google Drive';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
