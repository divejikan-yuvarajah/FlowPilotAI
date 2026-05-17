-- ─────────────────────────────────────────────────────────────────────────────
-- Helper functions to expose the user's own auth.sessions rows to the
-- service-role client (the JS SDK's PostgREST layer can't see the auth schema
-- directly). SECURITY DEFINER + service_role-only EXECUTE keeps this safe.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_my_sessions(uid uuid)
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamptz,
  user_agent text,
  ip inet,
  not_after timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select s.id, s.created_at, s.updated_at, s.refreshed_at, s.user_agent, s.ip, s.not_after
  from auth.sessions s
  where s.user_id = uid
  order by s.refreshed_at desc nulls last, s.updated_at desc nulls last, s.created_at desc;
$$;

create or replace function public.revoke_my_session(session_id uuid, uid uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_row boolean;
begin
  delete from auth.sessions where id = session_id and user_id = uid;
  get diagnostics found_row = row_count;
  return found_row;
end;
$$;

create or replace function public.revoke_my_other_sessions(current_session_id uuid, uid uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count int;
begin
  delete from auth.sessions
  where user_id = uid and id <> current_session_id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Tighten access: only service_role (admin client) may invoke these.
revoke execute on function public.get_my_sessions(uuid)                            from public;
revoke execute on function public.revoke_my_session(uuid, uuid)                    from public;
revoke execute on function public.revoke_my_other_sessions(uuid, uuid)             from public;

grant  execute on function public.get_my_sessions(uuid)                            to service_role;
grant  execute on function public.revoke_my_session(uuid, uuid)                    to service_role;
grant  execute on function public.revoke_my_other_sessions(uuid, uuid)             to service_role;
