import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DrawingComponent } from './DrawingComponent';

export const DrawingBlock = Node.create({
  name: 'drawingBlock',

  group: 'block',

  atom: true, // It acts as a single unit in the editor

  addAttributes() {
    return {
      lines: {
        default: [],
        parseHTML: (element) => {
          const linesAttr = element.getAttribute('data-lines');
          return linesAttr ? JSON.parse(linesAttr) : [];
        },
        renderHTML: (attributes) => {
          return {
            'data-lines': JSON.stringify(attributes.lines),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="drawing-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'drawing-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingComponent);
  },
});
