-- =============================================================================
-- FR-02 – Repair migration after on-device testing
--
-- Fixes three deployment/time-order problems:
--   1) Signup used to pre-create 3 placeholder drawers which consumed the whole
--      free-tier quota, so brand-new accounts could never create a drawer.
--   2) Databases migrated from the first FR-02 draft had drawer_shares without
--      `status`, so every share was visible to everyone and there was no
--      invitation confirmation step.
--   3) A legacy docs policy ("Shared users can view drawers") exposed shared
--      drawers regardless of invitation status.
--
-- Idempotent: safe to run on databases created at any point of FR-02.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Signup no longer materialises placeholder drawers. `profiles.max_drawers`
--    stays the creation quota (3), drawers are created on demand (FR-02.2).
-- -----------------------------------------------------------------------------
drop trigger if exists on_profile_created_create_default_drawers on public.profiles;
drop function if exists public.create_default_drawers();

-- Remove the auto-created empty placeholders so existing accounts recover their
-- quota. Strictly limited to untouched, default-named, empty drawers.
delete from public.drawers d
where d.is_purchased = false
  and d.storage_used_bytes = 0
  and d.cover_photo_url is null
  and d.name ~ '^Ngăn kéo kỷ niệm [0-9]+$'
  and not exists (
      select 1 from public.photos p where p.drawer_id = d.id
  );

-- -----------------------------------------------------------------------------
-- 2) Invitation columns (databases migrated from the first FR-02 draft)
--    Existing shares become 'pending' so recipients must confirm them.
-- -----------------------------------------------------------------------------
do $$
begin
    if to_regclass('public.drawer_shares') is not null then
        if not exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'drawer_shares' and column_name = 'status'
        ) then
            alter table public.drawer_shares
                add column status text not null default 'pending';
        end if;

        if not exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'drawer_shares' and column_name = 'responded_at'
        ) then
            alter table public.drawer_shares add column responded_at timestamptz;
        end if;
    end if;
end $$;

do $$
begin
    if to_regclass('public.drawer_shares') is not null
        and not exists (select 1 from pg_constraint where conname = 'drawer_shares_status_check')
    then
        alter table public.drawer_shares
            add constraint drawer_shares_status_check
            check (status in ('pending', 'accepted', 'rejected'));
    end if;
end $$;

create index if not exists idx_shares_pending
    on public.drawer_shares (shared_with_id) where status = 'pending';

-- -----------------------------------------------------------------------------
-- 3) Replace the legacy docs policy (it ignored invitation status) with a
--    status-aware version. Idempotent: recreates the correct policy either way.
-- -----------------------------------------------------------------------------
drop policy if exists "Shared users can view drawers" on public.drawers;
create policy "Shared users can view drawers"
    on public.drawers
    for select
    to authenticated
    using (
        id in (
            select s.drawer_id from public.drawer_shares s
            where s.shared_with_id = (select auth.uid())
              and s.status = 'accepted'
        )
    );

-- -----------------------------------------------------------------------------
-- 4) Re-create the FR-02 RPCs so a partially migrated database converges to the
--    accepted-only behaviour (create or replace is idempotent).
-- -----------------------------------------------------------------------------
drop function if exists public.list_drawers();
create function public.list_drawers()
returns table (
    id uuid, owner_id uuid, owner_name text, name text, description text,
    cover_photo_url text, storage_used_bytes bigint, storage_limit_bytes bigint,
    is_purchased boolean, created_at timestamptz, updated_at timestamptz,
    photo_count bigint, is_owner boolean, permission text
)
language sql
security definer
set search_path = ''
stable
as $$
    select
        d.id, d.owner_id, p.display_name as owner_name, d.name, d.description,
        d.cover_photo_url, d.storage_used_bytes, d.storage_limit_bytes, d.is_purchased,
        d.created_at, d.updated_at,
        (select count(*) from public.photos ph where ph.drawer_id = d.id) as photo_count,
        d.owner_id = auth.uid() as is_owner,
        case
            when d.owner_id = auth.uid() then 'owner'
            else (
                select s.permission from public.drawer_shares s
                where s.drawer_id = d.id and s.shared_with_id = auth.uid()
                  and s.status = 'accepted'
                limit 1
            )
        end as permission
    from public.drawers d
    join public.profiles p on p.id = d.owner_id
    where auth.uid() is not null
      and (d.owner_id = auth.uid()
       or exists (
            select 1 from public.drawer_shares s
            where s.drawer_id = d.id and s.shared_with_id = auth.uid()
              and s.status = 'accepted'
       ))
    order by d.updated_at desc;
$$;

