'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { Note } from '@/shared/types/note';
import { SyncBadge } from '@/frontend/components/ui/SyncBadge';
import { Button } from '@/frontend/components/ui/Button';
import { Modal } from '@/frontend/components/ui/Modal';
import { useGoogleDrive } from '@/frontend/contexts/GoogleDriveProvider';
import {
  toggleFavorite,
  deleteNote,
  duplicateNote,
} from '@/lib/db/notes';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { cn } from '@/shared/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Link as LinkIcon,
  Undo,
  Redo,
  Star,
  Trash2,
  Copy,
  MoreHorizontal,
  Cloud,
  CloudUpload,
  Download,
  Pencil,
  Eraser,
  Type,
  Palette,
  PaintBucket,
  ChevronDown,
  PenTool,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Constants ─────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Comic Sans MS', value: 'Comic Sans MS' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Purple', value: '#ddd6fe' },
  { label: 'Red', value: '#fecaca' },
  { label: 'Cyan', value: '#a5f3fc' },
];

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Black', value: '#000000' },
  { label: 'White', value: '#ffffff' },
];

const PAGE_COLORS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Warm', value: '#fefce8' },
  { label: 'Cream', value: '#fef3c7' },
  { label: 'Mint', value: '#ecfdf5' },
  { label: 'Sky', value: '#f0f9ff' },
  { label: 'Lavender', value: '#f5f3ff' },
  { label: 'Rose', value: '#fff1f2' },
  { label: 'Slate', value: '#f1f5f9' },
  { label: 'Stone', value: '#f5f5f4' },
  { label: 'Dark', value: '#0f0f13' },
  { label: 'Navy', value: '#0f172a' },
  { label: 'Forest', value: '#052e16' },
];

const PENCIL_SIZES = [
  { label: 'Small', size: 1 },
  { label: 'Medium', size: 2 },
  { label: 'Large', size: 3 },
];

const ERASER_SIZES = [
  { label: 'Word', action: 'word' as const },
  { label: 'Line', action: 'line' as const },
  { label: 'All', action: 'all' as const },
];

// ── Component ─────────────────────────────────────────────────────

interface EditorToolbarProps {
  editor: Editor;
  note: Note;
  pageColor: string;
  onPageColorChange: (color: string) => void;
}

