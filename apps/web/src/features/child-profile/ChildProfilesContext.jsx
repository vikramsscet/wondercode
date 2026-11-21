import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiRequest } from '../../services/apiClient.js';
import { useAuth } from '../auth/AuthContext.jsx';

const ChildProfilesContext = createContext(null);
const STORAGE_KEY = 'wondercode.activeChild';

// Per tab; storage may be blocked, so never throw.
const readActive = () => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
const writeActive = (id) => {
  try {
    if (id) window.sessionStorage.setItem(STORAGE_KEY, id);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

// Loads the signed-in parent's children and tracks which one is active.
// The stored id is only a hint: the active child is whichever stored id is in the parent's list.
export function ChildProfilesProvider({ children: content }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [activeId, setActiveId] = useState(readActive);
  const [data, setData] = useState({ userId: null, list: null, error: '' });

  const fetchInto = useCallback(
    () =>
      apiRequest('/children').then(
        (list) => setData({ userId, list, error: '' }),
        () =>
          setData({
            userId,
            list: null,
            error: "We couldn't load the profiles. Please try again.",
          }),
      ),
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      writeActive(null); // signed out: forget the active child
      return undefined;
    }
    let live = true;
    apiRequest('/children').then(
      (list) => live && setData({ userId, list, error: '' }),
      () =>
        live &&
        setData({ userId, list: null, error: "We couldn't load the profiles. Please try again." }),
    );
    return () => {
      live = false;
    };
  }, [userId]);

  const current = data.userId === userId;
  const list = userId && current ? data.list : null;
  const active = list?.find((child) => child.id === activeId) ?? null;

  const select = useCallback(
    (id) => {
      if (!list?.some((child) => child.id === id)) return;
      writeActive(id);
      setActiveId(id);
    },
    [list],
  );

  const clear = useCallback(() => {
    writeActive(null);
    setActiveId(null);
  }, []);

  const addChild = useCallback(
    async (input) => {
      try {
        const child = await apiRequest('/children', { method: 'POST', body: input });
        await fetchInto();
        return { ok: true, child };
      } catch (err) {
        const message =
          err instanceof ApiError && err.code === 'CHILD_LIMIT_REACHED'
            ? err.message
            : "We couldn't save that profile. Please check the details and try again.";
        return { ok: false, message };
      }
    },
    [fetchInto],
  );

  const updateChild = useCallback(
    async (id, input) => {
      try {
        await apiRequest(`/children/${id}`, { method: 'PATCH', body: input });
        await fetchInto();
        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "We couldn't save the changes. Please check the details and try again.",
        };
      }
    },
    [fetchInto],
  );

  const deleteChild = useCallback(
    async (id) => {
      try {
        await apiRequest(`/children/${id}`, { method: 'DELETE' });
        if (readActive() === id) {
          writeActive(null);
          setActiveId(null);
        }
        await fetchInto();
        return { ok: true };
      } catch {
        return { ok: false, message: "We couldn't delete that profile. Please try again." };
      }
    },
    [fetchInto],
  );

  const value = useMemo(
    () => ({
      children: list,
      active,
      loading: Boolean(userId) && !current,
      error: current ? data.error : '',
      select,
      clear,
      addChild,
      updateChild,
      deleteChild,
      reload: fetchInto,
    }),
    [
      list,
      active,
      userId,
      current,
      data.error,
      select,
      clear,
      addChild,
      updateChild,
      deleteChild,
      fetchInto,
    ],
  );

  return <ChildProfilesContext.Provider value={value}>{content}</ChildProfilesContext.Provider>;
}

export function useChildProfiles() {
  const ctx = useContext(ChildProfilesContext);
  if (!ctx) throw new Error('useChildProfiles must be used inside <ChildProfilesProvider>');
  return ctx;
}
