export const APP_NAME = 'WriteBox';
export const APP_DESCRIPTION = 'Offline-first note-taking with optional Google Drive sync';

/** Google Drive folder name where notes are stored */
export const DRIVE_FOLDER_NAME = 'WriteBox';

/** File extension for notes stored in Google Drive */
export const DRIVE_FILE_EXTENSION = '.writebox.json';

/** MIME type used for note files in Google Drive */
export const DRIVE_FILE_MIME_TYPE = 'application/json';

/** Google Drive folder MIME type */
export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

/** Autosave debounce delay in milliseconds */
export const AUTOSAVE_DEBOUNCE_MS = 800;

/** Google OAuth scopes — minimum permissions needed */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Only files created by this app
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/** Editor width presets in max-width values */
export const EDITOR_WIDTHS = {
  narrow: '620px',
  normal: '760px',
  wide: '920px',
  full: '100%',
} as const;

/** LocalStorage keys */
export const LS_KEYS = {
  THEME: 'writebox-theme',
  SETTINGS: 'writebox-settings',
  GOOGLE_DRIVE: 'writebox-gdrive',
} as const;
