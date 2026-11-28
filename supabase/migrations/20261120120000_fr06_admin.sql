-- =============================================================================
-- Migration: 20261120120000_fr06_admin.sql
-- Description: FR-06 Admin Dashboard backend – profile protection & locking,
--              is_admin() hardening, admin audit logs, print order status history,
--              FR-07 status trigger sync, privacy-enforcing RLS, template layout
--              validation, 21 admin_* RPCs, performance indexes, and grants.
-- Idempotency: 100% safe to re-apply.
-- =============================================================================

-- =============================================================================
-- 1. FR-06 / T-06.B02, T-06.B03 – Profiles columns, column protection & is_admin()
-- =============================================================================

alter table public.profiles
    add column if not exists is_premium boolean not null default false,
    add column if not exists is_locked boolean not null default false,
    add column if not exists locked_at timestamptz,
    add column if not exists locked_reason text;

comment on column public.profiles.is_premium is
    'Flag indicating active premium membership (managed by payment/expiry flows).';
comment on column public.profiles.is_locked is
    'Whether the account has been locked by an administrator (FR-06.1).';
comment on column public.profiles.locked_at is
    'Timestamp when the account was locked.';
comment on column public.profiles.locked_reason is
    'Mandatory reason provided by the administrator when locking an account.';

-- Protect quota, role, premium, and lock columns from direct user modification.
-- Permits updates only when executed as service_role or inside a trusted
-- SECURITY DEFINER RPC that sets app.bypass_profile_protection = 'on'.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
declare
    v_is_privileged boolean := (
        coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
        or coalesce(current_setting('app.bypass_profile_protection', true), '') = 'on'
    );
begin
    if new.id <> old.id then
        raise exception 'profiles.id is immutable' using errcode = 'invalid_parameter_value';
    end if;

    if not v_is_privileged then
        if new.max_drawers is distinct from old.max_drawers then
            raise exception 'profiles.max_drawers can only be changed by the service role';
        end if;

        if new.role is distinct from old.role then
            raise exception 'profiles.role can only be changed by the service role';
        end if;

        if new.is_premium is distinct from old.is_premium then
            raise exception 'profiles.is_premium can only be changed by the service role';
        end if;

        if new.is_locked is distinct from old.is_locked
           or new.locked_at is distinct from old.locked_at
           or new.locked_reason is distinct from old.locked_reason then
            raise exception 'profiles lock columns can only be changed by the service role';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists protect_profiles_columns on public.profiles;
create trigger protect_profiles_columns
    before update on public.profiles
    for each row execute function public.protect_profile_columns();

-- Admin check: caller must have role = 'admin' AND must NOT be locked.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
          and not coalesce(p.is_locked, false)
    );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- =============================================================================
-- 2. FR-06 / T-06.B04 – Admin Audit Logs
-- =============================================================================

