-- Append-only usage accounting for quotas. metadata must never hold prompts or child content.

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid references public.child_profiles (id) on delete cascade,
  guest_session_id uuid references public.guest_sessions (id) on delete cascade,
  event_type text not null check (event_type ~ '^[a-z_.]{1,50}$'),
  units integer not null default 1 check (units >= 0),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint usage_events_one_owner check ((child_profile_id is null) <> (guest_session_id is null))
);
create index usage_events_child_idx on public.usage_events (child_profile_id, created_at desc);
create index usage_events_guest_idx on public.usage_events (guest_session_id, created_at desc);
create trigger usage_events_immutable before update on public.usage_events
  for each row execute function public.prevent_update();
