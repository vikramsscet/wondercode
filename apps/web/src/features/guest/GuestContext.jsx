import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ApiError, apiRequest } from '../../services/apiClient.js';

const GuestContext = createContext(null);
const STORAGE_KEY = 'wondercode.guest';

// sessionStorage is per tab and cleared when the tab closes; storage can be blocked, so never throw.
const storage = {
  read() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
      if (saved?.token && new Date(saved.expiresAt) > new Date()) return saved;
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return null;
  },
  write(value) {
    try {
      if (value) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

const friendlyError = (err) => {
  if (err instanceof ApiError && err.status === 429) {
    return 'Lots of explorers are visiting right now. Please try again in a little while.';
  }
  return "We couldn't start your visit. Please try again.";
};

export function GuestProvider({ children }) {
  const [guest, setGuest] = useState(() => storage.read());

  const start = useCallback(async () => {
    try {
      const data = await apiRequest('/auth/guest-session', { method: 'POST' });
      const next = { token: data.token, expiresAt: data.expiresAt, limits: data.limits };
      storage.write(next);
      setGuest(next);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: friendlyError(err) };
    }
  }, []);

  const end = useCallback(async () => {
    const current = guest;
    storage.write(null);
    setGuest(null);
    if (current) {
      try {
        await apiRequest('/auth/guest-session', { method: 'DELETE', guestToken: current.token });
      } catch {
        // The session expires on its own; nothing to show the child.
      }
    }
  }, [guest]);

  const value = useMemo(() => ({ guest, start, end }), [guest, start, end]);
  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest must be used inside <GuestProvider>');
  return ctx;
}