export function EditorToolbar({
  editor,
  note,
  pageColor,
  onPageColorChange,
}: EditorToolbarProps) {
  const { isConnected } = useGoogleDrive();
  const { setSelectedNoteId } = useAppState();

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // Dropdown states
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showTextColorDropdown, setShowTextColorDropdown] = useState(false);
  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);
  const [showPageColorDropdown, setShowPageColorDropdown] = useState(false);
  const [showPencilDropdown, setShowPencilDropdown] = useState(false);
  const [showEraserDropdown, setShowEraserDropdown] = useState(false);

  // Current pencil highlight color
  const [pencilColor, setPencilColor] = useState('#fef08a');

  // Close all dropdowns when clicking outside
  const closeAllDropdowns = useCallback(() => {
    setShowFontDropdown(false);
    setShowTextColorDropdown(false);
    setShowHighlightDropdown(false);
    setShowPageColorDropdown(false);
    setShowPencilDropdown(false);
    setShowEraserDropdown(false);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────

  const handleToggleFavorite = useCallback(async () => {
    await toggleFavorite(note.id);
    toast.success(note.isFavorite ? 'Removed from favorites' : 'Added to favorites');
  }, [note.id, note.isFavorite]);

  const handleDelete = useCallback(async () => {
    await deleteNote(note.id);
    setSelectedNoteId(null);
    setShowDeleteModal(false);
    toast.success('Note moved to trash');
  }, [note.id, setSelectedNoteId]);

  const handleDuplicate = useCallback(async () => {
    const dup = await duplicateNote(note.id);
    if (dup) {
      setSelectedNoteId(dup.id);
      toast.success('Note duplicated');
    }
    setShowMenu(false);
  }, [note.id, setSelectedNoteId]);

  const handleSetLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkModal(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const handleSetFontFamily = useCallback(
    (family: string) => {
      if (family) {
        editor.chain().focus().setFontFamily(family).run();
      } else {
        editor.chain().focus().unsetFontFamily().run();
      }
      setShowFontDropdown(false);
    },
    [editor]
  );

  const handleSetTextColor = useCallback(
    (color: string) => {
      if (color) {
        editor.chain().focus().setColor(color).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
      setShowTextColorDropdown(false);
    },
    [editor]
  );

  const handlePencilHighlight = useCallback(
    (color: string) => {
      setPencilColor(color);
      editor.chain().focus().toggleHighlight({ color }).run();
      setShowPencilDropdown(false);
    },
    [editor]
  );

  const handleEraser = useCallback(
    (action: 'word' | 'line' | 'all') => {
      switch (action) {
        case 'word':
          // Clear formatting from selection
          editor.chain().focus().unsetAllMarks().run();
          break;
        case 'line':
          // Clear all marks and reset node
          editor.chain().focus().unsetAllMarks().clearNodes().run();
          break;
        case 'all':
          // Clear everything in the document
          editor.chain().focus().selectAll().unsetAllMarks().clearNodes().run();
          break;
      }
      setShowEraserDropdown(false);
      toast.success(
        action === 'all'
          ? 'All formatting cleared'
          : action === 'line'
          ? 'Line formatting cleared'
          : 'Selection formatting cleared'
      );
    },
    [editor]
  );

  const handleExport = useCallback(
    async (format: 'md' | 'txt' | 'json' | 'pdf') => {
      let content: string = '';
      let filename: string = '';
      let mimeType: string = '';
      const titleSlug = note.title.replace(/\s+/g, '-').toLowerCase() || 'untitled';

      if (format === 'pdf') {
        try {
          const html2pdf = (await import('html2pdf.js')).default;
          const element = document.getElementById('editor-export-area');
          if (!element) {
            toast.error('Editor content not found');
            return;
          }

          // Temporarily remove placeholder text styling if empty
          const opt: any = {
            margin: 15,
            filename: `${titleSlug}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          await html2pdf().set(opt).from(element).save();
          setShowMenu(false);
          toast.success('Exported as PDF');
        } catch (error) {
          console.error('PDF export failed:', error);
          toast.error('Failed to export as PDF');
        }
        return;
      }

      switch (format) {
        case 'md':
          content = note.plainTextContent;
          filename = `${titleSlug}.md`;
          mimeType = 'text/markdown';
          break;
        case 'txt':
          content = note.plainTextContent;
          filename = `${titleSlug}.txt`;
          mimeType = 'text/plain';
          break;
        case 'json':
          content = JSON.stringify(
            { id: note.id, title: note.title, content: note.content, createdAt: new Date(note.createdAt).toISOString(), updatedAt: new Date(note.updatedAt).toISOString() },
            null,
            2
          );
          filename = `${titleSlug}.json`;
          mimeType = 'application/json';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setShowMenu(false);
      toast.success(`Exported as ${format.toUpperCase()}`);
    },
    [note]
  );

  // ── Toolbar button helper ───────────────────────────────────────

  const toolbarBtn = (
    isActive: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    title: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-[var(--radius-sm)] transition-colors duration-[var(--transition-fast)] cursor-pointer',
        isActive
          ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
          : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
      )}
    >
      {icon}
    </button>
  );

  // ── Dropdown wrapper ────────────────────────────────────────────

  const DropdownWrapper = ({
    show,
    onClose,
    children,
    align = 'left',
  }: {
    show: boolean;
    onClose: () => void;
    children: React.ReactNode;
    align?: 'left' | 'right';
  }) => {
    if (!show) return null;
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div
          className={cn(
            'absolute top-full mt-1 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg z-50 py-1 animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children}
        </div>
      </>
    );
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* Top bar: sync + actions */}
        <div className="flex items-center justify-between px-4 py-2">
          <SyncBadge status={note.syncStatus} />

          <div className="flex items-center gap-1">
            {isConnected && note.syncStatus === 'local' && (
              <Button variant="ghost" size="sm" onClick={() => toast.info('Use Ctrl+Shift+S to sync')}>
                <Cloud size={14} />
                Sync to Drive
              </Button>
            )}
            {isConnected && note.syncStatus === 'modified' && (
              <Button variant="secondary" size="sm" onClick={() => toast.info('Use Ctrl+Shift+S to update')}>
                <CloudUpload size={14} />
                Update Drive
              </Button>
            )}

            <button
              onClick={handleToggleFavorite}
              className="p-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer hover:bg-[var(--color-bg-hover)]"
              title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                size={16}
                className={
                  note.isFavorite
                    ? 'text-[var(--color-warning)] fill-[var(--color-warning)]'
                    : 'text-[var(--color-text-tertiary)]'
                }
              />
            </button>

            {/* More menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg z-50 py-1 animate-fade-in">
                    <button onClick={handleDuplicate} className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] flex items-center gap-2 cursor-pointer">
                      <Copy size={14} /> Duplicate
                    </button>
                    <button onClick={() => handleExport('md')} className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] flex items-center gap-2 cursor-pointer">
                      <Download size={14} /> Export Markdown
                    </button>
                    <button onClick={() => handleExport('txt')} className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] flex items-center gap-2 cursor-pointer">
                      <Download size={14} /> Export Text
                    </button>
                    <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] flex items-center gap-2 cursor-pointer">
                      <Download size={14} /> Export JSON
                    </button>
                    <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] flex items-center gap-2 cursor-pointer">
                      <Download size={14} /> Export PDF
                    </button>
                    <div className="border-t border-[var(--color-border)] my-1" />
                    <button
                      onClick={() => { setShowMenu(false); setShowDeleteModal(true); }}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-bg)] flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Formatting Toolbar ──────────────────────────────── */}
        <div className="flex items-center gap-0.5 px-4 pb-2 flex-wrap">
          {/* Headings */}
          {toolbarBtn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 size={16} />, 'Heading 1')}
          {toolbarBtn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 size={16} />, 'Heading 2')}
          {toolbarBtn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 size={16} />, 'Heading 3')}

          <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

          {/* Basic formatting */}
          {toolbarBtn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold size={16} />, 'Bold (Ctrl+B)')}
          {toolbarBtn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic size={16} />, 'Italic (Ctrl+I)')}
          {toolbarBtn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon size={16} />, 'Underline (Ctrl+U)')}
          {toolbarBtn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={16} />, 'Strikethrough')}

          <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

          {/* ✏️ Pencil (Highlight) with color + size */}
          <div className="relative">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHighlight({ color: pencilColor }).run()}
                title="Highlight (Pencil)"
                className={cn(
                  'p-1.5 rounded-l-[var(--radius-sm)] transition-colors duration-[var(--transition-fast)] cursor-pointer',
                  editor.isActive('highlight')
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                )}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => { closeAllDropdowns(); setShowPencilDropdown(!showPencilDropdown); }}
                className="p-1 rounded-r-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
                title="Pencil options"
              >
                <ChevronDown size={10} />
              </button>
            </div>
            <DropdownWrapper show={showPencilDropdown} onClose={() => setShowPencilDropdown(false)}>
              <div className="w-52 p-2">
                <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-2 mb-1.5">Highlight Color</p>
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {HIGHLIGHT_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => handlePencilHighlight(c.value)}
                      className={cn(
                        'w-full aspect-square rounded-[var(--radius-sm)] border-2 cursor-pointer transition-transform hover:scale-110',
                        pencilColor === c.value ? 'border-[var(--color-accent)]' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-2 mb-1.5">Pencil Size</p>
                <div className="flex gap-1">
                  {PENCIL_SIZES.map(s => (
                    <button
                      key={s.label}
                      onClick={() => {
                        // Size affects the highlight visually via different opacity
                        const alpha = s.size === 1 ? '66' : s.size === 2 ? '99' : 'cc';
                        const color = pencilColor + alpha;
                        editor.chain().focus().toggleHighlight({ color }).run();
                        setShowPencilDropdown(false);
                      }}
                      className="flex-1 px-2 py-1.5 text-xs rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] cursor-pointer text-[var(--color-text-secondary)] text-center"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </DropdownWrapper>
          </div>

          {/* 🧹 Eraser (Clear formatting) with size options */}
          <div className="relative">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetAllMarks().run()}
                title="Clear formatting (Eraser)"
                className="p-1.5 rounded-l-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
              >
                <Eraser size={16} />
              </button>
              <button
                type="button"
                onClick={() => { closeAllDropdowns(); setShowEraserDropdown(!showEraserDropdown); }}
                className="p-1 rounded-r-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
                title="Eraser options"
              >
                <ChevronDown size={10} />
              </button>
            </div>
            <DropdownWrapper show={showEraserDropdown} onClose={() => setShowEraserDropdown(false)}>
              <div className="w-44">
                <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-3 pt-2 pb-1">Erase Scope</p>
                {ERASER_SIZES.map(e => (
                  <button
                    key={e.action}
                    onClick={() => handleEraser(e.action)}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
                  >
                    {e.label} {e.action === 'word' ? '— selection marks' : e.action === 'line' ? '— marks + nodes' : '— entire document'}
                  </button>
                ))}
              </div>
            </DropdownWrapper>
          </div>

          <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

          {/* 🔤 Font Family */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { closeAllDropdowns(); setShowFontDropdown(!showFontDropdown); }}
              title="Font Style"
              className="flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer text-xs"
            >
              <Type size={14} />
              <ChevronDown size={10} />
            </button>
            <DropdownWrapper show={showFontDropdown} onClose={() => setShowFontDropdown(false)}>
              <div className="w-48 max-h-60 overflow-y-auto">
                {FONT_FAMILIES.map(f => (
                  <button
                    key={f.value || 'default'}
                    onClick={() => handleSetFontFamily(f.value)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors',
                      (f.value && editor.isActive('textStyle', { fontFamily: f.value }))
                        ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                    )}
                    style={{ fontFamily: f.value || 'inherit' }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </DropdownWrapper>
          </div>

          {/* 🎨 Text Color */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { closeAllDropdowns(); setShowTextColorDropdown(!showTextColorDropdown); }}
              title="Text Color"
              className="flex items-center gap-1 p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              <Palette size={16} />
              <ChevronDown size={10} />
            </button>
            <DropdownWrapper show={showTextColorDropdown} onClose={() => setShowTextColorDropdown(false)}>
              <div className="w-52 p-2">
                <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-1 mb-1.5">Font Color</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {TEXT_COLORS.map(c => (
                    <button
                      key={c.value || 'default'}
                      onClick={() => handleSetTextColor(c.value)}
                      className={cn(
                        'group flex flex-col items-center gap-0.5 p-1 rounded-[var(--radius-sm)] cursor-pointer transition-colors hover:bg-[var(--color-bg-hover)]',
                      )}
                      title={c.label}
                    >
                      <div
                        className="w-6 h-6 rounded-full border border-[var(--color-border)] transition-transform group-hover:scale-110"
                        style={{ backgroundColor: c.value || 'var(--color-text-primary)' }}
                      />
                      <span className="text-[9px] text-[var(--color-text-muted)]">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DropdownWrapper>
          </div>

          {/* 🖌️ Page Color */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { closeAllDropdowns(); setShowPageColorDropdown(!showPageColorDropdown); }}
              title="Page Background Color"
              className="flex items-center gap-1 p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              <PaintBucket size={16} />
              <ChevronDown size={10} />
            </button>
            <DropdownWrapper show={showPageColorDropdown} onClose={() => setShowPageColorDropdown(false)}>
              <div className="w-52 p-2">
                <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-1 mb-1.5">Page Color</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {PAGE_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => { onPageColorChange(c.value); setShowPageColorDropdown(false); }}
                      className="group flex flex-col items-center gap-0.5 p-1 rounded-[var(--radius-sm)] cursor-pointer transition-colors hover:bg-[var(--color-bg-hover)]"
                      title={c.label}
                    >
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full border transition-transform group-hover:scale-110',
                          pageColor === c.value
                            ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30'
                            : 'border-[var(--color-border)]'
                        )}
                        style={{ backgroundColor: c.value }}
                      />
                      <span className="text-[9px] text-[var(--color-text-muted)]">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DropdownWrapper>
          </div>

          <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

          {/* Lists, blockquote */}
          {toolbarBtn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List size={16} />, 'Bullet List')}
          {toolbarBtn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={16} />, 'Numbered List')}
          {toolbarBtn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), <Quote size={16} />, 'Blockquote')}

          <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

          {/* Draw, Code, link, hr */}
          {toolbarBtn(false, () => editor.chain().focus().insertContent({ type: 'drawingBlock', attrs: { lines: [] } }).run(), <PenTool size={16} />, 'Insert Drawing')}
          {toolbarBtn(editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), <Code size={16} />, 'Inline Code')}
          {toolbarBtn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), <span className="text-xs font-mono">{'</>'}</span>, 'Code Block')}
          {toolbarBtn(
            false,
            () => { setLinkUrl(editor.getAttributes('link').href || ''); setShowLinkModal(true); },
            <LinkIcon size={16} />,
            'Link'
          )}
          {toolbarBtn(false, () => editor.chain().focus().setHorizontalRule().run(), <Minus size={16} />, 'Horizontal Rule')}

          <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

          {/* Undo/Redo */}
          {toolbarBtn(false, () => editor.chain().focus().undo().run(), <Undo size={16} />, 'Undo (Ctrl+Z)')}
          {toolbarBtn(false, () => editor.chain().focus().redo().run(), <Redo size={16} />, 'Redo (Ctrl+Shift+Z)')}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Note">
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Are you sure you want to delete &ldquo;{note.title || 'Untitled'}&rdquo;? This action cannot be easily undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Link Modal */}
      <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="Insert Link">
        <input
          type="url"
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm mb-4 outline-none focus:border-[var(--color-accent)]"
          onKeyDown={e => e.key === 'Enter' && handleSetLink()}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowLinkModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSetLink}>{linkUrl ? 'Set Link' : 'Remove Link'}</Button>
        </div>
      </Modal>
    </>
  );
}
