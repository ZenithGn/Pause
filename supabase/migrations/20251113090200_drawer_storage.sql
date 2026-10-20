-- =============================================================================
-- FR-02 – Memory Drawers
-- T-02.02 / T-02.06 – storage accounting, quota enforcement, protected columns
--
-- Quota decision: 256 MB per free drawer (3 drawers -> 768 MB, fits the 1 GB
-- Supabase Free tier). See docs/03-References/storage-strategy.md.
-- =============================================================================

-- 256 MB free-tier drawer limit (was 1 GB).
alter table public.drawers
    alter column storage_limit_bytes set default 268435456;

update public.drawers
set storage_limit_bytes = 268435456
where storage_limit_bytes = 1073741824;

comment on column public.drawers.storage_limit_bytes is
    'Per-drawer storage quota in bytes. Free tier 256 MB (268435456); membership raises it (FR-04).';

-- -----------------------------------------------------------------------------
-- Clients may only edit presentation columns. Storage counters / quota /
-- purchase flag / ownership are only writable by SECURITY DEFINER triggers or
-- the service role (PostgreSQL column-level privileges).
-- -----------------------------------------------------------------------------
revoke update on public.drawers from authenticated;
grant update (name, description, cover_photo_url) on public.drawers to authenticated;

create or replace function public.protect_drawer_columns()
returns trigger
language plpgsql
set search_path = ''
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

-- -----------------------------------------------------------------------------
-- Per-photo hard limits (after client-side compression, see storage-strategy.md)
-- -----------------------------------------------------------------------------
create or replace function public.validate_photo_size()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    -- Compressed upload must stay below 5 MB; larger means the client skipped
    -- compression or is uploading an original.
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

-- -----------------------------------------------------------------------------
-- Quota check + storage accounting, atomic with the photo INSERT.
-- SECURITY DEFINER so it can update drawers.storage_used_bytes even though the
-- authenticated role has no UPDATE privilege on that column.
-- -----------------------------------------------------------------------------
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
    -- Lock the drawer row so concurrent uploads cannot overshoot the quota.
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

comment on function public.enforce_photo_quota() is
    'Server-side authority for the per-drawer storage quota; also maintains drawers.storage_used_bytes.';

drop trigger if exists enforce_photo_quota_before_insert on public.photos;
create trigger enforce_photo_quota_before_insert
    before insert on public.photos
    for each row execute function public.enforce_photo_quota();

-- -----------------------------------------------------------------------------
-- Give the space back when photos are deleted.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Keep drawers.cover_photo_url consistent when the covered photo is deleted.
-- -----------------------------------------------------------------------------
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
