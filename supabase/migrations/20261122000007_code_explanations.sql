-- Versioned code explanations (Prompt 25). Each row is bound to one saved version, file, line range
-- and the sha-256 of exactly those lines. Rows are immutable: changed code gets a new version.

create table public.code_explanations (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid references public.child_profiles (id) on delete cascade,
  guest_session_id uuid references public.guest_sessions (id) on delete cascade,
  version_id uuid not null references public.project_versions (id) on delete cascade,
  file_path text not null check (file_path ~ '^[A-Za-z0-9._-]{1,64}$'),
  line_start integer not null check (line_start >= 1),
  line_end integer not null check (line_end >= line_start and line_end - line_start < 40),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  explanation_language text not null check (explanation_language in ('en', 'hi', 'hinglish')),
  explanation_payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint code_explanations_one_owner check ((child_profile_id is null) <> (guest_session_id is null)),
  constraint code_explanations_binding unique
    (version_id, file_path, line_start, line_end, code_hash, explanation_language)
);
create index code_explanations_version_idx on public.code_explanations (version_id);
create trigger code_explanations_immutable before update on public.code_explanations
  for each row execute function public.prevent_update();

alter table public.code_explanations enable row level security;
-- New tables get default grants for anon in Supabase: remove them.
revoke all on public.code_explanations from anon;

-- Parents may read their own children's explanations; writes go through the API (service role).
create policy explanations_select_parent on public.code_explanations for select to authenticated
  using (child_profile_id is not null and public.owns_child(child_profile_id));
