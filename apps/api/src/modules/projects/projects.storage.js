const BUCKET = 'project-files';
const CONTENT_TYPES = { html: 'text/html', css: 'text/css', javascript: 'text/javascript' };

// Files live in the private `project-files` bucket and are reached only through the backend.
export async function uploadFile(supabase, key, file) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, Buffer.from(file.content, 'utf8'), {
      contentType: CONTENT_TYPES[file.language],
      upsert: false,
    });
  if (error) throw error;
}

export async function removeFiles(supabase, keys) {
  if (keys.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(keys);
  if (error) throw error;
}

export async function downloadFile(supabase, key) {
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error) throw error;
  return data.text();
}
