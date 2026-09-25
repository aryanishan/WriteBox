import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FileAttachmentComponent } from './FileAttachmentComponent';

export interface FileAttachmentOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileAttachment: {
      setFileAttachment: (options: { src: string; filename: string; size: string }) => ReturnType;
    };
  }
}

export const FileAttachment = Node.create<FileAttachmentOptions>({
  name: 'fileAttachment',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      filename: {
        default: 'Attachment',
      },
      size: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file-attachment"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'file-attachment' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentComponent);
  },

  addCommands() {
    return {
      setFileAttachment:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
