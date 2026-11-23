// Teacher conversations. Every read is scoped by owner (child profile or guest session).
const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};
const ownerColumn = (owner) =>
  owner.childProfileId
    ? ['child_profile_id', owner.childProfileId]
    : ['guest_session_id', owner.guestSessionId];

export async function findConversation(supabase, owner, id) {
  const [col, val] = ownerColumn(owner);
  return check(
    await supabase
      .from('teacher_conversations')
      .select('*')
      .eq('id', id)
      .eq(col, val)
      .maybeSingle(),
  );
}

export async function findLatestConversation(supabase, owner, projectId) {
  const [col, val] = ownerColumn(owner);
  const rows = check(
    await supabase
      .from('teacher_conversations')
      .select('*')
      .eq(col, val)
      .eq('project_id', projectId)
      .order('last_message_at', { ascending: false }),
  );
  return rows[0] ?? null;
}

export async function insertConversation(supabase, owner, row) {
  return check(
    await supabase
      .from('teacher_conversations')
      .insert({
        child_profile_id: owner.childProfileId ?? null,
        guest_session_id: owner.guestSessionId ?? null,
        ...row,
      })
      .select('*')
      .single(),
  );
}

export async function touchConversation(supabase, id, at) {
  return check(
    await supabase.from('teacher_conversations').update({ last_message_at: at }).eq('id', id),
  );
}

// Messages that have not expired, oldest first.
export async function listMessages(supabase, conversationId, nowIso) {
  const rows = check(
    await supabase
      .from('teacher_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at'),
  );
  return rows.filter((m) => m.expires_at > nowIso);
}

export async function insertMessages(supabase, rows) {
  return check(await supabase.from('teacher_messages').insert(rows).select('*'));
}

export async function deleteConversation(supabase, id) {
  check(await supabase.from('teacher_messages').delete().eq('conversation_id', id));
  return check(await supabase.from('teacher_conversations').delete().eq('id', id));
}

// AI answers given to this owner since `sinceIso` (from the usage meter).
export async function countAnswersSince(supabase, owner, sinceIso) {
  const [col, val] = ownerColumn(owner);
  const { count, error } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq(col, val)
    .eq('event_type', 'ai.teacher_answer')
    .gte('created_at', sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function deleteExpiredMessages(supabase, nowIso) {
  return check(
    await supabase.from('teacher_messages').delete().lt('expires_at', nowIso).select('id'),
  );
}
export async function deleteIdleConversations(supabase, cutoffIso) {
  return check(
    await supabase
      .from('teacher_conversations')
      .delete()
      .lt('last_message_at', cutoffIso)
      .select('id'),
  );
}
