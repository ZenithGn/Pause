-- =============================================================================
-- FR-01 – Authentication & Account
-- T-01.05 – Create 3 empty default drawers for every new user
--
-- NOTE: the minimal `drawers` table is introduced here because the signup
-- trigger of FR-01.05 depends on it. The full drawers feature (photo storage,
-- shares, indexes) is completed by FR-02 / T-02.01.
-- Ref: docs/03-References/db-schema.md (section 2. drawers)
-- =============================================================================

create table if not exists public.drawers (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.profiles (id) on delete cascade,
    name text not null,
    description text,
    cover_photo_url text,
    storage_used_bytes bigint not null default 0,
    -- 1 GB = 1024^3 (AGENTS.md: 1 GB per drawer)
    storage_limit_bytes bigint not null default 1073741824,
    is_purchased boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_drawers_owner on public.drawers (owner_id);

drop trigger if exists set_drawers_updated_at on public.drawers;
create trigger set_drawers_updated_at
    before update on public.drawers
    for each row execute function public.set_updated_at();

alter table public.drawers enable row level security;

drop policy if exists "Owners can view own drawers" on public.drawers;
create policy "Owners can view own drawers"
    on public.drawers
    for select
    to authenticated
    using (owner_id = (select auth.uid()));

drop policy if exists "Owners can insert drawers" on public.drawers;
create policy "Owners can insert drawers"
    on public.drawers
    for insert
    to authenticated
    with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update own drawers" on public.drawers;
create policy "Owners can update own drawers"
    on public.drawers
    for update
    to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete own drawers" on public.drawers;
create policy "Owners can delete own drawers"
    on public.drawers
    for delete
    to authenticated
    using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- T-01.05 – seed 3 empty drawers right after the profile is created
-- (FR-01.1 post-condition: "user nhận 3 ngăn kéo mặc định (trống)")
-- -----------------------------------------------------------------------------
create or replace function public.create_default_drawers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    drawer_capacity integer := coalesce(new.max_drawers, 3);
    i integer;
begin
    for i in 1..drawer_capacity loop
        insert into public.drawers (owner_id, name)
        values (new.id, 'Ngăn kéo kỷ niệm ' || i);
    end loop;
    return new;
end;
$$;

comment on function public.create_default_drawers() is
    'Creates the free-tier default drawers (max_drawers, default 3) for a new user.';

drop trigger if exists on_profile_created_create_default_drawers on public.profiles;
create trigger on_profile_created_create_default_drawers
    after insert on public.profiles
    for each row execute function public.create_default_drawers();

-- Enforce the drawer quota server-side as well (AGENTS.md: enforce limits on
-- both client and server). Counts only the rows the user owns.
create or replace function public.enforce_drawer_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    allowed integer;
    owned integer;
begin
    select coalesce(max_drawers, 3) into allowed
    from public.profiles
    where id = new.owner_id;

    select count(*) into owned
    from public.drawers
    where owner_id = new.owner_id;

    if allowed is not null and owned >= allowed then
        raise exception 'drawer quota reached (% of %)', owned, allowed
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$;

drop trigger if exists enforce_drawer_quota_before_insert on public.drawers;
create trigger enforce_drawer_quota_before_insert
    before insert on public.drawers
    for each row execute function public.enforce_drawer_quota();
