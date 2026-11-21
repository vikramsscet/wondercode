// All child queries are scoped by parent_id and exclude soft-deleted rows.
// This is the isolation boundary: never query child_profiles without these filters.
const COLUMNS =
  'id, display_name, age, avatar_key, explanation_language, interests, created_at, updated_at';

const owned = (query, parentId) => query.eq('parent_id', parentId).is('deleted_at', null);

const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const toChild = (row) => ({
  id: row.id,
  displayName: row.display_name,
  age: row.age,
  avatarKey: row.avatar_key,
  explanationLanguage: row.explanation_language,
  interests: row.interests,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listChildren(supabase, parentId) {
  const query = supabase.from('child_profiles').select(COLUMNS);
  return check(await owned(query, parentId).order('created_at', { ascending: true }));
}

export async function countChildren(supabase, parentId) {
  const query = supabase.from('child_profiles').select('id', { count: 'exact', head: true });
  const { count, error } = await owned(query, parentId);
  if (error) throw error;
  return count ?? 0;
}

export async function findChild(supabase, parentId, childId) {
  const query = supabase.from('child_profiles').select(COLUMNS).eq('id', childId);
  return check(await owned(query, parentId).maybeSingle());
}

export async function insertChild(supabase, row) {
  return check(await supabase.from('child_profiles').insert(row).select(COLUMNS).single());
}

export async function updateChild(supabase, parentId, childId, patch) {
  const query = supabase.from('child_profiles').update(patch).eq('id', childId);
  return check(await owned(query, parentId).select(COLUMNS).maybeSingle());
}

export async function softDeleteChild(supabase, parentId, childId) {
  const query = supabase
    .from('child_profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', childId);
  return check(await owned(query, parentId).select('id').maybeSingle());
}
