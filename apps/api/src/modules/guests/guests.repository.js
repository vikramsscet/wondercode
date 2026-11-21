// Guest session persistence. Only token hashes are stored, never the token.
const COLUMNS = 'id, status, usage_limit, created_at, expires_at';

const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export async function insertGuest(supabase, row) {
  return check(await supabase.from('guest_sessions').insert(row).select(COLUMNS).single());
}

export async function findGuestByTokenHash(supabase, tokenHash) {
  return check(
    await supabase
      .from('guest_sessions')
      .select(COLUMNS)
      .eq('session_token_hash', tokenHash)
      .maybeSingle(),
  );
}

export async function deleteGuest(supabase, guestId) {
  return check(await supabase.from('guest_sessions').delete().eq('id', guestId).select('id'));
}

export async function countGuestProjects(supabase, guestId) {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('guest_session_id', guestId);
  if (error) throw error;
  return count ?? 0;
}

// Cascades to the guest's projects, versions, files and usage rows.
export async function deleteExpiredGuests(supabase, nowIso) {
  return check(
    await supabase.from('guest_sessions').delete().lt('expires_at', nowIso).select('id'),
  );
}
