-- Row Level Security: deny by default. This is defence in depth: the API uses the service role
-- and enforces parent -> child -> project ownership itself. Children are not Auth users, so RLS
-- can only express parent-level access (auth.uid()).

alter table public.parent_profiles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.guest_sessions enable row level security;
alter table public.consent_records enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.project_files enable row level security;
alter table public.learning_concepts enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_steps enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.learning_progress enable row level security;
alter table public.usage_events enable row level security;

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;

create or replace function public.owns_child(p_child_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.child_profiles c
    where c.id = p_child_id and c.parent_id = (select auth.uid()) and c.deleted_at is null
  );
$$;

-- Parent
create policy parent_select_own on public.parent_profiles for select to authenticated
  using (id = (select auth.uid()));
create policy parent_update_own on public.parent_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Children (parent manages; soft delete is an update of deleted_at)
create policy child_select_own on public.child_profiles for select to authenticated
  using (parent_id = (select auth.uid()) and deleted_at is null);
create policy child_insert_own on public.child_profiles for insert to authenticated
  with check (parent_id = (select auth.uid()));
create policy child_update_own on public.child_profiles for update to authenticated
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));

-- Consent
create policy consent_select_own on public.consent_records for select to authenticated
  using (parent_id = (select auth.uid()));
create policy consent_insert_own on public.consent_records for insert to authenticated
  with check (parent_id = (select auth.uid()));

-- Child-owned data: parents may read their own children's rows. Writes go through the API.
create policy projects_select_parent on public.projects for select to authenticated
  using (child_profile_id is not null and public.owns_child(child_profile_id));
create policy versions_select_parent on public.project_versions for select to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and p.child_profile_id is not null
                   and public.owns_child(p.child_profile_id)));
create policy files_select_parent on public.project_files for select to authenticated
  using (exists (select 1 from public.project_versions v
                 join public.projects p on p.id = v.project_id
                 where v.id = version_id and p.child_profile_id is not null
                   and public.owns_child(p.child_profile_id)));
create policy attempts_select_parent on public.challenge_attempts for select to authenticated
  using (public.owns_child(child_profile_id));
create policy progress_select_parent on public.learning_progress for select to authenticated
  using (public.owns_child(child_profile_id));

-- Catalog: readable by signed-in users; written only with the service role.
create policy concepts_read on public.learning_concepts for select to authenticated using (true);
create policy paths_read on public.learning_paths for select to authenticated using (is_published);
create policy steps_read on public.learning_path_steps for select to authenticated using (true);
create policy challenges_read on public.challenges for select to authenticated using (is_published);

-- guest_sessions and usage_events: no policies on purpose (service role only).
