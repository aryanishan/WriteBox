'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { useBooks, useChapters, useChapterNotes } from '@/frontend/hooks/useBooks';
import { createBook, createChapter, deleteBook, deleteChapter, updateBook, updateChapter, getChapters } from '@/lib/db/books';
import { createNote, deleteNote } from '@/lib/db/notes';
import { ChevronRight, ChevronDown, Plus, Book as BookIcon, Folder, FileText, Trash2, Pencil, Download, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Modal } from '@/frontend/components/ui/Modal';
import { Button } from '@/frontend/components/ui/Button';
import { db } from '@/lib/db/dexie';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────

/** Convert a Tiptap JSONContent tree → simple HTML string for pdf rendering */
function jsonContentToHtml(content: any): string {
  if (!content) return '';

  const renderNode = (node: any): string => {
    if (!node) return '';

    switch (node.type) {
      case 'doc':
        return (node.content ?? []).map(renderNode).join('');
      case 'paragraph':
        return `<p>${(node.content ?? []).map(renderNode).join('')}</p>`;
      case 'heading': {
        const level = node.attrs?.level ?? 1;
        return `<h${level}>${(node.content ?? []).map(renderNode).join('')}</h${level}>`;
      }
      case 'bulletList':
        return `<ul>${(node.content ?? []).map(renderNode).join('')}</ul>`;
      case 'orderedList':
        return `<ol>${(node.content ?? []).map(renderNode).join('')}</ol>`;
      case 'listItem':
        return `<li>${(node.content ?? []).map(renderNode).join('')}</li>`;
      case 'codeBlock':
        return `<pre><code>${(node.content ?? []).map(renderNode).join('')}</code></pre>`;
      case 'blockquote':
        return `<blockquote>${(node.content ?? []).map(renderNode).join('')}</blockquote>`;
      case 'horizontalRule':
        return '<hr/>';
      case 'hardBreak':
        return '<br/>';
      case 'image':
        return `<img src="${node.attrs?.src ?? ''}" alt="${node.attrs?.alt ?? ''}" style="max-width:100%"/>`;
      case 'text': {
        let text: string = node.text ?? '';
        // escape HTML entities
        text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case 'bold': text = `<strong>${text}</strong>`; break;
              case 'italic': text = `<em>${text}</em>`; break;
              case 'underline': text = `<u>${text}</u>`; break;
              case 'strike': text = `<s>${text}</s>`; break;
              case 'code': text = `<code>${text}</code>`; break;
              case 'link': text = `<a href="${mark.attrs?.href ?? '#'}">${text}</a>`; break;
              case 'highlight': text = `<mark>${text}</mark>`; break;
            }
          }
        }
        return text;
      }
      default:
        return (node.content ?? []).map(renderNode).join('');
    }
  };

  return renderNode(content);
}

