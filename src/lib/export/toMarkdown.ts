import type { JSONContent } from '@tiptap/react';

function render(node: JSONContent, depth = 0): string {
  if (node.type === 'text') {
    let text = node.text ?? '';
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') text = `**${text}**`;
      if (mark.type === 'italic') text = `*${text}*`;
      if (mark.type === 'strike') text = `~~${text}~~`;
      if (mark.type === 'code') text = `\`${text}\``;
      if (mark.type === 'link') text = `[${text}](${String(mark.attrs?.href ?? '')})`;
    }
    return text;
  }

  const children = (node.content ?? []).map(child => render(child, depth)).join('');
  switch (node.type) {
    case 'doc': return children.trim();
    case 'paragraph': return `${children}\n\n`;
    case 'heading': return `${'#'.repeat(Number(node.attrs?.level ?? 1))} ${children}\n\n`;
    case 'blockquote': return children.split('\n').filter(Boolean).map(line => `> ${line}`).join('\n') + '\n\n';
    case 'bulletList': return (node.content ?? []).map(item => `- ${render(item, depth + 1).trim()}\n`).join('') + '\n';
    case 'orderedList': return (node.content ?? []).map((item, index) => `${index + 1}. ${render(item, depth + 1).trim()}\n`).join('') + '\n';
    case 'listItem': return children;
    case 'codeBlock': return `\`\`\`${node.attrs?.language ?? ''}\n${children}\n\`\`\`\n\n`;
    case 'hardBreak': return '\n';
    case 'horizontalRule': return '---\n\n';
    default: return children;
  }
}

export function toMarkdown(content: JSONContent): string {
  return `${render(content).replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
