import type { JSONContent } from '@tiptap/react';
import { extractPlainText } from '@/shared/utils';

export function toPlainText(content: JSONContent): string {
  return extractPlainText(content).replace(/\n{3,}/g, '\n\n').trim();
}
