'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthUser } from '@/shared/types/auth';
import { LS_KEYS } from '@/shared/constants';

interface AuthContextValue {
  /** Current Supabase user, or null if not authenticated */
  user: AuthUser | null;
  /** Current session, or null */
  session: Session | null;
  /** True while the initial auth check is running */
  isLoading: boolean;
  /** Sign up with email and password */
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Sign in with Google OAuth */
  signInWithGoogle: () => Promise<{ error: string | null }>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Send a password reset email */
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined,
    avatarUrl: user.user_metadata?.avatar_url ?? undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  // Restore cached user immediately to avoid flash
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LS_KEYS.AUTH_USER);
      if (cached) {
        setUser(JSON.parse(cached) as AuthUser);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = supabaseRef.current;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      const mapped = mapUser(s?.user ?? null);
      setUser(mapped);
      if (mapped) {
        localStorage.setItem(LS_KEYS.AUTH_USER, JSON.stringify(mapped));
      } else {
        localStorage.removeItem(LS_KEYS.AUTH_USER);
      }
      setIsLoading(false);
    });

    // Subscribe to changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const mapped = mapUser(s?.user ?? null);
      setUser(mapped);
      if (mapped) {
        localStorage.setItem(LS_KEYS.AUTH_USER, JSON.stringify(mapped));
      } else {
        localStorage.removeItem(LS_KEYS.AUTH_USER);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = supabaseRef.current;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = supabaseRef.current;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current;
    await supabase.auth.signOut();
    localStorage.removeItem(LS_KEYS.AUTH_USER);
    setUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = supabaseRef.current;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/login`,
    });
    return { error: error?.message ?? null };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