/** Generate a single PDF blob from a note's content */
async function noteToPdfBlob(note: { title: string; content: any }): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default;

  const htmlBody = jsonContentToHtml(note.content);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div style="font-family: 'Inter', 'Segoe UI', sans-serif; padding: 16px; color: #1a1a1a;">
      <h1 style="margin-bottom: 12px; font-size: 22px;">${note.title || 'Untitled'}</h1>
      <div style="font-size: 14px; line-height: 1.7;">${htmlBody}</div>
    </div>
  `;
  document.body.appendChild(wrapper);

  try {
    const blob: Blob = await html2pdf()
      .set({
        margin: 15,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(wrapper)
      .outputPdf('blob');
    return blob;
  } finally {
    document.body.removeChild(wrapper);
  }
}

/** Sanitise a filename for use inside a zip */
function sanitize(name: string): string {
  return (name || 'untitled').replace(/[<>:"/\\|?*]+/g, '_').trim();
}

// ── BookList (root component) ────────────────────────────────────────

export function BookList() {
  const books = useBooks();
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('New Book');

  const handleCreateBook = async () => {
    if (newBookTitle.trim()) {
      const book = await createBook(newBookTitle.trim());
      setExpandedBooks(prev => ({ ...prev, [book.id]: true }));
    }
    setShowCreateModal(false);
    setNewBookTitle('New Book');
  };

  return (
    <div className="flex flex-col mt-4">
      <div className="flex items-center justify-between px-4 py-2 group">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Books
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all cursor-pointer rounded hover:bg-[var(--color-bg-hover)]"
          title="New Book"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-0.5 px-2">
        {books.map(book => (
          <BookItem
            key={book.id}
            book={book}
            isExpanded={!!expandedBooks[book.id]}
            onToggle={() => setExpandedBooks(prev => ({ ...prev, [book.id]: !prev[book.id] }))}
            onExpand={() => setExpandedBooks(prev => ({ ...prev, [book.id]: true }))}
          />
        ))}
        {books.length === 0 && (
          <div className="px-4 py-2 text-xs text-[var(--color-text-muted)] italic">
            No books yet.
          </div>
        )}
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Book">
        <input
          type="text"
          value={newBookTitle}
          onChange={e => setNewBookTitle(e.target.value)}
          placeholder="Book Name"
          className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm mb-4 outline-none focus:border-[var(--color-accent)]"
          onKeyDown={e => e.key === 'Enter' && handleCreateBook()}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateBook}>Create</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── BookItem ─────────────────────────────────────────────────────────

function BookItem({ book, isExpanded, onToggle, onExpand }: { book: any; isExpanded: boolean; onToggle: () => void; onExpand: () => void }) {
  const chapters = useChapters(book.id);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const [showChapterModal, setShowChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('New Chapter');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(book.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── Download state
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== book.title) {
      await updateBook(book.id, { title: trimmed });
    } else {
      setRenameValue(book.title);
    }
    setIsRenaming(false);
  }, [renameValue, book.id, book.title]);

  const handleAddChapter = async () => {
    if (newChapterTitle.trim()) {
      await createChapter(book.id, newChapterTitle.trim());
      onExpand(); // ensure book is open
    }
    setShowChapterModal(false);
    setNewChapterTitle('New Chapter');
  };

  const handleDeleteBook = async () => {
    await deleteBook(book.id);
    setShowDeleteModal(false);
  };

  const handleDownloadBook = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const bookSlug = sanitize(book.title);

      // Get all chapters for this book
      const bookChapters = await getChapters(book.id);

      if (bookChapters.length === 0) {
        toast.error('No chapters to download');
        setIsDownloading(false);
        return;
      }

      let totalNotes = 0;

      for (const chapter of bookChapters) {
        const chapterSlug = sanitize(chapter.title);
        const chapterFolder = zip.folder(`${bookSlug}/${chapterSlug}`);

        // Get notes for this chapter
        const allNotes = await db.notes.toArray();
        const chapterNotes = allNotes.filter(n => n.chapterId === chapter.id && !n.isDeleted);

        for (const note of chapterNotes) {
          const pdfBlob = await noteToPdfBlob({ title: note.title, content: note.content });
          const noteSlug = sanitize(note.title);
          chapterFolder!.file(`${noteSlug}.pdf`, pdfBlob);
          totalNotes++;
        }
      }

      if (totalNotes === 0) {
        toast.error('No notes found in this book');
        setIsDownloading(false);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bookSlug}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${totalNotes} note${totalNotes > 1 ? 's' : ''} as ZIP`);
    } catch (err) {
      console.error('Book download failed:', err);
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] cursor-pointer group"
        onClick={isRenaming ? undefined : onToggle}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[var(--color-text-tertiary)] shrink-0">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <BookIcon size={14} className="text-[var(--color-text-muted)] shrink-0" />
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenameValue(book.title); setIsRenaming(false); }
              }}
              onClick={e => e.stopPropagation()}
              className="text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] border border-[var(--color-accent)] rounded px-1 py-0 outline-none w-full min-w-0"
            />
          ) : (
            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{book.title}</span>
          )}
        </div>
        {!isRenaming && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setRenameValue(book.title); setIsRenaming(true); }} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" title="Rename Book">
              <Pencil size={14} />
            </button>
            <button onClick={handleDownloadBook} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" title="Download Book as ZIP" disabled={isDownloading}>
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowChapterModal(true); }} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" title="Add Chapter">
              <Plus size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }} className="p-1 hover:bg-[var(--color-error-bg)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)]" title="Delete Book">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="flex flex-col ml-4 border-l border-[var(--color-border)] pl-1 mt-0.5">
          {chapters.map(chapter => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              isExpanded={!!expandedChapters[chapter.id]}
              onToggle={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
              onExpand={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: true }))}
            />
          ))}
          {chapters.length === 0 && (
            <div className="px-4 py-1 text-xs text-[var(--color-text-muted)] italic">No chapters</div>
          )}
        </div>
      )}

      <Modal isOpen={showChapterModal} onClose={() => setShowChapterModal(false)} title="Create Chapter">
        <input
          type="text"
          value={newChapterTitle}
          onChange={e => setNewChapterTitle(e.target.value)}
          placeholder="Chapter Name"
          className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm mb-4 outline-none focus:border-[var(--color-accent)]"
          onKeyDown={e => e.key === 'Enter' && handleAddChapter()}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowChapterModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddChapter}>Create</Button>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Book">
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Are you sure you want to delete "{book.title}" and all its chapters/notes?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteBook}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── ChapterItem ──────────────────────────────────────────────────────

