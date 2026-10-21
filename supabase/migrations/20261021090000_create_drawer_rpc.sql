-- =============================================================================
-- FR-02 repair: create a drawer and return its display DTO in one request.
--
-- A client-side INSERT followed by get_drawer() can report a failure after the
-- INSERT has already committed. That makes a retry create a duplicate drawer.
-- Keeping both operations in this RPC makes the result atomic from the mobile
-- client's perspective and binds owner_id to the JWT rather than client input.
-- =============================================================================

create or replace function public.create_drawer(
    p_name text,
    p_description text default null
)
returns table (
    id uuid, owner_id uuid, owner_name text, name text, description text,
    cover_photo_url text, storage_used_bytes bigint, storage_limit_bytes bigint,
    is_purchased boolean, created_at timestamptz, updated_at timestamptz,
    photo_count bigint, is_owner boolean, permission text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
    new_drawer_id uuid;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = 'insufficient_privilege';
    end if;

    if nullif(trim(p_name), '') is null then
        raise exception 'drawer name is required' using errcode = 'check_violation';
    end if;

    insert into public.drawers (owner_id, name, description)
    values (auth.uid(), trim(p_name), nullif(trim(p_description), ''))
    returning drawers.id into new_drawer_id;

    return query
    select * from public.get_drawer(new_drawer_id);
end;
$$;

revoke all on function public.create_drawer(text, text) from public;
grant execute on function public.create_drawer(text, text) to authenticated;
