import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from 'date-fns';
import type { JSONContent } from '@tiptap/react';

/** Generate a unique ID for a new note */
export function generateId(): string {
  return uuidv4();
}

/** Format a timestamp to a relative time string (e.g., "2 minutes ago") */
export function formatRelativeTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

/** Format a timestamp to a readable date string */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Extract plain text from Tiptap JSONContent.
 * Recursively walks the document tree and concatenates text nodes.
 */
export function extractPlainText(content: JSONContent): string {
  if (!content) return '';

  let text = '';

  if (content.text) {
    text += content.text;
  }

  if (content.content) {
    for (const child of content.content) {
      text += extractPlainText(child);
      // Add newlines between block-level nodes
      if (child.type && ['paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'horizontalRule'].includes(child.type)) {
        text += '\n';
      }
    }
  }

  return text;
}

/** Get a preview of a note's content (first N characters of plain text) */
export function getContentPreview(plainText: string, maxLength: number = 80): string {
  const cleaned = plainText.replace(/\n+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '…';
}

/** Count words in a string */
export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

/** Count characters in a string (excluding whitespace at the ends) */
export function countCharacters(text: string): number {
  return text.trim().length;
}

/** Debounce utility */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/** Safely parse JSON, returning null on failure */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Create a sanitized filename from a note title */
export function sanitizeFileName(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100)
    .toLowerCase() || 'untitled';
}

/** Class name helper — filters falsy values and joins */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
