-- =============================================================================
-- FR-02 fix: Ensure Storage buckets and RLS policies exist on Supabase Cloud.
--
-- This migration is idempotent — safe to run even if policies already exist.
-- It guarantees that all photo/thumbnail buckets and their access policies are
-- present, fixing the upload bug where the initial migration may not have been
-- fully applied on the remote Supabase instance.
-- =============================================================================

-- 1. Ensure buckets exist (idempotent via ON CONFLICT)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('photos', 'photos', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp']),
    ('thumbnails', 'thumbnails', false, 1048576,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- 2. Storage policies for photos/thumbnails (idempotent via DROP IF EXISTS)

-- READ: Drawer owner OR any accepted share participant
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

-- INSERT: Drawer owner OR accepted share with edit permission
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

-- UPDATE: Same as INSERT
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

-- DELETE: Same as INSERT
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
