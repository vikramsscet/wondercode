// Verifies the URL and service-role key without needing any application tables:
// it asks Supabase Auth for one user (valid only with a working admin key).
// Returns a result object; never includes keys or raw provider errors.
export async function checkSupabaseConnection(client) {
  try {
    const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      return {
        ok: false,
        reason: error.status === 401 || error.status === 403 ? 'invalid_key' : 'request_failed',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}
