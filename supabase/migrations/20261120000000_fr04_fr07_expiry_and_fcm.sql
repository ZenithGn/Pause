-- =============================================================================
-- FR-04 (T-04.03) & FR-07 (T-07.03, T-07.06, T-07.07)
-- Membership expiry automation, order-status notification trigger, and
-- FCM device token upsert RPC.
-- =============================================================================

-- 1. FR-04.3 / T-04.03: Process expired memberships & send expiry reminders
create or replace function public.process_expired_memberships()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_rec record;
    v_expired_count integer := 0;
    v_reminded_count integer := 0;
    v_has_other_active boolean;
    v_already_reminded boolean;
begin
    -- A) Expire active memberships whose expires_at has passed
    for v_rec in
        select m.id, m.user_id, m.plan_id, m.expires_at
        from public.memberships m
        where m.status = 'active'
          and m.expires_at is not null
          and m.expires_at <= now()
    loop
        update public.memberships
        set status = 'expired'
        where id = v_rec.id;

        -- Check if user still has another active non-expired membership
        select exists (
            select 1
            from public.memberships
            where user_id = v_rec.user_id
              and status = 'active'
              and (expires_at is null or expires_at > now())
        ) into v_has_other_active;

        if not v_has_other_active then
            update public.profiles
            set is_premium = false,
                max_drawers = 3,
                updated_at = now()
            where id = v_rec.user_id;

            insert into public.notifications (user_id, type, title, body, data)
            values (
                v_rec.user_id,
                'membership',
                'Gói hội viên Pause đã hết hạn',
                'Gói hội viên của bạn đã hết hạn và tài khoản đã chuyển về gói Miễn phí (3 ngăn kéo). Gia hạn ngay để tiếp tục mở khóa kho VIP Templates!',
                jsonb_build_object('membership_id', v_rec.id, 'event', 'expired')
            );
        end if;

        v_expired_count := v_expired_count + 1;
    end loop;

    -- B) Remind users whose membership expires within the next 3 days
    for v_rec in
        select m.id, m.user_id, m.expires_at
        from public.memberships m
        where m.status = 'active'
          and m.expires_at is not null
          and m.expires_at > now()
          and m.expires_at <= now() + interval '3 days'
    loop
        select exists (
            select 1
            from public.notifications n
            where n.user_id = v_rec.user_id
              and n.type = 'membership'
              and n.data ->> 'event' = 'expiring_soon'
              and n.data ->> 'membership_id' = v_rec.id::text
        ) into v_already_reminded;

        if not v_already_reminded then
            insert into public.notifications (user_id, type, title, body, data)
            values (
                v_rec.user_id,
                'membership',
                'Gói hội viên Pause sắp hết hạn',
                'Gói hội viên của bạn sẽ hết hạn trong vòng 3 ngày tới. Gia hạn sớm để không gián đoạn quyền lợi VIP Templates và dung lượng lưu trữ.',
                jsonb_build_object('membership_id', v_rec.id, 'event', 'expiring_soon')
            );
            v_reminded_count := v_reminded_count + 1;
        end if;
    end loop;

    return jsonb_build_object(
        'expired_count', v_expired_count,
        'reminded_count', v_reminded_count,
        'processed_at', now()
    );
end;
$$;

revoke all on function public.process_expired_memberships() from public, anon, authenticated;
grant execute on function public.process_expired_memberships() to service_role;

-- 2. FR-07 / T-07.03: Upsert FCM device token for the authenticated user
create or replace function public.upsert_device_token(
    p_token text,
    p_platform text default 'android'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception 'Authentication required';
    end if;

    if p_token is null or length(trim(p_token)) = 0 then
        return;
    end if;

    insert into public.device_tokens (user_id, token, platform, updated_at)
    values (v_uid, trim(p_token), coalesce(p_platform, 'android'), now())
    on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

grant execute on function public.upsert_device_token(text, text) to authenticated;

-- 3. FR-07.1: Automatically notify user when print_order status changes
create or replace function public.notify_print_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_title text;
    v_body text;
begin
    if old.status is not distinct from new.status then
        return new;
    end if;

    case new.status
        when 'confirmed' then
            v_title := 'Đơn in đã được xác nhận';
            v_body := 'Đơn in ảnh Photobooth của bạn đã được xác nhận và chuẩn bị in.';
        when 'printing' then
            v_title := 'Đơn in đang được in ấn';
            v_body := 'Xưởng in Pause đang in những tấm ảnh kỷ niệm của bạn.';
        when 'shipping' then
            v_title := 'Đơn in đang được giao hàng';
            v_body := 'Đơn hàng của bạn đã bàn giao cho đơn vị vận chuyển.';
        when 'delivered' then
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
    for each row
    execute function public.notify_print_order_status();
