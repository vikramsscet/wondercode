// Only this layer talks to the database for auth/profile data.
export async function findParentProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('parent_profiles')
    .select('id, display_name, ui_language, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
