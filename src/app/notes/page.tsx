import type { Metadata } from 'next';
import { NotesPage } from '@/frontend/components/notes/NotesPage';

export const metadata: Metadata = {
  title: 'Notes — WriteBox',
  description: 'Create, edit, and organize your notes with a rich text editor. All notes saved locally.',
};

export default function Notes() {
  return <NotesPage />;
}
