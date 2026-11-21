-- Learning catalog (shared, seeded) and per-child progress.

create table public.learning_concepts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  title text not null,
  description text not null default '',
  language text not null check (language in ('html', 'css', 'javascript')),
  sort_order integer not null default 0
);

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default true
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  concept_id uuid not null references public.learning_concepts (id) on delete restrict,
  title text not null,
  instructions text not null default '',
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  language text not null check (language in ('html', 'css', 'javascript')),
  starter_files jsonb not null default '[]',
  hints jsonb not null default '[]',
  is_published boolean not null default true
);
create index challenges_concept_idx on public.challenges (concept_id);

create table public.learning_path_steps (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  position integer not null check (position >= 1),
  challenge_id uuid not null references public.challenges (id) on delete restrict,
  unique (path_id, position)
);
create index learning_path_steps_challenge_idx on public.learning_path_steps (challenge_id);

create table public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  attempt_count integer not null default 1 check (attempt_count >= 1),
  hints_used integer not null default 0 check (hints_used >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_profile_id, challenge_id)
);
create index challenge_attempts_challenge_idx on public.challenge_attempts (challenge_id);
create trigger challenge_attempts_updated_at before update on public.challenge_attempts
  for each row execute function public.set_updated_at();

-- Progress records demonstrated evidence, not AI-generated code.
create table public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  concept_id uuid not null references public.learning_concepts (id) on delete cascade,
  mastery_status text not null default 'not_started'
    check (mastery_status in ('not_started', 'exploring', 'practising', 'demonstrated')),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  last_demonstrated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (child_profile_id, concept_id)
);
create index learning_progress_concept_idx on public.learning_progress (concept_id);
create trigger learning_progress_updated_at before update on public.learning_progress
  for each row execute function public.set_updated_at();