create table if not exists public.admin_audit_logs (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid not null references public.profiles (id),
    action text not null,
    entity_type text not null,
    entity_id text,
    before jsonb,
    after jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_admin
    on public.admin_audit_logs (admin_id, created_at desc);
create index if not exists idx_admin_audit_logs_entity
    on public.admin_audit_logs (entity_type, entity_id, created_at desc);
create index if not exists idx_admin_audit_logs_created
    on public.admin_audit_logs (created_at desc);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.admin_audit_logs;
create policy "Admins can view audit logs"
    on public.admin_audit_logs for select to authenticated
    using (public.is_admin());

revoke all on public.admin_audit_logs from public, anon;
revoke insert, update, delete on public.admin_audit_logs from authenticated;
grant select on public.admin_audit_logs to authenticated;

-- Internal audit helper called by admin_* SECURITY DEFINER RPCs.
create or replace function public.log_admin_action(
    p_action text,
    p_entity_type text,
    p_entity_id text default null,
    p_before jsonb default null,
    p_after jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid := auth.uid();
    v_log_id uuid;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, before, after)
    values (v_admin_id, p_action, p_entity_type, p_entity_id, p_before, p_after)
    returning id into v_log_id;

    return v_log_id;
end;
$$;

revoke all on function public.log_admin_action(text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.log_admin_action(text, text, text, jsonb, jsonb) to service_role;

-- =============================================================================
-- 3. FR-06 / T-06.B06, T-06.B09 – Print Order Status History & Notification Fix
-- =============================================================================

create table if not exists public.print_order_status_history (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.print_orders (id) on delete cascade,
    from_status text check (from_status is null or from_status in ('pending', 'processing', 'printing', 'shipping', 'completed', 'cancelled')),
    to_status text not null check (to_status in ('pending', 'processing', 'printing', 'shipping', 'completed', 'cancelled')),
    changed_by uuid references public.profiles (id) on delete set null,
    note text,
    created_at timestamptz not null default now()
);

create index if not exists idx_print_order_status_history_order
    on public.print_order_status_history (order_id, created_at);

alter table public.print_order_status_history enable row level security;

drop policy if exists "Order owners can view status history" on public.print_order_status_history;
create policy "Order owners can view status history"
    on public.print_order_status_history for select to authenticated
    using (
        exists (
            select 1 from public.print_orders po
            where po.id = order_id and po.user_id = (select auth.uid())
        )
    );

drop policy if exists "Admins can view all order status history" on public.print_order_status_history;
create policy "Admins can view all order status history"
    on public.print_order_status_history for select to authenticated
    using (public.is_admin());

revoke all on public.print_order_status_history from public, anon;
revoke insert, update, delete on public.print_order_status_history from authenticated;
grant select on public.print_order_status_history to authenticated;

-- Automatically record initial order creation and non-admin status transitions (e.g. PayOS webhook).
-- Admin transitions set app.manual_order_history = 'on' so they record their explicit note cleanly.
create or replace function public.record_print_order_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.print_order_status_history (order_id, from_status, to_status, changed_by, note)
        values (new.id, null, new.status, new.user_id, null);
        return new;
    end if;

    if tg_op = 'UPDATE'
       and old.status is distinct from new.status
       and current_setting('app.manual_order_history', true) is distinct from 'on' then
        insert into public.print_order_status_history (order_id, from_status, to_status, changed_by, note)
        values (new.id, old.status, new.status, auth.uid(), null);
    end if;

    return new;
end;
$$;

drop trigger if exists trg_record_print_order_status_history on public.print_orders;
create trigger trg_record_print_order_status_history
    after insert or update of status on public.print_orders
    for each row execute function public.record_print_order_status_history();

-- Backfill initial status history for any pre-existing orders lacking history rows.
insert into public.print_order_status_history (order_id, from_status, to_status, changed_by, note, created_at)
select po.id, null, po.status, po.user_id, null, po.created_at
from public.print_orders po
where not exists (
    select 1 from public.print_order_status_history h where h.order_id = po.id
);

-- T-06.B09: Sync FR-07 notification trigger with the 6 canonical print_orders statuses.
create or replace function public.notify_print_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_title text;
    v_body text;
begin
    if old.status is not distinct from new.status then
        return new;
    end if;

    case new.status
        when 'processing' then
            v_title := 'Đơn in đã được xác nhận';
            v_body := 'Đơn in ảnh Photobooth của bạn đã được xác nhận và chuẩn bị in.';
        when 'printing' then
            v_title := 'Đơn in đang được in ấn';
            v_body := 'Xưởng in Pause đang in những tấm ảnh kỷ niệm của bạn.';
        when 'shipping' then
            v_title := 'Đơn in đang được giao hàng';
            v_body := 'Đơn hàng của bạn đã bàn giao cho đơn vị vận chuyển.';
        when 'completed' then
            v_title := 'Đơn in đã giao thành công';
            v_body := 'Cảm ơn bạn đã sử dụng dịch vụ in ảnh Photobooth của Pause!';
        when 'cancelled' then
            v_title := 'Đơn in đã bị hủy';
            v_body := 'Đơn in ảnh Photobooth của bạn đã được hủy.';
        else
            return new;
    end case;

    insert into public.notifications (user_id, type, title, body, data)
    values (
        new.user_id,
        'print_order',
        v_title,
        v_body,
        jsonb_build_object('order_id', new.id, 'status', new.status)
    );

    return new;
end;
$$;

drop trigger if exists trg_notify_print_order_status on public.print_orders;
create trigger trg_notify_print_order_status
    after update of status on public.print_orders
    for each row execute function public.notify_print_order_status();

-- =============================================================================
-- 4. FR-06 / T-06.B05, T-06.B10, T-06.B11 – Admin RLS, Privacy, Validation & Storage
-- =============================================================================

-- Strict privacy (NFR-04.2): Admins can ONLY view photos that belong to a
-- photobooth item referenced by an actual print_order. Private drawer photos
-- remain invisible to admins.
drop policy if exists "Admins can view photos in print orders" on public.photos;
create policy "Admins can view photos in print orders"
    on public.photos for select to authenticated
    using (
        public.is_admin()
        and id in (
            select pp.photo_id
            from public.photobooth_photos pp
            join public.print_orders po on po.photobooth_item_id = pp.photobooth_item_id
        )
    );

-- Admin read policy for photobooth_photos.
drop policy if exists "Admins can view all photobooth photos" on public.photobooth_photos;
create policy "Admins can view all photobooth photos"
    on public.photobooth_photos for select to authenticated
    using (public.is_admin());

-- Photobooth templates: ensure unique name, layout validation trigger, and admin policies.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'photobooth_templates_name_key'
    ) then
        alter table public.photobooth_templates
            add constraint photobooth_templates_name_key unique (name);
    end if;
end $$;

create or replace function public.validate_template_layout_config()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_width numeric;
    v_height numeric;
    v_slots jsonb;
    v_slot_count integer;
    v_slot jsonb;
    v_idx integer;
    v_sx numeric;
    v_sy numeric;
    v_sw numeric;
    v_sh numeric;
    v_seen_indices integer[] := array[]::integer[];
begin
    if new.layout_config is null or jsonb_typeof(new.layout_config) <> 'object' then
        raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
    end if;

    if jsonb_typeof(new.layout_config -> 'width') <> 'number'
       or jsonb_typeof(new.layout_config -> 'height') <> 'number' then
        raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
    end if;

    v_width := (new.layout_config ->> 'width')::numeric;
    v_height := (new.layout_config ->> 'height')::numeric;

    if v_width <= 0 or v_height <= 0 then
        raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
    end if;

    v_slots := new.layout_config -> 'slots';
    if v_slots is null or jsonb_typeof(v_slots) <> 'array' then
        raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
    end if;

    v_slot_count := jsonb_array_length(v_slots);
    if v_slot_count <= 0 then
        raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
    end if;

    for v_slot in select value from jsonb_array_elements(v_slots)
    loop
        if jsonb_typeof(v_slot) <> 'object' then
            raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
        end if;

        if jsonb_typeof(v_slot -> 'index') <> 'number'
           or jsonb_typeof(v_slot -> 'x') <> 'number'
           or jsonb_typeof(v_slot -> 'y') <> 'number'
           or jsonb_typeof(v_slot -> 'width') <> 'number'
           or jsonb_typeof(v_slot -> 'height') <> 'number' then
            raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
        end if;

        if (v_slot ->> 'index')::numeric <> floor((v_slot ->> 'index')::numeric) then
            raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
        end if;

        v_idx := (v_slot ->> 'index')::integer;
        v_sx := (v_slot ->> 'x')::numeric;
        v_sy := (v_slot ->> 'y')::numeric;
        v_sw := (v_slot ->> 'width')::numeric;
        v_sh := (v_slot ->> 'height')::numeric;

        if v_idx < 0 or v_idx >= v_slot_count or v_idx = any(v_seen_indices) then
            raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
        end if;
        v_seen_indices := array_append(v_seen_indices, v_idx);

        if v_sx < 0 or v_sy < 0 or v_sw <= 0 or v_sh <= 0
           or (v_sx + v_sw) > v_width or (v_sy + v_sh) > v_height then
            raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
        end if;
    end loop;

    if (new.layout_config ? 'texts')
       and jsonb_typeof(new.layout_config -> 'texts') not in ('array', 'null') then
        raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
    end if;

    new.slot_count := v_slot_count;
    return new;
end;
$$;

drop trigger if exists validate_template_layout_config_trigger on public.photobooth_templates;
create trigger validate_template_layout_config_trigger
    before insert or update on public.photobooth_templates
    for each row execute function public.validate_template_layout_config();

drop policy if exists "Admins can view all templates" on public.photobooth_templates;
create policy "Admins can view all templates"
    on public.photobooth_templates for select to authenticated
    using (public.is_admin());

drop policy if exists "Admins can insert templates" on public.photobooth_templates;
create policy "Admins can insert templates"
    on public.photobooth_templates for insert to authenticated
    with check (public.is_admin());

drop policy if exists "Admins can update templates" on public.photobooth_templates;
create policy "Admins can update templates"
    on public.photobooth_templates for update to authenticated
    using (public.is_admin())
    with check (public.is_admin());

drop policy if exists "Admins can delete templates" on public.photobooth_templates;
create policy "Admins can delete templates"
    on public.photobooth_templates for delete to authenticated
    using (public.is_admin());

revoke all on public.photobooth_templates from anon;
grant select on public.photobooth_templates to anon;
grant select, insert, update, delete on public.photobooth_templates to authenticated;

-- Membership plans: ensure unique name + admin read/write policies.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'membership_plans_name_key'
    ) then
        alter table public.membership_plans
            add constraint membership_plans_name_key unique (name);
    end if;
end $$;

drop policy if exists "Admins can view all membership plans" on public.membership_plans;
create policy "Admins can view all membership plans"
    on public.membership_plans for select to authenticated
    using (public.is_admin());

drop policy if exists "Admins can insert membership plans" on public.membership_plans;
create policy "Admins can insert membership plans"
    on public.membership_plans for insert to authenticated
    with check (public.is_admin());

drop policy if exists "Admins can update membership plans" on public.membership_plans;
create policy "Admins can update membership plans"
    on public.membership_plans for update to authenticated
    using (public.is_admin())
    with check (public.is_admin());

drop policy if exists "Admins can delete membership plans" on public.membership_plans;
create policy "Admins can delete membership plans"
    on public.membership_plans for delete to authenticated
    using (public.is_admin());

revoke all on public.membership_plans from anon;
grant select on public.membership_plans to anon;
grant select, insert, update, delete on public.membership_plans to authenticated;

-- Print orders: admin update policy.
drop policy if exists "Admins can update orders" on public.print_orders;
create policy "Admins can update orders"
    on public.print_orders for update to authenticated
    using (public.is_admin())
    with check (public.is_admin());

grant update on public.print_orders to authenticated;

-- Storage bucket 'templates' + admin write policies (fallback when Cloudinary is not used).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'templates',
    'templates',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload template assets" on storage.objects;
create policy "Admins can upload template assets"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'templates' and public.is_admin());

drop policy if exists "Admins can update template assets" on storage.objects;
create policy "Admins can update template assets"
    on storage.objects for update to authenticated
    using (bucket_id = 'templates' and public.is_admin())
    with check (bucket_id = 'templates' and public.is_admin());

drop policy if exists "Admins can delete template assets" on storage.objects;
create policy "Admins can delete template assets"
    on storage.objects for delete to authenticated
    using (bucket_id = 'templates' and public.is_admin());

-- =============================================================================
-- 5. FR-06 / T-06.B12, T-06.B13 – Users Management RPCs
-- =============================================================================

