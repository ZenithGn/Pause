-- =============================================================================
-- Pause – Complete database baseline (single migration)
--
-- One file for the whole system: Auth/Profiles (FR-01), Memory Drawers (FR-02),
-- Photobooth & print orders (FR-03), Membership (FR-04), Payment (FR-05),
-- Admin support (FR-06) and Notifications (FR-07).
--
-- Design rules (AGENTS.md):
--   * RLS enabled on every public table, clients only see their own rows.
--   * User photos live in PRIVATE buckets and are read through signed URLs.
--   * Storage quota: 256 MB per drawer on the free tier
--     (docs/03-References/storage-strategy.md), enforced server-side.
--   * The file is idempotent: safe to run twice and safe to `db push` on a
--     project whose schema was applied manually.
--
-- Fresh start on an existing project (destructive, test data only!):
--   drop schema public cascade;
--   create schema public;
--   grant usage on schema public to anon, authenticated, service_role;
-- then run this file once.
-- =============================================================================

-- =============================================================================
-- 0. Shared helpers
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- =============================================================================
-- 1. FR-01 – Profiles (extends auth.users)
-- =============================================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null,
    avatar_url text,
    phone text,
    -- Free tier: 3 drawers (FR-02.2). Membership / one-time purchase raises it.
    max_drawers integer not null default 3 check (max_drawers >= 0),
    -- FR-06: 'user' | 'admin' (admin dashboard access).
    role text not null default 'user' check (role in ('user', 'admin')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.profiles is
    'Public profile of a Pause user, 1:1 with auth.users. Created by handle_new_user().';
comment on column public.profiles.avatar_url is
    'Object path in the private "avatars" bucket (resolved through a signed URL).';
comment on column public.profiles.max_drawers is
    'Maximum number of owned drawers. Free tier = 3; drawers are created on demand.';

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

-- Profile row is created by the auth trigger, never by the client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, phone)
    values (
        new.id,
        coalesce(
            nullif(new.raw_user_meta_data ->> 'display_name', ''),
            nullif(new.raw_user_meta_data ->> 'full_name', ''),
            nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
            'Pause User'
        ),
        nullif(new.raw_user_meta_data ->> 'phone', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Keep display_name in sync with Google/OAuth metadata (first sign-in only).
create or replace function public.handle_user_metadata_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    meta_name text;
begin
    meta_name := coalesce(
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        nullif(new.raw_user_meta_data ->> 'full_name', '')
    );

    if meta_name is not null then
        update public.profiles
        set display_name = meta_name
        where id = new.id
          and (display_name is null or display_name = '' or display_name = 'Pause User');
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_metadata_updated on auth.users;
create trigger on_auth_user_metadata_updated
    after update of raw_user_meta_data on auth.users
    for each row execute function public.handle_user_metadata_update();

-- Users may edit presentation fields only; quota/role are server-managed.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
    if new.id <> old.id then
        raise exception 'profiles.id is immutable' using errcode = 'invalid_parameter_value';
    end if;

    if new.max_drawers <> old.max_drawers
        and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
        raise exception 'profiles.max_drawers can only be changed by the service role';
    end if;

    if new.role <> old.role
        and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
        raise exception 'profiles.role can only be changed by the service role';
    end if;

    return new;
end;
$$;

drop trigger if exists protect_profiles_columns on public.profiles;
create trigger protect_profiles_columns
    before update on public.profiles
    for each row execute function public.protect_profile_columns();

-- Used by admin policies below (SECURITY DEFINER, so it bypasses RLS safely).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
    select exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    );
$$;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
    on public.profiles for select to authenticated
    using ((select auth.uid()) = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
    on public.profiles for select to authenticated
    using (public.is_admin());

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
    on public.profiles for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

revoke all on public.profiles from anon;
revoke insert, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, phone) on public.profiles to authenticated;

-- =============================================================================
-- 2. FR-02 – Drawers
-- =============================================================================

create table if not exists public.drawers (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.profiles (id) on delete cascade,
    name text not null,
    description text,
    cover_photo_url text,
    storage_used_bytes bigint not null default 0 check (storage_used_bytes >= 0),
    -- 256 MB free tier (docs/03-References/storage-strategy.md)
    storage_limit_bytes bigint not null default 268435456,
    is_purchased boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on column public.drawers.storage_limit_bytes is
    'Per-drawer quota in bytes. Free tier 256 MB; membership raises it (FR-04).';

create index if not exists idx_drawers_owner on public.drawers (owner_id);

drop trigger if exists set_drawers_updated_at on public.drawers;
create trigger set_drawers_updated_at
    before update on public.drawers
    for each row execute function public.set_updated_at();

create or replace function public.protect_drawer_columns()
returns trigger
language plpgsql
as $$
begin
    if new.id <> old.id then
        raise exception 'drawers.id is immutable' using errcode = 'invalid_parameter_value';
    end if;
    if new.owner_id <> old.owner_id then
        raise exception 'drawers.owner_id is immutable' using errcode = 'invalid_parameter_value';
    end if;
    return new;
end;
$$;

drop trigger if exists protect_drawers_columns on public.drawers;
create trigger protect_drawers_columns
    before update on public.drawers
    for each row execute function public.protect_drawer_columns();

alter table public.drawers enable row level security;

drop policy if exists "Owners can view own drawers" on public.drawers;
create policy "Owners can view own drawers"
    on public.drawers for select to authenticated
    using (owner_id = (select auth.uid()));

drop policy if exists "Owners can insert drawers" on public.drawers;
create policy "Owners can insert drawers"
    on public.drawers for insert to authenticated
    with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update own drawers" on public.drawers;
create policy "Owners can update own drawers"
    on public.drawers for update to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete own drawers" on public.drawers;
create policy "Owners can delete own drawers"
    on public.drawers for delete to authenticated
    using (owner_id = (select auth.uid()));

drop policy if exists "Admins can view all drawers" on public.drawers;
create policy "Admins can view all drawers"
    on public.drawers for select to authenticated
    using (public.is_admin());

revoke all on public.drawers from anon;
revoke update on public.drawers from authenticated;
grant select, insert, delete on public.drawers to authenticated;
grant update (name, description, cover_photo_url) on public.drawers to authenticated;

-- Server-side drawer quota (defence in depth on top of profiles.max_drawers).
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

-- =============================================================================
-- 3. FR-02 – Drawer shares (invitation flow: pending -> accepted/rejected)
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
    'Invitation state: pending until the recipient accepts or rejects it.';

create index if not exists idx_shares_shared_with on public.drawer_shares (shared_with_id);
create index if not exists idx_shares_drawer on public.drawer_shares (drawer_id);
create index if not exists idx_shares_lookup on public.drawer_shares (shared_with_id, drawer_id);
create index if not exists idx_shares_pending
    on public.drawer_shares (shared_with_id) where status = 'pending';

alter table public.drawer_shares enable row level security;

drop policy if exists "Participants can view shares" on public.drawer_shares;
create policy "Participants can view shares"
    on public.drawer_shares for select to authenticated
    using (owner_id = (select auth.uid()) or shared_with_id = (select auth.uid()));

drop policy if exists "Owners can create shares" on public.drawer_shares;
create policy "Owners can create shares"
    on public.drawer_shares for insert to authenticated
    with check (
        owner_id = (select auth.uid())
        and drawer_id in (select d.id from public.drawers d where d.owner_id = (select auth.uid()))
    );

drop policy if exists "Recipients can respond to invitations" on public.drawer_shares;
create policy "Recipients can respond to invitations"
    on public.drawer_shares for update to authenticated
    using (shared_with_id = (select auth.uid()))
    with check (shared_with_id = (select auth.uid()));

drop policy if exists "Owners can update shares" on public.drawer_shares;
create policy "Owners can update shares"
    on public.drawer_shares for update to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

drop policy if exists "Owners and recipients can delete shares" on public.drawer_shares;
create policy "Owners and recipients can delete shares"
    on public.drawer_shares for delete to authenticated
    using (owner_id = (select auth.uid()) or shared_with_id = (select auth.uid()));

revoke all on public.drawer_shares from anon;
grant select, insert, update, delete on public.drawer_shares to authenticated;

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

-- Recipients of an accepted invitation may read the drawer row. Declared here
-- because drawer_shares does not exist yet in the drawers section above.
drop policy if exists "Shared users can view drawers" on public.drawers;
create policy "Shared users can view drawers"
    on public.drawers for select to authenticated
    using (
        id in (
            select s.drawer_id from public.drawer_shares s
            where s.shared_with_id = (select auth.uid())
              and s.status = 'accepted'
        )
    );

-- =============================================================================
-- 4. FR-02 – Photos
-- =============================================================================

create table if not exists public.photos (
    id uuid primary key default gen_random_uuid(),
    drawer_id uuid not null references public.drawers (id) on delete cascade,
    uploaded_by uuid not null references public.profiles (id),
    original_url text not null,
    thumbnail_url text,
    file_size_bytes bigint not null check (file_size_bytes > 0),
    mime_type text not null default 'image/jpeg',
    width integer check (width is null or width > 0),
    height integer check (height is null or height > 0),
    taken_at timestamptz,
    uploaded_at timestamptz not null default now()
);

comment on column public.photos.original_url is
    'Object path in the private "photos" bucket: {drawer_id}/{photo_id}.jpg';
comment on column public.photos.thumbnail_url is
    'Object path in the private "thumbnails" bucket: {drawer_id}/{photo_id}_thumb.jpg';
comment on column public.photos.file_size_bytes is
    'Compressed size; drives drawer storage accounting (256 MB free tier).';

create index if not exists idx_photos_drawer on public.photos (drawer_id);
create index if not exists idx_photos_uploaded_by on public.photos (uploaded_by);
create index if not exists idx_photos_drawer_date on public.photos (drawer_id, uploaded_at desc);

alter table public.photos enable row level security;

drop policy if exists "Can view photos in accessible drawers" on public.photos;
create policy "Can view photos in accessible drawers"
    on public.photos for select to authenticated
    using (
        drawer_id in (
            select d.id from public.drawers d where d.owner_id = (select auth.uid())
            union
            select s.drawer_id from public.drawer_shares s
            where s.shared_with_id = (select auth.uid()) and s.status = 'accepted'
        )
    );

drop policy if exists "Can insert photos with edit permission" on public.photos;
create policy "Can insert photos with edit permission"
    on public.photos for insert to authenticated
    with check (
        uploaded_by = (select auth.uid())
        and drawer_id in (
            select d.id from public.drawers d where d.owner_id = (select auth.uid())
            union
            select s.drawer_id from public.drawer_shares s
            where s.shared_with_id = (select auth.uid())
              and s.permission = 'edit' and s.status = 'accepted'
        )
    );

drop policy if exists "Can delete own photos or as drawer owner" on public.photos;
create policy "Can delete own photos or as drawer owner"
    on public.photos for delete to authenticated
    using (
        uploaded_by = (select auth.uid())
        or drawer_id in (select d.id from public.drawers d where d.owner_id = (select auth.uid()))
    );

revoke all on public.photos from anon;
revoke update on public.photos from authenticated;
grant select, insert, delete on public.photos to authenticated;

-- Per-photo hard limits (client compresses to <= 5 MB, see storage-strategy.md).
create or replace function public.validate_photo_size()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.file_size_bytes > 5242880 then
        raise exception 'photo exceeds the 5 MB compressed limit (% bytes)', new.file_size_bytes
            using errcode = 'check_violation';
    end if;
    if coalesce(length(trim(new.original_url)), 0) = 0 then
        raise exception 'photos.original_url is required' using errcode = 'invalid_parameter_value';
    end if;
    return new;
end;
$$;

drop trigger if exists validate_photo_size_before_insert on public.photos;
create trigger validate_photo_size_before_insert
    before insert on public.photos
    for each row execute function public.validate_photo_size();

-- Quota check + accounting, atomic with the INSERT (SECURITY DEFINER).
create or replace function public.enforce_photo_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    used bigint;
    cap bigint;
begin
    select storage_used_bytes, storage_limit_bytes
    into used, cap
    from public.drawers
    where id = new.drawer_id
    for update;

    if cap is null then
        raise exception 'drawer % not found', new.drawer_id using errcode = 'no_data_found';
    end if;

    if used + new.file_size_bytes > cap then
        raise exception 'drawer storage full: % + % > %', used, new.file_size_bytes, cap
            using errcode = 'check_violation';
    end if;

    update public.drawers
    set storage_used_bytes = storage_used_bytes + new.file_size_bytes
    where id = new.drawer_id;

    return new;
end;
$$;

drop trigger if exists enforce_photo_quota_before_insert on public.photos;
create trigger enforce_photo_quota_before_insert
    before insert on public.photos
    for each row execute function public.enforce_photo_quota();

create or replace function public.release_photo_storage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.drawers
    set storage_used_bytes = greatest(0, storage_used_bytes - old.file_size_bytes)
    where id = old.drawer_id;
    return old;
end;
$$;

drop trigger if exists release_photo_storage_after_delete on public.photos;
create trigger release_photo_storage_after_delete
    after delete on public.photos
    for each row execute function public.release_photo_storage();

create or replace function public.reset_drawer_cover_after_photo_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.drawers
    set cover_photo_url = null
    where id = old.drawer_id
      and cover_photo_url is not null
      and (cover_photo_url = old.original_url or cover_photo_url = old.thumbnail_url);
    return old;
end;
$$;

drop trigger if exists reset_drawer_cover_after_photo_delete on public.photos;
create trigger reset_drawer_cover_after_photo_delete
    after delete on public.photos
    for each row execute function public.reset_drawer_cover_after_photo_delete();

-- =============================================================================
-- 5. FR-03 – Photobooth templates, items and filled photos
-- =============================================================================

create table if not exists public.photobooth_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text not null default 'general',
    preview_url text not null,
    slot_count integer not null check (slot_count > 0),
    is_premium boolean not null default false,
    is_active boolean not null default true,
    layout_config jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_templates_active
    on public.photobooth_templates (is_active, category);
create index if not exists idx_templates_premium
    on public.photobooth_templates (is_premium) where is_active;

drop trigger if exists set_templates_updated_at on public.photobooth_templates;
create trigger set_templates_updated_at
    before update on public.photobooth_templates
    for each row execute function public.set_updated_at();

alter table public.photobooth_templates enable row level security;

drop policy if exists "Active templates are readable by everyone" on public.photobooth_templates;
create policy "Active templates are readable by everyone"
    on public.photobooth_templates for select
    to authenticated, anon
    using (is_active);

-- Template writes are admin/service-role only (no client policy).

create table if not exists public.photobooth_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    template_id uuid not null references public.photobooth_templates (id),
    preview_url text,
    status text not null default 'draft' check (status in ('draft', 'completed', 'ordered')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_photobooth_items_user on public.photobooth_items (user_id);
create index if not exists idx_photobooth_items_template on public.photobooth_items (template_id);

drop trigger if exists set_photobooth_items_updated_at on public.photobooth_items;
create trigger set_photobooth_items_updated_at
    before update on public.photobooth_items
    for each row execute function public.set_updated_at();

alter table public.photobooth_items enable row level security;

drop policy if exists "Users manage own photobooth items" on public.photobooth_items;
create policy "Users manage own photobooth items"
    on public.photobooth_items for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists "Admins can view all photobooth items" on public.photobooth_items;
create policy "Admins can view all photobooth items"
    on public.photobooth_items for select to authenticated
    using (public.is_admin());

revoke all on public.photobooth_items from anon;
grant select, insert, update, delete on public.photobooth_items to authenticated;

create table if not exists public.photobooth_photos (
    id uuid primary key default gen_random_uuid(),
    photobooth_item_id uuid not null references public.photobooth_items (id) on delete cascade,
    photo_id uuid not null references public.photos (id) on delete cascade,
    slot_index integer not null check (slot_index >= 0),
    constraint photobooth_photos_unique_slot unique (photobooth_item_id, slot_index)
);

create index if not exists idx_photobooth_photos_item
    on public.photobooth_photos (photobooth_item_id);

alter table public.photobooth_photos enable row level security;

drop policy if exists "Users manage own photobooth photos" on public.photobooth_photos;
create policy "Users manage own photobooth photos"
    on public.photobooth_photos for all to authenticated
    using (
        photobooth_item_id in (
            select i.id from public.photobooth_items i where i.user_id = (select auth.uid())
        )
    )
    with check (
        photobooth_item_id in (
            select i.id from public.photobooth_items i where i.user_id = (select auth.uid())
        )
    );

revoke all on public.photobooth_photos from anon;
grant select, insert, update, delete on public.photobooth_photos to authenticated;

-- =============================================================================
-- 6. FR-04 – Membership plans and subscriptions
-- =============================================================================

create table if not exists public.membership_plans (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    price_vnd integer not null check (price_vnd >= 0),
    duration_type text not null check (duration_type in ('monthly', 'yearly')),
    extra_drawers integer not null default 0 check (extra_drawers >= 0),
    extra_storage_bytes bigint not null default 0 check (extra_storage_bytes >= 0),
    access_premium_templates boolean not null default false,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.membership_plans enable row level security;

drop policy if exists "Active plans are readable" on public.membership_plans;
create policy "Active plans are readable"
    on public.membership_plans for select to authenticated, anon
    using (is_active);

-- Plan writes are admin/service-role only.

insert into public.membership_plans
    (name, description, price_vnd, duration_type, extra_drawers,
     extra_storage_bytes, access_premium_templates, is_active)
values
    ('Basic', 'Gói hội viên cơ bản: thêm ngăn kéo và 1 GB/ngăn kéo', 49000, 'monthly', 5,
     1073741824, true, true),
    ('Premium', 'Gói hội viên đầy đủ: nhiều ngăn kéo, template premium', 99000, 'monthly', 15,
     1073741824, true, true),
    ('Basic Yearly', 'Gói Basic thanh toán theo năm (tiết kiệm 20%)', 470000, 'yearly', 5,
     1073741824, true, true)
on conflict (name) do nothing;

create table if not exists public.memberships (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    plan_id uuid not null references public.membership_plans (id),
    started_at timestamptz not null default now(),
    expires_at timestamptz not null,
    status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
    created_at timestamptz not null default now()
);

create index if not exists idx_memberships_user on public.memberships (user_id);
create index if not exists idx_memberships_status on public.memberships (status);
create index if not exists idx_memberships_active
    on public.memberships (user_id, status) where status = 'active';

alter table public.memberships enable row level security;

drop policy if exists "Users view own memberships" on public.memberships;
create policy "Users view own memberships"
    on public.memberships for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "Admins view all memberships" on public.memberships;
create policy "Admins view all memberships"
    on public.memberships for select to authenticated
    using (public.is_admin());

-- Rows are written by the payment/service flow only.
revoke all on public.memberships from anon;
grant select on public.memberships to authenticated;

-- Returns the caller's active membership (used by the mobile app / admin).
create or replace function public.my_active_membership()
returns table (
    membership_id uuid,
    plan_id uuid,
    plan_name text,
    expires_at timestamptz,
    status text
)
language sql
security definer
set search_path = ''
stable
as $$
    select m.id, m.plan_id, p.name, m.expires_at, m.status
    from public.memberships m
    join public.membership_plans p on p.id = m.plan_id
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.expires_at > now()
    order by m.expires_at desc
    limit 1;
$$;

-- =============================================================================
-- 7. FR-05 – Print orders and transactions
-- =============================================================================

create table if not exists public.print_orders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id),
    photobooth_item_id uuid not null references public.photobooth_items (id),
    quantity integer not null default 1 check (quantity > 0),
    unit_price_vnd integer not null check (unit_price_vnd >= 0),
    total_price_vnd integer not null check (total_price_vnd >= 0),
    shipping_name text not null,
    shipping_phone text not null,
    shipping_address text not null,
    note text,
    status text not null default 'pending'
        check (status in ('pending', 'processing', 'printing', 'shipping', 'completed', 'cancelled')),
    admin_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user on public.print_orders (user_id);
create index if not exists idx_orders_status on public.print_orders (status);
create index if not exists idx_orders_status_date on public.print_orders (status, created_at desc);

drop trigger if exists set_orders_updated_at on public.print_orders;
create trigger set_orders_updated_at
    before update on public.print_orders
    for each row execute function public.set_updated_at();

alter table public.print_orders enable row level security;

drop policy if exists "Users view own orders" on public.print_orders;
create policy "Users view own orders"
    on public.print_orders for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "Admins view all orders" on public.print_orders;
create policy "Admins view all orders"
    on public.print_orders for select to authenticated
    using (public.is_admin());

drop policy if exists "Users create own orders" on public.print_orders;
create policy "Users create own orders"
    on public.print_orders for insert to authenticated
    with check (
        user_id = (select auth.uid())
        and photobooth_item_id in (
            select i.id from public.photobooth_items i where i.user_id = (select auth.uid())
        )
    );

-- Status transitions are performed by the payment flow / admin (service role).
revoke all on public.print_orders from anon;
grant select, insert on public.print_orders to authenticated;

create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id),
    order_id uuid references public.print_orders (id) on delete set null,
    membership_id uuid references public.memberships (id) on delete set null,
    drawer_id uuid references public.drawers (id) on delete set null,
    type text not null check (type in ('print_order', 'membership', 'drawer_purchase')),
    amount_vnd integer not null check (amount_vnd >= 0),
    payment_method text,
    payment_gateway_ref text,
    status text not null default 'pending'
        check (status in ('pending', 'success', 'failed', 'refunded')),
    metadata jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user on public.transactions (user_id);
create index if not exists idx_transactions_status on public.transactions (status);
create index if not exists idx_transactions_order on public.transactions (order_id);

alter table public.transactions enable row level security;

drop policy if exists "Users view own transactions" on public.transactions;
create policy "Users view own transactions"
    on public.transactions for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "Admins view all transactions" on public.transactions;
create policy "Admins view all transactions"
    on public.transactions for select to authenticated
    using (public.is_admin());

-- Written by the payment webhook (service role) only.
revoke all on public.transactions from anon;
grant select on public.transactions to authenticated;

-- =============================================================================
-- 8. FR-06 – Admin helpers (role lives in profiles; policies already added)
-- =============================================================================

-- Admin dashboard statistics (service role or admin only).
create or replace function public.admin_dashboard_stats()
returns table (
    total_users bigint,
    new_users_7d bigint,
    total_drawers bigint,
    total_photos bigint,
    orders_pending bigint,
    revenue_vnd bigint
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
    if not public.is_admin() and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
        raise exception 'admin only' using errcode = 'insufficient_privilege';
    end if;

    return query
    select
        (select count(*) from public.profiles),
        (select count(*) from public.profiles where created_at > now() - interval '7 days'),
        (select count(*) from public.drawers),
        (select count(*) from public.photos),
        (select count(*) from public.print_orders where status = 'pending'),
        (select coalesce(sum(amount_vnd), 0) from public.transactions where status = 'success');
end;
$$;

-- =============================================================================
-- 9. FR-07 – Notifications and FCM device tokens
-- =============================================================================

create table if not exists public.device_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    token text not null unique,
    platform text not null default 'android' check (platform in ('android', 'ios', 'web')),
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_device_tokens_user on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

drop policy if exists "Users manage own device tokens" on public.device_tokens;
create policy "Users manage own device tokens"
    on public.device_tokens for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

revoke all on public.device_tokens from anon;
grant select, insert, update, delete on public.device_tokens to authenticated;

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    type text not null check (type in ('drawer_share', 'print_order', 'membership', 'system')),
    title text not null,
    body text,
    data jsonb,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_date
    on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread
    on public.notifications (user_id) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users view own notifications" on public.notifications;
create policy "Users view own notifications"
    on public.notifications for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read"
    on public.notifications for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

revoke all on public.notifications from anon;
revoke insert, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

-- Notify the recipient when an invitation is created (in-app history row).
create or replace function public.notify_drawer_share()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    drawer_name text;
    owner_name text;
begin
    select d.name, p.display_name into drawer_name, owner_name
    from public.drawers d
    join public.profiles p on p.id = d.owner_id
    where d.id = new.drawer_id;

    insert into public.notifications (user_id, type, title, body, data)
    values (
        new.shared_with_id,
        'drawer_share',
        'Bạn có lời mời chia sẻ ngăn kéo',
        coalesce(owner_name, 'Ai đó') || ' mời bạn xem "' || coalesce(drawer_name, 'ngăn kéo') || '"',
        jsonb_build_object('drawer_id', new.drawer_id, 'share_id', new.id, 'permission', new.permission)
    );

    return new;
end;
$$;

drop trigger if exists notify_drawer_share_after_insert on public.drawer_shares;
create trigger notify_drawer_share_after_insert
    after insert on public.drawer_shares
    for each row execute function public.notify_drawer_share();

-- =============================================================================
-- 10. FR-02 RPCs used by the mobile app
-- =============================================================================

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
      and (
          d.owner_id = auth.uid()
          or exists (
              select 1 from public.drawer_shares s
              where s.drawer_id = d.id and s.shared_with_id = auth.uid()
                and s.status = 'accepted'
          )
      )
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
    where s.shared_with_id = auth.uid() and s.status = 'pending'
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

-- Execute grants for the app-facing RPCs.
revoke all on function public.list_drawers() from public;
revoke all on function public.get_drawer(uuid) from public;
revoke all on function public.find_share_recipient(text) from public;
revoke all on function public.share_drawer(uuid, text, text) from public;
revoke all on function public.respond_share_invitation(uuid, boolean) from public;
revoke all on function public.list_share_invitations() from public;
revoke all on function public.list_drawer_shares(uuid) from public;
revoke all on function public.my_active_membership() from public;
revoke all on function public.admin_dashboard_stats() from public;

grant execute on function public.list_drawers() to authenticated;
grant execute on function public.get_drawer(uuid) to authenticated;
grant execute on function public.find_share_recipient(text) to authenticated;
grant execute on function public.share_drawer(uuid, text, text) to authenticated;
grant execute on function public.respond_share_invitation(uuid, boolean) to authenticated;
grant execute on function public.list_share_invitations() to authenticated;
grant execute on function public.list_drawer_shares(uuid) to authenticated;
grant execute on function public.my_active_membership() to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- =============================================================================
-- 11. Storage buckets and policies (all user media is private)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('avatars', 'avatars', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp']),
    ('photos', 'photos', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp']),
    ('thumbnails', 'thumbnails', false, 1048576,
        array['image/jpeg', 'image/png', 'image/webp']),
    ('photobooth-previews', 'photobooth-previews', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp']),
    ('templates', 'templates', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- Avatars: {user_id}/avatar.{ext}
drop policy if exists "Users can read own avatar" on storage.objects;
create policy "Users can read own avatar"
    on storage.objects for select to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
    on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
    on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Drawer photos/thumbnails: {drawer_id}/{photo_id}.{ext}
drop policy if exists "Drawer participants can read photo objects" on storage.objects;
create policy "Drawer participants can read photo objects"
    on storage.objects for select to authenticated
    using (
        bucket_id in ('photos', 'thumbnails')
        and exists (
            select 1 from public.drawers d
            where d.id::text = (storage.foldername(name))[1]
              and (
                  d.owner_id = (select auth.uid())
                  or exists (
                      select 1 from public.drawer_shares s
                      where s.drawer_id = d.id
                        and s.shared_with_id = (select auth.uid())
                        and s.status = 'accepted'
                  )
              )
        )
    );

drop policy if exists "Drawer editors can insert photo objects" on storage.objects;
create policy "Drawer editors can insert photo objects"
    on storage.objects for insert to authenticated
    with check (
        bucket_id in ('photos', 'thumbnails')
        and exists (
            select 1 from public.drawers d
            where d.id::text = (storage.foldername(name))[1]
              and (
                  d.owner_id = (select auth.uid())
                  or exists (
                      select 1 from public.drawer_shares s
                      where s.drawer_id = d.id
                        and s.shared_with_id = (select auth.uid())
                        and s.permission = 'edit' and s.status = 'accepted'
                  )
              )
        )
    );

drop policy if exists "Drawer editors can update photo objects" on storage.objects;
create policy "Drawer editors can update photo objects"
    on storage.objects for update to authenticated
    using (
        bucket_id in ('photos', 'thumbnails')
        and exists (
            select 1 from public.drawers d
            where d.id::text = (storage.foldername(name))[1]
              and (
                  d.owner_id = (select auth.uid())
                  or exists (
                      select 1 from public.drawer_shares s
                      where s.drawer_id = d.id
                        and s.shared_with_id = (select auth.uid())
                        and s.permission = 'edit' and s.status = 'accepted'
                  )
              )
        )
    )
    with check (bucket_id in ('photos', 'thumbnails'));

drop policy if exists "Drawer editors can delete photo objects" on storage.objects;
create policy "Drawer editors can delete photo objects"
    on storage.objects for delete to authenticated
    using (
        bucket_id in ('photos', 'thumbnails')
        and exists (
            select 1 from public.drawers d
            where d.id::text = (storage.foldername(name))[1]
              and (
                  d.owner_id = (select auth.uid())
                  or exists (
                      select 1 from public.drawer_shares s
                      where s.drawer_id = d.id
                        and s.shared_with_id = (select auth.uid())
                        and s.permission = 'edit' and s.status = 'accepted'
                  )
              )
        )
    );

-- Photobooth previews: {user_id}/{photobooth_item_id}.png
drop policy if exists "Users can read own photobooth preview" on storage.objects;
create policy "Users can read own photobooth preview"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'photobooth-previews'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "Users can write own photobooth preview" on storage.objects;
create policy "Users can write own photobooth preview"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'photobooth-previews'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "Users can delete own photobooth preview" on storage.objects;
create policy "Users can delete own photobooth preview"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'photobooth-previews'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Templates bucket is public read (bucket flag), writes are admin only.
drop policy if exists "Templates are publicly readable" on storage.objects;
create policy "Templates are publicly readable"
    on storage.objects for select to anon, authenticated
    using (bucket_id = 'templates');
