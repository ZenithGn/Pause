-- =============================================================================
-- FR-02 diagnostics – run this in Supabase Dashboard → SQL Editor and share the
-- output if a drawer/photo/share still behaves incorrectly.
--
-- It only reads metadata; nothing is modified.
-- =============================================================================

-- 1) Which migrations has the project actually applied?
select version, name
from supabase_migrations.schema_migrations
order by version;

-- 2) Does drawer_shares have the invitation columns?
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'drawer_shares'
order by ordinal_position;

-- 3) Are the FR-02 RPCs present?
select p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'list_drawers', 'get_drawer', 'share_drawer', 'respond_share_invitation',
      'list_drawers', 'create_drawer', 'get_drawer', 'share_drawer', 'respond_share_invitation',
      'my_active_membership', 'admin_dashboard_stats'
  )
order by p.proname;

-- 4) drawer_shares policies (must reference status = 'accepted')
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'drawer_shares';

-- 5) drawers policies (there must NOT be a status-blind shared-read policy)
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'drawers';

-- 6) Storage buckets + object policies
select id, public, file_size_limit
from storage.buckets
where id in ('photos', 'thumbnails', 'avatars');

select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 7) Triggers (quota / accounting / placeholder cleanup)
select event_object_table as table_name, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('drawers', 'photos', 'drawer_shares')
order by table_name, trigger_name;

-- 7b) Tables expected by the single baseline (FR-01 -> FR-07)
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- 8) Sanity snapshot of the current data
select
    (select count(*) from public.profiles) as profiles,
    (select count(*) from public.drawers) as drawers,
    (select count(*) from public.photos) as photos,
    (select count(*) from public.drawer_shares) as shares;

select status, count(*) from public.drawer_shares group by status;

select count(*) as membership_plans from public.membership_plans;
select count(*) as notifications from public.notifications;
select count(*) as device_tokens from public.device_tokens;