create or replace function public.admin_list_users(
    p_search text default null,
    p_tier text default null,
    p_status text default null,
    p_role text default null,
    p_sort text default 'created_at.desc',
    p_limit integer default 20,
    p_offset integer default 0
)
returns table (
    id uuid,
    display_name text,
    email text,
    phone text,
    avatar_url text,
    role text,
    tier text,
    is_locked boolean,
    drawer_count bigint,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_search text;
    v_tier text := lower(nullif(trim(p_tier), ''));
    v_status text := lower(nullif(trim(p_status), ''));
    v_role text := lower(nullif(trim(p_role), ''));
    v_sort text := coalesce(nullif(trim(p_sort), ''), 'created_at.desc');
    v_limit integer := greatest(1, least(coalesce(p_limit, 20), 1000));
    v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    v_search := nullif(trim(p_search), '');
    if v_search is not null then
        v_search := replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_');
    end if;

    return query
    with user_rows as (
        select
            p.id,
            p.display_name,
            u.email::text as email,
            p.phone,
            p.avatar_url,
            p.role,
            coalesce(active_m.plan_name, 'Free')::text as tier,
            coalesce(p.is_locked, false) as is_locked,
            coalesce(dc.cnt, 0)::bigint as drawer_count,
            p.created_at,
            u.last_sign_in_at
        from public.profiles p
        left join auth.users u on u.id = p.id
        left join lateral (
            select mp.name as plan_name
            from public.memberships m
            join public.membership_plans mp on mp.id = m.plan_id
            where m.user_id = p.id
              and m.status = 'active'
              and m.expires_at > now()
            order by m.expires_at desc
            limit 1
        ) active_m on true
        left join (
            select d.owner_id, count(*)::bigint as cnt
            from public.drawers d
            group by d.owner_id
        ) dc on dc.owner_id = p.id
        where (
            v_search is null
            or p.display_name ilike '%' || v_search || '%' escape '\'
            or coalesce(u.email, '') ilike '%' || v_search || '%' escape '\'
            or coalesce(p.phone, '') ilike '%' || v_search || '%' escape '\'
        )
        and (
            v_tier is null
            or (v_tier = 'free' and active_m.plan_name is null)
            or (v_tier in ('go', 'pause go') and lower(coalesce(active_m.plan_name, '')) = 'pause go')
            or (v_tier in ('plus', 'pause plus') and lower(coalesce(active_m.plan_name, '')) = 'pause plus')
            or (v_tier in ('premium', 'pause premium') and lower(coalesce(active_m.plan_name, '')) = 'pause premium')
            or (v_tier not in ('free', 'go', 'pause go', 'plus', 'pause plus', 'premium', 'pause premium')
                and lower(coalesce(active_m.plan_name, '')) = v_tier)
        )
        and (
            v_status is null
            or (v_status = 'locked' and coalesce(p.is_locked, false) = true)
            or (v_status = 'active' and coalesce(p.is_locked, false) = false)
        )
        and (v_role is null or p.role = v_role)
    )
    select
        ur.id,
        ur.display_name,
        ur.email,
        ur.phone,
        ur.avatar_url,
        ur.role,
        ur.tier,
        ur.is_locked,
        ur.drawer_count,
        ur.created_at,
        ur.last_sign_in_at,
        count(*) over() as total_count
    from user_rows ur
    order by
        case when v_sort = 'created_at.asc' then ur.created_at end asc nulls last,
        case when v_sort = 'created_at.desc' then ur.created_at end desc nulls last,
        case when v_sort = 'display_name.asc' then lower(ur.display_name) end asc nulls last,
        case when v_sort = 'display_name.desc' then lower(ur.display_name) end desc nulls last,
        case when v_sort = 'last_sign_in_at.asc' then ur.last_sign_in_at end asc nulls last,
        case when v_sort = 'last_sign_in_at.desc' then ur.last_sign_in_at end desc nulls last,
        case when v_sort = 'drawer_count.asc' then ur.drawer_count end asc,
        case when v_sort = 'drawer_count.desc' then ur.drawer_count end desc,
        ur.created_at desc,
        ur.id desc
    limit v_limit offset v_offset;
end;
$$;

create or replace function public.admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_profile public.profiles%rowtype;
    v_email text;
    v_last_sign_in_at timestamptz;
    v_tier text;
    v_memberships jsonb;
    v_drawer_stats jsonb;
    v_orders_summary jsonb;
    v_recent_orders jsonb;
    v_recent_transactions jsonb;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    select * into v_profile
    from public.profiles p
    where p.id = p_user_id;

    if not found then
        raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;

    select u.email::text, u.last_sign_in_at
    into v_email, v_last_sign_in_at
    from auth.users u
    where u.id = p_user_id;

    select coalesce(
        (
            select mp.name
            from public.memberships m
            join public.membership_plans mp on mp.id = m.plan_id
            where m.user_id = p_user_id
              and m.status = 'active'
              and m.expires_at > now()
            order by m.expires_at desc
            limit 1
        ),
        'Free'
    ) into v_tier;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', m.id,
                'plan_id', m.plan_id,
                'plan_name', mp.name,
                'price_vnd', mp.price_vnd,
                'duration_type', mp.duration_type,
                'started_at', m.started_at,
                'expires_at', m.expires_at,
                'status', m.status,
                'created_at', m.created_at
            )
            order by m.created_at desc
        ),
        '[]'::jsonb
    )
    into v_memberships
    from public.memberships m
    join public.membership_plans mp on mp.id = m.plan_id
    where m.user_id = p_user_id;

    -- Aggregate drawer statistics ONLY; never expose private drawer names or photo URLs.
    select jsonb_build_object(
        'drawer_count', (select count(*)::bigint from public.drawers d where d.owner_id = p_user_id),
        'photo_count', (
            select count(*)::bigint
            from public.photos ph
            join public.drawers d on d.id = ph.drawer_id
            where d.owner_id = p_user_id
        ),
        'storage_used_bytes', (
            select coalesce(sum(d.storage_used_bytes), 0)::bigint
            from public.drawers d
            where d.owner_id = p_user_id
        )
    ) into v_drawer_stats;

    select jsonb_build_object(
        'total_orders', count(*)::bigint,
        'pending_orders', count(*) filter (where po.status = 'pending')::bigint,
        'completed_orders', count(*) filter (where po.status = 'completed')::bigint,
        'cancelled_orders', count(*) filter (where po.status = 'cancelled')::bigint,
        'total_spent_vnd', coalesce(sum(po.total_price_vnd) filter (where po.status <> 'cancelled'), 0)::bigint
    )
    into v_orders_summary
    from public.print_orders po
    where po.user_id = p_user_id;

    select coalesce(
        jsonb_agg(row_data),
        '[]'::jsonb
    )
    into v_recent_orders
    from (
        select jsonb_build_object(
            'id', po.id,
            'short_code', upper(left(po.id::text, 8)),
            'template_name', t.name,
            'quantity', po.quantity,
            'total_price_vnd', po.total_price_vnd,
            'status', po.status,
            'created_at', po.created_at
        ) as row_data
        from public.print_orders po
        left join public.photobooth_items pi on pi.id = po.photobooth_item_id
        left join public.photobooth_templates t on t.id = pi.template_id
        where po.user_id = p_user_id
        order by po.created_at desc
        limit 10
    ) ro;

    select coalesce(
        jsonb_agg(row_data),
        '[]'::jsonb
    )
    into v_recent_transactions
    from (
        select jsonb_build_object(
            'id', tx.id,
            'type', tx.type,
            'amount_vnd', tx.amount_vnd,
            'payment_method', tx.payment_method,
            'payment_gateway_ref', tx.payment_gateway_ref,
            'order_code', tx.order_code,
            'status', tx.status,
            'order_id', tx.order_id,
            'created_at', tx.created_at
        ) as row_data
        from public.transactions tx
        where tx.user_id = p_user_id
        order by tx.created_at desc
        limit 10
    ) rt;

    return jsonb_build_object(
        'profile', to_jsonb(v_profile) || jsonb_build_object(
            'tier', v_tier,
            'last_sign_in_at', v_last_sign_in_at
        ),
        'email', v_email,
        'memberships', v_memberships,
        'drawer_stats', v_drawer_stats,
        'orders_summary', v_orders_summary,
        'recent_orders', v_recent_orders,
        'recent_transactions', v_recent_transactions
    );
end;
$$;

