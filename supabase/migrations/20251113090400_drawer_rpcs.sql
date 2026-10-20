-- =============================================================================
-- FR-02 – Memory Drawers
-- RPCs used by the Android client.
--
--  * list_drawers()                 – owned + ACCEPTED shared drawers, owner name,
--                                     photo count and the caller's permission
--  * get_drawer(p_drawer_id)        – single accessible drawer
--  * find_share_recipient(p_email)  – resolve an email to a profile (exact match)
--  * share_drawer(p_drawer_id, p_email, p_permission)
--                                   – owner-only; creates a PENDING invitation
--  * respond_share_invitation(p_share_id, p_accept)
--                                   – recipient-only; accept/reject (T-02.22)
--  * list_share_invitations()       – pending invitations for the caller (T-02.23)
--  * list_drawer_shares(p_drawer_id)– owner-only share list incl. status
-- =============================================================================

-- -----------------------------------------------------------------------------
-- list_drawers
-- -----------------------------------------------------------------------------
drop function if exists public.list_drawers();
create function public.list_drawers()
returns table (
    id uuid,
    owner_id uuid,
    owner_name text,
    name text,
    description text,
    cover_photo_url text,
    storage_used_bytes bigint,
    storage_limit_bytes bigint,
    is_purchased boolean,
    created_at timestamptz,
    updated_at timestamptz,
    photo_count bigint,
    is_owner boolean,
    permission text
)
language sql
security definer
set search_path = ''
stable
as $$
    select
        d.id,
        d.owner_id,
        p.display_name as owner_name,
        d.name,
        d.description,
        d.cover_photo_url,
        d.storage_used_bytes,
        d.storage_limit_bytes,
        d.is_purchased,
        d.created_at,
        d.updated_at,
        (select count(*) from public.photos ph where ph.drawer_id = d.id) as photo_count,
        d.owner_id = auth.uid() as is_owner,
        case
            when d.owner_id = auth.uid() then 'owner'
            else (
                select s.permission
                from public.drawer_shares s
                where s.drawer_id = d.id
                  and s.shared_with_id = auth.uid()
                  and s.status = 'accepted'
                limit 1
            )
        end as permission
    from public.drawers d
    join public.profiles p on p.id = d.owner_id
    where d.owner_id = auth.uid()
       or exists (
            select 1 from public.drawer_shares s
            where s.drawer_id = d.id
              and s.shared_with_id = auth.uid()
              and s.status = 'accepted'
       )
    order by d.updated_at desc;
$$;

comment on function public.list_drawers() is
    'Drawers visible to the caller (owned + accepted shares) with owner name, photo count and permission.';

-- -----------------------------------------------------------------------------
-- get_drawer
-- -----------------------------------------------------------------------------
drop function if exists public.get_drawer(uuid);
create function public.get_drawer(p_drawer_id uuid)
returns table (
    id uuid,
    owner_id uuid,
    owner_name text,
    name text,
    description text,
    cover_photo_url text,
    storage_used_bytes bigint,
    storage_limit_bytes bigint,
    is_purchased boolean,
    created_at timestamptz,
    updated_at timestamptz,
    photo_count bigint,
    is_owner boolean,
    permission text
)
language sql
security definer
set search_path = ''
stable
as $$
    select
        d.id,
        d.owner_id,
        p.display_name as owner_name,
        d.name,
        d.description,
        d.cover_photo_url,
        d.storage_used_bytes,
        d.storage_limit_bytes,
        d.is_purchased,
        d.created_at,
        d.updated_at,
        (select count(*) from public.photos ph where ph.drawer_id = d.id) as photo_count,
        d.owner_id = auth.uid() as is_owner,
        case
            when d.owner_id = auth.uid() then 'owner'
            else (
                select s.permission
                from public.drawer_shares s
                where s.drawer_id = d.id
                  and s.shared_with_id = auth.uid()
                  and s.status = 'accepted'
                limit 1
            )
        end as permission
    from public.drawers d
    join public.profiles p on p.id = d.owner_id
    where d.id = p_drawer_id
      and (
          d.owner_id = auth.uid()
          or exists (
              select 1 from public.drawer_shares s
              where s.drawer_id = d.id
                and s.shared_with_id = auth.uid()
                and s.status = 'accepted'
          )
      );
