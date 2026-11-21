-- Shared helpers. gen_random_uuid() is built in (Postgres 13+).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Used on tables whose rows must never change after insert.
create or replace function public.prevent_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = 'restrict_violation';
end;
$$;
