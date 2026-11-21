-- Projects, immutable versions, file manifest, private storage bucket.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid references public.child_profiles (id) on delete cascade,
  guest_session_id uuid references public.guest_sessions (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  project_type text not null default 'other'
    check (project_type in ('game', 'quiz', 'calculator', 'animation', 'webpage', 'other')),
  status text not null default 'active' check (status in ('active', 'archived')),
  current_version_id uuid, -- FK added below (circular reference)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- exactly one owner: a child profile or a guest session
  constraint projects_one_owner check ((child_profile_id is null) <> (guest_session_id is null))
);
create index projects_child_idx on public.projects (child_profile_id, updated_at desc);
create index projects_guest_idx on public.projects (guest_session_id, updated_at desc);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- Versions are only inserted once generation has finished, so there is no status to update.
create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  origin text not null check (origin in ('generated', 'refined', 'edited', 'restored')),
  restored_from_version_id uuid references public.project_versions (id) on delete set null,
  prompt text not null default '' check (char_length(prompt) <= 2000),
  project_plan jsonb,
  language_set text[] not null default '{html,css,javascript}',
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);
create index project_versions_project_idx on public.project_versions (project_id, version_number desc);
create trigger project_versions_immutable before update on public.project_versions
  for each row execute function public.prevent_update();

alter table public.projects
  add constraint projects_current_version_fk
  foreign key (current_version_id) references public.project_versions (id)
  on delete set null deferrable initially deferred;

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.project_versions (id) on delete cascade,
  file_path text not null check (file_path ~ '^[A-Za-z0-9._-]{1,64}$'), -- flat files only in the MVP
  language text not null check (language in ('html', 'css', 'javascript')),
  storage_key text not null unique,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'), -- sha-256 hex
  size_bytes integer not null check (size_bytes between 0 and 204800),
  created_at timestamptz not null default now(),
  unique (version_id, file_path)
);
create index project_files_version_idx on public.project_files (version_id);
create trigger project_files_immutable before update on public.project_files
  for each row execute function public.prevent_update();

-- Private bucket; accessed only through the backend (service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-files', 'project-files', false, 204800,
        array['text/html', 'text/css', 'text/javascript', 'application/javascript', 'text/plain'])
on conflict (id) do nothing;
