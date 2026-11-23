-- AI teacher conversations (Prompt 27). One conversation belongs to one project and exactly one
-- owner (child profile or guest session). Only allowed questions and answers are stored; blocked
-- or invalid questions never are. Messages expire (retention) and are purged by a script.

create table public.teacher_conversations (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid references public.child_profiles (id) on delete cascade,
  guest_session_id uuid references public.guest_sessions (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  explanation_language text not null check (explanation_language in ('en', 'hi', 'hinglish')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint teacher_conversations_one_owner check ((child_profile_id is null) <> (guest_session_id is null))
);
create index teacher_conversations_child_idx
  on public.teacher_conversations (child_profile_id, project_id, last_message_at desc);
create index teacher_conversations_guest_idx
  on public.teacher_conversations (guest_session_id, project_id, last_message_at desc);

create table public.teacher_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.teacher_conversations (id) on delete cascade,
  role text not null check (role in ('child', 'teacher')),
  content text not null check (char_length(content) between 1 and 2000),
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null -- retention: set by the API (default 30 days)
);
create index teacher_messages_conversation_idx on public.teacher_messages (conversation_id, created_at);
create index teacher_messages_expiry_idx on public.teacher_messages (expires_at);
create trigger teacher_messages_immutable before update on public.teacher_messages
  for each row execute function public.prevent_update();

-- Deny by default. No policies on purpose: only the API (service role) reads or writes chats,
-- and it checks ownership. Parent access to chats is a separate product decision.
alter table public.teacher_conversations enable row level security;
alter table public.teacher_messages enable row level security;
revoke all on public.teacher_conversations from anon;
revoke all on public.teacher_messages from anon;
