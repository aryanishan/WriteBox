import { google, type drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  DRIVE_FOLDER_NAME,
  DRIVE_FOLDER_MIME_TYPE,
  DRIVE_FILE_MIME_TYPE,
  DRIVE_FILE_EXTENSION,
} from '@/shared/constants';
import { Readable } from 'stream';

/**
 * Create an authenticated OAuth2 client from an access token.
 */
export function createAuthClient(accessToken: string): OAuth2Client {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ access_token: accessToken });
  return client;
}

/**
 * Get an authenticated Google Drive v3 client.
 */
export function getDriveClient(accessToken: string): drive_v3.Drive {
  const auth = createAuthClient(accessToken);
  return google.drive({ version: 'v3', auth });
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
  );

  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(refreshToken: string) {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

/**
 * Find or create the WriteBox folder in the user's Google Drive.
 * Returns the folder ID.
 */
export async function findOrCreateFolder(accessToken: string): Promise<string> {
  const drive = getDriveClient(accessToken);

  // Search for existing folder
  const res = await drive.files.list({
    q: `name='${DRIVE_FOLDER_NAME}' and mimeType='${DRIVE_FOLDER_MIME_TYPE}' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: DRIVE_FOLDER_NAME,
      mimeType: DRIVE_FOLDER_MIME_TYPE,
    },
    fields: 'id',
  });

  return folder.data.id!;
}

/**
 * Create a new file in the WriteBox folder.
 * Returns { fileId, modifiedTime }.
 */
export async function createDriveFile(
  accessToken: string,
  folderId: string,
  fileName: string,
  content: string
): Promise<{ fileId: string; modifiedTime: string }> {
  const drive = getDriveClient(accessToken);

  const file = await drive.files.create({
    requestBody: {
      name: `${fileName}${DRIVE_FILE_EXTENSION}`,
      parents: [folderId],
      mimeType: DRIVE_FILE_MIME_TYPE,
    },
    media: {
      mimeType: DRIVE_FILE_MIME_TYPE,
      body: Readable.from([content]),
    },
    fields: 'id, modifiedTime',
  });

  return {
    fileId: file.data.id!,
    modifiedTime: file.data.modifiedTime!,
  };
}

/**
 * Update an existing file in Google Drive.
 * Uses the file's driveFileId — NEVER creates a duplicate.
 * Returns the updated modifiedTime.
 */
export async function updateDriveFile(
  accessToken: string,
  fileId: string,
  content: string,
  newName?: string
): Promise<{ modifiedTime: string }> {
  const drive = getDriveClient(accessToken);

  const requestBody: drive_v3.Schema$File = {};
  if (newName) {
    requestBody.name = `${newName}${DRIVE_FILE_EXTENSION}`;
  }

  const file = await drive.files.update({
    fileId,
    requestBody,
    media: {
      mimeType: DRIVE_FILE_MIME_TYPE,
      body: Readable.from([content]),
    },
    fields: 'id, modifiedTime',
  });

  return {
    modifiedTime: file.data.modifiedTime!,
  };
}

/**
 * Get file metadata (for conflict detection).
 */
export async function getFileMetadata(
  accessToken: string,
  fileId: string
): Promise<{ modifiedTime: string; name: string } | null> {
  const drive = getDriveClient(accessToken);

  try {
    const res = await drive.files.get({
      fileId,
      fields: 'id, name, modifiedTime',
    });

    return {
      modifiedTime: res.data.modifiedTime!,
      name: res.data.name!,
    };
  } catch {
    return null;
  }
}

/**
 * Download file content from Google Drive.
 */
export async function getFileContent(
  accessToken: string,
  fileId: string
): Promise<string | null> {
  const drive = getDriveClient(accessToken);

  try {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    );

    return res.data as string;
  } catch {
    return null;
  }
}

/** Permanently deletes a note file from Google Drive. */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const drive = getDriveClient(accessToken);
  await drive.files.delete({ fileId });
}
