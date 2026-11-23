// Explanation rows. Callers have already verified project ownership; rows also carry the owner.
const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export async function findExplanation(supabase, key) {
  return check(
    await supabase
      .from('code_explanations')
      .select('*')
      .eq('version_id', key.versionId)
      .eq('file_path', key.filePath)
      .eq('line_start', key.lineStart)
      .eq('line_end', key.lineEnd)
      .eq('code_hash', key.codeHash)
      .eq('explanation_language', key.language)
      .maybeSingle(),
  );
}

export async function insertExplanation(supabase, row) {
  return check(await supabase.from('code_explanations').insert(row).select('*').single());
}

export async function listExplanations(supabase, versionId) {
  return check(
    await supabase
      .from('code_explanations')
      .select('*')
      .eq('version_id', versionId)
      .order('created_at'),
  );
}
