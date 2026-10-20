-- =============================================================================
-- FR-02 – Memory Drawers
-- T-02.02 – public.photos + RLS
-- Ref: docs/03-References/db-schema.md (section 3. photos)
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

comment on table public.photos is
    'Memory photo inside a drawer. original_url/thumbnail_url are PRIVATE storage object paths (signed URL resolved client-side).';
comment on column public.photos.original_url is
    'Object path in the private "photos" bucket, e.g. {drawer_id}/{photo_id}.jpg';
comment on column public.photos.thumbnail_url is
    'Object path in the private "thumbnails" bucket, e.g. {drawer_id}/{photo_id}.webp';
comment on column public.photos.file_size_bytes is
    'Compressed size uploaded to Storage; drives drawer storage accounting (256 MB free tier).';

create index if not exists idx_photos_drawer on public.photos (drawer_id);
create index if not exists idx_photos_uploaded_by on public.photos (uploaded_by);
create index if not exists idx_photos_drawer_date on public.photos (drawer_id, uploaded_at desc);

alter table public.photos enable row level security;

-- Uploaders may only insert as themselves; drawer access is enforced separately.
drop policy if exists "Can view photos in accessible drawers" on public.photos;
create policy "Can view photos in accessible drawers"
    on public.photos
    for select
    to authenticated
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
    on public.photos
    for insert
    to authenticated
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

-- Uploader or drawer owner may delete.
drop policy if exists "Can delete own photos or as drawer owner" on public.photos;
create policy "Can delete own photos or as drawer owner"
    on public.photos
    for delete
    to authenticated
    using (
        uploaded_by = (select auth.uid())
        or drawer_id in (select d.id from public.drawers d where d.owner_id = (select auth.uid()))
    );

grant select, insert, delete on public.photos to authenticated;
revoke update on public.photos from authenticated;
