// Records AI usage in usage_events (one row per AI call). Never stores prompts, code or responses.
export async function insertUsageEvent(supabase, row) {
  const { error } = await supabase.from('usage_events').insert(row);
  if (error) throw error;
}
