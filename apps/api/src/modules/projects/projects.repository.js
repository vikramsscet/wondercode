// Project persistence. Every read is scoped by owner (child profile or guest session).
const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const ownerColumn = (owner) =>
  owner.childProfileId
    ? ['child_profile_id', owner.childProfileId]
    : ['guest_session_id', owner.guestSessionId];

export async function countChildProjects(supabase, childId) {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('child_profile_id', childId)
    .eq('status', 'active');
  if (error) throw error;
  return count ?? 0;
}

export async function insertProject(supabase, row) {
  return check(await supabase.from('projects').insert(row).select('*').single());
}
export async function insertVersion(supabase, row) {
  return check(await supabase.from('project_versions').insert(row).select('*').single());
}
export async function insertFiles(supabase, rows) {
  return check(await supabase.from('project_files').insert(rows).select('*'));
}
export async function setCurrentVersion(supabase, projectId, versionId) {
  return check(
    await supabase.from('projects').update({ current_version_id: versionId }).eq('id', projectId),
  );
}
export async function deleteProject(supabase, projectId) {
  // Versions and files are removed by ON DELETE CASCADE.
  return check(await supabase.from('projects').delete().eq('id', projectId));
}

export async function findOwnedProject(supabase, owner, projectId) {
  const [col, id] = ownerColumn(owner);
  return check(
    await supabase.from('projects').select('*').eq('id', projectId).eq(col, id).maybeSingle(),
  );
}
export async function findVersion(supabase, versionId) {
  return check(
    await supabase.from('project_versions').select('*').eq('id', versionId).maybeSingle(),
  );
}
export async function listFiles(supabase, versionId) {
  return check(
    await supabase.from('project_files').select('*').eq('version_id', versionId).order('file_path'),
  );
}

// ----- versions (Prompt 29) -----
export async function listVersionNumbers(supabase, projectId) {
  const rows = check(
    await supabase
      .from('project_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false }),
  );
  return rows.map((r) => r.version_number);
}

// Moves the project to a new version only if it is still on `fromVersionId` (compare-and-set).
// Returns the updated rows: empty means somebody else changed the project first.
export async function setCurrentVersionIf(supabase, projectId, fromVersionId, toVersionId) {
  return check(
    await supabase
      .from('projects')
      .update({ current_version_id: toVersionId })
      .eq('id', projectId)
      .eq('current_version_id', fromVersionId)
      .select('id'),
  );
}

// Removes a version that was never made current (cleanup after a failed save).
export async function deleteVersion(supabase, versionId) {
  check(await supabase.from('project_files').delete().eq('version_id', versionId));
  return check(await supabase.from('project_versions').delete().eq('id', versionId));
}
