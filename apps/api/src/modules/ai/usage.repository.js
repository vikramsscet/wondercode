// Records AI usage in usage_events (one row per AI call). Never stores prompts, code or responses.
export async function insertUsageEvent(supabase, row) {
  const { error } = await supabase.from('usage_events').insert(row);
  if (error) throw error;
}

// AI calls of one kind made by this owner since `sinceIso` (for daily limits).
export async function countUsageSince(supabase, owner, eventType, sinceIso) {
  const [col, val] = owner.childProfileId
    ? ['child_profile_id', owner.childProfileId]
    : ['guest_session_id', owner.guestSessionId];
  const { count, error } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq(col, val)
    .eq('event_type', eventType)
    .gte('created_at', sinceIso);
  if (error) throw error;
  return count ?? 0;
}