drop function if exists public.get_drawer(uuid);
create function public.get_drawer(p_drawer_id uuid)
returns table (
    id uuid, owner_id uuid, owner_name text, name text, description text,
    cover_photo_url text, storage_used_bytes bigint, storage_limit_bytes bigint,
    is_purchased boolean, created_at timestamptz, updated_at timestamptz,
    photo_count bigint, is_owner boolean, permission text
)
language sql
security definer
set search_path = ''
stable
as $$
    select
        d.id, d.owner_id, p.display_name as owner_name, d.name, d.description,
        d.cover_photo_url, d.storage_used_bytes, d.storage_limit_bytes, d.is_purchased,
        d.created_at, d.updated_at,
        (select count(*) from public.photos ph where ph.drawer_id = d.id) as photo_count,
        d.owner_id = auth.uid() as is_owner,
        case
            when d.owner_id = auth.uid() then 'owner'
            else (
                select s.permission from public.drawer_shares s
                where s.drawer_id = d.id and s.shared_with_id = auth.uid()
                  and s.status = 'accepted'
                limit 1
            )
        end as permission
    from public.drawers d
    join public.profiles p on p.id = d.owner_id
    where d.id = p_drawer_id
      and auth.uid() is not null
      and (
          d.owner_id = auth.uid()
          or exists (
              select 1 from public.drawer_shares s
              where s.drawer_id = d.id and s.shared_with_id = auth.uid()
                and s.status = 'accepted'
          )
      );
$$;

drop function if exists public.share_drawer(uuid, text, text);
create function public.share_drawer(
    p_drawer_id uuid,
    p_email text,
    p_permission text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    drawer_owner uuid;
    recipient uuid;
    share_id uuid;
begin
    if p_permission is null or p_permission not in ('view', 'edit') then
        raise exception 'permission must be view or edit' using errcode = 'invalid_parameter_value';
    end if;

    select d.owner_id into drawer_owner from public.drawers d where d.id = p_drawer_id;
    if drawer_owner is null then
        raise exception 'drawer not found' using errcode = 'no_data_found';
    end if;
    if drawer_owner <> auth.uid() then
        raise exception 'only the drawer owner can share it' using errcode = 'insufficient_privilege';
    end if;

    select p.id into recipient
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(u.email) = lower(trim(p_email))
    limit 1;

    if recipient is null then
        raise exception 'no Pause user with that email' using errcode = 'no_data_found';
    end if;
    if recipient = drawer_owner then
        raise exception 'cannot share a drawer with yourself' using errcode = 'invalid_parameter_value';
    end if;

    insert into public.drawer_shares (drawer_id, owner_id, shared_with_id, permission, status)
    values (p_drawer_id, drawer_owner, recipient, p_permission, 'pending')
    on conflict on constraint drawer_shares_unique_recipient
        do update set permission = excluded.permission,
                      status = case
                          when public.drawer_shares.status = 'accepted' then 'accepted'
                          else 'pending'
                      end,
                      responded_at = case
                          when public.drawer_shares.status = 'accepted' then public.drawer_shares.responded_at
                          else null
                      end
    returning id into share_id;

    return share_id;
end;
$$;

drop function if exists public.respond_share_invitation(uuid, boolean);
create function public.respond_share_invitation(
    p_share_id uuid,
    p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    invitation public.drawer_shares%rowtype;
begin
    select * into invitation from public.drawer_shares s where s.id = p_share_id;
    if invitation.id is null then
        raise exception 'invitation not found' using errcode = 'no_data_found';
    end if;
    if invitation.shared_with_id <> auth.uid() then
        raise exception 'only the invited user can respond to this invitation'
            using errcode = 'insufficient_privilege';
    end if;
    if invitation.status <> 'pending' then
        raise exception 'invitation was already answered' using errcode = 'check_violation';
    end if;

    update public.drawer_shares
    set status = case when p_accept then 'accepted' else 'rejected' end,
        responded_at = now()
    where id = p_share_id;
end;
$$;

drop function if exists public.list_share_invitations();
create function public.list_share_invitations()
returns table (
    id uuid, drawer_id uuid, drawer_name text, owner_name text,
    permission text, status text, created_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
    select s.id, s.drawer_id, d.name as drawer_name, p.display_name as owner_name,
           s.permission, s.status, s.created_at
    from public.drawer_shares s
    join public.drawers d on d.id = s.drawer_id
    join public.profiles p on p.id = s.owner_id
    where s.shared_with_id = auth.uid()
      and s.status = 'pending'
    order by s.created_at desc;
$$;

drop function if exists public.list_drawer_shares(uuid);
create function public.list_drawer_shares(p_drawer_id uuid)
returns table (
    id uuid, shared_with_id uuid, email text, display_name text,
    permission text, status text, created_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
    select s.id, s.shared_with_id, u.email::text, p.display_name, s.permission, s.status, s.created_at
    from public.drawer_shares s
    join public.profiles p on p.id = s.shared_with_id
    join auth.users u on u.id = s.shared_with_id
    where s.drawer_id = p_drawer_id
      and exists (
          select 1 from public.drawers d
          where d.id = p_drawer_id and d.owner_id = auth.uid()
      )
    order by s.created_at;
$$;

revoke all on function public.list_drawers() from public;
revoke all on function public.get_drawer(uuid) from public;
revoke all on function public.share_drawer(uuid, text, text) from public;
revoke all on function public.respond_share_invitation(uuid, boolean) from public;
revoke all on function public.list_share_invitations() from public;
revoke all on function public.list_drawer_shares(uuid) from public;

grant execute on function public.list_drawers() to authenticated;
grant execute on function public.get_drawer(uuid) to authenticated;
grant execute on function public.share_drawer(uuid, text, text) to authenticated;
grant execute on function public.respond_share_invitation(uuid, boolean) to authenticated;
grant execute on function public.list_share_invitations() to authenticated;
grant execute on function public.list_drawer_shares(uuid) to authenticated;
