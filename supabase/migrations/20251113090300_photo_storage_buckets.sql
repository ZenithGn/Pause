-- =============================================================================
-- FR-02 – Memory Drawers
-- T-02.04 – private Storage buckets for original photos and thumbnails
--
-- Path convention (per drawer, so sharing works for edit-permission members):
--   photos/{drawer_id}/{photo_id}.jpg
--   thumbnails/{drawer_id}/{photo_id}.webp
-- Access is always resolved through a signed URL (private bucket, AGENTS.md).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'photos',
    'photos',
    false,
    15728640, -- 15 MB raw pick ceiling; the compressed upload is capped at 5 MB in SQL
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'thumbnails',
    'thumbnails',
    false,
    1048576, -- 1 MB
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Read: owner + anyone the drawer is shared with
-- -----------------------------------------------------------------------------
drop policy if exists "Drawer participants can read photo objects" on storage.objects;
create policy "Drawer participants can read photo objects"
    on storage.objects
    for select
    to authenticated
    using (
        bucket_id in ('photos', 'thumbnails')
        and exists (
            select 1
            from public.drawers d
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

-- -----------------------------------------------------------------------------
-- Write: owner or share with 'edit' permission
-- -----------------------------------------------------------------------------
drop policy if exists "Drawer editors can insert photo objects" on storage.objects;
create policy "Drawer editors can insert photo objects"
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id in ('photos', 'thumbnails')
        and exists (
            select 1
            from public.drawers d
            where d.id::text = (storage.foldername(name))[1]
              and (
                  d.owner_id = (select auth.uid())
                  or exists (
                      select 1 from public.drawer_shares s
                      where s.drawer_id = d.id
                        and s.shared_with_id = (select auth.uid())
                        and s.permission = 'edit'
                        and s.status = 'accepted'
                  )
              )
        )
    );

drop policy if exists "Drawer editors can update photo objects" on storage.objects;
create policy "Drawer editors can update photo objects"
    on storage.objects
    for update
    to authenticated
    using (
        bucket_id in ('photos', 'thumbnails')
        and exists (
            select 1
            from public.drawers d
            where d.id::text = (storage.foldername(name))[1]
              and (
                  d.owner_id = (select auth.uid())
                  or exists (
                      select 1 from public.drawer_shares s
                      where s.drawer_id = d.id
                        and s.shared_with_id = (select auth.uid())
                        and s.permission = 'edit'
                        and s.status = 'accepted'
                  )
              )
        )
    )
    with check (
        bucket_id in ('photos', 'thumbnails')
    );

drop policy if exists "Drawer editors can delete photo objects" on storage.objects;
create policy "Drawer editors can delete photo objects"
    on storage.objects
    for delete
    to authenticated
    using (
        bucket_id in ('photos', 'thumbnails')
        and exists (
            select 1
            from public.drawers d
            where d.id::text = (storage.foldername(name))[1]
              and (
                  d.owner_id = (select auth.uid())
                  or exists (
                      select 1 from public.drawer_shares s
                      where s.drawer_id = d.id
                        and s.shared_with_id = (select auth.uid())
                        and s.permission = 'edit'
                        and s.status = 'accepted'
                  )
              )
        )
    );
