import { NextRequest, NextResponse } from 'next/server';
import { getFileContent, getFileMetadata } from '@/backend/services/google-drive.service';

/** Returns a WriteBox file for client-side conflict resolution. */
export async function POST(request: NextRequest) {
  try {
    const { accessToken, fileId } = await request.json();
    if (!accessToken || typeof accessToken !== 'string' || !fileId || typeof fileId !== 'string') {
      return NextResponse.json({ error: 'Access token and file ID are required.' }, { status: 400 });
    }
    const [content, metadata] = await Promise.all([
      getFileContent(accessToken, fileId),
      getFileMetadata(accessToken, fileId),
    ]);
    if (content === null || metadata === null) {
      return NextResponse.json({ error: 'The Google Drive file could not be found.' }, { status: 404 });
    }
    return NextResponse.json({ content, modifiedTime: metadata.modifiedTime });
  } catch (error) {
    console.error('Drive file download failed:', error);
    return NextResponse.json({ error: 'Unable to download the Google Drive file.' }, { status: 500 });
  }
}
