import { env } from '../config/env.js';
import { supabase } from './supabase.js';

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Calls the WonderCode API with the parent's access token (or a guest token when given), plus the active child id when acting for a child. Unwraps the standard envelope.
export async function apiRequest(path, { method = 'GET', body, guestToken, childId } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (guestToken) {
    headers['X-Guest-Token'] = guestToken; // guests never send a parent token
  } else if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
    if (childId) headers['X-Child-Id'] = childId; // the API re-checks the child belongs to this parent
  }
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok || !json?.success) {
    const e = json?.error;
    throw new ApiError(
      res.status,
      e?.code ?? 'UNKNOWN',
      e?.message ?? 'Something went wrong.',
      e?.details,
    );
  }
  return json.data;
}
