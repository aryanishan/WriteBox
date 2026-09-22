export type Theme = 'light' | 'dark' | 'system';

export interface EditorSettings {
  fontSize: number;       // px — default 16
  editorWidth: 'narrow' | 'normal' | 'wide' | 'full';
}

export interface GoogleDriveState {
  isConnected: boolean;
  userEmail?: string;
  userName?: string;
  folderId?: string;       // The WriteBox folder ID in Drive
  accessToken?: string;
  tokenExpiresAt?: number; // Unix timestamp (ms)
}

export interface AppSettings {
  theme: Theme;
  editor: EditorSettings;
  googleDrive: GoogleDriveState;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  editor: {
    fontSize: 16,
    editorWidth: 'normal',
  },
  googleDrive: {
    isConnected: false,
  },
};
