import type { Metadata } from 'next';
import { SettingsPage } from '@/frontend/components/settings/SettingsPage';

export const metadata: Metadata = {
  title: 'Settings — WriteBox',
  description: 'Configure appearance, editor, storage, and Google Drive sync settings.',
};

export default function Settings() {
  return <SettingsPage />;
}