function ChapterItem({ chapter, isExpanded, onToggle, onExpand }: { chapter: any; isExpanded: boolean; onToggle: () => void; onExpand: () => void }) {
  const notes = useChapterNotes(chapter.id);
  const { selectedNoteId, setSelectedNoteId, setSidebarOpen } = useAppState();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState<string | null>(null);

  // ── Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(chapter.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── Download state
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== chapter.title) {
      await updateChapter(chapter.id, { title: trimmed });
    } else {
      setRenameValue(chapter.title);
    }
    setIsRenaming(false);
  }, [renameValue, chapter.id, chapter.title]);

  const handleAddNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const note = await createNote('Untitled Note');
    const { db } = await import('@/lib/db/dexie');
    await db.notes.update(note.id, { chapterId: chapter.id });
    setSelectedNoteId(note.id);
    onExpand();
  };

  const handleDeleteChapter = async () => {
    await deleteChapter(chapter.id);
    setShowDeleteModal(false);
  };

  const handleDeleteNote = async () => {
    if (showDeleteNoteModal) {
      await deleteNote(showDeleteNoteModal);
      if (selectedNoteId === showDeleteNoteModal) setSelectedNoteId(null);
    }
    setShowDeleteNoteModal(null);
  };

  const handleDownloadChapter = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const chapterSlug = sanitize(chapter.title);

      // Get notes for this chapter
      const allNotes = await db.notes.toArray();
      const chapterNotes = allNotes.filter(n => n.chapterId === chapter.id && !n.isDeleted);

      if (chapterNotes.length === 0) {
        toast.error('No notes to download');
        setIsDownloading(false);
        return;
      }

      const folder = zip.folder(chapterSlug);

      for (const note of chapterNotes) {
        const pdfBlob = await noteToPdfBlob({ title: note.title, content: note.content });
        const noteSlug = sanitize(note.title);
        folder!.file(`${noteSlug}.pdf`, pdfBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chapterSlug}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${chapterNotes.length} note${chapterNotes.length > 1 ? 's' : ''} as ZIP`);
    } catch (err) {
      console.error('Chapter download failed:', err);
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] cursor-pointer group"
        onClick={isRenaming ? undefined : onToggle}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[var(--color-text-tertiary)] shrink-0">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <Folder size={14} className="text-[var(--color-text-muted)] shrink-0" />
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenameValue(chapter.title); setIsRenaming(false); }
              }}
              onClick={e => e.stopPropagation()}
              className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] border border-[var(--color-accent)] rounded px-1 py-0 outline-none w-full min-w-0"
            />
          ) : (
            <span className="text-sm text-[var(--color-text-secondary)] truncate">{chapter.title}</span>
          )}
        </div>
        {!isRenaming && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setRenameValue(chapter.title); setIsRenaming(true); }} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" title="Rename Chapter">
              <Pencil size={14} />
            </button>
            <button onClick={handleDownloadChapter} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" title="Download Chapter as ZIP" disabled={isDownloading}>
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </button>
            <button onClick={handleAddNote} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" title="Add Note">
              <Plus size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }} className="p-1 hover:bg-[var(--color-error-bg)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)]" title="Delete Chapter">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="flex flex-col ml-4 border-l border-[var(--color-border)] pl-1 mt-0.5">
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => {
                setSelectedNoteId(note.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-md)] cursor-pointer group',
                selectedNoteId === note.id
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                  : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <FileText size={12} className="shrink-0" />
                <span className="text-xs truncate">{note.title || 'Untitled'}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteNoteModal(note.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-error-bg)] rounded hover:text-[var(--color-error)] shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="px-4 py-1 text-[10px] text-[var(--color-text-muted)] italic">No notes</div>
          )}
        </div>
      )}

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Chapter">
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Are you sure you want to delete "{chapter.title}" and its notes?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteChapter}>Delete</Button>
        </div>
      </Modal>

      <Modal isOpen={!!showDeleteNoteModal} onClose={() => setShowDeleteNoteModal(null)} title="Delete Note">
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Are you sure you want to delete this note?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteNoteModal(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteNote}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
