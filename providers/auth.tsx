import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

interface AuthState {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function exchangeCodeFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const errorDescription = url.searchParams.get('error_description');
  if (errorDescription) {
    console.warn('[auth] callback error:', errorDescription);
  }
  if (!code) return;
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn('[auth] exchange failed:', error.message);
  } finally {
    url.searchParams.delete('code');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;
      setSession(newSession);
      setLoading(false);

      if (event === 'SIGNED_IN' && newSession?.user) {
        const { id, email } = newSession.user;
        analytics.identify(id, email ? { email } : undefined);
      } else if (event === 'SIGNED_OUT') {
        analytics.reset();
      }
    });

    exchangeCodeFromUrl();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
