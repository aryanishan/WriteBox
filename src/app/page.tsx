'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/frontend/contexts/ThemeProvider';
import { FileText, PenLine, Sun, Moon, ChevronRight } from 'lucide-react';

export default function Home() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Keyboard shortcuts: N → Notes, D → Draw
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') router.push('/notes');
      if (e.key === 'd' || e.key === 'D') router.push('/draw');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="launcher">
      <header className="launcher-header">
        <button
          type="button"
          onClick={toggleTheme}
          className="launcher-theme-btn"
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      <main className="launcher-main">
        <h1 className="launcher-brand">WriteBox</h1>

        <nav className="launcher-nav" aria-label="Choose workspace">
          <Link href="/notes" className="launcher-option" id="launcher-notes">
            <FileText size={20} className="launcher-option-icon" strokeWidth={1.5} />
            <div className="launcher-option-body">
              <span className="launcher-option-title">Notes</span>
              <span className="launcher-option-desc">
                Rich text editor with formatting and organization
              </span>
            </div>
            <kbd className="launcher-kbd">N</kbd>
            <ChevronRight size={16} className="launcher-option-arrow" />
          </Link>

          <Link href="/draw" className="launcher-option" id="launcher-draw">
            <PenLine size={20} className="launcher-option-icon" strokeWidth={1.5} />
            <div className="launcher-option-body">
              <span className="launcher-option-title">Draw</span>
              <span className="launcher-option-desc">
                Freeform canvas for sketches and diagrams
              </span>
            </div>
            <kbd className="launcher-kbd">D</kbd>
            <ChevronRight size={16} className="launcher-option-arrow" />
          </Link>
        </nav>

        <p className="launcher-footnote">
          Offline-first &middot; No account required
        </p>
      </main>
    </div>
  );
}
