-- Parent accounts, child profiles, guest sessions, consent.
-- Children have no credentials: they are profiles managed by a parent (ADR 0004).

create table public.parent_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  ui_language text not null default 'en' check (ui_language in ('en', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger parent_profiles_updated_at before update on public.parent_profiles
  for each row execute function public.set_updated_at();

-- Create the parent profile automatically when a Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.parent_profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 60), ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(), -- the child_profile_id
  parent_id uuid not null references public.parent_profiles (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  age smallint not null check (age between 8 and 12),
  -- Allowed keys live in the app (shared avatar list); the DB only checks the format.
  avatar_key text not null check (avatar_key ~ '^[a-z0-9-]{1,40}$'),
  explanation_language text not null default 'en' check (explanation_language in ('en', 'hi', 'hinglish')),
  -- Tags from a fixed app-side list; at most 5.
  interests text[] not null default '{}'
    check (
      cardinality(interests) <= 5
      and array_to_string(interests, ',') ~ '^([a-z0-9-]{1,30}(,[a-z0-9-]{1,30})*)?$'
    ),
  deleted_at timestamptz, -- soft delete; a purge job hard-deletes later
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index child_profiles_parent_idx on public.child_profiles (parent_id) where deleted_at is null;
create index child_profiles_deleted_idx on public.child_profiles (deleted_at) where deleted_at is not null;
create trigger child_profiles_updated_at before update on public.child_profiles
  for each row execute function public.set_updated_at();

create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash text not null unique, -- hash only; never the raw token
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  usage_limit integer not null default 10 check (usage_limit >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index guest_sessions_expires_idx on public.guest_sessions (expires_at);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parent_profiles (id) on delete cascade,
  consent_type text not null check (consent_type ~ '^[a-z_]{1,50}$'),
  policy_version text not null check (char_length(policy_version) between 1 and 30),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index consent_records_parent_idx on public.consent_records (parent_id);