$$;

comment on function public.get_drawer(uuid) is
    'Single drawer the caller can access, with owner name, photo count and permission.';

-- -----------------------------------------------------------------------------
-- find_share_recipient
-- -----------------------------------------------------------------------------
drop function if exists public.find_share_recipient(text);
create function public.find_share_recipient(p_email text)
returns table (id uuid, display_name text, email text)
language sql
security definer
set search_path = ''
stable
as $$
    select p.id, p.display_name, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(u.email) = lower(trim(p_email))
      and p.id <> auth.uid()
    limit 1;
$$;

comment on function public.find_share_recipient(text) is
    'Resolve an exact email to a profile so the owner can invite that user. Never lists users.';

-- -----------------------------------------------------------------------------
-- share_drawer – creates a pending invitation (T-02.21)
-- -----------------------------------------------------------------------------
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

    select d.owner_id into drawer_owner
    from public.drawers d
    where d.id = p_drawer_id;

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

comment on function public.share_drawer(uuid, text, text) is
    'Owner-only: resolve recipient email and create/update a PENDING share invitation.';

-- -----------------------------------------------------------------------------
-- respond_share_invitation (T-02.22)
-- -----------------------------------------------------------------------------
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
    select * into invitation
    from public.drawer_shares s
    where s.id = p_share_id;

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

comment on function public.respond_share_invitation(uuid, boolean) is
    'Recipient-only: accept or reject a pending drawer invitation.';

-- -----------------------------------------------------------------------------
-- list_share_invitations (T-02.23)
-- -----------------------------------------------------------------------------
drop function if exists public.list_share_invitations();
create function public.list_share_invitations()
returns table (
    id uuid,
    drawer_id uuid,
    drawer_name text,
    owner_name text,
    permission text,
    status text,
    created_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
    select
        s.id,
        s.drawer_id,
        d.name as drawer_name,
        p.display_name as owner_name,
        s.permission,
        s.status,
        s.created_at
    from public.drawer_shares s
    join public.drawers d on d.id = s.drawer_id
    join public.profiles p on p.id = s.owner_id
    where s.shared_with_id = auth.uid()
      and s.status = 'pending'
    order by s.created_at desc;
$$;

comment on function public.list_share_invitations() is
    'Pending drawer invitations for the caller (settings / memories tab badge).';

-- -----------------------------------------------------------------------------
-- list_drawer_shares
-- -----------------------------------------------------------------------------
drop function if exists public.list_drawer_shares(uuid);
create function public.list_drawer_shares(p_drawer_id uuid)
returns table (
    id uuid,
    shared_with_id uuid,
    email text,
    display_name text,
    permission text,
    status text,
    created_at timestamptz
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

comment on function public.list_drawer_shares(uuid) is
    'Owner-only share list (recipient email + display name + permission + invitation status).';

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------
revoke all on function public.list_drawers() from public;
revoke all on function public.get_drawer(uuid) from public;
revoke all on function public.find_share_recipient(text) from public;
revoke all on function public.share_drawer(uuid, text, text) from public;
revoke all on function public.respond_share_invitation(uuid, boolean) from public;
revoke all on function public.list_share_invitations() from public;
revoke all on function public.list_drawer_shares(uuid) from public;

grant execute on function public.list_drawers() to authenticated;
grant execute on function public.get_drawer(uuid) to authenticated;
grant execute on function public.find_share_recipient(text) to authenticated;
grant execute on function public.share_drawer(uuid, text, text) to authenticated;
grant execute on function public.respond_share_invitation(uuid, boolean) to authenticated;
grant execute on function public.list_share_invitations() to authenticated;
grant execute on function public.list_drawer_shares(uuid) to authenticated;