create or replace function public.admin_set_user_lock(
    p_user_id uuid,
    p_locked boolean,
    p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_target public.profiles%rowtype;
    v_locked boolean := coalesce(p_locked, false);
    v_reason text := nullif(trim(p_reason), '');
    v_locked_at timestamptz;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    if p_user_id = auth.uid() then
        raise exception 'CANNOT_LOCK_SELF' using errcode = 'P0001';
    end if;

    select * into v_target
    from public.profiles p
    where p.id = p_user_id
    for update;

    if not found then
        raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;

    if v_target.role = 'admin' then
        raise exception 'CANNOT_LOCK_ADMIN' using errcode = 'P0001';
    end if;

    if v_locked and v_reason is null then
        raise exception 'LOCK_REASON_REQUIRED' using errcode = 'P0001';
    end if;

    v_locked_at := case when v_locked then now() else null end;
    if not v_locked then
        v_reason := null;
    end if;

    perform set_config('app.bypass_profile_protection', 'on', true);
    update public.profiles
    set is_locked = v_locked,
        locked_at = v_locked_at,
        locked_reason = v_reason
    where id = p_user_id;
    perform set_config('app.bypass_profile_protection', 'off', true);

    perform public.log_admin_action(
        case when v_locked then 'lock_user' else 'unlock_user' end,
        'profile',
        p_user_id::text,
        jsonb_build_object(
            'is_locked', v_target.is_locked,
            'locked_at', v_target.locked_at,
            'locked_reason', v_target.locked_reason
        ),
        jsonb_build_object(
            'is_locked', v_locked,
            'locked_at', v_locked_at,
            'locked_reason', v_reason
        )
    );

    insert into public.notifications (user_id, type, title, body, data)
    values (
        p_user_id,
        'system',
        case when v_locked then 'Tài khoản của bạn đã bị khóa' else 'Tài khoản của bạn đã được mở khóa' end,
        case when v_locked
            then 'Tài khoản Pause của bạn đã bị khóa. Lý do: ' || v_reason
            else 'Tài khoản Pause của bạn đã được mở khóa và có thể sử dụng bình thường.'
        end,
        jsonb_build_object(
            'event', case when v_locked then 'account_locked' else 'account_unlocked' end,
            'reason', v_reason
        )
    );

    return jsonb_build_object(
        'id', p_user_id,
        'is_locked', v_locked,
        'locked_at', v_locked_at
    );
end;
$$;

-- =============================================================================
-- 6. FR-06 / T-06.B10 – Templates Management RPCs
-- =============================================================================

create or replace function public.admin_list_templates(
    p_search text default null,
    p_category text default null,
    p_is_premium boolean default null,
    p_is_active boolean default null,
    p_limit integer default 20,
    p_offset integer default 0
)
returns table (
    id uuid,
    name text,
    category text,
    preview_url text,
    slot_count integer,
    is_premium boolean,
    is_active boolean,
    usage_count bigint,
    updated_at timestamptz,
    total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_search text;
    v_category text := lower(nullif(trim(p_category), ''));
    v_limit integer := greatest(1, least(coalesce(p_limit, 20), 1000));
    v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    v_search := nullif(trim(p_search), '');
    if v_search is not null then
        v_search := replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_');
    end if;

    return query
    select
        t.id,
        t.name,
        t.category,
        t.preview_url,
        t.slot_count,
        t.is_premium,
        t.is_active,
        coalesce(u.cnt, 0)::bigint as usage_count,
        t.updated_at,
        count(*) over() as total_count
    from public.photobooth_templates t
    left join (
        select pi.template_id, count(*)::bigint as cnt
        from public.photobooth_items pi
        group by pi.template_id
    ) u on u.template_id = t.id
    where (v_search is null or t.name ilike '%' || v_search || '%' escape '\')
      and (v_category is null or lower(t.category) = v_category)
      and (p_is_premium is null or t.is_premium = p_is_premium)
      and (p_is_active is null or t.is_active = p_is_active)
    order by t.updated_at desc, t.created_at desc, t.id desc
    limit v_limit offset v_offset;
end;
$$;

create or replace function public.admin_upsert_template(
    p_id uuid default null,
    p_name text default '',
    p_category text default 'general',
    p_preview_url text default '',
    p_is_premium boolean default false,
    p_is_active boolean default true,
    p_layout_config jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_name text := trim(coalesce(p_name, ''));
    v_category text := coalesce(nullif(lower(trim(p_category)), ''), 'general');
    v_preview_url text := trim(coalesce(p_preview_url, ''));
    v_slot_count integer;
    v_before public.photobooth_templates%rowtype;
    v_after public.photobooth_templates%rowtype;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    if v_name = '' then
        raise exception 'TEMPLATE_NAME_REQUIRED' using errcode = 'P0001';
    end if;

    if p_layout_config is null
       or jsonb_typeof(p_layout_config) <> 'object'
       or jsonb_typeof(p_layout_config -> 'slots') <> 'array'
       or jsonb_array_length(p_layout_config -> 'slots') <= 0 then
        raise exception 'INVALID_LAYOUT_CONFIG' using errcode = 'P0001';
    end if;

    v_slot_count := jsonb_array_length(p_layout_config -> 'slots');

    if p_id is null then
        begin
            insert into public.photobooth_templates (
                name, category, preview_url, slot_count, is_premium, is_active, layout_config
            )
            values (
                v_name,
                v_category,
                v_preview_url,
                v_slot_count,
                coalesce(p_is_premium, false),
                coalesce(p_is_active, true),
                p_layout_config
            )
            returning * into v_after;
        exception when unique_violation then
            raise exception 'TEMPLATE_NAME_TAKEN' using errcode = 'P0001';
        end;

        perform public.log_admin_action(
            'create_template',
            'photobooth_template',
            v_after.id::text,
            null,
            to_jsonb(v_after)
        );
    else
        select * into v_before
        from public.photobooth_templates t
        where t.id = p_id
        for update;

        if not found then
            raise exception 'NOT_FOUND' using errcode = 'P0001';
        end if;

        begin
            update public.photobooth_templates
            set name = v_name,
                category = v_category,
                preview_url = v_preview_url,
                slot_count = v_slot_count,
                is_premium = coalesce(p_is_premium, false),
                is_active = coalesce(p_is_active, true),
                layout_config = p_layout_config
            where id = p_id
            returning * into v_after;
        exception when unique_violation then
            raise exception 'TEMPLATE_NAME_TAKEN' using errcode = 'P0001';
        end;

        perform public.log_admin_action(
            'update_template',
            'photobooth_template',
            v_after.id::text,
            to_jsonb(v_before),
            to_jsonb(v_after)
        );
    end if;

    return to_jsonb(v_after);
end;
$$;

create or replace function public.admin_set_template_active(
    p_id uuid,
    p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_before public.photobooth_templates%rowtype;
    v_active boolean := coalesce(p_active, true);
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    select * into v_before
    from public.photobooth_templates t
    where t.id = p_id
    for update;

    if not found then
        raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;

    update public.photobooth_templates
    set is_active = v_active
    where id = p_id;

    perform public.log_admin_action(
        case when v_active then 'activate_template' else 'deactivate_template' end,
        'photobooth_template',
        p_id::text,
        jsonb_build_object('is_active', v_before.is_active),
        jsonb_build_object('is_active', v_active)
    );
end;
$$;

create or replace function public.admin_delete_template(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_before public.photobooth_templates%rowtype;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    select * into v_before
    from public.photobooth_templates t
    where t.id = p_id
    for update;

    if not found then
        raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;

    if exists (select 1 from public.photobooth_items pi where pi.template_id = p_id) then
        raise exception 'TEMPLATE_IN_USE' using errcode = 'P0001';
    end if;

    begin
        delete from public.photobooth_templates where id = p_id;
    exception when foreign_key_violation then
        raise exception 'TEMPLATE_IN_USE' using errcode = 'P0001';
    end;

    perform public.log_admin_action(
        'delete_template',
        'photobooth_template',
        p_id::text,
        to_jsonb(v_before),
        null
    );
end;
$$;

-- =============================================================================
-- 7. FR-06 / T-06.B07, T-06.B08 – Print Orders Management RPCs
-- =============================================================================

create or replace function public.admin_list_orders(
    p_status text default null,
    p_search text default null,
    p_from date default null,
    p_to date default null,
    p_sort text default 'created_at.desc',
    p_limit integer default 20,
    p_offset integer default 0
)
returns table (
    id uuid,
    short_code text,
    user_id uuid,
    customer_name text,
    shipping_phone text,
    template_name text,
    preview_url text,
    quantity integer,
    total_price_vnd integer,
    status text,
    payment_status text,
    payment_method text,
    created_at timestamptz,
    total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_status text := lower(nullif(trim(p_status), ''));
    v_search text;
    v_sort text := coalesce(nullif(trim(p_sort), ''), 'created_at.desc');
    v_limit integer := greatest(1, least(coalesce(p_limit, 20), 1000));
    v_offset integer := greatest(0, coalesce(p_offset, 0));
    v_from_ts timestamptz;
    v_to_ts timestamptz;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    v_search := nullif(trim(p_search), '');
    if v_search is not null then
        v_search := replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_');
    end if;

    -- Vietnam timezone (Asia/Ho_Chi_Minh = UTC+07:00, fixed offset without DST)
    if p_from is not null then
        v_from_ts := ((p_from::timestamp - interval '7 hours') at time zone 'UTC');
    end if;
    if p_to is not null then
        v_to_ts := (((p_to + 1)::timestamp - interval '7 hours') at time zone 'UTC');
    end if;

    return query
    with order_rows as (
        select
            o.id,
            upper(left(o.id::text, 8)) as short_code,
            o.user_id,
            coalesce(nullif(trim(o.shipping_name), ''), p.display_name) as customer_name,
            o.shipping_phone,
            t.name as template_name,
            coalesce(pi.preview_url, t.preview_url) as preview_url,
            o.quantity,
            o.total_price_vnd,
            o.status,
            coalesce(
                latest_tx.status,
                case when o.status = 'completed' then 'success' else 'pending' end
            )::text as payment_status,
            coalesce(latest_tx.payment_method, 'cod')::text as payment_method,
            o.created_at
        from public.print_orders o
        join public.profiles p on p.id = o.user_id
        left join public.photobooth_items pi on pi.id = o.photobooth_item_id
        left join public.photobooth_templates t on t.id = pi.template_id
        left join lateral (
            select tx.status, tx.payment_method
            from public.transactions tx
            where tx.order_id = o.id
            order by (tx.status = 'success') desc, tx.created_at desc
            limit 1
        ) latest_tx on true
        where (v_status is null or o.status = v_status)
          and (v_from_ts is null or o.created_at >= v_from_ts)
          and (v_to_ts is null or o.created_at < v_to_ts)
          and (
              v_search is null
              or o.id::text ilike '%' || v_search || '%' escape '\'
              or upper(left(o.id::text, 8)) ilike '%' || v_search || '%' escape '\'
              or o.shipping_name ilike '%' || v_search || '%' escape '\'
              or o.shipping_phone ilike '%' || v_search || '%' escape '\'
              or p.display_name ilike '%' || v_search || '%' escape '\'
              or coalesce(t.name, '') ilike '%' || v_search || '%' escape '\'
              or exists (
                  select 1
                  from public.transactions tx2
                  where tx2.order_id = o.id
                    and tx2.order_code::text ilike '%' || v_search || '%' escape '\'
              )
          )
    )
    select
        orr.id,
        orr.short_code,
        orr.user_id,
        orr.customer_name,
        orr.shipping_phone,
        orr.template_name,
        orr.preview_url,
        orr.quantity,
        orr.total_price_vnd,
        orr.status,
        orr.payment_status,
        orr.payment_method,
        orr.created_at,
        count(*) over() as total_count
    from order_rows orr
    order by
        case when v_sort = 'created_at.asc' then orr.created_at end asc nulls last,
        case when v_sort = 'created_at.desc' then orr.created_at end desc nulls last,
        case when v_sort = 'total_price_vnd.asc' then orr.total_price_vnd end asc,
        case when v_sort = 'total_price_vnd.desc' then orr.total_price_vnd end desc,
        case when v_sort = 'status.asc' then orr.status end asc,
        case when v_sort = 'status.desc' then orr.status end desc,
        orr.created_at desc,
        orr.id desc
    limit v_limit offset v_offset;
end;
$$;

create or replace function public.admin_order_status_counts(
    p_from date default null,
    p_to date default null
)
returns table (
    status text,
    count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_from_ts timestamptz;
    v_to_ts timestamptz;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    -- Vietnam timezone (Asia/Ho_Chi_Minh = UTC+07:00, fixed offset without DST)
    if p_from is not null then
        v_from_ts := ((p_from::timestamp - interval '7 hours') at time zone 'UTC');
    end if;
    if p_to is not null then
        v_to_ts := (((p_to + 1)::timestamp - interval '7 hours') at time zone 'UTC');
    end if;

    return query
    with statuses(status, ord) as (
        values
            ('pending'::text, 1),
            ('processing'::text, 2),
            ('printing'::text, 3),
            ('shipping'::text, 4),
            ('completed'::text, 5),
            ('cancelled'::text, 6)
    ),
    counts as (
        select po.status, count(*)::bigint as cnt
        from public.print_orders po
        where (v_from_ts is null or po.created_at >= v_from_ts)
          and (v_to_ts is null or po.created_at < v_to_ts)
        group by po.status
    )
    select s.status, coalesce(c.cnt, 0)::bigint as count
    from statuses s
    left join counts c on c.status = s.status
    order by s.ord;
end;
$$;

create or replace function public.admin_get_order_detail(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order public.print_orders%rowtype;
    v_customer jsonb;
    v_photobooth_item jsonb;
    v_template jsonb;
    v_slot_photos jsonb;
    v_transactions jsonb;
    v_status_history jsonb;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    select * into v_order
    from public.print_orders po
    where po.id = p_order_id;

    if not found then
        raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;

    select jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'email', u.email,
        'phone', p.phone,
        'avatar_url', p.avatar_url,
        'is_locked', coalesce(p.is_locked, false)
    )
    into v_customer
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = v_order.user_id;

    select to_jsonb(pi)
    into v_photobooth_item
    from public.photobooth_items pi
    where pi.id = v_order.photobooth_item_id;

    select to_jsonb(t)
    into v_template
    from public.photobooth_items pi
    join public.photobooth_templates t on t.id = pi.template_id
    where pi.id = v_order.photobooth_item_id;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'slot_index', pp.slot_index,
                'photo_id', ph.id,
                'original_url', ph.original_url,
                'thumbnail_url', ph.thumbnail_url,
                'width', ph.width,
                'height', ph.height
            )
            order by pp.slot_index asc
        ),
        '[]'::jsonb
    )
    into v_slot_photos
    from public.photobooth_photos pp
    join public.photos ph on ph.id = pp.photo_id
    where pp.photobooth_item_id = v_order.photobooth_item_id;

    select coalesce(
        jsonb_agg(to_jsonb(tx) order by tx.created_at desc),
        '[]'::jsonb
    )
    into v_transactions
    from public.transactions tx
    where tx.order_id = p_order_id;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', h.id,
                'order_id', h.order_id,
                'from_status', h.from_status,
                'to_status', h.to_status,
                'changed_by', h.changed_by,
                'changed_by_name', cp.display_name,
                'note', h.note,
                'created_at', h.created_at
            )
            order by h.created_at asc, h.id asc
        ),
        '[]'::jsonb
    )
    into v_status_history
    from public.print_order_status_history h
    left join public.profiles cp on cp.id = h.changed_by
    where h.order_id = p_order_id;

    return jsonb_build_object(
        'order', to_jsonb(v_order) || jsonb_build_object('short_code', upper(left(v_order.id::text, 8))),
        'customer', v_customer,
        'photobooth_item', v_photobooth_item,
        'template', v_template,
        'slot_photos', v_slot_photos,
        'transactions', v_transactions,
        'status_history', v_status_history
    );
end;
$$;

create or replace function public.admin_update_order_status(
    p_order_id uuid,
    p_new_status text,
    p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order public.print_orders%rowtype;
    v_updated public.print_orders%rowtype;
    v_new_status text := lower(nullif(trim(p_new_status), ''));
    v_note text := nullif(trim(p_note), '');
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    select * into v_order
    from public.print_orders po
    where po.id = p_order_id
    for update;

    if not found then
        raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;

    -- Enforce strict order state machine (§5.4)
    if v_new_status is null or not (
        (v_order.status = 'pending' and v_new_status in ('processing', 'cancelled'))
        or (v_order.status = 'processing' and v_new_status in ('printing', 'cancelled'))
        or (v_order.status = 'printing' and v_new_status = 'shipping')
        or (v_order.status = 'shipping' and v_new_status = 'completed')
    ) then
        raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
    end if;

    if v_new_status = 'cancelled' and v_note is null then
        raise exception 'CANCEL_NOTE_REQUIRED' using errcode = 'P0001';
    end if;

    perform set_config('app.manual_order_history', 'on', true);
    update public.print_orders
    set status = v_new_status
    where id = p_order_id
    returning * into v_updated;
    perform set_config('app.manual_order_history', 'off', true);

    insert into public.print_order_status_history (order_id, from_status, to_status, changed_by, note)
    values (p_order_id, v_order.status, v_new_status, auth.uid(), v_note);

    perform public.log_admin_action(
        'update_order_status',
        'print_order',
        p_order_id::text,
        jsonb_build_object('status', v_order.status),
        jsonb_build_object('status', v_new_status, 'note', v_note)
    );

    return to_jsonb(v_updated);
end;
$$;

create or replace function public.admin_update_order_notes(
    p_order_id uuid,
    p_admin_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order public.print_orders%rowtype;
    v_notes text := nullif(trim(p_admin_notes), '');
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    select * into v_order
    from public.print_orders po
    where po.id = p_order_id
    for update;

    if not found then
        raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;

    update public.print_orders
    set admin_notes = v_notes
    where id = p_order_id;

    perform public.log_admin_action(
        'update_order_notes',
        'print_order',
        p_order_id::text,
        jsonb_build_object('admin_notes', v_order.admin_notes),
        jsonb_build_object('admin_notes', v_notes)
    );
end;
$$;

-- =============================================================================
-- 8. FR-06 / T-06.B14, T-06.B15, T-06.B16 – Membership & Transactions RPCs
-- =============================================================================

create or replace function public.admin_list_membership_plans(
    p_include_inactive boolean default true
)
returns table (
    id uuid,
    name text,
    description text,
    price_vnd integer,
    duration_type text,
    extra_drawers integer,
    extra_storage_bytes bigint,
    access_premium_templates boolean,
    is_active boolean,
    created_at timestamptz,
    subscriber_count bigint,
    active_subscriber_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    return query
    select
        mp.id,
        mp.name,
        mp.description,
        mp.price_vnd,
        mp.duration_type,
        mp.extra_drawers,
        mp.extra_storage_bytes,
        mp.access_premium_templates,
        mp.is_active,
        mp.created_at,
        coalesce(stats.sub_cnt, 0)::bigint as subscriber_count,
        coalesce(stats.active_cnt, 0)::bigint as active_subscriber_count
    from public.membership_plans mp
    left join (
        select
            m.plan_id,
            count(*)::bigint as sub_cnt,
            count(*) filter (where m.status = 'active' and m.expires_at > now())::bigint as active_cnt
        from public.memberships m
        group by m.plan_id
    ) stats on stats.plan_id = mp.id
    where coalesce(p_include_inactive, true) or mp.is_active
    order by mp.price_vnd asc, mp.created_at asc;
end;
$$;

create or replace function public.admin_upsert_membership_plan(
    p_id uuid default null,
    p_name text default '',
    p_description text default null,
    p_price_vnd integer default 0,
    p_duration_type text default 'yearly',
    p_extra_drawers integer default 0,
    p_extra_storage_bytes bigint default 0,
    p_access_premium_templates boolean default true,
    p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_name text := trim(coalesce(p_name, ''));
    v_description text := nullif(trim(p_description), '');
    v_duration text := lower(coalesce(nullif(trim(p_duration_type), ''), 'yearly'));
    v_before public.membership_plans%rowtype;
    v_after public.membership_plans%rowtype;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    if v_name = '' then
        raise exception 'PLAN_NAME_REQUIRED' using errcode = 'P0001';
    end if;

    if coalesce(p_price_vnd, -1) < 0
       or coalesce(p_extra_drawers, -1) < 0
       or coalesce(p_extra_storage_bytes, -1) < 0
       or v_duration not in ('monthly', 'yearly') then
        raise exception 'INVALID_PLAN_INPUT' using errcode = 'check_violation';
    end if;

    if p_id is null then
        begin
            insert into public.membership_plans (
                name, description, price_vnd, duration_type, extra_drawers,
                extra_storage_bytes, access_premium_templates, is_active
            )
            values (
                v_name,
                v_description,
                p_price_vnd,
                v_duration,
                p_extra_drawers,
                p_extra_storage_bytes,
                coalesce(p_access_premium_templates, true),
                coalesce(p_is_active, true)
            )
            returning * into v_after;
        exception when unique_violation then
            raise exception 'PLAN_NAME_TAKEN' using errcode = 'P0001';
        end;

        perform public.log_admin_action(
            'create_membership_plan',
            'membership_plan',
            v_after.id::text,
            null,
            to_jsonb(v_after)
        );
    else
        select * into v_before
        from public.membership_plans mp
        where mp.id = p_id
        for update;

        if not found then
            raise exception 'NOT_FOUND' using errcode = 'P0001';
        end if;

        begin
            update public.membership_plans
            set name = v_name,
                description = v_description,
                price_vnd = p_price_vnd,
                duration_type = v_duration,
                extra_drawers = p_extra_drawers,
                extra_storage_bytes = p_extra_storage_bytes,
                access_premium_templates = coalesce(p_access_premium_templates, true),
                is_active = coalesce(p_is_active, true)
            where id = p_id
            returning * into v_after;
        exception when unique_violation then
            raise exception 'PLAN_NAME_TAKEN' using errcode = 'P0001';
        end;

        perform public.log_admin_action(
            'update_membership_plan',
            'membership_plan',
            v_after.id::text,
            to_jsonb(v_before),
            to_jsonb(v_after)
        );
    end if;

    return to_jsonb(v_after);
end;
$$;

create or replace function public.admin_delete_membership_plan(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_before public.membership_plans%rowtype;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    select * into v_before
    from public.membership_plans mp
    where mp.id = p_id
    for update;

    if not found then
        raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;

    if exists (select 1 from public.memberships m where m.plan_id = p_id) then
        raise exception 'PLAN_IN_USE' using errcode = 'P0001';
    end if;

    begin
        delete from public.membership_plans where id = p_id;
    exception when foreign_key_violation then
        raise exception 'PLAN_IN_USE' using errcode = 'P0001';
    end;

    perform public.log_admin_action(
        'delete_membership_plan',
        'membership_plan',
        p_id::text,
        to_jsonb(v_before),
        null
    );
end;
$$;

create or replace function public.admin_list_memberships(
    p_status text default null,
    p_plan_id uuid default null,
    p_expiring_within_days integer default null,
    p_search text default null,
    p_limit integer default 20,
    p_offset integer default 0
)
returns table (
    id uuid,
    user_id uuid,
    display_name text,
    email text,
    plan_name text,
    started_at timestamptz,
    expires_at timestamptz,
    days_left integer,
    status text,
    total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_status text := lower(nullif(trim(p_status), ''));
    v_search text;
    v_limit integer := greatest(1, least(coalesce(p_limit, 20), 1000));
    v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    v_search := nullif(trim(p_search), '');
    if v_search is not null then
        v_search := replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_');
    end if;

    return query
    select
        m.id,
        m.user_id,
        p.display_name,
        u.email::text as email,
        mp.name as plan_name,
        m.started_at,
        m.expires_at,
        case
            when m.status = 'active' and m.expires_at > now()
                then greatest(0, ceil(extract(epoch from (m.expires_at - now())) / 86400.0))::integer
            else 0
        end as days_left,
        m.status,
        count(*) over() as total_count
    from public.memberships m
    join public.profiles p on p.id = m.user_id
    left join auth.users u on u.id = m.user_id
    join public.membership_plans mp on mp.id = m.plan_id
    where (v_status is null or m.status = v_status)
      and (p_plan_id is null or m.plan_id = p_plan_id)
      and (
          p_expiring_within_days is null
          or (
              m.status = 'active'
              and m.expires_at > now()
              and m.expires_at <= now() + make_interval(days => greatest(0, p_expiring_within_days))
          )
      )
      and (
          v_search is null
          or p.display_name ilike '%' || v_search || '%' escape '\'
          or coalesce(u.email, '') ilike '%' || v_search || '%' escape '\'
      )
    order by
        case when p_expiring_within_days is not null then m.expires_at end asc nulls last,
        m.created_at desc,
        m.id desc
    limit v_limit offset v_offset;
end;
$$;

create or replace function public.admin_list_transactions(
    p_type text default null,
    p_status text default null,
    p_search text default null,
    p_from date default null,
    p_to date default null,
    p_limit integer default 20,
    p_offset integer default 0
)
returns table (
    id uuid,
    user_id uuid,
    display_name text,
    type text,
    amount_vnd integer,
    payment_method text,
    payment_gateway_ref text,
    order_code bigint,
    status text,
    order_id uuid,
    created_at timestamptz,
    metadata jsonb,
    total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_type text := lower(nullif(trim(p_type), ''));
    v_status text := lower(nullif(trim(p_status), ''));
    v_search text;
    v_limit integer := greatest(1, least(coalesce(p_limit, 20), 1000));
    v_offset integer := greatest(0, coalesce(p_offset, 0));
    v_from_ts timestamptz;
    v_to_ts timestamptz;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    v_search := nullif(trim(p_search), '');
    if v_search is not null then
        v_search := replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_');
    end if;

    -- Vietnam timezone (Asia/Ho_Chi_Minh = UTC+07:00, fixed offset without DST)
    if p_from is not null then
        v_from_ts := ((p_from::timestamp - interval '7 hours') at time zone 'UTC');
    end if;
    if p_to is not null then
        v_to_ts := (((p_to + 1)::timestamp - interval '7 hours') at time zone 'UTC');
    end if;

    return query
    select
        tx.id,
        tx.user_id,
        p.display_name,
        tx.type,
        tx.amount_vnd,
        tx.payment_method,
        tx.payment_gateway_ref,
        tx.order_code,
        tx.status,
        tx.order_id,
        tx.created_at,
        tx.metadata,
        count(*) over() as total_count
    from public.transactions tx
    join public.profiles p on p.id = tx.user_id
    left join auth.users u on u.id = tx.user_id
    where (v_type is null or tx.type = v_type)
      and (v_status is null or tx.status = v_status)
      and (v_from_ts is null or tx.created_at >= v_from_ts)
      and (v_to_ts is null or tx.created_at < v_to_ts)
      and (
          v_search is null
          or coalesce(tx.order_code::text, '') ilike '%' || v_search || '%' escape '\'
          or coalesce(tx.payment_gateway_ref, '') ilike '%' || v_search || '%' escape '\'
          or p.display_name ilike '%' || v_search || '%' escape '\'
          or coalesce(u.email, '') ilike '%' || v_search || '%' escape '\'
          or tx.id::text ilike '%' || v_search || '%' escape '\'
      )
    order by tx.created_at desc, tx.id desc
    limit v_limit offset v_offset;
end;
$$;

-- =============================================================================
-- 9. FR-06 / T-06.B17 – Dashboard Statistics & Analytics RPCs
-- =============================================================================

-- Drop the legacy 0-arg baseline version so PostgREST sees a single unambiguous function.
drop function if exists public.admin_dashboard_stats();

create or replace function public.admin_dashboard_stats(
    p_from date default null,
    p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_now_vn timestamp;
    v_today_vn date;
    v_month_start_vn date;
    v_from date;
    v_to date;
    v_from_ts timestamptz;
    v_to_ts timestamptz;
    v_today_start_ts timestamptz;
    v_today_end_ts timestamptz;
    v_month_start_ts timestamptz;
    v_next_month_start_ts timestamptz;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    v_now_vn := (now() at time zone 'UTC') + interval '7 hours';
    v_today_vn := v_now_vn::date;
    v_month_start_vn := date_trunc('month', v_now_vn)::date;

    v_from := coalesce(p_from, v_today_vn - 29);
    v_to := coalesce(p_to, v_today_vn);

    v_from_ts := ((v_from::timestamp - interval '7 hours') at time zone 'UTC');
    v_to_ts := (((v_to + 1)::timestamp - interval '7 hours') at time zone 'UTC');
    v_today_start_ts := ((v_today_vn::timestamp - interval '7 hours') at time zone 'UTC');
    v_today_end_ts := (((v_today_vn + 1)::timestamp - interval '7 hours') at time zone 'UTC');
    v_month_start_ts := ((v_month_start_vn::timestamp - interval '7 hours') at time zone 'UTC');
    v_next_month_start_ts := (((v_month_start_vn + interval '1 month')::timestamp - interval '7 hours') at time zone 'UTC');

    return jsonb_build_object(
        'total_users', (select count(*)::bigint from public.profiles),
        'new_users', (
            select count(*)::bigint
            from public.profiles p
            where p.created_at >= v_from_ts and p.created_at < v_to_ts
        ),
        'orders_today', (
            select count(*)::bigint
            from public.print_orders po
            where po.created_at >= v_today_start_ts and po.created_at < v_today_end_ts
        ),
        'pending_orders', (
            select count(*)::bigint
            from public.print_orders po
            where po.status = 'pending'
        ),
        'revenue_month_vnd', (
            select coalesce(sum(tx.amount_vnd), 0)::bigint
            from public.transactions tx
            where tx.status = 'success'
              and tx.created_at >= v_month_start_ts
              and tx.created_at < v_next_month_start_ts
        ),
        'revenue_range_vnd', (
            select coalesce(sum(tx.amount_vnd), 0)::bigint
            from public.transactions tx
            where tx.status = 'success'
              and tx.created_at >= v_from_ts
              and tx.created_at < v_to_ts
        ),
        'active_members', (
            select count(distinct m.user_id)::bigint
            from public.memberships m
            where m.status = 'active'
              and m.expires_at > now()
        )
    );
end;
$$;

create or replace function public.admin_revenue_series(
    p_from date default null,
    p_to date default null,
    p_granularity text default 'day'
)
returns table (
    bucket date,
    print_revenue_vnd bigint,
    membership_revenue_vnd bigint,
    order_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_today_vn date;
    v_from date;
    v_to date;
    v_granularity text;
    v_bucket_start date;
    v_bucket_end date;
    v_step interval;
    v_from_ts timestamptz;
    v_to_ts timestamptz;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    v_today_vn := ((now() at time zone 'UTC') + interval '7 hours')::date;
    v_from := coalesce(p_from, v_today_vn - 29);
    v_to := coalesce(p_to, v_today_vn);
    v_granularity := lower(coalesce(nullif(trim(p_granularity), ''), 'day'));

    if v_granularity not in ('day', 'week', 'month') then
        v_granularity := 'day';
    end if;

    if v_from > v_to then
        return;
    end if;

    v_bucket_start := date_trunc(v_granularity, v_from::timestamp)::date;
    v_bucket_end := date_trunc(v_granularity, v_to::timestamp)::date;
    v_step := case v_granularity
        when 'day' then interval '1 day'
        when 'week' then interval '1 week'
        else interval '1 month'
    end;
    v_from_ts := ((v_from::timestamp - interval '7 hours') at time zone 'UTC');
    v_to_ts := (((v_to + 1)::timestamp - interval '7 hours') at time zone 'UTC');

    return query
    with buckets as (
        select gs::date as bucket_date
        from generate_series(v_bucket_start::timestamp, v_bucket_end::timestamp, v_step) as gs
    ),
    tx_agg as (
        select
            date_trunc(v_granularity, (tx.created_at at time zone 'UTC') + interval '7 hours')::date as bucket_date,
            coalesce(sum(tx.amount_vnd) filter (where tx.type = 'print_order'), 0)::bigint as print_rev,
            coalesce(sum(tx.amount_vnd) filter (where tx.type = 'membership'), 0)::bigint as membership_rev
        from public.transactions tx
        where tx.status = 'success'
          and tx.created_at >= v_from_ts
          and tx.created_at < v_to_ts
        group by 1
    ),
    order_agg as (
        select
            date_trunc(v_granularity, (po.created_at at time zone 'UTC') + interval '7 hours')::date as bucket_date,
            count(*)::bigint as ord_cnt
        from public.print_orders po
        where po.created_at >= v_from_ts
          and po.created_at < v_to_ts
        group by 1
    )
    select
        b.bucket_date as bucket,
        coalesce(ta.print_rev, 0)::bigint as print_revenue_vnd,
        coalesce(ta.membership_rev, 0)::bigint as membership_revenue_vnd,
        coalesce(oa.ord_cnt, 0)::bigint as order_count
    from buckets b
    left join tx_agg ta on ta.bucket_date = b.bucket_date
    left join order_agg oa on oa.bucket_date = b.bucket_date
    order by b.bucket_date asc;
end;
$$;

create or replace function public.admin_top_templates(
    p_from date default null,
    p_to date default null,
    p_limit integer default 5
)
returns table (
    template_id uuid,
    name text,
    preview_url text,
    order_count bigint,
    revenue_vnd bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_limit integer := greatest(1, least(coalesce(p_limit, 5), 100));
    v_from_ts timestamptz;
    v_to_ts timestamptz;
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    -- Vietnam timezone (Asia/Ho_Chi_Minh = UTC+07:00, fixed offset without DST)
    if p_from is not null then
        v_from_ts := ((p_from::timestamp - interval '7 hours') at time zone 'UTC');
    end if;
    if p_to is not null then
        v_to_ts := (((p_to + 1)::timestamp - interval '7 hours') at time zone 'UTC');
    end if;

    return query
    with paid_by_order as (
        select
            tx.order_id,
            coalesce(sum(tx.amount_vnd), 0)::bigint as paid_vnd
        from public.transactions tx
        where tx.status = 'success'
          and tx.order_id is not null
        group by tx.order_id
    )
    select
        t.id as template_id,
        t.name,
        t.preview_url,
        count(po.id)::bigint as order_count,
        coalesce(sum(coalesce(pbo.paid_vnd, 0)), 0)::bigint as revenue_vnd
    from public.print_orders po
    join public.photobooth_items pi on pi.id = po.photobooth_item_id
    join public.photobooth_templates t on t.id = pi.template_id
    left join paid_by_order pbo on pbo.order_id = po.id
    where po.status <> 'cancelled'
      and (v_from_ts is null or po.created_at >= v_from_ts)
      and (v_to_ts is null or po.created_at < v_to_ts)
    group by t.id, t.name, t.preview_url
    having count(po.id) > 0
    order by order_count desc, revenue_vnd desc, t.name asc
    limit v_limit;
end;
$$;

create or replace function public.admin_membership_distribution()
returns table (
    plan_name text,
    active_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not public.is_admin() then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    return query
    with user_tiers as (
        select
            p.id as user_id,
            coalesce(
                (
                    select mp.name
                    from public.memberships m
                    join public.membership_plans mp on mp.id = m.plan_id
                    where m.user_id = p.id
                      and m.status = 'active'
                      and m.expires_at > now()
                    order by m.expires_at desc
                    limit 1
                ),
                'Free'
            ) as tier_name
        from public.profiles p
    ),
    tier_counts as (
        select ut.tier_name, count(*)::bigint as cnt
        from user_tiers ut
        group by ut.tier_name
    ),
    all_labels as (
        select mp.name as tier_name from public.membership_plans mp where mp.is_active
        union
        select tc.tier_name from tier_counts tc
        union
        select 'Free'::text as tier_name
    )
    select
        l.tier_name as plan_name,
        coalesce(tc.cnt, 0)::bigint as active_count
    from all_labels l
    left join tier_counts tc on tc.tier_name = l.tier_name
    order by (l.tier_name = 'Free') asc, active_count desc, l.tier_name asc;
end;
$$;

-- =============================================================================
-- 10. FR-06 / T-06.B18 – Performance Indexes for Admin Queries
-- =============================================================================

create index if not exists idx_profiles_created_at
    on public.profiles (created_at desc);

create index if not exists idx_transactions_status_created
    on public.transactions (status, created_at desc);

create index if not exists idx_memberships_status_expires
    on public.memberships (status, expires_at);

create index if not exists idx_print_orders_created_at
    on public.print_orders (created_at desc);

-- =============================================================================
-- 11. FR-06 / T-06.B19 – Execute Permissions (revoke public/anon, grant authenticated)
-- =============================================================================

revoke all on function public.admin_list_users(text, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_users(text, text, text, text, text, integer, integer) to authenticated;

revoke all on function public.admin_get_user_detail(uuid) from public, anon;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;

revoke all on function public.admin_set_user_lock(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_user_lock(uuid, boolean, text) to authenticated;

revoke all on function public.admin_list_templates(text, text, boolean, boolean, integer, integer) from public, anon;
grant execute on function public.admin_list_templates(text, text, boolean, boolean, integer, integer) to authenticated;

revoke all on function public.admin_upsert_template(uuid, text, text, text, boolean, boolean, jsonb) from public, anon;
grant execute on function public.admin_upsert_template(uuid, text, text, text, boolean, boolean, jsonb) to authenticated;

revoke all on function public.admin_set_template_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_template_active(uuid, boolean) to authenticated;

revoke all on function public.admin_delete_template(uuid) from public, anon;
grant execute on function public.admin_delete_template(uuid) to authenticated;

revoke all on function public.admin_list_orders(text, text, date, date, text, integer, integer) from public, anon;
grant execute on function public.admin_list_orders(text, text, date, date, text, integer, integer) to authenticated;

revoke all on function public.admin_order_status_counts(date, date) from public, anon;
grant execute on function public.admin_order_status_counts(date, date) to authenticated;

revoke all on function public.admin_get_order_detail(uuid) from public, anon;
grant execute on function public.admin_get_order_detail(uuid) to authenticated;

revoke all on function public.admin_update_order_status(uuid, text, text) from public, anon;
grant execute on function public.admin_update_order_status(uuid, text, text) to authenticated;

revoke all on function public.admin_update_order_notes(uuid, text) from public, anon;
grant execute on function public.admin_update_order_notes(uuid, text) to authenticated;

revoke all on function public.admin_list_membership_plans(boolean) from public, anon;
grant execute on function public.admin_list_membership_plans(boolean) to authenticated;

revoke all on function public.admin_upsert_membership_plan(uuid, text, text, integer, text, integer, bigint, boolean, boolean) from public, anon;
grant execute on function public.admin_upsert_membership_plan(uuid, text, text, integer, text, integer, bigint, boolean, boolean) to authenticated;

revoke all on function public.admin_delete_membership_plan(uuid) from public, anon;
grant execute on function public.admin_delete_membership_plan(uuid) to authenticated;

revoke all on function public.admin_list_memberships(text, uuid, integer, text, integer, integer) from public, anon;
grant execute on function public.admin_list_memberships(text, uuid, integer, text, integer, integer) to authenticated;

revoke all on function public.admin_list_transactions(text, text, text, date, date, integer, integer) from public, anon;
grant execute on function public.admin_list_transactions(text, text, text, date, date, integer, integer) to authenticated;

revoke all on function public.admin_dashboard_stats(date, date) from public, anon;
grant execute on function public.admin_dashboard_stats(date, date) to authenticated;

revoke all on function public.admin_revenue_series(date, date, text) from public, anon;
grant execute on function public.admin_revenue_series(date, date, text) to authenticated;

revoke all on function public.admin_top_templates(date, date, integer) from public, anon;
grant execute on function public.admin_top_templates(date, date, integer) to authenticated;

revoke all on function public.admin_membership_distribution() from public, anon;
grant execute on function public.admin_membership_distribution() to authenticated;
