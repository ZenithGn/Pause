-- =============================================================================
-- FR-02 – Memory Drawers
-- T-02.03 – public.drawer_shares with invitation status + RLS
-- Ref: docs/03-References/db-schema.md (section 4. drawer_shares)
--
-- Sharing is invitation based: the owner invites an email, the recipient must
-- accept (status 'pending' -> 'accepted' | 'rejected') before the drawer shows up.
-- =============================================================================

create table if not exists public.drawer_shares (
    id uuid primary key default gen_random_uuid(),
    drawer_id uuid not null references public.drawers (id) on delete cascade,
    owner_id uuid not null references public.profiles (id) on delete cascade,
    shared_with_id uuid not null references public.profiles (id) on delete cascade,
    permission text not null check (permission in ('view', 'edit')),
    status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
    created_at timestamptz not null default now(),
    responded_at timestamptz,

    constraint drawer_shares_unique_recipient unique (drawer_id, shared_with_id),
    constraint drawer_shares_not_self check (owner_id <> shared_with_id)
);

comment on column public.drawer_shares.status is
    'Invitation state: pending until the recipient accepts or rejects it (T-02.22).';

create index if not exists idx_shares_shared_with on public.drawer_shares (shared_with_id);
create index if not exists idx_shares_drawer on public.drawer_shares (drawer_id);
create index if not exists idx_shares_lookup on public.drawer_shares (shared_with_id, drawer_id);
create index if not exists idx_shares_pending
    on public.drawer_shares (shared_with_id) where status = 'pending';

alter table public.drawer_shares enable row level security;

drop policy if exists "Participants can view shares" on public.drawer_shares;
create policy "Participants can view shares"
    on public.drawer_shares
    for select
    to authenticated
    using (
        owner_id = (select auth.uid())
        or shared_with_id = (select auth.uid())
    );

-- Owner can invite, but only for a drawer they own and with owner_id = self.
drop policy if exists "Owners can create shares" on public.drawer_shares;
create policy "Owners can create shares"
    on public.drawer_shares
    for insert
    to authenticated
    with check (
        owner_id = (select auth.uid())
        and drawer_id in (select d.id from public.drawers d where d.owner_id = (select auth.uid()))
    );

-- Only the recipient may move an invitation out of 'pending' (T-02.22).
drop policy if exists "Recipients can respond to invitations" on public.drawer_shares;
create policy "Recipients can respond to invitations"
    on public.drawer_shares
    for update
    to authenticated
    using (shared_with_id = (select auth.uid()))
    with check (shared_with_id = (select auth.uid()));

drop policy if exists "Owners can update shares" on public.drawer_shares;
create policy "Owners can update shares"
    on public.drawer_shares
    for update
    to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

drop policy if exists "Owners and recipients can delete shares" on public.drawer_shares;
create policy "Owners and recipients can delete shares"
    on public.drawer_shares
    for delete
    to authenticated
    using (
        owner_id = (select auth.uid())
        or shared_with_id = (select auth.uid())
    );

grant select, insert, update, delete on public.drawer_shares to authenticated;

-- -----------------------------------------------------------------------------
-- Integrity: owner_id must match the drawer owner (defence in depth on top of RLS)
-- -----------------------------------------------------------------------------
create or replace function public.validate_drawer_share()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    drawer_owner uuid;
begin
    select d.owner_id into drawer_owner
    from public.drawers d
    where d.id = new.drawer_id;

    if drawer_owner is null then
        raise exception 'drawer % does not exist', new.drawer_id
            using errcode = 'foreign_key_violation';
    end if;

    if new.owner_id <> drawer_owner then
        raise exception 'drawer_shares.owner_id must match the drawer owner'
            using errcode = 'invalid_parameter_value';
    end if;

    if new.shared_with_id = drawer_owner then
        raise exception 'cannot share a drawer with its owner'
            using errcode = 'invalid_parameter_value';
    end if;

    return new;
end;
$$;

drop trigger if exists validate_drawer_share_before_write on public.drawer_shares;
create trigger validate_drawer_share_before_write
    before insert or update on public.drawer_shares
    for each row execute function public.validate_drawer_share();

-- -----------------------------------------------------------------------------
-- Allow recipients of accepted shares to view the drawer in public.drawers
-- -----------------------------------------------------------------------------
drop policy if exists "Shared users can view drawers" on public.drawers;
create policy "Shared users can view drawers"
    on public.drawers
    for select
    to authenticated
    using (
        id in (
            select s.drawer_id from public.drawer_shares s
            where s.shared_with_id = (select auth.uid()) and s.status = 'accepted'
        )
    );
