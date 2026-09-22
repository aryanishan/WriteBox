'use client';

import React, { useState } from 'react';
import { useAuth } from '@/frontend/contexts/AuthProvider';
import { toast } from 'sonner';
import Link from 'next/link';
import { Mail, ArrowLeft, PenLine, Send } from 'lucide-react';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      setSent(true);
      toast.success('Password reset email sent!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
      {/* Ambient gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-[var(--color-accent)] opacity-[0.06] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center shadow-md">
            <PenLine size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-[var(--color-text-primary)]">
            WriteBox
          </span>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-lg overflow-hidden">
          <div className="px-8 pt-8 pb-2">
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Reset password
            </h1>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
              {sent
                ? 'Check your inbox for a password reset link.'
                : 'Enter your email and we\'ll send you a reset link.'}
            </p>
          </div>

          {sent ? (
            <div className="px-8 pb-8 pt-4">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center">
                  <Send size={24} className="text-[var(--color-success)]" />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] text-center">
                  We&apos;ve sent a password reset link to <strong>{email}</strong>.
                  Please check your inbox and follow the instructions.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors mt-2"
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[var(--color-text-tertiary)] mt-6">
          <Link
            href="/auth/login"
            className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
