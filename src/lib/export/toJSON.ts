import type { Note } from '@/shared/types/note';

export function toJSON(note: Note): string {
  return JSON.stringify({
    id: note.id,
    title: note.title,
    content: note.content,
    plainTextContent: note.plainTextContent,
    createdAt: new Date(note.createdAt).toISOString(),
    updatedAt: new Date(note.updatedAt).toISOString(),
    isFavorite: note.isFavorite,
  }, null, 2);
}
