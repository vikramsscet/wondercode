-- Visual explanations (Prompt 28): teacher answers may carry a structured visual (steps, flow,
-- input/output examples). It is validated by the API before it is stored and drawn by our own
-- components; it is never HTML. Nullable, so existing messages are unaffected.
alter table public.teacher_messages add column visual jsonb;
alter table public.teacher_messages
  add constraint teacher_messages_visual_size check (visual is null or pg_column_size(visual) <= 8192);
