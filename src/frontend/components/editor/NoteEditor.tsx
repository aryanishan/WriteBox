'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import ImageResize from 'tiptap-extension-resize-image';
import { DrawingBlock } from './extensions/DrawingBlock';
import { common, createLowlight } from 'lowlight';
import { EditorToolbar } from './EditorToolbar';
import { EditorFooter } from './EditorFooter';
import { useAutoSave } from '@/frontend/hooks/useAutoSave';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { useNote } from '@/frontend/hooks/useNotes';
import { useEffect, useRef, useState, useCallback } from 'react';
import { EDITOR_WIDTHS } from '@/shared/constants';
import type { JSONContent } from '@tiptap/react';

const lowlight = createLowlight(common);

export function NoteEditor() {
  const { selectedNoteId, saveStatus } = useAppState();
  const note = useNote(selectedNoteId);
  const { debouncedSave, saveNow } = useAutoSave(selectedNoteId);
  const [title, setTitle] = useState('');
  const [pageColor, setPageColor] = useState('#ffffff');
  const titleRef = useRef<HTMLInputElement>(null);
  const isInitialLoadRef = useRef(true);
  const lastNoteIdRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      CharacterCount,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      FontFamily,
      ImageResize,
      DrawingBlock,
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none',
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const node = view.state.schema.nodes.image.create({
                  src: readerEvent.target?.result,
                });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              };
              reader.readAsDataURL(file);
              event.preventDefault();
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.indexOf('image') === 0) {
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const node = schema.nodes.image.create({ src: readerEvent.target?.result });
              const transaction = view.state.tr.insert(coordinates?.pos || 0, node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
            event.preventDefault();
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (isInitialLoadRef.current) return;
      const content = editor.getJSON();
      debouncedSave({ content });
    },
  });

  // Load note content when selectedNoteId changes
  useEffect(() => {
    if (!note || !editor) return;

    // Only reload if the note ID actually changed
    if (lastNoteIdRef.current === note.id) return;
    lastNoteIdRef.current = note.id;

    isInitialLoadRef.current = true;
    setTitle(note.title);
    editor.commands.setContent(note.content as JSONContent);

    // Wait a tick to clear the initial load flag
    requestAnimationFrame(() => {
      isInitialLoadRef.current = false;
    });
  }, [note, editor]);

  // Handle title change
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      debouncedSave({ title: newTitle });
    },
    [debouncedSave]
  );

  // Handle title Enter key → focus editor
  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        editor?.commands.focus('start');
      }
    },
    [editor]
  );

  // Expose saveNow for keyboard shortcuts
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__writeboxSaveNow = saveNow;
    return () => {
      delete (window as unknown as Record<string, unknown>).__writeboxSaveNow;
    };
  }, [saveNow]);

  if (!selectedNoteId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-tertiary)] flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)]">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-1">
            Select a note
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Choose a note from the sidebar or create a new one
          </p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-bg-primary)] overflow-hidden">
      {/* Toolbar */}
      {editor && (
        <EditorToolbar
          editor={editor}
          note={note}
          pageColor={pageColor}
          onPageColorChange={setPageColor}
        />
      )}

      {/* Editor Area */}
      <div
        className="flex-1 overflow-y-auto transition-colors duration-200"
        style={{ backgroundColor: pageColor }}
      >
        <div
          id="editor-export-area"
          className="mx-auto px-6 md:px-10 py-8"
          style={{ maxWidth: EDITOR_WIDTHS.normal }}
        >
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            className="w-full text-3xl font-bold bg-transparent border-none outline-none mb-6"
            style={{
              color: pageColor !== '#ffffff' && pageColor !== '#0f0f13'
                ? '#1a1a2e'
                : 'var(--color-text-primary)',
            }}
          />

          {/* Rich Text Editor */}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Footer */}
      {editor && <EditorFooter editor={editor} saveStatus={saveStatus} />}
    </div>
  );
}
