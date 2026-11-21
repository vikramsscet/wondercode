import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useGuest } from './GuestContext.jsx';

const MAX_TIMER_MS = 2 ** 31 - 1;

// Guest-only area. Redirects home when there is no active guest session or it has run out.
export default function GuestRoute() {
  const { guest, end } = useGuest();

  // When the session runs out, clear it (which also redirects home).
  useEffect(() => {
    if (!guest) return undefined;
    const remaining = new Date(guest.expiresAt).getTime() - Date.now();
    const timer = setTimeout(end, Math.min(Math.max(remaining, 0), MAX_TIMER_MS));
    return () => clearTimeout(timer);
  }, [guest, end]);

  if (!guest || new Date(guest.expiresAt) <= new Date()) return <Navigate to="/" replace />;
  return <Outlet />;
}
