import { NextRequest, NextResponse } from 'next/server';
import {
  updateDriveFile,
  getFileMetadata,
} from '@/backend/services/google-drive.service';

/**
 * PUT /api/google-drive/update
 *
 * Update an EXISTING note file in Google Drive.
 * Uses the stored driveFileId — NEVER creates a duplicate.
 *
 * Body: { accessToken, fileId, content, fileName?, knownModifiedTime? }
 * Returns: { modifiedTime, conflict? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, fileId, content, fileName, knownModifiedTime } = body;

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json(
        { error: 'File ID is required. Cannot update without an existing Drive file.' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Conflict detection: check if file was modified externally
    if (knownModifiedTime) {
      const metadata = await getFileMetadata(accessToken, fileId);
      if (metadata && metadata.modifiedTime !== knownModifiedTime) {
        return NextResponse.json({
          conflict: true,
          driveModifiedTime: metadata.modifiedTime,
          message: 'The file was modified in Google Drive after your last sync.',
        });
      }
    }

    const result = await updateDriveFile(accessToken, fileId, content, fileName);

    return NextResponse.json({
      modifiedTime: result.modifiedTime,
      conflict: false,
    });
  } catch (error: unknown) {
    console.error('File update failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to update file in Google Drive';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
