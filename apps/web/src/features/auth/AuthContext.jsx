import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isAuthConfigured } from '../../services/supabase.js';

const AuthContext = createContext(null);

const notConfigured = () => ({ error: { message: 'Sign-in is not set up yet.' } });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isAuthConfigured);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isAuthConfigured,
      async signUp({ email, password, displayName }) {
        if (!supabase) return notConfigured();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        // No session means the project requires email confirmation first.
        return { error, needsConfirmation: !error && !data.session };
      },
      async signIn({ email, password }) {
        if (!supabase) return notConfigured();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
